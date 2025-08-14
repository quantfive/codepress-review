"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModel = createModel;
const modelMap = new Map();
const PROVIDER_CONFIGS = {
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
 * Creates the appropriate AI model based on configuration.
 * Caches model instances to avoid recreating them.
 */
async function createModel(config) {
    const key = `${config.provider}-${config.modelName}`;
    if (modelMap.has(key)) {
        return modelMap.get(key);
    }
    const providerConfig = PROVIDER_CONFIGS[config.provider.toLowerCase()];
    if (!providerConfig) {
        throw new Error(`Unsupported MODEL_PROVIDER: ${config.provider}. ` +
            `Supported providers: ${Object.keys(PROVIDER_CONFIGS).join(", ")}`);
    }
    try {
        const providerInstance = providerConfig.createFn({ apiKey: config.apiKey });
        const model = providerInstance(config.modelName);
        modelMap.set(key, model);
        return model;
    }
    catch (error) {
        if (error.code === "MODULE_NOT_FOUND") {
            throw new Error(`Provider SDK not installed: ${providerConfig.packageName}. ` +
                `Install with: npm install ${providerConfig.packageName}`);
        }
        throw error;
    }
}
//# sourceMappingURL=model-factory.js.map