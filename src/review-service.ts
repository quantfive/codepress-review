import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import ignore from "ignore";
import { APICallError } from "ai";
import { Finding, ReviewConfig } from "./types";
import { getModelConfig, getGitHubConfig } from "./config";
import { splitDiff, getFileNameFromChunk } from "./diff-parser";
import { reviewChunk, callWithRetry } from "./ai-client";
import { GitHubClient, formatGitHubComment } from "./github-client";

/**
 * Service class that orchestrates the entire review process.
 */
export class ReviewService {
  private config: ReviewConfig;
  private githubClient: GitHubClient;

  constructor(config: ReviewConfig) {
    this.config = config;
    const githubConfig = getGitHubConfig();
    this.githubClient = new GitHubClient(githubConfig);
  }

  /**
   * Processes a single diff chunk and posts comments to GitHub.
   */
  private async processChunk(
    chunk: string,
    chunkIndex: number,
    commitId: string,
    existingComments: Set<string>,
  ): Promise<void> {
    console.log(
      `[Hunk ${chunkIndex + 1}] Size: ${Buffer.byteLength(chunk)} bytes`,
    );

    let findings: Finding[] = [];
    try {
      const modelConfig = getModelConfig();
      findings = await callWithRetry(
        () => reviewChunk(chunk, modelConfig, this.config.customPrompt),
        chunkIndex + 1,
      );
    } catch (error: any) {
      if (APICallError.isInstance(error)) {
        console.error(
          `[Hunk ${
            chunkIndex + 1
          }] Skipping due to non-retryable API error: ${error.message}`,
        );
      } else {
        console.error(
          `[Hunk ${chunkIndex + 1}] Skipping due to repeated errors: ${error.message}`,
        );
      }
      return;
    }

    if (!Array.isArray(findings)) {
      console.error(
        `[Hunk ${chunkIndex + 1}] Provider did not return valid findings.`,
      );
      return;
    }

    // De-duplicate findings that are identical to avoid spamming,
    // but allow for multiple different comments on the same line.
    const seenSignatures = new Set<string>();
    const uniqueFindings = findings.filter((finding) => {
      if (finding.line === null || finding.line <= 0) {
        return false; // Don't process findings without a line number
      }

      // Create a unique signature for the finding based on its content.
      const body = formatGitHubComment(finding);
      const signature = `${finding.path}:${finding.line}:${body}`;
      if (seenSignatures.has(signature)) {
        return false;
      }
      seenSignatures.add(signature);
      return true;
    });

    // Post findings as comments
    const commentPromises = uniqueFindings.map(async (finding) => {
      const body = formatGitHubComment(finding);
      const commentIdentifier = `${finding.path}:${body}`;
      if (existingComments.has(commentIdentifier)) {
        console.log(
          `[Hunk ${
            chunkIndex + 1
          }] Skipping duplicate comment on ${finding.path}:${finding.line}`,
        );
        return;
      }

      try {
        await this.githubClient.createReviewComment(
          this.config.pr,
          commitId,
          finding,
        );
        console.log(
          `[Hunk ${chunkIndex + 1}] Commented on ${finding.path}:$${finding.line}`,
        );
      } catch (e) {
        console.error(
          `[Hunk ${chunkIndex + 1}] Failed to comment on ${finding.path}:$${finding.line}: ${e}`,
        );
      }
    });

    await Promise.all(commentPromises);
  }

  /**
   * Executes the complete review process.
   */
  async execute(): Promise<void> {
    // Read and split the diff
    const diffText = readFileSync(resolve(this.config.diff), "utf8");
    const chunks = splitDiff(diffText);

    // Load ignore patterns
    const ignoreFile = ".codepressignore";
    const ignorePatterns = existsSync(ignoreFile)
      ? readFileSync(ignoreFile, "utf8")
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
      : [];

    const ig = ignore().add(ignorePatterns);

    // Get PR information
    const { commitId } = await this.githubClient.getPRInfo(this.config.pr);

    // Fetch existing comments to avoid duplicates
    const existingCommentsData = await this.githubClient.getExistingComments(
      this.config.pr,
    );
    const botComments = existingCommentsData.filter(
      (comment) => comment.user?.login === "github-actions[bot]",
    );
    const existingComments = new Set(
      botComments.map((comment) => `${comment.path}:${comment.body}`),
    );

    // Process chunks in parallel with a concurrency limit
    const concurrencyLimit = 15;
    const promises = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const fileName = getFileNameFromChunk(chunk);

      if (fileName) {
        const shouldIgnore = ig.ignores(fileName);
        console.log("fileName: ", fileName);
        console.log("shouldIgnore: ", shouldIgnore);

        if (shouldIgnore) {
          console.log(`Skipping review for ignored file: ${fileName}`);
          continue;
        }
      }

      promises.push(this.processChunk(chunk, i, commitId, existingComments));
      if (promises.length >= concurrencyLimit || i === chunks.length - 1) {
        await Promise.all(promises);
        promises.length = 0; // Clear the array
      }
    }
  }
}
