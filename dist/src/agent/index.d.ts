import { ExistingReviewComment, ModelConfig } from "../types";
export interface PRContext {
    repo: string;
    prNumber: number;
    commitSha: string;
}
/**
 * Reviews an entire PR diff using a single interactive agent.
 * The agent has full autonomy to:
 * - Fetch additional context via bash/gh CLI
 * - View existing PR comments
 * - Post review comments directly
 * - Update PR description if blank
 */
export declare function reviewFullDiff(fullDiff: string, modelConfig: ModelConfig, repoFilePaths: string[], prContext: PRContext, maxTurns?: number, blockingOnly?: boolean, existingComments?: ExistingReviewComment[]): Promise<void>;
//# sourceMappingURL=index.d.ts.map