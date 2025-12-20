export interface ReviewConfig {
    diff: string;
    pr: number;
    provider: string;
    modelName: string;
    githubToken: string;
    githubRepository: string;
    maxTurns: number;
    debug: boolean;
    blockingOnly: boolean;
}
export interface ModelConfig {
    provider: string;
    modelName: string;
    apiKey: string;
    /** OpenAI reasoning effort: 'none' (GPT-5.1 only) | 'minimal' | 'low' | 'medium' | 'high' */
    reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
    /** Anthropic effort for claude-opus-4-5: 'low' | 'medium' | 'high' (default) */
    effort?: "low" | "medium" | "high";
    /** Anthropic thinking config for claude-opus-4-5, claude-sonnet-4-5, claude-3-7-sonnet */
    thinking?: {
        type: "enabled" | "disabled";
        budgetTokens?: number;
    };
}
export interface ParsedArgs {
    diff: string;
    pr: number;
}
/**
 * Represents an existing review comment on the PR.
 * These are comments made by other reviewers that the bot should be aware of.
 */
export interface ExistingReviewComment {
    /** GitHub comment ID (for adding reactions) */
    id: number;
    /** GitHub username of the commenter */
    author: string;
    /** The comment body/text */
    body: string;
    /** File path the comment is on */
    path: string;
    /** Line number in the new version of the file (may be null for file-level comments) */
    line: number | null;
    /** The diff hunk context around the comment */
    diffHunk: string;
    /** ISO timestamp when the comment was created */
    createdAt: string;
}
//# sourceMappingURL=types.d.ts.map