import { generateText, APICallError } from "ai";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  ModelConfig,
  DiffSummary,
  RiskItem,
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
  let xmlToParse = text.trim();
  // For backwards compatibility, if the response is not wrapped in <global>, add it.
  if (!xmlToParse.startsWith("<global>")) {
    xmlToParse = `<global>${xmlToParse}</global>`;
  }

  const validationResult = XMLValidator.validate(xmlToParse);
  if (validationResult !== true) {
    console.error(
      "Failed to parse summary response due to invalid XML:",
      validationResult.err,
    );
    console.error("Invalid XML content:", xmlToParse);
    return {
      prType: "mixed" as PRType,
      summaryPoints: ["Failed to parse summary: Invalid XML"],
      keyRisks: [],
      hunks: [],
      decision: {
        recommendation: "COMMENT",
        reasoning: "Failed to parse summary response due to invalid XML",
      },
    };
  }
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "content",
    parseAttributeValue: true,
    removeNSPrefix: true,
    trimValues: true,
  };
  const parser = new XMLParser(options);

  try {
    const fullResponse = parser.parse(xmlToParse);

    // The entire response might be wrapped in <global> or not.
    // The parser will create a root object. If the text is just the XML, the root might be the first tag.
    // Let's find the 'global' content, which might be the root or a child of the root.
    let globalContent = fullResponse.global || fullResponse;
    if (
      Object.keys(globalContent).length === 0 &&
      xmlToParse.includes("<global>")
    ) {
      // It might be nested if the XML string is wrapped in other text
      const globalMatch = xmlToParse.match(/<global>(.*?)<\/global>/s);
      if (globalMatch) {
        globalContent = parser.parse(globalMatch[1]);
      }
    }

    // Extract PR type
    const prType = globalContent.prType || "unknown";

    // Extract overview items
    const summaryPoints: string[] = [];
    if (globalContent.overview?.item) {
      const items = Array.isArray(globalContent.overview.item)
        ? globalContent.overview.item
        : [globalContent.overview.item];
      summaryPoints.push(
        ...items.map((item: any) => (item.content || item).toString().trim()),
      );
    }

    // Extract key risks
    const keyRisks: RiskItem[] = [];
    if (globalContent.keyRisks?.item) {
      const items = Array.isArray(globalContent.keyRisks.item)
        ? globalContent.keyRisks.item
        : [globalContent.keyRisks.item];

      items.forEach((item: any) => {
        if (item.tag && (item.content || typeof item === "string")) {
          keyRisks.push({
            tag: item.tag as RiskTag,
            description: (item.content || item).toString().trim(),
          });
        }
      });
    }

    // Extract decision
    let decision: DiffSummary["decision"] = {
      recommendation: "COMMENT",
      reasoning: "No specific reasoning provided",
    };

    if (globalContent.decision) {
      const rec = globalContent.decision.recommendation;
      if (rec === "APPROVE" || rec === "REQUEST_CHANGES" || rec === "COMMENT") {
        decision.recommendation = rec as ReviewDecision;
      }
      if (globalContent.decision.reasoning) {
        decision.reasoning = globalContent.decision.reasoning;
      }
    }

    // Extract hunks
    const hunks: HunkSummary[] = [];
    // The hunks might be at the same level as global or inside it.
    let hunksData = fullResponse.hunks || globalContent.hunks;
    if (!hunksData) {
      const hunksMatch = xmlToParse.match(/<hunks>(.*?)<\/hunks>/s);
      if (hunksMatch) {
        hunksData = parser.parse(hunksMatch[0]).hunks;
      }
    }

    if (hunksData?.hunk) {
      const hunkItems = Array.isArray(hunksData.hunk)
        ? hunksData.hunk
        : [hunksData.hunk];

      hunkItems.forEach((hunk: any) => {
        if (hunk.index !== undefined && hunk.file && hunk.overview) {
          // Extract risks for this hunk
          const risks: RiskItem[] = [];
          if (hunk.risks?.item) {
            const riskItems = Array.isArray(hunk.risks.item)
              ? hunk.risks.item
              : [hunk.risks.item];
            riskItems.forEach((item: any) => {
              if (item.tag && (item.content || typeof item === "string")) {
                risks.push({
                  tag: item.tag as RiskTag,
                  description: (item.content || item).toString().trim(),
                });
              }
            });
          }

          // Extract tests for this hunk
          const tests: string[] = [];
          if (hunk.tests?.item) {
            const testItems = Array.isArray(hunk.tests.item)
              ? hunk.tests.item
              : [hunk.tests.item];
            tests.push(
              ...testItems.map((item: any) =>
                (item.content || item).toString().trim(),
              ),
            );
          }

          hunks.push({
            index: hunk.index,
            file: hunk.file,
            overview: hunk.overview,
            risks,
            tests,
          });
        }
      });
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
  try {
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

    console.log("Findings Summary Raw Response:", text);

    const validationResult = XMLValidator.validate(text);
    if (validationResult !== true) {
      console.error(
        "Failed to parse findings summary response due to invalid XML:",
        validationResult.err,
      );
      console.error("Invalid XML content for findings:", text);
      return {};
    }

    const options = {
      ignoreAttributes: true,
      trimValues: true,
    };
    const parser = new XMLParser(options);
    const parsed = parser.parse(text);

    const summaryResponse = parsed.summaryResponse || {};

    // Parse the response
    const result: {
      praiseSummary?: string;
      requiredSummary?: string;
      othersSummary?: string;
    } = {};

    if (summaryResponse.praiseSummary) {
      result.praiseSummary = summaryResponse.praiseSummary.toString().trim();
    }
    if (summaryResponse.requiredSummary) {
      result.requiredSummary = summaryResponse.requiredSummary
        .toString()
        .trim();
    }
    if (summaryResponse.othersSummary) {
      result.othersSummary = summaryResponse.othersSummary.toString().trim();
    }

    return result;
  } catch (error) {
    console.error("Failed to parse findings summary response:", error);
    // Return empty object to fall back to original formatting
    return {};
  }
}
