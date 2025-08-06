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
): Promise<AgentResponse> {
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

  // Extract feature intent from the diff summary for contextual review
  let featureContext = "";
  if (diffSummary) {
    featureContext = `
<featureContext>
  <intent>${escapeXml(diffSummary.prType || "Code changes")}</intent>
  <summary>${escapeXml(diffSummary.summaryPoints.join(". ") || "No summary available")}</summary>
  <prDescription>${escapeXml(diffSummary.prDescription || "No description provided")}</prDescription>
  ${diffSummary.keyRisks.length > 0 ? `
  <risks>
    ${diffSummary.keyRisks.map(risk => `<risk tag="${escapeXml(risk.tag)}">${escapeXml(risk.description)}</risk>`).join('\n    ')}
  </risks>` : ''}
</featureContext>`;
  }

  const initialMessage = `
<reviewRequest>
  <repositoryFiles>
    ${escapeXml(fileList)}
  </repositoryFiles>
  
  ${featureContext}
  
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
    Review this diff chunk like a human team member would:
    
    1. **Understand the Intent**: What is this change trying to accomplish? Use the feature context above.
    
    2. **Gather Context**: Use the available tools to understand:
       - How similar features are implemented in this codebase
       - What utilities or patterns are available that might be relevant
       - How these files fit into the broader architecture
       
    3. **Focus on Architecture**: Does this follow established patterns? Are they using the right abstractions?
    
    4. **Quality Review**: Look for maintainability, edge cases, and consistency with team conventions.
    
    5. **Prioritize Impact**: Focus on issues that would genuinely help the developer improve the codebase.
    
    ${existingComments.length > 0 ? "Special attention to existing comments:\n    - Avoid creating duplicate or similar comments unless you have significantly different insights\n    - Analyze whether any existing comments have been addressed by the changes\n    - If existing comments are resolved by the code changes, include them in the <resolvedComments> section" : ""}
    
    Take your time to gather the right context before providing feedback. Use the tools strategically to understand patterns and best practices in this codebase.
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
): Promise<Finding[]> {
  const response = await reviewChunkWithAgent(
    diffChunk,
    modelConfig,
    diffSummary,
    chunkIndex,
    repoFilePaths,
    existingComments,
    maxTurns,
  );
  return response.findings;
}
