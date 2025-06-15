import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import ignore from "ignore";
import { APICallError } from "ai";
import { Finding, ReviewConfig, DiffSummary } from "./types";
import { getModelConfig, getGitHubConfig } from "./config";
import { splitDiff, ProcessableChunk } from "./diff-parser";
import { callWithRetry, summarizeDiff } from "./ai-client";
import { reviewChunkWithAgent } from "./agent";
import { GitHubClient } from "./github-client";

/**
 * Service class that orchestrates the entire review process.
 */
export class ReviewService {
  private config: ReviewConfig;
  private githubClient: GitHubClient;
  private diffSummary?: DiffSummary;
  private repoFilePaths: string[] = [];

  constructor(config: ReviewConfig) {
    this.config = config;
    const githubConfig = getGitHubConfig();
    this.githubClient = new GitHubClient(githubConfig);
  }

  /**
   * Retrieves all file paths in the repository using git.
   */
  private getRepoFilePaths(): string[] {
    try {
      // Using git to list all files, respecting .gitignore
      const files = execSync("git ls-files", { encoding: "utf-8" });
      return files.split("\n").filter((p) => p);
    } catch (error) {
      console.error("Failed to list repository files with git:", error);
      // Fallback or further error handling can be added here
      return [];
    }
  }

  /**
   * Processes a single diff chunk and returns findings instead of posting them immediately.
   */
  private async processChunk(
    chunk: ProcessableChunk,
    chunkIndex: number,
    existingComments: Map<string, Set<number>>,
  ): Promise<Finding[]> {
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
          return [];
        }
      }
    }

    let findings: Finding[] = [];
    try {
      const modelConfig = getModelConfig();

      findings = await callWithRetry(
        () =>
          reviewChunkWithAgent(
            chunk.content,
            modelConfig,
            this.diffSummary,
            chunkIndex,
            this.repoFilePaths,
            this.config.maxTurns,
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
      return [];
    }

    if (!Array.isArray(findings)) {
      console.error(
        `[Hunk ${chunkIndex + 1}] Provider did not return valid findings.`,
      );
      return [];
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

    console.log(
      `[Hunk ${chunkIndex + 1}] Found ${uniqueFindings.length} findings`,
    );
    return uniqueFindings;
  }

  /**
   * Executes the complete review process.
   */
  async execute(): Promise<void> {
    // Get all files in the repo first
    this.repoFilePaths = this.getRepoFilePaths();

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

    // Filter chunks by ignore patterns before summarization, preserving original indices
    const filteredChunks = chunks
      .map((chunk, index) => ({ chunk, originalIndex: index }))
      .filter(({ chunk }) => !ig.ignores(chunk.fileName));

    // Get PR information
    const { commitId } = await this.githubClient.getPRInfo(this.config.pr);

    // Fetch existing reviews and comments BEFORE summarization to provide context
    const existingReviews = await this.githubClient.getExistingReviews(
      this.config.pr,
    );
    const existingCommentsData = await this.githubClient.getExistingComments(
      this.config.pr,
    );

    // First pass: Summarize the entire diff with context from previous reviews/comments
    if (filteredChunks.length > 0) {
      console.log(
        "Performing initial diff summarization with existing context...",
      );
      try {
        const modelConfig = getModelConfig();
        this.diffSummary = await callWithRetry(
          () =>
            summarizeDiff(
              filteredChunks.map(({ chunk }) => chunk),
              modelConfig,
              existingReviews,
              existingCommentsData,
            ),
          0, // Use 0 as a special index for the summary step
        );
        console.log("Diff summary completed.");
        console.log("PR Type:", this.diffSummary.prType);
        console.log("Summary Points:", this.diffSummary.summaryPoints);
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

    // Fetch existing comments to avoid duplicates
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

    // Process chunks in parallel with a concurrency limit and collect all findings
    const concurrencyLimit = 15;
    const promises: Promise<Finding[]>[] = [];
    const allFindings: Finding[] = [];

    for (let i = 0; i < filteredChunks.length; i++) {
      const { chunk, originalIndex } = filteredChunks[i];
      const { fileName } = chunk;

      console.log("Processing fileName: ", fileName);

      promises.push(this.processChunk(chunk, originalIndex, existingComments));

      if (
        promises.length >= concurrencyLimit ||
        i === filteredChunks.length - 1
      ) {
        const batchResults = await Promise.all(promises);
        // Flatten and add all findings from this batch
        for (const findings of batchResults) {
          allFindings.push(...findings);
        }
        promises.length = 0; // Clear the array
      }
    }

    // Create a single review with all findings at the end
    if (allFindings.length > 0) {
      console.log(
        `\n🔍 Creating review with ${allFindings.length} total findings...`,
      );

      try {
        await this.githubClient.createReview(
          this.config.pr,
          commitId,
          allFindings,
          this.diffSummary,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Failed to create review:", errorMessage);
        // Fallback: try to create individual comments
        console.log("Attempting to create individual comments as fallback...");
        const commentPromises = allFindings.map(async (finding) => {
          try {
            await this.githubClient.createReviewComment(
              this.config.pr,
              commitId,
              finding,
            );
            console.log(`✅ Commented on ${finding.path}:${finding.line}`);
          } catch (e: unknown) {
            const eMessage = e instanceof Error ? e.message : String(e);
            console.error(
              `❌ Failed to comment on ${finding.path}:${finding.line}: ${eMessage}`,
            );
          }
        });
        await Promise.all(commentPromises);
      }
    } else {
      console.log("🎉 No issues found during review!");
    }
  }
}
