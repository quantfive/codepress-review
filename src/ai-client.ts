import { APICallError } from "ai";
import { setTimeout } from "node:timers/promises";
import { debugWarn } from "./debug";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

/**
 * Normalizes indentation by removing common leading whitespace from all lines.
 * This prevents XML indentation from being interpreted as code blocks in markdown.
 */
export function normalizeIndentation(text: string): string {
  const lines = text.split("\n");

  // Find non-empty lines to calculate minimum indentation
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return text.trim();
  }

  // Find the minimum indentation among non-empty lines
  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^[ \t]*/);
      return match ? match[0].length : 0;
    }),
  );

  // Remove the minimum indentation from all lines
  const normalizedLines = lines.map((line) => {
    if (line.trim().length === 0) {
      return ""; // Keep empty lines empty
    }
    return line.slice(minIndent);
  });

  return normalizedLines.join("\n").trim();
}

/**
 * Executes a function with retry logic.
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  label: string = "operation",
): Promise<T> {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (APICallError.isInstance(error) && !error.isRetryable) {
        throw error; // Re-throw to be caught by the service and not retried
      }

      attempt++;
      if (attempt >= MAX_RETRIES) {
        const err = error as { message?: string };
        throw new Error(
          `[${label}] Failed after ${MAX_RETRIES} retries: ${err?.message || "unknown"}`,
        );
      }
      const wait = RETRY_BASE_MS * Math.pow(2, attempt);
      debugWarn(
        `[${label}] Attempt ${attempt} failed. Retrying in ${wait}ms...`,
      );
      await setTimeout(wait);
    }
  }
  // This part should not be reachable, but it makes TypeScript happy.
  throw new Error(`[${label}] Exited retry loop unexpectedly.`);
}
