import { Octokit } from "@octokit/rest";
import type {
  Finding,
  GitHubConfig,
  DiffSummary,
  ReviewDecision,
} from "./types";
import { CODEPRESS_REVIEW_TAG } from "./constants";

/**
 * Formats a finding into a GitHub comment with appropriate styling.
 */
export function formatGitHubComment(finding: Finding): string {
  let comment = finding.message;

  if (finding.severity) {
    const severityEmoji =
      {
        required: "🔴",
        optional: "🟡",
        nit: "🔵",
        fyi: "ℹ️",
      }[finding.severity] || "📝";
    comment = `${severityEmoji} **${finding.severity.toUpperCase()}**: ${comment}`;
  }

  if (finding.suggestion) {
    comment += `\n\n**Suggestion:**\n\`\`\`\n${finding.suggestion}\n\`\`\``;
  }

  if (finding.code) {
    comment += `\n\n**Example:**\n${finding.code}`;
  }

  return comment;
}

/**
 * GitHub-compliant rate limit handler following their official documentation
 */
class GitHubRateLimitHandler {
  private secondaryRateLimitRetries = 0;
  private readonly maxRetries = 3;

  async handleRateLimit(
    error: unknown,
    retryFn: () => Promise<void>,
  ): Promise<void> {
    if (!this.isRateLimitError(error)) {
      throw error;
    }

    const rateLimitInfo = this.extractRateLimitInfo(error);

    if (rateLimitInfo.isSecondaryRateLimit) {
      await this.handleSecondaryRateLimit(retryFn);
    } else if (rateLimitInfo.isPrimaryRateLimit) {
      await this.handlePrimaryRateLimit(rateLimitInfo, retryFn);
    } else {
      throw error;
    }
  }

  private isRateLimitError(
    error: unknown,
  ): error is { status: number; message?: string } {
    return (
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof (error as any).status === "number" &&
      ((error as any).status === 403 ||
        (error as any).status === 429 ||
        ((error as any).status === 422 &&
          "message" in error &&
          typeof (error as any).message === "string" &&
          (error as any).message.includes("abuse")))
    );
  }

  private extractRateLimitInfo(error: unknown): {
    isPrimaryRateLimit: boolean;
    isSecondaryRateLimit: boolean;
    retryAfter?: number;
    rateLimitReset?: number;
    rateLimitRemaining?: number;
  } {
    if (!error || typeof error !== "object") {
      return { isPrimaryRateLimit: false, isSecondaryRateLimit: false };
    }

    const isSecondaryRateLimit =
      "status" in error &&
      error.status === 422 &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("abuse");

    const isPrimaryRateLimit =
      "status" in error &&
      (error.status === 403 || error.status === 429) &&
      !isSecondaryRateLimit;

    // Extract rate limit headers if available
    let retryAfter: number | undefined;
    let rateLimitReset: number | undefined;
    let rateLimitRemaining: number | undefined;

    if (
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "headers" in error.response
    ) {
      const headers = error.response.headers as Record<string, string>;

      if (headers["retry-after"]) {
        retryAfter = parseInt(headers["retry-after"], 10);
      }
      if (headers["x-ratelimit-reset"]) {
        rateLimitReset = parseInt(headers["x-ratelimit-reset"], 10);
      }
      if (headers["x-ratelimit-remaining"]) {
        rateLimitRemaining = parseInt(headers["x-ratelimit-remaining"], 10);
      }
    }

    return {
      isPrimaryRateLimit,
      isSecondaryRateLimit,
      retryAfter,
      rateLimitReset,
      rateLimitRemaining,
    };
  }

  private async handlePrimaryRateLimit(
    rateLimitInfo: {
      retryAfter?: number;
      rateLimitReset?: number;
      rateLimitRemaining?: number;
    },
    retryFn: () => Promise<void>,
  ): Promise<void> {
    let waitTime: number;

    if (rateLimitInfo.retryAfter) {
      // Use retry-after header if present
      waitTime = rateLimitInfo.retryAfter * 1000;
      console.warn(
        `Primary rate limit hit, waiting ${rateLimitInfo.retryAfter} seconds as specified by retry-after header`,
      );
    } else if (
      rateLimitInfo.rateLimitRemaining === 0 &&
      rateLimitInfo.rateLimitReset
    ) {
      // Wait until rate limit reset time
      const resetTime = rateLimitInfo.rateLimitReset * 1000;
      const currentTime = Date.now();
      waitTime = Math.max(0, resetTime - currentTime + 1000); // Add 1 second buffer
      console.warn(
        `Primary rate limit hit, waiting until reset time: ${new Date(resetTime).toISOString()}`,
      );
    } else {
      // Default to 1 minute if no specific guidance
      waitTime = 60000;
      console.warn(`Primary rate limit hit, waiting 1 minute (default)`);
    }

    await this.delay(waitTime);
    await retryFn();
  }

  private async handleSecondaryRateLimit(
    retryFn: () => Promise<void>,
  ): Promise<void> {
    if (this.secondaryRateLimitRetries >= this.maxRetries) {
      throw new Error(
        `Secondary rate limit exceeded after ${this.maxRetries} retries`,
      );
    }

    this.secondaryRateLimitRetries++;

    // GitHub recommends at least 1 minute wait for secondary rate limits with exponential backoff
    const baseWaitTime = 60000; // 1 minute
    const waitTime =
      baseWaitTime * Math.pow(2, this.secondaryRateLimitRetries - 1);

    console.warn(
      `Secondary rate limit (abuse detection) hit, attempt ${this.secondaryRateLimitRetries}/${this.maxRetries}, waiting ${waitTime / 1000} seconds`,
    );

    await this.delay(waitTime);

    await retryFn();
    // Reset retry count on success
    this.secondaryRateLimitRetries = 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const end = Date.now() + ms;
      const check = () => {
        if (Date.now() >= end) {
          resolve();
        } else {
          process.nextTick(check);
        }
      };
      check();
    });
  }
}

/**
 * GitHub client for managing PR reviews and comments.
 */
export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;
  private rateLimitHandler: GitHubRateLimitHandler;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
    this.rateLimitHandler = new GitHubRateLimitHandler();
  }

  /**
   * Gets PR information including the head commit SHA.
   */
  async getPRInfo(prNumber: number) {
    const prInfo = await this.octokit.pulls.get({
      owner: this.config.owner,
      repo: this.config.repo,
      pull_number: prNumber,
    });
    return {
      commitId: prInfo.data.head.sha,
      prInfo: prInfo.data,
    };
  }

  /**
   * Fetches existing review comments on a PR.
   */
  async getExistingComments(prNumber: number) {
    const comments = await this.octokit.paginate(
      this.octokit.pulls.listReviewComments,
      {
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
      },
    );
    return comments;
  }

  /**
   * Fetches existing reviews on a PR.
   */
  async getExistingReviews(prNumber: number) {
    const reviews = await this.octokit.paginate(
      this.octokit.pulls.listReviews,
      {
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
      },
    );
    return reviews;
  }

  /**
   * Creates a review comment on a PR.
   * @deprecated Use createReview for batch commenting instead
   */
  async createReviewComment(
    prNumber: number,
    commitId: string,
    finding: Finding,
  ): Promise<void> {
    const makeRequest = async () => {
      await this.octokit.pulls.createReviewComment({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
        commit_id: commitId,
        path: finding.path,
        line: finding.line ?? undefined,
        side: "RIGHT",
        body: formatGitHubComment(finding),
      });
    };

    try {
      await makeRequest();
    } catch (error) {
      await this.rateLimitHandler.handleRateLimit(error, makeRequest);
    }
  }

  /**
   * Creates a pull request review with multiple comments in a single API call.
   * This is much more efficient than creating individual comments and avoids rate limits.
   */
  async createReview(
    prNumber: number,
    commitId: string,
    findings: Finding[],
    diffSummary?: DiffSummary,
  ): Promise<void> {
    const comments = findings.map((finding) => ({
      path: finding.path,
      line: finding.line ?? undefined,
      side: "RIGHT" as const,
      body: formatGitHubComment(finding),
    }));

    // Generate the review body

    // Determine review event based on the decision
    let reviewEvent: ReviewDecision = "COMMENT";
    // Generate the review body: "CodePress Review Summary"
    const summaryParts = [`❇️ **${CODEPRESS_REVIEW_TAG} Summary**`];

    if (diffSummary) {
      const { prType, summaryPoints, keyRisks, decision } = diffSummary;

      summaryParts.push(`**PR Type:** ${prType}`);

      if (summaryPoints.length > 0) {
        summaryParts.push(`**Overview:**`);
        summaryPoints.forEach((point) => {
          summaryParts.push(`• ${point}`);
        });
        summaryParts.push("");
      }

      if (keyRisks.length > 0) {
        summaryParts.push(`**Key Risks:**`);
        keyRisks.forEach((risk) => {
          summaryParts.push(`• [${risk.tag}] ${risk.description}`);
        });
        summaryParts.push("");
      }

      // Add decision information
      if (decision) {
        summaryParts.push(
          `**Decision:** ${decision.recommendation === "APPROVE" ? "✅ APPROVE" : "❌ REQUEST CHANGES"}`,
        );
        summaryParts.push(`**Reasoning:** ${decision.reasoning}`);
        summaryParts.push("");

        // Set the review event based on the decision
        reviewEvent =
          decision.recommendation === "APPROVE" ? "APPROVE" : "REQUEST_CHANGES";
      }
    }

    // Add findings information
    if (findings.length > 0) {
      summaryParts.push(
        `**Review Results:** Found ${findings.length} item${findings.length === 1 ? "" : "s"} that ${findings.length === 1 ? "needs" : "need"} attention during review.`,
      );
    } else if (reviewEvent === "APPROVE") {
      summaryParts.push(
        `**Review Results:** No specific issues found. Code looks good to merge! 🚀`,
      );
    }

    const body = summaryParts.join("\n");

    const makeRequest = async () => {
      await this.octokit.pulls.createReview({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
        commit_id: commitId,
        body,
        event: reviewEvent,
        comments,
      });
    };

    try {
      await makeRequest();
      const eventText =
        reviewEvent === "APPROVE"
          ? "approved"
          : reviewEvent === "REQUEST_CHANGES"
            ? "requested changes"
            : "commented on";
      console.log(
        `✅ ${eventText.charAt(0).toUpperCase() + eventText.slice(1)} PR with ${findings.length} comments`,
      );
    } catch (error) {
      await this.rateLimitHandler.handleRateLimit(error, makeRequest);
      const eventText =
        reviewEvent === "APPROVE"
          ? "approved"
          : reviewEvent === "REQUEST_CHANGES"
            ? "requested changes"
            : "commented on";
      console.log(
        `✅ ${eventText.charAt(0).toUpperCase() + eventText.slice(1)} PR with ${findings.length} comments (after retry)`,
      );
    }
  }
}
