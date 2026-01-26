"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewState = createReviewState;
exports.advanceTurn = advanceTurn;
exports.recordToolCall = recordToolCall;
exports.recordCommentPosted = recordCommentPosted;
exports.markExistingCommentsChecked = markExistingCommentsChecked;
exports.markReviewSubmitted = markReviewSubmitted;
exports.calculateProgress = calculateProgress;
exports.findSimilarPreviousComment = findSimilarPreviousComment;
exports.wasCommentPostedThisRun = wasCommentPostedThisRun;
/**
 * Creates a new ReviewState with default values.
 */
function createReviewState(options) {
    return {
        currentTurn: 0,
        maxTurns: options.maxTurns,
        toolCallsThisTurn: [],
        // Progress tracking
        hasCheckedExistingComments: false,
        hasSubmittedReview: false,
        // filesChanged/filesReviewed not currently populated - see NOTE in types.ts
        // filesChanged: options.filesChanged || [],
        // filesReviewed: new Set<string>(),
        // Deduplication
        botPreviousComments: options.botPreviousComments || [],
        commentsPostedThisRun: [],
    };
}
/**
 * Advances the state to the next turn.
 */
function advanceTurn(state) {
    state.currentTurn += 1;
    state.toolCallsThisTurn = [];
}
/**
 * Records a tool call in the current turn.
 */
function recordToolCall(state, toolName) {
    state.toolCallsThisTurn.push(toolName);
    // Track progress based on tool calls
    if (toolName === "bash") {
        // Note: We can't easily detect which bash command was run here.
        // The intervention system will check the tool call result for patterns.
    }
}
// NOTE: markFileReviewed is commented out - see NOTE in types.ts ReviewState interface
// /**
//  * Marks a file as reviewed.
//  */
// export function markFileReviewed(state: ReviewState, filePath: string): void {
//   state.filesReviewed.add(filePath);
// }
/**
 * Records a comment posted during this run.
 */
function recordCommentPosted(state, path, line, body) {
    state.commentsPostedThisRun.push({ path, line, body });
}
/**
 * Marks that the agent has checked existing comments.
 */
function markExistingCommentsChecked(state) {
    state.hasCheckedExistingComments = true;
}
/**
 * Marks that the agent has submitted a formal review.
 */
function markReviewSubmitted(state) {
    state.hasSubmittedReview = true;
}
/**
 * Calculates progress metrics for the review.
 */
function calculateProgress(state) {
    const turnsUsed = state.currentTurn;
    const turnsRemaining = state.maxTurns !== null ? state.maxTurns - turnsUsed : null;
    const turnsPercentUsed = state.maxTurns !== null ? (turnsUsed / state.maxTurns) * 100 : null;
    // NOTE: file progress tracking is disabled - see NOTE in types.ts ReviewState interface
    // const filesReviewedCount = state.filesReviewed.size;
    // const filesChangedCount = state.filesChanged.length;
    // const filesPercentReviewed =
    //   filesChangedCount > 0 ? (filesReviewedCount / filesChangedCount) * 100 : 100;
    return {
        turnsUsed,
        turnsRemaining,
        turnsPercentUsed,
        // filesReviewedCount,
        // filesChangedCount,
        // filesPercentReviewed,
    };
}
/**
 * Checks if a potential comment is similar to a previous bot comment.
 * This is a heuristic check - the LLM makes the final decision.
 */
function findSimilarPreviousComment(state, path, line) {
    // Look for comments on the same file within a line range
    const lineRange = 10; // Comments within 10 lines are considered potentially similar
    for (const prevComment of state.botPreviousComments) {
        if (prevComment.path !== path)
            continue;
        const prevLine = prevComment.line ?? prevComment.originalLine;
        if (prevLine === null)
            continue;
        if (Math.abs(prevLine - line) <= lineRange) {
            return prevComment;
        }
    }
    return null;
}
/**
 * Checks if a comment was already posted in this run.
 */
function wasCommentPostedThisRun(state, path, line) {
    return state.commentsPostedThisRun.some((c) => c.path === path && c.line === line);
}
//# sourceMappingURL=review-state.js.map