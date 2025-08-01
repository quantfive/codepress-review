import {
  getReviewConfig,
  parseArgs,
  getModelConfig,
  getGitHubConfig,
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
    it("should parse diff and pr arguments correctly", () => {
      process.argv = [
        "node",
        "script.js",
        "--diff",
        "test.diff",
        "--pr",
        "123",
      ];

      const result = parseArgs();

      expect(result).toEqual({
        diff: "test.diff",
        pr: 123,
      });
    });

    it("should exit with error if diff is missing", () => {
      process.argv = ["node", "script.js", "--pr", "123"];

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit");
      });

      expect(() => parseArgs()).toThrow("process.exit");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Usage: ts-node scripts/ai-review.ts --diff <diff-file> --pr <pr-number>",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it("should exit with error if pr is missing", () => {
      process.argv = ["node", "script.js", "--diff", "test.diff"];

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit");
      });

      expect(() => parseArgs()).toThrow("process.exit");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Usage: ts-node scripts/ai-review.ts --diff <diff-file> --pr <pr-number>",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe("getModelConfig", () => {
    it("should get OpenAI model config correctly", () => {
      process.env.MODEL_PROVIDER = "openai";
      process.env.MODEL_NAME = "gpt-4o";
      process.env.OPENAI_API_KEY = "test-openai-key";

      const result = getModelConfig();

      expect(result).toEqual({
        provider: "openai",
        modelName: "gpt-4o",
        apiKey: "test-openai-key",
      });
    });

    it("should get Anthropic model config correctly", () => {
      process.env.MODEL_PROVIDER = "anthropic";
      process.env.MODEL_NAME = "claude-3-sonnet-20240229";
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

      const result = getModelConfig();

      expect(result).toEqual({
        provider: "anthropic",
        modelName: "claude-3-sonnet-20240229",
        apiKey: "test-anthropic-key",
      });
    });

    it("should get Gemini model config correctly", () => {
      process.env.MODEL_PROVIDER = "gemini";
      process.env.MODEL_NAME = "gemini-1.5-pro";
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const result = getModelConfig();

      expect(result).toEqual({
        provider: "gemini",
        modelName: "gemini-1.5-pro",
        apiKey: "test-gemini-key",
      });
    });

    it("should throw error if MODEL_PROVIDER is missing", () => {
      process.env.MODEL_NAME = "gpt-4o";

      expect(() => getModelConfig()).toThrow(
        "MODEL_PROVIDER and MODEL_NAME are required",
      );
    });

    it("should throw error if MODEL_NAME is missing", () => {
      process.env.MODEL_PROVIDER = "openai";

      expect(() => getModelConfig()).toThrow(
        "MODEL_PROVIDER and MODEL_NAME are required",
      );
    });

    it("should throw error if OPENAI_API_KEY is missing for OpenAI provider", () => {
      process.env.MODEL_PROVIDER = "openai";
      process.env.MODEL_NAME = "gpt-4o";

      expect(() => getModelConfig()).toThrow("OPENAI_API_KEY is required");
    });

    it("should throw error if ANTHROPIC_API_KEY is missing for Anthropic provider", () => {
      process.env.MODEL_PROVIDER = "anthropic";
      process.env.MODEL_NAME = "claude-3-sonnet-20240229";

      expect(() => getModelConfig()).toThrow("ANTHROPIC_API_KEY is required");
    });

    it("should throw error if GEMINI_API_KEY is missing for Gemini provider", () => {
      process.env.MODEL_PROVIDER = "gemini";
      process.env.MODEL_NAME = "gemini-1.5-pro";

      expect(() => getModelConfig()).toThrow("GEMINI_API_KEY is required");
    });

    it("should throw error for unsupported provider", () => {
      process.env.MODEL_PROVIDER = "unsupported";
      process.env.MODEL_NAME = "some-model";

      expect(() => getModelConfig()).toThrow(
        "Unknown provider \"unsupported\"",
      );
    });
  });

  describe("getGitHubConfig", () => {
    it("should get GitHub config correctly", () => {
      process.env.GITHUB_TOKEN = "test-token";
      process.env.GITHUB_REPOSITORY = "owner/repo";

      const result = getGitHubConfig();

      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
        token: "test-token",
      });
    });

    it("should throw error if GITHUB_TOKEN is missing", () => {
      process.env.GITHUB_REPOSITORY = "owner/repo";

      expect(() => getGitHubConfig()).toThrow(
        "GITHUB_TOKEN environment variable is required",
      );
    });

    it("should throw error if GITHUB_REPOSITORY is missing", () => {
      process.env.GITHUB_TOKEN = "test-token";

      expect(() => getGitHubConfig()).toThrow(
        "GITHUB_REPOSITORY environment variable is required",
      );
    });

    it("should throw error if GITHUB_REPOSITORY format is invalid", () => {
      process.env.GITHUB_TOKEN = "test-token";
      process.env.GITHUB_REPOSITORY = "invalid-format";

      expect(() => getGitHubConfig()).toThrow(
        "Invalid GITHUB_REPOSITORY format. Expected 'owner/repo'",
      );
    });
  });

  describe("getReviewConfig", () => {
    beforeEach(() => {
      // Set up minimal required environment
      process.argv = [
        "node",
        "script.js",
        "--diff",
        "test.diff",
        "--pr",
        "123",
      ];
      process.env.MODEL_PROVIDER = "openai";
      process.env.MODEL_NAME = "gpt-4o";
      process.env.OPENAI_API_KEY = "test-key";
      process.env.GITHUB_TOKEN = "test-token";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.MAX_TURNS = "10";
      process.env.UPDATE_PR_DESCRIPTION = "true";
    });

    it("should create complete review config with debug disabled by default", () => {
      const result = getReviewConfig();

      expect(result).toEqual({
        diff: "test.diff",
        pr: 123,
        provider: "openai",
        modelName: "gpt-4o",
        githubToken: "test-token",
        githubRepository: "owner/repo",
        maxTurns: 10,
        updatePrDescription: true,
        debug: false,
      });
    });

    it("should parse debug mode as true when DEBUG=true", () => {
      process.env.DEBUG = "true";

      const result = getReviewConfig();

      expect(result.debug).toBe(true);
    });

    it("should parse debug mode as false when DEBUG=false", () => {
      process.env.DEBUG = "false";

      const result = getReviewConfig();

      expect(result.debug).toBe(false);
    });

    it("should parse debug mode as false when DEBUG is not set", () => {
      // DEBUG not set in environment

      const result = getReviewConfig();

      expect(result.debug).toBe(false);
    });

    it("should parse debug mode as false for invalid DEBUG values", () => {
      process.env.DEBUG = "invalid";

      const result = getReviewConfig();

      expect(result.debug).toBe(false);
    });

    it("should parse debug mode case-insensitively", () => {
      process.env.DEBUG = "TRUE";

      const result = getReviewConfig();

      expect(result.debug).toBe(true);
    });

    it("should parse updatePrDescription correctly", () => {
      process.env.UPDATE_PR_DESCRIPTION = "false";

      const result = getReviewConfig();

      expect(result.updatePrDescription).toBe(false);
    });

    it("should default updatePrDescription to true when not set", () => {
      delete process.env.UPDATE_PR_DESCRIPTION;

      const result = getReviewConfig();

      expect(result.updatePrDescription).toBe(true);
    });

    it("should throw error if MAX_TURNS is invalid", () => {
      process.env.MAX_TURNS = "invalid";

      expect(() => getReviewConfig()).toThrow(
        "MAX_TURNS must be a positive number",
      );
    });

    it("should throw error if MAX_TURNS is zero", () => {
      process.env.MAX_TURNS = "0";

      expect(() => getReviewConfig()).toThrow(
        "MAX_TURNS must be a positive number",
      );
    });

    it("should throw error if MAX_TURNS is negative", () => {
      process.env.MAX_TURNS = "-5";

      expect(() => getReviewConfig()).toThrow(
        "MAX_TURNS must be a positive number",
      );
    });
  });
});
