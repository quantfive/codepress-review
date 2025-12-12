import type { ReviewConfig } from "./types";
/**
 * Service class that orchestrates the review process.
 * The agent now has full autonomy to post comments and update PR description directly via gh CLI.
 */
export declare class ReviewService {
    private config;
    private repoFilePaths;
    constructor(config: ReviewConfig);
    /**
     * Retrieves all file paths in the repository using git.
     */
    private getRepoFilePaths;
    /**
     * Executes the complete review process using a single autonomous agent.
     */
    execute(): Promise<void>;
    /**
     * Filters a diff to remove entire file blocks that match ignore patterns.
     * Each file block starts with "diff --git" and includes all headers (index, ---, +++, @@)
     * and content lines until the next "diff --git" line.
     */
    private filterDiffByIgnorePatterns;
}
//# sourceMappingURL=review-service.d.ts.map