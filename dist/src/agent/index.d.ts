import { BotComment, ExistingReviewComment, ModelConfig, RelatedRepo, TriggerContext } from "../types";
export interface PRContext {
    repo: string;
    prNumber: number;
    commitSha: string;
    triggerContext?: TriggerContext;
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
export declare function reviewFullDiff(modelConfig: ModelConfig, repoFilePaths: string[], prContext: PRContext, maxTurns?: number | null, // null = unlimited (default)
blockingOnly?: boolean, existingComments?: ExistingReviewComment[], botPreviousComments?: BotComment[], relatedRepos?: RelatedRepo[]): Promise<void>;
//# sourceMappingURL=index.d.ts.map