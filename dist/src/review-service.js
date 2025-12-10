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
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const ignore_1 = __importDefault(require("ignore"));
const path_1 = require("path");
const agent_1 = require("./agent");
const config_1 = require("./config");
const debug_1 = require("./debug");
/**
 * Service class that orchestrates the review process.
 * The agent now has full autonomy to post comments and update PR description directly via gh CLI.
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
        catch (error) {
            console.error("Failed to list repository files with git:", error);
            return [];
        }
    }
    /**
     * Executes the complete review process using a single autonomous agent.
     */
    async execute() {
        // Get all files in the repo
        this.repoFilePaths = this.getRepoFilePaths();
        // Read the full diff
        const diffText = (0, fs_1.readFileSync)((0, path_1.resolve)(this.config.diff), "utf8");
        // Load ignore patterns
        const ignoreFile = ".codepressignore";
        const userIgnorePatterns = (0, fs_1.existsSync)(ignoreFile)
            ? (0, fs_1.readFileSync)(ignoreFile, "utf8")
                .split("\n")
                .filter((line) => line.trim() && !line.startsWith("#"))
            : [];
        const { DEFAULT_IGNORE_PATTERNS } = await Promise.resolve().then(() => __importStar(require("./constants")));
        const allIgnorePatterns = [
            ...DEFAULT_IGNORE_PATTERNS,
            ...userIgnorePatterns,
        ];
        const ig = (0, ignore_1.default)().add(allIgnorePatterns);
        // Filter the diff to remove ignored files
        const filteredDiff = this.filterDiffByIgnorePatterns(diffText, ig);
        if (!filteredDiff.trim()) {
            (0, debug_1.debugLog)("🎉 No reviewable changes after filtering ignored files!");
            return;
        }
        // Build PR context for the agent
        const prContext = {
            repo: this.config.githubRepository,
            prNumber: this.config.pr,
            commitSha: process.env.COMMIT_SHA || "",
        };
        if (!prContext.commitSha) {
            console.error("COMMIT_SHA not set - agent will not be able to post inline comments");
        }
        // Run the autonomous agent review
        (0, debug_1.debugLog)("🚀 Starting autonomous PR review...");
        const modelConfig = (0, config_1.getModelConfig)();
        try {
            await (0, agent_1.reviewFullDiff)(filteredDiff, modelConfig, this.repoFilePaths, prContext, this.config.maxTurns, this.config.blockingOnly);
            (0, debug_1.debugLog)("✅ Review completed!");
        }
        catch (error) {
            const err = error;
            console.error("Review failed:", err?.message || "unknown error");
        }
    }
    /**
     * Filters a diff to remove entire file blocks that match ignore patterns.
     * Each file block starts with "diff --git" and includes all headers (index, ---, +++, @@)
     * and content lines until the next "diff --git" line.
     */
    filterDiffByIgnorePatterns(diffText, ig) {
        const lines = diffText.split("\n");
        const filteredLines = [];
        let currentFile = null;
        // Start false to exclude any preamble content before first diff block
        let includeCurrentFile = false;
        for (const line of lines) {
            // Check for file header - this starts a new diff block
            const fileMatch = line.match(/^diff --git a\/(.+?) b\//);
            if (fileMatch) {
                currentFile = fileMatch[1];
                includeCurrentFile = !ig.ignores(currentFile);
                if (includeCurrentFile) {
                    filteredLines.push(line);
                }
                continue;
            }
            // Include line if current file block is not ignored
            // This includes all headers (index, ---, +++, @@) and content lines
            if (includeCurrentFile) {
                filteredLines.push(line);
            }
        }
        return filteredLines.join("\n");
    }
}
exports.ReviewService = ReviewService;
//# sourceMappingURL=review-service.js.map