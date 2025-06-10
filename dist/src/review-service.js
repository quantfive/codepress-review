"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const minimatch_1 = require("minimatch");
const ai_1 = require("ai");
const config_1 = require("./config");
const diff_parser_1 = require("./diff-parser");
const ai_client_1 = require("./ai-client");
const github_client_1 = require("./github-client");
/**
 * Service class that orchestrates the entire review process.
 */
class ReviewService {
    constructor(config) {
        this.config = config;
        const githubConfig = (0, config_1.getGitHubConfig)();
        this.githubClient = new github_client_1.GitHubClient(githubConfig);
    }
    /**
     * Processes a single diff chunk and posts comments to GitHub.
     */
    async processChunk(chunk, chunkIndex, commitId, existingComments) {
        console.log(`[Hunk ${chunkIndex + 1}] Size: ${Buffer.byteLength(chunk)} bytes`);
        let findings = [];
        try {
            const modelConfig = (0, config_1.getModelConfig)();
            findings = await (0, ai_client_1.callWithRetry)(() => (0, ai_client_1.reviewChunk)(chunk, modelConfig, this.config.customPrompt), chunkIndex + 1);
        }
        catch (error) {
            if (ai_1.APICallError.isInstance(error)) {
                console.error(`[Hunk ${chunkIndex + 1}] Skipping due to non-retryable API error: ${error.message}`);
            }
            else {
                console.error(`[Hunk ${chunkIndex + 1}] Skipping due to repeated errors: ${error.message}`);
            }
            return;
        }
        if (!Array.isArray(findings)) {
            console.error(`[Hunk ${chunkIndex + 1}] Provider did not return valid findings.`);
            return;
        }
        // De-duplicate findings that are identical to avoid spamming,
        // but allow for multiple different comments on the same line.
        const seenSignatures = new Set();
        const uniqueFindings = findings.filter((finding) => {
            if (finding.line === null || finding.line <= 0) {
                return false; // Don't process findings without a line number
            }
            // Create a unique signature for the finding based on its content.
            const body = (0, github_client_1.formatGitHubComment)(finding);
            const signature = `${finding.path}:${finding.line}:${body}`;
            if (seenSignatures.has(signature)) {
                return false;
            }
            seenSignatures.add(signature);
            return true;
        });
        // Post findings as comments
        const commentPromises = uniqueFindings.map(async (finding) => {
            const body = (0, github_client_1.formatGitHubComment)(finding);
            const commentIdentifier = `${finding.path}:${body}`;
            if (existingComments.has(commentIdentifier)) {
                console.log(`[Hunk ${chunkIndex + 1}] Skipping duplicate comment on ${finding.path}:${finding.line}`);
                return;
            }
            try {
                await this.githubClient.createReviewComment(this.config.pr, commitId, finding);
                console.log(`[Hunk ${chunkIndex + 1}] Commented on ${finding.path}:$${finding.line}`);
            }
            catch (e) {
                console.error(`[Hunk ${chunkIndex + 1}] Failed to comment on ${finding.path}:$${finding.line}: ${e}`);
            }
        });
        await Promise.all(commentPromises);
    }
    /**
     * Executes the complete review process.
     */
    async execute() {
        // Read and split the diff
        const diffText = (0, fs_1.readFileSync)((0, path_1.resolve)(this.config.diff), "utf8");
        const chunks = (0, diff_parser_1.splitDiff)(diffText);
        // Load ignore patterns
        const ignoreFile = ".codepressignore";
        const ignorePatterns = (0, fs_1.existsSync)(ignoreFile)
            ? (0, fs_1.readFileSync)(ignoreFile, "utf8")
                .split("\n")
                .filter((line) => line.trim() && !line.startsWith("#"))
            : [];
        const minimatchers = ignorePatterns.map((pattern) => new minimatch_1.Minimatch(pattern));
        // Get PR information
        const { commitId } = await this.githubClient.getPRInfo(this.config.pr);
        // Fetch existing comments to avoid duplicates
        const existingCommentsData = await this.githubClient.getExistingComments(this.config.pr);
        const botComments = existingCommentsData.filter((comment) => comment.user?.login === "github-actions[bot]");
        const existingComments = new Set(botComments.map((comment) => `${comment.path}:${comment.body}`));
        // Process chunks in parallel with a concurrency limit
        const concurrencyLimit = 15;
        const promises = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const fileName = (0, diff_parser_1.getFileNameFromChunk)(chunk);
            if (fileName) {
                const shouldIgnore = minimatchers.some((matcher) => matcher.match(fileName));
                console.log("fileName: ", fileName);
                console.log("minimatchers: ", minimatchers);
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
exports.ReviewService = ReviewService;
//# sourceMappingURL=review-service.js.map