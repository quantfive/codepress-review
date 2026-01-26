import { Agent, Runner, CallModelInputFilter } from "@openai/agents";
import { aisdk } from "@openai/agents-extensions";
import { z } from "zod";
import { debugError, debugLog } from "../debug";
import { createModel } from "../model-factory";
import {
  BotComment,
  ExistingReviewComment,
  ModelConfig,
  RelatedRepo,
  ReviewState,
  TriggerContext,
} from "../types";
import { getInteractiveSystemPrompt } from "./agent-system-prompt";
import {
  analyzeToolOutput,
  generateInterventionBlock,
  MAX_STEPS_PROMPT,
  shouldForceTextOnly,
} from "./interventions";
import { advanceTurn, createReviewState, recordToolCall } from "./review-state";
import { getAllTools, resetTodoList } from "./tools";

/**
 * Schema for the agent's final output.
 * The agent MUST produce this structured output to signal completion.
 * This prevents the agent from stopping prematurely on text-only responses.
 */
const ReviewCompletionSchema = z.object({
  /** Whether the review has been completed and submitted */
  completed: z.boolean().describe("Set to true only when the review has been fully completed and submitted via gh pr review"),
  /** Brief summary of the review outcome */
  summary: z.string().describe("A brief summary of the review: what was found, comments posted, and final verdict"),
  /** Number of comments posted during this review */
  commentsPosted: z.number().describe("Number of inline comments posted during this review"),
  /** The review verdict submitted */
  verdict: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT", "NONE"]).describe("The verdict submitted with gh pr review, or NONE if no review was submitted"),
});

export type ReviewCompletion = z.infer<typeof ReviewCompletionSchema>;

export interface PRContext {
  repo: string; // owner/repo format
  prNumber: number;
  commitSha: string;
  triggerContext?: TriggerContext;
}

/**
 * Formats existing review comments from OTHER reviewers into a readable string.
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
 * Formats the bot's own previous comments for deduplication.
 */
function formatBotPreviousComments(comments: BotComment[]): string {
  if (comments.length === 0) {
    return "";
  }

  const formattedComments = comments.map((comment) => {
    const lineInfo = comment.line ? `line="${comment.line}"` : "";
    return `  <previousComment path="${comment.path}" ${lineInfo}>
${comment.body}
  </previousComment>`;
  });

  return `
<yourPreviousComments count="${comments.length}">
  You have previously posted these comments on this PR.
  **DO NOT post duplicate or similar comments.**

  Review each before posting anything new:

${formattedComments.join("\n\n")}
</yourPreviousComments>`;
}

/**
 * Formats related repos for the agent context.
 */
function formatRelatedRepos(repos: RelatedRepo[]): string {
  if (repos.length === 0) {
    return "";
  }

  const repoList = repos
    .filter((r) => r.localPath) // Only include successfully cloned repos
    .map((r) => {
      return `  <repo name="${r.repo}" path="${r.localPath}">
    ${r.description || "Related repository for cross-repo context"}
  </repo>`;
    })
    .join("\n\n");

  return `
<relatedRepos count="${repos.length}">
  The following related repositories are available for context:

${repoList}

  **Use these repos when you need to:**
  - Verify API contracts match between repos
  - Check if similar code/utilities exist elsewhere
  - Understand cross-repo dependencies
  - Find shared type definitions

  **To search/read related repos, use full paths:**
  - Read files: \`cat /path/to/related/repo/src/file.ts\`
  - Search: \`rg "pattern" /path/to/related/repo/\`
</relatedRepos>`;
}

/**
 * Creates a callModelInputFilter that injects interventions into the input.
 */
function createInterventionFilter(
  state: ReviewState,
): CallModelInputFilter<unknown> {
  return (args) => {
    // Advance turn counter
    advanceTurn(state);
    debugLog(`Turn ${state.currentTurn}${state.maxTurns ? `/${state.maxTurns}` : ""}`);

    // Check if we should force text-only response (at max turns)
    if (shouldForceTextOnly(state)) {
      debugLog("At max turns - forcing text-only response");
      // Prepend urgent system message to instructions to force completion
      args.modelData.instructions = `🛑 **FINAL TURN - MUST COMPLETE NOW** 🛑

${MAX_STEPS_PROMPT}

---

${args.modelData.instructions || ""}`;
      return args.modelData;
    }

    // Generate and inject interventions
    const interventionBlock = generateInterventionBlock(state);
    if (interventionBlock) {
      debugLog("Injecting intervention reminder");
      // Find the last user message and prepend the intervention
      const lastUserMsgIndex = args.modelData.input
        .map((item, i) => ({ item, i }))
        .filter((x) => (x.item as { role?: string }).role === "user")
        .pop()?.i;

      if (lastUserMsgIndex !== undefined) {
        const lastUserMsg = args.modelData.input[lastUserMsgIndex] as {
          role: string;
          content: string | unknown[];
        };
        if (typeof lastUserMsg.content === "string") {
          lastUserMsg.content = `${interventionBlock}\n\n${lastUserMsg.content}`;
        }
      }
    }

    return args.modelData;
  };
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
  maxTurns: number | null = null, // null = unlimited (default)
  blockingOnly: boolean = false,
  existingComments: ExistingReviewComment[] = [],
  botPreviousComments: BotComment[] = [],
  relatedRepos: RelatedRepo[] = [],
  prFilesFormatted: string = "", // Pre-filtered PR files section
): Promise<void> {
  // Reset todo list for fresh review
  resetTodoList();

  // Initialize review state for intervention tracking
  const reviewState = createReviewState({
    maxTurns,
    botPreviousComments,
  });

  const model = await createModel(modelConfig);

  // Create the intervention filter
  const interventionFilter = createInterventionFilter(reviewState);

  const agent = new Agent({
    model: aisdk(model),
    name: "CodePressReviewAgent",
    instructions: getInteractiveSystemPrompt(blockingOnly, maxTurns),
    tools: getAllTools(),
    // Structured output type - the loop continues until this is produced
    // This prevents the agent from stopping on text-only responses
    outputType: ReviewCompletionSchema,
  });

  const fileList = repoFilePaths.join("\n");

  // Format existing comments from other reviewers
  const existingCommentsSection = formatExistingComments(existingComments);
  if (existingComments.length > 0) {
    debugLog(
      `📝 Including ${existingComments.length} existing review comments from other reviewers`,
    );
  }

  // Format bot's own previous comments for deduplication
  const botCommentsSection = formatBotPreviousComments(botPreviousComments);
  if (botPreviousComments.length > 0) {
    debugLog(
      `🔄 Including ${botPreviousComments.length} of your own previous comments for deduplication`,
    );
  }

  // Format related repos context
  const relatedReposSection = formatRelatedRepos(relatedRepos);
  if (relatedRepos.length > 0) {
    debugLog(
      `🔗 Including ${relatedRepos.length} related repo(s) for cross-repo context`,
    );
  }

  // Build re-review context section if applicable
  const triggerCtx = prContext.triggerContext;
  let reReviewSection = "";
  const isReReview = triggerCtx?.isReReview ?? false;

  if (isReReview) {
    const prevState = triggerCtx?.previousReviewState || "none";
    const prevCommit = triggerCtx?.previousReviewCommitSha || "unknown";
    const trigger = triggerCtx?.triggerEvent;

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

  4. **If your previous approval still stands and new changes don't introduce issues,
     DO NOT post a new review. Just complete without calling \`gh pr review\`.**

  5. If you have nothing new to add, you can complete without posting a new review.
</reReviewContext>
`;
  }

  // Format PR files section - use pre-filtered if available, otherwise agent will fetch
  const prFilesSection = prFilesFormatted
    ? `\n${prFilesFormatted}
⚠️ **IMPORTANT:** This file list is pre-filtered and authoritative. Do NOT fetch the full file list again.
Lock files, build outputs (dist/, build/), and generated files have already been removed.
Only review the files listed above. Fetch individual patches as needed, not the full list.
`
    : `\n<prFiles>
Files will be fetched via: \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/files\`
Note: Lock files, build outputs, and generated files should be skipped.
</prFiles>\n`;

  const initialMessage = `
You are reviewing PR #${prContext.prNumber} in repository ${prContext.repo}.
Commit SHA: ${prContext.commitSha}

<repositoryFiles>
${fileList}
</repositoryFiles>
${prFilesSection}${reReviewSection}${botCommentsSection}${existingCommentsSection}${relatedReposSection}

<instruction>
Please review this pull request.

**Your workflow:**

1. **Get PR context:**
   - Run \`gh pr view ${prContext.prNumber} --json title,body\` to get PR info
   - Check if body is empty/blank
   - **If body is empty/blank, you MUST update it immediately:**
     \`gh pr edit ${prContext.prNumber} --body "## Summary\\n\\n<describe what this PR does based on the diff>\\n\\n## Changes\\n\\n- <list key changes>"\`
   - **Fetch ALL existing comments on this PR:**
     \`gh pr view ${prContext.prNumber} --comments\`
     This shows conversation comments AND review comments. Check what feedback has already been given to avoid duplicating it.
   - **Add a todo item for EACH file in <prFiles>** to ensure you review every single one

   ⚠️ **The \`<prFiles>\` list is authoritative and pre-filtered.**
   Lock files, build outputs, and generated files have been removed. **Only review files listed in \`<prFiles>\`.**

   **Fetching patches (if not in \`<patches>\` above):**
   **ALWAYS use --jq to filter** - this keeps lock files and build outputs out of your context.

   • Single file: \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/files --jq '.[] | select(.filename=="src/index.ts")'\`
   • Multiple files: \`gh api ... --jq '[.[] | select(.filename=="src/a.ts" or .filename=="src/b.ts")]'\`
   • By pattern: \`gh api ... --jq '[.[] | select(.filename | startswith("src/"))]'\`

   ❌ **NEVER** run without --jq: \`gh api .../files\` dumps ALL files (including lock files) into context

2. **Review EVERY changed file (one at a time):**
   For EACH file in the \`<prFiles>\` list:
   a. **Get the patch** (if not in \`<patches>\` above):
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

4. **${isReReview ? "Submit review ONLY IF NEEDED" : "REQUIRED - Submit formal review"}:**
   - Approve: \`gh pr review ${prContext.prNumber} --approve --body "Your summary"\`
   - Request changes: \`gh pr review ${prContext.prNumber} --request-changes --body "Your summary"\`
   - Comment: \`gh pr review ${prContext.prNumber} --comment --body "Your summary"\`
${isReReview ? `
   **⚠️ RE-REVIEW: Do NOT submit a new review if:**
   - You previously APPROVED and the new changes don't introduce any issues
   - You have no new feedback to give
   In this case, simply complete your task without calling \`gh pr review\`.
` : ""}
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
${isReReview ? "" : `
**Remember: You MUST submit a formal review at the end using \`gh pr review\`.`}
</instruction>`;

  // Create a runner with custom workflow name for tracing
  const runner = new Runner({
    workflowName: `${prContext.repo}#${prContext.prNumber}`,
  });

  // Set up tool tracking via runner hooks
  runner.on("agent_tool_start", (_context, _agent, tool, _details) => {
    recordToolCall(reviewState, tool.name);
    debugLog(`Tool start: ${tool.name}`);
  });

  runner.on("agent_tool_end", (_context, _agent, tool, result, details) => {
    // Analyze tool output to update state (track comment posting, review submission, etc.)
    analyzeToolOutput(reviewState, tool.name, details.toolCall, result);
  });

  try {
    debugLog(`Starting agentic PR review`);
    debugLog(`Max turns: ${maxTurns === null ? "unlimited" : maxTurns}`);
    debugLog(`PR: ${prContext.repo}#${prContext.prNumber}`);
    debugLog(`Repository files available: ${repoFilePaths.length}`);
    if (botPreviousComments.length > 0) {
      debugLog(`Bot previous comments for deduplication: ${botPreviousComments.length}`);
    }

    // Build run options
    const runOptions: { maxTurns?: number; callModelInputFilter: typeof interventionFilter } = {
      callModelInputFilter: interventionFilter,
    };

    // Only set maxTurns if it's not null (unlimited)
    if (maxTurns !== null) {
      runOptions.maxTurns = maxTurns;
    }

    const result = await runner.run(agent, initialMessage, runOptions);

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
