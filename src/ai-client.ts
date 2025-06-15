import { generateText, APICallError } from "ai";
import {
  ModelConfig,
  DiffSummary,
  RiskItem,
  HunkSummary,
  PRType,
  RiskTag,
  ReviewDecision,
} from "./types";
import { getSummarySystemPrompt } from "./summary-agent-system-prompt";
import { setTimeout } from "node:timers/promises";
import { ProcessableChunk } from "./diff-parser";
import { createModel } from "./model-factory";
import { isCodePressReviewObject, isCodePressCommentObject } from "./constants";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

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
      console.warn(
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

  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  console.log("Diff Summary Raw Response:", text);

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

            // Extract risks for this hunk
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
    };
  }
}
