"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewChunkWithAgent = reviewChunkWithAgent;
const agents_1 = require("@openai/agents");
const tools_1 = require("./tools");
const agent_system_prompt_1 = require("./agent-system-prompt");
const xml_parser_1 = require("../xml-parser");
const model_factory_1 = require("../model-factory");
const agents_extensions_1 = require("@openai/agents-extensions");
/**
 * Reviews a diff chunk using the interactive agent.
 */
async function reviewChunkWithAgent(diffChunk, modelConfig, summaryContext, repoFilePaths, maxTurns = 20) {
    const model = await (0, model_factory_1.createModel)(modelConfig);
    const agent = new agents_1.Agent({
        model: (0, agents_extensions_1.aisdk)(model),
        name: "InteractiveReviewAgent",
        instructions: (0, agent_system_prompt_1.getInteractiveSystemPrompt)(),
        tools: tools_1.allTools,
    });
    const fileList = repoFilePaths.join("\n");
    const initialMessage = `Here is a list of all files in the repository:\n${fileList}\n\n` +
        `Here is the context from the overall diff analysis:\n${summaryContext}\n\n` +
        `Please review this diff chunk:\n\n${diffChunk}`;
    try {
        const result = await (0, agents_1.run)(agent, initialMessage, { maxTurns });
        if (result.finalOutput) {
            console.log("Agent Raw Response:", result.finalOutput);
            const findings = (0, xml_parser_1.parseXMLResponse)(result.finalOutput);
            return (0, xml_parser_1.resolveLineNumbers)(findings, diffChunk);
        }
        else {
            console.error("Agent failed to produce a final output.", result);
            return [];
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("An error occurred while running the agent:", errorMessage);
        return [];
    }
}
//# sourceMappingURL=index.js.map