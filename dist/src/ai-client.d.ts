import { Finding, ModelConfig, DiffSummary } from "./types";
import { ProcessableChunk } from "./diff-parser";
/**
 * Reviews a diff chunk using the AI model.
 */
export declare function reviewChunk(diffChunk: string, modelConfig: ModelConfig, customPrompt?: string, summaryContext?: string): Promise<Finding[]>;
/**
 * Executes a function with retry logic.
 */
export declare function callWithRetry<T>(fn: () => Promise<T>, hunkIdx: number): Promise<T>;
/**
 * Summarizes the entire diff and provides notes for each chunk.
 */
export declare function summarizeDiff(chunks: ProcessableChunk[], modelConfig: ModelConfig, customPrompt?: string): Promise<DiffSummary>;
//# sourceMappingURL=ai-client.d.ts.map