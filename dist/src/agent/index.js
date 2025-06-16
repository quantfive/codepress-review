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
async function reviewChunkWithAgent(diffChunk, modelConfig, diffSummary, chunkIndex, repoFilePaths, maxTurns = 20) {
    const model = await (0, model_factory_1.createModel)(modelConfig);
    const agent = new agents_1.Agent({
        model: (0, agents_extensions_1.aisdk)(model),
        name: "InteractiveReviewAgent",
        instructions: (0, agent_system_prompt_1.getInteractiveSystemPrompt)(),
        tools: tools_1.allTools,
    });
    const fileList = repoFilePaths.join("\n");
    // Build summary context for this chunk
    let summaryContext = "No summary available.";
    if (diffSummary) {
        const { prType, summaryPoints, keyRisks, hunks } = diffSummary;
        const contextLines = [];
        contextLines.push("<diffContext>");
        contextLines.push(`  <prType>${prType}</prType>`);
        if (summaryPoints.length > 0) {
            contextLines.push("  <overview>");
            summaryPoints.forEach((item) => {
                contextLines.push(`    <item>${item}</item>`);
            });
            contextLines.push("  </overview>");
        }
        if (keyRisks.length > 0) {
            contextLines.push("  <keyRisks>");
            keyRisks.forEach((risk) => {
                contextLines.push(`    <item tag="${risk.tag}">${risk.description}</item>`);
            });
            contextLines.push("  </keyRisks>");
        }
        // Find specific notes for this chunk
        const hunkSummary = hunks.find((hunk) => hunk.index === chunkIndex);
        if (hunkSummary) {
            contextLines.push("  <chunkSpecific>");
            contextLines.push(`    <overview>${hunkSummary.overview}</overview>`);
            if (hunkSummary.risks.length > 0) {
                contextLines.push("    <risks>");
                hunkSummary.risks.forEach((risk) => {
                    contextLines.push(`      <item tag="${risk.tag}">${risk.description}</item>`);
                });
                contextLines.push("    </risks>");
            }
            if (hunkSummary.tests.length > 0) {
                contextLines.push("    <suggestedTests>");
                hunkSummary.tests.forEach((test) => {
                    contextLines.push(`      <item>${test}</item>`);
                });
                contextLines.push("    </suggestedTests>");
            }
            contextLines.push("  </chunkSpecific>");
        }
        else {
            console.log(`[Hunk ${chunkIndex + 1}] No specific guidance from summary agent - chunk considered good or low-risk`);
        }
        contextLines.push("</diffContext>");
        summaryContext = contextLines.join("\n");
    }
    const initialMessage = `
<reviewRequest>
  <repositoryFiles>
${fileList}
  </repositoryFiles>
  
  <diffAnalysisContext>
${summaryContext}
  </diffAnalysisContext>
  
  <diffChunk>
${diffChunk}
  </diffChunk>
  
  <instruction>Please review this diff chunk using the provided context.</instruction>
</reviewRequest>`;
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