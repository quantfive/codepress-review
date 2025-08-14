"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../src/config");
describe("Configuration", () => {
    let originalProcessArgv;
    let originalEnv;
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
            const result = (0, config_1.parseArgs)();
            expect(result).toEqual({
                diff: "test.diff",
                pr: 123,
            });
        });
        it("should exit with error if diff is missing", () => {
            process.argv = ["node", "script.js", "--pr", "123"];
            const consoleSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => { });
            const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
                throw new Error("process.exit");
            });
            expect(() => (0, config_1.parseArgs)()).toThrow("process.exit");
            expect(consoleSpy).toHaveBeenCalledWith("Usage: ts-node scripts/ai-review.ts --diff <diff-file> --pr <pr-number>");
            expect(exitSpy).toHaveBeenCalledWith(1);
            consoleSpy.mockRestore();
            exitSpy.mockRestore();
        });
        it("should exit with error if pr is missing", () => {
            process.argv = ["node", "script.js", "--diff", "test.diff"];
            const consoleSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => { });
            const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
                throw new Error("process.exit");
            });
            expect(() => (0, config_1.parseArgs)()).toThrow("process.exit");
            expect(consoleSpy).toHaveBeenCalledWith("Usage: ts-node scripts/ai-review.ts --diff <diff-file> --pr <pr-number>");
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
            const result = (0, config_1.getModelConfig)();
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
            const result = (0, config_1.getModelConfig)();
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
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "gemini",
                modelName: "gemini-1.5-pro",
                apiKey: "test-gemini-key",
            });
        });
        it("should throw error if MODEL_PROVIDER is missing", () => {
            process.env.MODEL_NAME = "gpt-4o";
            expect(() => (0, config_1.getModelConfig)()).toThrow("MODEL_PROVIDER and MODEL_NAME are required");
        });
        it("should throw error if MODEL_NAME is missing", () => {
            process.env.MODEL_PROVIDER = "openai";
            expect(() => (0, config_1.getModelConfig)()).toThrow("MODEL_PROVIDER and MODEL_NAME are required");
        });
        it("should throw error if OPENAI_API_KEY is missing for OpenAI provider", () => {
            process.env.MODEL_PROVIDER = "openai";
            process.env.MODEL_NAME = "gpt-4o";
            expect(() => (0, config_1.getModelConfig)()).toThrow("OPENAI_API_KEY is required");
        });
        it("should throw error if ANTHROPIC_API_KEY is missing for Anthropic provider", () => {
            process.env.MODEL_PROVIDER = "anthropic";
            process.env.MODEL_NAME = "claude-3-sonnet-20240229";
            expect(() => (0, config_1.getModelConfig)()).toThrow("ANTHROPIC_API_KEY is required");
        });
        it("should throw error if GEMINI_API_KEY is missing for Gemini provider", () => {
            process.env.MODEL_PROVIDER = "gemini";
            process.env.MODEL_NAME = "gemini-1.5-pro";
            expect(() => (0, config_1.getModelConfig)()).toThrow("GEMINI_API_KEY is required");
        });
        // Tests for all new providers
        it("should get Cohere config correctly", () => {
            process.env.MODEL_PROVIDER = "cohere";
            process.env.MODEL_NAME = "command-r-plus";
            process.env.COHERE_API_KEY = "test-cohere-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "cohere",
                modelName: "command-r-plus",
                apiKey: "test-cohere-key",
            });
        });
        it("should get Mistral config correctly", () => {
            process.env.MODEL_PROVIDER = "mistral";
            process.env.MODEL_NAME = "mistral-large-latest";
            process.env.MISTRAL_API_KEY = "test-mistral-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "mistral",
                modelName: "mistral-large-latest",
                apiKey: "test-mistral-key",
            });
        });
        it("should get Perplexity config correctly", () => {
            process.env.MODEL_PROVIDER = "perplexity";
            process.env.MODEL_NAME = "llama-3.1-sonar-large-128k-online";
            process.env.PERPLEXITY_API_KEY = "test-perplexity-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "perplexity",
                modelName: "llama-3.1-sonar-large-128k-online",
                apiKey: "test-perplexity-key",
            });
        });
        it("should get Fireworks config correctly", () => {
            process.env.MODEL_PROVIDER = "fireworks";
            process.env.MODEL_NAME = "accounts/fireworks/models/llama-v3p1-70b-instruct";
            process.env.FIREWORKS_API_KEY = "test-fireworks-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "fireworks",
                modelName: "accounts/fireworks/models/llama-v3p1-70b-instruct",
                apiKey: "test-fireworks-key",
            });
        });
        it("should get Groq config correctly", () => {
            process.env.MODEL_PROVIDER = "groq";
            process.env.MODEL_NAME = "llama-3.1-70b-versatile";
            process.env.GROQ_API_KEY = "test-groq-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "groq",
                modelName: "llama-3.1-70b-versatile",
                apiKey: "test-groq-key",
            });
        });
        it("should get xAI config correctly", () => {
            process.env.MODEL_PROVIDER = "xai";
            process.env.MODEL_NAME = "grok-beta";
            process.env.XAI_API_KEY = "test-xai-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "xai",
                modelName: "grok-beta",
                apiKey: "test-xai-key",
            });
        });
        it("should get DeepSeek config correctly", () => {
            process.env.MODEL_PROVIDER = "deepseek";
            process.env.MODEL_NAME = "deepseek-chat";
            process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "deepseek",
                modelName: "deepseek-chat",
                apiKey: "test-deepseek-key",
            });
        });
        it("should get OpenAI-compatible config correctly", () => {
            process.env.MODEL_PROVIDER = "openai-compatible";
            process.env.MODEL_NAME = "llama-3.1-70b-instruct";
            process.env.OPENAI_COMPATIBLE_API_KEY = "test-compatible-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "openai-compatible",
                modelName: "llama-3.1-70b-instruct",
                apiKey: "test-compatible-key",
            });
        });
        it("should get Ollama config correctly", () => {
            process.env.MODEL_PROVIDER = "ollama";
            process.env.MODEL_NAME = "llama3.1:70b";
            process.env.OLLAMA_API_KEY = "test-ollama-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "ollama",
                modelName: "llama3.1:70b",
                apiKey: "test-ollama-key",
            });
        });
        it("should handle google as alias for gemini", () => {
            process.env.MODEL_PROVIDER = "google";
            process.env.MODEL_NAME = "gemini-1.5-pro";
            process.env.GEMINI_API_KEY = "test-gemini-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "google",
                modelName: "gemini-1.5-pro",
                apiKey: "test-gemini-key",
            });
        });
        // Error tests for new providers
        it("should throw error if COHERE_API_KEY is missing", () => {
            process.env.MODEL_PROVIDER = "cohere";
            process.env.MODEL_NAME = "command-r-plus";
            expect(() => (0, config_1.getModelConfig)()).toThrow("COHERE_API_KEY is required");
        });
        it("should throw error if MISTRAL_API_KEY is missing", () => {
            process.env.MODEL_PROVIDER = "mistral";
            process.env.MODEL_NAME = "mistral-large-latest";
            expect(() => (0, config_1.getModelConfig)()).toThrow("MISTRAL_API_KEY is required");
        });
        it("should throw error if GROQ_API_KEY is missing", () => {
            process.env.MODEL_PROVIDER = "groq";
            process.env.MODEL_NAME = "llama-3.1-70b-versatile";
            expect(() => (0, config_1.getModelConfig)()).toThrow("GROQ_API_KEY is required");
        });
        it("should throw error if DEEPSEEK_API_KEY is missing", () => {
            process.env.MODEL_PROVIDER = "deepseek";
            process.env.MODEL_NAME = "deepseek-chat";
            expect(() => (0, config_1.getModelConfig)()).toThrow("DEEPSEEK_API_KEY is required");
        });
        it("should throw error if OPENAI_COMPATIBLE_API_KEY is missing", () => {
            process.env.MODEL_PROVIDER = "openai-compatible";
            process.env.MODEL_NAME = "llama-3.1-70b-instruct";
            expect(() => (0, config_1.getModelConfig)()).toThrow("OPENAI_COMPATIBLE_API_KEY is required");
        });
        it("should handle unknown provider with fallback pattern", () => {
            process.env.MODEL_PROVIDER = "newprovider";
            process.env.MODEL_NAME = "some-model";
            process.env.NEWPROVIDER_API_KEY = "test-key";
            const result = (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "newprovider",
                modelName: "some-model",
                apiKey: "test-key",
            });
        });
        it("should throw error for unsupported provider", () => {
            process.env.MODEL_PROVIDER = "unsupported";
            process.env.MODEL_NAME = "some-model";
            expect(() => (0, config_1.getModelConfig)()).toThrow("Unknown provider \"unsupported\"");
        });
    });
    describe("getGitHubConfig", () => {
        it("should get GitHub config correctly", () => {
            process.env.GITHUB_TOKEN = "test-token";
            process.env.GITHUB_REPOSITORY = "owner/repo";
            const result = (0, config_1.getGitHubConfig)();
            expect(result).toEqual({
                owner: "owner",
                repo: "repo",
                token: "test-token",
            });
        });
        it("should throw error if GITHUB_TOKEN is missing", () => {
            process.env.GITHUB_REPOSITORY = "owner/repo";
            expect(() => (0, config_1.getGitHubConfig)()).toThrow("GITHUB_TOKEN environment variable is required");
        });
        it("should throw error if GITHUB_REPOSITORY is missing", () => {
            process.env.GITHUB_TOKEN = "test-token";
            expect(() => (0, config_1.getGitHubConfig)()).toThrow("GITHUB_REPOSITORY environment variable is required");
        });
        it("should throw error if GITHUB_REPOSITORY format is invalid", () => {
            process.env.GITHUB_TOKEN = "test-token";
            process.env.GITHUB_REPOSITORY = "invalid-format";
            expect(() => (0, config_1.getGitHubConfig)()).toThrow("Invalid GITHUB_REPOSITORY format. Expected 'owner/repo'");
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
            const result = (0, config_1.getReviewConfig)();
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
            const result = (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(true);
        });
        it("should parse debug mode as false when DEBUG=false", () => {
            process.env.DEBUG = "false";
            const result = (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(false);
        });
        it("should parse debug mode as false when DEBUG is not set", () => {
            // DEBUG not set in environment
            const result = (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(false);
        });
        it("should parse debug mode as false for invalid DEBUG values", () => {
            process.env.DEBUG = "invalid";
            const result = (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(false);
        });
        it("should parse debug mode case-insensitively", () => {
            process.env.DEBUG = "TRUE";
            const result = (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(true);
        });
        it("should parse updatePrDescription correctly", () => {
            process.env.UPDATE_PR_DESCRIPTION = "false";
            const result = (0, config_1.getReviewConfig)();
            expect(result.updatePrDescription).toBe(false);
        });
        it("should default updatePrDescription to true when not set", () => {
            delete process.env.UPDATE_PR_DESCRIPTION;
            const result = (0, config_1.getReviewConfig)();
            expect(result.updatePrDescription).toBe(true);
        });
        it("should throw error if MAX_TURNS is invalid", () => {
            process.env.MAX_TURNS = "invalid";
            expect(() => (0, config_1.getReviewConfig)()).toThrow("MAX_TURNS must be a positive number");
        });
        it("should throw error if MAX_TURNS is zero", () => {
            process.env.MAX_TURNS = "0";
            expect(() => (0, config_1.getReviewConfig)()).toThrow("MAX_TURNS must be a positive number");
        });
        it("should throw error if MAX_TURNS is negative", () => {
            process.env.MAX_TURNS = "-5";
            expect(() => (0, config_1.getReviewConfig)()).toThrow("MAX_TURNS must be a positive number");
        });
    });
});
//# sourceMappingURL=config.test.js.map