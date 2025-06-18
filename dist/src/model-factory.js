"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModel = createModel;
const openai_1 = require("@ai-sdk/openai");
const anthropic_1 = require("@ai-sdk/anthropic");
const google_1 = require("@ai-sdk/google");
const modelMap = new Map();
/**
 * Creates the appropriate AI model based on configuration.
 * Caches model instances to avoid recreating them.
 */
async function createModel(config) {
    const key = `${config.provider}-${config.modelName}`;
    if (modelMap.has(key)) {
        return modelMap.get(key);
    }
    // To avoid a hard dependency on all SDKs, we'll use dynamic imports.
    let model;
    switch (config.provider) {
        case "openai": {
            const openai = (0, openai_1.createOpenAI)({ apiKey: config.apiKey });
            model = openai(config.modelName);
            break;
        }
        case "anthropic": {
            const anthropic = (0, anthropic_1.createAnthropic)({ apiKey: config.apiKey });
            model = anthropic(config.modelName);
            break;
        }
        case "gemini": {
            const google = (0, google_1.createGoogleGenerativeAI)({ apiKey: config.apiKey });
            model = google(config.modelName);
            break;
        }
        default:
            throw new Error(`Unsupported MODEL_PROVIDER: ${config.provider}`);
    }
    modelMap.set(key, model);
    return model;
}
//# sourceMappingURL=model-factory.js.map