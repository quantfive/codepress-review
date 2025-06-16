import { Finding, ModelConfig, DiffSummary } from "../types";
/**
 * Reviews a diff chunk using the interactive agent.
 */
export declare function reviewChunkWithAgent(diffChunk: string, modelConfig: ModelConfig, diffSummary: DiffSummary | undefined, chunkIndex: number, repoFilePaths: string[], maxTurns?: number): Promise<Finding[]>;
//# sourceMappingURL=index.d.ts.map