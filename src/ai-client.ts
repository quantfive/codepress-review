import { generateText, APICallError } from "ai";
import {
  ModelConfig,
  DiffSummary,
  RiskItem,
  IssueItem,
  HunkSummary,
  PRType,
  RiskTag,
  ReviewDecision,
  Finding,
} from "./types";
import { getSummarySystemPrompt } from "./summary-agent-system-prompt";
import { setTimeout } from "node:timers/promises";
import { ProcessableChunk } from "./diff-parser";
import { createModel } from "./model-factory";
import { isCodePressReviewObject, isCodePressCommentObject } from "./constants";
import { debugLog, debugWarn } from "./debug";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

/**
 * Normalizes indentation by removing common leading whitespace from all lines.
 * This prevents XML indentation from being interpreted as code blocks in markdown.
 */
export function normalizeIndentation(text: string): string {
  const lines = text.split("\n");

  // Find non-empty lines to calculate minimum indentation
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return text.trim();
  }

  // Find the minimum indentation among non-empty lines
  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^[ \t]*/);
      return match ? match[0].length : 0;
    }),
  );

  // Remove the minimum indentation from all lines
  const normalizedLines = lines.map((line) => {
    if (line.trim().length === 0) {
      return ""; // Keep empty lines empty
    }
    return line.slice(minIndent);
  });

  return normalizedLines.join("\n").trim();
}

/**
 * Executes a function with retry logic.
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  hunkIdx: number,
): Promise<T> {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      return await fn();
    } catch (error: any) {
      if (APICallError.isInstance(error) && !error.isRetryable) {
        throw error; // Re-throw to be caught by the service and not retried
      }

      attempt++;
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `[Hunk ${hunkIdx}] Failed after ${MAX_RETRIES} retries: ${error}`,
        );
      }
      const wait = RETRY_BASE_MS * Math.pow(2, attempt);
      debugWarn(
        `[Hunk ${hunkIdx}] Attempt ${attempt} failed: ${error}. Retrying in ${wait}ms...`,
      );
      await setTimeout(wait);
    }
  }
  // This part should not be reachable, but it makes TypeScript happy.
  throw new Error(`[Hunk ${hunkIdx}] Exited retry loop unexpectedly.`);
}

/**
 * Summarizes the entire diff and provides notes for each chunk.
 */
export async function summarizeDiff(
  chunks: ProcessableChunk[],
  modelConfig: ModelConfig,
  existingReviews: any[] = [],
  existingComments: any[] = [],
): Promise<DiffSummary> {
  const model = await createModel(modelConfig);

  // Create a condensed view of all chunks for the summary
  const diffOverview = chunks
    .map((chunk, index) => {
      return `<chunk index="${index}" file="${chunk.fileName}">\n${chunk.content}\n</chunk>`;
    })
    .join("\n\n");

  // Build context from existing reviews and comments
  let contextSection = "";

  if (existingReviews.length > 0) {
    const botReviews = existingReviews.filter(
      (review) => isCodePressReviewObject(review) && review.body,
    );

    if (botReviews.length > 0) {
      contextSection += "<previousReviews>\n";
      botReviews.forEach((review, index) => {
        contextSection += `  <review index="${index + 1}" submittedAt="${review.submitted_at}">\n${review.body}\n  </review>\n`;
      });
      contextSection += "</previousReviews>\n\n";
    }
  }

  if (existingComments.length > 0) {
    const botComments = existingComments.filter((comment) =>
      isCodePressCommentObject(comment),
    );

    if (botComments.length > 0) {
      contextSection += "<previousComments>\n";
      botComments.forEach((comment) => {
        if (comment.path && comment.line) {
          contextSection += `  <comment path="${comment.path}" line="${comment.line}">${comment.body}</comment>\n`;
        }
      });
      contextSection += "</previousComments>\n\n";
    }
  }

  const systemPrompt = getSummarySystemPrompt();

  const userContent = `
<summaryRequest>
${contextSection.trim() ? contextSection : ""}  <diffChunks>
${diffOverview}
  </diffChunks>
</summaryRequest>`.trim();

  debugLog("🔍 User content:", userContent);
  debugLog("🔍 System prompt:", systemPrompt);

  let text: string;
  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    text = result.text;
    debugLog("✅ AI call succeeded for diff summary", result);
  } catch (error) {
    debugLog("❌ AI call failed for diff summary:", error);
    throw error;
  }

  debugLog("Diff Summary Raw Response:", text);

  // Parse the XML response
  return parseSummaryResponse(text);
}

/**
 * Parses the XML summary response into a structured format.
 */
function parseSummaryResponse(text: string): DiffSummary {
  try {
    // First try to extract the global section, fallback to parsing without wrapper for backwards compatibility
    const globalMatch = text.match(/<global>(.*?)<\/global>/s);
    const globalContent = globalMatch ? globalMatch[1] : text;

    // Extract PR type
    const prTypeMatch = globalContent.match(/<prType>(.*?)<\/prType>/s);
    const prType = prTypeMatch ? prTypeMatch[1].trim() : "unknown";

    // Extract overview items
    const overviewMatch = globalContent.match(/<overview>(.*?)<\/overview>/s);
    const summaryPoints: string[] = [];
    if (overviewMatch) {
      const itemMatches = overviewMatch[1].match(/<item>(.*?)<\/item>/gs);
      if (itemMatches) {
        summaryPoints.push(
          ...itemMatches.map((match) => match.replace(/<\/?item>/g, "").trim()),
        );
      }
    }

    // Extract key risks
    const keyRisksMatch = globalContent.match(/<keyRisks>(.*?)<\/keyRisks>/s);
    const keyRisks: RiskItem[] = [];
    if (keyRisksMatch) {
      const riskMatches = keyRisksMatch[1].match(/<item[^>]*>(.*?)<\/item>/gs);
      if (riskMatches) {
        riskMatches.forEach((match) => {
          const tagMatch = match.match(/tag="([^"]+)"/);
          const contentMatch = match.match(/<item[^>]*>(.*?)<\/item>/s);
          if (tagMatch && contentMatch) {
            keyRisks.push({
              tag: tagMatch[1] as RiskTag,
              description: contentMatch[1].trim(),
            });
          }
        });
      }
    }

    // Extract decision
    const decisionMatch = globalContent.match(/<decision>(.*?)<\/decision>/s);
    let decision = {
      recommendation: "COMMENT" as ReviewDecision,
      reasoning: "No specific reasoning provided",
    };

    if (decisionMatch) {
      const recommendationMatch = decisionMatch[1].match(
        /<recommendation>(.*?)<\/recommendation>/s,
      );
      const reasoningMatch = decisionMatch[1].match(
        /<reasoning>(.*?)<\/reasoning>/s,
      );

      if (recommendationMatch) {
        const rec = recommendationMatch[1].trim();
        if (
          rec === "APPROVE" ||
          rec === "REQUEST_CHANGES" ||
          rec === "COMMENT"
        ) {
          decision.recommendation = rec as ReviewDecision;
        }
      }

      if (reasoningMatch) {
        decision.reasoning = reasoningMatch[1].trim();
      }
    }

    // Extract PR description
    const prDescriptionMatch = globalContent.match(
      /<prDescription>(.*?)<\/prDescription>/s,
    );
    const prDescription = prDescriptionMatch
      ? normalizeIndentation(prDescriptionMatch[1])
      : undefined;

    debugLog(`🔍 PR Description parsing:`, {
      foundMatch: !!prDescriptionMatch,
      rawMatch: prDescriptionMatch?.[1]?.substring(0, 100) + "...",
      normalizedLength: prDescription?.length || 0,
      normalized: prDescription?.substring(0, 100) + "...",
    });

    // Log full response if no prDescription was found for debugging
    if (!prDescriptionMatch) {
      debugLog("🔍 Full AI Response (no prDescription found):", text);
    }

    // Extract hunks
    const hunksMatch = text.match(/<hunks>(.*?)<\/hunks>/s);
    const hunks: HunkSummary[] = [];
    if (hunksMatch) {
      const hunkMatches = hunksMatch[1].match(/<hunk[^>]*>.*?<\/hunk>/gs);
      if (hunkMatches) {
        hunkMatches.forEach((hunkMatch) => {
          const indexMatch = hunkMatch.match(/index="(\d+)"/);
          const fileMatch = hunkMatch.match(/<file>(.*?)<\/file>/s);
          const overviewMatch = hunkMatch.match(/<overview>(.*?)<\/overview>/s);

          if (indexMatch && fileMatch && overviewMatch) {
            const index = parseInt(indexMatch[1]);

            // Extract risks for this hunk (backward compatibility)
            const risks: RiskItem[] = [];
            const risksMatch = hunkMatch.match(/<risks>(.*?)<\/risks>/s);
            if (risksMatch) {
              const riskItemMatches = risksMatch[1].match(
                /<item[^>]*>(.*?)<\/item>/gs,
              );
              if (riskItemMatches) {
                riskItemMatches.forEach((riskItem) => {
                  const tagMatch = riskItem.match(/tag="([^"]+)"/);
                  const contentMatch = riskItem.match(
                    /<item[^>]*>(.*?)<\/item>/s,
                  );
                  if (tagMatch && contentMatch) {
                    risks.push({
                      tag: tagMatch[1] as RiskTag,
                      description: contentMatch[1].trim(),
                    });
                  }
                });
              }
            }

            // Extract issues for this hunk (new format)
            const issues: IssueItem[] = [];
            const issuesMatch = hunkMatch.match(/<issues>(.*?)<\/issues>/s);
            if (issuesMatch) {
              const issueItemMatches = issuesMatch[1].match(
                /<issue[^>]*>(.*?)<\/issue>/gs,
              );
              if (issueItemMatches) {
                issueItemMatches.forEach((issueItem) => {
                  const severityMatch = issueItem.match(/severity="([^"]+)"/);
                  const kindMatch = issueItem.match(/kind="([^"]+)"/);
                  const contentMatch = issueItem.match(
                    /<issue[^>]*>(.*?)<\/issue>/s,
                  );
                  if (severityMatch && kindMatch && contentMatch) {
                    issues.push({
                      severity: severityMatch[1],
                      kind: kindMatch[1],
                      description: contentMatch[1].trim(),
                    });
                  }
                });
              }
            }

            // Extract tests for this hunk
            const tests: string[] = [];
            const testsMatch = hunkMatch.match(/<tests>(.*?)<\/tests>/s);
            if (testsMatch) {
              const testItemMatches =
                testsMatch[1].match(/<item>(.*?)<\/item>/gs);
              if (testItemMatches) {
                tests.push(
                  ...testItemMatches.map((match) =>
                    match.replace(/<\/?item>/g, "").trim(),
                  ),
                );
              }
            }

            hunks.push({
              index,
              file: fileMatch[1].trim(),
              overview: overviewMatch[1].trim(),
              risks,
              issues,
              tests,
            });
          }
        });
      }
    }

    return {
      prType: prType as PRType,
      summaryPoints,
      keyRisks,
      hunks,
      decision,
      prDescription,
    };
  } catch (error) {
    console.error("Failed to parse summary response:", error);
    return {
      prType: "mixed" as PRType,
      summaryPoints: ["Failed to parse summary"],
      keyRisks: [],
      hunks: [],
      decision: {
        recommendation: "COMMENT",
        reasoning: "Failed to parse summary response",
      },
      prDescription: undefined,
    };
  }
}

/**
 * Summarizes findings into concise paragraphs for each severity category.
 */
export async function summarizeFindings(
  required: Finding[],
  optional: Finding[],
  nit: Finding[],
  fyi: Finding[],
  praise: Finding[],
  modelConfig: ModelConfig,
): Promise<{
  praiseSummary?: string;
  requiredSummary?: string;
  othersSummary?: string;
}> {
  const model = await createModel(modelConfig);

  const systemPrompt = `<instructions>
You are a technical writing assistant specializing in code review summaries. Your task is to transform lists of individual code review findings into concise, coherent paragraph summaries.

For each category of findings provided, write a brief paragraph (2-4 sentences) that captures the main themes and patterns without listing every individual issue. Focus on:
- Common patterns or themes across the findings
- High-level areas of concern or improvement
- The overall impact or importance of the issues

Keep each paragraph concise and professional. Use natural language rather than bullet points.
</instructions>`;

  // Build the user content with findings organized by category
  let userContent = "<findingsSummaryRequest>\n";

  if (praise.length > 0) {
    userContent += "<praise>\n";
    praise.forEach((finding, idx) => {
      userContent += `<finding id="${idx + 1}" file="${finding.path}" line="${finding.line || "N/A"}">${finding.message}</finding>\n`;
    });
    userContent += "</praise>\n\n";
  }

  if (required.length > 0) {
    userContent += "<required>\n";
    required.forEach((finding, idx) => {
      userContent += `<finding id="${idx + 1}" file="${finding.path}" line="${finding.line || "N/A"}">${finding.message}</finding>\n`;
    });
    userContent += "</required>\n\n";
  }

  const others = [...optional, ...nit, ...fyi];
  if (others.length > 0) {
    userContent += "<others>\n";
    others.forEach((finding, idx) => {
      const severity = finding.severity || "other";
      userContent += `<finding id="${idx + 1}" file="${finding.path}" line="${finding.line || "N/A"}" severity="${severity}">${finding.message}</finding>\n`;
    });
    userContent += "</others>\n\n";
  }

  userContent += `Please provide paragraph summaries for each category that has findings. Use this XML format:

<summaryResponse>
${praise.length > 0 ? "<praiseSummary>Write a paragraph summarizing the praise findings</praiseSummary>" : ""}
${required.length > 0 ? "<requiredSummary>Write a paragraph summarizing the required findings</requiredSummary>" : ""}
${others.length > 0 ? "<othersSummary>Write a paragraph summarizing the optional, nit, and fyi findings</othersSummary>" : ""}
</summaryResponse>
</findingsSummaryRequest>`;

  let text: string;
  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: undefined,
    });
    text = result.text;
    debugLog("✅ AI call succeeded for findings summary");
  } catch (error) {
    debugLog("❌ AI call failed for findings summary:", error);
    throw error;
  }

  debugLog("Findings Summary Raw Response:", text);

  // Parse the response
  const result: {
    praiseSummary?: string;
    requiredSummary?: string;
    othersSummary?: string;
  } = {};

  try {
    const praiseSummaryMatch = text.match(
      /<praiseSummary>(.*?)<\/praiseSummary>/s,
    );
    if (praiseSummaryMatch) {
      result.praiseSummary = praiseSummaryMatch[1].trim();
    }

    const requiredSummaryMatch = text.match(
      /<requiredSummary>(.*?)<\/requiredSummary>/s,
    );
    if (requiredSummaryMatch) {
      result.requiredSummary = requiredSummaryMatch[1].trim();
    }

    const othersSummaryMatch = text.match(
      /<othersSummary>(.*?)<\/othersSummary>/s,
    );
    if (othersSummaryMatch) {
      result.othersSummary = othersSummaryMatch[1].trim();
    }
  } catch (error) {
    console.error("Failed to parse findings summary response:", error);
    // Return empty object to fall back to original formatting
  }

  return result;
}
