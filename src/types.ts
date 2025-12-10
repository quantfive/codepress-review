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
