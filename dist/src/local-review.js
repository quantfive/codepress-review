#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const review_service_1 = require("./review-service");
const debug_1 = require("./debug");
/**
 * Minimal local runner for ReviewService.
 * - Creates a tiny diff (unless --diff is provided)
 * - Calls the full ReviewService pipeline with the autonomous agent
 *
 * Usage examples:
 *   MODEL_PROVIDER=openai MODEL_NAME=gpt-5.1 OPENAI_API_KEY=sk-... pnpm local:review
 *   MODEL_PROVIDER=anthropic MODEL_NAME=claude-sonnet-4-5 ANTHROPIC_API_KEY=sk-... pnpm local:review --blocking-only --max-turns 6
 *   MODEL_PROVIDER=openai MODEL_NAME=gpt-5.1 OPENAI_API_KEY=sk-... pnpm local:review --diff /absolute/path/to/your.diff
 */
function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--diff")
            args.diff = argv[++i];
        if (a === "--pr")
            args.pr = argv[++i];
        if (a === "--max-turns")
            args.maxTurns = argv[++i];
        if (a === "--blocking-only")
            args.blockingOnly = true;
        if (a === "--debug")
            args.debug = true;
    }
    return args;
}
function makeMinimalDiff(targetFile) {
    // A tiny unified diff that touches an existing file in this repo
    return [
        `diff --git a/${targetFile} b/${targetFile}`,
        "index 0000000..0000001 100644",
        `--- a/${targetFile}`,
        `+++ b/${targetFile}`,
        "@@ -1,4 +1,5 @@",
        ' import { generateText, APICallError } from "ai";',
        "+// local test touch: no-op change",
        " import {",
        "   ModelConfig,",
        "   DiffSummary,",
    ].join("\n");
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    // Required model info from env
    const provider = process.env.MODEL_PROVIDER;
    const modelName = process.env.MODEL_NAME;
    if (!provider || !modelName) {
        console.error("MODEL_PROVIDER and MODEL_NAME must be set in the environment (e.g., openai, gpt-4o-mini).");
        process.exit(1);
    }
    const maxTurns = parseInt(args.maxTurns || "12", 10);
    const blockingOnly = Boolean(args.blockingOnly);
    const debug = Boolean(args.debug ?? true);
    (0, debug_1.setDebugMode)(debug);
    // Provide dummy GitHub env for local run
    process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || "local-token";
    process.env.GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    process.env.GITHUB_REPOSITORY =
        process.env.GITHUB_REPOSITORY || "local/preview";
    process.env.MAX_TURNS = maxTurns.toString();
    process.env.COMMIT_SHA = process.env.COMMIT_SHA || "local-commit-sha";
    // Prepare diff path
    let diffPath = args.diff;
    if (!diffPath) {
        const dir = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "codepress-local-"));
        diffPath = (0, path_1.join)(dir, "local.diff");
        const minimal = makeMinimalDiff("src/config.ts");
        (0, fs_1.writeFileSync)(diffPath, minimal, "utf8");
        console.log("Wrote minimal diff to", diffPath);
    }
    // Build config
    const reviewService = new review_service_1.ReviewService({
        diff: diffPath,
        pr: parseInt(args.pr || "1", 10),
        provider,
        modelName,
        githubToken: process.env.GITHUB_TOKEN || "local-token",
        githubRepository: process.env.GITHUB_REPOSITORY || "local/preview",
        maxTurns,
        debug,
        blockingOnly,
    });
    await reviewService.execute();
}
main().catch((err) => {
    console.error("Local review failed:", err);
    process.exit(1);
});
//# sourceMappingURL=local-review.js.map