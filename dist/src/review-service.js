"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const ignore_1 = __importDefault(require("ignore"));
const ai_1 = require("ai");
const config_1 = require("./config");
const diff_parser_1 = require("./diff-parser");
const ai_client_1 = require("./ai-client");
const agent_1 = require("./agent");
const github_client_1 = require("./github-client");
/**
 * Service class that orchestrates the entire review process.
 */
class ReviewService {
    constructor(config) {
        this.repoFilePaths = [];
        this.config = config;
        const githubConfig = (0, config_1.getGitHubConfig)();
        this.githubClient = new github_client_1.GitHubClient(githubConfig);
    }
    /**
     * Retrieves all file paths in the repository using git.
     */
    getRepoFilePaths() {
        try {
            // Using git to list all files, respecting .gitignore
            const files = (0, child_process_1.execSync)("git ls-files", { encoding: "utf-8" });
            return files.split("\n").filter((p) => p);
        }
        catch (error) {
            console.error("Failed to list repository files with git:", error);
            // Fallback or further error handling can be added here
            return [];
        }
    }
    /**
     * Processes a single diff chunk and returns findings instead of posting them immediately.
     */
    async processChunk(chunk, chunkIndex, existingComments) {
        console.log(`[Hunk ${chunkIndex + 1}] Size: ${Buffer.byteLength(chunk.content)} bytes`);
        // Skip chunk if it's already been commented on
        const fileComments = existingComments.get(chunk.fileName);
        if (fileComments) {
            const { newStart, newLines } = chunk.hunk;
            for (let i = 0; i < newLines; i++) {
                if (fileComments.has(newStart + i)) {
                    console.log(`[Hunk ${chunkIndex + 1}] Skipping chunk for ${chunk.fileName} as it has existing comments.`);
                    return [];
                }
            }
        }
        let findings = [];
        try {
            const modelConfig = (0, config_1.getModelConfig)();
            // Build summary context for this chunk
            let summaryContext = "No summary available.";
            if (this.diffSummary) {
                const { prType, summaryPoints, keyRisks, hunks } = this.diffSummary;
                const contextLines = [];
                contextLines.push(`PR TYPE: ${prType}`, "");
                if (summaryPoints.length > 0) {
                    contextLines.push("OVERVIEW:", ...summaryPoints.map((item) => `- ${item}`), "");
                }
                if (keyRisks.length > 0) {
                    contextLines.push("KEY RISKS TO WATCH FOR:", ...keyRisks.map((risk) => `- [${risk.tag}] ${risk.description}`), "");
                }
                // Find specific notes for this chunk
                const hunkSummary = hunks.find((hunk) => hunk.index === chunkIndex);
                if (hunkSummary) {
                    contextLines.push("SPECIFIC NOTES FOR THIS CHUNK:", `Overview: ${hunkSummary.overview}`);
                    if (hunkSummary.risks.length > 0) {
                        contextLines.push(`Risks: ${hunkSummary.risks.map((risk) => `[${risk.tag}] ${risk.description}`).join(", ")}`);
                    }
                    if (hunkSummary.tests.length > 0) {
                        contextLines.push(`Suggested Tests: ${hunkSummary.tests.join(", ")}`);
                    }
                    contextLines.push("");
                }
                else {
                    console.log(`[Hunk ${chunkIndex + 1}] No specific guidance from summary agent - chunk considered good or low-risk`);
                }
                summaryContext = contextLines.join("\n");
            }
            findings = await (0, ai_client_1.callWithRetry)(() => (0, agent_1.reviewChunkWithAgent)(chunk.content, modelConfig, summaryContext, this.repoFilePaths, this.config.customPrompt), chunkIndex + 1);
        }
        catch (error) {
            if (ai_1.APICallError.isInstance(error)) {
                console.error(`[Hunk ${chunkIndex + 1}] Skipping due to non-retryable API error: ${error.message}`);
            }
            else {
                console.error(`[Hunk ${chunkIndex + 1}] Skipping due to repeated errors: ${error.message}`);
            }
            return [];
        }
        if (!Array.isArray(findings)) {
            console.error(`[Hunk ${chunkIndex + 1}] Provider did not return valid findings.`);
            return [];
        }
        // De-duplicate findings that are identical to avoid spamming,
        // but allow for multiple different comments on the same line.
        const seenSignatures = new Set();
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
        console.log(`[Hunk ${chunkIndex + 1}] Found ${uniqueFindings.length} findings`);
        return uniqueFindings;
    }
    /**
     * Executes the complete review process.
     */
    async execute() {
        // Get all files in the repo first
        this.repoFilePaths = this.getRepoFilePaths();
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
        const ig = (0, ignore_1.default)().add(ignorePatterns);
        // Filter chunks by ignore patterns before summarization, preserving original indices
        const filteredChunks = chunks
            .map((chunk, index) => ({ chunk, originalIndex: index }))
            .filter(({ chunk }) => !ig.ignores(chunk.fileName));
        // First pass: Summarize the entire diff
        if (filteredChunks.length > 0) {
            console.log("Performing initial diff summarization...");
            try {
                const modelConfig = (0, config_1.getModelConfig)();
                this.diffSummary = await (0, ai_client_1.callWithRetry)(() => (0, ai_client_1.summarizeDiff)(filteredChunks.map(({ chunk }) => chunk), modelConfig, this.config.customSummarizePrompt), 0);
                console.log("Diff summary completed.");
                console.log("PR Type:", this.diffSummary.prType);
                console.log("Summary Points:", this.diffSummary.summaryPoints);
                console.log("Key Risks:", this.diffSummary.keyRisks.map((risk) => `[${risk.tag}] ${risk.description}`));
            }
            catch (error) {
                console.warn("Failed to generate diff summary, proceeding without context:", error.message);
                this.diffSummary = undefined;
            }
        }
        // Get PR information
        const { commitId } = await this.githubClient.getPRInfo(this.config.pr);
        // Fetch existing comments to avoid duplicates
        const existingCommentsData = await this.githubClient.getExistingComments(this.config.pr);
        const botComments = existingCommentsData.filter((comment) => comment.user?.login === "github-actions[bot]");
        const existingComments = new Map();
        for (const comment of botComments) {
            if (!comment.path || !comment.line)
                continue;
            if (!existingComments.has(comment.path)) {
                existingComments.set(comment.path, new Set());
            }
            existingComments.get(comment.path)?.add(comment.line);
        }
        // Process chunks in parallel with a concurrency limit and collect all findings
        const concurrencyLimit = 15;
        const promises = [];
        const allFindings = [];
        for (let i = 0; i < filteredChunks.length; i++) {
            const { chunk, originalIndex } = filteredChunks[i];
            const { fileName } = chunk;
            console.log("Processing fileName: ", fileName);
            promises.push(this.processChunk(chunk, originalIndex, existingComments));
            if (promises.length >= concurrencyLimit ||
                i === filteredChunks.length - 1) {
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
            console.log(`\n🔍 Creating review with ${allFindings.length} total findings...`);
            // Generate a summary of findings by severity
            const severityCounts = allFindings.reduce((acc, finding) => {
                const severity = finding.severity || "other";
                acc[severity] = (acc[severity] || 0) + 1;
                return acc;
            }, {});
            const summaryParts = Object.entries(severityCounts)
                .map(([severity, count]) => `${count} ${severity}`)
                .join(", ");
            const reviewSummary = `🔍 **Code Review Summary**\n\nFound ${allFindings.length} item${allFindings.length === 1 ? "" : "s"} that need${allFindings.length === 1 ? "s" : ""} attention: ${summaryParts}.\n\nPlease review the inline comments below for specific details.`;
            try {
                await this.githubClient.createReview(this.config.pr, commitId, allFindings, reviewSummary);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error("Failed to create review:", errorMessage);
                // Fallback: try to create individual comments
                console.log("Attempting to create individual comments as fallback...");
                const commentPromises = allFindings.map(async (finding) => {
                    try {
                        await this.githubClient.createReviewComment(this.config.pr, commitId, finding);
                        console.log(`✅ Commented on ${finding.path}:${finding.line}`);
                    }
                    catch (e) {
                        const eMessage = e instanceof Error ? e.message : String(e);
                        console.error(`❌ Failed to comment on ${finding.path}:${finding.line}: ${eMessage}`);
                    }
                });
                await Promise.all(commentPromises);
            }
        }
        else {
            console.log("🎉 No issues found during review!");
        }
    }
}
exports.ReviewService = ReviewService;
//# sourceMappingURL=review-service.js.map