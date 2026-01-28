export interface ReviewConfig {
  pr: number;
  provider: string;
  modelName: string;
  githubToken: string;
  githubRepository: string;
  maxTurns: number;
  debug: boolean;
  blockingOnly: boolean;
}

export interface ModelConfig {
  provider: string;
  modelName: string;
  apiKey: string;
  /** OpenAI reasoning effort: 'none' (GPT-5.1 only) | 'minimal' | 'low' | 'medium' | 'high' */
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
  /** Anthropic effort for claude-opus-4-5: 'low' | 'medium' | 'high' (default) */
  effort?: "low" | "medium" | "high";
  /** Anthropic thinking config for claude-opus-4-5, claude-sonnet-4-5, claude-3-7-sonnet */
  thinking?: {
    type: "enabled" | "disabled";
    budgetTokens?: number;
  };
}

export interface ParsedArgs {
  pr: number;
}

/**
 * Context for an interactive @codepress mention in a PR comment.
 */
export interface InteractiveMentionContext {
  /** The user's message after @codepress */
  userMessage: string;
  /** The GitHub comment ID */
  commentId: number;
  /** The GitHub username of the person who made the comment */
  commentAuthor: string;
  /** The full comment body */
  commentBody: string;
  /** Whether this is a review comment (inline on code) vs issue comment (general PR comment) */
  isReviewComment: boolean;
  /** File path if this is a review comment */
  filePath?: string;
  /** Line number if this is a review comment */
  line?: number;
  /** The diff hunk context if this is a review comment */
  diffHunk?: string;
}

/**
 * Context about how the review was triggered.
 * Used to determine re-review behavior.
 */
export interface TriggerContext {
  /** Whether this is a re-review (new commits pushed or re-review requested) */
  isReReview: boolean;
  /** The event that triggered the review */
  triggerEvent: "opened" | "reopened" | "synchronize" | "review_requested" | "comment_trigger" | "interactive_mention" | "workflow_dispatch";
  /** The bot's previous review state on this PR, if any */
  previousReviewState?: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING" | null;
  /** The commit SHA of the previous review, if any */
  previousReviewCommitSha?: string | null;
  /** Force a full review of all files, ignoring re-review optimizations */
  forceFullReview?: boolean;
  /** Interactive mention context if triggered by @codepress */
  interactiveMention?: InteractiveMentionContext;
}

/**
 * Represents an existing review comment on the PR.
 * These are comments made by other reviewers that the bot should be aware of.
 */
export interface ExistingReviewComment {
  /** GitHub comment ID (for adding reactions) */
  id: number;
  /** GitHub username of the commenter */
  author: string;
  /** The comment body/text */
  body: string;
  /** File path the comment is on */
  path: string;
  /** Line number in the new version of the file (may be null for file-level comments) */
  line: number | null;
  /** The diff hunk context around the comment */
  diffHunk: string;
  /** ISO timestamp when the comment was created */
  createdAt: string;
}

/**
 * Represents a previous comment posted by the bot itself.
 * Used for deduplication to prevent posting duplicate comments.
 */
export interface BotComment {
  /** GitHub comment ID */
  id: number;
  /** File path the comment is on */
  path: string;
  /** Line number in the new version of the file */
  line: number | null;
  /** Original line number (may differ from line due to subsequent changes) */
  originalLine: number | null;
  /** The comment body/text */
  body: string;
  /** The diff hunk context around the comment */
  diffHunk: string;
  /** ISO timestamp when the comment was created */
  createdAt: string;
}

/**
 * Configuration for a related repository that can be accessed for context.
 */
export interface RelatedRepo {
  /** Repository in owner/repo format */
  repo: string;
  /** Git ref to checkout (branch, tag, or commit) */
  ref: string;
  /** Description of what this repo contains and when to use it */
  description: string;
  /** Local path where the repo is cloned (set at runtime) */
  localPath?: string;
}

/**
 * State tracked across agent turns during a review.
 * Used for intervention injection and progress tracking.
 */
export interface ReviewState {
  /** Current turn number (1-indexed) */
  currentTurn: number;
  /** Maximum turns allowed (null = unlimited) */
  maxTurns: number | null;
  /** Tool calls made in the current turn */
  toolCallsThisTurn: string[];

  // Progress tracking
  /** Whether the agent has checked its own previous comments */
  hasCheckedExistingComments: boolean;
  /** Whether the agent has submitted a formal review */
  hasSubmittedReview: boolean;

  // NOTE: filesChanged/filesReviewed tracking is commented out because:
  // 1. We'd need an extra API call to get the list of changed files before the agent starts
  // 2. The agent already tracks its own progress via the todo list (adds a todo per file)
  // 3. The agent fetches changed files itself with `gh pr view --json files`
  // If we want to enable the "speed up" intervention (warn when >50% turns used but <50% files reviewed),
  // uncomment these fields and populate filesChanged from PR context before calling reviewFullDiff.
  // /** List of files changed in the PR */
  // filesChanged: string[];
  // /** Set of files that have been reviewed */
  // filesReviewed: Set<string>;

  // Deduplication
  /** Bot's previous comments on this PR */
  botPreviousComments: BotComment[];
  /** Comments posted during this run */
  commentsPostedThisRun: Array<{ path: string; line: number; body: string }>;
}
