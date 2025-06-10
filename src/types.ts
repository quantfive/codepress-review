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
  customPrompt?: string;
  githubToken: string;
  githubRepository: string;
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
