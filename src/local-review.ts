#!/usr/bin/env ts-node
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ReviewService } from "./review-service";
import { setDebugMode } from "./debug";

/**
 * Minimal local runner for ReviewService.
 * - Creates a tiny diff (unless --diff is provided)
 * - Uses a stub GitHub client that prints outputs to the console
 * - Calls the full ReviewService pipeline (summary + per-hunk agent)
 *
 * Usage examples:
 *   MODEL_PROVIDER=openai MODEL_NAME=gpt-4o-mini OPENAI_API_KEY=sk-... pnpm local:review
 *   MODEL_PROVIDER=openai MODEL_NAME=gpt-4o-mini OPENAI_API_KEY=sk-... pnpm local:review --blocking-only --max-turns 6
 *   MODEL_PROVIDER=openai MODEL_NAME=gpt-4o-mini OPENAI_API_KEY=sk-... pnpm local:review --diff /absolute/path/to/your.diff
 */

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--diff") args.diff = argv[++i];
    if (a === "--pr") args.pr = argv[++i];
    if (a === "--max-turns") args.maxTurns = argv[++i];
    if (a === "--blocking-only") args.blockingOnly = true;
    if (a === "--debug") args.debug = true;
  }
  return args;
}

class LocalGithubClient {
  async getPRInfo() {
    return { commitId: "local-commit", prInfo: {} as any };
  }
  async getExistingReviews() {
    return [];
  }
  async getExistingComments() {
    return [];
  }
  async createReview(
    _pr: number,
    commitId: string,
    findings: any[],
    diffSummary: any,
  ) {
    console.log("\n===== LOCAL REVIEW (batch) =====");
    console.log("Decision:", diffSummary?.decision);
    console.log("Findings:", findings);
    console.log("Summary points:", diffSummary?.summaryPoints);
  }
  async createReviewComment(_pr: number, commitId: string, finding: any) {
    console.log("LOCAL COMMENT:", finding);
  }
  async updatePRDescription(_pr: number, description: string) {
    console.log("LOCAL PR DESCRIPTION UPDATE:\n" + description);
    return true;
  }
  async resolveReviewComment(_pr: number, commentId: number, reason: string) {
    console.log("LOCAL RESOLVE:", commentId, reason);
  }
}

function makeMinimalDiff(targetFile: string): string {
  // A tiny unified diff that touches an existing file in this repo
  // Using src/ai-client.ts so fetch_snippet/fetch_file can succeed locally
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
    console.error(
      "MODEL_PROVIDER and MODEL_NAME must be set in the environment (e.g., openai, gpt-4o-mini).",
    );
    process.exit(1);
  }

  const maxTurns = parseInt((args.maxTurns as string) || "12", 10);
  const blockingOnly = Boolean(args.blockingOnly);
  const debug = Boolean(args.debug ?? true);
  setDebugMode(debug);

  // Provide dummy GitHub env for local run to satisfy getGitHubConfig()
  process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || "local-token";
  process.env.GITHUB_REPOSITORY =
    process.env.GITHUB_REPOSITORY || "local/preview";

  // Prepare diff path
  let diffPath = args.diff as string | undefined;
  if (!diffPath) {
    const dir = mkdtempSync(join(tmpdir(), "codepress-local-"));
    diffPath = join(dir, "local.diff");
    const minimal = makeMinimalDiff("src/ai-client.ts");
    writeFileSync(diffPath, minimal, "utf8");
    console.log("Wrote minimal diff to", diffPath);
  }

  // Build config; GitHub fields are dummies for local run
  const reviewService = new ReviewService({
    diff: diffPath,
    pr: parseInt((args.pr as string) || "1", 10),
    provider,
    modelName,
    githubToken: process.env.GITHUB_TOKEN || "local-token",
    githubRepository: process.env.GITHUB_REPOSITORY || "local/preview",
    maxTurns,
    updatePrDescription: false,
    debug,
    blockingOnly,
  });

  // Swap the GitHub client with a local stub
  (reviewService as any).githubClient = new LocalGithubClient();

  await reviewService.execute();
}

main().catch((err) => {
  console.error("Local review failed:", err);
  process.exit(1);
});
