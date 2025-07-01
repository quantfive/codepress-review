import { ModelConfig, DiffSummary, Finding } from "./types";
import { ProcessableChunk } from "./diff-parser";
/**
 * Normalizes indentation by removing common leading whitespace from all lines.
 * This prevents XML indentation from being interpreted as code blocks in markdown.
 */
export declare function normalizeIndentation(text: string): string;
/**
 * Executes a function with retry logic.
 */
export declare function callWithRetry<T>(fn: () => Promise<T>, hunkIdx: number): Promise<T>;
/**
 * Summarizes the entire diff and provides notes for each chunk.
 */
export declare function summarizeDiff(chunks: ProcessableChunk[], modelConfig: ModelConfig, existingReviews?: any[], existingComments?: any[]): Promise<DiffSummary>;
/**
 * Summarizes findings into concise paragraphs for each severity category.
 */
export declare function summarizeFindings(required: Finding[], optional: Finding[], nit: Finding[], fyi: Finding[], praise: Finding[], modelConfig: ModelConfig): Promise<{
    praiseSummary?: string;
    requiredSummary?: string;
    othersSummary?: string;
}>;
//# sourceMappingURL=ai-client.d.ts.map