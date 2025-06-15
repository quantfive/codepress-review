import { Agent, run } from "@openai/agents";
import { Finding, ModelConfig, DiffSummary } from "../types";
import { allTools } from "./tools";
import { getInteractiveSystemPrompt } from "./agent-system-prompt";
import { parseXMLResponse, resolveLineNumbers } from "../xml-parser";
import { createModel } from "../model-factory";
import { aisdk } from "@openai/agents-extensions";

/**
 * Reviews a diff chunk using the interactive agent.
 */
export async function reviewChunkWithAgent(
  diffChunk: string,
  modelConfig: ModelConfig,
  diffSummary: DiffSummary | undefined,
  chunkIndex: number,
  repoFilePaths: string[],
  maxTurns: number = 20,
): Promise<Finding[]> {
  const model = await createModel(modelConfig);

  const agent = new Agent({
    model: aisdk(model),
    name: "InteractiveReviewAgent",
    instructions: getInteractiveSystemPrompt(),
    tools: allTools,
  });

  const fileList = repoFilePaths.join("\n");

  // Build summary context for this chunk
  let summaryContext = "No summary available.";
  if (diffSummary) {
    const { prType, summaryPoints, keyRisks, hunks } = diffSummary;
    const contextLines: string[] = [];

    contextLines.push(`PR TYPE: ${prType}`, "");

    if (summaryPoints.length > 0) {
      contextLines.push(
        "OVERVIEW:",
        ...summaryPoints.map((item: string) => `- ${item}`),
        "",
      );
    }

    if (keyRisks.length > 0) {
      contextLines.push(
        "KEY RISKS TO WATCH FOR:",
        ...keyRisks.map((risk) => `- [${risk.tag}] ${risk.description}`),
        "",
      );
    }

    // Find specific notes for this chunk
    const hunkSummary = hunks.find((hunk) => hunk.index === chunkIndex);
    if (hunkSummary) {
      contextLines.push(
        "SPECIFIC NOTES FOR THIS CHUNK:",
        `Overview: ${hunkSummary.overview}`,
      );

      if (hunkSummary.risks.length > 0) {
        contextLines.push(
          `Risks: ${hunkSummary.risks.map((risk) => `[${risk.tag}] ${risk.description}`).join(", ")}`,
        );
      }

      if (hunkSummary.tests.length > 0) {
        contextLines.push(`Suggested Tests: ${hunkSummary.tests.join(", ")}`);
      }

      contextLines.push("");
    } else {
      console.log(
        `[Hunk ${chunkIndex + 1}] No specific guidance from summary agent - chunk considered good or low-risk`,
      );
    }

    summaryContext = contextLines.join("\n");
  }

  const initialMessage =
    `Here is a list of all files in the repository:\n${fileList}\n\n` +
    `Here is the context from the overall diff analysis:\n${summaryContext}\n\n` +
    `Please review this diff chunk:\n\n${diffChunk}`;

  try {
    const result = await run(agent, initialMessage, { maxTurns });

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
