import * as core from "@actions/core";
import * as github from "@actions/github";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface TriggerConfig {
  runOnPrOpened: boolean;
  runOnPrReopened: boolean;
  runOnReviewRequested: boolean;
  runOnCommentTrigger: boolean;
  commentTriggerPhrase: string;
}

interface ShouldRunResult {
  shouldRun: boolean;
  reason: string;
}

function shouldRunAction(
  context: typeof github.context,
  config: TriggerConfig,
): ShouldRunResult {
  const eventName = context.eventName;
  const action = context.payload.action;

  // PR opened
  if (eventName === "pull_request" && action === "opened") {
    return {
      shouldRun: config.runOnPrOpened,
      reason: config.runOnPrOpened
        ? "PR was opened"
        : "PR opened trigger is disabled",
    };
  }

  // PR reopened
  if (eventName === "pull_request" && action === "reopened") {
    return {
      shouldRun: config.runOnPrReopened,
      reason: config.runOnPrReopened
        ? "PR was reopened"
        : "PR reopened trigger is disabled",
    };
  }

  // PR synchronized (new commits pushed)
  if (eventName === "pull_request" && action === "synchronize") {
    return {
      shouldRun: true, // Always run on synchronize since user opted in by including the event
      reason: "New commits pushed to PR",
    };
  }

  // Review requested
  if (eventName === "pull_request" && action === "review_requested") {
    const requestedReviewer = context.payload.requested_reviewer;
    if (requestedReviewer?.login === "github-actions[bot]") {
      return {
        shouldRun: config.runOnReviewRequested,
        reason: config.runOnReviewRequested
          ? "Re-review requested from github-actions[bot]"
          : "Review requested trigger is disabled",
      };
    }
    return {
      shouldRun: false,
      reason: "Review requested from user (not github-actions[bot])",
    };
  }

  // Comment trigger
  if (eventName === "issue_comment" && action === "created") {
    const isPrComment = !!context.payload.issue?.pull_request;
    const commentBody = context.payload.comment?.body || "";
    const containsTrigger = commentBody.includes(config.commentTriggerPhrase);

    if (isPrComment && containsTrigger) {
      return {
        shouldRun: config.runOnCommentTrigger,
        reason: config.runOnCommentTrigger
          ? `Comment contains trigger phrase: ${config.commentTriggerPhrase}`
          : "Comment trigger is disabled",
      };
    }

    return {
      shouldRun: false,
      reason: isPrComment
        ? "Comment does not contain trigger phrase"
        : "Comment is not on a PR",
    };
  }

  // Manual workflow dispatch
  if (eventName === "workflow_dispatch") {
    return {
      shouldRun: true,
      reason: "Manual workflow dispatch",
    };
  }

  return {
    shouldRun: false,
    reason: `Unsupported event: ${eventName} with action: ${action}`,
  };
}

async function run(): Promise<void> {
  try {
    // Get inputs from action.yml
    const githubToken = core.getInput("github_token", { required: true });
    const modelProvider = core.getInput("model_provider", { required: true });
    const modelName = core.getInput("model_name", { required: true });

    // Get all possible API keys
    const openaiApiKey = core.getInput("openai_api_key");
    const anthropicApiKey = core.getInput("anthropic_api_key");
    const geminiApiKey = core.getInput("gemini_api_key");
    const cohereApiKey = core.getInput("cohere_api_key");
    const mistralApiKey = core.getInput("mistral_api_key");
    const perplexityApiKey = core.getInput("perplexity_api_key");
    const fireworksApiKey = core.getInput("fireworks_api_key");
    const groqApiKey = core.getInput("groq_api_key");
    const xaiApiKey = core.getInput("xai_api_key");
    const deepseekApiKey = core.getInput("deepseek_api_key");
    const openaiCompatibleApiKey = core.getInput("openai_compatible_api_key");
    const ollamaApiKey = core.getInput("ollama_api_key");

    // Get base URLs for self-hosted endpoints
    const openaiCompatibleBaseUrl = core.getInput("openai_compatible_base_url");
    const ollamaBaseUrl = core.getInput("ollama_base_url");

    // Get reasoning/thinking configuration
    const reasoningEffort = core.getInput("reasoning_effort");
    const anthropicEffort = core.getInput("anthropic_effort");
    const thinkingEnabled = core.getInput("thinking_enabled");
    const thinkingBudget = core.getInput("thinking_budget");

    // Handle max_turns input
    const maxTurns = core.getInput("max_turns");

    // Handle update_pr_description input
    const updatePrDescription = core.getBooleanInput("update_pr_description");

    // Handle debug input
    const debug = core.getBooleanInput("debug");

    // Handle blocking_only input
    const blockingOnly = core.getBooleanInput("blocking_only");

    // Get trigger configuration inputs
    const runOnPrOpened = core.getBooleanInput("run_on_pr_opened");
    const runOnPrReopened = core.getBooleanInput("run_on_pr_reopened");
    const runOnReviewRequested = core.getBooleanInput(
      "run_on_review_requested",
    );
    const runOnCommentTrigger = core.getBooleanInput("run_on_comment_trigger");
    const commentTriggerPhrase = core.getInput("comment_trigger_phrase");

    // Check if action should run based on trigger configuration
    const shouldRun = shouldRunAction(github.context, {
      runOnPrOpened,
      runOnPrReopened,
      runOnReviewRequested,
      runOnCommentTrigger,
      commentTriggerPhrase,
    });

    if (!shouldRun.shouldRun) {
      core.info(`Skipping review: ${shouldRun.reason}`);
      return;
    }

    core.info(`Running review: ${shouldRun.reason}`);

    // Validate required API key based on provider
    const apiKeyMap: Record<string, string | undefined> = {
      openai: openaiApiKey,
      anthropic: anthropicApiKey,
      gemini: geminiApiKey,
      google: geminiApiKey, // Alias for gemini
      cohere: cohereApiKey,
      mistral: mistralApiKey,
      perplexity: perplexityApiKey,
      fireworks: fireworksApiKey,
      groq: groqApiKey,
      xai: xaiApiKey,
      deepseek: deepseekApiKey,
      "openai-compatible": openaiCompatibleApiKey,
      ollama: ollamaApiKey,
    };

    const providerKey = apiKeyMap[modelProvider.toLowerCase()];
    if (providerKey === undefined) {
      // For unknown providers, we'll let the config.ts handle the validation
      core.info(
        `Unknown provider "${modelProvider}". Will attempt to use ${modelProvider.toUpperCase()}_API_KEY environment variable.`,
      );
    } else if (!providerKey) {
      core.setFailed(
        `${modelProvider.toLowerCase()}_api_key is required when using ${modelProvider} provider`,
      );
      return;
    }

    const context = github.context;

    // Set environment variables for the review script
    process.env.GITHUB_TOKEN = githubToken;
    process.env.MODEL_PROVIDER = modelProvider;
    process.env.MODEL_NAME = modelName;

    // Set all API keys as environment variables
    process.env.OPENAI_API_KEY = openaiApiKey;
    process.env.ANTHROPIC_API_KEY = anthropicApiKey;
    process.env.GEMINI_API_KEY = geminiApiKey;
    process.env.COHERE_API_KEY = cohereApiKey;
    process.env.MISTRAL_API_KEY = mistralApiKey;
    process.env.PERPLEXITY_API_KEY = perplexityApiKey;
    process.env.FIREWORKS_API_KEY = fireworksApiKey;
    process.env.GROQ_API_KEY = groqApiKey;
    process.env.XAI_API_KEY = xaiApiKey;
    process.env.DEEPSEEK_API_KEY = deepseekApiKey;
    process.env.OPENAI_COMPATIBLE_API_KEY = openaiCompatibleApiKey;
    process.env.OLLAMA_API_KEY = ollamaApiKey;

    // Set base URLs for self-hosted endpoints
    process.env.OPENAI_COMPATIBLE_BASE_URL = openaiCompatibleBaseUrl;
    process.env.OLLAMA_BASE_URL = ollamaBaseUrl;

    // Set reasoning/thinking configuration
    process.env.REASONING_EFFORT = reasoningEffort;
    process.env.ANTHROPIC_EFFORT = anthropicEffort;
    process.env.THINKING_ENABLED = thinkingEnabled;
    process.env.THINKING_BUDGET = thinkingBudget;

    process.env.MAX_TURNS = maxTurns;
    process.env.UPDATE_PR_DESCRIPTION = updatePrDescription.toString();
    process.env.DEBUG = debug.toString();
    process.env.BLOCKING_ONLY = blockingOnly.toString();
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

    if (Number.isNaN(prNumber)) {
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

// Only run if not in a test environment
if (process.env.NODE_ENV !== "test") {
  run();
}

export { run };
