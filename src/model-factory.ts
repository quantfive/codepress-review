import { ModelConfig } from "./types";

const modelMap = new Map<string, any>();

/**
 * Creates the appropriate AI model based on configuration.
 * Caches model instances to avoid recreating them.
 */
export async function createModel(config: ModelConfig) {
  const key = `${config.provider}-${config.modelName}`;
  if (modelMap.has(key)) {
    return modelMap.get(key);
  }

  // To avoid a hard dependency on all SDKs, we'll use dynamic imports.
  let model;
  switch (config.provider) {
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const openai = createOpenAI({ apiKey: config.apiKey });
      model = openai(config.modelName);
      break;
    }
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      model = anthropic(config.modelName);
      break;
    }
    case "gemini": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
      model = google(config.modelName);
      break;
    }
    default:
      throw new Error(`Unsupported MODEL_PROVIDER: ${config.provider}`);
  }

  modelMap.set(key, model);
  return model;
}
