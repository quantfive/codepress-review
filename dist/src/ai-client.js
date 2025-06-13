"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callWithRetry = callWithRetry;
exports.summarizeDiff = summarizeDiff;
const ai_1 = require("ai");
const summary_agent_system_prompt_1 = require("./summary-agent-system-prompt");
const promises_1 = require("node:timers/promises");
const model_factory_1 = require("./model-factory");
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
/**
 * Executes a function with retry logic.
 */
async function callWithRetry(fn, hunkIdx) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            return await fn();
        }
        catch (error) {
            if (ai_1.APICallError.isInstance(error) && !error.isRetryable) {
                throw error; // Re-throw to be caught by the service and not retried
            }
            attempt++;
            if (attempt >= MAX_RETRIES) {
                throw new Error(`[Hunk ${hunkIdx}] Failed after ${MAX_RETRIES} retries: ${error}`);
            }
            const wait = RETRY_BASE_MS * Math.pow(2, attempt);
            console.warn(`[Hunk ${hunkIdx}] Attempt ${attempt} failed: ${error}. Retrying in ${wait}ms...`);
            await (0, promises_1.setTimeout)(wait);
        }
    }
    // This part should not be reachable, but it makes TypeScript happy.
    throw new Error(`[Hunk ${hunkIdx}] Exited retry loop unexpectedly.`);
}
/**
 * Summarizes the entire diff and provides notes for each chunk.
 */
async function summarizeDiff(chunks, modelConfig) {
    const model = await (0, model_factory_1.createModel)(modelConfig);
    // Create a condensed view of all chunks for the summary
    const diffOverview = chunks
        .map((chunk, index) => {
        return `=== CHUNK ${index}: ${chunk.fileName} ===\n${chunk.content}\n`;
    })
        .join("\n");
    const systemPrompt = (0, summary_agent_system_prompt_1.getSummarySystemPrompt)();
    const { text } = await (0, ai_1.generateText)({
        model,
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: diffOverview,
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
function parseSummaryResponse(text) {
    try {
        // Extract PR type
        const prTypeMatch = text.match(/<prType>(.*?)<\/prType>/s);
        const prType = prTypeMatch ? prTypeMatch[1].trim() : "unknown";
        // Extract overview items
        const overviewMatch = text.match(/<overview>(.*?)<\/overview>/s);
        const summaryPoints = [];
        if (overviewMatch) {
            const itemMatches = overviewMatch[1].match(/<item>(.*?)<\/item>/gs);
            if (itemMatches) {
                summaryPoints.push(...itemMatches.map((match) => match.replace(/<\/?item>/g, "").trim()));
            }
        }
        // Extract key risks
        const keyRisksMatch = text.match(/<keyRisks>(.*?)<\/keyRisks>/s);
        const keyRisks = [];
        if (keyRisksMatch) {
            const riskMatches = keyRisksMatch[1].match(/<item[^>]*>(.*?)<\/item>/gs);
            if (riskMatches) {
                riskMatches.forEach((match) => {
                    const tagMatch = match.match(/tag="([^"]+)"/);
                    const contentMatch = match.match(/<item[^>]*>(.*?)<\/item>/s);
                    if (tagMatch && contentMatch) {
                        keyRisks.push({
                            tag: tagMatch[1],
                            description: contentMatch[1].trim(),
                        });
                    }
                });
            }
        }
        // Extract hunks
        const hunksMatch = text.match(/<hunks>(.*?)<\/hunks>/s);
        const hunks = [];
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
                        const risks = [];
                        const risksMatch = hunkMatch.match(/<risks>(.*?)<\/risks>/s);
                        if (risksMatch) {
                            const riskItemMatches = risksMatch[1].match(/<item[^>]*>(.*?)<\/item>/gs);
                            if (riskItemMatches) {
                                riskItemMatches.forEach((riskItem) => {
                                    const tagMatch = riskItem.match(/tag="([^"]+)"/);
                                    const contentMatch = riskItem.match(/<item[^>]*>(.*?)<\/item>/s);
                                    if (tagMatch && contentMatch) {
                                        risks.push({
                                            tag: tagMatch[1],
                                            description: contentMatch[1].trim(),
                                        });
                                    }
                                });
                            }
                        }
                        // Extract tests for this hunk
                        const tests = [];
                        const testsMatch = hunkMatch.match(/<tests>(.*?)<\/tests>/s);
                        if (testsMatch) {
                            const testItemMatches = testsMatch[1].match(/<item>(.*?)<\/item>/gs);
                            if (testItemMatches) {
                                tests.push(...testItemMatches.map((match) => match.replace(/<\/?item>/g, "").trim()));
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
            prType: prType,
            summaryPoints,
            keyRisks,
            hunks,
        };
    }
    catch (error) {
        console.error("Failed to parse summary response:", error);
        return {
            prType: "mixed",
            summaryPoints: ["Failed to parse summary"],
            keyRisks: [],
            hunks: [],
        };
    }
}
//# sourceMappingURL=ai-client.js.map