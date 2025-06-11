import { FileLineMap } from "./types";
export interface ProcessableChunk {
    fileName: string;
    content: string;
    hunk: any;
}
/**
 * Splits a diff text into processable chunks.
 * @param diffText The raw diff text.
 * @returns An array of processable chunks.
 */
export declare function splitDiff(diffText: string): ProcessableChunk[];
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