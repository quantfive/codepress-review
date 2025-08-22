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
import { isCodePressCommentObject } from "./constants";
import { debugLog, debugWarn, debugError } from "./debug";

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
    const modelConfig = getModelConfig();
    this.githubClient = new GitHubClient(githubConfig, modelConfig);
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
    existingCommentsData: any[],
  ): Promise<Finding[]> {
    debugLog(
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
          debugLog(
            `[Hunk ${
              chunkIndex + 1
            }] Skipping chunk for ${chunk.fileName} as it has existing comments.`,
          );
          return [];
        }
      }
    }

    // Collect existing comments relevant to this chunk
    const { newStart, newLines } = chunk.hunk;
    const start = newStart;
    const end = newStart + newLines - 1;

    const relevantComments = existingCommentsData.filter((comment) => {
      return (
        comment.path === chunk.fileName &&
        comment.line &&
        comment.line >= start &&
        comment.line <= end
      );
    });

    if (relevantComments.length > 0) {
      debugLog(
        `[Hunk ${chunkIndex + 1}] Found ${relevantComments.length} existing comments for this chunk - passing to agent for context`,
      );
    }

    let findings: Finding[] = [];
    try {
      const modelConfig = getModelConfig();

      const agentResponse = await callWithRetry(
        () =>
          reviewChunkWithAgent(
            chunk.content,
            modelConfig,
            this.diffSummary,
            chunkIndex,
            this.repoFilePaths,
            relevantComments,
            this.config.maxTurns,
            this.config.blockingOnly,
          ),
        chunkIndex + 1,
      );

      findings = agentResponse.findings;

      // Add detailed logging for raw findings from the agent
      debugLog(
        `[Hunk ${chunkIndex + 1}] Raw agentResponse:`,
        JSON.stringify(agentResponse, null, 2),
      );

      // Handle resolved comments from agentResponse.resolvedComments
      if (agentResponse.resolvedComments.length > 0) {
        debugLog(
          `[Hunk ${chunkIndex + 1}] Found ${agentResponse.resolvedComments.length} comments to resolve:`,
          agentResponse.resolvedComments.map(
            (rc) => `${rc.path}:${rc.line} - ${rc.reason}`,
          ),
        );

        // Resolve each comment by updating its content
        for (const resolvedComment of agentResponse.resolvedComments) {
          try {
            await this.githubClient.resolveReviewComment(
              this.config.pr,
              parseInt(resolvedComment.commentId, 10),
              resolvedComment.reason,
            );
          } catch (error) {
            console.error(
              `Failed to resolve comment ${resolvedComment.commentId}:`,
              error,
            );
          }
        }
      }
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

      // First, check if a comment already exists on this line from a previous run.
      if (existingComments.get(finding.path)?.has(finding.line)) {
        debugLog(
          `[Hunk ${chunkIndex + 1}] Skipping finding on ${finding.path}:${finding.line} as a comment already exists on this line.`,
        );
        return false;
      }

      // Create a unique signature for the finding based on its content for this run.
      const signature = `${finding.path}:${finding.line}`;
      if (seenSignatures.has(signature)) {
        return false;
      }
      seenSignatures.add(signature);
      return true;
    });

    debugLog(
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

    // Load ignore patterns - start with defaults, then add user patterns
    const ignoreFile = ".codepressignore";
    const userIgnorePatterns = existsSync(ignoreFile)
      ? readFileSync(ignoreFile, "utf8")
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
      : [];

    // Import default patterns
    const { DEFAULT_IGNORE_PATTERNS } = await import("./constants");

    // Combine default patterns with user patterns (user patterns take precedence)
    const allIgnorePatterns = [
      ...DEFAULT_IGNORE_PATTERNS,
      ...userIgnorePatterns,
    ];

    const ig = ignore().add(allIgnorePatterns);

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
      debugLog(
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
              this.config.blockingOnly,
            ),
          0, // Use 0 as a special index for the summary step
        );
        debugLog("Diff summary completed.");
        debugLog("PR Type:", this.diffSummary.prType);
        debugLog("Summary Points:", this.diffSummary.summaryPoints);
        debugLog(
          "Key Risks:",
          this.diffSummary.keyRisks.map(
            (risk) => `[${risk.tag}] ${risk.description}`,
          ),
        );

        // Update PR description if enabled and a description was generated
        debugLog("🔍 PR Description Update Check:", {
          updatePrDescriptionEnabled: this.config.updatePrDescription,
          prDescriptionGenerated: !!this.diffSummary.prDescription,
          prDescriptionLength:
            this.diffSummary.prDescription?.trim().length || 0,
        });

        if (
          this.config.updatePrDescription &&
          this.diffSummary.prDescription &&
          this.diffSummary.prDescription.trim()
        ) {
          debugLog("📝 Attempting to update PR description...");
          debugLog(
            "Generated PR description:",
            this.diffSummary.prDescription.substring(0, 200) + "...",
          );

          const updated = await this.githubClient.updatePRDescription(
            this.config.pr,
            this.diffSummary.prDescription.trim(),
          );

          if (updated) {
            debugLog("✅ PR description was updated successfully");
          } else {
            debugLog(
              "⏭️ PR description was not updated (already exists or error)",
            );
          }
        } else {
          if (!this.config.updatePrDescription) {
            debugLog("⏭️ PR description update is disabled in config");
          } else if (
            !this.diffSummary.prDescription ||
            !this.diffSummary.prDescription.trim()
          ) {
            debugLog("⚠️ No PR description was generated by the AI model");
          }
        }
      } catch (error: any) {
        debugWarn(
          "Failed to generate diff summary, proceeding without context:",
          error.message,
        );
        debugError("Full error details:", error);
        if (error.stack) {
          debugError("Stack trace:", error.stack);
        }
        this.diffSummary = undefined;
      }
    }

    // Fetch existing comments to avoid duplicates
    const botComments = existingCommentsData.filter((comment) =>
      isCodePressCommentObject(comment),
    );

    const existingComments = new Map<string, Set<number>>();
    for (const comment of botComments) {
      if (!comment.path || !comment.line) continue;
      if (!existingComments.has(comment.path)) {
        existingComments.set(comment.path, new Set());
      }
      existingComments.get(comment.path)?.add(comment.line);
    }

    // Process all chunks in parallel and collect all findings
    const promises: Promise<Finding[]>[] = [];

    for (let i = 0; i < filteredChunks.length; i++) {
      const { chunk, originalIndex } = filteredChunks[i];
      const { fileName } = chunk;

      debugLog("Processing fileName: ", fileName);

      promises.push(
        this.processChunk(
          chunk,
          originalIndex,
          existingComments,
          existingCommentsData,
        ),
      );
    }

    // Wait for all chunks to be processed
    const allResults = await Promise.all(promises);
    let allFindings: Finding[] = [];
    for (const findings of allResults) {
      allFindings.push(...findings);
    }

    // Filter findings based on blocking_only setting
    if (this.config.blockingOnly) {
      const originalCount = allFindings.length;
      allFindings = allFindings.filter(
        (finding) => finding.severity === "required",
      );
      const filteredCount = originalCount - allFindings.length;
      if (filteredCount > 0) {
        debugLog(
          `🔽 Blocking-only mode: Filtered out ${filteredCount} non-blocking comments (${allFindings.length} remaining)`,
        );
      }
    }

    // Create a review - either with findings or just the summary decision
    const shouldCreateReview =
      allFindings.length > 0 || this.diffSummary?.decision;

    if (shouldCreateReview) {
      const findingsText =
        allFindings.length > 0
          ? `${allFindings.length} total findings`
          : "summary decision only";
      debugLog(`\n🔍 Creating review with ${findingsText}...`);

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

        // Only fallback to individual comments if we have findings
        if (allFindings.length > 0) {
          debugLog("Attempting to create individual comments as fallback...");
          const commentPromises = allFindings.map(async (finding) => {
            try {
              await this.githubClient.createReviewComment(
                this.config.pr,
                commitId,
                finding,
              );
              debugLog(`✅ Commented on ${finding.path}:${finding.line}`);
            } catch (e: unknown) {
              const eMessage = e instanceof Error ? e.message : String(e);
              console.error(
                `❌ Failed to comment on ${finding.path}:${finding.line}: ${eMessage}`,
              );
            }
          });
          await Promise.all(commentPromises);
        }
      }
    } else {
      debugLog("🎉 No issues found during review and no decision available!");
    }
  }
}
