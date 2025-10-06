import { Agent, run } from "@openai/agents";
import { aisdk } from "@openai/agents-extensions";
import { debugError, debugLog } from "../debug";
import { createModel } from "../model-factory";
import { AgentResponse, DiffSummary, Finding, ModelConfig } from "../types";
import { parseAgentResponse, resolveLineNumbers } from "../xml-parser";
import { getInteractiveSystemPrompt } from "./agent-system-prompt";
import { allTools } from "./tools";

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
    name: "CodePressReviewAgent",
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

      if (hunkSummary.issues.length > 0) {
        contextLines.push("    <issues>");
        hunkSummary.issues.forEach((issue) => {
          contextLines.push(
            `      <issue severity="${issue.severity}" kind="${issue.kind}">${issue.description}</issue>`,
          );
        });
        contextLines.push("    </issues>");
      }

      if (hunkSummary.tests.length > 0) {
        contextLines.push("    <suggestedTests>");
        hunkSummary.tests.forEach((test) => {
          contextLines.push(`      <item>${test}</item>`);
        });
        contextLines.push("    </suggestedTests>");
      }

      // Include planner guidance for this hunk, if present
      if (diffSummary.plan) {
        const planForHunk = diffSummary.plan.hunkPlans.find(
          (hp) => hp.index === chunkIndex,
        );
        if (planForHunk) {
          contextLines.push("    <plan>");
          if (planForHunk.riskLevel) {
            contextLines.push(
              `      <riskLevel>${planForHunk.riskLevel}</riskLevel>`,
            );
          }
          if (typeof planForHunk.priority === "number") {
            contextLines.push(
              `      <priority>${String(planForHunk.priority)}</priority>`,
            );
          }
          if (typeof planForHunk.maxTurns === "number") {
            contextLines.push(
              `      <maxTurns>${String(planForHunk.maxTurns)}</maxTurns>`,
            );
          }
          if (typeof planForHunk.toolBudget === "number") {
            contextLines.push(
              `      <toolBudget>${String(planForHunk.toolBudget)}</toolBudget>`,
            );
          }
          if (typeof planForHunk.skip === "boolean") {
            contextLines.push(
              `      <skip>${planForHunk.skip ? "true" : "false"}</skip>`,
            );
          }
          if (
            Array.isArray(planForHunk.focus) &&
            planForHunk.focus.length > 0
          ) {
            contextLines.push("      <focus>");
            for (const f of planForHunk.focus) {
              contextLines.push(`        <item>${f}</item>`);
            }
            contextLines.push("      </focus>");
          }
          if (typeof planForHunk.evidenceRequired === "boolean") {
            contextLines.push(
              `      <evidenceRequired>${planForHunk.evidenceRequired ? "true" : "false"}</evidenceRequired>`,
            );
          }
          if (
            Array.isArray(planForHunk.actions) &&
            planForHunk.actions.length > 0
          ) {
            contextLines.push("      <actions>");
            planForHunk.actions.forEach((a) => {
              const tool = a.tool || "";
              contextLines.push(`        <action tool="${tool}">`);
              if (a.goal) {
                contextLines.push(`          <goal>${a.goal}</goal>`);
              }
              if (a.params && typeof a.params === "object") {
                contextLines.push("          <params>");
                for (const [k, v] of Object.entries(a.params)) {
                  if (Array.isArray(v)) {
                    contextLines.push(
                      `            <${k}>${v.join(",")}</${k}>`,
                    );
                  } else {
                    contextLines.push(`            <${k}>${String(v)}</${k}>`);
                  }
                }
                contextLines.push("          </params>");
              }
              contextLines.push("        </action>");
            });
            contextLines.push("      </actions>");
          }
          contextLines.push("    </plan>");
        }
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
          `  <comment id="${String(comment.id || `${comment.path}:${comment.line}`)}" path="${comment.path}" line="${String(comment.line)}" createdAt="${comment.created_at || "unknown"}">`,
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
  <existingCommentsContext>
    ${existingCommentsContext}
  </existingCommentsContext>
  <diffChunk>
    ${diffChunk}
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
