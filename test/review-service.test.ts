import { ReviewService } from "../src/review-service";
import { GitHubClient } from "../src/github-client";
import { callWithRetry } from "../src/ai-client";
import { Finding } from "../src/types";

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    pulls: {
      get: jest.fn(),
      listReviewComments: jest.fn(),
      createReviewComment: jest.fn(),
    },
    paginate: jest.fn(),
  })),
}));

jest.mock("../src/config", () => ({
  getModelConfig: jest.fn().mockReturnValue({
    provider: "openai",
    modelName: "gpt-4",
    apiKey: "mock-api-key",
  }),
  getGitHubConfig: jest.fn().mockReturnValue({
    token: "mock-github-token",
    owner: "mock-owner",
    repo: "mock-repo",
  }),
}));

jest.mock("../src/github-client");
jest.mock("../src/ai-client");

describe("ReviewService", () => {
  let reviewService: ReviewService;
  let mockGithubClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    // Suppress console.log and console.error
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    reviewService = new ReviewService({
      pr: 1,
      diff: "mock-diff-path",
      customPrompt: "",
      provider: "openai",
      modelName: "gpt-4",
      githubToken: "mock-token",
      githubRepository: "mock-owner/mock-repo",
    });

    // Mock the dependencies
    mockGithubClient = new GitHubClient({
      token: "mock-token",
      owner: "mock-owner",
      repo: "mock-repo",
    }) as jest.Mocked<GitHubClient>;

    (reviewService as any).githubClient = mockGithubClient;
    mockGithubClient.getPRInfo.mockResolvedValue({
      commitId: "mock-commit-id",
      prInfo: {} as any,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should skip a chunk if it has existing comments", async () => {
    // Arrange
    const existingComments = new Map<string, Set<number>>();
    existingComments.set("file1.txt", new Set([2]));
    mockGithubClient.getExistingComments.mockResolvedValue([
      {
        path: "file1.txt",
        line: 2,
        body: "An existing comment",
        user: { login: "github-actions[bot]" },
      },
    ] as any);

    const mockChunks = [
      {
        fileName: "file1.txt",
        content: "diff --git a/file1.txt b/file1.txt...",
        hunk: { newStart: 1, newLines: 3 },
      },
    ];

    jest
      .spyOn(require("fs"), "readFileSync")
      .mockReturnValue("mock diff content");
    jest
      .spyOn(require("../src/diff-parser"), "splitDiff")
      .mockReturnValue(mockChunks);

    // Act
    await (reviewService as any).execute();

    // Assert
    expect(callWithRetry).not.toHaveBeenCalled();
  });

  it("should process a chunk without existing comments", async () => {
    // Arrange
    mockGithubClient.getExistingComments.mockResolvedValue([]);
    const mockFindings: Finding[] = [
      {
        path: "file1.txt",
        line: 2,
        message: "A new finding",
        severity: "optional",
      },
    ];
    (callWithRetry as jest.Mock).mockResolvedValue(mockFindings);

    const mockChunks = [
      {
        fileName: "file1.txt",
        content: "diff --git a/file1.txt b/file1.txt...",
        hunk: { newStart: 1, newLines: 3 },
      },
    ];

    jest
      .spyOn(require("fs"), "readFileSync")
      .mockReturnValue("mock diff content");
    jest
      .spyOn(require("../src/diff-parser"), "splitDiff")
      .mockReturnValue(mockChunks);

    // Act
    await (reviewService as any).execute();

    // Assert
    expect(callWithRetry).toHaveBeenCalled();
    expect(mockGithubClient.createReviewComment).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      mockFindings[0],
    );
  });
});
