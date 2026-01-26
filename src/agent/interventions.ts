import type { ReviewState } from "../types";
import { calculateProgress } from "./review-state";

/**
 * Generates system reminders based on the current review state.
 * These are injected as <system-reminder> tags in user messages during the review.
 */
export function generateInterventions(state: ReviewState): string[] {
  const interventions: string[] = [];
  const progress = calculateProgress(state);

  // Only generate turn-based warnings if maxTurns is set
  if (state.maxTurns !== null) {
    const turnsRemaining = progress.turnsRemaining ?? 0;

    // Warning: Running low on turns
    if (turnsRemaining <= 3 && turnsRemaining > 0) {
      interventions.push(
        `⚠️ **TURN BUDGET WARNING**: You have only ${turnsRemaining} turn${turnsRemaining === 1 ? "" : "s"} remaining. ` +
          `Complete the review NOW. Focus on:\n` +
          `1. Completing your todo list (any unreviewed files)\n` +
          `2. Submitting your formal review (gh pr review)`,
      );
    }

    // Critical: At max turns, force completion
    if (turnsRemaining === 0) {
      interventions.push(
        `🛑 **FINAL TURN**: This is your last turn. You MUST:\n` +
          `1. Submit your review immediately using \`gh pr review\`\n` +
          `2. Do NOT make any more tool calls that don't directly submit the review`,
      );
    }

    // NOTE: File progress warning is disabled - see NOTE in types.ts ReviewState interface
    // To enable, uncomment filesChanged/filesReviewed in ReviewState and populate filesChanged
    // before calling reviewFullDiff.
    // // Progress warning: Spent too many turns without enough progress
    // if (
    //   progress.turnsPercentUsed !== null &&
    //   progress.turnsPercentUsed > 50 &&
    //   progress.filesPercentReviewed < 50 &&
    //   progress.filesChangedCount > 0
    // ) {
    //   const filesRemaining =
    //     progress.filesChangedCount - progress.filesReviewedCount;
    //   interventions.push(
    //     `⚡ **SPEED UP**: You've used ${Math.round(progress.turnsPercentUsed)}% of your turns but only reviewed ` +
    //       `${Math.round(progress.filesPercentReviewed)}% of files. ${filesRemaining} file${filesRemaining === 1 ? "" : "s"} remaining. ` +
    //       `Review remaining files more efficiently.`,
    //   );
    // }
  }

  // Warning: Haven't checked existing comments yet
  if (
    state.currentTurn >= 3 &&
    !state.hasCheckedExistingComments &&
    state.botPreviousComments.length > 0
  ) {
    interventions.push(
      `📝 **CRITICAL: Check your previous comments**. You have ${state.botPreviousComments.length} previous comment(s) ` +
        `on this PR. Review them before posting new comments to avoid duplicates.`,
    );
  }

  return interventions;
}

/**
 * Wraps content with system reminder tags.
 */
export function wrapWithSystemReminder(content: string): string {
  if (!content.trim()) return "";
  return `<system-reminder>\n${content}\n</system-reminder>`;
}

/**
 * Generates the complete intervention block to inject into messages.
 * Returns empty string if no interventions are needed.
 */
export function generateInterventionBlock(state: ReviewState): string {
  const interventions = generateInterventions(state);

  if (interventions.length === 0) {
    return "";
  }

  return wrapWithSystemReminder(interventions.join("\n\n"));
}

/**
 * The MAX_STEPS prompt to inject when at the turn limit.
 * Forces the agent to respond with text only (no tool calls).
 */
export const MAX_STEPS_PROMPT = `I need to complete this review now. I will respond with my final assessment without making any more tool calls.`;

/**
 * Checks if we should inject the max steps prompt (force text-only response).
 * This is only applicable when maxTurns is set.
 */
export function shouldForceTextOnly(state: ReviewState): boolean {
  if (state.maxTurns === null) return false;
  return state.currentTurn >= state.maxTurns;
}

/**
 * Analyzes tool call output to update state based on patterns.
 * Called after each tool execution to track progress.
 */
export function analyzeToolOutput(
  state: ReviewState,
  toolName: string,
  toolInput: unknown,
  _toolOutput: string,
): void {
  // Detect complete_review tool call
  if (toolName === "complete_review") {
    console.log("[Review] complete_review tool called - review will terminate");
    // The actual termination is handled in the runner's agent_tool_end hook
    return;
  }

  if (toolName === "bash") {
    const inputStr = typeof toolInput === "string" ? toolInput : JSON.stringify(toolInput);

    // Check if this was a gh pr view --comments call (checking existing comments)
    if (inputStr.includes("gh pr view") && inputStr.includes("--comments")) {
      state.hasCheckedExistingComments = true;
    }

    // Check if this was a review submission
    if (inputStr.includes("gh pr review")) {
      state.hasSubmittedReview = true;
    }

    // Check if this was posting a comment
    if (inputStr.includes("/pulls/") && inputStr.includes("/comments")) {
      // Try to extract path and line from the command
      const pathMatch = inputStr.match(/-f path="([^"]+)"/);
      const lineMatch = inputStr.match(/-f line=(\d+)/);

      if (pathMatch && lineMatch) {
        const path = pathMatch[1];
        const line = parseInt(lineMatch[1], 10);
        // Extract body if possible
        const bodyMatch = inputStr.match(/-f body="([^"]+)"/);
        const body = bodyMatch ? bodyMatch[1] : "";

        state.commentsPostedThisRun.push({ path, line, body });
      }
    }
  }

  // NOTE: Todo-based file tracking is disabled - see NOTE in types.ts ReviewState interface
  // if (toolName === "todo") {
  //   // Track file review progress based on todo operations
  //   const inputObj = typeof toolInput === "object" && toolInput !== null ? toolInput : {};
  //   const action = (inputObj as Record<string, unknown>).action;
  //
  //   if (action === "done") {
  //     // Mark files as reviewed based on todo completion
  //     const task = (inputObj as Record<string, unknown>).task as string | undefined;
  //     const tasks = (inputObj as Record<string, unknown>).tasks as string[] | undefined;
  //
  //     const doneTasks = tasks || (task ? [task] : []);
  //     for (const t of doneTasks) {
  //       // Check if this looks like a file path
  //       if (t.includes("/") || t.includes(".")) {
  //         state.filesReviewed.add(t);
  //       }
  //     }
  //   }
  // }
}
