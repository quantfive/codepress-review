import { Agent, run } from "@openai/agents";
import { aisdk } from "@openai/agents-extensions";
import { debugError, debugLog } from "../debug";
import { createModel } from "../model-factory";
import { AgentResponse, ModelConfig } from "../types";
import { parseAgentResponse, resolveLineNumbers } from "../xml-parser";
import { getInteractiveSystemPrompt } from "./agent-system-prompt";
import { allTools } from "./tools";

/**
 * Estimates token count for a string (rough approximation: 4 chars per token).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Extracts unique file paths from a diff string.
 */
function extractFilesFromDiff(diffText: string): string[] {
  const files: Set<string> = new Set();
  const regex = /^diff --git a\/(.+?) b\//gm;
  let match;
  while ((match = regex.exec(diffText)) !== null) {
    files.add(match[1]);
  }
  return Array.from(files);
}

/**
 * Maximum tokens we're willing to send to the model in one request.
 * This leaves room for the system prompt and response.
 */
const MAX_DIFF_TOKENS = 80000;

export interface ExistingComment {
  id?: number;
  path?: string;
  line?: number;
  body?: string;
  created_at?: string;
}

/**
 * Reviews an entire PR diff using a single interactive agent.
 * The agent has tools to fetch additional context as needed.
 */
export async function reviewFullDiff(
  fullDiff: string,
  modelConfig: ModelConfig,
  repoFilePaths: string[],
  existingComments: ExistingComment[] = [],
  maxTurns: number = 30,
  blockingOnly: boolean = false,
): Promise<AgentResponse> {
  const model = await createModel(modelConfig);

  const agent = new Agent({
    model: aisdk(model),
    name: "CodePressReviewAgent",
    instructions: getInteractiveSystemPrompt(blockingOnly, maxTurns),
    tools: allTools,
  });

  const fileList = repoFilePaths.join("\n");

  // Check if diff is too large
  const diffTokens = estimateTokens(fullDiff);
  if (diffTokens > MAX_DIFF_TOKENS) {
    debugLog(
      `⚠️ Diff is large (~${diffTokens} tokens). Agent will need to use tools for context.`,
    );
  }

  // Build existing comments context
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
  <existingCommentsContext>
    ${existingCommentsContext}
  </existingCommentsContext>
  <fullDiff>
${fullDiff}
  </fullDiff>

  <instruction>
    Please review this pull request diff. You have the complete diff above.

    Use your tools (search_repo, fetch_files, fetch_snippet, dep_graph) to:
    - Understand how changes integrate with existing code
    - Verify claims about unused code, missing imports, etc.
    - Check if changes affect other parts of the codebase

    ${existingComments.length > 0 ? `Pay attention to the ${existingComments.length} existing comments:
    1. Avoid creating duplicate or similar comments unless you have significantly different insights.
    2. Analyze whether any existing comments have been addressed by the changes in this diff.
    3. If you find that an existing comment has been resolved by the code changes, include it in the <resolvedComments> section with a clear explanation of how it was addressed.` : ""}

    Focus on substantive issues: bugs, security problems, logic errors, and significant design concerns.
    Skip minor style nits unless they indicate a real problem.
  </instruction>
</reviewRequest>`;

  try {
    const filesInDiff = extractFilesFromDiff(fullDiff);
    debugLog(`Starting full PR review. Diff size: ~${diffTokens} tokens`);
    debugLog(`Files in context (${filesInDiff.length}): ${filesInDiff.join(", ")}`);
    debugLog(`Max turns: ${maxTurns}`);
    const result = await run(agent, initialMessage, { maxTurns });

    if (result.finalOutput) {
      debugLog("Agent Raw Response:", result.finalOutput);
      const response = parseAgentResponse(result.finalOutput as string);
      const resolvedFindings = resolveLineNumbers(response.findings, fullDiff);
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
