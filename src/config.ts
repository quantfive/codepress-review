import type { ModelConfig, ParsedArgs, ReviewConfig } from "./types";

/**
 * Fallback model aliases used when dynamic resolution fails or is not available.
 * These are updated periodically but may lag behind actual releases.
 */
const FALLBACK_MODEL_ALIASES: Record<string, Record<string, string>> = {
  openai: {
    latest: "gpt-5.2",
    "gpt-latest": "gpt-5.2",
    "gpt-mini-latest": "gpt-5.2-mini",
  },
  anthropic: {
    latest: "claude-sonnet-4-5",
    "sonnet-latest": "claude-sonnet-4-5",
    "opus-latest": "claude-opus-4-5",
    "haiku-latest": "claude-haiku-3-5",
  },
  gemini: {
    latest: "gemini-3.0-flash",
    "gemini-latest": "gemini-3.0-flash",
    "gemini-flash-latest": "gemini-3.0-flash",
    "gemini-pro-latest": "gemini-2.5-pro",
  },
  google: {
    latest: "gemini-3.0-flash",
    "gemini-latest": "gemini-3.0-flash",
    "gemini-flash-latest": "gemini-3.0-flash",
    "gemini-pro-latest": "gemini-2.5-pro",
  },
  mistral: {
    latest: "mistral-large-latest",
    "mistral-large-latest": "mistral-large-latest",
    "mistral-small-latest": "mistral-small-latest",
    "codestral-latest": "codestral-latest",
  },
  cohere: {
    latest: "command-a-03-2025",
    "command-latest": "command-a-03-2025",
    "command-r-latest": "command-r-plus",
  },
  groq: {
    latest: "llama-3.3-70b-versatile",
    "llama-latest": "llama-3.3-70b-versatile",
  },
  deepseek: {
    latest: "deepseek-chat",
    "deepseek-chat-latest": "deepseek-chat",
    "deepseek-reasoner-latest": "deepseek-reasoner",
  },
  xai: {
    latest: "grok-4",
    "grok-latest": "grok-4",
    "grok-mini-latest": "grok-3-mini",
  },
  perplexity: {
    latest: "sonar-pro",
    "sonar-latest": "sonar-pro",
    "sonar-reasoning-latest": "sonar-reasoning-pro",
  },
  fireworks: {
    latest: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    "llama-latest": "accounts/fireworks/models/llama-v3p3-70b-instruct",
  },
  ollama: {
    // Ollama models are local, fallbacks less useful but included for consistency
    latest: "llama3.1:latest",
  },
};

/**
 * Model family patterns for dynamic resolution.
 * Maps alias keywords to regex patterns that match model names.
 */
const MODEL_FAMILY_PATTERNS: Record<string, Record<string, RegExp>> = {
  anthropic: {
    "sonnet-latest": /^claude-sonnet-(\d+)-(\d+)/,
    "opus-latest": /^claude-opus-(\d+)-(\d+)/,
    "haiku-latest": /^claude-haiku-(\d+)-(\d+)/,
    latest: /^claude-sonnet-(\d+)-(\d+)/, // Default to sonnet
  },
  openai: {
    // Match base GPT models: gpt-5, gpt-5.2, gpt-5-2025-08-07, gpt-5.2-2025-12-11
    // Excludes variants like -pro, -codex, -mini, -chat-latest, -search-api
    "gpt-latest": /^gpt-(\d+)(?:\.(\d+))?(?:-\d{4}-\d{2}-\d{2})?$/,
    "gpt-mini-latest": /^gpt-(\d+)(?:\.(\d+))?-mini(?:-\d{4}-\d{2}-\d{2})?$/,
    latest: /^gpt-(\d+)(?:\.(\d+))?(?:-\d{4}-\d{2}-\d{2})?$/, // Default to main GPT line
  },
  gemini: {
    "gemini-latest": /^gemini-(\d+)\.(\d+)-pro/,
    "gemini-flash-latest": /^gemini-(\d+)\.(\d+)-flash/,
    "gemini-pro-latest": /^gemini-(\d+)\.(\d+)-pro/,
    latest: /^gemini-(\d+)\.(\d+)-flash/, // Default to flash (fast + capable)
  },
  google: {
    "gemini-latest": /^gemini-(\d+)\.(\d+)-pro/,
    "gemini-flash-latest": /^gemini-(\d+)\.(\d+)-flash/,
    "gemini-pro-latest": /^gemini-(\d+)\.(\d+)-pro/,
    latest: /^gemini-(\d+)\.(\d+)-flash/,
  },
  // Note: Mistral maintains their own -latest aliases (e.g., mistral-large-latest)
  // so we just pass those through via static fallback - no need for dynamic resolution
  cohere: {
    "command-latest": /^command-a-(\d+)-(\d+)/,
    "command-r-latest": /^command-r-plus/,
    latest: /^command-a-(\d+)-(\d+)/, // Default to Command A (latest family)
  },
  groq: {
    "llama-latest": /^llama-(\d+)\.(\d+)-(\d+)b-versatile/,
    latest: /^llama-(\d+)\.(\d+)-(\d+)b-versatile/, // Default to versatile llama
  },
  deepseek: {
    "deepseek-chat-latest": /^deepseek-chat/,
    "deepseek-reasoner-latest": /^deepseek-reasoner/,
    latest: /^deepseek-chat/, // Default to chat model
  },
  xai: {
    "grok-latest": /^grok-(\d+)(?:\.(\d+))?(?:-(?!mini)|$)/,
    "grok-mini-latest": /^grok-(\d+)(?:\.(\d+))?-mini/,
    latest: /^grok-(\d+)(?:\.(\d+))?(?:-(?!mini)|$)/, // Default to main grok line
  },
  ollama: {
    // Ollama models use name:tag format, match the base name (e.g., llama3.1:latest)
    "llama-latest": /^llama(\d+)(?:\.(\d+))?/,
    latest: /^llama(\d+)(?:\.(\d+))?/,
  },
  // Note: perplexity and fireworks don't have list models APIs that work well
  // for dynamic resolution, so they use static fallbacks only
};

/**
 * Extracts semantic version from GPT model names (e.g., gpt-5.2 -> [5, 2]).
 * Handles the gpt-X or gpt-X.Y format, ignoring date suffixes like -2025-08-07.
 */
function extractGptVersion(modelName: string): number[] {
  // Match gpt-{major} or gpt-{major}.{minor}
  const match = modelName.match(/^gpt-(\d+)(?:\.(\d+))?/);
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = match[2] ? parseInt(match[2], 10) : 0;
    return [major, minor];
  }
  return [0, 0];
}

/**
 * Extracts version numbers from a model name for sorting.
 * Returns an array of numbers for comparison.
 */
function extractVersion(modelName: string): number[] {
  // For GPT models, use semantic versioning (gpt-X.Y) not all numbers
  if (modelName.startsWith("gpt-")) {
    return extractGptVersion(modelName);
  }
  // For other providers, extract all numbers
  const matches = modelName.match(/(\d+)/g);
  return matches ? matches.map(Number) : [0];
}

/**
 * Compares two version arrays. Returns positive if a > b, negative if a < b.
 */
function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const aVal = a[i] || 0;
    const bVal = b[i] || 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}

/**
 * Dynamically resolves "latest" aliases by querying the provider's model list API.
 * Falls back to static aliases if the API call fails.
 */
export async function resolveModelAliasDynamic(
  provider: string,
  modelName: string,
  apiKey: string,
): Promise<string> {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModel = modelName.toLowerCase().replace(/\s+/g, "-").trim();

  // Check if this is a "latest" alias that needs dynamic resolution
  const familyPatterns = MODEL_FAMILY_PATTERNS[normalizedProvider];
  const pattern = familyPatterns?.[normalizedModel];

  if (!pattern) {
    // Not a dynamic alias, check static fallbacks
    const fallback = FALLBACK_MODEL_ALIASES[normalizedProvider]?.[normalizedModel];
    if (fallback) {
      if (process.env.DEBUG === "true") {
        console.log(`Resolved model alias "${modelName}" → "${fallback}" (static fallback)`);
      }
      return fallback;
    }
    return modelName;
  }

  try {
    const models = await fetchAvailableModels(normalizedProvider, apiKey);

    // Filter models matching the family pattern
    const matchingModels = models.filter((m) => pattern.test(m));

    if (matchingModels.length === 0) {
      console.warn(`No models found matching pattern for "${normalizedModel}", using fallback`);
      const fallback = FALLBACK_MODEL_ALIASES[normalizedProvider]?.[normalizedModel];
      return fallback || modelName;
    }

    // Sort by version (descending) and pick the latest
    matchingModels.sort((a, b) => {
      const versionA = extractVersion(a);
      const versionB = extractVersion(b);
      return compareVersions(versionB, versionA); // Descending
    });

    const latest = matchingModels[0];
    if (process.env.DEBUG === "true") {
      console.log(`Resolved model alias "${modelName}" → "${latest}" (dynamic from API)`);
    }
    return latest;
  } catch (error) {
    console.warn(`Failed to dynamically resolve model alias: ${error}`);
    const fallback = FALLBACK_MODEL_ALIASES[normalizedProvider]?.[normalizedModel];
    if (fallback) {
      if (process.env.DEBUG === "true") {
        console.log(`Using fallback: "${modelName}" → "${fallback}"`);
      }
      return fallback;
    }
    return modelName;
  }
}

/**
 * Fetches available models from a provider's API.
 */
async function fetchAvailableModels(provider: string, apiKey: string): Promise<string[]> {
  let url: string;
  let headers: Record<string, string> = {};

  switch (provider) {
    case "anthropic":
      url = "https://api.anthropic.com/v1/models";
      headers = {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
      break;
    case "openai":
      url = "https://api.openai.com/v1/models";
      headers = {
        Authorization: `Bearer ${apiKey}`,
      };
      break;
    case "gemini":
    case "google":
      // Google Gemini API uses query param for auth
      url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      break;
    // Note: Mistral not included - they maintain their own -latest aliases
    case "cohere":
      url = "https://api.cohere.com/v1/models";
      headers = {
        Authorization: `Bearer ${apiKey}`,
      };
      break;
    case "groq":
      // Groq uses OpenAI-compatible format
      url = "https://api.groq.com/openai/v1/models";
      headers = {
        Authorization: `Bearer ${apiKey}`,
      };
      break;
    case "deepseek":
      url = "https://api.deepseek.com/models";
      headers = {
        Authorization: `Bearer ${apiKey}`,
      };
      break;
    case "xai":
      // xAI uses OpenAI-compatible format
      url = "https://api.x.ai/v1/models";
      headers = {
        Authorization: `Bearer ${apiKey}`,
      };
      break;
    case "ollama":
      // Ollama runs locally, default to localhost
      // Users can set OLLAMA_HOST env var if using a different host
      const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
      url = `${ollamaHost}/api/tags`;
      // Ollama typically doesn't require auth for local instances
      break;
    default:
      throw new Error(`Dynamic model resolution not supported for provider: ${provider}`);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // OpenAI, Anthropic, Mistral, Groq, DeepSeek, xAI return { data: [{ id: "model-name", ... }] }
  if (data.data && Array.isArray(data.data)) {
    return data.data.map((m: { id: string }) => m.id);
  }

  // Google returns { models: [{ name: "models/gemini-...", ... }] }
  if (data.models && Array.isArray(data.models)) {
    return data.models.map((m: { name: string }) => {
      // Strip "models/" prefix from name
      return m.name.replace(/^models\//, "");
    });
  }

  // Cohere returns { models: [{ name: "command-r-plus", ... }] }
  // but with 'name' field instead of 'id'
  if (data.models && Array.isArray(data.models) && data.models[0]?.name) {
    return data.models.map((m: { name: string }) => m.name);
  }

  // Ollama returns { models: [{ name: "llama3.1:latest", ... }] }
  if (provider === "ollama" && data.models && Array.isArray(data.models)) {
    return data.models.map((m: { name: string }) => m.name);
  }

  throw new Error("Unexpected response format from models API");
}

/**
 * Synchronous fallback resolver for when async resolution isn't possible.
 * Uses static fallback aliases only.
 */
export function resolveModelAlias(provider: string, modelName: string): string {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModel = modelName.toLowerCase().replace(/\s+/g, "-").trim();

  const fallback = FALLBACK_MODEL_ALIASES[normalizedProvider]?.[normalizedModel];
  if (fallback) {
    if (process.env.DEBUG === "true") {
      console.log(`Resolved model alias "${modelName}" → "${fallback}"`);
    }
    return fallback;
  }

  return modelName;
}

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

export async function getModelConfig(): Promise<ModelConfig> {
  const provider = process.env.MODEL_PROVIDER;
  const rawModelName = process.env.MODEL_NAME;

  if (!provider || !rawModelName) {
    throw new Error("MODEL_PROVIDER and MODEL_NAME are required");
  }

  // Get the expected environment variable name for this provider
  const envVarName = PROVIDER_API_KEY_MAP[provider.toLowerCase()];
  let apiKey: string | undefined;

  if (!envVarName) {
    // For unknown providers, try the pattern PROVIDER_API_KEY
    const fallbackEnvVar = `${provider.toUpperCase()}_API_KEY`;
    apiKey = process.env[fallbackEnvVar];

    if (!apiKey) {
      const supportedProviders = Object.keys(PROVIDER_API_KEY_MAP).join(", ");
      throw new Error(
        `Unknown provider "${provider}". Supported providers: ${supportedProviders}. ` +
          `For unknown providers, set ${fallbackEnvVar} environment variable.`,
      );
    }
  } else {
    // Use the mapped environment variable name
    apiKey = process.env[envVarName];
    if (!apiKey) {
      throw new Error(`${envVarName} is required for provider "${provider}"`);
    }
  }

  // Resolve "latest" aliases - try dynamic first, fall back to static
  let modelName: string;
  if (apiKey && rawModelName.toLowerCase().includes("latest")) {
    modelName = await resolveModelAliasDynamic(provider, rawModelName, apiKey);
  } else {
    modelName = resolveModelAlias(provider, rawModelName);
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

  return {
    provider,
    modelName,
    apiKey,
    reasoningEffort: reasoningEffort || undefined,
    effort: anthropicEffort || undefined,
    thinking,
  };
}

export async function getReviewConfig(): Promise<ReviewConfig> {
  const { pr } = parseArgs();
  const { provider, modelName } = await getModelConfig();

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
