import type { ReviewConfig } from "./types";
/**
 * Service class that orchestrates the review process.
 * The agent has full autonomy to:
 * - Fetch the diff via gh CLI (agentic diff exploration)
 * - Explore the codebase with tools
 * - Search the web for documentation
 * - Post comments and update PR description directly via gh CLI
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
     * The agent will fetch the diff itself via gh CLI commands.
     */
    execute(): Promise<void>;
}
//# sourceMappingURL=review-service.d.ts.map