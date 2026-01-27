import * as core from "@actions/core";
import * as github from "@actions/github";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  BotComment,
  ExistingReviewComment,
  InteractiveMentionContext,
  RelatedRepo,
  TriggerContext,
} from "./types";
import {
  filterPRFiles,
  formatPRFilesForPrompt,
  shouldIncludePatches,
  getFilterStats,
  type PRFile,
} from "./pr-files";

interface TriggerConfig {
  runOnPrOpened: boolean;
  runOnPrReopened: boolean;
  runOnReviewRequested: boolean;
  runOnCommentTrigger: boolean;
  commentTriggerPhrase: string;
  interactiveMentionPhrase: string;
}

/**
 * Extracts the user message from a comment body after the @codepress mention.
 * Returns null if this is the full review trigger (@codepress/review).
 */
function extractInteractiveMention(
  commentBody: string,
  commentTriggerPhrase: string,
  interactiveMentionPhrase: string,
): string | null {
  // If it's the full review trigger, return null (not an interactive mention)
  if (commentBody.includes(commentTriggerPhrase)) {
    return null;
  }

  // Check for @codepress mention (case-insensitive)
  const mentionRegex = new RegExp(`${interactiveMentionPhrase}\\s*(.*)`, "is");
  const match = commentBody.match(mentionRegex);

  if (match) {
    // Extract everything after @codepress
    const userMessage = match[1].trim();
    // Return the user's message, or a default if they just said @codepress
    return userMessage || "Please help me with this PR.";
  }

  return null;
}

type TriggerEventType = TriggerContext["triggerEvent"];

function getTriggerEvent(
  context: typeof github.context,
  config: TriggerConfig,
): TriggerEventType {
  const eventName = context.eventName;
  const action = context.payload.action;

  if (eventName === "pull_request" && action === "opened") {
    return "opened";
  }
  if (eventName === "pull_request" && action === "reopened") {
    return "reopened";
  }
  if (eventName === "pull_request" && action === "synchronize") {
    return "synchronize";
  }
  if (eventName === "pull_request" && action === "review_requested") {
    return "review_requested";
  }

  // Issue comment (PR conversation)
  if (eventName === "issue_comment" && action === "created") {
    const isPrComment = !!context.payload.issue?.pull_request;
    const commentBody = context.payload.comment?.body || "";

    if (isPrComment) {
      // Check for full review trigger first (@codepress/review)
      if (commentBody.includes(config.commentTriggerPhrase)) {
        return "comment_trigger";
      }
      // Check for interactive mention (@codepress without /review)
      const interactiveMessage = extractInteractiveMention(
        commentBody,
        config.commentTriggerPhrase,
        config.interactiveMentionPhrase,
      );
      if (interactiveMessage !== null) {
        return "interactive_mention";
      }
    }
  }

  // Pull request review comment (inline on code)
  if (eventName === "pull_request_review_comment" && action === "created") {
    const commentBody = context.payload.comment?.body || "";

    // Check for full review trigger first
    if (commentBody.includes(config.commentTriggerPhrase)) {
      return "comment_trigger";
    }
    // Check for interactive mention
    const interactiveMessage = extractInteractiveMention(
      commentBody,
      config.commentTriggerPhrase,
      config.interactiveMentionPhrase,
    );
    if (interactiveMessage !== null) {
      return "interactive_mention";
    }
  }

  return "workflow_dispatch";
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

  // Issue comment (PR conversation)
  if (eventName === "issue_comment" && action === "created") {
    const isPrComment = !!context.payload.issue?.pull_request;
    const commentBody = context.payload.comment?.body || "";

    if (isPrComment) {
      // Check for full review trigger first
      if (commentBody.includes(config.commentTriggerPhrase)) {
        return {
          shouldRun: config.runOnCommentTrigger,
          reason: config.runOnCommentTrigger
            ? `Comment contains trigger phrase: ${config.commentTriggerPhrase}`
            : "Comment trigger is disabled",
        };
      }

      // Check for interactive mention
      const interactiveMessage = extractInteractiveMention(
        commentBody,
        config.commentTriggerPhrase,
        config.interactiveMentionPhrase,
      );
      if (interactiveMessage !== null) {
        return {
          shouldRun: true, // Always run on interactive mentions
          reason: `Interactive mention: @codepress`,
        };
      }
    }

    return {
      shouldRun: false,
      reason: isPrComment
        ? "Comment does not mention @codepress"
        : "Comment is not on a PR",
    };
  }

  // Pull request review comment (inline on code)
  if (eventName === "pull_request_review_comment" && action === "created") {
    const commentBody = context.payload.comment?.body || "";

    // Check for full review trigger first
    if (commentBody.includes(config.commentTriggerPhrase)) {
      return {
        shouldRun: config.runOnCommentTrigger,
        reason: config.runOnCommentTrigger
          ? `Inline comment contains trigger phrase: ${config.commentTriggerPhrase}`
          : "Comment trigger is disabled",
      };
    }

    // Check for interactive mention
    const interactiveMessage = extractInteractiveMention(
      commentBody,
      config.commentTriggerPhrase,
      config.interactiveMentionPhrase,
    );
    if (interactiveMessage !== null) {
      return {
        shouldRun: true, // Always run on interactive mentions
        reason: `Interactive mention on inline comment: @codepress`,
      };
    }

    return {
      shouldRun: false,
      reason: "Inline comment does not mention @codepress",
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

    // Handle force_full_review input
    const forceFullReview = core.getBooleanInput("force_full_review");

    // Get web search configuration
    const enableWebSearch = core.getBooleanInput("enable_web_search");

    // Get related repos configuration
    const relatedReposInput = core.getInput("related_repos");
    const relatedReposToken = core.getInput("related_repos_token") || githubToken;

    // Get trigger configuration inputs
    const runOnPrOpened = core.getBooleanInput("run_on_pr_opened");
    const runOnPrReopened = core.getBooleanInput("run_on_pr_reopened");
    const runOnReviewRequested = core.getBooleanInput(
      "run_on_review_requested",
    );
    const runOnCommentTrigger = core.getBooleanInput("run_on_comment_trigger");
    const commentTriggerPhrase = core.getInput("comment_trigger_phrase");

    // Interactive mention phrase (just @codepress without /review)
    const interactiveMentionPhrase = "@codepress";

    // Check if action should run based on trigger configuration
    const shouldRun = shouldRunAction(github.context, {
      runOnPrOpened,
      runOnPrReopened,
      runOnReviewRequested,
      runOnCommentTrigger,
      commentTriggerPhrase,
      interactiveMentionPhrase,
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
    process.env.GH_TOKEN = githubToken; // For gh CLI authentication
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

    // Set web search configuration
    process.env.ENABLE_WEB_SEARCH = enableWebSearch.toString();

    let prNumber: number;

    core.info(`Triggered by event: ${context.eventName}`);

    if (context.payload.pull_request) {
      // pull_request and pull_request_review_comment events
      prNumber = context.payload.pull_request.number;
    } else if (context.payload.issue?.pull_request) {
      // issue_comment event on a PR
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

    if (prNumber == null || Number.isNaN(prNumber)) {
      core.setFailed("Could not determine a valid pull request number.");
      return;
    }

    core.info(`Running CodePress Review for PR #${prNumber}`);
    core.info(`Provider: ${modelProvider}, Model: ${modelName}`);

    // Get commit SHA for the PR
    let commitSha: string;

    try {
      core.info("Fetching PR info from GitHub API...");
      const octokit = github.getOctokit(githubToken);

      // Get PR info to get the commit SHA
      const prInfo = await octokit.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber,
      });
      commitSha = prInfo.data.head.sha;
      core.info(`Commit SHA: ${commitSha}`);

      // Fetch existing review comments (both from other reviewers and from the bot itself)
      const existingCommentsFile = resolve("pr-comments.json");
      const botCommentsFile = resolve("bot-comments.json");
      try {
        const { data: reviewComments } =
          await octokit.rest.pulls.listReviewComments({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: prNumber,
          });

        // Separate bot comments from other reviewers' comments
        const isBotComment = (comment: (typeof reviewComments)[0]) =>
          comment.user &&
          (comment.user.login.includes("[bot]") ||
            comment.user.login === "github-actions");

        // Comments from other reviewers (for context)
        const existingComments: ExistingReviewComment[] = reviewComments
          .filter((comment) => comment.user && !isBotComment(comment))
          .map((comment) => ({
            id: comment.id,
            author: comment.user?.login || "unknown",
            body: comment.body,
            path: comment.path,
            line: comment.line ?? comment.original_line ?? null,
            diffHunk: comment.diff_hunk,
            createdAt: comment.created_at,
          }));

        // Bot's own previous comments (for deduplication)
        const botComments: BotComment[] = reviewComments
          .filter((comment) => isBotComment(comment))
          .map((comment) => ({
            id: comment.id,
            path: comment.path,
            line: comment.line ?? null,
            originalLine: comment.original_line ?? null,
            body: comment.body,
            diffHunk: comment.diff_hunk,
            createdAt: comment.created_at,
          }));

        writeFileSync(
          existingCommentsFile,
          JSON.stringify(existingComments, null, 2),
        );
        writeFileSync(botCommentsFile, JSON.stringify(botComments, null, 2));

        core.info(
          `Found ${existingComments.length} review comments from other reviewers`,
        );
        if (botComments.length > 0) {
          core.info(
            `Found ${botComments.length} of your own previous comments for deduplication`,
          );
        }
      } catch (commentError) {
        core.warning(
          `Failed to fetch existing comments (continuing without them): ${commentError}`,
        );
        writeFileSync(existingCommentsFile, "[]");
        writeFileSync(botCommentsFile, "[]");
      }

      // Fetch PR files and filter out ignored patterns (lock files, build outputs, etc.)
      const prFilesFile = resolve("pr-files.json");
      try {
        const { data: prFilesData } = await octokit.rest.pulls.listFiles({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: prNumber,
          per_page: 300, // Max allowed by GitHub API
        });

        const allFiles: PRFile[] = prFilesData.map((file) => ({
          filename: file.filename,
          status: file.status as PRFile["status"],
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
          previousFilename: file.previous_filename,
        }));

        const filteredFiles = filterPRFiles(allFiles);
        const filterStats = getFilterStats(allFiles.length, filteredFiles);
        const includePatches = shouldIncludePatches(filteredFiles);
        const formattedFiles = formatPRFilesForPrompt(filteredFiles, includePatches);

        // Save both raw filtered files and formatted prompt section
        writeFileSync(prFilesFile, JSON.stringify({
          files: filteredFiles,
          formatted: formattedFiles,
          includePatches,
          originalCount: allFiles.length,
          filteredCount: filteredFiles.length,
        }, null, 2));

        core.info(`Found ${allFiles.length} changed files, ${filteredFiles.length} to review${filterStats}`);
        if (includePatches) {
          core.info("Including patches in initial context (small PR)");
        }
      } catch (filesError) {
        core.warning(`Failed to fetch PR files (agent will fetch them): ${filesError}`);
        writeFileSync(prFilesFile, JSON.stringify({ files: [], formatted: "", originalCount: 0, filteredCount: 0 }, null, 2));
      }

      // Determine trigger context for re-review behavior
      const triggerEvent = getTriggerEvent(context, {
        runOnPrOpened,
        runOnPrReopened,
        runOnReviewRequested,
        runOnCommentTrigger,
        commentTriggerPhrase,
        interactiveMentionPhrase,
      });

      // Parse interactive mention context if applicable
      let interactiveMentionContext: InteractiveMentionContext | undefined;
      if (triggerEvent === "interactive_mention") {
        const comment = context.payload.comment;
        const commentBody = comment?.body || "";
        const userMessage = extractInteractiveMention(
          commentBody,
          commentTriggerPhrase,
          interactiveMentionPhrase,
        ) || "Please help me with this PR.";

        // Determine if this is a review comment (inline on code) or issue comment (PR conversation)
        const isReviewComment = context.eventName === "pull_request_review_comment";

        interactiveMentionContext = {
          userMessage,
          commentId: comment?.id || 0,
          commentAuthor: comment?.user?.login || "unknown",
          commentBody,
          isReviewComment,
          // These fields are only available for review comments (inline on code)
          filePath: isReviewComment ? comment?.path : undefined,
          line: isReviewComment ? (comment?.line ?? comment?.original_line ?? undefined) : undefined,
          diffHunk: isReviewComment ? comment?.diff_hunk : undefined,
        };

        core.info(`Interactive mention from @${interactiveMentionContext.commentAuthor}`);
        core.info(`Message: ${userMessage.substring(0, 100)}${userMessage.length > 100 ? "..." : ""}`);
        if (isReviewComment && interactiveMentionContext.filePath) {
          core.info(`On file: ${interactiveMentionContext.filePath}:${interactiveMentionContext.line || "?"}`);
        }
      }

      // Fetch the bot's previous review state
      let previousReviewState: TriggerContext["previousReviewState"] = null;
      let previousReviewCommitSha: string | null = null;

      try {
        const { data: reviews } = await octokit.rest.pulls.listReviews({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: prNumber,
        });

        // Find the most recent review from the bot
        const botReviews = reviews
          .filter(
            (review) =>
              review.user?.login === "github-actions[bot]" ||
              review.user?.type === "Bot",
          )
          .sort(
            (a, b) =>
              new Date(b.submitted_at || 0).getTime() -
              new Date(a.submitted_at || 0).getTime(),
          );

        if (botReviews.length > 0) {
          const lastBotReview = botReviews[0];
          previousReviewState = lastBotReview.state as TriggerContext["previousReviewState"];
          previousReviewCommitSha = lastBotReview.commit_id || null;
          core.info(
            `Found previous bot review: ${previousReviewState} at commit ${previousReviewCommitSha?.substring(0, 7)}`,
          );
        }
      } catch (reviewError) {
        core.warning(
          `Failed to fetch previous reviews (continuing without them): ${reviewError}`,
        );
      }

      // Determine if this is a re-review based on whether the bot has previously
      // submitted a formal review on this PR (not based on trigger event type)
      const isReReview = previousReviewState !== null;

      // Set trigger context environment variables
      process.env.TRIGGER_EVENT = triggerEvent;
      process.env.IS_RE_REVIEW = isReReview.toString();
      process.env.PREVIOUS_REVIEW_STATE = previousReviewState || "";
      process.env.PREVIOUS_REVIEW_COMMIT_SHA = previousReviewCommitSha || "";
      process.env.FORCE_FULL_REVIEW = forceFullReview.toString();

      // Write interactive mention context to file if applicable
      const interactiveMentionFile = resolve("interactive-mention.json");
      if (interactiveMentionContext) {
        writeFileSync(
          interactiveMentionFile,
          JSON.stringify(interactiveMentionContext, null, 2),
        );
        process.env.INTERACTIVE_MENTION = "true";
      } else {
        writeFileSync(interactiveMentionFile, "null");
        process.env.INTERACTIVE_MENTION = "false";
      }

      if (isReReview) {
        core.info(`Re-review detected (trigger: ${triggerEvent})`);
        if (previousReviewCommitSha && previousReviewCommitSha !== commitSha) {
          core.info(
            `Commits changed: ${previousReviewCommitSha.substring(0, 7)} → ${commitSha.substring(0, 7)}`,
          );
        }
      }
    } catch (error) {
      core.setFailed(`Failed to fetch PR info from GitHub API: ${error}`);
      return;
    }

    // Set PR context for the agent
    process.env.PR_NUMBER = prNumber.toString();
    process.env.COMMIT_SHA = commitSha;

    // Clone related repos if configured
    const relatedRepos: RelatedRepo[] = [];
    if (relatedReposInput.trim()) {
      try {
        // Parse YAML-like input (simple line-based parsing)
        const lines = relatedReposInput.trim().split("\n");
        let currentRepo: Partial<RelatedRepo> | null = null;

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("- repo:")) {
            if (currentRepo && currentRepo.repo) {
              relatedRepos.push(currentRepo as RelatedRepo);
            }
            currentRepo = { repo: trimmed.replace("- repo:", "").trim() };
          } else if (trimmed.startsWith("repo:") && currentRepo === null) {
            currentRepo = { repo: trimmed.replace("repo:", "").trim() };
          } else if (trimmed.startsWith("ref:") && currentRepo) {
            currentRepo.ref = trimmed.replace("ref:", "").trim();
          } else if (trimmed.startsWith("description:") && currentRepo) {
            currentRepo.description = trimmed.replace("description:", "").trim();
          }
        }
        if (currentRepo && currentRepo.repo) {
          relatedRepos.push(currentRepo as RelatedRepo);
        }

        // Clone each related repo
        if (relatedRepos.length > 0) {
          const tempDir = mkdtempSync(join(tmpdir(), "codepress-related-"));
          core.info(`Cloning ${relatedRepos.length} related repo(s) to ${tempDir}`);

          for (const relatedRepo of relatedRepos) {
            const repoName = relatedRepo.repo.split("/").pop() || relatedRepo.repo;
            const localPath = join(tempDir, repoName);
            const ref = relatedRepo.ref || "main";

            try {
              const cloneUrl = `https://x-access-token:${relatedReposToken}@github.com/${relatedRepo.repo}.git`;
              execSync(
                `git clone --depth 1 --branch ${ref} "${cloneUrl}" "${localPath}"`,
                { stdio: "pipe" },
              );
              relatedRepo.localPath = localPath;
              core.info(`  Cloned ${relatedRepo.repo}@${ref} → ${localPath}`);
            } catch (cloneError) {
              core.warning(`Failed to clone ${relatedRepo.repo}: ${cloneError}`);
            }
          }
        }
      } catch (parseError) {
        core.warning(`Failed to parse related_repos config: ${parseError}`);
      }
    }

    // Set related repos paths as environment variable for the agent
    const clonedRepos = relatedRepos.filter((r) => r.localPath);
    if (clonedRepos.length > 0) {
      process.env.RELATED_REPOS = JSON.stringify(clonedRepos);
    }

    // Run the AI review script
    try {
      // Set up process arguments for the ai-review script
      process.argv = [process.argv[0], process.argv[1], "--pr", prNumber.toString()];

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
