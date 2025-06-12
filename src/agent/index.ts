import { Agent, run } from "@openai/agents";
import { Finding, ModelConfig } from "../types";
import { allTools } from "./tools";
import { getInteractiveSystemPrompt } from "./prompts";
import { parseXMLResponse, resolveLineNumbers } from "../xml-parser";
import { createModel } from "../model-factory";
import { aisdk } from "@openai/agents-extensions";

/**
 * Reviews a diff chunk using the interactive agent.
 */
export async function reviewChunkWithAgent(
  diffChunk: string,
  modelConfig: ModelConfig,
  summaryContext: string,
  repoFilePaths: string[],
  customPrompt?: string,
): Promise<Finding[]> {
  const model = await createModel(modelConfig);

  const agent = new Agent({
    model: aisdk(model),
    name: "InteractiveReviewAgent",
    instructions: getInteractiveSystemPrompt({ customPrompt }),
    tools: allTools,
  });

  const fileList = repoFilePaths.join("\n");
  const initialMessage =
    `Here is a list of all files in the repository:\n${fileList}\n\n` +
    `Here is the context from the overall diff analysis:\n${summaryContext}\n\n` +
    `Please review this diff chunk:\n\n${diffChunk}`;

  try {
    const result = await run(agent, initialMessage, { maxTurns: 10 });

    if (result.finalOutput) {
      console.log("Agent Raw Response:", result.finalOutput);
      const findings = parseXMLResponse(result.finalOutput as string);
      return resolveLineNumbers(findings, diffChunk);
    } else {
      console.error("Agent failed to produce a final output.", result);
      return [];
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("An error occurred while running the agent:", errorMessage);
    return [];
  }
}
