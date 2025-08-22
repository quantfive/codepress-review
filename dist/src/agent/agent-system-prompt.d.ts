/**
 * Builds the interactive system prompt with review guidelines and tool capabilities.
 * Checks for custom-codepress-review-prompt.md file and uses it if available,
 * otherwise uses the default guidelines.
 *
 * @param blockingOnly If true, instructs the LLM to only generate "required" severity comments
 * @returns Complete system prompt with tools and response format
 */
export declare function getInteractiveSystemPrompt(blockingOnly?: boolean): string;
export declare const INTERACTIVE_SYSTEM_PROMPT: string;
//# sourceMappingURL=agent-system-prompt.d.ts.map