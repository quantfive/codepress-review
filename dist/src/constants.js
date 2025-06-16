"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODEPRESS_REVIEW_TAG = void 0;
exports.isCodePressReview = isCodePressReview;
exports.isCodePressReviewObject = isCodePressReviewObject;
exports.isCodePressCommentObject = isCodePressCommentObject;
/**
 * CodePress review identifiers and constants
 */
exports.CODEPRESS_REVIEW_TAG = "CodePress Review";
/**
 * Check if a review or comment is from CodePress
 */
function isCodePressReview(content) {
    return content?.includes(exports.CODEPRESS_REVIEW_TAG) ?? false;
}
/**
 * Check if a review object is from CodePress
 */
function isCodePressReviewObject(review) {
    return isCodePressReview(review.body);
}
/**
 * Check if a comment object is from CodePress
 */
function isCodePressCommentObject(comment) {
    return isCodePressReview(comment.body);
}
//# sourceMappingURL=constants.js.map