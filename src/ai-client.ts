import { generateText, APICallError } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Finding, ModelConfig } from "./types";
import { getSystemPrompt } from "./system-prompt";
import { parseXMLResponse, resolveLineNumbers } from "./xml-parser";
import { setTimeout } from "node:timers/promises";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

/**
 * Creates the appropriate AI model based on configuration.
 */
function createModel(config: ModelConfig) {
  switch (config.provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: config.apiKey });
      return openai(config.modelName);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.modelName);
    }
    case "gemini": {
      const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
      return google(config.modelName);
    }
    default:
      throw new Error(`Unsupported MODEL_PROVIDER: ${config.provider}`);
  }
}

/**
 * Reviews a diff chunk using the AI model.
 */
export async function reviewChunk(
  diffChunk: string,
  modelConfig: ModelConfig,
  customPrompt?: string,
): Promise<Finding[]> {
  const model = createModel(modelConfig);
  const systemPrompt = getSystemPrompt({ customPrompt });

  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Please review this diff:\n\n${diffChunk}`,
      },
    ],
    maxTokens: 4096,
    temperature: 0.2,
  });

  console.log("LLM Raw Response:", text);

  const findings = parseXMLResponse(text);
  return resolveLineNumbers(findings, diffChunk);
}

/**
 * Executes a function with retry logic.
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  hunkIdx: number,
): Promise<T> {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      return await fn();
    } catch (error: any) {
      if (APICallError.isInstance(error) && !error.isRetryable) {
        throw error; // Re-throw to be caught by the service and not retried
      }

      attempt++;
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `[Hunk ${hunkIdx}] Failed after ${MAX_RETRIES} retries: ${error}`,
        );
      }
      const wait = RETRY_BASE_MS * Math.pow(2, attempt);
      console.warn(
        `[Hunk ${hunkIdx}] Attempt ${attempt} failed: ${error}. Retrying in ${wait}ms...`,
      );
      await setTimeout(wait);
    }
  }
  // This part should not be reachable, but it makes TypeScript happy.
  throw new Error(`[Hunk ${hunkIdx}] Exited retry loop unexpectedly.`);
}
