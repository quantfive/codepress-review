import { Finding, ModelConfig } from "../types";
/**
 * Reviews a diff chunk using the interactive agent.
 */
export declare function reviewChunkWithAgent(diffChunk: string, modelConfig: ModelConfig, summaryContext: string, repoFilePaths: string[], customPrompt?: string): Promise<Finding[]>;
//# sourceMappingURL=index.d.ts.map