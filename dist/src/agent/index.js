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
async function reviewFullDiff(fullDiff, modelConfig, repoFilePaths, prContext, maxTurns = 75, blockingOnly = false) {
    // Reset todo list for fresh review
    (0, tools_1.resetTodoList)();
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

1. **Get PR context:**
   - Run \`gh pr view ${prContext.prNumber}\` to understand the PR purpose
   - Run \`gh pr view ${prContext.prNumber} --json body -q '.body'\` to check if description is blank
   - **If body is empty/blank, you MUST update it immediately:**
     \`gh pr edit ${prContext.prNumber} --body "## Summary\\n\\n<describe what this PR does based on the diff>\\n\\n## Changes\\n\\n- <list key changes>"\`
   - Run \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/comments\` to check existing comments (avoid duplicates)

2. **Deep review each changed file:**
   For each file in the diff:
   - **Read full file context:** \`cat <filepath>\` to understand surrounding code
   - **Check dependencies:** Use \`dep_graph\` or \`rg\` to see what calls this code and what it calls
   - **Review the diff WITH context:** Look for:
     • Logic errors and edge cases the diff introduces
     • Error handling gaps in the new code
     • Inconsistencies with patterns in the rest of the file/codebase
     • Breaking changes to function signatures that affect callers
     • DRY violations - does similar code exist elsewhere?

3. **Post inline comments** for issues found:
   \`gh api repos/${prContext.repo}/pulls/${prContext.prNumber}/comments -f body="Your comment" -f path="file/path.ts" -f line=42 -f commit_id="${prContext.commitSha}"\`

4. **Before submitting review, verify:**
   - PR description is not blank (if it was, you should have updated it in step 1)
   - Complete any items in your \`todo list\`

5. **REQUIRED - Submit formal review:**
   - Approve: \`gh pr review ${prContext.prNumber} --approve --body "Your summary"\`
   - Request changes: \`gh pr review ${prContext.prNumber} --request-changes --body "Your summary"\`
   - Comment: \`gh pr review ${prContext.prNumber} --comment --body "Your summary"\`

**CRITICAL: Only comment on code IN THE DIFF.**
- Use context (full file, dependencies) to UNDERSTAND the code
- But ONLY comment on lines that are actually changed in this PR
- Never comment on pre-existing code outside the diff

**Comment guidelines:**
${blockingOnly ? "- BLOCKING-ONLY MODE: Only comment on critical issues that MUST be fixed (security, bugs, breaking changes)" : "- Focus on substantive issues: bugs, security problems, logic errors, significant design concerns\n- Skip minor style nits unless they indicate a real problem"}
- Be constructive and explain WHY something is an issue
- Include code suggestions when helpful

**Line numbers:**
- Use the line number in the NEW version of the file (right side of diff)
- For lines starting with \`+\`, count from the @@ hunk header
- Always use commit_id="${prContext.commitSha}"

**Remember: You MUST submit a formal review at the end using \`gh pr review\`.**
</instruction>`;
    // Create a runner with custom workflow name for tracing
    const runner = new agents_1.Runner({
        workflowName: `${prContext.repo}#${prContext.prNumber}`,
    });
    try {
        const filesInDiff = extractFilesFromDiff(fullDiff);
        (0, debug_1.debugLog)(`Starting full PR review. Diff size: ~${diffTokens} tokens`);
        (0, debug_1.debugLog)(`Files in context (${filesInDiff.length}): ${filesInDiff.join(", ")}`);
        (0, debug_1.debugLog)(`Max turns: ${maxTurns}`);
        (0, debug_1.debugLog)(`PR: ${prContext.repo}#${prContext.prNumber}`);
        const result = await runner.run(agent, initialMessage, { maxTurns });
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