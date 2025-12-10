import { ModelConfig } from "./types";

const modelMap = new Map<string, any>();

/**
 * Provider configuration mapping
 * Maps provider names to their SDK create functions and package names
 */
interface ProviderConfig {
  createFn: (options: { apiKey: string }) => any;
  packageName: string;
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openai: {
    createFn: (options) => {
      const { createOpenAI } = require("@ai-sdk/openai");
      return createOpenAI(options);
    },
    packageName: "@ai-sdk/openai",
  },
  anthropic: {
    createFn: (options) => {
      const { createAnthropic } = require("@ai-sdk/anthropic");
      return createAnthropic(options);
    },
    packageName: "@ai-sdk/anthropic",
  },
  gemini: {
    createFn: (options) => {
      const { createGoogleGenerativeAI } = require("@ai-sdk/google");
      return createGoogleGenerativeAI(options);
    },
    packageName: "@ai-sdk/google",
  },
  google: {
    createFn: (options) => {
      const { createGoogleGenerativeAI } = require("@ai-sdk/google");
      return createGoogleGenerativeAI(options);
    },
    packageName: "@ai-sdk/google",
  },
  cohere: {
    createFn: (options) => {
      const { createCohere } = require("@ai-sdk/cohere");
      return createCohere(options);
    },
    packageName: "@ai-sdk/cohere",
  },
  mistral: {
    createFn: (options) => {
      const { createMistral } = require("@ai-sdk/mistral");
      return createMistral(options);
    },
    packageName: "@ai-sdk/mistral",
  },
  perplexity: {
    createFn: (options) => {
      const { createPerplexity } = require("@ai-sdk/perplexity");
      return createPerplexity(options);
    },
    packageName: "@ai-sdk/perplexity",
  },
  fireworks: {
    createFn: (options) => {
      const { createFireworks } = require("@ai-sdk/fireworks");
      return createFireworks(options);
    },
    packageName: "@ai-sdk/fireworks",
  },
  groq: {
    createFn: (options) => {
      const { createGroq } = require("@ai-sdk/groq");
      return createGroq(options);
    },
    packageName: "@ai-sdk/groq",
  },
  xai: {
    createFn: (options) => {
      const { createXai } = require("@ai-sdk/xai");
      return createXai(options);
    },
    packageName: "@ai-sdk/xai",
  },
  deepseek: {
    createFn: (options) => {
      const { createDeepSeek } = require("@ai-sdk/deepseek");
      return createDeepSeek(options);
    },
    packageName: "@ai-sdk/deepseek",
  },
  "openai-compatible": {
    createFn: (options) => {
      const { createOpenAI } = require("@ai-sdk/openai");
      const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
      if (!baseURL) {
        throw new Error("OPENAI_COMPATIBLE_BASE_URL environment variable is required for openai-compatible provider");
      }
      return createOpenAI({
        apiKey: options.apiKey || "dummy-key", // Some self-hosted models don't need real keys
        baseURL: baseURL,
      });
    },
    packageName: "@ai-sdk/openai",
  },
  ollama: {
    createFn: (options) => {
      const { createOpenAI } = require("@ai-sdk/openai");
      const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
      return createOpenAI({
        apiKey: options.apiKey || "ollama", // Ollama doesn't require real API keys
        baseURL: baseURL,
      });
    },
    packageName: "@ai-sdk/openai",
  },
};

/**
 * Validates reasoning effort configuration.
 * 'none' is only valid for GPT-5.1 models.
 */
function validateReasoningEffort(
  modelName: string,
  reasoningEffort: string | undefined,
): void {
  if (reasoningEffort === "none") {
    const isGpt51 = modelName.toLowerCase().includes("gpt-5.1");
    if (!isGpt51) {
      throw new Error(
        `reasoningEffort 'none' is only available for GPT-5.1 models. ` +
          `Current model: ${modelName}. Use 'minimal', 'low', 'medium', or 'high' instead.`,
      );
    }
  }
}

/**
 * Builds model settings based on provider and config options.
 */
function buildModelSettings(config: ModelConfig): Record<string, unknown> {
  const provider = config.provider.toLowerCase();
  const settings: Record<string, unknown> = {};

  // OpenAI reasoning effort
  if (
    (provider === "openai" || provider === "openai-compatible") &&
    config.reasoningEffort
  ) {
    validateReasoningEffort(config.modelName, config.reasoningEffort);
    settings.reasoningEffort = config.reasoningEffort;
  }

  // Anthropic provider options
  if (provider === "anthropic") {
    const anthropicOptions: Record<string, unknown> = {};

    // Effort option (for claude-opus-4-5)
    if (config.effort) {
      anthropicOptions.effort = config.effort;
    }

    // Thinking configuration (for opus/sonnet models)
    if (config.thinking?.type === "enabled") {
      anthropicOptions.thinking = {
        type: "enabled",
        budgetTokens: config.thinking.budgetTokens || 10000,
      };
    }

    if (Object.keys(anthropicOptions).length > 0) {
      settings.providerOptions = {
        anthropic: anthropicOptions,
      };
    }
  }

  return settings;
}

/**
 * Creates the appropriate AI model based on configuration.
 * Caches model instances to avoid recreating them.
 */
export async function createModel(config: ModelConfig) {
  const key = `${config.provider}-${config.modelName}-${config.reasoningEffort || ""}-${config.effort || ""}-${config.thinking?.type || ""}`;
  if (modelMap.has(key)) {
    return modelMap.get(key);
  }

  const providerConfig = PROVIDER_CONFIGS[config.provider.toLowerCase()];

  if (!providerConfig) {
    throw new Error(
      `Unsupported MODEL_PROVIDER: ${config.provider}. ` +
        `Supported providers: ${Object.keys(PROVIDER_CONFIGS).join(", ")}`,
    );
  }

  try {
    const providerInstance = providerConfig.createFn({ apiKey: config.apiKey });
    const modelSettings = buildModelSettings(config);
    const model = providerInstance(config.modelName, modelSettings);

    modelMap.set(key, model);
    return model;
  } catch (error: any) {
    if (error.code === "MODULE_NOT_FOUND") {
      throw new Error(
        `Provider SDK not installed: ${providerConfig.packageName}. ` +
          `Install with: npm install ${providerConfig.packageName}`,
      );
    }
    throw error;
  }
}
