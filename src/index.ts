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

    // Handle max_turns input
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

    let prNumber: number;

    core.info(`Triggered by event: ${context.eventName}`);

    if (context.payload.pull_request) {
      prNumber = context.payload.pull_request.number;
    } else if (context.payload.issue?.pull_request) {
      prNumber = context.payload.issue.number;
    } else if (context.eventName === "workflow_dispatch") {
      core.info("Workflow dispatched manually. Finding PR from branch...");
      const branchName = context.ref.replace("refs/heads/", "");
      const octokit = github.getOctokit(githubToken);

      try {
        const { data: prs } = await octokit.rest.pulls.list({
          owner: context.repo.owner,
          repo: context.repo.repo,
          head: `${context.repo.owner}:${branchName}`,
          state: "open",
          sort: "updated",
          direction: "desc",
          per_page: 1,
        });

        if (prs.length > 0) {
          prNumber = prs[0].number;
        } else {
          core.setFailed(
            `Could not find an open pull request for branch '${branchName}'.`,
          );
          return;
        }
      } catch (e: unknown) {
        core.setFailed(
          `Failed to find PR for branch '${branchName}'. Error: ${e instanceof Error ? e.message : "Unknown"}`,
        );
        return;
      }
    } else {
      core.setFailed(
        "This action must be run in the context of a pull request, a pull request comment, or a manual dispatch.",
      );
      return;
    }

    if (isNaN(prNumber)) {
      core.setFailed("Could not determine a valid pull request number.");
      return;
    }

    core.info(`Running CodePress Review for PR #${prNumber}`);
    core.info(`Provider: ${modelProvider}, Model: ${modelName}`);

    // Generate diff
    const diffFile = resolve("pr.diff");

    try {
      core.info("Fetching diff from GitHub API...");
      const octokit = github.getOctokit(githubToken);

      const diffResponse = await octokit.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber,
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
        prNumber.toString(),
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
