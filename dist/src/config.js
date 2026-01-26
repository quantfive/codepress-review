"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgs = parseArgs;
exports.getModelConfig = getModelConfig;
exports.getReviewConfig = getReviewConfig;
function parseArgs() {
    const args = process.argv.slice(2);
    let pr = "";
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--pr")
            pr = args[++i];
    }
    if (!pr) {
        console.error("Usage: ts-node scripts/ai-review.ts --pr <pr-number>");
        process.exit(1);
    }
    return { pr: Number(pr) };
}
/**
 * Mapping of provider names to their expected environment variable names
 */
const PROVIDER_API_KEY_MAP = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    google: "GEMINI_API_KEY", // Alias for gemini
    cohere: "COHERE_API_KEY",
    mistral: "MISTRAL_API_KEY",
    perplexity: "PERPLEXITY_API_KEY",
    fireworks: "FIREWORKS_API_KEY",
    groq: "GROQ_API_KEY",
    xai: "XAI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    "openai-compatible": "OPENAI_COMPATIBLE_API_KEY",
    ollama: "OLLAMA_API_KEY", // Special case for Ollama (often no key needed)
};
function getModelConfig() {
    const provider = process.env.MODEL_PROVIDER;
    const modelName = process.env.MODEL_NAME;
    if (!provider || !modelName) {
        throw new Error("MODEL_PROVIDER and MODEL_NAME are required");
    }
    // Get reasoning/thinking configuration
    const reasoningEffort = process.env.REASONING_EFFORT;
    const anthropicEffort = process.env.ANTHROPIC_EFFORT;
    const thinkingEnabled = process.env.THINKING_ENABLED?.toLowerCase() === "true";
    const thinkingBudget = parseInt(process.env.THINKING_BUDGET || "10000", 10);
    // Build thinking config if enabled
    const thinking = thinkingEnabled
        ? { type: "enabled", budgetTokens: thinkingBudget }
        : undefined;
    // Get the expected environment variable name for this provider
    const envVarName = PROVIDER_API_KEY_MAP[provider.toLowerCase()];
    if (!envVarName) {
        // For unknown providers, try the pattern PROVIDER_API_KEY
        const fallbackEnvVar = `${provider.toUpperCase()}_API_KEY`;
        const apiKey = process.env[fallbackEnvVar];
        if (!apiKey) {
            const supportedProviders = Object.keys(PROVIDER_API_KEY_MAP).join(", ");
            throw new Error(`Unknown provider "${provider}". Supported providers: ${supportedProviders}. ` +
                `For unknown providers, set ${fallbackEnvVar} environment variable.`);
        }
        return {
            provider,
            modelName,
            apiKey,
            reasoningEffort: reasoningEffort || undefined,
            effort: anthropicEffort || undefined,
            thinking,
        };
    }
    // Use the mapped environment variable name
    const apiKey = process.env[envVarName];
    if (!apiKey) {
        throw new Error(`${envVarName} is required for provider "${provider}"`);
    }
    return {
        provider,
        modelName,
        apiKey,
        reasoningEffort: reasoningEffort || undefined,
        effort: anthropicEffort || undefined,
        thinking,
    };
}
function getReviewConfig() {
    const { pr } = parseArgs();
    const { provider, modelName } = getModelConfig();
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepository = process.env.GITHUB_REPOSITORY;
    if (!githubToken) {
        throw new Error("GITHUB_TOKEN environment variable is required");
    }
    if (!githubRepository) {
        throw new Error("GITHUB_REPOSITORY environment variable is required");
    }
    // Parse maxTurns from environment variable
    // 0 or empty = unlimited (will be handled as null downstream)
    const maxTurnsEnv = process.env.MAX_TURNS;
    let maxTurns = 0; // 0 means unlimited
    if (maxTurnsEnv) {
        const parsed = parseInt(maxTurnsEnv, 10);
        if (!isNaN(parsed) && parsed > 0) {
            maxTurns = parsed;
        }
        // If parsing fails or value is 0/negative, use unlimited (0)
    }
    // Parse debug from environment variable, default to false
    const debugEnv = process.env.DEBUG || "false";
    const debug = debugEnv.toLowerCase() === "true";
    // Parse blockingOnly from environment variable, default to false
    const blockingOnlyEnv = process.env.BLOCKING_ONLY || "false";
    const blockingOnly = blockingOnlyEnv.toLowerCase() === "true";
    return {
        pr,
        provider,
        modelName,
        githubToken,
        githubRepository,
        maxTurns,
        debug,
        blockingOnly,
    };
}
//# sourceMappingURL=config.js.map