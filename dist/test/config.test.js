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
        it("should parse pr argument correctly", async () => {
            process.argv = ["node", "script.js", "--pr", "123"];
            const result = (0, config_1.parseArgs)();
            expect(result).toEqual({
                pr: 123,
            });
        });
        it("should exit with error if pr is missing", async () => {
            process.argv = ["node", "script.js"];
            const consoleSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => { });
            const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
                throw new Error("process.exit");
            });
            expect(() => (0, config_1.parseArgs)()).toThrow("process.exit");
            expect(consoleSpy).toHaveBeenCalledWith("Usage: ts-node scripts/ai-review.ts --pr <pr-number>");
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "gemini",
                modelName: "gemini-1.5-pro",
                apiKey: "test-gemini-key",
            });
        });
        it("should throw error if MODEL_PROVIDER is missing", async () => {
            process.env.MODEL_NAME = "gpt-4o";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("MODEL_PROVIDER and MODEL_NAME are required");
        });
        it("should throw error if MODEL_NAME is missing", async () => {
            process.env.MODEL_PROVIDER = "openai";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("MODEL_PROVIDER and MODEL_NAME are required");
        });
        it("should throw error if OPENAI_API_KEY is missing for OpenAI provider", async () => {
            process.env.MODEL_PROVIDER = "openai";
            process.env.MODEL_NAME = "gpt-4o";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("OPENAI_API_KEY is required");
        });
        it("should throw error if ANTHROPIC_API_KEY is missing for Anthropic provider", async () => {
            process.env.MODEL_PROVIDER = "anthropic";
            process.env.MODEL_NAME = "claude-3-sonnet-20240229";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("ANTHROPIC_API_KEY is required");
        });
        it("should throw error if GEMINI_API_KEY is missing for Gemini provider", async () => {
            process.env.MODEL_PROVIDER = "gemini";
            process.env.MODEL_NAME = "gemini-1.5-pro";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("GEMINI_API_KEY is required");
        });
        // Tests for all new providers
        it("should get Cohere config correctly", async () => {
            process.env.MODEL_PROVIDER = "cohere";
            process.env.MODEL_NAME = "command-r-plus";
            process.env.COHERE_API_KEY = "test-cohere-key";
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            const result = await (0, config_1.getModelConfig)();
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
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("COHERE_API_KEY is required");
        });
        it("should throw error if MISTRAL_API_KEY is missing", async () => {
            process.env.MODEL_PROVIDER = "mistral";
            process.env.MODEL_NAME = "mistral-large-latest";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("MISTRAL_API_KEY is required");
        });
        it("should throw error if GROQ_API_KEY is missing", async () => {
            process.env.MODEL_PROVIDER = "groq";
            process.env.MODEL_NAME = "llama-3.1-70b-versatile";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("GROQ_API_KEY is required");
        });
        it("should throw error if DEEPSEEK_API_KEY is missing", async () => {
            process.env.MODEL_PROVIDER = "deepseek";
            process.env.MODEL_NAME = "deepseek-chat";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("DEEPSEEK_API_KEY is required");
        });
        it("should throw error if OPENAI_COMPATIBLE_API_KEY is missing", async () => {
            process.env.MODEL_PROVIDER = "openai-compatible";
            process.env.MODEL_NAME = "llama-3.1-70b-instruct";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("OPENAI_COMPATIBLE_API_KEY is required");
        });
        it("should handle unknown provider with fallback pattern", async () => {
            process.env.MODEL_PROVIDER = "newprovider";
            process.env.MODEL_NAME = "some-model";
            process.env.NEWPROVIDER_API_KEY = "test-key";
            const result = await (0, config_1.getModelConfig)();
            expect(result).toEqual({
                provider: "newprovider",
                modelName: "some-model",
                apiKey: "test-key",
            });
        });
        it("should throw error for unsupported provider", async () => {
            process.env.MODEL_PROVIDER = "unsupported";
            process.env.MODEL_NAME = "some-model";
            await expect((0, config_1.getModelConfig)()).rejects.toThrow("Unknown provider \"unsupported\"");
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
            const result = await (0, config_1.getReviewConfig)();
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
            const result = await (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(true);
        });
        it("should parse debug mode as false when DEBUG=false", async () => {
            process.env.DEBUG = "false";
            const result = await (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(false);
        });
        it("should parse debug mode as false when DEBUG is not set", async () => {
            // DEBUG not set in environment
            const result = await (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(false);
        });
        it("should parse debug mode as false for invalid DEBUG values", async () => {
            process.env.DEBUG = "invalid";
            const result = await (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(false);
        });
        it("should parse debug mode case-insensitively", async () => {
            process.env.DEBUG = "TRUE";
            const result = await (0, config_1.getReviewConfig)();
            expect(result.debug).toBe(true);
        });
        it("should treat invalid MAX_TURNS as unlimited (0)", async () => {
            process.env.MAX_TURNS = "invalid";
            const result = await (0, config_1.getReviewConfig)();
            expect(result.maxTurns).toBe(0);
        });
        it("should treat zero MAX_TURNS as unlimited (0)", async () => {
            process.env.MAX_TURNS = "0";
            const result = await (0, config_1.getReviewConfig)();
            expect(result.maxTurns).toBe(0);
        });
        it("should treat negative MAX_TURNS as unlimited (0)", async () => {
            process.env.MAX_TURNS = "-5";
            const result = await (0, config_1.getReviewConfig)();
            expect(result.maxTurns).toBe(0);
        });
        it("should throw error if GITHUB_TOKEN is missing", async () => {
            delete process.env.GITHUB_TOKEN;
            await expect((0, config_1.getReviewConfig)()).rejects.toThrow("GITHUB_TOKEN environment variable is required");
        });
        it("should throw error if GITHUB_REPOSITORY is missing", async () => {
            delete process.env.GITHUB_REPOSITORY;
            await expect((0, config_1.getReviewConfig)()).rejects.toThrow("GITHUB_REPOSITORY environment variable is required");
        });
    });
    describe("resolveModelAlias (static fallbacks)", () => {
        beforeEach(() => {
            jest.spyOn(console, "log").mockImplementation(() => { });
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });
        describe("OpenAI aliases", () => {
            it("should resolve gpt-latest to gpt-5.2", () => {
                expect((0, config_1.resolveModelAlias)("openai", "gpt-latest")).toBe("gpt-5.2");
            });
            it("should resolve gpt-mini-latest to gpt-5.2-mini", () => {
                expect((0, config_1.resolveModelAlias)("openai", "gpt-mini-latest")).toBe("gpt-5.2-mini");
            });
            it("should resolve latest to gpt-5.2", () => {
                expect((0, config_1.resolveModelAlias)("openai", "latest")).toBe("gpt-5.2");
            });
            it("should return model name unchanged if not an alias", () => {
                expect((0, config_1.resolveModelAlias)("openai", "gpt-4o")).toBe("gpt-4o");
            });
        });
        describe("Anthropic aliases", () => {
            it("should resolve sonnet-latest to claude-sonnet-4-5", () => {
                expect((0, config_1.resolveModelAlias)("anthropic", "sonnet-latest")).toBe("claude-sonnet-4-5");
            });
            it("should resolve opus-latest to claude-opus-4-5", () => {
                expect((0, config_1.resolveModelAlias)("anthropic", "opus-latest")).toBe("claude-opus-4-5");
            });
            it("should resolve haiku-latest to claude-haiku-3-5", () => {
                expect((0, config_1.resolveModelAlias)("anthropic", "haiku-latest")).toBe("claude-haiku-3-5");
            });
            it("should resolve latest to claude-sonnet-4-5", () => {
                expect((0, config_1.resolveModelAlias)("anthropic", "latest")).toBe("claude-sonnet-4-5");
            });
        });
        describe("Gemini aliases", () => {
            it("should resolve gemini-latest to gemini-2.5-flash", () => {
                expect((0, config_1.resolveModelAlias)("gemini", "gemini-latest")).toBe("gemini-2.5-flash");
            });
            it("should resolve gemini-flash-latest to gemini-2.5-flash", () => {
                expect((0, config_1.resolveModelAlias)("gemini", "gemini-flash-latest")).toBe("gemini-2.5-flash");
            });
            it("should resolve gemini-pro-latest to gemini-2.5-pro", () => {
                expect((0, config_1.resolveModelAlias)("gemini", "gemini-pro-latest")).toBe("gemini-2.5-pro");
            });
            it("should work with google provider alias", () => {
                expect((0, config_1.resolveModelAlias)("google", "gemini-latest")).toBe("gemini-2.5-flash");
            });
        });
        describe("XAI aliases", () => {
            it("should resolve grok-latest to grok-4", () => {
                expect((0, config_1.resolveModelAlias)("xai", "grok-latest")).toBe("grok-4");
            });
            it("should resolve grok-mini-latest to grok-3-mini", () => {
                expect((0, config_1.resolveModelAlias)("xai", "grok-mini-latest")).toBe("grok-3-mini");
            });
        });
        describe("Provider name normalization", () => {
            it("should handle uppercase provider names", () => {
                expect((0, config_1.resolveModelAlias)("OPENAI", "gpt-latest")).toBe("gpt-5.2");
            });
            it("should handle mixed case provider names", () => {
                expect((0, config_1.resolveModelAlias)("OpenAI", "gpt-latest")).toBe("gpt-5.2");
            });
            it("should handle uppercase model names", () => {
                expect((0, config_1.resolveModelAlias)("openai", "GPT-LATEST")).toBe("gpt-5.2");
            });
        });
        describe("Unknown providers/models", () => {
            it("should return model name unchanged for unknown provider", () => {
                expect((0, config_1.resolveModelAlias)("unknown", "gpt-latest")).toBe("gpt-latest");
            });
            it("should return model name unchanged for unknown alias", () => {
                expect((0, config_1.resolveModelAlias)("openai", "not-an-alias")).toBe("not-an-alias");
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
        // Match base flash/pro models with optional -001 or -preview suffix
        const flashPattern = /^gemini-(\d+)(?:\.(\d+))?-flash(?:-\d{3}|-preview)?$/;
        const proPattern = /^gemini-(\d+)(?:\.(\d+))?-pro(?:-preview)?$/;
        it("should match gemini-2.5-flash", () => {
            expect(flashPattern.test("gemini-2.5-flash")).toBe(true);
        });
        it("should match gemini-2.0-flash-001", () => {
            expect(flashPattern.test("gemini-2.0-flash-001")).toBe(true);
        });
        it("should match gemini-3-flash-preview (new format without decimal)", () => {
            expect(flashPattern.test("gemini-3-flash-preview")).toBe(true);
        });
        it("should match gemini-2.5-pro", () => {
            expect(proPattern.test("gemini-2.5-pro")).toBe(true);
        });
        it("should match gemini-3-pro-preview", () => {
            expect(proPattern.test("gemini-3-pro-preview")).toBe(true);
        });
        it("should not match gemini-2.5-flash-lite (lite variant)", () => {
            expect(flashPattern.test("gemini-2.5-flash-lite")).toBe(false);
        });
        it("should not match gemini-2.5-flash-image (image variant)", () => {
            expect(flashPattern.test("gemini-2.5-flash-image")).toBe(false);
        });
        it("should not match gemini-2.5-flash-preview-09-2025 (date-suffixed preview)", () => {
            expect(flashPattern.test("gemini-2.5-flash-preview-09-2025")).toBe(false);
        });
        it("should not match gemini-pro (no version)", () => {
            expect(proPattern.test("gemini-pro")).toBe(false);
        });
        it("should not match gemini-3-pro-image-preview (image variant)", () => {
            expect(proPattern.test("gemini-3-pro-image-preview")).toBe(false);
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
    function extractGptVersion(modelName) {
        const match = modelName.match(/^gpt-(\d+)(?:\.(\d+))?/);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = match[2] ? parseInt(match[2], 10) : 0;
            return [major, minor];
        }
        return [0, 0];
    }
    // General version extraction (used for non-GPT models)
    function extractVersionGeneric(modelName) {
        const matches = modelName.match(/(\d+)/g);
        return matches ? matches.map(Number) : [0];
    }
    // Claude version extraction
    function extractClaudeVersionInner(modelName) {
        // Minor version is 1-2 digits to avoid matching dates (8 digits)
        const match = modelName.match(/^claude-(?:sonnet|opus|haiku)-(\d+)(?:-(\d{1,2}))?(?:-|$)/);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = match[2] ? parseInt(match[2], 10) : 0;
            return [major, minor];
        }
        return [0, 0];
    }
    // Gemini version extraction
    function extractGeminiVersionInner(modelName) {
        const match = modelName.match(/^gemini-(\d+)(?:\.(\d+))?/);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = match[2] ? parseInt(match[2], 10) : 0;
            return [major, minor];
        }
        return [0, 0];
    }
    // Unified version extraction
    function extractVersion(modelName) {
        if (modelName.startsWith("gpt-")) {
            return extractGptVersion(modelName);
        }
        if (modelName.startsWith("claude-sonnet-") ||
            modelName.startsWith("claude-opus-") ||
            modelName.startsWith("claude-haiku-")) {
            return extractClaudeVersionInner(modelName);
        }
        if (modelName.startsWith("gemini-")) {
            return extractGeminiVersionInner(modelName);
        }
        return extractVersionGeneric(modelName);
    }
    function compareVersions(a, b) {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const aVal = a[i] || 0;
            const bVal = b[i] || 0;
            if (aVal !== bVal)
                return aVal - bVal;
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
    // Claude version extraction
    function extractClaudeVersion(modelName) {
        // Minor version is 1-2 digits to avoid matching dates (8 digits)
        const match = modelName.match(/^claude-(?:sonnet|opus|haiku)-(\d+)(?:-(\d{1,2}))?(?:-|$)/);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = match[2] ? parseInt(match[2], 10) : 0;
            return [major, minor];
        }
        return [0, 0];
    }
    describe("extractClaudeVersion", () => {
        it("should extract claude-sonnet-4-5 as [4, 5]", () => {
            expect(extractClaudeVersion("claude-sonnet-4-5")).toEqual([4, 5]);
        });
        it("should extract claude-sonnet-4-5-20250929 as [4, 5] (ignoring date)", () => {
            expect(extractClaudeVersion("claude-sonnet-4-5-20250929")).toEqual([4, 5]);
        });
        it("should extract claude-sonnet-4-20250514 as [4, 0] (single version)", () => {
            expect(extractClaudeVersion("claude-sonnet-4-20250514")).toEqual([4, 0]);
        });
        it("should extract claude-opus-4-5-20251101 as [4, 5]", () => {
            expect(extractClaudeVersion("claude-opus-4-5-20251101")).toEqual([4, 5]);
        });
        it("should extract claude-haiku-4-5-20251001 as [4, 5]", () => {
            expect(extractClaudeVersion("claude-haiku-4-5-20251001")).toEqual([4, 5]);
        });
        it("should return [0, 0] for old naming convention", () => {
            // Old naming: claude-3-5-haiku-20241022 doesn't match new pattern
            expect(extractClaudeVersion("claude-3-5-haiku-20241022")).toEqual([0, 0]);
        });
    });
    // Gemini version extraction
    function extractGeminiVersion(modelName) {
        const match = modelName.match(/^gemini-(\d+)(?:\.(\d+))?/);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = match[2] ? parseInt(match[2], 10) : 0;
            return [major, minor];
        }
        return [0, 0];
    }
    describe("extractGeminiVersion", () => {
        it("should extract gemini-2.5-flash as [2, 5]", () => {
            expect(extractGeminiVersion("gemini-2.5-flash")).toEqual([2, 5]);
        });
        it("should extract gemini-3-flash-preview as [3, 0]", () => {
            expect(extractGeminiVersion("gemini-3-flash-preview")).toEqual([3, 0]);
        });
        it("should extract gemini-2.5-flash-001 as [2, 5]", () => {
            expect(extractGeminiVersion("gemini-2.5-flash-001")).toEqual([2, 5]);
        });
        it("should extract gemini-2.5-flash-preview-09-2025 as [2, 5] (ignoring date)", () => {
            expect(extractGeminiVersion("gemini-2.5-flash-preview-09-2025")).toEqual([2, 5]);
        });
        it("should return [0, 0] for non-Gemini models", () => {
            expect(extractGeminiVersion("gpt-5")).toEqual([0, 0]);
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
        it("should use Claude extraction for claude-sonnet-4-5", () => {
            expect(extractVersion("claude-sonnet-4-5")).toEqual([4, 5]);
        });
        it("should use Claude extraction for claude-sonnet-4-5-20250929 (ignoring date)", () => {
            expect(extractVersion("claude-sonnet-4-5-20250929")).toEqual([4, 5]);
        });
        it("should use Claude extraction for claude-sonnet-4-20250514", () => {
            expect(extractVersion("claude-sonnet-4-20250514")).toEqual([4, 0]);
        });
        it("should use Gemini extraction for gemini-2.5-flash", () => {
            expect(extractVersion("gemini-2.5-flash")).toEqual([2, 5]);
        });
        it("should use Gemini extraction for gemini-3-flash-preview", () => {
            expect(extractVersion("gemini-3-flash-preview")).toEqual([3, 0]);
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
        it("should correctly select claude-sonnet-4-5 over claude-sonnet-4 with date suffix", () => {
            // Real API scenario: claude-sonnet-4-5-20250929 vs claude-sonnet-4-20250514
            // 4.5 should beat 4.0 even though 20250514 contains larger numbers
            const models = [
                "claude-sonnet-4-20250514",
                "claude-sonnet-4-5-20250929",
            ];
            const pattern = /^claude-sonnet-(\d+)-(\d+)/;
            const matching = models.filter((m) => pattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            // Both match the pattern, and 4.5 > 4.0
            expect(matching[0]).toBe("claude-sonnet-4-5-20250929");
        });
        it("should correctly sort Gemini models to find latest", () => {
            const models = [
                "gemini-2.0-flash",
                "gemini-2.5-flash",
                "gemini-3-flash-preview",
            ];
            const pattern = /^gemini-(\d+)(?:\.(\d+))?-flash(?:-\d{3}|-preview)?$/;
            const matching = models.filter((m) => pattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            // gemini-3-flash-preview [3, 0] > gemini-2.5-flash [2, 5]
            expect(matching[0]).toBe("gemini-3-flash-preview");
        });
        it("should correctly select gemini-2.5-flash over gemini-2.0-flash-001", () => {
            const models = [
                "gemini-2.0-flash",
                "gemini-2.0-flash-001",
                "gemini-2.5-flash",
            ];
            const pattern = /^gemini-(\d+)(?:\.(\d+))?-flash(?:-\d{3}|-preview)?$/;
            const matching = models.filter((m) => pattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            expect(matching[0]).toBe("gemini-2.5-flash");
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
/**
 * Real-world API data tests.
 * These tests use actual model lists from provider APIs to ensure
 * our version extraction and sorting works correctly in production.
 */
describe("Real-world API model selection", () => {
    // Version extraction functions (same as in config.ts)
    function extractGptVersion(modelName) {
        const match = modelName.match(/^gpt-(\d+)(?:\.(\d+))?/);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = match[2] ? parseInt(match[2], 10) : 0;
            return [major, minor];
        }
        return [0, 0];
    }
    function extractClaudeVersion(modelName) {
        const match = modelName.match(/^claude-(?:sonnet|opus|haiku)-(\d+)(?:-(\d{1,2}))?(?:-|$)/);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = match[2] ? parseInt(match[2], 10) : 0;
            return [major, minor];
        }
        return [0, 0];
    }
    function extractGeminiVersion(modelName) {
        const match = modelName.match(/^gemini-(\d+)(?:\.(\d+))?/);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = match[2] ? parseInt(match[2], 10) : 0;
            return [major, minor];
        }
        return [0, 0];
    }
    function extractVersion(modelName) {
        if (modelName.startsWith("gpt-")) {
            return extractGptVersion(modelName);
        }
        if (modelName.startsWith("claude-sonnet-") ||
            modelName.startsWith("claude-opus-") ||
            modelName.startsWith("claude-haiku-")) {
            return extractClaudeVersion(modelName);
        }
        if (modelName.startsWith("gemini-")) {
            return extractGeminiVersion(modelName);
        }
        const matches = modelName.match(/(\d+)/g);
        return matches ? matches.map(Number) : [0];
    }
    function compareVersions(a, b) {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const aVal = a[i] || 0;
            const bVal = b[i] || 0;
            if (aVal !== bVal)
                return aVal - bVal;
        }
        return 0;
    }
    describe("OpenAI API models (real data from 2026-01-30)", () => {
        // Actual GPT models from OpenAI API
        const OPENAI_GPT_MODELS = [
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-0125",
            "gpt-3.5-turbo-1106",
            "gpt-3.5-turbo-16k",
            "gpt-3.5-turbo-instruct",
            "gpt-3.5-turbo-instruct-0914",
            "gpt-4",
            "gpt-4-0125-preview",
            "gpt-4-0613",
            "gpt-4-1106-preview",
            "gpt-4-turbo",
            "gpt-4-turbo-2024-04-09",
            "gpt-4-turbo-preview",
            "gpt-4.1",
            "gpt-4.1-2025-04-14",
            "gpt-4.1-mini",
            "gpt-4.1-mini-2025-04-14",
            "gpt-4.1-nano",
            "gpt-4.1-nano-2025-04-14",
            "gpt-4o",
            "gpt-4o-2024-05-13",
            "gpt-4o-2024-08-06",
            "gpt-4o-2024-11-20",
            "gpt-4o-64k-output-alpha",
            "gpt-4o-audio-preview",
            "gpt-4o-audio-preview-2024-12-17",
            "gpt-4o-audio-preview-2025-06-03",
            "gpt-4o-mini",
            "gpt-4o-mini-2024-07-18",
            "gpt-4o-mini-audio-preview",
            "gpt-4o-mini-audio-preview-2024-12-17",
            "gpt-4o-mini-realtime-preview",
            "gpt-4o-mini-realtime-preview-2024-12-17",
            "gpt-4o-mini-search-preview",
            "gpt-4o-mini-search-preview-2025-03-11",
            "gpt-4o-mini-transcribe",
            "gpt-4o-mini-transcribe-2025-03-20",
            "gpt-4o-mini-transcribe-2025-12-15",
            "gpt-4o-mini-tts",
            "gpt-4o-mini-tts-2025-03-20",
            "gpt-4o-mini-tts-2025-12-15",
            "gpt-4o-realtime-preview",
            "gpt-4o-realtime-preview-2024-12-17",
            "gpt-4o-realtime-preview-2025-06-03",
            "gpt-4o-search-preview",
            "gpt-4o-search-preview-2025-03-11",
            "gpt-4o-transcribe",
            "gpt-4o-transcribe-diarize",
            "gpt-5",
            "gpt-5-2025-08-07",
            "gpt-5-chat-latest",
            "gpt-5-codex",
            "gpt-5-mini",
            "gpt-5-mini-2025-08-07",
            "gpt-5-nano",
            "gpt-5-nano-2025-08-07",
            "gpt-5-pro",
            "gpt-5-pro-2025-10-06",
            "gpt-5-search-api",
            "gpt-5-search-api-2025-10-14",
            "gpt-5.1",
            "gpt-5.1-2025-11-13",
            "gpt-5.1-chat-latest",
            "gpt-5.1-codex",
            "gpt-5.1-codex-max",
            "gpt-5.1-codex-mini",
            "gpt-5.2",
            "gpt-5.2-2025-12-11",
            "gpt-5.2-chat-latest",
            "gpt-5.2-codex",
            "gpt-5.2-pro",
            "gpt-5.2-pro-2025-12-11",
        ];
        // Pattern for gpt-latest: base GPT models only
        const gptLatestPattern = /^gpt-(\d+)(?:\.(\d+))?(?:-\d{4}-\d{2}-\d{2})?$/;
        it("should select gpt-5.2 as the latest base GPT model", () => {
            const matching = OPENAI_GPT_MODELS.filter((m) => gptLatestPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            // gpt-5.2 [5, 2] should be selected (or gpt-5.2-2025-12-11 which is same version)
            expect(matching[0]).toMatch(/^gpt-5\.2/);
            expect(extractVersion(matching[0])).toEqual([5, 2]);
        });
        it("should NOT select gpt-5 over gpt-5.2 (the original bug)", () => {
            const matching = OPENAI_GPT_MODELS.filter((m) => gptLatestPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            // The bug was: gpt-5-2025-08-07 was being selected because 2025 > 2
            expect(matching[0]).not.toBe("gpt-5");
            expect(matching[0]).not.toBe("gpt-5-2025-08-07");
        });
        it("should exclude variant models from gpt-latest selection", () => {
            const matching = OPENAI_GPT_MODELS.filter((m) => gptLatestPattern.test(m));
            // These should NOT be in the matching list
            expect(matching).not.toContain("gpt-5-pro");
            expect(matching).not.toContain("gpt-5-codex");
            expect(matching).not.toContain("gpt-5-mini");
            expect(matching).not.toContain("gpt-5-chat-latest");
            expect(matching).not.toContain("gpt-5-search-api");
            expect(matching).not.toContain("gpt-5.2-pro");
            expect(matching).not.toContain("gpt-5.2-codex");
        });
        it("should include base models and dated versions in matching", () => {
            const matching = OPENAI_GPT_MODELS.filter((m) => gptLatestPattern.test(m));
            expect(matching).toContain("gpt-5");
            expect(matching).toContain("gpt-5-2025-08-07");
            expect(matching).toContain("gpt-5.1");
            expect(matching).toContain("gpt-5.1-2025-11-13");
            expect(matching).toContain("gpt-5.2");
            expect(matching).toContain("gpt-5.2-2025-12-11");
        });
        // Pattern for gpt-mini-latest
        const gptMiniPattern = /^gpt-(\d+)(?:\.(\d+))?-mini(?:-\d{4}-\d{2}-\d{2})?$/;
        it("should select gpt-5-mini as the latest mini model (no 5.2-mini exists)", () => {
            const matching = OPENAI_GPT_MODELS.filter((m) => gptMiniPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            // gpt-5-mini is the latest mini (there's no gpt-5.1-mini or gpt-5.2-mini in the API)
            expect(matching[0]).toMatch(/^gpt-5-mini/);
        });
    });
    describe("Anthropic API models (real data from 2026-01-30)", () => {
        // Actual Claude models from Anthropic API
        const ANTHROPIC_MODELS = [
            "claude-3-5-haiku-20241022",
            "claude-3-7-sonnet-20250219",
            "claude-3-haiku-20240307",
            "claude-haiku-4-5-20251001",
            "claude-opus-4-1-20250805",
            "claude-opus-4-20250514",
            "claude-opus-4-5-20251101",
            "claude-sonnet-4-20250514",
            "claude-sonnet-4-5-20250929",
        ];
        // Pattern for sonnet-latest
        const sonnetPattern = /^claude-sonnet-(\d+)-(\d+)/;
        it("should select claude-sonnet-4-5 as the latest sonnet model", () => {
            const matching = ANTHROPIC_MODELS.filter((m) => sonnetPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            expect(matching[0]).toBe("claude-sonnet-4-5-20250929");
            expect(extractVersion(matching[0])).toEqual([4, 5]);
        });
        it("should NOT select claude-sonnet-4 over claude-sonnet-4-5 (date extraction bug)", () => {
            const matching = ANTHROPIC_MODELS.filter((m) => sonnetPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            // The bug was: claude-sonnet-4-20250514 was being selected because 20250514 > 5
            expect(matching[0]).not.toBe("claude-sonnet-4-20250514");
        });
        // Pattern for opus-latest
        const opusPattern = /^claude-opus-(\d+)-(\d+)/;
        it("should select claude-opus-4-5 as the latest opus model", () => {
            const matching = ANTHROPIC_MODELS.filter((m) => opusPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            expect(matching[0]).toBe("claude-opus-4-5-20251101");
            expect(extractVersion(matching[0])).toEqual([4, 5]);
        });
        it("should correctly order opus models: 4.5 > 4.1 > 4.0", () => {
            const matching = ANTHROPIC_MODELS.filter((m) => opusPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            expect(matching).toEqual([
                "claude-opus-4-5-20251101", // 4.5
                "claude-opus-4-1-20250805", // 4.1
                "claude-opus-4-20250514", // 4.0
            ]);
        });
        // Pattern for haiku-latest
        const haikuPattern = /^claude-haiku-(\d+)-(\d+)/;
        it("should select claude-haiku-4-5 as the latest haiku model", () => {
            const matching = ANTHROPIC_MODELS.filter((m) => haikuPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            expect(matching[0]).toBe("claude-haiku-4-5-20251001");
            expect(extractVersion(matching[0])).toEqual([4, 5]);
        });
        it("should not match old naming convention models (claude-3-X-tier)", () => {
            // Old naming: claude-3-5-haiku-20241022, claude-3-7-sonnet-20250219
            // These should NOT match the new patterns
            expect(sonnetPattern.test("claude-3-7-sonnet-20250219")).toBe(false);
            expect(haikuPattern.test("claude-3-5-haiku-20241022")).toBe(false);
        });
    });
    describe("Gemini API models (real data from 2026-01-30)", () => {
        // Actual Gemini models from Google API (stripped of "models/" prefix)
        const GEMINI_MODELS = [
            "gemini-2.0-flash",
            "gemini-2.0-flash-001",
            "gemini-2.0-flash-exp-image-generation",
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash-lite-001",
            "gemini-2.5-computer-use-preview-10-2025",
            "gemini-2.5-flash",
            "gemini-2.5-flash-image",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash-lite-preview-09-2025",
            "gemini-2.5-flash-native-audio-latest",
            "gemini-2.5-flash-native-audio-preview-09-2025",
            "gemini-2.5-flash-native-audio-preview-12-2025",
            "gemini-2.5-flash-preview-09-2025",
            "gemini-2.5-flash-preview-tts",
            "gemini-2.5-pro",
            "gemini-2.5-pro-preview-tts",
            "gemini-3-flash-preview",
            "gemini-3-pro-image-preview",
            "gemini-3-pro-preview",
            "gemini-embedding-001",
            "gemini-exp-1206",
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-pro-latest",
            "gemini-robotics-er-1.5-preview",
        ];
        // Pattern for gemini-flash-latest: base flash models only
        const flashPattern = /^gemini-(\d+)(?:\.(\d+))?-flash(?:-\d{3}|-preview)?$/;
        it("should select gemini-3-flash-preview as the latest flash model", () => {
            const matching = GEMINI_MODELS.filter((m) => flashPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            // gemini-3-flash-preview [3, 0] > gemini-2.5-flash [2, 5]
            expect(matching[0]).toBe("gemini-3-flash-preview");
            expect(extractVersion(matching[0])).toEqual([3, 0]);
        });
        it("should exclude variant flash models", () => {
            const matching = GEMINI_MODELS.filter((m) => flashPattern.test(m));
            // These should NOT be in the matching list
            expect(matching).not.toContain("gemini-2.0-flash-lite");
            expect(matching).not.toContain("gemini-2.5-flash-lite");
            expect(matching).not.toContain("gemini-2.5-flash-image");
            expect(matching).not.toContain("gemini-2.5-flash-native-audio-latest");
            expect(matching).not.toContain("gemini-2.5-flash-preview-09-2025"); // date-suffixed
            expect(matching).not.toContain("gemini-2.0-flash-exp-image-generation");
        });
        it("should include base flash models in matching", () => {
            const matching = GEMINI_MODELS.filter((m) => flashPattern.test(m));
            expect(matching).toContain("gemini-2.0-flash");
            expect(matching).toContain("gemini-2.0-flash-001");
            expect(matching).toContain("gemini-2.5-flash");
            expect(matching).toContain("gemini-3-flash-preview");
        });
        // Pattern for gemini-pro-latest
        const proPattern = /^gemini-(\d+)(?:\.(\d+))?-pro(?:-preview)?$/;
        it("should select gemini-3-pro-preview as the latest pro model", () => {
            const matching = GEMINI_MODELS.filter((m) => proPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            // gemini-3-pro-preview [3, 0] > gemini-2.5-pro [2, 5]
            expect(matching[0]).toBe("gemini-3-pro-preview");
            expect(extractVersion(matching[0])).toEqual([3, 0]);
        });
        it("should exclude image variant pro models", () => {
            const matching = GEMINI_MODELS.filter((m) => proPattern.test(m));
            expect(matching).not.toContain("gemini-3-pro-image-preview");
            expect(matching).not.toContain("gemini-2.5-pro-preview-tts");
        });
        it("should correctly order flash models by version", () => {
            const matching = GEMINI_MODELS.filter((m) => flashPattern.test(m));
            matching.sort((a, b) => {
                const versionA = extractVersion(a);
                const versionB = extractVersion(b);
                return compareVersions(versionB, versionA);
            });
            // Verify order: 3.0 > 2.5 > 2.0
            const versions = matching.map((m) => extractVersion(m));
            expect(versions[0]).toEqual([3, 0]); // gemini-3-flash-preview
            expect(versions[1]).toEqual([2, 5]); // gemini-2.5-flash
            // 2.0 models come after
        });
    });
});
//# sourceMappingURL=config.test.js.map