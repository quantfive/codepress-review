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
