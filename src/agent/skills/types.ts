import { InteractiveMentionContext, TriggerContext, BotComment, ExistingReviewComment, RelatedRepo } from "../../types";

/**
 * Context provided to skills for generating instructions.
 */
export interface SkillContext {
  /** Repository in owner/repo format */
  repo: string;
  /** PR number */
  prNumber: number;
  /** Current commit SHA */
  commitSha: string;
  /** List of all file paths in the repository */
  repoFilePaths: string[];
  /** Trigger context (re-review info, etc.) */
  triggerContext?: TriggerContext;
  /** Interactive mention context if triggered by @codepress */
  interactiveMention?: InteractiveMentionContext;
  /** Instructions from PR body (if any) */
  prBodyInstructions?: string;
  /** Whether to only post blocking/critical issues */
  blockingOnly?: boolean;
  /** Maximum turns allowed for the agent */
  maxTurns?: number | null;
  /** Existing review comments from other reviewers */
  existingComments?: ExistingReviewComment[];
  /** Bot's own previous comments (for deduplication) */
  botPreviousComments?: BotComment[];
  /** Related repos for cross-repo context */
  relatedRepos?: RelatedRepo[];
  /** Pre-filtered PR files formatted section */
  prFilesFormatted?: string;
}

/**
 * Defines a skill that the agent can load and use.
 */
export interface Skill {
  /** Unique identifier for the skill */
  name: string;
  /** Description shown to the agent to help it decide when to use this skill */
  description: string;
  /** Returns the full instructions when the skill is invoked */
  getInstructions(context: SkillContext): string;
}
