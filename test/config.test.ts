import {
  getReviewConfig,
  parseArgs,
  getModelConfig,
} from "../src/config";

describe("Configuration", () => {
  let originalProcessArgv: string[];
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original values
    originalProcessArgv = process.argv;
    originalEnv = process.env;

    // Clear environment for clean testing
    process.env = {};
  });

  afterEach(() => {
    // Restore original values
    process.argv = originalProcessArgv;
    process.env = originalEnv;
  });

  describe("parseArgs", () => {
    it("should parse pr argument correctly", async () => {
      process.argv = ["node", "script.js", "--pr", "123"];

      const result = parseArgs();

      expect(result).toEqual({
        pr: 123,
      });
    });

    it("should exit with error if pr is missing", async () => {
      process.argv = ["node", "script.js"];

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit");
      });

      expect(() => parseArgs()).toThrow("process.exit");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Usage: ts-node scripts/ai-review.ts --pr <pr-number>",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe("getModelConfig", () => {
    it("should get OpenAI model config correctly", async () => {
      process.env.MODEL_PROVIDER = "openai";
      process.env.MODEL_NAME = "gpt-4o";
      process.env.OPENAI_API_KEY = "test-openai-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "openai",
        modelName: "gpt-4o",
        apiKey: "test-openai-key",
      });
    });

    it("should get Anthropic model config correctly", async () => {
      process.env.MODEL_PROVIDER = "anthropic";
      process.env.MODEL_NAME = "claude-3-sonnet-20240229";
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "anthropic",
        modelName: "claude-3-sonnet-20240229",
        apiKey: "test-anthropic-key",
      });
    });

    it("should get Gemini model config correctly", async () => {
      process.env.MODEL_PROVIDER = "gemini";
      process.env.MODEL_NAME = "gemini-1.5-pro";
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "gemini",
        modelName: "gemini-1.5-pro",
        apiKey: "test-gemini-key",
      });
    });

    it("should throw error if MODEL_PROVIDER is missing", async () => {
      process.env.MODEL_NAME = "gpt-4o";

      await expect(getModelConfig()).rejects.toThrow(
        "MODEL_PROVIDER and MODEL_NAME are required",
      );
    });

    it("should throw error if MODEL_NAME is missing", async () => {
      process.env.MODEL_PROVIDER = "openai";

      await expect(getModelConfig()).rejects.toThrow(
        "MODEL_PROVIDER and MODEL_NAME are required",
      );
    });

    it("should throw error if OPENAI_API_KEY is missing for OpenAI provider", async () => {
      process.env.MODEL_PROVIDER = "openai";
      process.env.MODEL_NAME = "gpt-4o";

      await expect(getModelConfig()).rejects.toThrow("OPENAI_API_KEY is required");
    });

    it("should throw error if ANTHROPIC_API_KEY is missing for Anthropic provider", async () => {
      process.env.MODEL_PROVIDER = "anthropic";
      process.env.MODEL_NAME = "claude-3-sonnet-20240229";

      await expect(getModelConfig()).rejects.toThrow("ANTHROPIC_API_KEY is required");
    });

    it("should throw error if GEMINI_API_KEY is missing for Gemini provider", async () => {
      process.env.MODEL_PROVIDER = "gemini";
      process.env.MODEL_NAME = "gemini-1.5-pro";

      await expect(getModelConfig()).rejects.toThrow("GEMINI_API_KEY is required");
    });

    // Tests for all new providers
    it("should get Cohere config correctly", async () => {
      process.env.MODEL_PROVIDER = "cohere";
      process.env.MODEL_NAME = "command-r-plus";
      process.env.COHERE_API_KEY = "test-cohere-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "cohere",
        modelName: "command-r-plus",
        apiKey: "test-cohere-key",
      });
    });

    it("should get Mistral config correctly", async () => {
      process.env.MODEL_PROVIDER = "mistral";
      process.env.MODEL_NAME = "mistral-large-latest";
      process.env.MISTRAL_API_KEY = "test-mistral-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "mistral",
        modelName: "mistral-large-latest",
        apiKey: "test-mistral-key",
      });
    });

    it("should get Perplexity config correctly", async () => {
      process.env.MODEL_PROVIDER = "perplexity";
      process.env.MODEL_NAME = "llama-3.1-sonar-large-128k-online";
      process.env.PERPLEXITY_API_KEY = "test-perplexity-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "perplexity",
        modelName: "llama-3.1-sonar-large-128k-online",
        apiKey: "test-perplexity-key",
      });
    });

    it("should get Fireworks config correctly", async () => {
      process.env.MODEL_PROVIDER = "fireworks";
      process.env.MODEL_NAME = "accounts/fireworks/models/llama-v3p1-70b-instruct";
      process.env.FIREWORKS_API_KEY = "test-fireworks-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "fireworks",
        modelName: "accounts/fireworks/models/llama-v3p1-70b-instruct",
        apiKey: "test-fireworks-key",
      });
    });

    it("should get Groq config correctly", async () => {
      process.env.MODEL_PROVIDER = "groq";
      process.env.MODEL_NAME = "llama-3.1-70b-versatile";
      process.env.GROQ_API_KEY = "test-groq-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "groq",
        modelName: "llama-3.1-70b-versatile",
        apiKey: "test-groq-key",
      });
    });

    it("should get xAI config correctly", async () => {
      process.env.MODEL_PROVIDER = "xai";
      process.env.MODEL_NAME = "grok-beta";
      process.env.XAI_API_KEY = "test-xai-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "xai",
        modelName: "grok-beta",
        apiKey: "test-xai-key",
      });
    });

    it("should get DeepSeek config correctly", async () => {
      process.env.MODEL_PROVIDER = "deepseek";
      process.env.MODEL_NAME = "deepseek-chat";
      process.env.DEEPSEEK_API_KEY = "test-deepseek-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "deepseek",
        modelName: "deepseek-chat",
        apiKey: "test-deepseek-key",
      });
    });

    it("should get OpenAI-compatible config correctly", async () => {
      process.env.MODEL_PROVIDER = "openai-compatible";
      process.env.MODEL_NAME = "llama-3.1-70b-instruct";
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-compatible-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "openai-compatible",
        modelName: "llama-3.1-70b-instruct",
        apiKey: "test-compatible-key",
      });
    });

    it("should get Ollama config correctly", async () => {
      process.env.MODEL_PROVIDER = "ollama";
      process.env.MODEL_NAME = "llama3.1:70b";
      process.env.OLLAMA_API_KEY = "test-ollama-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "ollama",
        modelName: "llama3.1:70b",
        apiKey: "test-ollama-key",
      });
    });

    it("should handle google as alias for gemini", async () => {
      process.env.MODEL_PROVIDER = "google";
      process.env.MODEL_NAME = "gemini-1.5-pro";
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "google",
        modelName: "gemini-1.5-pro",
        apiKey: "test-gemini-key",
      });
    });

    // Error tests for new providers
    it("should throw error if COHERE_API_KEY is missing", async () => {
      process.env.MODEL_PROVIDER = "cohere";
      process.env.MODEL_NAME = "command-r-plus";

      await expect(getModelConfig()).rejects.toThrow("COHERE_API_KEY is required");
    });

    it("should throw error if MISTRAL_API_KEY is missing", async () => {
      process.env.MODEL_PROVIDER = "mistral";
      process.env.MODEL_NAME = "mistral-large-latest";

      await expect(getModelConfig()).rejects.toThrow("MISTRAL_API_KEY is required");
    });

    it("should throw error if GROQ_API_KEY is missing", async () => {
      process.env.MODEL_PROVIDER = "groq";
      process.env.MODEL_NAME = "llama-3.1-70b-versatile";

      await expect(getModelConfig()).rejects.toThrow("GROQ_API_KEY is required");
    });

    it("should throw error if DEEPSEEK_API_KEY is missing", async () => {
      process.env.MODEL_PROVIDER = "deepseek";
      process.env.MODEL_NAME = "deepseek-chat";

      await expect(getModelConfig()).rejects.toThrow("DEEPSEEK_API_KEY is required");
    });

    it("should throw error if OPENAI_COMPATIBLE_API_KEY is missing", async () => {
      process.env.MODEL_PROVIDER = "openai-compatible";
      process.env.MODEL_NAME = "llama-3.1-70b-instruct";

      await expect(getModelConfig()).rejects.toThrow("OPENAI_COMPATIBLE_API_KEY is required");
    });

    it("should handle unknown provider with fallback pattern", async () => {
      process.env.MODEL_PROVIDER = "newprovider";
      process.env.MODEL_NAME = "some-model";
      process.env.NEWPROVIDER_API_KEY = "test-key";

      const result = await getModelConfig();

      expect(result).toEqual({
        provider: "newprovider",
        modelName: "some-model",
        apiKey: "test-key",
      });
    });

    it("should throw error for unsupported provider", async () => {
      process.env.MODEL_PROVIDER = "unsupported";
      process.env.MODEL_NAME = "some-model";

      await expect(getModelConfig()).rejects.toThrow(
        "Unknown provider \"unsupported\"",
      );
    });
  });

  describe("getReviewConfig", () => {
    beforeEach(() => {
      // Set up minimal required environment
      process.argv = ["node", "script.js", "--pr", "123"];
      process.env.MODEL_PROVIDER = "openai";
      process.env.MODEL_NAME = "gpt-4o";
      process.env.OPENAI_API_KEY = "test-key";
      process.env.GITHUB_TOKEN = "test-token";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.MAX_TURNS = "10";
    });

    it("should create complete review config with debug disabled by default", async () => {
      const result = await getReviewConfig();

      expect(result).toEqual({
        pr: 123,
        provider: "openai",
        modelName: "gpt-4o",
        githubToken: "test-token",
        githubRepository: "owner/repo",
        maxTurns: 10,
        debug: false,
        blockingOnly: false,
      });
    });

    it("should parse debug mode as true when DEBUG=true", async () => {
      process.env.DEBUG = "true";

      const result = await getReviewConfig();

      expect(result.debug).toBe(true);
    });

    it("should parse debug mode as false when DEBUG=false", async () => {
      process.env.DEBUG = "false";

      const result = await getReviewConfig();

      expect(result.debug).toBe(false);
    });

    it("should parse debug mode as false when DEBUG is not set", async () => {
      // DEBUG not set in environment

      const result = await getReviewConfig();

      expect(result.debug).toBe(false);
    });

    it("should parse debug mode as false for invalid DEBUG values", async () => {
      process.env.DEBUG = "invalid";

      const result = await getReviewConfig();

      expect(result.debug).toBe(false);
    });

    it("should parse debug mode case-insensitively", async () => {
      process.env.DEBUG = "TRUE";

      const result = await getReviewConfig();

      expect(result.debug).toBe(true);
    });

    it("should treat invalid MAX_TURNS as unlimited (0)", async () => {
      process.env.MAX_TURNS = "invalid";

      const result = await getReviewConfig();
      expect(result.maxTurns).toBe(0);
    });

    it("should treat zero MAX_TURNS as unlimited (0)", async () => {
      process.env.MAX_TURNS = "0";

      const result = await getReviewConfig();
      expect(result.maxTurns).toBe(0);
    });

    it("should treat negative MAX_TURNS as unlimited (0)", async () => {
      process.env.MAX_TURNS = "-5";

      const result = await getReviewConfig();
      expect(result.maxTurns).toBe(0);
    });

    it("should throw error if GITHUB_TOKEN is missing", async () => {
      delete process.env.GITHUB_TOKEN;

      await expect(getReviewConfig()).rejects.toThrow(
        "GITHUB_TOKEN environment variable is required",
      );
    });

    it("should throw error if GITHUB_REPOSITORY is missing", async () => {
      delete process.env.GITHUB_REPOSITORY;

      await expect(getReviewConfig()).rejects.toThrow(
        "GITHUB_REPOSITORY environment variable is required",
      );
    });
  });
});
