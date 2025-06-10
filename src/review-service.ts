import { readFileSync } from "fs";
import { resolve } from "path";
import { Finding, ReviewConfig } from "./types";
import { getModelConfig, getGitHubConfig } from "./config";
import { splitDiff } from "./diff-parser";
import { reviewChunk, callWithRetry } from "./ai-client";
import { GitHubClient } from "./github-client";

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
    } catch (e) {
      console.error(
        `[Hunk ${chunkIndex + 1}] Skipping due to repeated errors: ${e}`,
      );
      return;
    }

    if (!Array.isArray(findings)) {
      console.error(
        `[Hunk ${chunkIndex + 1}] Provider did not return valid findings.`,
      );
      return;
    }

    // Post findings as comments
    const commentPromises = findings
      .filter((finding) => finding.line !== null && finding.line > 0)
      .map(async (finding) => {
        try {
          await this.githubClient.createReviewComment(
            this.config.pr,
            commitId,
            finding,
          );
          console.log(
            `[Hunk ${chunkIndex + 1}] Commented on ${finding.path}:${finding.line}`,
          );
        } catch (e) {
          console.error(
            `[Hunk ${chunkIndex + 1}] Failed to comment on ${finding.path}:${
              finding.line
            }: ${e}`,
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

    console.log(
      `Total diff size: ${diffText.length} bytes, split into ${chunks.length} hunk(s).`,
    );
    console.log(
      `Provider: ${this.config.provider}, Model: ${this.config.modelName}`,
    );

    // Get PR information
    const { commitId } = await this.githubClient.getPRInfo(this.config.pr);

    // Process chunks in parallel with a concurrency limit
    const concurrencyLimit = 15;
    const promises = [];
    for (let i = 0; i < chunks.length; i++) {
      promises.push(this.processChunk(chunks[i], i, commitId));
      if (promises.length >= concurrencyLimit || i === chunks.length - 1) {
        await Promise.all(promises);
        promises.length = 0; // Clear the array
      }
    }
  }
}
