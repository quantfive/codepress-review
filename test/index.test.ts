import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as nodeFs from "node:fs";
import { run } from "../src/index"; // Adjust the path to your main file

// Mock external dependencies
jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  writeFileSync: jest.fn(),
}));
jest.mock("node:fs", () => ({
  ...jest.requireActual("node:fs"),
  writeFileSync: jest.fn(),
}));
jest.mock("../src/ai-review", () => ({
  main: jest.fn().mockResolvedValue(undefined),
}));

describe("GitHub Action main run function", () => {
  const setupValidPRContext = () => {
    Object.defineProperty(github, "context", {
      value: {
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        repo: { owner: "test-owner", repo: "test-repo" },
      },
      writable: true,
    });

    mockGetBooleanInput.mockImplementation((name) => {
      switch (name) {
        case "run_on_pr_opened":
          return true;
        case "run_on_pr_reopened":
          return true;
        case "run_on_review_requested":
          return true;
        case "run_on_comment_trigger":
          return true;
        default:
          return false;
      }
    });
  };
  let mockGetInput: jest.SpyInstance;
  let mockGetBooleanInput: jest.SpyInstance;
  let mockGetOctokit: jest.SpyInstance;
  let mockPullsGet: jest.Mock;
  let mockPullsList: jest.Mock;
  let originalContext: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Store original context to restore later
    originalContext = github.context;

    // Mock core.getInput
    mockGetInput = jest.spyOn(core, "getInput").mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "openai";
        case "model_name":
          return "gpt-4o";
        case "openai_api_key":
          return "test-openai-key";
        case "comment_trigger_phrase":
          return "@codepress review";
        case "max_turns":
          return "12";
        default:
          return "";
      }
    });

    // Mock core.getBooleanInput
    mockGetBooleanInput = jest
      .spyOn(core, "getBooleanInput")
      .mockImplementation((name) => {
        switch (name) {
          case "update_pr_description":
            return false;
          case "debug":
            return false;
          case "run_on_pr_opened":
            return true;
          case "run_on_pr_reopened":
            return true;
          case "run_on_review_requested":
            return true;
          case "run_on_comment_trigger":
            return true;
          default:
            return false;
        }
      });

    // Mock core.info and core.setFailed
    jest.spyOn(core, "info").mockImplementation(() => {});
    jest.spyOn(core, "setFailed").mockImplementation(() => {});

    // Mock Octokit - pulls.get is called twice: first for PR info (head sha), then for diff
    mockPullsGet = jest.fn().mockImplementation((params) => {
      // If mediaType is specified, it's a diff request
      if (params.mediaType) {
        return Promise.resolve({ data: "diff" as unknown });
      }
      // Otherwise it's a PR info request
      return Promise.resolve({ data: { head: { sha: "abc123" } } });
    });
    mockPullsList = jest.fn();
    mockGetOctokit = jest.spyOn(github, "getOctokit").mockReturnValue({
      rest: { pulls: { get: mockPullsGet, list: mockPullsList } },
    } as any);
  });

  afterEach(() => {
    // Restore original context
    Object.defineProperty(github, "context", {
      value: originalContext,
      writable: true,
    });
    jest.restoreAllMocks();
  });

  it("should determine PR number from pull_request event", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    await run();

    expect(core.info).toHaveBeenCalledWith(
      "Running CodePress Review for PR #123",
    );
    expect(mockPullsGet).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 123 }),
    );
  });

  it("should determine PR number from issue_comment event", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: { number: 456, pull_request: {} },
          comment: { body: "@codepress review" },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    await run();

    expect(core.info).toHaveBeenCalledWith(
      "Running CodePress Review for PR #456",
    );
    expect(mockPullsGet).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 456 }),
    );
  });

  it("should determine PR number from workflow_dispatch event", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "workflow_dispatch",
        payload: {},
        ref: "refs/heads/dispatch-branch",
      },
      writable: true,
    });
    mockPullsList.mockResolvedValue({ data: [{ number: 789 }] });

    await run();

    expect(core.info).toHaveBeenCalledWith(
      "Workflow dispatched manually. Finding PR from branch...",
    );
    expect(mockPullsList).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      head: "test-owner:dispatch-branch",
      state: "open",
      sort: "updated",
      direction: "desc",
      per_page: 1,
    });
    expect(core.info).toHaveBeenCalledWith(
      "Running CodePress Review for PR #789",
    );
    expect(mockPullsGet).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 789 }),
    );
  });

  it("should fail if workflow_dispatch finds no PR", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "workflow_dispatch",
        payload: {},
        ref: "refs/heads/no-pr-branch",
      },
      writable: true,
    });
    mockPullsList.mockResolvedValue({ data: [] });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "Could not find an open pull request for branch 'no-pr-branch'.",
    );
  });

  it("should skip for unsupported event types", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "push",
        payload: {},
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    await run();

    expect(core.info).toHaveBeenCalledWith(
      "Skipping review: Unsupported event: push with action: undefined",
    );
  });

  it("should call the review main function with correct args", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });
    const { main: reviewMain } = await import("../src/ai-review");

    await run();

    expect(reviewMain).toHaveBeenCalled();
    // We now write the comments file instead of the diff file
    expect(nodeFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("pr-comments.json"),
      expect.any(String),
    );
  });

  it("should fail if PR number is NaN from pull_request event", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: NaN },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "Could not determine a valid pull request number.",
    );
  });

  it("should fail if PR number is undefined from pull_request event", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: {},
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    // When number is undefined, it becomes NaN
    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "Could not determine a valid pull request number.",
    );
  });

  it("should fail if PR number is NaN from issue_comment event", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: { pull_request: {} },
          comment: { body: "@codepress review" },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    // When number is undefined, it becomes NaN
    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "Could not determine a valid pull request number.",
    );
  });

  it("should fail if workflow_dispatch GitHub API call throws an error", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "workflow_dispatch",
        payload: {},
        ref: "refs/heads/error-branch",
      },
      writable: true,
    });
    mockPullsList.mockRejectedValue(new Error("API Error"));

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "Failed to find PR for branch 'error-branch'. Error: API Error",
    );
  });

  it("should fail if PR info fetch fails", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });
    // Override the mock to fail on PR info fetch
    mockPullsGet.mockImplementation(() => {
      return Promise.reject(new Error("GitHub API Error"));
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "Failed to fetch PR info from GitHub API: Error: GitHub API Error",
    );
  });

  it("should handle API key validation for OpenAI", async () => {
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "openai";
        case "model_name":
          return "gpt-4o";
        case "openai_api_key":
          return ""; // Missing API key
        case "comment_trigger_phrase":
          return "@codepress review";
        default:
          return "";
      }
    });

    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "openai_api_key is required when using openai provider",
    );
  });

  it("should handle API key validation for Anthropic", async () => {
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "anthropic";
        case "model_name":
          return "claude-3-5-sonnet-20241022";
        case "anthropic_api_key":
          return ""; // Missing API key
        case "comment_trigger_phrase":
          return "@codepress review";
        default:
          return "";
      }
    });

    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "anthropic_api_key is required when using anthropic provider",
    );
  });

  it("should handle API key validation for Gemini", async () => {
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "gemini";
        case "model_name":
          return "gemini-1.5-pro";
        case "gemini_api_key":
          return ""; // Missing API key
        case "comment_trigger_phrase":
          return "@codepress review";
        default:
          return "";
      }
    });

    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "gemini_api_key is required when using gemini provider",
    );
  });

  it("should handle API key validation for Cohere", async () => {
    setupValidPRContext();
    
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "cohere";
        case "model_name":
          return "command-r-plus";
        case "cohere_api_key":
          return ""; // Missing key
        case "comment_trigger_phrase":
          return "@codepress/review";
        default:
          return "";
      }
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "cohere_api_key is required when using cohere provider",
    );
  });

  it("should handle API key validation for Groq", async () => {
    setupValidPRContext();
    
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "groq";
        case "model_name":
          return "llama-3.1-70b-versatile";
        case "groq_api_key":
          return ""; // Missing key
        case "comment_trigger_phrase":
          return "@codepress/review";
        default:
          return "";
      }
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "groq_api_key is required when using groq provider",
    );
  });

  it("should handle API key validation for DeepSeek", async () => {
    setupValidPRContext();
    
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "deepseek";
        case "model_name":
          return "deepseek-chat";
        case "deepseek_api_key":
          return ""; // Missing key
        case "comment_trigger_phrase":
          return "@codepress/review";
        default:
          return "";
      }
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "deepseek_api_key is required when using deepseek provider",
    );
  });

  it("should handle API key validation for OpenAI-compatible", async () => {
    setupValidPRContext();
    
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "openai-compatible";
        case "model_name":
          return "llama-3.1-70b-instruct";
        case "openai_compatible_api_key":
          return ""; // Missing key
        case "comment_trigger_phrase":
          return "@codepress/review";
        default:
          return "";
      }
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "openai-compatible_api_key is required when using openai-compatible provider",
    );
  });

  it("should handle unknown provider gracefully", async () => {
    setupValidPRContext();
    
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "unknown-provider";
        case "model_name":
          return "some-model";
        case "comment_trigger_phrase":
          return "@codepress/review";
        default:
          return "";
      }
    });

    await run();

    expect(core.info).toHaveBeenCalledWith(
      'Unknown provider "unknown-provider". Will attempt to use UNKNOWN-PROVIDER_API_KEY environment variable.',
    );
  });

  it("should successfully validate when all required inputs are provided for new providers", async () => {
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case "github_token":
          return "test-token";
        case "model_provider":
          return "groq";
        case "model_name":
          return "llama-3.1-70b-versatile";
        case "groq_api_key":
          return "test-groq-key";
        case "comment_trigger_phrase":
          return "@codepress/review";
        case "max_turns":
          return "12";
        default:
          return "";
      }
    });

    mockGetBooleanInput.mockImplementation((name) => {
      switch (name) {
        case "update_pr_description":
          return true;
        case "debug":
          return false;
        case "run_on_pr_opened":
          return true;
        case "run_on_pr_reopened":
          return true;
        case "run_on_review_requested":
          return true;
        case "run_on_comment_trigger":
          return true;
        default:
          return false;
      }
    });

    // Mock GitHub context for a valid PR
    Object.defineProperty(github, "context", {
      value: {
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        repo: { owner: "test-owner", repo: "test-repo" },
      },
      writable: true,
    });

    await run();

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith("Running review: PR was opened");
  });

  it("should set DEBUG environment variable based on debug input", async () => {
    mockGetBooleanInput.mockImplementation((name) => {
      switch (name) {
        case "debug":
          return true;
        case "update_pr_description":
          return false;
        case "run_on_pr_opened":
          return true;
        case "run_on_pr_reopened":
          return true;
        case "run_on_review_requested":
          return true;
        case "run_on_comment_trigger":
          return true;
        default:
          return false;
      }
    });

    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    await run();

    expect(process.env.DEBUG).toBe("true");
  });

  it("should set DEBUG environment variable to false by default", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: {
          action: "opened",
          pull_request: { number: 123 },
        },
        ref: "refs/heads/feature",
      },
      writable: true,
    });

    await run();

    expect(process.env.DEBUG).toBe("false");
  });
});
