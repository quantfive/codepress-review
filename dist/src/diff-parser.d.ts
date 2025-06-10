import { FileLineMap } from "./types";
/**
 * Splits a diff into chunks for each file.
 */
export declare function splitDiff(diff: string): string[];
/**
 * Builds a mapping of file paths to line numbers from a diff chunk.
 */
export declare function buildFileLineMap(diffChunk: string): FileLineMap;
/**
 * Extracts the file path from a diff chunk.
 * @param chunk A single diff chunk.
 * @returns The file path or null if not found.
 */
export declare function getFileNameFromChunk(chunk: string): string | null;
//# sourceMappingURL=diff-parser.d.ts.map