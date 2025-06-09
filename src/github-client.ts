import { Octokit } from "@octokit/rest";
import { Finding, GitHubConfig } from "./types";

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
 * GitHub client for managing PR reviews and comments.
 */
export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
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
   * Creates a review comment on a PR.
   */
  async createReviewComment(
    prNumber: number,
    commitId: string,
    finding: Finding,
  ): Promise<void> {
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
  }
}
