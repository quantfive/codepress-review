"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const constants_1 = require("./constants");
const debug_1 = require("./debug");
/**
 * Service class that orchestrates the entire review process.
 */
class ReviewService {
    constructor(config) {
        this.repoFilePaths = [];
        this.config = config;
        const githubConfig = (0, config_1.getGitHubConfig)();
        const modelConfig = (0, config_1.getModelConfig)();
        this.githubClient = new github_client_1.GitHubClient(githubConfig, modelConfig);
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
    async processChunk(chunk, chunkIndex, existingComments, existingCommentsData) {
        (0, debug_1.debugLog)(`[Hunk ${chunkIndex + 1}] Size: ${Buffer.byteLength(chunk.content)} bytes`);
        // Skip chunk if it's already been commented on
        const fileComments = existingComments.get(chunk.fileName);
        if (fileComments) {
            const { newStart, newLines } = chunk.hunk;
            for (let i = 0; i < newLines; i++) {
                if (fileComments.has(newStart + i)) {
                    (0, debug_1.debugLog)(`[Hunk ${chunkIndex + 1}] Skipping chunk for ${chunk.fileName} as it has existing comments.`);
                    return [];
                }
            }
        }
        // Collect existing comments relevant to this chunk
        const { newStart, newLines } = chunk.hunk;
        const start = newStart;
        const end = newStart + newLines - 1;
        const relevantComments = existingCommentsData.filter((comment) => {
            return (comment.path === chunk.fileName &&
                comment.line &&
                comment.line >= start &&
                comment.line <= end);
        });
        if (relevantComments.length > 0) {
            (0, debug_1.debugLog)(`[Hunk ${chunkIndex + 1}] Found ${relevantComments.length} existing comments for this chunk - passing to agent for context`);
        }
        let findings = [];
        try {
            const modelConfig = (0, config_1.getModelConfig)();
            const agentResponse = await (0, ai_client_1.callWithRetry)(() => (0, agent_1.reviewChunkWithAgent)(chunk.content, modelConfig, this.diffSummary, chunkIndex, this.repoFilePaths, relevantComments, this.config.maxTurns, this.config.blockingOnly), chunkIndex + 1);
            findings = agentResponse.findings;
            // Add detailed logging for raw findings from the agent
            (0, debug_1.debugLog)(`[Hunk ${chunkIndex + 1}] Raw agentResponse:`, JSON.stringify(agentResponse, null, 2));
            // Handle resolved comments from agentResponse.resolvedComments
            if (agentResponse.resolvedComments.length > 0) {
                (0, debug_1.debugLog)(`[Hunk ${chunkIndex + 1}] Found ${agentResponse.resolvedComments.length} comments to resolve:`, agentResponse.resolvedComments.map((rc) => `${rc.path}:${rc.line} - ${rc.reason}`));
                // Resolve each comment by updating its content
                for (const resolvedComment of agentResponse.resolvedComments) {
                    try {
                        await this.githubClient.resolveReviewComment(this.config.pr, parseInt(resolvedComment.commentId, 10), resolvedComment.reason);
                    }
                    catch (error) {
                        console.error(`Failed to resolve comment ${resolvedComment.commentId}:`, error);
                    }
                }
            }
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
            // First, check if a comment already exists on this line from a previous run.
            if (existingComments.get(finding.path)?.has(finding.line)) {
                (0, debug_1.debugLog)(`[Hunk ${chunkIndex + 1}] Skipping finding on ${finding.path}:${finding.line} as a comment already exists on this line.`);
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
        (0, debug_1.debugLog)(`[Hunk ${chunkIndex + 1}] Found ${uniqueFindings.length} findings`);
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
        // Load ignore patterns - start with defaults, then add user patterns
        const ignoreFile = ".codepressignore";
        const userIgnorePatterns = (0, fs_1.existsSync)(ignoreFile)
            ? (0, fs_1.readFileSync)(ignoreFile, "utf8")
                .split("\n")
                .filter((line) => line.trim() && !line.startsWith("#"))
            : [];
        // Import default patterns
        const { DEFAULT_IGNORE_PATTERNS } = await Promise.resolve().then(() => __importStar(require("./constants")));
        // Combine default patterns with user patterns (user patterns take precedence)
        const allIgnorePatterns = [
            ...DEFAULT_IGNORE_PATTERNS,
            ...userIgnorePatterns,
        ];
        const ig = (0, ignore_1.default)().add(allIgnorePatterns);
        // Filter chunks by ignore patterns before summarization, preserving original indices
        const filteredChunks = chunks
            .map((chunk, index) => ({ chunk, originalIndex: index }))
            .filter(({ chunk }) => !ig.ignores(chunk.fileName));
        // Get PR information
        const { commitId } = await this.githubClient.getPRInfo(this.config.pr);
        // Fetch existing reviews and comments BEFORE summarization to provide context
        const existingReviews = await this.githubClient.getExistingReviews(this.config.pr);
        const existingCommentsData = await this.githubClient.getExistingComments(this.config.pr);
        // First pass: Summarize the entire diff with context from previous reviews/comments
        if (filteredChunks.length > 0) {
            (0, debug_1.debugLog)("Performing initial diff summarization with existing context...");
            try {
                const modelConfig = (0, config_1.getModelConfig)();
                this.diffSummary = await (0, ai_client_1.callWithRetry)(() => (0, ai_client_1.summarizeDiff)(filteredChunks.map(({ chunk }) => chunk), modelConfig, existingReviews, existingCommentsData, this.config.blockingOnly), 0);
                (0, debug_1.debugLog)("Diff summary completed.");
                (0, debug_1.debugLog)("PR Type:", this.diffSummary.prType);
                (0, debug_1.debugLog)("Summary Points:", this.diffSummary.summaryPoints);
                (0, debug_1.debugLog)("Key Risks:", this.diffSummary.keyRisks.map((risk) => `[${risk.tag}] ${risk.description}`));
                // Update PR description if enabled and a description was generated
                (0, debug_1.debugLog)("🔍 PR Description Update Check:", {
                    updatePrDescriptionEnabled: this.config.updatePrDescription,
                    prDescriptionGenerated: !!this.diffSummary.prDescription,
                    prDescriptionLength: this.diffSummary.prDescription?.trim().length || 0,
                });
                if (this.config.updatePrDescription &&
                    this.diffSummary.prDescription &&
                    this.diffSummary.prDescription.trim()) {
                    (0, debug_1.debugLog)("📝 Attempting to update PR description...");
                    (0, debug_1.debugLog)("Generated PR description:", this.diffSummary.prDescription.substring(0, 200) + "...");
                    const updated = await this.githubClient.updatePRDescription(this.config.pr, this.diffSummary.prDescription.trim());
                    if (updated) {
                        (0, debug_1.debugLog)("✅ PR description was updated successfully");
                    }
                    else {
                        (0, debug_1.debugLog)("⏭️ PR description was not updated (already exists or error)");
                    }
                }
                else {
                    if (!this.config.updatePrDescription) {
                        (0, debug_1.debugLog)("⏭️ PR description update is disabled in config");
                    }
                    else if (!this.diffSummary.prDescription ||
                        !this.diffSummary.prDescription.trim()) {
                        (0, debug_1.debugLog)("⚠️ No PR description was generated by the AI model");
                    }
                }
            }
            catch (error) {
                (0, debug_1.debugWarn)("Failed to generate diff summary, proceeding without context:", error.message);
                (0, debug_1.debugError)("Full error details:", error);
                if (error.stack) {
                    (0, debug_1.debugError)("Stack trace:", error.stack);
                }
                this.diffSummary = undefined;
            }
        }
        // Fetch existing comments to avoid duplicates
        const botComments = existingCommentsData.filter((comment) => (0, constants_1.isCodePressCommentObject)(comment));
        const existingComments = new Map();
        for (const comment of botComments) {
            if (!comment.path || !comment.line)
                continue;
            if (!existingComments.has(comment.path)) {
                existingComments.set(comment.path, new Set());
            }
            existingComments.get(comment.path)?.add(comment.line);
        }
        // Process all chunks in parallel and collect all findings
        const promises = [];
        for (let i = 0; i < filteredChunks.length; i++) {
            const { chunk, originalIndex } = filteredChunks[i];
            const { fileName } = chunk;
            (0, debug_1.debugLog)("Processing fileName: ", fileName);
            promises.push(this.processChunk(chunk, originalIndex, existingComments, existingCommentsData));
        }
        // Wait for all chunks to be processed
        const allResults = await Promise.all(promises);
        let allFindings = [];
        for (const findings of allResults) {
            allFindings.push(...findings);
        }
        // Filter findings based on blocking_only setting
        if (this.config.blockingOnly) {
            const originalCount = allFindings.length;
            allFindings = allFindings.filter((finding) => finding.severity === "required");
            const filteredCount = originalCount - allFindings.length;
            if (filteredCount > 0) {
                (0, debug_1.debugLog)(`🔽 Blocking-only mode: Filtered out ${filteredCount} non-blocking comments (${allFindings.length} remaining)`);
            }
        }
        // Create a review - either with findings or just the summary decision
        const shouldCreateReview = allFindings.length > 0 || this.diffSummary?.decision;
        if (shouldCreateReview) {
            const findingsText = allFindings.length > 0
                ? `${allFindings.length} total findings`
                : "summary decision only";
            (0, debug_1.debugLog)(`\n🔍 Creating review with ${findingsText}...`);
            try {
                await this.githubClient.createReview(this.config.pr, commitId, allFindings, this.diffSummary);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error("Failed to create review:", errorMessage);
                // Only fallback to individual comments if we have findings
                if (allFindings.length > 0) {
                    (0, debug_1.debugLog)("Attempting to create individual comments as fallback...");
                    const commentPromises = allFindings.map(async (finding) => {
                        try {
                            await this.githubClient.createReviewComment(this.config.pr, commitId, finding);
                            (0, debug_1.debugLog)(`✅ Commented on ${finding.path}:${finding.line}`);
                        }
                        catch (e) {
                            const eMessage = e instanceof Error ? e.message : String(e);
                            console.error(`❌ Failed to comment on ${finding.path}:${finding.line}: ${eMessage}`);
                        }
                    });
                    await Promise.all(commentPromises);
                }
            }
        }
        else {
            (0, debug_1.debugLog)("🎉 No issues found during review and no decision available!");
        }
    }
}
exports.ReviewService = ReviewService;
//# sourceMappingURL=review-service.js.map