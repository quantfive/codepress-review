import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import ignore from "ignore";
import { resolve } from "path";
import { ExistingComment, reviewFullDiff } from "./agent";
import { getGitHubConfig, getModelConfig } from "./config";
import { isCodePressCommentObject } from "./constants";
import { debugLog } from "./debug";
import { GitHubClient } from "./github-client";
import type { Finding, ReviewConfig } from "./types";

/**
 * Service class that orchestrates the entire review process.
 * Simplified to use a single agent for the entire PR.
 */
export class ReviewService {
  private config: ReviewConfig;
  private githubClient: GitHubClient;
  private repoFilePaths: string[] = [];

  constructor(config: ReviewConfig) {
    this.config = config;
    const githubConfig = getGitHubConfig();
    this.githubClient = new GitHubClient(githubConfig);
  }

  /**
   * Normalize a message for deduplication by removing paths, numbers, and condensing whitespace.
   */
  private normalizeMessage(message: string): string {
    const lower = message.toLowerCase();
    const noPaths = lower.replace(/[\w./\\-]+\.[a-z0-9]+/gi, "");
    const noLineNums = noPaths.replace(/\bline\s*\d+\b/gi, "");
    const noDigits = noLineNums.replace(/\d+/g, "");
    return noDigits.replace(/\s+/g, " ").trim();
  }

  /**
   * Heuristic: identify messages that assert unused/missing without evidence.
   * Drop such comments unless they include an "Evidence:" trail.
   */
  private passesHeuristicEvidenceGate(f: Finding): boolean {
    const msg = (f.message || "").toLowerCase();
    const requiresEvidence =
      msg.includes("unused") ||
      msg.includes("not used") ||
      msg.includes("not referenced") ||
      msg.includes("dead code") ||
      msg.includes("missing import") ||
      msg.includes("missing test");
    if (!requiresEvidence) return true;
    const hasEvidence = /\bevidence\s*:/i.test(f.message || "");
    if (!hasEvidence) {
      debugLog(
        `🧪 Evidence gate: dropping comment lacking evidence → ${f.path}:${String(f.line)}`,
      );
    }
    return hasEvidence;
  }

  /**
   * Deduplicate findings by normalized message to avoid similar comments.
   */
  private deduplicateFindings(findings: Finding[]): Finding[] {
    const seen = new Map<string, { index: number; count: number }>();
    const kept: Finding[] = [];

    for (const f of findings) {
      const key = `${f.severity || ""}::${this.normalizeMessage(f.message)}`;
      if (!seen.has(key)) {
        seen.set(key, { index: kept.length, count: 1 });
        kept.push(f);
      } else {
        const rec = seen.get(key);
        if (rec) rec.count++;
      }
    }

    // Annotate messages with cluster sizes > 1
    for (const { index, count } of seen.values()) {
      if (count > 1) {
        const base = kept[index];
        const suffix = ` (applies to ${count} similar spot${count === 1 ? "" : "s"})`;
        if (!base.message.includes("applies to")) {
          base.message = `${base.message}${suffix}`;
        }
      }
    }

    return kept;
  }

  /**
   * Filter findings by severity and other criteria.
   */
  private filterFindings(findings: Finding[]): Finding[] {
    return findings.filter((f) => {
      const sev = (f.severity || "").toLowerCase();
      // Drop non-actionable notes
      if (sev === "fyi" || sev === "praise") {
        debugLog("🔽 Dropping non-actionable note", f.path, f.line);
        return false;
      }
      // Drop findings without valid line numbers
      if (f.line === null || f.line <= 0) {
        debugLog("🔽 Dropping finding without valid line", f.path);
        return false;
      }
      return true;
    });
  }

  /**
   * Retrieves all file paths in the repository using git.
   */
  private getRepoFilePaths(): string[] {
    try {
      const files = execSync("git ls-files", { encoding: "utf-8" });
      return files.split("\n").filter((p) => p);
    } catch (error) {
      console.error("Failed to list repository files with git:", error);
      return [];
    }
  }

  /**
   * Executes the complete review process using a single agent.
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
    const allIgnorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...userIgnorePatterns];
    const ig = ignore().add(allIgnorePatterns);

    // Filter the diff to remove ignored files (simple line-based filtering)
    const filteredDiff = this.filterDiffByIgnorePatterns(diffText, ig);

    if (!filteredDiff.trim()) {
      debugLog("🎉 No reviewable changes after filtering ignored files!");
      return;
    }

    // Get PR info
    const { commitId } = await this.githubClient.getPRInfo(this.config.pr);

    // Fetch existing comments to provide context and avoid duplicates
    const existingCommentsData = await this.githubClient.getExistingComments(
      this.config.pr,
    );

    // Filter to only CodePress bot comments for duplicate checking
    const botComments = existingCommentsData.filter((comment) =>
      isCodePressCommentObject(comment),
    );

    // Build a set of existing comment locations
    const existingCommentLocations = new Set<string>();
    for (const comment of botComments as ExistingComment[]) {
      if (comment.path && comment.line) {
        existingCommentLocations.add(`${comment.path}:${comment.line}`);
      }
    }

    // Run the single agent review
    debugLog("🚀 Starting single-agent PR review...");
    const modelConfig = getModelConfig();

    let agentResponse;
    try {
      agentResponse = await reviewFullDiff(
        filteredDiff,
        modelConfig,
        this.repoFilePaths,
        existingCommentsData as ExistingComment[],
        this.config.maxTurns,
        this.config.blockingOnly,
      );
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Review failed:", err?.message || "unknown error");
      return;
    }

    let findings = agentResponse.findings;
    debugLog(`📝 Agent returned ${findings.length} findings`);

    // Handle resolved comments
    if (agentResponse.resolvedComments.length > 0) {
      debugLog(
        `✅ Found ${agentResponse.resolvedComments.length} comments to resolve`,
      );
      for (const resolved of agentResponse.resolvedComments) {
        try {
          await this.githubClient.resolveReviewComment(
            this.config.pr,
            parseInt(resolved.commentId, 10),
            resolved.reason,
          );
        } catch (error) {
          console.error(`Failed to resolve comment ${resolved.commentId}:`, error);
        }
      }
    }

    // Filter out findings on lines that already have comments
    findings = findings.filter((f) => {
      const key = `${f.path}:${f.line}`;
      if (existingCommentLocations.has(key)) {
        debugLog(`🔽 Skipping duplicate comment on ${key}`);
        return false;
      }
      return true;
    });

    // Apply blocking-only filter if enabled
    if (this.config.blockingOnly) {
      const originalCount = findings.length;
      findings = findings.filter((f) => f.severity === "required");
      if (originalCount - findings.length > 0) {
        debugLog(
          `🔽 Blocking-only mode: Filtered ${originalCount - findings.length} non-blocking comments`,
        );
      }
    }

    // Apply evidence gate
    findings = findings.filter((f) => this.passesHeuristicEvidenceGate(f));

    // Apply deduplication
    findings = this.deduplicateFindings(findings);

    // Apply final filters
    findings = this.filterFindings(findings);

    debugLog(`📊 Final findings count: ${findings.length}`);

    // Create the review
    if (findings.length > 0) {
      debugLog(`\n🔍 Creating review with ${findings.length} findings...`);

      try {
        await this.githubClient.createReview(
          this.config.pr,
          commitId,
          findings,
          undefined, // No diff summary in simplified flow
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Failed to create review:", errorMessage);

        // Fallback to individual comments
        debugLog("Attempting to create individual comments as fallback...");
        for (const finding of findings) {
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
        }
      }
    } else {
      debugLog("🎉 No issues found during review!");
    }
  }

  /**
   * Filters a diff to remove files that match ignore patterns.
   */
  private filterDiffByIgnorePatterns(
    diffText: string,
    ig: ReturnType<typeof ignore>,
  ): string {
    const lines = diffText.split("\n");
    const filteredLines: string[] = [];
    let currentFile: string | null = null;
    let includeCurrentFile = true;

    for (const line of lines) {
      // Check for file header
      const fileMatch = line.match(/^diff --git a\/(.+?) b\//);
      if (fileMatch) {
        currentFile = fileMatch[1];
        includeCurrentFile = !ig.ignores(currentFile);
        if (includeCurrentFile) {
          filteredLines.push(line);
        }
        continue;
      }

      // Include line if current file is not ignored
      if (includeCurrentFile) {
        filteredLines.push(line);
      }
    }

    return filteredLines.join("\n");
  }
}
