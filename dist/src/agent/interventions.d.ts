import type { ReviewState } from "../types";
/**
 * Generates system reminders based on the current review state.
 * These are injected as <system-reminder> tags in user messages during the review.
 */
export declare function generateInterventions(state: ReviewState): string[];
/**
 * Wraps content with system reminder tags.
 */
export declare function wrapWithSystemReminder(content: string): string;
/**
 * Generates the complete intervention block to inject into messages.
 * Returns empty string if no interventions are needed.
 */
export declare function generateInterventionBlock(state: ReviewState): string;
/**
 * The MAX_STEPS prompt to inject when at the turn limit.
 * Forces the agent to respond with text only (no tool calls).
 */
export declare const MAX_STEPS_PROMPT = "I need to complete this review now. I will respond with my final assessment without making any more tool calls.";
/**
 * Checks if we should inject the max steps prompt (force text-only response).
 * This is only applicable when maxTurns is set.
 */
export declare function shouldForceTextOnly(state: ReviewState): boolean;
/**
 * Analyzes tool call output to update state based on patterns.
 * Called after each tool execution to track progress.
 */
export declare function analyzeToolOutput(state: ReviewState, toolName: string, toolInput: unknown, _toolOutput: string): void;
//# sourceMappingURL=interventions.d.ts.map