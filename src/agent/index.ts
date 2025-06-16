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
  existingComments: any[] = [],
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

    contextLines.push("<diffContext>");
    contextLines.push(`  <prType>${prType}</prType>`);

    if (summaryPoints.length > 0) {
      contextLines.push("  <overview>");
      summaryPoints.forEach((item: string) => {
        contextLines.push(`    <item>${item}</item>`);
      });
      contextLines.push("  </overview>");
    }

    if (keyRisks.length > 0) {
      contextLines.push("  <keyRisks>");
      keyRisks.forEach((risk) => {
        contextLines.push(
          `    <item tag="${risk.tag}">${risk.description}</item>`,
        );
      });
      contextLines.push("  </keyRisks>");
    }

    // Find specific notes for this chunk
    const hunkSummary = hunks.find((hunk) => hunk.index === chunkIndex);
    if (hunkSummary) {
      contextLines.push("  <chunkSpecific>");
      contextLines.push(`    <overview>${hunkSummary.overview}</overview>`);

      if (hunkSummary.risks.length > 0) {
        contextLines.push("    <risks>");
        hunkSummary.risks.forEach((risk) => {
          contextLines.push(
            `      <item tag="${risk.tag}">${risk.description}</item>`,
          );
        });
        contextLines.push("    </risks>");
      }

      if (hunkSummary.tests.length > 0) {
        contextLines.push("    <suggestedTests>");
        hunkSummary.tests.forEach((test) => {
          contextLines.push(`      <item>${test}</item>`);
        });
        contextLines.push("    </suggestedTests>");
      }

      contextLines.push("  </chunkSpecific>");
    } else {
      console.log(
        `[Hunk ${chunkIndex + 1}] No specific guidance from summary agent - chunk considered good or low-risk`,
      );
    }

    contextLines.push("</diffContext>");
    summaryContext = contextLines.join("\n");
  }

  // Build existing comments context for this chunk
  let existingCommentsContext = "";
  if (existingComments.length > 0) {
    const contextLines: string[] = [];
    contextLines.push("<existingComments>");
    existingComments.forEach((comment) => {
      if (comment.path && comment.line && comment.body) {
        contextLines.push(
          `  <comment path="${comment.path}" line="${comment.line}" createdAt="${comment.created_at || "unknown"}">`,
        );
        contextLines.push(`    ${comment.body}`);
        contextLines.push(`  </comment>`);
      }
    });
    contextLines.push("</existingComments>");
    existingCommentsContext = contextLines.join("\n");
  }

  const initialMessage = `
<reviewRequest>
  <repositoryFiles>
${fileList}
  </repositoryFiles>
  
  <diffAnalysisContext>
${summaryContext}
  </diffAnalysisContext>
  
  ${existingCommentsContext ? `<existingCommentsContext>\n${existingCommentsContext}\n  </existingCommentsContext>\n  ` : ""}
  <diffChunk>
${diffChunk}
  </diffChunk>
  
  <instruction>Please review this diff chunk using the provided context. ${existingComments.length > 0 ? "Pay special attention to the existing comments - avoid creating duplicate or similar comments unless you have significantly different insights." : ""}</instruction>
</reviewRequest>`;

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
