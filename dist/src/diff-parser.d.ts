import { FileLineMap } from "./types";
/**
 * Splits a diff into individual hunks for focused review.
 * Each hunk becomes its own chunk with the necessary file headers.
 * This ensures each review is focused on a specific change rather than arbitrary size limits.
 */
export declare function splitDiff(diff: string): string[];
/**
 * Builds a mapping of file paths to line numbers from a diff chunk.
 */
export declare function buildFileLineMap(diffChunk: string): FileLineMap;
//# sourceMappingURL=diff-parser.d.ts.map