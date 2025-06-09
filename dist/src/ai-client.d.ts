import { Finding, ModelConfig } from "./types";
/**
 * Reviews a diff chunk using the AI model.
 */
export declare function reviewChunk(diffChunk: string, modelConfig: ModelConfig, customPrompt?: string): Promise<Finding[]>;
/**
 * Executes a function with retry logic.
 */
export declare function callWithRetry<T>(fn: () => Promise<T>, hunkIdx: number): Promise<T>;
//# sourceMappingURL=ai-client.d.ts.map