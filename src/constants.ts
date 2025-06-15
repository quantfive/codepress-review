/**
 * CodePress review identifiers and constants
 */
export const CODEPRESS_REVIEW_TAG = "CodePress Review" as const;

/**
 * Check if a review or comment is from CodePress
 */
export function isCodePressReview(content: string | null | undefined): boolean {
  return content?.includes(CODEPRESS_REVIEW_TAG) ?? false;
}

/**
 * Check if a review object is from CodePress
 */
export function isCodePressReviewObject(review: {
  body?: string | null;
}): boolean {
  return isCodePressReview(review.body);
}

/**
 * Check if a comment object is from CodePress
 */
export function isCodePressCommentObject(comment: {
  body?: string | null;
}): boolean {
  return isCodePressReview(comment.body);
}
