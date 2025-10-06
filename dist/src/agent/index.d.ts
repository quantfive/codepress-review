import { AgentResponse, DiffSummary, Finding, ModelConfig } from "../types";
/**
 * Reviews a diff chunk using the interactive agent.
 */
export declare function reviewChunkWithAgent(diffChunk: string, modelConfig: ModelConfig, diffSummary: DiffSummary | undefined, chunkIndex: number, repoFilePaths: string[], existingComments?: any[], maxTurns?: number, blockingOnly?: boolean): Promise<AgentResponse>;
/**
 * Reviews a diff chunk using the interactive agent.
 * @deprecated Use reviewChunkWithAgent which returns the full AgentResponse instead
 */
export declare function reviewChunkWithAgentLegacy(diffChunk: string, modelConfig: ModelConfig, diffSummary: DiffSummary | undefined, chunkIndex: number, repoFilePaths: string[], existingComments?: any[], maxTurns?: number, blockingOnly?: boolean): Promise<Finding[]>;
//# sourceMappingURL=index.d.ts.map