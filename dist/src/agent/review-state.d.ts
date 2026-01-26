import type { BotComment, ReviewState } from "../types";
/**
 * Creates a new ReviewState with default values.
 */
export declare function createReviewState(options: {
    maxTurns: number | null;
    botPreviousComments?: BotComment[];
}): ReviewState;
/**
 * Advances the state to the next turn.
 */
export declare function advanceTurn(state: ReviewState): void;
/**
 * Records a tool call in the current turn.
 */
export declare function recordToolCall(state: ReviewState, toolName: string): void;
/**
 * Records a comment posted during this run.
 */
export declare function recordCommentPosted(state: ReviewState, path: string, line: number, body: string): void;
/**
 * Marks that the agent has checked existing comments.
 */
export declare function markExistingCommentsChecked(state: ReviewState): void;
/**
 * Marks that the agent has submitted a formal review.
 */
export declare function markReviewSubmitted(state: ReviewState): void;
/**
 * Calculates progress metrics for the review.
 */
export declare function calculateProgress(state: ReviewState): {
    turnsUsed: number;
    turnsRemaining: number | null;
    turnsPercentUsed: number | null;
};
/**
 * Checks if a potential comment is similar to a previous bot comment.
 * This is a heuristic check - the LLM makes the final decision.
 */
export declare function findSimilarPreviousComment(state: ReviewState, path: string, line: number): BotComment | null;
/**
 * Checks if a comment was already posted in this run.
 */
export declare function wasCommentPostedThisRun(state: ReviewState, path: string, line: number): boolean;
//# sourceMappingURL=review-state.d.ts.map