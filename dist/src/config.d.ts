import type { ModelConfig, ParsedArgs, ReviewConfig } from "./types";
/**
 * Dynamically resolves "latest" aliases by querying the provider's model list API.
 * Falls back to static aliases if the API call fails.
 */
export declare function resolveModelAliasDynamic(provider: string, modelName: string, apiKey: string): Promise<string>;
/**
 * Synchronous fallback resolver for when async resolution isn't possible.
 * Uses static fallback aliases only.
 */
export declare function resolveModelAlias(provider: string, modelName: string): string;
export declare function parseArgs(): ParsedArgs;
export declare function getModelConfig(): Promise<ModelConfig>;
export declare function getReviewConfig(): Promise<ReviewConfig>;
//# sourceMappingURL=config.d.ts.map