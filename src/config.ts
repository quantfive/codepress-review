import { ReviewConfig, ParsedArgs, ModelConfig } from "./types";

export function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let pr = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pr") pr = args[++i];
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
const PROVIDER_API_KEY_MAP: Record<string, string> = {
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

export function getModelConfig(): ModelConfig {
  const provider = process.env.MODEL_PROVIDER;
  const modelName = process.env.MODEL_NAME;

  if (!provider || !modelName) {
    throw new Error("MODEL_PROVIDER and MODEL_NAME are required");
  }

  // Get reasoning/thinking configuration
  const reasoningEffort = process.env.REASONING_EFFORT as
    | "none"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | undefined;
  const anthropicEffort = process.env.ANTHROPIC_EFFORT as
    | "low"
    | "medium"
    | "high"
    | undefined;
  const thinkingEnabled =
    process.env.THINKING_ENABLED?.toLowerCase() === "true";
  const thinkingBudget = parseInt(process.env.THINKING_BUDGET || "10000", 10);

  // Build thinking config if enabled
  const thinking = thinkingEnabled
    ? { type: "enabled" as const, budgetTokens: thinkingBudget }
    : undefined;

  // Get the expected environment variable name for this provider
  const envVarName = PROVIDER_API_KEY_MAP[provider.toLowerCase()];

  if (!envVarName) {
    // For unknown providers, try the pattern PROVIDER_API_KEY
    const fallbackEnvVar = `${provider.toUpperCase()}_API_KEY`;
    const apiKey = process.env[fallbackEnvVar];

    if (!apiKey) {
      const supportedProviders = Object.keys(PROVIDER_API_KEY_MAP).join(", ");
      throw new Error(
        `Unknown provider "${provider}". Supported providers: ${supportedProviders}. ` +
          `For unknown providers, set ${fallbackEnvVar} environment variable.`,
      );
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

export function getReviewConfig(): ReviewConfig {
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
  const maxTurns = parseInt(process.env.MAX_TURNS!, 10);
  if (isNaN(maxTurns) || maxTurns <= 0) {
    throw new Error("MAX_TURNS must be a positive number");
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
