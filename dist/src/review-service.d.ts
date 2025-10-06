import type { ReviewConfig } from "./types";
/**
 * Service class that orchestrates the entire review process.
 */
export declare class ReviewService {
    private config;
    private githubClient;
    private diffSummary?;
    private repoFilePaths;
    private static readonly REQUIRED_BUDGET;
    private static readonly OPTIONAL_BUDGET;
    private static readonly NIT_BUDGET;
    constructor(config: ReviewConfig);
    /**
     * Normalize a message for cross-chunk deduplication by removing paths,
     * numbers, and condensing whitespace. This is intentionally simple.
     */
    private normalizeMessage;
    /**
     * Heuristic: identify messages that assert unused/missing without evidence.
     * For Phase 1, drop such comments unless they include an "Evidence:" trail.
     */
    private passesHeuristicEvidenceGate;
    /**
     * Cross-chunk deduplication: cluster by normalized message. Keep the first
     * occurrence and annotate it with the number of similar spots.
     */
    private crossChunkDedupe;
    /**
     * Enforce simple service-level budgets per severity.
     */
    private enforceBudgets;
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