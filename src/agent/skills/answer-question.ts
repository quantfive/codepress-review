import type { Skill, SkillContext } from "./types";

export const answerQuestionSkill: Skill = {
  name: "answer-question",
  description: "Answer questions about code in this PR. Use when the user asks what/why/how, ends with a question mark, or asks for an explanation about the code changes, architecture, or implementation details.",

  getInstructions(ctx: SkillContext): string {
    const mention = ctx.interactiveMention;
    if (!mention) {
      return `Error: This skill requires an interactive mention context.`;
    }

    // Determine how to respond based on comment type
    const replyCommand = mention.isReviewComment
      ? `gh api repos/${ctx.repo}/pulls/${ctx.prNumber}/comments -f body="[your answer]" -F in_reply_to=${mention.commentId}`
      : `gh api repos/${ctx.repo}/issues/${ctx.prNumber}/comments -f body="@${mention.commentAuthor} [your answer]"`;

    let codeContext = "";
    if (mention.isReviewComment && mention.filePath) {
      codeContext = `
## Code Context
The user asked this question on an inline comment at:
- **File:** \`${mention.filePath}\`
${mention.line ? `- **Line:** ${mention.line}` : ""}
${mention.diffHunk ? `
**Diff hunk context:**
\`\`\`diff
${mention.diffHunk}
\`\`\`
` : ""}
`;
    }

    return `## Skill: Answer Question

Your task is to answer the user's question helpfully and concisely.

## User's Question
**Author:** @${mention.commentAuthor}
**Message:** ${mention.userMessage}
${codeContext}

## Guidelines

1. **Be direct and helpful** - Answer the question clearly without unnecessary preamble
2. **Use tools to explore** if you need more context:
   - \`cat <filepath>\` - Read full files
   - \`rg "pattern" src/\` - Search the codebase
   - \`gh pr diff ${ctx.prNumber}\` - See the full PR diff
   - \`dep_graph\` - Understand dependencies
3. **Reference specific code** - Include file paths and line numbers when relevant
4. **Stay focused** - Answer what was asked, don't expand into unsolicited review feedback

## How to Respond

Post your response using:
\`\`\`bash
${replyCommand}
\`\`\`

**Tips for the response body:**
- Use markdown formatting for code snippets
- Keep it concise but complete
- If the answer requires code examples, include them
- If you're not sure about something, say so rather than guessing

## Completion

When you've posted your response, output:
\`\`\`json
{
  "completed": true,
  "summary": "Answered question about [topic]",
  "commentsPosted": 1,
  "verdict": "NONE"
}
\`\`\`

Note: Use \`verdict: "NONE"\` for Q&A interactions - you're not submitting a formal review.
`;
  },
};
