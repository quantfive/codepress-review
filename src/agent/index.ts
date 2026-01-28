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
import { getSystemPrompt } from "./agent-system-prompt";
import {
  analyzeToolOutput,
  generateInterventionBlock,
  MAX_STEPS_PROMPT,
  shouldForceTextOnly,
} from "./interventions";
import { advanceTurn, createReviewState, recordToolCall } from "./review-state";
import { getAllTools, resetTodoList } from "./tools";
import { createSkillTool } from "./tools/skill-tool";
import type { SkillContext } from "./skills/types";

/**
 * Schema for the agent's final output.
 * The agent MUST produce this structured output to signal completion.
 *
 * IMPORTANT: Using z.literal(true) for `completed` ensures the loop only terminates
 * when the agent explicitly sets completed to true. If the agent outputs JSON with
 * completed: false, the schema won't match and the loop continues.
 */
const ReviewCompletionSchema = z.object({
  /** Must be true to signal completion - z.literal(true) prevents premature termination */
  completed: z.literal(true).describe("Must be true to signal the review is complete"),
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
 * Builds the initial message for the agent based on the context.
 * For full reviews: provides PR files and tells agent to load review-full skill
 * For interactive mentions: provides user message and tells agent to choose appropriate skill
 */
function buildInitialMessage(
  prContext: PRContext,
  skillContext: SkillContext,
  fileList: string,
  existingCommentsSection: string,
  botCommentsSection: string,
  relatedReposSection: string,
  prFilesFormatted: string,
): string {
  const { repo, prNumber, commitSha, triggerContext } = prContext;
  const interactiveMention = triggerContext?.interactiveMention;

  // For interactive mentions, build a simpler message focused on the user's request
  if (interactiveMention) {
    let codeContext = "";
    if (interactiveMention.isReviewComment && interactiveMention.filePath) {
      codeContext = `
## Code Context
This mention is on an inline comment at:
- **File:** \`${interactiveMention.filePath}\`
${interactiveMention.line ? `- **Line:** ${interactiveMention.line}` : ""}
${interactiveMention.diffHunk ? `
**Diff hunk:**
\`\`\`diff
${interactiveMention.diffHunk}
\`\`\`
` : ""}
`;
    }

    return `# Interactive Mention in PR #${prNumber}

A user has mentioned you (@codepress) in repository ${repo}.

## User's Message
**Author:** @${interactiveMention.commentAuthor}
**Message:** ${interactiveMention.userMessage}
${codeContext}
## PR Context
- **Repository:** ${repo}
- **PR Number:** ${prNumber}
- **Commit SHA:** ${commitSha}

<repositoryFiles>
${fileList}
</repositoryFiles>
${botCommentsSection}${existingCommentsSection}${relatedReposSection}

## Your Task

Use the \`skill\` tool to load the appropriate skill for this task:
- If the user is asking a **question** (what/why/how, ends with ?, asks for explanation): load \`answer-question\`
- If the user is asking you to **review specific code** (check this, review that, look at): load \`review-targeted\`
- If the user is requesting a **full review** (@codepress/review, "please review", etc.): load \`review-full\`

Choose the skill that best matches the user's intent.`;
  }

  // For full reviews (PR opened, new commits, @codepress/review, etc.)
  const isReReview = triggerContext?.isReReview ?? false;
  const forceFullReview = triggerContext?.forceFullReview ?? false;

  // Build re-review context section if applicable
  let reReviewSection = "";
  if (forceFullReview) {
    reReviewSection = `
<forceFullReview>
  **FULL REVIEW MODE ENABLED** - Review ALL files in this PR.
</forceFullReview>
`;
  } else if (isReReview) {
    const prevState = triggerContext?.previousReviewState || "none";
    const prevCommit = triggerContext?.previousReviewCommitSha || "unknown";
    const trigger = triggerContext?.triggerEvent;

    reReviewSection = `
<reReviewContext>
  **This is a RE-REVIEW.** You have previously reviewed this PR.

  - Trigger: ${trigger === "synchronize" ? "New commits pushed" : trigger === "review_requested" ? "Re-review requested" : trigger === "comment_trigger" ? "Comment trigger" : trigger}
  - Your previous review state: ${prevState}
  - Previous review commit: ${prevCommit}
  - Current commit: ${commitSha}
</reReviewContext>
`;
  }

  // Format PR files section
  const prFilesSection = prFilesFormatted
    ? `\n${prFilesFormatted}
**IMPORTANT:** This file list is pre-filtered and authoritative. Lock files, build outputs, and generated files have been removed.
`
    : `\n<prFiles>
Files will be fetched via: \`gh api repos/${repo}/pulls/${prNumber}/files\`
</prFiles>\n`;

  return `# PR Review: ${repo}#${prNumber}

You are reviewing PR #${prNumber} in repository ${repo}.
Commit SHA: ${commitSha}

<repositoryFiles>
${fileList}
</repositoryFiles>
${prFilesSection}${reReviewSection}${botCommentsSection}${existingCommentsSection}${relatedReposSection}

## Your Task

Use the \`skill\` tool to load the \`review-full\` skill for complete review instructions.

\`skill({ name: "review-full" })\``;
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

  // Build the skill context
  const skillContext: SkillContext = {
    repo: prContext.repo,
    prNumber: prContext.prNumber,
    commitSha: prContext.commitSha,
    repoFilePaths,
    triggerContext: prContext.triggerContext,
    interactiveMention: prContext.triggerContext?.interactiveMention,
    blockingOnly,
    maxTurns,
    existingComments,
    botPreviousComments,
    relatedRepos,
    prFilesFormatted,
  };

  // Create the skill tool with context
  const skillTool = createSkillTool(skillContext);

  // Get all base tools and add the skill tool
  const baseTools = getAllTools();
  const allToolsWithSkill = [...baseTools, skillTool];

  const agent = new Agent({
    model: aisdk(model),
    name: "CodePressReviewAgent",
    instructions: getSystemPrompt(),
    tools: allToolsWithSkill,
    // Structured output type - the loop continues until this is produced
    // Using z.literal(true) for `completed` ensures the agent must explicitly
    // set completed: true to terminate. Text-only responses or completed: false
    // will not match the schema and the loop continues.
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

  // Build the initial message based on context
  const initialMessage = buildInitialMessage(
    prContext,
    skillContext,
    fileList,
    existingCommentsSection,
    botCommentsSection,
    relatedReposSection,
    prFilesFormatted,
  );

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
    const triggerType = prContext.triggerContext?.interactiveMention
      ? "interactive mention"
      : "full review";
    debugLog(`Starting agentic PR review (${triggerType})`);
    debugLog(`Max turns: ${maxTurns === null ? "unlimited" : maxTurns}`);
    debugLog(`PR: ${prContext.repo}#${prContext.prNumber}`);
    debugLog(`Repository files available: ${repoFilePaths.length}`);
    if (botPreviousComments.length > 0) {
      debugLog(`Bot previous comments for deduplication: ${botPreviousComments.length}`);
    }

    // Build run options
    // Note: The @openai/agents SDK defaults to 10 turns if maxTurns is not provided.
    // When maxTurns is null (meaning "unlimited"), we pass a very large number.
    const effectiveMaxTurns = maxTurns ?? Number.MAX_SAFE_INTEGER;
    const runOptions = {
      callModelInputFilter: interventionFilter,
      maxTurns: effectiveMaxTurns,
    };

    const result = await runner.run(agent, initialMessage, runOptions);

    if (result.finalOutput) {
      debugLog("Agent completed review with structured output.");
      debugLog(`  Verdict: ${result.finalOutput.verdict}`);
      debugLog(`  Summary: ${result.finalOutput.summary}`);
      debugLog(`  Comments posted (self-reported): ${result.finalOutput.commentsPosted}`);
      debugLog(`  Comments posted (tracked): ${reviewState.commentsPostedThisRun.length}`);
    } else {
      debugLog("Agent completed without structured output (unexpected).");
      debugLog(`  Comments posted this run: ${reviewState.commentsPostedThisRun.length}`);
      debugLog(`  Review submitted: ${reviewState.hasSubmittedReview}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugError("An error occurred while running the agent:", errorMessage);
    throw error;
  }
}
