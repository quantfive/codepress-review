import { generateText, APICallError } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  Finding,
  ModelConfig,
  DiffSummary,
  RiskItem,
  HunkSummary,
} from "./types";
import { getSystemPrompt } from "./system-prompt";
import { getSummarySystemPrompt } from "./summary-agent-system-prompt";
import { parseXMLResponse, resolveLineNumbers } from "./xml-parser";
import { setTimeout } from "node:timers/promises";
import { ProcessableChunk } from "./diff-parser";

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
  summaryContext?: string,
): Promise<Finding[]> {
  const model = createModel(modelConfig);
  const systemPrompt = getSystemPrompt({ customPrompt });

  let userContent = `Please review this diff:\n\n${diffChunk}`;

  if (summaryContext) {
    userContent =
      `Context from overall diff analysis:\n${summaryContext}\n\n` +
      userContent;
  }

  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userContent,
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

/**
 * Summarizes the entire diff and provides notes for each chunk.
 */
export async function summarizeDiff(
  chunks: ProcessableChunk[],
  modelConfig: ModelConfig,
): Promise<DiffSummary> {
  const model = createModel(modelConfig);

  // Create a condensed view of all chunks for the summary
  const diffOverview = chunks
    .map((chunk, index) => {
      return `=== CHUNK ${index}: ${chunk.fileName} ===\n${chunk.content}\n`;
    })
    .join("\n");

  const systemPrompt = getSummarySystemPrompt({});

  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: diffOverview,
      },
    ],
    maxTokens: 4096,
    temperature: 0.1,
  });

  console.log("Diff Summary Raw Response:", text);

  // Parse the XML response
  return parseSummaryResponse(text);
}

/**
 * Parses the XML summary response into a structured format.
 */
function parseSummaryResponse(text: string): DiffSummary {
  try {
    // Extract PR type
    const prTypeMatch = text.match(/<prType>(.*?)<\/prType>/s);
    const prType = prTypeMatch ? prTypeMatch[1].trim() : "unknown";

    // Extract overview items
    const overviewMatch = text.match(/<overview>(.*?)<\/overview>/s);
    const overview: string[] = [];
    if (overviewMatch) {
      const itemMatches = overviewMatch[1].match(/<item>(.*?)<\/item>/gs);
      if (itemMatches) {
        overview.push(
          ...itemMatches.map((match) => match.replace(/<\/?item>/g, "").trim()),
        );
      }
    }

    // Extract key risks
    const keyRisksMatch = text.match(/<keyRisks>(.*?)<\/keyRisks>/s);
    const keyRisks: RiskItem[] = [];
    if (keyRisksMatch) {
      const riskMatches = keyRisksMatch[1].match(/<item[^>]*>(.*?)<\/item>/gs);
      if (riskMatches) {
        riskMatches.forEach((match) => {
          const tagMatch = match.match(/tag="([^"]+)"/);
          const contentMatch = match.match(/<item[^>]*>(.*?)<\/item>/s);
          if (tagMatch && contentMatch) {
            keyRisks.push({
              tag: tagMatch[1],
              description: contentMatch[1].trim(),
            });
          }
        });
      }
    }

    // Extract hunks
    const hunksMatch = text.match(/<hunks>(.*?)<\/hunks>/s);
    const hunks: HunkSummary[] = [];
    if (hunksMatch) {
      const hunkMatches = hunksMatch[1].match(/<hunk[^>]*>.*?<\/hunk>/gs);
      if (hunkMatches) {
        hunkMatches.forEach((hunkMatch) => {
          const indexMatch = hunkMatch.match(/index="(\d+)"/);
          const fileMatch = hunkMatch.match(/<file>(.*?)<\/file>/s);
          const overviewMatch = hunkMatch.match(/<overview>(.*?)<\/overview>/s);

          if (indexMatch && fileMatch && overviewMatch) {
            const index = parseInt(indexMatch[1]);

            // Extract risks for this hunk
            const risks: RiskItem[] = [];
            const risksMatch = hunkMatch.match(/<risks>(.*?)<\/risks>/s);
            if (risksMatch) {
              const riskItemMatches = risksMatch[1].match(
                /<item[^>]*>(.*?)<\/item>/gs,
              );
              if (riskItemMatches) {
                riskItemMatches.forEach((riskItem) => {
                  const tagMatch = riskItem.match(/tag="([^"]+)"/);
                  const contentMatch = riskItem.match(
                    /<item[^>]*>(.*?)<\/item>/s,
                  );
                  if (tagMatch && contentMatch) {
                    risks.push({
                      tag: tagMatch[1],
                      description: contentMatch[1].trim(),
                    });
                  }
                });
              }
            }

            // Extract tests for this hunk
            const tests: string[] = [];
            const testsMatch = hunkMatch.match(/<tests>(.*?)<\/tests>/s);
            if (testsMatch) {
              const testItemMatches =
                testsMatch[1].match(/<item>(.*?)<\/item>/gs);
              if (testItemMatches) {
                tests.push(
                  ...testItemMatches.map((match) =>
                    match.replace(/<\/?item>/g, "").trim(),
                  ),
                );
              }
            }

            hunks.push({
              index,
              file: fileMatch[1].trim(),
              overview: overviewMatch[1].trim(),
              risks,
              tests,
            });
          }
        });
      }
    }

    return {
      prType,
      overview,
      keyRisks,
      hunks,
    };
  } catch (error) {
    console.error("Failed to parse summary response:", error);
    return {
      prType: "unknown",
      overview: ["Failed to parse summary"],
      keyRisks: [],
      hunks: [],
    };
  }
}
