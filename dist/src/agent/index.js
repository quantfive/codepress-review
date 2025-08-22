"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewChunkWithAgent = reviewChunkWithAgent;
exports.reviewChunkWithAgentLegacy = reviewChunkWithAgentLegacy;
const agents_1 = require("@openai/agents");
const tools_1 = require("./tools");
const agent_system_prompt_1 = require("./agent-system-prompt");
const xml_parser_1 = require("../xml-parser");
const model_factory_1 = require("../model-factory");
const agents_extensions_1 = require("@openai/agents-extensions");
const debug_1 = require("../debug");
/**
 * Reviews a diff chunk using the interactive agent.
 */
async function reviewChunkWithAgent(diffChunk, modelConfig, diffSummary, chunkIndex, repoFilePaths, existingComments = [], maxTurns = 20, blockingOnly = false) {
    const model = await (0, model_factory_1.createModel)(modelConfig);
    const agent = new agents_1.Agent({
        model: (0, agents_extensions_1.aisdk)(model),
        name: "CodePressReviewAgent",
        instructions: (0, agent_system_prompt_1.getInteractiveSystemPrompt)(blockingOnly),
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
            if (hunkSummary.issues.length > 0) {
                contextLines.push("    <issues>");
                hunkSummary.issues.forEach((issue) => {
                    contextLines.push(`      <issue severity="${issue.severity}" kind="${issue.kind}">${issue.description}</issue>`);
                });
                contextLines.push("    </issues>");
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
            (0, debug_1.debugLog)(`[Hunk ${chunkIndex + 1}] No specific guidance from summary agent - chunk considered good or low-risk`);
        }
        contextLines.push("</diffContext>");
        summaryContext = contextLines.join("\n");
    }
    // Build existing comments context for this chunk
    let existingCommentsContext = "";
    if (existingComments.length > 0) {
        const contextLines = [];
        contextLines.push("<existingComments>");
        existingComments.forEach((comment) => {
            if (comment.path && comment.line && comment.body) {
                contextLines.push(`  <comment id="${String(comment.id || `${comment.path}:${comment.line}`)}" path="${comment.path}" line="${String(comment.line)}" createdAt="${comment.created_at || "unknown"}">`);
                contextLines.push(`    ${comment.body}`);
                contextLines.push(`  </comment>`);
            }
        });
        contextLines.push("</existingComments>");
        existingCommentsContext = contextLines.join("\n");
    }
    const initialMessage = `
<reviewRequest>
  <repositoryFiles>
    ${fileList}
  </repositoryFiles>
  <diffAnalysisContext>
    ${summaryContext}
  </diffAnalysisContext>
  <existingCommentsContext>
    ${existingCommentsContext}
  </existingCommentsContext>
  <diffChunk>
    ${diffChunk}
  </diffChunk>

  <instruction>
    Please review this diff chunk using the provided context. ${existingComments.length > 0 ? "Pay special attention to the existing comments:\n  1. Avoid creating duplicate or similar comments unless you have significantly different insights.\n  2. Analyze whether any existing comments have been addressed by the changes in this diff.\n  3. If you find that an existing comment has been resolved by the code changes, include it in the <resolvedComments> section with a clear explanation of how it was addressed." : ""}
  </instruction>
</reviewRequest>`;
    try {
        (0, debug_1.debugLog)(`[Hunk ${chunkIndex + 1}] Initial Message:\n`, initialMessage);
        const result = await (0, agents_1.run)(agent, initialMessage, { maxTurns });
        if (result.finalOutput) {
            (0, debug_1.debugLog)("Agent Raw Response:", result.finalOutput);
            const response = (0, xml_parser_1.parseAgentResponse)(result.finalOutput);
            const resolvedFindings = (0, xml_parser_1.resolveLineNumbers)(response.findings, diffChunk);
            return {
                findings: resolvedFindings,
                resolvedComments: response.resolvedComments,
            };
        }
        else {
            (0, debug_1.debugError)("Agent failed to produce a final output.", result);
            return { findings: [], resolvedComments: [] };
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.debugError)("An error occurred while running the agent:", errorMessage);
        return { findings: [], resolvedComments: [] };
    }
}
/**
 * Reviews a diff chunk using the interactive agent.
 * @deprecated Use reviewChunkWithAgent which returns the full AgentResponse instead
 */
async function reviewChunkWithAgentLegacy(diffChunk, modelConfig, diffSummary, chunkIndex, repoFilePaths, existingComments = [], maxTurns = 20, blockingOnly = false) {
    const response = await reviewChunkWithAgent(diffChunk, modelConfig, diffSummary, chunkIndex, repoFilePaths, existingComments, maxTurns, blockingOnly);
    return response.findings;
}
//# sourceMappingURL=index.js.map