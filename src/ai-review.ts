#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { getSystemPrompt } from "./system-prompt";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

interface Finding {
  path: string;
  line: number | null;
  message: string;
  severity?: string;
  suggestion?: string;
  code?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let diff = "",
    pr = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--diff") diff = args[++i];
    if (args[i] === "--pr") pr = args[++i];
  }
  if (!diff || !pr) {
    console.error(
      "Usage: ts-node scripts/ai-review.ts --diff <diff-file> --pr <pr-number>",
    );
    process.exit(1);
  }
  return { diff, pr: Number(pr) };
}

/**
 * Splits a diff into individual hunks for focused review.
 * Each hunk becomes its own chunk with the necessary file headers.
 * This ensures each review is focused on a specific change rather than arbitrary size limits.
 */
function splitDiff(diff: string): string[] {
  // Split on hunk headers to create individual chunks per hunk
  const hunks = diff.split(/(^@@ .+ @@.*$)/m).filter(Boolean);
  const chunks: string[] = [];

  let currentChunk = "";
  let fileHeader = "";

  for (let i = 0; i < hunks.length; i++) {
    const part = hunks[i];

    // Check if this is a file header (--- or +++ lines)
    if (part.match(/^(---|\+\+\+) /m)) {
      fileHeader += part;
      continue;
    }

    // If this is a hunk header (@@), start a new chunk
    if (part.startsWith("@@")) {
      // Save previous chunk if it exists
      if (currentChunk.trim()) {
        chunks.push(currentChunk);
      }
      // Start new chunk with file header and hunk header
      currentChunk = fileHeader + part;
    } else {
      // Add hunk content to current chunk
      currentChunk += part;
    }
  }

  // Add the final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
}

function parseXMLResponse(xmlText: string): Finding[] {
  const findings: Finding[] = [];

  // Extract all <comment> blocks
  const commentRegex = /<comment>([\s\S]*?)<\/comment>/g;
  let match;

  while ((match = commentRegex.exec(xmlText)) !== null) {
    const commentContent = match[1];

    // Extract individual fields
    const severityMatch = commentContent.match(/<severity>(.*?)<\/severity>/s);
    const fileMatch = commentContent.match(/<file>(.*?)<\/file>/s);
    const lineMatch = commentContent.match(/<line>(.*?)<\/line>/s);
    const messageMatch = commentContent.match(
      /<message>([\s\S]*?)<\/message>/s,
    );
    const suggestionMatch = commentContent.match(
      /<suggestion>([\s\S]*?)<\/suggestion>/s,
    );
    const codeMatch = commentContent.match(/<code>([\s\S]*?)<\/code>/s);

    if (!fileMatch || !lineMatch || !messageMatch) {
      continue; // Skip incomplete comments
    }

    const filePath = fileMatch[1].trim();
    const lineContent = lineMatch[1].trim();
    const message = messageMatch[1].trim();
    const severity = severityMatch ? severityMatch[1].trim() : undefined;
    const suggestion = suggestionMatch ? suggestionMatch[1].trim() : undefined;
    const code = codeMatch ? codeMatch[1].trim() : undefined;

    // Extract line number from the line content (e.g., "+  description?: string;" -> need to parse this)
    // For now, we'll try to extract from context or use a heuristic
    // This is challenging because the XML format expects the full line, not just a number
    // We'll need to match against the diff to find the actual line number

    findings.push({
      path: filePath,
      line: null, // We'll need to resolve this from the diff context
      message: message,
      severity: severity,
      suggestion: suggestion,
      code: code,
    });
  }

  return findings;
}

function resolveLineNumbers(findings: Finding[], diffChunk: string): Finding[] {
  // Parse the diff to build a mapping of file paths to line numbers
  const lines = diffChunk.split("\n");
  const fileLineMap: Record<string, Record<string, number>> = {};

  let currentFile = "";
  let currentNewLine = 0;

  for (const line of lines) {
    // Check for file header
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      fileLineMap[currentFile] = {};
      continue;
    }

    // Check for hunk header
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      currentNewLine = parseInt(hunkMatch[1]);
      continue;
    }

    // Track line numbers for added/unchanged lines
    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (currentFile && !fileLineMap[currentFile][line]) {
        fileLineMap[currentFile][line] = currentNewLine;
      }
      currentNewLine++;
    } else if (line.startsWith(" ")) {
      currentNewLine++;
    }
  }

  // Update findings with resolved line numbers
  return findings.map((finding) => {
    const fileMap = fileLineMap[finding.path];
    if (fileMap) {
      // Try to find a matching line in the file map
      for (const [lineContent, lineNum] of Object.entries(fileMap)) {
        // This is a simple heuristic - in practice, you might need more sophisticated matching
        if (lineContent.includes(finding.message.substring(0, 20))) {
          finding.line = lineNum;
          break;
        }
      }
    }
    return finding;
  });
}

async function reviewChunk(diffChunk: string): Promise<Finding[]> {
  const provider = process.env.MODEL_PROVIDER;
  const modelName = process.env.MODEL_NAME;

  if (!provider || !modelName) {
    throw new Error("MODEL_PROVIDER and MODEL_NAME are required");
  }

  let model;
  switch (provider) {
    case "openai":
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) throw new Error("OPENAI_API_KEY is required");
      model = openai(modelName);
      break;
    case "anthropic":
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY is required");
      model = anthropic(modelName);
      break;
    case "gemini":
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) throw new Error("GEMINI_API_KEY is required");
      model = google(modelName);
      break;
    default:
      throw new Error(`Unsupported MODEL_PROVIDER: ${provider}`);
  }

  // Build the system prompt and user prompt (diff)
  const customPrompt = process.env.CUSTOM_PROMPT;
  const systemPrompt = getSystemPrompt({ customPrompt });

  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Please review this diff:\n\n${diffChunk}`,
      },
    ],
    maxTokens: 4096,
    temperature: 0.2,
  });

  const findings = parseXMLResponse(text);
  return resolveLineNumbers(findings, diffChunk);
}

async function callWithRetry(
  fn: () => Promise<Finding[]>,
  hunkIdx: number,
): Promise<Finding[]> {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      const wait = RETRY_BASE_MS * Math.pow(2, attempt);
      console.warn(
        `[Hunk ${hunkIdx}] Attempt ${attempt} failed: ${e}. Retrying in ${wait}ms...`,
      );
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  throw new Error(`[Hunk ${hunkIdx}] Failed after ${MAX_RETRIES} retries.`);
}

function formatGitHubComment(finding: Finding): string {
  let comment = finding.message;

  if (finding.severity) {
    const severityEmoji =
      {
        required: "🔴",
        optional: "🟡",
        nit: "🔵",
        fyi: "ℹ️",
      }[finding.severity] || "📝";
    comment = `${severityEmoji} **${finding.severity.toUpperCase()}**: ${comment}`;
  }

  if (finding.suggestion) {
    comment += `\n\n**Suggestion:**\n\`\`\`\n${finding.suggestion}\n\`\`\``;
  }

  if (finding.code) {
    comment += `\n\n**Example:**\n${finding.code}`;
  }

  return comment;
}

export async function main() {
  const { diff, pr } = parseArgs();
  const diffText = readFileSync(resolve(diff), "utf8");
  const chunks = splitDiff(diffText);
  console.log(
    `Total diff size: ${diffText.length} bytes, split into ${chunks.length} hunk(s).`,
  );
  console.log(
    `Provider: ${process.env.MODEL_PROVIDER}, Model: ${process.env.MODEL_NAME}`,
  );

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const repoFullName = process.env.GITHUB_REPOSITORY;
  if (!repoFullName) {
    throw new Error("GITHUB_REPOSITORY environment variable is required");
  }

  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid GITHUB_REPOSITORY format. Expected 'owner/repo'");
  }

  const prInfo = await octokit.pulls.get({ owner, repo, pull_number: pr });
  const commit_id = prInfo.data.head.sha;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[Hunk ${i + 1}] Size: ${Buffer.byteLength(chunk)} bytes`);
    let findings: Finding[] = [];
    try {
      findings = await callWithRetry(() => reviewChunk(chunk), i + 1);
    } catch (e) {
      console.error(`[Hunk ${i + 1}] Skipping due to repeated errors: ${e}`);
      continue;
    }
    if (!Array.isArray(findings)) {
      console.error(`[Hunk ${i + 1}] Provider did not return valid findings.`);
      continue;
    }
    findings.forEach(async (finding, idx) => {
      try {
        await octokit.pulls.createReviewComment({
          owner,
          repo,
          pull_number: pr,
          commit_id,
          path: finding.path,
          line: finding.line ?? undefined,
          side: "RIGHT",
          body: formatGitHubComment(finding),
        });
        console.log(
          `[Hunk ${i + 1}] Commented on ${finding.path}:${finding.line}`,
        );
      } catch (e) {
        console.error(
          `[Hunk ${i + 1}] Failed to comment on ${finding.path}:${
            finding.line
          }: ${e}`,
        );
      }
    });
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
}
