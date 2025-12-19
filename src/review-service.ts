import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import ignore from "ignore";
import { resolve } from "path";
import { PRContext, reviewFullDiff } from "./agent";
import { getModelConfig } from "./config";
import { debugLog } from "./debug";
import type { ExistingReviewComment, ReviewConfig } from "./types";

/**
 * Service class that orchestrates the review process.
 * The agent now has full autonomy to post comments and update PR description directly via gh CLI.
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
    } catch (error) {
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
   */
  async execute(): Promise<void> {
    // Get all files in the repo
    this.repoFilePaths = this.getRepoFilePaths();

    // Read the full diff
    const diffText = readFileSync(resolve(this.config.diff), "utf8");

    // Load ignore patterns
    const ignoreFile = ".codepressignore";
    const userIgnorePatterns = existsSync(ignoreFile)
      ? readFileSync(ignoreFile, "utf8")
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
      : [];

    const { DEFAULT_IGNORE_PATTERNS } = await import("./constants");
    const allIgnorePatterns = [
      ...DEFAULT_IGNORE_PATTERNS,
      ...userIgnorePatterns,
    ];
    const ig = ignore().add(allIgnorePatterns);

    // Filter the diff to remove ignored files
    const filteredDiff = this.filterDiffByIgnorePatterns(diffText, ig);

    if (!filteredDiff.trim()) {
      debugLog("🎉 No reviewable changes after filtering ignored files!");
      return;
    }

    // Build PR context for the agent
    const prContext: PRContext = {
      repo: this.config.githubRepository,
      prNumber: this.config.pr,
      commitSha: process.env.COMMIT_SHA || "",
    };

    if (!prContext.commitSha) {
      console.error("COMMIT_SHA not set - agent will not be able to post inline comments");
    }

    // Load existing review comments from other reviewers
    const commentsFile = resolve("pr-comments.json");
    let existingComments: ExistingReviewComment[] = [];
    if (existsSync(commentsFile)) {
      try {
        existingComments = JSON.parse(readFileSync(commentsFile, "utf8"));
        if (existingComments.length > 0) {
          debugLog(`📝 Found ${existingComments.length} existing review comments from other reviewers`);
        }
      } catch (error) {
        debugLog("⚠️ Failed to parse existing comments file, continuing without them");
      }
    }

    // Run the autonomous agent review
    debugLog("🚀 Starting autonomous PR review...");
    const modelConfig = getModelConfig();

    try {
      await reviewFullDiff(
        filteredDiff,
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

  /**
   * Filters a diff to remove entire file blocks that match ignore patterns.
   * Each file block starts with "diff --git" and includes all headers (index, ---, +++, @@)
   * and content lines until the next "diff --git" line.
   */
  private filterDiffByIgnorePatterns(
    diffText: string,
    ig: ReturnType<typeof ignore>,
  ): string {
    const lines = diffText.split("\n");
    const filteredLines: string[] = [];
    let currentFile: string | null = null;
    // Start false to exclude any preamble content before first diff block
    let includeCurrentFile = false;

    for (const line of lines) {
      // Check for file header - this starts a new diff block
      const fileMatch = line.match(/^diff --git a\/(.+?) b\//);
      if (fileMatch) {
        currentFile = fileMatch[1];
        includeCurrentFile = !ig.ignores(currentFile);
        if (includeCurrentFile) {
          filteredLines.push(line);
        }
        continue;
      }

      // Include line if current file block is not ignored
      // This includes all headers (index, ---, +++, @@) and content lines
      if (includeCurrentFile) {
        filteredLines.push(line);
      }
    }

    return filteredLines.join("\n");
  }
}
