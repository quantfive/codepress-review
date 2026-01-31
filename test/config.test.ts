import {
  getReviewConfig,
  parseArgs,
  getModelConfig,
  resolveModelAlias,
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

  describe("resolveModelAlias (static fallbacks)", () => {
    beforeEach(() => {
      jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe("OpenAI aliases", () => {
      it("should resolve gpt-latest to gpt-5.2", () => {
        expect(resolveModelAlias("openai", "gpt-latest")).toBe("gpt-5.2");
      });

      it("should resolve gpt-mini-latest to gpt-5.2-mini", () => {
        expect(resolveModelAlias("openai", "gpt-mini-latest")).toBe(
          "gpt-5.2-mini",
        );
      });

      it("should resolve latest to gpt-5.2", () => {
        expect(resolveModelAlias("openai", "latest")).toBe("gpt-5.2");
      });

      it("should return model name unchanged if not an alias", () => {
        expect(resolveModelAlias("openai", "gpt-4o")).toBe("gpt-4o");
      });
    });

    describe("Anthropic aliases", () => {
      it("should resolve sonnet-latest to claude-sonnet-4-5", () => {
        expect(resolveModelAlias("anthropic", "sonnet-latest")).toBe(
          "claude-sonnet-4-5",
        );
      });

      it("should resolve opus-latest to claude-opus-4-5", () => {
        expect(resolveModelAlias("anthropic", "opus-latest")).toBe(
          "claude-opus-4-5",
        );
      });

      it("should resolve haiku-latest to claude-haiku-3-5", () => {
        expect(resolveModelAlias("anthropic", "haiku-latest")).toBe(
          "claude-haiku-3-5",
        );
      });

      it("should resolve latest to claude-sonnet-4-5", () => {
        expect(resolveModelAlias("anthropic", "latest")).toBe(
          "claude-sonnet-4-5",
        );
      });
    });

    describe("Gemini aliases", () => {
      it("should resolve gemini-latest to gemini-3.0-flash", () => {
        expect(resolveModelAlias("gemini", "gemini-latest")).toBe(
          "gemini-3.0-flash",
        );
      });

      it("should resolve gemini-flash-latest to gemini-3.0-flash", () => {
        expect(resolveModelAlias("gemini", "gemini-flash-latest")).toBe(
          "gemini-3.0-flash",
        );
      });

      it("should resolve gemini-pro-latest to gemini-2.5-pro", () => {
        expect(resolveModelAlias("gemini", "gemini-pro-latest")).toBe(
          "gemini-2.5-pro",
        );
      });

      it("should work with google provider alias", () => {
        expect(resolveModelAlias("google", "gemini-latest")).toBe(
          "gemini-3.0-flash",
        );
      });
    });

    describe("XAI aliases", () => {
      it("should resolve grok-latest to grok-4", () => {
        expect(resolveModelAlias("xai", "grok-latest")).toBe("grok-4");
      });

      it("should resolve grok-mini-latest to grok-3-mini", () => {
        expect(resolveModelAlias("xai", "grok-mini-latest")).toBe("grok-3-mini");
      });
    });

    describe("Provider name normalization", () => {
      it("should handle uppercase provider names", () => {
        expect(resolveModelAlias("OPENAI", "gpt-latest")).toBe("gpt-5.2");
      });

      it("should handle mixed case provider names", () => {
        expect(resolveModelAlias("OpenAI", "gpt-latest")).toBe("gpt-5.2");
      });

      it("should handle uppercase model names", () => {
        expect(resolveModelAlias("openai", "GPT-LATEST")).toBe("gpt-5.2");
      });
    });

    describe("Unknown providers/models", () => {
      it("should return model name unchanged for unknown provider", () => {
        expect(resolveModelAlias("unknown", "gpt-latest")).toBe("gpt-latest");
      });

      it("should return model name unchanged for unknown alias", () => {
        expect(resolveModelAlias("openai", "not-an-alias")).toBe("not-an-alias");
      });
    });
  });
});

describe("Model family pattern matching", () => {
  // Test the regex patterns directly to ensure they match expected model names

  describe("OpenAI patterns", () => {
    // Patterns: match base GPT models only (gpt-X, gpt-X.Y, with optional date suffix)
    // Excludes variants like -pro, -codex, -mini, -chat-latest, -search-api
    const gptLatestPattern = /^gpt-(\d+)(?:\.(\d+))?(?:-\d{4}-\d{2}-\d{2})?$/;
    const gptMiniLatestPattern = /^gpt-(\d+)(?:\.(\d+))?-mini(?:-\d{4}-\d{2}-\d{2})?$/;

    it("should match gpt-5", () => {
      expect(gptLatestPattern.test("gpt-5")).toBe(true);
    });

    it("should match gpt-5.1", () => {
      expect(gptLatestPattern.test("gpt-5.1")).toBe(true);
    });

    it("should match gpt-5.2", () => {
      expect(gptLatestPattern.test("gpt-5.2")).toBe(true);
    });

    it("should match gpt-5-2025-08-07 (model with date suffix)", () => {
      expect(gptLatestPattern.test("gpt-5-2025-08-07")).toBe(true);
    });

    it("should match gpt-5.2-2025-12-11 (model with date suffix)", () => {
      expect(gptLatestPattern.test("gpt-5.2-2025-12-11")).toBe(true);
    });

    it("should not match gpt-5.2-preview (variant, not base model)", () => {
      expect(gptLatestPattern.test("gpt-5.2-preview")).toBe(false);
    });

    it("should not match gpt-5.2-pro (variant)", () => {
      expect(gptLatestPattern.test("gpt-5.2-pro")).toBe(false);
    });

    it("should not match gpt-5-codex (variant)", () => {
      expect(gptLatestPattern.test("gpt-5-codex")).toBe(false);
    });

    it("should not match gpt-5-chat-latest (variant)", () => {
      expect(gptLatestPattern.test("gpt-5-chat-latest")).toBe(false);
    });

    it("should not match gpt-5-search-api (variant)", () => {
      expect(gptLatestPattern.test("gpt-5-search-api")).toBe(false);
    });

    it("should not match gpt-4o (different model line)", () => {
      expect(gptLatestPattern.test("gpt-4o")).toBe(false);
    });

    it("should not match gpt-5-mini (use mini pattern)", () => {
      expect(gptLatestPattern.test("gpt-5-mini")).toBe(false);
    });

    it("should not match gpt-5.2-mini (use mini pattern)", () => {
      expect(gptLatestPattern.test("gpt-5.2-mini")).toBe(false);
    });

    it("should match gpt-5-mini with mini pattern", () => {
      expect(gptMiniLatestPattern.test("gpt-5-mini")).toBe(true);
    });

    it("should match gpt-5.2-mini with mini pattern", () => {
      expect(gptMiniLatestPattern.test("gpt-5.2-mini")).toBe(true);
    });

    it("should match gpt-5-mini-2025-08-07 with mini pattern", () => {
      expect(gptMiniLatestPattern.test("gpt-5-mini-2025-08-07")).toBe(true);
    });
  });

  describe("Anthropic patterns", () => {
    const sonnetPattern = /^claude-sonnet-(\d+)-(\d+)/;
    const opusPattern = /^claude-opus-(\d+)-(\d+)/;
    const haikuPattern = /^claude-haiku-(\d+)-(\d+)/;

    it("should match claude-sonnet-4-5", () => {
      expect(sonnetPattern.test("claude-sonnet-4-5")).toBe(true);
    });

    it("should match claude-sonnet-4-5-20250101", () => {
      expect(sonnetPattern.test("claude-sonnet-4-5-20250101")).toBe(true);
    });

    it("should match claude-opus-4-5", () => {
      expect(opusPattern.test("claude-opus-4-5")).toBe(true);
    });

    it("should match claude-haiku-3-5", () => {
      expect(haikuPattern.test("claude-haiku-3-5")).toBe(true);
    });

    it("should not match claude-3-sonnet (old naming)", () => {
      expect(sonnetPattern.test("claude-3-sonnet")).toBe(false);
    });
  });

  describe("Gemini patterns", () => {
    const flashPattern = /^gemini-(\d+)\.(\d+)-flash/;
    const proPattern = /^gemini-(\d+)\.(\d+)-pro/;

    it("should match gemini-3.0-flash", () => {
      expect(flashPattern.test("gemini-3.0-flash")).toBe(true);
    });

    it("should match gemini-2.5-flash", () => {
      expect(flashPattern.test("gemini-2.5-flash")).toBe(true);
    });

    it("should match gemini-2.5-pro", () => {
      expect(proPattern.test("gemini-2.5-pro")).toBe(true);
    });

    it("should match gemini-3.0-flash-001", () => {
      expect(flashPattern.test("gemini-3.0-flash-001")).toBe(true);
    });

    it("should not match gemini-pro (no version)", () => {
      expect(proPattern.test("gemini-pro")).toBe(false);
    });
  });

  describe("XAI patterns", () => {
    // Patterns: match version followed by end-of-string or hyphen (excluding -mini)
    const grokLatestPattern = /^grok-(\d+)(?:\.(\d+))?(?:-(?!mini)|$)/;
    const grokMiniLatestPattern = /^grok-(\d+)(?:\.(\d+))?-mini/;

    it("should match grok-4", () => {
      expect(grokLatestPattern.test("grok-4")).toBe(true);
    });

    it("should match grok-4-preview (model with suffix)", () => {
      expect(grokLatestPattern.test("grok-4-preview")).toBe(true);
    });

    it("should match grok-4.1 (future proofing)", () => {
      expect(grokLatestPattern.test("grok-4.1")).toBe(true);
    });

    it("should match grok-3-mini", () => {
      expect(grokMiniLatestPattern.test("grok-3-mini")).toBe(true);
    });

    it("should match grok-3.5-mini (future proofing)", () => {
      expect(grokMiniLatestPattern.test("grok-3.5-mini")).toBe(true);
    });

    it("should not match grok-beta", () => {
      expect(grokLatestPattern.test("grok-beta")).toBe(false);
    });
  });

  describe("Groq patterns", () => {
    const llamaPattern = /^llama-(\d+)\.(\d+)-(\d+)b-versatile/;

    it("should match llama-3.3-70b-versatile", () => {
      expect(llamaPattern.test("llama-3.3-70b-versatile")).toBe(true);
    });

    it("should match llama-3.1-8b-versatile", () => {
      expect(llamaPattern.test("llama-3.1-8b-versatile")).toBe(true);
    });

    it("should not match llama3 (missing format)", () => {
      expect(llamaPattern.test("llama3")).toBe(false);
    });
  });

  describe("Ollama patterns", () => {
    const llamaPattern = /^llama(\d+)(?:\.(\d+))?/;

    it("should match llama3", () => {
      expect(llamaPattern.test("llama3")).toBe(true);
    });

    it("should match llama3.1", () => {
      expect(llamaPattern.test("llama3.1")).toBe(true);
    });

    it("should match llama3.1:latest", () => {
      expect(llamaPattern.test("llama3.1:latest")).toBe(true);
    });

    it("should match llama3:8b", () => {
      expect(llamaPattern.test("llama3:8b")).toBe(true);
    });
  });

  describe("Cohere patterns", () => {
    const commandAPattern = /^command-a-(\d+)-(\d+)/;
    const commandRPlusPattern = /^command-r-plus/;

    it("should match command-a-03-2025", () => {
      expect(commandAPattern.test("command-a-03-2025")).toBe(true);
    });

    it("should match command-r-plus", () => {
      expect(commandRPlusPattern.test("command-r-plus")).toBe(true);
    });

    it("should match command-r-plus-08-2024", () => {
      expect(commandRPlusPattern.test("command-r-plus-08-2024")).toBe(true);
    });
  });

  describe("DeepSeek patterns", () => {
    const chatPattern = /^deepseek-chat/;
    const reasonerPattern = /^deepseek-reasoner/;

    it("should match deepseek-chat", () => {
      expect(chatPattern.test("deepseek-chat")).toBe(true);
    });

    it("should match deepseek-reasoner", () => {
      expect(reasonerPattern.test("deepseek-reasoner")).toBe(true);
    });
  });
});

describe("Version extraction and comparison", () => {
  // GPT-aware version extraction (used for GPT models)
  function extractGptVersion(modelName: string): number[] {
    const match = modelName.match(/^gpt-(\d+)(?:\.(\d+))?/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = match[2] ? parseInt(match[2], 10) : 0;
      return [major, minor];
    }
    return [0, 0];
  }

  // General version extraction (used for non-GPT models)
  function extractVersionGeneric(modelName: string): number[] {
    const matches = modelName.match(/(\d+)/g);
    return matches ? matches.map(Number) : [0];
  }

  // Unified version extraction
  function extractVersion(modelName: string): number[] {
    if (modelName.startsWith("gpt-")) {
      return extractGptVersion(modelName);
    }
    return extractVersionGeneric(modelName);
  }

  function compareVersions(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const aVal = a[i] || 0;
      const bVal = b[i] || 0;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  }

  describe("extractGptVersion", () => {
    it("should extract gpt-5 as [5, 0]", () => {
      expect(extractGptVersion("gpt-5")).toEqual([5, 0]);
    });

    it("should extract gpt-5.2 as [5, 2]", () => {
      expect(extractGptVersion("gpt-5.2")).toEqual([5, 2]);
    });

    it("should extract gpt-5-2025-08-07 as [5, 0] (ignoring date)", () => {
      expect(extractGptVersion("gpt-5-2025-08-07")).toEqual([5, 0]);
    });

    it("should extract gpt-5.2-2025-12-11 as [5, 2] (ignoring date)", () => {
      expect(extractGptVersion("gpt-5.2-2025-12-11")).toEqual([5, 2]);
    });

    it("should extract gpt-5.2-pro as [5, 2]", () => {
      expect(extractGptVersion("gpt-5.2-pro")).toEqual([5, 2]);
    });

    it("should return [0, 0] for non-GPT models", () => {
      expect(extractGptVersion("claude-sonnet-4-5")).toEqual([0, 0]);
    });
  });

  describe("extractVersion (unified)", () => {
    it("should use GPT extraction for gpt-5", () => {
      expect(extractVersion("gpt-5")).toEqual([5, 0]);
    });

    it("should use GPT extraction for gpt-5.2", () => {
      expect(extractVersion("gpt-5.2")).toEqual([5, 2]);
    });

    it("should use GPT extraction for gpt-5-2025-08-07", () => {
      expect(extractVersion("gpt-5-2025-08-07")).toEqual([5, 0]);
    });

    it("should use generic extraction for claude models", () => {
      expect(extractVersion("claude-sonnet-4-5")).toEqual([4, 5]);
    });

    it("should use generic extraction for gemini models", () => {
      expect(extractVersion("gemini-3.0-flash")).toEqual([3, 0]);
    });

    it("should return [0] for no version", () => {
      expect(extractVersion("deepseek-chat")).toEqual([0]);
    });
  });

  describe("compareVersions", () => {
    it("should return positive when first is greater", () => {
      expect(compareVersions([5, 2], [5, 1])).toBeGreaterThan(0);
    });

    it("should return negative when first is smaller", () => {
      expect(compareVersions([5, 1], [5, 2])).toBeLessThan(0);
    });

    it("should return 0 for equal versions", () => {
      expect(compareVersions([5, 2], [5, 2])).toBe(0);
    });

    it("should handle different length arrays", () => {
      expect(compareVersions([5, 2], [5])).toBeGreaterThan(0);
      expect(compareVersions([5], [5, 2])).toBeLessThan(0);
    });

    it("should compare major version first", () => {
      expect(compareVersions([6], [5, 9])).toBeGreaterThan(0);
    });
  });

  describe("Model sorting for latest selection", () => {
    it("should correctly sort OpenAI models to find latest", () => {
      const models = ["gpt-5", "gpt-5.1", "gpt-5.2", "gpt-4"];
      const pattern = /^gpt-(\d+)(?:\.(\d+))?(?:-\d{4}-\d{2}-\d{2})?$/;
      const matching = models.filter((m) => pattern.test(m));

      matching.sort((a, b) => {
        const versionA = extractVersion(a);
        const versionB = extractVersion(b);
        return compareVersions(versionB, versionA); // Descending
      });

      expect(matching[0]).toBe("gpt-5.2");
    });

    it("should correctly select gpt-5.2 over gpt-5-2025-08-07 (real API scenario)", () => {
      // This is the key test: simulates the actual OpenAI API response
      // gpt-5.2 (version 5.2) should beat gpt-5-2025-08-07 (version 5.0 with date)
      const models = [
        "gpt-5",
        "gpt-5-2025-08-07",
        "gpt-5.1",
        "gpt-5.1-2025-11-13",
        "gpt-5.2",
        "gpt-5.2-2025-12-11",
      ];
      const pattern = /^gpt-(\d+)(?:\.(\d+))?(?:-\d{4}-\d{2}-\d{2})?$/;
      const matching = models.filter((m) => pattern.test(m));

      matching.sort((a, b) => {
        const versionA = extractVersion(a);
        const versionB = extractVersion(b);
        return compareVersions(versionB, versionA); // Descending
      });

      // gpt-5.2 and gpt-5.2-2025-12-11 both have version [5, 2]
      // Either is acceptable as they're the same version
      expect(matching[0]).toMatch(/^gpt-5\.2/);
    });

    it("should exclude variant models (pro, codex, etc) when sorting for gpt-latest", () => {
      // These variants should be excluded by the pattern
      const models = [
        "gpt-5",
        "gpt-5.2",
        "gpt-5.2-pro",
        "gpt-5-codex",
        "gpt-5-chat-latest",
        "gpt-5-search-api",
      ];
      const pattern = /^gpt-(\d+)(?:\.(\d+))?(?:-\d{4}-\d{2}-\d{2})?$/;
      const matching = models.filter((m) => pattern.test(m));

      matching.sort((a, b) => {
        const versionA = extractVersion(a);
        const versionB = extractVersion(b);
        return compareVersions(versionB, versionA);
      });

      // Only base models should match
      expect(matching).toEqual(["gpt-5.2", "gpt-5"]);
      expect(matching[0]).toBe("gpt-5.2");
    });

    it("should exclude mini models when sorting for gpt-latest", () => {
      const models = ["gpt-5", "gpt-5.2-mini", "gpt-5.1"];
      const pattern = /^gpt-(\d+)(?:\.(\d+))?(?:-\d{4}-\d{2}-\d{2})?$/;
      const matching = models.filter((m) => pattern.test(m));

      matching.sort((a, b) => {
        const versionA = extractVersion(a);
        const versionB = extractVersion(b);
        return compareVersions(versionB, versionA);
      });

      // gpt-5.2-mini should be excluded, so gpt-5.1 is the latest
      expect(matching[0]).toBe("gpt-5.1");
      expect(matching).not.toContain("gpt-5.2-mini");
    });

    it("should correctly sort Anthropic models to find latest", () => {
      const models = [
        "claude-sonnet-3-5",
        "claude-sonnet-4-0",
        "claude-sonnet-4-5",
      ];
      const pattern = /^claude-sonnet-(\d+)-(\d+)/;
      const matching = models.filter((m) => pattern.test(m));

      matching.sort((a, b) => {
        const versionA = extractVersion(a);
        const versionB = extractVersion(b);
        return compareVersions(versionB, versionA);
      });

      expect(matching[0]).toBe("claude-sonnet-4-5");
    });

    it("should correctly sort Gemini models to find latest", () => {
      const models = [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-3.0-flash",
      ];
      const pattern = /^gemini-(\d+)\.(\d+)-flash/;
      const matching = models.filter((m) => pattern.test(m));

      matching.sort((a, b) => {
        const versionA = extractVersion(a);
        const versionB = extractVersion(b);
        return compareVersions(versionB, versionA);
      });

      expect(matching[0]).toBe("gemini-3.0-flash");
    });

    it("should correctly sort XAI models with decimals", () => {
      const models = ["grok-3", "grok-4", "grok-4.1"];
      const pattern = /^grok-(\d+)(?:\.(\d+))?$/;
      const matching = models.filter((m) => pattern.test(m));

      matching.sort((a, b) => {
        const versionA = extractVersion(a);
        const versionB = extractVersion(b);
        return compareVersions(versionB, versionA);
      });

      expect(matching[0]).toBe("grok-4.1");
    });
  });
});
