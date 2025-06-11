import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import ignore from "ignore";
import { APICallError } from "ai";
import { Finding, ReviewConfig, DiffSummary } from "./types";
import { getModelConfig, getGitHubConfig } from "./config";
import { splitDiff, ProcessableChunk } from "./diff-parser";
import { reviewChunk, callWithRetry, summarizeDiff } from "./ai-client";
import { GitHubClient } from "./github-client";

/**
 * Service class that orchestrates the entire review process.
 */
export class ReviewService {
  private config: ReviewConfig;
  private githubClient: GitHubClient;
  private diffSummary?: DiffSummary;

  constructor(config: ReviewConfig) {
    this.config = config;
    const githubConfig = getGitHubConfig();
    this.githubClient = new GitHubClient(githubConfig);
  }

  /**
   * Processes a single diff chunk and posts comments to GitHub.
   */
  private async processChunk(
    chunk: ProcessableChunk,
    chunkIndex: number,
    commitId: string,
    existingComments: Map<string, Set<number>>,
  ): Promise<void> {
    console.log(
      `[Hunk ${chunkIndex + 1}] Size: ${Buffer.byteLength(
        chunk.content,
      )} bytes`,
    );

    // Skip chunk if it's already been commented on
    const fileComments = existingComments.get(chunk.fileName);
    if (fileComments) {
      const { newStart, newLines } = chunk.hunk;
      for (let i = 0; i < newLines; i++) {
        if (fileComments.has(newStart + i)) {
          console.log(
            `[Hunk ${
              chunkIndex + 1
            }] Skipping chunk for ${chunk.fileName} as it has existing comments.`,
          );
          return;
        }
      }
    }

    let findings: Finding[] = [];
    try {
      const modelConfig = getModelConfig();

      // Build summary context for this chunk
      let summaryContext = "";
      if (this.diffSummary) {
        const { prType, overview, keyRisks, hunks } = this.diffSummary;

        summaryContext = `PR TYPE: ${prType}\n\n`;

        if (overview.length > 0) {
          summaryContext += `OVERVIEW:\n${overview.map((item) => `- ${item}`).join("\n")}\n\n`;
        }

        if (keyRisks.length > 0) {
          summaryContext += `KEY RISKS TO WATCH FOR:\n${keyRisks.map((risk) => `- [${risk.tag}] ${risk.description}`).join("\n")}\n\n`;
        }

        // Find specific notes for this chunk
        const hunkSummary = hunks.find((hunk) => hunk.index === chunkIndex);
        if (hunkSummary) {
          summaryContext += `SPECIFIC NOTES FOR THIS CHUNK:\n`;
          summaryContext += `Overview: ${hunkSummary.overview}\n`;

          if (hunkSummary.risks.length > 0) {
            summaryContext += `Risks: ${hunkSummary.risks.map((risk) => `[${risk.tag}] ${risk.description}`).join(", ")}\n`;
          }

          if (hunkSummary.tests.length > 0) {
            summaryContext += `Suggested Tests: ${hunkSummary.tests.join(", ")}\n`;
          }

          summaryContext += `\n`;
        }
      }

      findings = await callWithRetry(
        () =>
          reviewChunk(
            chunk.content,
            modelConfig,
            this.config.customPrompt,
            summaryContext,
          ),
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
      const signature = `${finding.path}:${finding.line}:${finding.message}`;
      if (seenSignatures.has(signature)) {
        return false;
      }
      seenSignatures.add(signature);
      return true;
    });

    // Post findings as comments
    const commentPromises = uniqueFindings.map(async (finding) => {
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
          `[Hunk ${chunkIndex + 1}] Failed to comment on ${finding.path}:${finding.line}: ${e}`,
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

    // Filter chunks by ignore patterns before summarization
    const filteredChunks = chunks.filter(
      (chunk) => !ig.ignores(chunk.fileName),
    );

    // First pass: Summarize the entire diff
    if (filteredChunks.length > 0) {
      console.log("Performing initial diff summarization...");
      try {
        const modelConfig = getModelConfig();
        this.diffSummary = await callWithRetry(
          () => summarizeDiff(filteredChunks, modelConfig),
          0, // Use 0 as a special index for the summary step
        );
        console.log("Diff summary completed.");
        console.log("PR Type:", this.diffSummary.prType);
        console.log("Overview:", this.diffSummary.overview);
        console.log(
          "Key Risks:",
          this.diffSummary.keyRisks.map(
            (risk) => `[${risk.tag}] ${risk.description}`,
          ),
        );
      } catch (error: any) {
        console.warn(
          "Failed to generate diff summary, proceeding without context:",
          error.message,
        );
        this.diffSummary = undefined;
      }
    }

    // Get PR information
    const { commitId } = await this.githubClient.getPRInfo(this.config.pr);

    // Fetch existing comments to avoid duplicates
    const existingCommentsData = await this.githubClient.getExistingComments(
      this.config.pr,
    );
    const botComments = existingCommentsData.filter(
      (comment) => comment.user?.login === "github-actions[bot]",
    );

    const existingComments = new Map<string, Set<number>>();
    for (const comment of botComments) {
      if (!comment.path || !comment.line) continue;
      if (!existingComments.has(comment.path)) {
        existingComments.set(comment.path, new Set());
      }
      existingComments.get(comment.path)?.add(comment.line);
    }

    // Process chunks in parallel with a concurrency limit
    const concurrencyLimit = 15;
    const promises = [];
    for (let i = 0; i < filteredChunks.length; i++) {
      const chunk = filteredChunks[i];
      const { fileName } = chunk;

      console.log("Processing fileName: ", fileName);

      // Find the original chunk index for proper referencing in summary notes
      const originalChunkIndex = chunks.indexOf(chunk);

      promises.push(
        this.processChunk(
          chunk,
          originalChunkIndex,
          commitId,
          existingComments,
        ),
      );
      if (
        promises.length >= concurrencyLimit ||
        i === filteredChunks.length - 1
      ) {
        await Promise.all(promises);
        promises.length = 0; // Clear the array
      }
    }
  }
}
