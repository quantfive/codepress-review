#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const review_service_1 = require("./review-service");
const debug_1 = require("./debug");
/**
 * Minimal local runner for ReviewService.
 * - Calls the full ReviewService pipeline with the autonomous agent
 * - The agent fetches the diff via gh CLI commands
 *
 * Usage examples:
 *   MODEL_PROVIDER=openai MODEL_NAME=gpt-5.1 OPENAI_API_KEY=sk-... pnpm local:review --pr 123
 *   MODEL_PROVIDER=anthropic MODEL_NAME=claude-sonnet-4-5 ANTHROPIC_API_KEY=sk-... pnpm local:review --pr 42 --blocking-only --max-turns 6
 */
function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
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
async function main() {
    const args = parseArgs(process.argv.slice(2));
    // Required model info from env
    const provider = process.env.MODEL_PROVIDER;
    const modelName = process.env.MODEL_NAME;
    if (!provider || !modelName) {
        console.error("MODEL_PROVIDER and MODEL_NAME must be set in the environment (e.g., openai, gpt-4o-mini).");
        process.exit(1);
    }
    // PR number is required for the agent to fetch the diff
    const prNumber = parseInt(args.pr || "0", 10);
    if (!prNumber) {
        console.error("--pr <number> is required. The agent will fetch the diff via gh CLI.");
        process.exit(1);
    }
    const maxTurns = parseInt(args.maxTurns || "12", 10);
    const blockingOnly = Boolean(args.blockingOnly);
    const debug = Boolean(args.debug ?? true);
    (0, debug_1.setDebugMode)(debug);
    // Provide GitHub env for local run
    if (!process.env.GITHUB_TOKEN) {
        console.error("GITHUB_TOKEN must be set for gh CLI to work.");
        process.exit(1);
    }
    process.env.GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    process.env.GITHUB_REPOSITORY =
        process.env.GITHUB_REPOSITORY || "local/preview";
    process.env.MAX_TURNS = maxTurns.toString();
    process.env.COMMIT_SHA = process.env.COMMIT_SHA || "local-commit-sha";
    // Build config
    const reviewService = new review_service_1.ReviewService({
        pr: prNumber,
        provider,
        modelName,
        githubToken: process.env.GITHUB_TOKEN,
        githubRepository: process.env.GITHUB_REPOSITORY,
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