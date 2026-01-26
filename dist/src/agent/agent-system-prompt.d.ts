/**
 * Builds the interactive system prompt with review guidelines and tool capabilities.
 *
 * Supports two customization files:
 * - `custom-codepress-review-prompt.md`: Replaces the entire default guidelines
 * - `codepress-review-rules.md`: Appends additional rules to the guidelines (takes precedence on conflicts)
 *
 * @param blockingOnly If true, instructs the LLM to only generate "required" severity comments
 * @param maxTurns Maximum number of turns the agent has to complete the review (null = unlimited)
 * @returns Complete system prompt with tools and response format
 */
export declare function getInteractiveSystemPrompt(blockingOnly: boolean | undefined, maxTurns: number | null): string;
export declare const INTERACTIVE_SYSTEM_PROMPT: string;
//# sourceMappingURL=agent-system-prompt.d.ts.map