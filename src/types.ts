export interface Finding {
  path: string;
  line: number | null;
  lineToMatch?: string;
  message: string;
  severity?: string;
  suggestion?: string;
}

export interface ReviewConfig {
  diff: string;
  pr: number;
  provider: string;
  modelName: string;
  githubToken: string;
  githubRepository: string;
  maxTurns: number;
  updatePrDescription: boolean;
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

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

export interface FileLineMap {
  [filePath: string]: {
    [lineContent: string]: number;
  };
}

export interface ResolvedComment {
  commentId: string;
  path: string;
  line: number;
  reason: string;
}

export interface AgentResponse {
  findings: Finding[];
  resolvedComments: ResolvedComment[];
}

// DiffSummary is kept for backward compatibility with GitHubClient
// but most fields are now optional/unused
export interface DiffSummary {
  decision?: {
    recommendation: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
    reasoning: string;
  };
}
