import type { Skill, SkillContext } from "./types";

export const reviewTargetedSkill: Skill = {
  name: "review-targeted",
  description: "Review specific code areas and post inline comments. Use when the user asks to review, check, look at, or examine specific files, functions, or areas of code. Also use when asked to focus on specific concerns like security, performance, or error handling.",

  getInstructions(ctx: SkillContext): string {
    const mention = ctx.interactiveMention;
    if (!mention) {
      return `Error: This skill requires an interactive mention context.`;
    }

    let codeContext = "";
    if (mention.isReviewComment && mention.filePath) {
      codeContext = `
## Code Context
The user requested this review on an inline comment at:
- **File:** \`${mention.filePath}\`
${mention.line ? `- **Line:** ${mention.line}` : ""}
${mention.diffHunk ? `
**Diff hunk context:**
\`\`\`diff
${mention.diffHunk}
\`\`\`
` : ""}

This is likely the area they want you to focus on.
`;
    }

    return `## Skill: Targeted Code Review

Your task is to review the specific area the user requested and post inline comments for any issues found.

## User's Request
**Author:** @${mention.commentAuthor}
**Message:** ${mention.userMessage}
${codeContext}

## How to Identify What to Review

1. **Parse the user's request** - Look for:
   - Specific file names or paths mentioned
   - Function or class names
   - Areas of concern (security, performance, error handling, etc.)
   - If on an inline comment, that's likely the focus area

2. **If unclear**, focus on:
   - The file where the comment was made (if inline)
   - Files mentioned in the PR that match the user's keywords
   - Common patterns: "review the auth code" → look for auth-related files

## Review Steps

1. **Fetch the relevant code:**
   - Get the PR diff: \`gh pr diff ${ctx.prNumber}\` or specific files
   - Read full files for context: \`cat <filepath>\`
   - Search for related code: \`rg "pattern" src/\`

2. **Review with focus:**
   - Apply the same rigor as a full review, but scoped to the requested area
   - Look for bugs, security issues, logic errors
   - Check error handling, edge cases, and test coverage
   - Verify the code follows project patterns

3. **Post inline comments for issues:**
   \`\`\`bash
   gh api repos/${ctx.repo}/pulls/${ctx.prNumber}/comments \\
     -f body="**REQUIRED**: [description of issue]" \\
     -f path="file/path.ts" \\
     -f line=42 \\
     -f commit_id="${ctx.commitSha}"
   \`\`\`

   Use severity prefixes:
   - **REQUIRED**: Must fix (bugs, security, breaking changes)
   - **OPTIONAL**: Suggested improvement
   - **NIT**: Minor polish

4. **Post a summary response:**
   ${mention.isReviewComment
      ? `\`gh api repos/${ctx.repo}/pulls/${ctx.prNumber}/comments -f body="[summary]" -F in_reply_to=${mention.commentId}\``
      : `\`gh api repos/${ctx.repo}/issues/${ctx.prNumber}/comments -f body="@${mention.commentAuthor} [summary]"\``}

   Include:
   - What area you reviewed
   - Number of issues found (if any)
   - Overall assessment

## Guidelines

- **Stay focused** - Only review what was requested, don't expand to full PR review
- **Be thorough** in the scoped area - Apply full review rigor
- **Context matters** - Read full files, check dependencies, understand the code
- **Post comments immediately** - Don't wait until the end
- **Evidence required** - Back up claims with specific code references

## Completion

When you've reviewed the requested area and posted all comments, output:
\`\`\`json
{
  "completed": true,
  "summary": "Reviewed [area] - posted N comments",
  "commentsPosted": N,
  "verdict": "NONE"
}
\`\`\`

Note: Use \`verdict: "NONE"\` for targeted reviews - you're not submitting a formal full review.
If the user specifically asked you to approve or request changes, you can submit a formal review
and use the appropriate verdict.
`;
  },
};
