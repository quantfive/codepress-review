import { Agent, run } from "@openai/agents";
import { Finding, ModelConfig, DiffSummary, AgentResponse } from "../types";
import { allTools } from "./tools";
import { getInteractiveSystemPrompt } from "./agent-system-prompt";
import { parseAgentResponse, resolveLineNumbers } from "../xml-parser";
import { createModel } from "../model-factory";
import { aisdk } from "@openai/agents-extensions";
import { escapeXml } from "../xml-utils";
import { debugLog, debugError } from "../debug";

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
  blockingOnly: boolean = false,
): Promise<AgentResponse> {
  const model = await createModel(modelConfig);

  const agent = new Agent({
    model: aisdk(model),
    name: "InteractiveReviewAgent",
    instructions: getInteractiveSystemPrompt(blockingOnly),
    tools: allTools,
  });

  const fileList = repoFilePaths.join("\n");

  // Build summary context for this chunk
  let summaryContext = "No summary available.";
  if (diffSummary) {
    const { prType, summaryPoints, keyRisks, hunks } = diffSummary;
    const contextLines: string[] = [];

    contextLines.push("<diffContext>");
    contextLines.push(`  <prType>${escapeXml(prType)}</prType>`);

    if (summaryPoints.length > 0) {
      contextLines.push("  <overview>");
      summaryPoints.forEach((item: string) => {
        contextLines.push(`    <item>${escapeXml(item)}</item>`);
      });
      contextLines.push("  </overview>");
    }

    if (keyRisks.length > 0) {
      contextLines.push("  <keyRisks>");
      keyRisks.forEach((risk) => {
        contextLines.push(
          `    <item tag="${escapeXml(risk.tag)}">${escapeXml(risk.description)}</item>`,
        );
      });
      contextLines.push("  </keyRisks>");
    }

    // Find specific notes for this chunk
    const hunkSummary = hunks.find((hunk) => hunk.index === chunkIndex);
    if (hunkSummary) {
      contextLines.push("  <chunkSpecific>");
      contextLines.push(
        `    <overview>${escapeXml(hunkSummary.overview)}</overview>`,
      );

      if (hunkSummary.risks.length > 0) {
        contextLines.push("    <risks>");
        hunkSummary.risks.forEach((risk) => {
          contextLines.push(
            `      <item tag="${escapeXml(risk.tag)}">${escapeXml(risk.description)}</item>`,
          );
        });
        contextLines.push("    </risks>");
      }

      if (hunkSummary.issues.length > 0) {
        contextLines.push("    <issues>");
        hunkSummary.issues.forEach((issue) => {
          contextLines.push(
            `      <issue severity="${escapeXml(issue.severity)}" kind="${escapeXml(issue.kind)}">${escapeXml(issue.description)}</issue>`,
          );
        });
        contextLines.push("    </issues>");
      }

      if (hunkSummary.tests.length > 0) {
        contextLines.push("    <suggestedTests>");
        hunkSummary.tests.forEach((test) => {
          contextLines.push(`      <item>${escapeXml(test)}</item>`);
        });
        contextLines.push("    </suggestedTests>");
      }

      contextLines.push("  </chunkSpecific>");
    } else {
      debugLog(
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
          `  <comment id="${escapeXml(String(comment.id || `${comment.path}:${comment.line}`))}" path="${escapeXml(comment.path)}" line="${escapeXml(String(comment.line))}" createdAt="${escapeXml(comment.created_at) || "unknown"}">`,
        );
        contextLines.push(`    ${escapeXml(comment.body)}`);
        contextLines.push(`  </comment>`);
      }
    });
    contextLines.push("</existingComments>");
    existingCommentsContext = contextLines.join("\n");
  }

  const initialMessage = `
<reviewRequest>
  <repositoryFiles>
    ${escapeXml(fileList)}
  </repositoryFiles>
  <diffAnalysisContext>
    ${escapeXml(summaryContext)}
  </diffAnalysisContext>
  <existingCommentsContext>
    ${existingCommentsContext}
  </existingCommentsContext>
  <diffChunk>
    ${escapeXml(diffChunk)}
  </diffChunk>

  <instruction>
    Please review this diff chunk using the provided context. ${existingComments.length > 0 ? "Pay special attention to the existing comments:\n  1. Avoid creating duplicate or similar comments unless you have significantly different insights.\n  2. Analyze whether any existing comments have been addressed by the changes in this diff.\n  3. If you find that an existing comment has been resolved by the code changes, include it in the <resolvedComments> section with a clear explanation of how it was addressed." : ""}
  </instruction>
</reviewRequest>`;

  try {
    debugLog(`[Hunk ${chunkIndex + 1}] Initial Message:\n`, initialMessage);
    const result = await run(agent, initialMessage, { maxTurns });

    if (result.finalOutput) {
      debugLog("Agent Raw Response:", result.finalOutput);
      const response = parseAgentResponse(result.finalOutput as string);
      const resolvedFindings = resolveLineNumbers(response.findings, diffChunk);
      return {
        findings: resolvedFindings,
        resolvedComments: response.resolvedComments,
      };
    } else {
      debugError("Agent failed to produce a final output.", result);
      return { findings: [], resolvedComments: [] };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugError("An error occurred while running the agent:", errorMessage);
    return { findings: [], resolvedComments: [] };
  }
}

/**
 * Reviews a diff chunk using the interactive agent.
 * @deprecated Use reviewChunkWithAgent which returns the full AgentResponse instead
 */
export async function reviewChunkWithAgentLegacy(
  diffChunk: string,
  modelConfig: ModelConfig,
  diffSummary: DiffSummary | undefined,
  chunkIndex: number,
  repoFilePaths: string[],
  existingComments: any[] = [],
  maxTurns: number = 20,
  blockingOnly: boolean = false,
): Promise<Finding[]> {
  const response = await reviewChunkWithAgent(
    diffChunk,
    modelConfig,
    diffSummary,
    chunkIndex,
    repoFilePaths,
    existingComments,
    maxTurns,
    blockingOnly,
  );
  return response.findings;
}
