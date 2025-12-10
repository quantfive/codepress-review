"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewFullDiff = reviewFullDiff;
const agents_1 = require("@openai/agents");
const agents_extensions_1 = require("@openai/agents-extensions");
const debug_1 = require("../debug");
const model_factory_1 = require("../model-factory");
const agent_system_prompt_1 = require("./agent-system-prompt");
const tools_1 = require("./tools");
/**
 * Estimates token count for a string (rough approximation: 4 chars per token).
 */
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
/**
 * Extracts unique file paths from a diff string.
 */
function extractFilesFromDiff(diffText) {
    const files = new Set();
    const regex = /^diff --git a\/(.+?) b\//gm;
    let match;
    while ((match = regex.exec(diffText)) !== null) {
        files.add(match[1]);
    }
    return Array.from(files);
}
/**
 * Maximum tokens we're willing to send to the model in one request.
 * This leaves room for the system prompt and response.
 */
const MAX_DIFF_TOKENS = 80000;
/**
 * Reviews an entire PR diff using a single interactive agent.
 * The agent has full autonomy to:
 * - Fetch additional context via bash/gh CLI
 * - View existing PR comments
 * - Post review comments directly
 * - Update PR description if blank
 */
async function reviewFullDiff(fullDiff, modelConfig, repoFilePaths, prContext, maxTurns = 30, blockingOnly = false) {
    const model = await (0, model_factory_1.createModel)(modelConfig);
    const agent = new agents_1.Agent({
        model: (0, agents_extensions_1.aisdk)(model),
        name: "CodePressReviewAgent",
        instructions: (0, agent_system_prompt_1.getInteractiveSystemPrompt)(blockingOnly, maxTurns),
        tools: tools_1.allTools,
    });
    const fileList = repoFilePaths.join("\n");
    // Check if diff is too large
    const diffTokens = estimateTokens(fullDiff);
    if (diffTokens > MAX_DIFF_TOKENS) {
        (0, debug_1.debugLog)(`⚠️ Diff is large (~${diffTokens} tokens). Agent will need to use tools for context.`);
    }
    const initialMessage = `
You are reviewing PR #${prContext.prNumber} in repository ${prContext.repo}.
Commit SHA: ${prContext.commitSha}

<repositoryFiles>
${fileList}
</repositoryFiles>

<fullDiff>
${fullDiff}
</fullDiff>

<instruction>
Please review this pull request. You have the complete diff above.

**Your workflow:**
1. First, check the PR description: \`gh pr view ${prContext.prNumber}\`
   - If the description is blank/empty, you'll update it at the end with a summary
2. Check for existing review comments: \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/comments\`
   - Avoid duplicating existing comments
   - If an existing comment has been addressed by the code changes, you can resolve it
3. Review the diff thoroughly using your tools (bash, dep_graph) to:
   - Understand how changes integrate with existing code
   - Verify claims about unused code, missing imports, etc.
   - Check if changes affect other parts of the codebase
4. Post inline comments for any issues you find using:
   \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/comments -f body="Your comment" -f path="file/path.ts" -f line=42 -f commit_id="${prContext.commitSha}"\`
5. If the PR description was blank, update it:
   \`gh pr edit ${prContext.prNumber} --body "Your summary"\`
6. **REQUIRED - Submit a formal review with your decision:**
   - Approve: \`gh pr review ${prContext.prNumber} --approve --body "Your summary"\`
   - Request changes: \`gh pr review ${prContext.prNumber} --request-changes --body "Your summary"\`
   - Comment: \`gh pr review ${prContext.prNumber} --comment --body "Your summary"\`

**Comment guidelines:**
${blockingOnly ? "- BLOCKING-ONLY MODE: Only comment on critical issues that MUST be fixed (security, bugs, breaking changes)" : "- Focus on substantive issues: bugs, security problems, logic errors, significant design concerns\n- Skip minor style nits unless they indicate a real problem"}
- Be constructive and explain WHY something is an issue
- Include code suggestions when helpful

**Important:**
- The line number in \`-f line=N\` should be the line number in the NEW version of the file (right side of diff)
- For lines starting with \`+\`, count from the @@ hunk header to find the line number
- Always use commit_id="${prContext.commitSha}" for inline comments

**Remember: Use the bash tool for all PR operations. You MUST submit a formal review at the end using \`gh pr review\`.**
</instruction>`;
    try {
        const filesInDiff = extractFilesFromDiff(fullDiff);
        (0, debug_1.debugLog)(`Starting full PR review. Diff size: ~${diffTokens} tokens`);
        (0, debug_1.debugLog)(`Files in context (${filesInDiff.length}): ${filesInDiff.join(", ")}`);
        (0, debug_1.debugLog)(`Max turns: ${maxTurns}`);
        (0, debug_1.debugLog)(`PR: ${prContext.repo}#${prContext.prNumber}`);
        const result = await (0, agents_1.run)(agent, initialMessage, { maxTurns });
        if (result.finalOutput) {
            (0, debug_1.debugLog)("Agent completed review. Final output:", result.finalOutput);
        }
        else {
            (0, debug_1.debugLog)("Agent completed without final output.");
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.debugError)("An error occurred while running the agent:", errorMessage);
        throw error;
    }
}
//# sourceMappingURL=index.js.map