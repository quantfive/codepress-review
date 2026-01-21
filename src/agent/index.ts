import { Agent, Runner } from "@openai/agents";
import { aisdk } from "@openai/agents-extensions";
import { debugError, debugLog } from "../debug";
import { createModel } from "../model-factory";
import { ExistingReviewComment, ModelConfig, TriggerContext } from "../types";
import { getInteractiveSystemPrompt } from "./agent-system-prompt";
import { getAllTools, resetTodoList } from "./tools";

export interface PRContext {
  repo: string; // owner/repo format
  prNumber: number;
  commitSha: string;
  triggerContext?: TriggerContext;
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

  // Build re-review context section if applicable
  const triggerCtx = prContext.triggerContext;
  let reReviewSection = "";

  if (triggerCtx?.isReReview) {
    const prevState = triggerCtx.previousReviewState || "none";
    const prevCommit = triggerCtx.previousReviewCommitSha || "unknown";
    const trigger = triggerCtx.triggerEvent;

    reReviewSection = `
<reReviewContext>
  **This is a RE-REVIEW.** You have previously reviewed this PR.

  - Trigger: ${trigger === "synchronize" ? "New commits pushed" : trigger === "review_requested" ? "Re-review requested" : trigger === "comment_trigger" ? "Comment trigger" : trigger}
  - Your previous review state: ${prevState}
  - Previous review commit: ${prevCommit}
  - Current commit: ${prContext.commitSha}

  **IMPORTANT Re-review instructions:**
  1. First, check what changed since your last review:
     ${prevCommit !== "unknown" ? `\`git diff ${prevCommit}..${prContext.commitSha}\`` : "Fetch the current diff and compare to your previous feedback"}

  2. Focus on the NEW changes first before doing a full review

  3. Only post a new review/comments if:
     - Your assessment has changed (e.g., previous issues were fixed, so you can now approve)
     - You found NEW issues in the new commits
     - You need to re-iterate unaddressed feedback

  4. If your previous approval still stands and new changes don't introduce issues,
     you may skip posting a redundant approval UNLESS the repo requires re-approval
     after new commits (some repos have "dismiss stale reviews" enabled).

  5. If you have nothing new to add, you can complete without posting a new review.
</reReviewContext>
`;
  }

  const initialMessage = `
You are reviewing PR #${prContext.prNumber} in repository ${prContext.repo}.
Commit SHA: ${prContext.commitSha}

<repositoryFiles>
${fileList}
</repositoryFiles>
${reReviewSection}${existingCommentsSection}

<instruction>
Please review this pull request.

**Your workflow:**

1. **Get PR context and list of changed files:**
   - Run \`gh pr view ${prContext.prNumber} --json title,body,files\` to get PR info and list of changed files
   - Check if body is empty/blank
   - **If body is empty/blank, you MUST update it immediately:**
     \`gh pr edit ${prContext.prNumber} --body "## Summary\\n\\n<describe what this PR does based on the diff>\\n\\n## Changes\\n\\n- <list key changes>"\`
   - Review the <existingReviewComments> section above (if present) to understand what other reviewers have already commented on
   - **Add a todo item for EACH changed file** to ensure you review every single one
   - **Decide how to fetch patches:**
     • Small PRs (< 10 files): fetch all patches at once with \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/files\`
     • Large PRs: fetch patches one at a time as you review each file

2. **Review EVERY changed file (one at a time):**
   For EACH file in the changed files list:
   a. **Get the patch** (if not already fetched):
      \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/files --jq '.[] | select(.filename=="<filepath>")'\`
   b. **Read the FULL file for context:** \`cat <filepath>\` - Don't just look at the patch!
      The diff only shows changed lines. Read the entire file to understand:
      • How the changed code fits into the broader context
      • What functions/variables are defined elsewhere in the file
      • The overall structure and patterns used
   c. **Check dependencies if needed:** Use \`dep_graph\` or \`rg\` to see what calls this code
   d. **Look up documentation if needed:** Use \`web_fetch\` or \`web_search\` for unfamiliar libraries/patterns
   e. **Review the changes WITH full file context:** Look for:
      • Logic errors and edge cases the diff introduces
      • Error handling gaps in the new code
      • Inconsistencies with patterns in the rest of the file/codebase
      • Breaking changes to function signatures that affect callers
      • DRY violations - does similar code exist elsewhere?
   f. **Post comments IMMEDIATELY** when you find issues - don't wait until later:
      \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/comments -f body="Your comment" -f path="file/path.ts" -f line=42 -f commit_id="${prContext.commitSha}"\`
   g. **Mark the file as reviewed** in your todo list before moving to the next file

   **IMPORTANT:**
   - You MUST review EVERY file. Do not skip any files.
   - You have memory across files! If you notice something in file B that relates to file A you reviewed earlier, you can go back and post a comment on file A.
   - Always read the FULL file, not just the diff - context matters!

3. **Before submitting review, verify:**
   - PR description is not blank (if it was, you should have updated it in step 1)
   - **ALL files have been reviewed** (check your todo list - every file should be marked done)
   - Complete any other items in your todo list

4. **REQUIRED - Submit formal review:**
   - Approve: \`gh pr review ${prContext.prNumber} --approve --body "Your summary"\`
   - Request changes: \`gh pr review ${prContext.prNumber} --request-changes --body "Your summary"\`
   - Comment: \`gh pr review ${prContext.prNumber} --comment --body "Your summary"\`

   **Review summary should be concise:**
   - Brief description of what the PR does (1-2 sentences)
   - Key findings or concerns (if any)
   - Your decision rationale
   - **DO NOT list all the files you reviewed** - that's redundant since you review everything

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
