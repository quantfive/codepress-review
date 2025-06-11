import { ReviewConfig, ParsedArgs, ModelConfig, GitHubConfig } from "./types";

export function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let diff = "",
    pr = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--diff") diff = args[++i];
    if (args[i] === "--pr") pr = args[++i];
  }

  if (!diff || !pr) {
    console.error(
      "Usage: ts-node scripts/ai-review.ts --diff <diff-file> --pr <pr-number>",
    );
    process.exit(1);
  }

  return { diff, pr: Number(pr) };
}

export function getModelConfig(): ModelConfig {
  const provider = process.env.MODEL_PROVIDER as
    | "openai"
    | "anthropic"
    | "gemini";
  const modelName = process.env.MODEL_NAME;

  if (!provider || !modelName) {
    throw new Error("MODEL_PROVIDER and MODEL_NAME are required");
  }

  let apiKey: string;
  switch (provider) {
    case "openai":
      apiKey = process.env.OPENAI_API_KEY!;
      if (!apiKey) throw new Error("OPENAI_API_KEY is required");
      break;
    case "anthropic":
      apiKey = process.env.ANTHROPIC_API_KEY!;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
      break;
    case "gemini":
      apiKey = process.env.GEMINI_API_KEY!;
      if (!apiKey) throw new Error("GEMINI_API_KEY is required");
      break;
    default:
      throw new Error(`Unsupported MODEL_PROVIDER: ${provider}`);
  }

  return { provider, modelName, apiKey };
}

export function getGitHubConfig(): GitHubConfig {
  const githubToken = process.env.GITHUB_TOKEN;
  const repoFullName = process.env.GITHUB_REPOSITORY;

  if (!githubToken) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }

  if (!repoFullName) {
    throw new Error("GITHUB_REPOSITORY environment variable is required");
  }

  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid GITHUB_REPOSITORY format. Expected 'owner/repo'");
  }

  return { owner, repo, token: githubToken };
}

export function getReviewConfig(): ReviewConfig {
  const { diff, pr } = parseArgs();
  const { provider, modelName } = getModelConfig();
  const { token: githubToken } = getGitHubConfig();

  return {
    diff,
    pr,
    provider,
    modelName,
    customPrompt: process.env.CUSTOM_PROMPT,
    githubToken,
    githubRepository: process.env.GITHUB_REPOSITORY!,
    customSummarizePrompt: process.env.CUSTOM_SUMMARIZE_PROMPT,
  };
}
