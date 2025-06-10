"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewChunk = reviewChunk;
exports.callWithRetry = callWithRetry;
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const anthropic_1 = require("@ai-sdk/anthropic");
const google_1 = require("@ai-sdk/google");
const system_prompt_1 = require("./system-prompt");
const xml_parser_1 = require("./xml-parser");
const promises_1 = require("node:timers/promises");
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
/**
 * Creates the appropriate AI model based on configuration.
 */
function createModel(config) {
    switch (config.provider) {
        case "openai": {
            const openai = (0, openai_1.createOpenAI)({ apiKey: config.apiKey });
            return openai(config.modelName);
        }
        case "anthropic": {
            const anthropic = (0, anthropic_1.createAnthropic)({ apiKey: config.apiKey });
            return anthropic(config.modelName);
        }
        case "gemini": {
            const google = (0, google_1.createGoogleGenerativeAI)({ apiKey: config.apiKey });
            return google(config.modelName);
        }
        default:
            throw new Error(`Unsupported MODEL_PROVIDER: ${config.provider}`);
    }
}
/**
 * Reviews a diff chunk using the AI model.
 */
async function reviewChunk(diffChunk, modelConfig, customPrompt) {
    const model = createModel(modelConfig);
    const systemPrompt = (0, system_prompt_1.getSystemPrompt)({ customPrompt });
    const { text } = await (0, ai_1.generateText)({
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
    console.log("LLM Raw Response:", text);
    const findings = (0, xml_parser_1.parseXMLResponse)(text);
    return (0, xml_parser_1.resolveLineNumbers)(findings, diffChunk);
}
/**
 * Executes a function with retry logic.
 */
async function callWithRetry(fn, hunkIdx) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            return await fn();
        }
        catch (e) {
            attempt++;
            const wait = RETRY_BASE_MS * Math.pow(2, attempt);
            console.warn(`[Hunk ${hunkIdx}] Attempt ${attempt} failed: ${e}. Retrying in ${wait}ms...`);
            await (0, promises_1.setTimeout)(wait);
        }
    }
    throw new Error(`[Hunk ${hunkIdx}] Failed after ${MAX_RETRIES} retries.`);
}
//# sourceMappingURL=ai-client.js.map