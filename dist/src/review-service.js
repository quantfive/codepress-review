"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const minimatch_1 = require("minimatch");
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
        catch (e) {
            console.error(`[Hunk ${chunkIndex + 1}] Skipping due to repeated errors: ${e}`);
            return;
        }
        if (!Array.isArray(findings)) {
            console.error(`[Hunk ${chunkIndex + 1}] Provider did not return valid findings.`);
            return;
        }
        // Post findings as comments
        const commentPromises = findings
            .filter((finding) => finding.line !== null && finding.line > 0)
            .map(async (finding) => {
            const commentIdentifier = `${finding.path}:${finding.line}`;
            if (existingComments.has(commentIdentifier)) {
                console.log(`[Hunk ${chunkIndex + 1}] Skipping duplicate comment on ${finding.path}:${finding.line}`);
                return;
            }
            try {
                await this.githubClient.createReviewComment(this.config.pr, commitId, finding);
                console.log(`[Hunk ${chunkIndex + 1}] Commented on ${finding.path}:${finding.line}`);
            }
            catch (e) {
                console.error(`[Hunk ${chunkIndex + 1}] Failed to comment on ${finding.path}:${finding.line}: ${e}`);
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
        console.log(`Total diff size: ${diffText.length} bytes, split into ${chunks.length} hunk(s).`);
        console.log(`Provider: ${this.config.provider}, Model: ${this.config.modelName}`);
        // Get PR information
        const { commitId } = await this.githubClient.getPRInfo(this.config.pr);
        // Fetch existing comments to avoid duplicates
        const existingCommentsData = await this.githubClient.getExistingComments(this.config.pr);
        const existingComments = new Set(existingCommentsData.map((comment) => `${comment.path}:${comment.line}`));
        // Process chunks in parallel with a concurrency limit
        const concurrencyLimit = 15;
        const promises = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const fileName = (0, diff_parser_1.getFileNameFromChunk)(chunk);
            if (fileName) {
                const shouldIgnore = minimatchers.some((matcher) => matcher.match(fileName));
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