"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubClient = void 0;
exports.formatGitHubComment = formatGitHubComment;
const rest_1 = require("@octokit/rest");
const ai_client_1 = require("./ai-client");
const constants_1 = require("./constants");
const debug_1 = require("./debug");
/**
 * Formats a finding into a GitHub comment with appropriate styling.
 */
function formatGitHubComment(finding) {
    let comment = finding.message;
    if (finding.severity) {
        const severityEmoji = {
            required: "🔴",
            optional: "🟡",
            nit: "🔵",
            fyi: "ℹ️",
            praise: "👏",
        }[finding.severity] || "📝";
        comment = `${severityEmoji} **${finding.severity.toUpperCase()}**: ${comment}`;
    }
    if (finding.suggestion) {
        comment += `\n\n\`\`\`suggestion\n${finding.suggestion}\n\`\`\``;
    }
    return comment;
}
/**
 * GitHub-compliant rate limit handler following their official documentation
 */
class GitHubRateLimitHandler {
    constructor() {
        this.secondaryRateLimitRetries = 0;
        this.maxRetries = 3;
    }
    async handleRateLimit(error, retryFn) {
        if (!this.isRateLimitError(error)) {
            throw error;
        }
        const rateLimitInfo = this.extractRateLimitInfo(error);
        if (rateLimitInfo.isSecondaryRateLimit) {
            await this.handleSecondaryRateLimit(retryFn);
        }
        else if (rateLimitInfo.isPrimaryRateLimit) {
            await this.handlePrimaryRateLimit(rateLimitInfo, retryFn);
        }
        else {
            throw error;
        }
    }
    isRateLimitError(error) {
        return (error &&
            typeof error === "object" &&
            "status" in error &&
            typeof error.status === "number" &&
            (error.status === 403 ||
                error.status === 429 ||
                (error.status === 422 &&
                    "message" in error &&
                    typeof error.message === "string" &&
                    error.message.includes("abuse"))));
    }
    extractRateLimitInfo(error) {
        if (!error || typeof error !== "object") {
            return { isPrimaryRateLimit: false, isSecondaryRateLimit: false };
        }
        const isSecondaryRateLimit = "status" in error &&
            error.status === 422 &&
            "message" in error &&
            typeof error.message === "string" &&
            error.message.includes("abuse");
        const isPrimaryRateLimit = "status" in error &&
            (error.status === 403 || error.status === 429) &&
            !isSecondaryRateLimit;
        // Extract rate limit headers if available
        let retryAfter;
        let rateLimitReset;
        let rateLimitRemaining;
        if ("response" in error &&
            error.response &&
            typeof error.response === "object" &&
            "headers" in error.response) {
            const headers = error.response.headers;
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
    async handlePrimaryRateLimit(rateLimitInfo, retryFn) {
        let waitTime;
        if (rateLimitInfo.retryAfter) {
            // Use retry-after header if present
            waitTime = rateLimitInfo.retryAfter * 1000;
            console.warn(`Primary rate limit hit, waiting ${rateLimitInfo.retryAfter} seconds as specified by retry-after header`);
        }
        else if (rateLimitInfo.rateLimitRemaining === 0 &&
            rateLimitInfo.rateLimitReset) {
            // Wait until rate limit reset time
            const resetTime = rateLimitInfo.rateLimitReset * 1000;
            const currentTime = Date.now();
            waitTime = Math.max(0, resetTime - currentTime + 1000); // Add 1 second buffer
            console.warn(`Primary rate limit hit, waiting until reset time: ${new Date(resetTime).toISOString()}`);
        }
        else {
            // Default to 1 minute if no specific guidance
            waitTime = 60000;
            console.warn(`Primary rate limit hit, waiting 1 minute (default)`);
        }
        await this.delay(waitTime);
        await retryFn();
    }
    async handleSecondaryRateLimit(retryFn) {
        if (this.secondaryRateLimitRetries >= this.maxRetries) {
            throw new Error(`Secondary rate limit exceeded after ${this.maxRetries} retries`);
        }
        this.secondaryRateLimitRetries++;
        // GitHub recommends at least 1 minute wait for secondary rate limits with exponential backoff
        const baseWaitTime = 60000; // 1 minute
        const waitTime = baseWaitTime * Math.pow(2, this.secondaryRateLimitRetries - 1);
        console.warn(`Secondary rate limit (abuse detection) hit, attempt ${this.secondaryRateLimitRetries}/${this.maxRetries}, waiting ${waitTime / 1000} seconds`);
        await this.delay(waitTime);
        await retryFn();
        // Reset retry count on success
        this.secondaryRateLimitRetries = 0;
    }
    delay(ms) {
        return new Promise((resolve) => {
            const end = Date.now() + ms;
            const check = () => {
                if (Date.now() >= end) {
                    resolve();
                }
                else {
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
class GitHubClient {
    constructor(config, modelConfig) {
        this.config = config;
        this.modelConfig = modelConfig;
        this.octokit = new rest_1.Octokit({ auth: config.token });
        this.rateLimitHandler = new GitHubRateLimitHandler();
    }
    /**
     * Gets PR information including the head commit SHA.
     */
    async getPRInfo(prNumber) {
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
     * Updates the PR description if it's currently blank or empty.
     */
    async updatePRDescription(prNumber, description) {
        try {
            // First, get the current PR to check if description is blank
            const prInfo = await this.octokit.pulls.get({
                owner: this.config.owner,
                repo: this.config.repo,
                pull_number: prNumber,
            });
            const currentDescription = prInfo.data.body;
            (0, debug_1.debugLog)(`🔍 PR #${prNumber} current description: "${currentDescription}"`);
            (0, debug_1.debugLog)(`🔍 Current description type: ${typeof currentDescription}`);
            (0, debug_1.debugLog)(`🔍 Current description === null: ${currentDescription === null}`);
            (0, debug_1.debugLog)(`🔍 Current description === "": ${currentDescription === ""}`);
            (0, debug_1.debugLog)(`🔍 Current description?.trim() === "": ${currentDescription?.trim() === ""}`);
            (0, debug_1.debugLog)(`🔍 Generated description length: ${description.length} characters`);
            // Only update if the description is blank, null, or just whitespace
            const isBlank = !currentDescription || currentDescription.trim() === "";
            (0, debug_1.debugLog)(`🔍 Should update (is blank): ${isBlank}`);
            if (isBlank) {
                const makeRequest = async () => {
                    (0, debug_1.debugLog)(`🔄 Making GitHub API request to update PR description...`);
                    await this.octokit.pulls.update({
                        owner: this.config.owner,
                        repo: this.config.repo,
                        pull_number: prNumber,
                        body: description,
                    });
                };
                try {
                    await makeRequest();
                    (0, debug_1.debugLog)(`✅ Updated PR #${prNumber} description successfully`);
                    return true;
                }
                catch (error) {
                    (0, debug_1.debugLog)(`⚠️ Initial request failed:`, error?.message || error);
                    (0, debug_1.debugLog)(`🔍 Error status:`, error?.status);
                    (0, debug_1.debugLog)(`🔍 Error response:`, error?.response?.data);
                    // Check for common permission issues
                    if (error?.status === 403) {
                        console.error(`❌ Permission denied updating PR description. Check that your GITHUB_TOKEN has 'pull_requests: write' permission.`);
                        return false;
                    }
                    try {
                        await this.rateLimitHandler.handleRateLimit(error, makeRequest);
                        (0, debug_1.debugLog)(`✅ Updated PR #${prNumber} description (after retry)`);
                        return true;
                    }
                    catch (retryError) {
                        (0, debug_1.debugLog)(`❌ Retry also failed:`, retryError);
                        throw retryError;
                    }
                }
            }
            else {
                (0, debug_1.debugLog)(`⏭️  PR #${prNumber} already has a description, skipping update`);
                (0, debug_1.debugLog)(`📝 Current description: "${currentDescription}"`);
                return false;
            }
        }
        catch (error) {
            console.error(`❌ Failed to update PR #${prNumber} description:`, error);
            (0, debug_1.debugLog)(`🔍 Full error object:`, JSON.stringify(error, null, 2));
            return false;
        }
    }
    /**
     * Fetches existing review comments on a PR.
     */
    async getExistingComments(prNumber) {
        const comments = await this.octokit.paginate(this.octokit.pulls.listReviewComments, {
            owner: this.config.owner,
            repo: this.config.repo,
            pull_number: prNumber,
        });
        return comments;
    }
    /**
     * Fetches existing reviews on a PR.
     */
    async getExistingReviews(prNumber) {
        const reviews = await this.octokit.paginate(this.octokit.pulls.listReviews, {
            owner: this.config.owner,
            repo: this.config.repo,
            pull_number: prNumber,
        });
        return reviews;
    }
    /**
     * Creates a review comment on a PR.
     * @deprecated Use createReview for batch commenting instead
     */
    async createReviewComment(prNumber, commitId, finding) {
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
        }
        catch (error) {
            await this.rateLimitHandler.handleRateLimit(error, makeRequest);
        }
    }
    /**
     * Creates a pull request review with multiple comments in a single API call.
     * This is much more efficient than creating individual comments and avoids rate limits.
     */
    async createReview(prNumber, commitId, findings, diffSummary) {
        const comments = findings.map((finding) => ({
            path: finding.path,
            line: finding.line ?? undefined,
            side: "RIGHT",
            body: formatGitHubComment(finding),
        }));
        // Categorize findings by severity
        const required = findings.filter((f) => f.severity === "required");
        const optional = findings.filter((f) => f.severity === "optional");
        const nit = findings.filter((f) => f.severity === "nit");
        const fyi = findings.filter((f) => f.severity === "fyi");
        const praise = findings.filter((f) => f.severity === "praise");
        const others = [...optional, ...nit, ...fyi];
        // Determine review event based on the decision
        let reviewEvent = "COMMENT";
        // Generate the human-friendly review body
        const summaryParts = [`❇️ **${constants_1.CODEPRESS_REVIEW_TAG} Summary**\n`];
        summaryParts.push("👋 Hey team,\n");
        if (diffSummary?.decision) {
            const { decision } = diffSummary;
            reviewEvent = decision.recommendation;
            if (required.length > 0) {
                summaryParts.push(`Overall the changes look solid, but I spotted **${required.length} must-fix** issue${required.length === 1 ? "" : "s"} and left ${others.length + praise.length} helpful note${others.length + praise.length === 1 ? "" : "s"} inline.\n`);
            }
            else if (others.length > 0 || praise.length > 0) {
                summaryParts.push(`Overall the changes look great! I left ${others.length + praise.length} helpful note${others.length + praise.length === 1 ? "" : "s"} inline.\n`);
            }
            else {
                summaryParts.push("Overall the changes look great! No specific issues found.\n");
            }
            summaryParts.push("Here's the quick rundown:\n");
            // Add decision information
            const decisionEmoji = decision.recommendation === "APPROVE"
                ? "✅"
                : decision.recommendation === "REQUEST_CHANGES"
                    ? "❌"
                    : "💬";
            const decisionText = decision.recommendation === "APPROVE"
                ? "APPROVE"
                : decision.recommendation === "REQUEST_CHANGES"
                    ? "REQUEST CHANGES"
                    : "COMMENT";
            summaryParts.push(`**${decisionEmoji} Decision: ${decisionText}**`);
            summaryParts.push(`${decision.reasoning}\n`);
        }
        else {
            // Fallback when no decision is available
            if (required.length > 0) {
                summaryParts.push(`I spotted **${required.length} must-fix** issue${required.length === 1 ? "" : "s"} and left ${others.length + praise.length} helpful note${others.length + praise.length === 1 ? "" : "s"} inline.\n`);
            }
            else if (others.length > 0 || praise.length > 0) {
                summaryParts.push(`I left ${others.length + praise.length} helpful note${others.length + praise.length === 1 ? "" : "s"} inline.\n`);
            }
            else {
                summaryParts.push("No specific issues found. Code looks good to merge! 🚀\n");
            }
        }
        // Get LLM summaries for each section
        let findingSummaries = {};
        // Only call LLM if there are findings to summarize
        if (praise.length > 0 || required.length > 0 || others.length > 0) {
            try {
                findingSummaries = await (0, ai_client_1.summarizeFindings)(required, optional, nit, fyi, praise, this.modelConfig);
            }
            catch (error) {
                (0, debug_1.debugWarn)("Failed to generate finding summaries, falling back to detailed list:", error);
            }
        }
        // Add praise section with summary or fallback to detailed list
        if (praise.length > 0) {
            summaryParts.push("### 👍 What's working well");
            if (findingSummaries.praiseSummary) {
                summaryParts.push(findingSummaries.praiseSummary);
            }
            else {
                praise.forEach((finding) => {
                    summaryParts.push(`• ${finding.message}`);
                });
            }
            summaryParts.push("");
        }
        // Add required issues section with summary or fallback to detailed list
        if (required.length > 0) {
            summaryParts.push("### 🚧 Needs a bit of love");
            if (findingSummaries.requiredSummary) {
                summaryParts.push(findingSummaries.requiredSummary);
            }
            else {
                required.forEach((finding) => {
                    summaryParts.push(`• **${finding.path}:${finding.line}** - ${finding.message}`);
                });
            }
            summaryParts.push("");
        }
        // Add other thoughts section with summary or fallback to detailed list
        if (others.length > 0) {
            summaryParts.push("### ℹ️ Other thoughts");
            if (findingSummaries.othersSummary) {
                summaryParts.push(findingSummaries.othersSummary);
            }
            else {
                others.forEach((finding) => {
                    const severityEmoji = finding.severity === "optional"
                        ? "🟡"
                        : finding.severity === "nit"
                            ? "🔵"
                            : "ℹ️";
                    summaryParts.push(`• ${severityEmoji} **${finding.path}:${finding.line}** - ${finding.message}`);
                });
            }
            summaryParts.push("");
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
            const eventText = reviewEvent === "APPROVE"
                ? "approved"
                : reviewEvent === "REQUEST_CHANGES"
                    ? "requested changes"
                    : "commented on";
            (0, debug_1.debugLog)(`✅ ${eventText.charAt(0).toUpperCase() + eventText.slice(1)} PR with ${findings.length} comments`);
        }
        catch (error) {
            await this.rateLimitHandler.handleRateLimit(error, makeRequest);
            const eventText = reviewEvent === "APPROVE"
                ? "approved"
                : reviewEvent === "REQUEST_CHANGES"
                    ? "requested changes"
                    : "commented on";
            (0, debug_1.debugLog)(`✅ ${eventText.charAt(0).toUpperCase() + eventText.slice(1)} PR with ${findings.length} comments (after retry)`);
        }
    }
    async findReviewThread(prNumber, commentId) {
        let hasNextPage = true;
        let endCursor = null;
        const findThreadQuery = `
      query FindReviewThread($owner: String!, $repo: String!, $prNumber: Int!, $after: String) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $prNumber) {
            reviewThreads(first: 100, after: $after) {
              nodes {
                id
                isResolved
                comments(first: 10) {
                  nodes {
                    databaseId
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    `;
        while (hasNextPage) {
            const result = await this.octokit.graphql(findThreadQuery, {
                owner: this.config.owner,
                repo: this.config.repo,
                prNumber: prNumber,
                after: endCursor,
            });
            const reviewThreads = result.repository.pullRequest.reviewThreads;
            const threads = reviewThreads.nodes;
            const targetThread = threads.find((thread) => thread.comments.nodes.some((c) => c.databaseId === commentId));
            if (targetThread) {
                return targetThread; // Found the thread
            }
            hasNextPage = reviewThreads.pageInfo.hasNextPage;
            endCursor = reviewThreads.pageInfo.endCursor;
            if (!hasNextPage) {
                break; // All threads have been checked
            }
        }
        return null; // Thread not found
    }
    async resolveReviewThreadById(threadId) {
        const resolveThreadMutation = `
      mutation ResolveReviewThread($threadId: ID!) {
        resolveReviewThread(input: {threadId: $threadId}) {
          thread {
            id
            isResolved
          }
        }
      }
    `;
        await this.octokit.graphql(resolveThreadMutation, {
            threadId,
        });
        (0, debug_1.debugLog)(`Successfully resolved review thread ${threadId}`);
    }
    /**
     * Resolves review comments by updating their content to indicate they've been resolved
     * and using GraphQL API to actually resolve the conversation thread.
     * This provides both visual indication and native GitHub "resolved" functionality.
     */
    async resolveReviewComment(prNumber, commentId, reason) {
        const makeRequest = async () => {
            // Step 1: Update the comment body to mark it as resolved
            const currentComment = await this.octokit.pulls.getReviewComment({
                owner: this.config.owner,
                repo: this.config.repo,
                comment_id: commentId,
            });
            const resolvedBody = `${currentComment.data.body}\n\n---\n✅ **Resolved by ${constants_1.CODEPRESS_REVIEW_TAG}**\n> ${reason}`;
            await this.octokit.pulls.updateReviewComment({
                owner: this.config.owner,
                repo: this.config.repo,
                comment_id: commentId,
                body: resolvedBody,
            });
            (0, debug_1.debugLog)(`Successfully updated review comment ${commentId}`);
            // Step 2: Find and resolve the actual review thread
            const targetThread = await this.findReviewThread(prNumber, commentId);
            if (targetThread && !targetThread.isResolved) {
                await this.resolveReviewThreadById(targetThread.id);
            }
        };
        try {
            await makeRequest();
        }
        catch (error) {
            await this.rateLimitHandler.handleRateLimit(error, makeRequest);
        }
    }
}
exports.GitHubClient = GitHubClient;
//# sourceMappingURL=github-client.js.map