/**
 * CodePress review identifiers and constants
 */
export declare const CODEPRESS_REVIEW_TAG: "CodePress Review";
/**
 * Check if a review or comment is from CodePress
 */
export declare function isCodePressReview(content: string | null | undefined): boolean;
/**
 * Check if a review object is from CodePress
 */
export declare function isCodePressReviewObject(review: {
    body?: string | null;
}): boolean;
/**
 * Check if a comment object is from CodePress
 */
export declare function isCodePressCommentObject(comment: {
    body?: string | null;
}): boolean;
//# sourceMappingURL=constants.d.ts.map