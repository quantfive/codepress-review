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
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
/**
 * Creates the appropriate AI model based on configuration.
 */
function createModel(config) {
    switch (config.provider) {
        case "openai":
            return (0, openai_1.openai)(config.modelName);
        case "anthropic":
            return (0, anthropic_1.anthropic)(config.modelName);
        case "gemini":
            return (0, google_1.google)(config.modelName);
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
            await new Promise((res) => setTimeout(res, wait));
        }
    }
    throw new Error(`[Hunk ${hunkIdx}] Failed after ${MAX_RETRIES} retries.`);
}
//# sourceMappingURL=ai-client.js.map