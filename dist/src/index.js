"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs_1 = require("fs");
const path_1 = require("path");
async function run() {
    try {
        // Get inputs from action.yml
        const githubToken = core.getInput("github_token", { required: true });
        const modelProvider = core.getInput("model_provider", { required: true });
        const modelName = core.getInput("model_name", { required: true });
        const openaiApiKey = core.getInput("openai_api_key");
        const anthropicApiKey = core.getInput("anthropic_api_key");
        const geminiApiKey = core.getInput("gemini_api_key");
        const customPrompt = core.getInput("custom_prompt");
        const customSummarizePrompt = core.getInput("custom_summarize_prompt");
        // Validate required API key based on provider
        if (modelProvider === "openai" && !openaiApiKey) {
            core.setFailed("openai_api_key is required when using OpenAI provider");
            return;
        }
        if (modelProvider === "anthropic" && !anthropicApiKey) {
            core.setFailed("anthropic_api_key is required when using Anthropic provider");
            return;
        }
        if (modelProvider === "gemini" && !geminiApiKey) {
            core.setFailed("gemini_api_key is required when using Gemini provider");
            return;
        }
        const context = github.context;
        // Set environment variables for the review script
        process.env.GITHUB_TOKEN = githubToken;
        process.env.MODEL_PROVIDER = modelProvider;
        process.env.MODEL_NAME = modelName;
        process.env.OPENAI_API_KEY = openaiApiKey;
        process.env.ANTHROPIC_API_KEY = anthropicApiKey;
        process.env.GEMINI_API_KEY = geminiApiKey;
        process.env.CUSTOM_PROMPT = customPrompt;
        process.env.CUSTOM_SUMMARIZE_PROMPT = customSummarizePrompt;
        process.env.GITHUB_REPOSITORY =
            context.repo.owner + "/" + context.repo.repo;
        const { pull_request } = context.payload;
        if (!pull_request) {
            core.setFailed("This action can only be run on pull request events");
            return;
        }
        core.info(`Running CodePress Review for PR #${pull_request.number}`);
        core.info(`Provider: ${modelProvider}, Model: ${modelName}`);
        // Generate diff
        const diffFile = (0, path_1.resolve)("pr.diff");
        try {
            core.info("Fetching diff from GitHub API...");
            const octokit = github.getOctokit(githubToken);
            const diffResponse = await octokit.rest.pulls.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: pull_request.number,
                mediaType: {
                    format: "diff",
                },
            });
            const diffOutput = diffResponse.data;
            (0, fs_1.writeFileSync)(diffFile, diffOutput);
            core.info(`Generated diff file: ${diffFile} (${diffOutput.length} bytes)`);
        }
        catch (error) {
            core.setFailed(`Failed to fetch diff from GitHub API: ${error}`);
            return;
        }
        // Run the AI review script
        try {
            // Set up process arguments for the ai-review script
            process.argv = [
                process.argv[0],
                process.argv[1],
                "--diff",
                diffFile,
                "--pr",
                pull_request.number.toString(),
            ];
            const { main } = await Promise.resolve().then(() => __importStar(require("./ai-review")));
            await main();
            core.info("CodePress Review completed successfully");
        }
        catch (error) {
            core.setFailed(`AI review failed: ${error}`);
        }
    }
    catch (error) {
        core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
run();
//# sourceMappingURL=index.js.map