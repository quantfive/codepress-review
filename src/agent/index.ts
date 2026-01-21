import { Agent, Runner } from "@openai/agents";
import { aisdk } from "@openai/agents-extensions";
import { debugError, debugLog } from "../debug";
import { createModel } from "../model-factory";
import { ExistingReviewComment, ModelConfig } from "../types";
import { getInteractiveSystemPrompt } from "./agent-system-prompt";
import { getAllTools, resetTodoList } from "./tools";

export interface PRContext {
  repo: string; // owner/repo format
  prNumber: number;
  commitSha: string;
}

/**
 * Formats existing review comments into a readable string for the agent.
 */
function formatExistingComments(comments: ExistingReviewComment[]): string {
  if (comments.length === 0) {
    return "";
  }

  const formattedComments = comments.map((comment, index) => {
    const lineInfo = comment.line ? `Line ${comment.line}` : "File-level";
    return `<comment index="${index + 1}" id="${comment.id}">
  <author>${comment.author}</author>
  <file>${comment.path}</file>
  <location>${lineInfo}</location>
  <commentId>${comment.id}</commentId>
  <body>${comment.body}</body>
  <codeContext>
${comment.diffHunk}
  </codeContext>
</comment>`;
  });

  return `
<existingReviewComments count="${comments.length}">
  These are review comments made by other reviewers on this PR.
  Consider them in your review:
  - DO NOT duplicate feedback that has already been given
  - If you agree with a comment, you may reinforce it or add additional context
  - If you disagree with a comment, you may respectfully provide a counter-opinion
  - Factor these comments into your overall assessment of the PR

${formattedComments.join("\n\n")}
</existingReviewComments>`;
}

/**
 * Reviews a PR using a single interactive agent with agentic diff exploration.
 * The agent has full autonomy to:
 * - Fetch the diff via gh CLI (on demand)
 * - Explore the codebase with bash, search, and file tools
 * - Search the web for documentation and references
 * - View existing PR comments
 * - Post review comments directly
 * - Update PR description if blank
 */
export async function reviewFullDiff(
  modelConfig: ModelConfig,
  repoFilePaths: string[],
  prContext: PRContext,
  maxTurns: number = 75,
  blockingOnly: boolean = false,
  existingComments: ExistingReviewComment[] = [],
): Promise<void> {
  // Reset todo list for fresh review
  resetTodoList();

  const model = await createModel(modelConfig);

  const agent = new Agent({
    model: aisdk(model),
    name: "CodePressReviewAgent",
    instructions: getInteractiveSystemPrompt(blockingOnly, maxTurns),
    tools: getAllTools(),
  });

  const fileList = repoFilePaths.join("\n");

  // Format existing comments for inclusion
  const existingCommentsSection = formatExistingComments(existingComments);
  if (existingComments.length > 0) {
    debugLog(
      `📝 Including ${existingComments.length} existing review comments in context`,
    );
  }

  const initialMessage = `
You are reviewing PR #${prContext.prNumber} in repository ${prContext.repo}.
Commit SHA: ${prContext.commitSha}

<repositoryFiles>
${fileList}
</repositoryFiles>
${existingCommentsSection}

<instruction>
Please review this pull request.

**Your workflow:**

1. **Fetch the diff:**
   - Run \`gh pr diff ${prContext.prNumber}\` to see all changes
   - Or fetch specific files: \`gh pr diff ${prContext.prNumber} -- path/to/file.ts\`
   - For large PRs, you can fetch the diff in chunks by file

2. **Get PR context:**
   - Run \`gh pr view ${prContext.prNumber} --json title,body,state,author,url\` to understand the PR purpose
   - Check if body is empty/blank
   - **If body is empty/blank, you MUST update it immediately:**
     \`gh pr edit ${prContext.prNumber} --body "## Summary\\n\\n<describe what this PR does based on the diff>\\n\\n## Changes\\n\\n- <list key changes>"\`
   - Review the <existingReviewComments> section above (if present) to understand what other reviewers have already commented on

3. **Deep review each changed file:**
   For each file in the diff:
   - **Read full file context:** \`cat <filepath>\` to understand surrounding code
   - **Check dependencies:** Use \`dep_graph\` or \`rg\` to see what calls this code and what it calls
   - **Look up documentation if needed:** Use \`web_fetch\` to read package docs, or \`web_search\` to find relevant information
   - **Review the diff WITH context:** Look for:
     • Logic errors and edge cases the diff introduces
     • Error handling gaps in the new code
     • Inconsistencies with patterns in the rest of the file/codebase
     • Breaking changes to function signatures that affect callers
     • DRY violations - does similar code exist elsewhere?

4. **Post inline comments** for issues found:
   \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/comments -f body="Your comment" -f path="file/path.ts" -f line=42 -f commit_id="${prContext.commitSha}"\`

5. **Before submitting review, verify:**
   - PR description is not blank (if it was, you should have updated it in step 1)
   - Complete any items in your \`todo list\`

6. **REQUIRED - Submit formal review:**
   - Approve: \`gh pr review ${prContext.prNumber} --approve --body "Your summary"\`
   - Request changes: \`gh pr review ${prContext.prNumber} --request-changes --body "Your summary"\`
   - Comment: \`gh pr review ${prContext.prNumber} --comment --body "Your summary"\`

**CRITICAL: Only comment on code IN THE DIFF.**
- Use context (full file, dependencies) to UNDERSTAND the code
- But ONLY comment on lines that are actually changed in this PR
- Never comment on pre-existing code outside the diff

**Comment guidelines:**
${blockingOnly ? "- BLOCKING-ONLY MODE: Only comment on critical issues that MUST be fixed (security, bugs, breaking changes)" : "- Focus on substantive issues: bugs, security problems, logic errors, significant design concerns\n- Skip minor style nits unless they indicate a real problem"}
- Be constructive and explain WHY something is an issue
- Include code suggestions when helpful

**Line numbers:**
- Use the line number in the NEW version of the file (right side of diff)
- For lines starting with \`+\`, count from the @@ hunk header
- Always use commit_id="${prContext.commitSha}"

**Remember: You MUST submit a formal review at the end using \`gh pr review\`.**
</instruction>`;

  // Create a runner with custom workflow name for tracing
  const runner = new Runner({
    workflowName: `${prContext.repo}#${prContext.prNumber}`,
  });

  try {
    debugLog(`Starting agentic PR review`);
    debugLog(`Max turns: ${maxTurns}`);
    debugLog(`PR: ${prContext.repo}#${prContext.prNumber}`);
    debugLog(`Repository files available: ${repoFilePaths.length}`);

    const result = await runner.run(agent, initialMessage, { maxTurns });

    if (result.finalOutput) {
      debugLog("Agent completed review. Final output:", result.finalOutput);
    } else {
      debugLog("Agent completed without final output.");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugError("An error occurred while running the agent:", errorMessage);
    throw error;
  }
}
