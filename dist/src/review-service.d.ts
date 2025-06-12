import { ReviewConfig } from "./types";
/**
 * Service class that orchestrates the entire review process.
 */
export declare class ReviewService {
    private config;
    private githubClient;
    private diffSummary?;
    constructor(config: ReviewConfig);
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