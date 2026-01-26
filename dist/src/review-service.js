"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const agent_1 = require("./agent");
const config_1 = require("./config");
const debug_1 = require("./debug");
/**
 * Service class that orchestrates the review process.
 * The agent has full autonomy to:
 * - Fetch the diff via gh CLI (agentic diff exploration)
 * - Explore the codebase with tools
 * - Search the web for documentation
 * - Post comments and update PR description directly via gh CLI
 */
class ReviewService {
    constructor(config) {
        this.repoFilePaths = [];
        this.config = config;
    }
    /**
     * Retrieves all file paths in the repository using git.
     */
    getRepoFilePaths() {
        try {
            const files = (0, child_process_1.execSync)("git ls-files", { encoding: "utf-8" });
            return files.split("\n").filter((p) => p);
        }
        catch {
            console.warn("⚠️  WARNING: Repository not checked out - agent will have limited context.\n" +
                "   The agent cannot read files or search code beyond the diff.\n" +
                "   To fix this, add 'actions/checkout@v4' before the CodePress Review step in your workflow.\n" +
                "   See: https://github.com/quantfive/codepress-review#quick-start\n");
            return [];
        }
    }
    /**
     * Executes the complete review process using a single autonomous agent.
     * The agent will fetch the diff itself via gh CLI commands.
     */
    async execute() {
        // Get all files in the repo (helps agent know what files exist)
        this.repoFilePaths = this.getRepoFilePaths();
        // Build trigger context from environment variables
        const triggerEvent = (process.env.TRIGGER_EVENT || "opened");
        const isReReview = process.env.IS_RE_REVIEW === "true";
        const previousReviewState = process.env.PREVIOUS_REVIEW_STATE || null;
        const previousReviewCommitSha = process.env.PREVIOUS_REVIEW_COMMIT_SHA || null;
        const forceFullReview = process.env.FORCE_FULL_REVIEW === "true";
        const triggerContext = {
            isReReview,
            triggerEvent,
            previousReviewState: previousReviewState || undefined,
            previousReviewCommitSha: previousReviewCommitSha || undefined,
            forceFullReview,
        };
        // Build PR context for the agent
        const prContext = {
            repo: this.config.githubRepository,
            prNumber: this.config.pr,
            commitSha: process.env.COMMIT_SHA || "",
            triggerContext,
        };
        if (!prContext.commitSha) {
            console.error("COMMIT_SHA not set - agent will not be able to post inline comments");
        }
        // Load existing review comments from other reviewers
        const commentsFile = (0, path_1.resolve)("pr-comments.json");
        let existingComments = [];
        if ((0, fs_1.existsSync)(commentsFile)) {
            try {
                existingComments = JSON.parse((0, fs_1.readFileSync)(commentsFile, "utf8"));
                if (existingComments.length > 0) {
                    (0, debug_1.debugLog)(`📝 Found ${existingComments.length} existing review comments from other reviewers`);
                }
            }
            catch {
                (0, debug_1.debugLog)("⚠️ Failed to parse existing comments file, continuing without them");
            }
        }
        // Load bot's previous comments for deduplication
        const botCommentsFile = (0, path_1.resolve)("bot-comments.json");
        let botPreviousComments = [];
        if ((0, fs_1.existsSync)(botCommentsFile)) {
            try {
                botPreviousComments = JSON.parse((0, fs_1.readFileSync)(botCommentsFile, "utf8"));
                if (botPreviousComments.length > 0) {
                    (0, debug_1.debugLog)(`🔄 Found ${botPreviousComments.length} of your own previous comments for deduplication`);
                }
            }
            catch {
                (0, debug_1.debugLog)("⚠️ Failed to parse bot comments file, continuing without them");
            }
        }
        // Load related repos from environment variable
        let relatedRepos = [];
        const relatedReposEnv = process.env.RELATED_REPOS;
        if (relatedReposEnv) {
            try {
                relatedRepos = JSON.parse(relatedReposEnv);
                if (relatedRepos.length > 0) {
                    (0, debug_1.debugLog)(`🔗 Related repos available: ${relatedRepos.map((r) => r.repo).join(", ")}`);
                }
            }
            catch {
                (0, debug_1.debugLog)("⚠️ Failed to parse RELATED_REPOS environment variable");
            }
        }
        // Load pre-fetched and filtered PR files
        const prFilesFile = (0, path_1.resolve)("pr-files.json");
        let prFilesData = {
            files: [],
            formatted: "",
            includePatches: false,
            originalCount: 0,
            filteredCount: 0,
        };
        if ((0, fs_1.existsSync)(prFilesFile)) {
            try {
                prFilesData = JSON.parse((0, fs_1.readFileSync)(prFilesFile, "utf8"));
                if (prFilesData.filteredCount > 0) {
                    const filtered = prFilesData.originalCount - prFilesData.filteredCount;
                    (0, debug_1.debugLog)(`📄 PR files: ${prFilesData.filteredCount} to review` +
                        (filtered > 0 ? ` (${filtered} filtered out)` : ""));
                    if (prFilesData.includePatches) {
                        (0, debug_1.debugLog)("📦 Patches included in initial context");
                    }
                }
            }
            catch {
                (0, debug_1.debugLog)("⚠️ Failed to parse PR files, agent will fetch them");
            }
        }
        // Run the autonomous agent review
        (0, debug_1.debugLog)("🚀 Starting agentic PR review...");
        (0, debug_1.debugLog)(`📂 Repository files available: ${this.repoFilePaths.length}`);
        const modelConfig = await (0, config_1.getModelConfig)();
        // Determine maxTurns - use null for unlimited if 0 or not set
        const maxTurns = this.config.maxTurns > 0 ? this.config.maxTurns : null;
        try {
            await (0, agent_1.reviewFullDiff)(modelConfig, this.repoFilePaths, prContext, maxTurns, this.config.blockingOnly, existingComments, botPreviousComments, relatedRepos, prFilesData.formatted);
            (0, debug_1.debugLog)("✅ Review completed!");
        }
        catch (error) {
            const err = error;
            console.error("Review failed:", err?.message || "unknown error");
        }
    }
}
exports.ReviewService = ReviewService;
//# sourceMappingURL=review-service.js.map