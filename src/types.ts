export interface Finding {
  path: string;
  line: number | null;
  lineToMatch?: string;
  message: string;
  severity?: string;
  suggestion?: string;
  code?: string;
}

export interface ReviewConfig {
  diff: string;
  pr: number;
  provider: string;
  modelName: string;
  githubToken: string;
  githubRepository: string;
  maxTurns: number;
}

export interface ModelConfig {
  provider: "openai" | "anthropic" | "gemini";
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

export type PRType =
  | "feature"
  | "bugfix"
  | "refactor"
  | "docs"
  | "test"
  | "chore"
  | "dependency-bump"
  | "mixed";

export type RiskTag = "SEC" | "PERF" | "ARCH" | "TEST" | "STYLE" | "DEP";

export interface RiskItem {
  tag: RiskTag;
  description: string;
}

export interface HunkSummary {
  index: number;
  file: string;
  overview: string;
  risks: RiskItem[];
  tests: string[];
}

export interface DiffSummary {
  prType: PRType;
  summaryPoints: string[];
  keyRisks: RiskItem[];
  hunks: HunkSummary[];
  decision: {
    recommendation: "APPROVE" | "REQUEST_CHANGES";
    reasoning: string;
  };
}
