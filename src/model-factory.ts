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
};

/**
 * Creates the appropriate AI model based on configuration.
 * Caches model instances to avoid recreating them.
 */
export async function createModel(config: ModelConfig) {
  const key = `${config.provider}-${config.modelName}`;
  if (modelMap.has(key)) {
    return modelMap.get(key);
  }

  const providerConfig = PROVIDER_CONFIGS[config.provider.toLowerCase()];
  
  if (!providerConfig) {
    throw new Error(
      `Unsupported MODEL_PROVIDER: ${config.provider}. ` +
      `Supported providers: ${Object.keys(PROVIDER_CONFIGS).join(", ")}`
    );
  }

  try {
    const providerInstance = providerConfig.createFn({ apiKey: config.apiKey });
    const model = providerInstance(config.modelName);
    
    modelMap.set(key, model);
    return model;
  } catch (error: any) {
    if (error.code === "MODULE_NOT_FOUND") {
      throw new Error(
        `Provider SDK not installed: ${providerConfig.packageName}. ` +
        `Install with: npm install ${providerConfig.packageName}`
      );
    }
    throw error;
  }
}
