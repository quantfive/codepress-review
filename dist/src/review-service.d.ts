import { ReviewConfig } from "./types";
/**
 * Service class that orchestrates the entire review process.
 */
export declare class ReviewService {
    private config;
    private githubClient;
    private diffSummary?;
    private repoFilePaths;
    constructor(config: ReviewConfig);
    /**
     * Retrieves all file paths in the repository using git.
     */
    private getRepoFilePaths;
    /**
     * Processes a single diff chunk and returns findings instead of posting them immediately.
     */
    private processChunk;
    /**
     * Executes the complete review process.
     */
    execute(): Promise<void>;
}
//# sourceMappingURL=review-service.d.ts.map