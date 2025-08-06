import { ModelConfig } from "../src/types";

// Simple mock approach - we'll test the behavior not the internals
describe("createModel", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Clear environment variables
    delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    delete process.env.OLLAMA_BASE_URL;
  });

  it("should create models for all supported providers", async () => {
    // Mock all the AI SDK packages to return simple functions
    jest.doMock("@ai-sdk/openai", () => ({
      createOpenAI: jest.fn(() => jest.fn(() => "openai-model")),
    }));
    jest.doMock("@ai-sdk/anthropic", () => ({
      createAnthropic: jest.fn(() => jest.fn(() => "anthropic-model")),
    }));
    jest.doMock("@ai-sdk/google", () => ({
      createGoogleGenerativeAI: jest.fn(() => jest.fn(() => "google-model")),
    }));
    jest.doMock("@ai-sdk/cohere", () => ({
      createCohere: jest.fn(() => jest.fn(() => "cohere-model")),
    }));
    jest.doMock("@ai-sdk/mistral", () => ({
      createMistral: jest.fn(() => jest.fn(() => "mistral-model")),
    }));
    jest.doMock("@ai-sdk/perplexity", () => ({
      createPerplexity: jest.fn(() => jest.fn(() => "perplexity-model")),
    }));
    jest.doMock("@ai-sdk/fireworks", () => ({
      createFireworks: jest.fn(() => jest.fn(() => "fireworks-model")),
    }));
    jest.doMock("@ai-sdk/groq", () => ({
      createGroq: jest.fn(() => jest.fn(() => "groq-model")),
    }));
    jest.doMock("@ai-sdk/xai", () => ({
      createXai: jest.fn(() => jest.fn(() => "xai-model")),
    }));
    jest.doMock("@ai-sdk/deepseek", () => ({
      createDeepSeek: jest.fn(() => jest.fn(() => "deepseek-model")),
    }));

    const { createModel } = await import("../src/model-factory");

    // Test all supported providers
    const testCases = [
      { provider: "openai", expected: "openai-model" },
      { provider: "anthropic", expected: "anthropic-model" },
      { provider: "gemini", expected: "google-model" },
      { provider: "google", expected: "google-model" },
      { provider: "cohere", expected: "cohere-model" },
      { provider: "mistral", expected: "mistral-model" },
      { provider: "perplexity", expected: "perplexity-model" },
      { provider: "fireworks", expected: "fireworks-model" },
      { provider: "groq", expected: "groq-model" },
      { provider: "xai", expected: "xai-model" },
      { provider: "deepseek", expected: "deepseek-model" },
    ];

    for (const testCase of testCases) {
      const config: ModelConfig = {
        provider: testCase.provider,
        modelName: "test-model",
        apiKey: "test-key",
      };

      const model = await createModel(config);
      expect(model).toBe(testCase.expected);
    }
  });

  it("should handle OpenAI-compatible provider correctly", async () => {
    process.env.OPENAI_COMPATIBLE_BASE_URL = "https://api.example.com/v1";
    
    jest.doMock("@ai-sdk/openai", () => ({
      createOpenAI: jest.fn(() => jest.fn(() => "openai-compatible-model")),
    }));

    const { createModel } = await import("../src/model-factory");
    
    const config: ModelConfig = {
      provider: "openai-compatible",
      modelName: "llama-3.1-70b-instruct",
      apiKey: "test-key",
    };

    const model = await createModel(config);
    expect(model).toBe("openai-compatible-model");
  });

  it("should handle Ollama provider correctly", async () => {
    jest.doMock("@ai-sdk/openai", () => ({
      createOpenAI: jest.fn(() => jest.fn(() => "ollama-model")),
    }));

    const { createModel } = await import("../src/model-factory");
    
    const config: ModelConfig = {
      provider: "ollama",
      modelName: "llama3.1:70b",
      apiKey: "test-key",
    };

    const model = await createModel(config);
    expect(model).toBe("ollama-model");
  });

  it("should handle Ollama with custom base URL", async () => {
    process.env.OLLAMA_BASE_URL = "http://remote-ollama:11434/v1";
    
    jest.doMock("@ai-sdk/openai", () => ({
      createOpenAI: jest.fn(() => jest.fn(() => "ollama-custom-model")),
    }));

    const { createModel } = await import("../src/model-factory");
    
    const config: ModelConfig = {
      provider: "ollama",
      modelName: "llama3.1:70b",
      apiKey: "test-key",
    };

    const model = await createModel(config);
    expect(model).toBe("ollama-custom-model");
  });

  it("should handle case insensitive provider names", async () => {
    jest.doMock("@ai-sdk/openai", () => ({
      createOpenAI: jest.fn(() => jest.fn(() => "openai-model")),
    }));

    const { createModel } = await import("../src/model-factory");
    
    const config: ModelConfig = {
      provider: "OPENAI",
      modelName: "gpt-4o",
      apiKey: "test-key",
    };

    const model = await createModel(config);
    expect(model).toBe("openai-model");
  });

  it("should throw error for unsupported provider", async () => {
    const { createModel } = await import("../src/model-factory");
    
    const config: ModelConfig = {
      provider: "unsupported",
      modelName: "some-model",
      apiKey: "test-key",
    };

    await expect(createModel(config)).rejects.toThrow(
      "Unsupported MODEL_PROVIDER: unsupported"
    );
  });

  it("should throw error for openai-compatible without base URL", async () => {
    jest.doMock("@ai-sdk/openai", () => ({
      createOpenAI: jest.fn(() => jest.fn(() => "openai-model")),
    }));

    const { createModel } = await import("../src/model-factory");
    
    const config: ModelConfig = {
      provider: "openai-compatible",
      modelName: "llama-3.1-70b-instruct",
      apiKey: "test-key",
    };

    await expect(createModel(config)).rejects.toThrow(
      "OPENAI_COMPATIBLE_BASE_URL environment variable is required"
    );
  });

  it("should handle fallback API keys for self-hosted providers", async () => {
    jest.doMock("@ai-sdk/openai", () => ({
      createOpenAI: jest.fn(() => jest.fn(() => "ollama-fallback-model")),
    }));

    const { createModel } = await import("../src/model-factory");
    
    const config: ModelConfig = {
      provider: "ollama",
      modelName: "llama3.1:70b",
      apiKey: "", // Empty key should use fallback
    };

    const model = await createModel(config);
    expect(model).toBe("ollama-fallback-model");
  });

  it("should handle fallback API keys for OpenAI-compatible", async () => {
    process.env.OPENAI_COMPATIBLE_BASE_URL = "https://api.example.com/v1";
    
    jest.doMock("@ai-sdk/openai", () => ({
      createOpenAI: jest.fn(() => jest.fn(() => "compatible-fallback-model")),
    }));

    const { createModel } = await import("../src/model-factory");
    
    const config: ModelConfig = {
      provider: "openai-compatible",
      modelName: "llama-3.1-70b-instruct",
      apiKey: "", // Empty key should use fallback
    };

    const model = await createModel(config);
    expect(model).toBe("compatible-fallback-model");
  });
});