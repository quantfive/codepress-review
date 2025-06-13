import * as core from "@actions/core";
import * as github from "@actions/github";
import { writeFileSync } from "fs";
import { resolve } from "path";

async function run(): Promise<void> {
  try {
    // Get inputs from action.yml
    const githubToken = core.getInput("github_token", { required: true });
    const modelProvider = core.getInput("model_provider", { required: true });
    const modelName = core.getInput("model_name", { required: true });
    const openaiApiKey = core.getInput("openai_api_key");
    const anthropicApiKey = core.getInput("anthropic_api_key");
    const geminiApiKey = core.getInput("gemini_api_key");
    const maxTurns = core.getInput("max_turns");

    // Validate required API key based on provider
    if (modelProvider === "openai" && !openaiApiKey) {
      core.setFailed("openai_api_key is required when using OpenAI provider");
      return;
    }
    if (modelProvider === "anthropic" && !anthropicApiKey) {
      core.setFailed(
        "anthropic_api_key is required when using Anthropic provider",
      );
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
    process.env.MAX_TURNS = maxTurns;
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
    const diffFile = resolve("pr.diff");

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

      const diffOutput = diffResponse.data as unknown as string;
      writeFileSync(diffFile, diffOutput);
      core.info(
        `Generated diff file: ${diffFile} (${diffOutput.length} bytes)`,
      );
    } catch (error) {
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

      const { main } = await import("./ai-review");
      await main();
      core.info("CodePress Review completed successfully");
    } catch (error) {
      core.setFailed(`AI review failed: ${error}`);
    }
  } catch (error) {
    core.setFailed(
      `Action failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

run();
