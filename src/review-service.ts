import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { PRContext, reviewFullDiff } from "./agent";
import { getModelConfig } from "./config";
import { debugLog } from "./debug";
import type { ExistingReviewComment, ReviewConfig, TriggerContext } from "./types";

/**
 * Service class that orchestrates the review process.
 * The agent has full autonomy to:
 * - Fetch the diff via gh CLI (agentic diff exploration)
 * - Explore the codebase with tools
 * - Search the web for documentation
 * - Post comments and update PR description directly via gh CLI
 */
export class ReviewService {
  private config: ReviewConfig;
  private repoFilePaths: string[] = [];

  constructor(config: ReviewConfig) {
    this.config = config;
  }

  /**
   * Retrieves all file paths in the repository using git.
   */
  private getRepoFilePaths(): string[] {
    try {
      const files = execSync("git ls-files", { encoding: "utf-8" });
      return files.split("\n").filter((p) => p);
    } catch {
      console.warn(
        "⚠️  WARNING: Repository not checked out - agent will have limited context.\n" +
          "   The agent cannot read files or search code beyond the diff.\n" +
          "   To fix this, add 'actions/checkout@v4' before the CodePress Review step in your workflow.\n" +
          "   See: https://github.com/quantfive/codepress-review#quick-start\n",
      );
      return [];
    }
  }

  /**
   * Executes the complete review process using a single autonomous agent.
   * The agent will fetch the diff itself via gh CLI commands.
   */
  async execute(): Promise<void> {
    // Get all files in the repo (helps agent know what files exist)
    this.repoFilePaths = this.getRepoFilePaths();

    // Build trigger context from environment variables
    const triggerEvent = (process.env.TRIGGER_EVENT || "opened") as TriggerContext["triggerEvent"];
    const isReReview = process.env.IS_RE_REVIEW === "true";
    const previousReviewState = process.env.PREVIOUS_REVIEW_STATE as TriggerContext["previousReviewState"] || null;
    const previousReviewCommitSha = process.env.PREVIOUS_REVIEW_COMMIT_SHA || null;

    const triggerContext: TriggerContext = {
      isReReview,
      triggerEvent,
      previousReviewState: previousReviewState || undefined,
      previousReviewCommitSha: previousReviewCommitSha || undefined,
    };

    // Build PR context for the agent
    const prContext: PRContext = {
      repo: this.config.githubRepository,
      prNumber: this.config.pr,
      commitSha: process.env.COMMIT_SHA || "",
      triggerContext,
    };

    if (!prContext.commitSha) {
      console.error(
        "COMMIT_SHA not set - agent will not be able to post inline comments",
      );
    }

    // Load existing review comments from other reviewers
    const commentsFile = resolve("pr-comments.json");
    let existingComments: ExistingReviewComment[] = [];
    if (existsSync(commentsFile)) {
      try {
        existingComments = JSON.parse(readFileSync(commentsFile, "utf8"));
        if (existingComments.length > 0) {
          debugLog(
            `📝 Found ${existingComments.length} existing review comments from other reviewers`,
          );
        }
      } catch {
        debugLog(
          "⚠️ Failed to parse existing comments file, continuing without them",
        );
      }
    }

    // Run the autonomous agent review
    debugLog("🚀 Starting agentic PR review...");
    debugLog(`📂 Repository files available: ${this.repoFilePaths.length}`);
    const modelConfig = getModelConfig();

    try {
      await reviewFullDiff(
        modelConfig,
        this.repoFilePaths,
        prContext,
        this.config.maxTurns,
        this.config.blockingOnly,
        existingComments,
      );
      debugLog("✅ Review completed!");
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Review failed:", err?.message || "unknown error");
    }
  }
}
