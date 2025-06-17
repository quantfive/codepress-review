import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { run } from "../src/index"; // Adjust the path to your main file

// Mock external dependencies
jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  writeFileSync: jest.fn(),
}));
jest.mock("../src/ai-review", () => ({
  main: jest.fn().mockResolvedValue(undefined),
}));

describe("GitHub Action main run function", () => {
  let mockGetInput: jest.SpyInstance;
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
        default:
          return "";
      }
    });

    // Mock Octokit
    mockPullsGet = jest.fn().mockResolvedValue({ data: "diff" });
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
        payload: { pull_request: { number: 123 } },
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
          issue: { number: 456, pull_request: {} },
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

  it("should fail for unsupported event types", async () => {
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

    expect(core.setFailed).toHaveBeenCalledWith(
      "This action must be run in the context of a pull request, a pull request comment, or a manual dispatch.",
    );
  });

  it("should call the review main function with correct args", async () => {
    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        eventName: "pull_request",
        payload: { pull_request: { number: 123 } },
        ref: "refs/heads/feature",
      },
      writable: true,
    });
    const { main: reviewMain } = await import("../src/ai-review");

    await run();

    expect(reviewMain).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("pr.diff"),
      "diff",
    );
  });
});
