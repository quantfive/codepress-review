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
const ai_1 = require("ai");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const ignore_1 = __importDefault(require("ignore"));
const path_1 = require("path");
const agent_1 = require("./agent");
const ai_client_1 = require("./ai-client");
const config_1 = require("./config");
const constants_1 = require("./constants");
const debug_1 = require("./debug");
const diff_parser_1 = require("./diff-parser");
const github_client_1 = require("./github-client");
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
     * Normalize a message for cross-chunk deduplication by removing paths,
     * numbers, and condensing whitespace. This is intentionally simple.
     */
    normalizeMessage(message) {
        const lower = message.toLowerCase();
        const noPaths = lower.replace(/[\w./\\-]+\.[a-z0-9]+/gi, "");
        const noLineNums = noPaths.replace(/\bline\s*\d+\b/gi, "");
        const noDigits = noLineNums.replace(/\d+/g, "");
        return noDigits.replace(/\s+/g, " ").trim();
    }
    /**
     * Heuristic: identify messages that assert unused/missing without evidence.
     * For Phase 1, drop such comments unless they include an "Evidence:" trail.
     */
    passesHeuristicEvidenceGate(f) {
        const msg = (f.message || "").toLowerCase();
        const requiresEvidence = msg.includes("unused") ||
            msg.includes("not used") ||
            msg.includes("not referenced") ||
            msg.includes("dead code") ||
            msg.includes("missing import") ||
            msg.includes("missing test");
        if (!requiresEvidence)
            return true;
        // Accept if the message contains an Evidence section
        const hasEvidence = /\bevidence\s*:/i.test(f.message || "");
        if (!hasEvidence) {
            (0, debug_1.debugLog)(`🧪 Evidence gate: dropping comment lacking evidence → ${f.path}:${String(f.line)}`);
        }
        return hasEvidence;
    }
    /**
     * Cross-chunk deduplication: cluster by normalized message. Keep the first
     * occurrence and annotate it with the number of similar spots.
     */
    crossChunkDedupe(findings) {
        const seen = new Map();
        const kept = [];
        for (const f of findings) {
            const key = `${f.severity || ""}::${this.normalizeMessage(f.message)}`;
            if (!seen.has(key)) {
                seen.set(key, { index: kept.length, count: 1 });
                kept.push(f);
            }
            else {
                const rec = seen.get(key);
                if (!rec) {
                    continue;
                }
                rec.count++;
                // optionally, prefer the earlier one; no replacement needed
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
     * Enforce simple service-level budgets per severity.
     */
    enforceBudgets(findings) {
        // No hard caps: rely on agent guidance; keep high-signal items.
        const result = [];
        for (const f of findings) {
            const sev = (f.severity || "").toLowerCase();
            if (sev === "fyi" || sev === "praise") {
                (0, debug_1.debugLog)("🔽 Dropping non-actionable note", f.path, f.line);
                continue;
            }
            // Keep required/optional/nit; evidence gating and dedupe are handled elsewhere
            result.push(f);
        }
        return result;
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
    async processChunk(chunk, chunkIndex, existingComments, existingCommentsData, overrideMaxTurns) {
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
            const agentResponse = await (0, ai_client_1.callWithRetry)(() => (0, agent_1.reviewChunkWithAgent)(chunk.content, modelConfig, this.diffSummary, chunkIndex, this.repoFilePaths, relevantComments, typeof overrideMaxTurns === "number"
                ? overrideMaxTurns
                : this.config.maxTurns, this.config.blockingOnly), chunkIndex + 1);
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
            const err = error;
            if (ai_1.APICallError.isInstance(error)) {
                console.error(`[Hunk ${chunkIndex + 1}] Skipping due to non-retryable API error: ${err?.message || "unknown"}`);
            }
            else {
                console.error(`[Hunk ${chunkIndex + 1}] Skipping due to repeated errors: ${err?.message || "unknown"}`);
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
                const err = error;
                (0, debug_1.debugWarn)("Failed to generate diff summary, proceeding without context:", err?.message || "unknown");
                (0, debug_1.debugError)("Full error details:", err);
                if (err?.stack) {
                    (0, debug_1.debugError)("Stack trace:", err.stack);
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
        // Reorder/skip hunks based on planner, then process in parallel
        const hunkPlanMap = new Map();
        if (this.diffSummary?.plan?.hunkPlans) {
            for (const hp of this.diffSummary.plan.hunkPlans) {
                hunkPlanMap.set(hp.index, {
                    priority: hp.priority,
                    skip: hp.skip,
                    maxTurns: hp.maxTurns,
                });
            }
        }
        // Sort by priority if provided, otherwise preserve original order
        const planned = [...filteredChunks].sort((a, b) => {
            const pa = hunkPlanMap.get(a.originalIndex)?.priority;
            const pb = hunkPlanMap.get(b.originalIndex)?.priority;
            if (typeof pa === "number" && typeof pb === "number")
                return pa - pb;
            if (typeof pa === "number")
                return -1;
            if (typeof pb === "number")
                return 1;
            return 0;
        });
        // Optionally cap number of hunks
        const maxHunks = this.diffSummary?.plan?.globalBudget?.maxHunks;
        const toProcess = typeof maxHunks === "number" ? planned.slice(0, maxHunks) : planned;
        // Hybrid scheduling: sequential top K, then limited concurrency
        const sequentialTop = this.diffSummary?.plan?.globalBudget?.sequentialTop;
        const maxConcurrent = this.diffSummary?.plan?.globalBudget?.maxConcurrentHunks;
        const effectiveSequentialTop = typeof sequentialTop === "number" ? Math.max(0, sequentialTop) : 3;
        const effectiveMaxConcurrent = typeof maxConcurrent === "number" ? Math.max(1, maxConcurrent) : 4;
        const resultsAccumulator = [];
        // 1) Run top K sequentially
        for (let i = 0; i < Math.min(effectiveSequentialTop, toProcess.length); i++) {
            const { chunk, originalIndex } = toProcess[i];
            const { fileName } = chunk;
            const plan = hunkPlanMap.get(originalIndex);
            if (plan?.skip) {
                (0, debug_1.debugLog)(`⏭️  Skipping hunk ${originalIndex} (${fileName}) per planner`);
                continue;
            }
            (0, debug_1.debugLog)("Processing (sequential) fileName: ", fileName);
            const defaultMaxTurns = this.diffSummary?.plan?.globalBudget?.defaultMaxTurns;
            const maxTurns = typeof plan?.maxTurns === "number"
                ? plan.maxTurns
                : typeof defaultMaxTurns === "number"
                    ? defaultMaxTurns
                    : this.config.maxTurns;
            const findings = await this.processChunk(chunk, originalIndex, existingComments, existingCommentsData, maxTurns);
            resultsAccumulator.push(findings);
        }
        // 2) Run the rest with limited concurrency
        const pool = [];
        let cursor = Math.min(effectiveSequentialTop, toProcess.length);
        const remainderResults = [];
        const runNext = async () => {
            if (cursor >= toProcess.length)
                return;
            const idx = cursor++;
            const { chunk, originalIndex } = toProcess[idx];
            const { fileName } = chunk;
            const plan = hunkPlanMap.get(originalIndex);
            if (plan?.skip) {
                (0, debug_1.debugLog)(`⏭️  Skipping hunk ${originalIndex} (${fileName}) per planner`);
                return;
            }
            (0, debug_1.debugLog)("Processing (pooled) fileName: ", fileName);
            const defaultMaxTurns = this.diffSummary?.plan?.globalBudget?.defaultMaxTurns;
            const maxTurns = typeof plan?.maxTurns === "number"
                ? plan.maxTurns
                : typeof defaultMaxTurns === "number"
                    ? defaultMaxTurns
                    : this.config.maxTurns;
            const findings = await this.processChunk(chunk, originalIndex, existingComments, existingCommentsData, maxTurns);
            remainderResults.push(findings);
            await runNext();
        };
        for (let i = 0; i < Math.min(effectiveMaxConcurrent, toProcess.length - cursor); i++) {
            pool.push(runNext());
        }
        await Promise.all(pool);
        const allResults = [...resultsAccumulator, ...remainderResults];
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
        // Phase 1: Heuristic evidence gate for unused/missing claims lacking evidence
        const gatedFindings = allFindings.filter((f) => this.passesHeuristicEvidenceGate(f));
        // Cross-chunk dedupe and cluster aggregation
        const dedupedFindings = this.crossChunkDedupe(gatedFindings);
        // Enforce budgets
        const budgetedFindings = this.enforceBudgets(dedupedFindings);
        // Create a review - either with findings or just the summary decision
        const shouldCreateReview = budgetedFindings.length > 0 || this.diffSummary?.decision;
        if (shouldCreateReview) {
            const findingsText = budgetedFindings.length > 0
                ? `${budgetedFindings.length} total findings`
                : "summary decision only";
            (0, debug_1.debugLog)(`\n🔍 Creating review with ${findingsText}...`);
            try {
                await this.githubClient.createReview(this.config.pr, commitId, budgetedFindings, this.diffSummary);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error("Failed to create review:", errorMessage);
                // Only fallback to individual comments if we have findings
                if (budgetedFindings.length > 0) {
                    (0, debug_1.debugLog)("Attempting to create individual comments as fallback...");
                    const commentPromises = budgetedFindings.map(async (finding) => {
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
// Service-level budgets (Phase 1): enforce concise reviews
ReviewService.REQUIRED_BUDGET = 12;
ReviewService.OPTIONAL_BUDGET = 3;
ReviewService.NIT_BUDGET = 2;
//# sourceMappingURL=review-service.js.map