import { ReviewService } from "../src/review-service";
import { GitHubClient } from "../src/github-client";
import { callWithRetry, summarizeDiff } from "../src/ai-client";
import { Finding } from "../src/types";
import { CODEPRESS_REVIEW_TAG } from "../src/constants";

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
jest.mock("../src/ai-client", () => {
  const actual = jest.requireActual("../src/ai-client");
  return {
    ...actual,
    callWithRetry: jest.fn(),
    summarizeDiff: jest.fn(),
  };
});

jest.mock("../src/agent", () => ({
  reviewChunkWithAgent: jest.fn(),
}));

describe("ReviewService", () => {
  let reviewService: ReviewService;
  let mockGithubClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    // Suppress console.log and console.error
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    // Mock summarizeDiff to return a valid DiffSummary
    (summarizeDiff as jest.Mock).mockResolvedValue({
      prType: "feature",
      summaryPoints: ["Test summary point"],
      keyRisks: [],
      hunks: [],
    });

    reviewService = new ReviewService({
      pr: 1,
      diff: "mock-diff-path",
      provider: "openai",
      modelName: "gpt-4",
      githubToken: "mock-token",
      githubRepository: "mock-owner/mock-repo",
      maxTurns: 20,
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
    mockGithubClient.getExistingReviews = jest.fn().mockResolvedValue([]);
    mockGithubClient.createReview = jest.fn().mockResolvedValue(undefined);
    mockGithubClient.createReviewComment = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should skip a chunk if it has existing comments", async () => {
    // Arrange
    mockGithubClient.getExistingComments.mockResolvedValue([
      {
        path: "file1.txt",
        line: 2,
        body: `${CODEPRESS_REVIEW_TAG} - An existing comment`,
        user: { login: "github-actions[bot]" },
      },
    ] as any);

    // Mock callWithRetry to only return diff summary
    (callWithRetry as jest.Mock).mockImplementation((fn, hunkIdx) => {
      if (hunkIdx === 0) {
        // This is the summarizeDiff call
        return Promise.resolve({
          prType: "feature",
          summaryPoints: ["Test summary point"],
          keyRisks: [],
          hunks: [],
          decision: {
            recommendation: "COMMENT",
            reasoning: "No specific reasoning provided",
          },
        });
      }
      // If hunkIdx is not 0, this shouldn't be called for this test
      throw new Error("Unexpected call to callWithRetry for reviewChunk");
    });

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
    // callWithRetry should be called once for summarizeDiff, but not for reviewChunk
    expect(callWithRetry).toHaveBeenCalledTimes(1);
    expect(callWithRetry).toHaveBeenCalledWith(
      expect.any(Function),
      0, // This is the summary step
    );

    // Should create a review even with no findings since we have a decision
    expect(mockGithubClient.createReview).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      [], // No findings
      expect.objectContaining({
        decision: expect.objectContaining({
          recommendation: "COMMENT",
          reasoning: "No specific reasoning provided",
        }),
      }),
    );
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

    // Mock callWithRetry to return different values based on the hunk index
    (callWithRetry as jest.Mock).mockImplementation((fn, hunkIdx) => {
      if (hunkIdx === 0) {
        // This is the summarizeDiff call
        return Promise.resolve({
          prType: "feature",
          summaryPoints: ["Test summary point"],
          keyRisks: [],
          hunks: [],
          decision: {
            recommendation: "COMMENT",
            reasoning: "No specific reasoning provided",
          },
        });
      } else {
        // This is the reviewChunk call
        return Promise.resolve(mockFindings);
      }
    });

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
    // callWithRetry should be called at least twice: once for summarizeDiff (hunkIdx=0) and once for reviewChunk (hunkIdx=1)
    expect(callWithRetry).toHaveBeenCalledWith(expect.any(Function), 0); // summarizeDiff
    expect(callWithRetry).toHaveBeenCalledWith(expect.any(Function), 1); // reviewChunk
    expect(mockGithubClient.createReview).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      mockFindings,
      expect.objectContaining({
        prType: "feature",
        summaryPoints: ["Test summary point"],
        keyRisks: [],
        hunks: [],
        decision: expect.objectContaining({
          recommendation: expect.any(String),
          reasoning: expect.any(String),
        }),
      }),
    );
  });

  it("should create a batch review with multiple findings from different chunks", async () => {
    // Arrange
    mockGithubClient.getExistingComments.mockResolvedValue([]);

    const mockFindings1: Finding[] = [
      {
        path: "file1.txt",
        line: 2,
        message: "First finding",
        severity: "required",
      },
    ];

    const mockFindings2: Finding[] = [
      {
        path: "file2.txt",
        line: 5,
        message: "Second finding",
        severity: "optional",
      },
    ];

    // Mock callWithRetry to return different values based on the hunk index
    (callWithRetry as jest.Mock).mockImplementation((fn, hunkIdx) => {
      if (hunkIdx === 0) {
        // This is the summarizeDiff call
        return Promise.resolve({
          prType: "feature",
          summaryPoints: ["Test summary point"],
          keyRisks: [],
          hunks: [],
          decision: {
            recommendation: "COMMENT",
            reasoning: "No specific reasoning provided",
          },
        });
      } else if (hunkIdx === 1) {
        return Promise.resolve(mockFindings1);
      } else if (hunkIdx === 2) {
        return Promise.resolve(mockFindings2);
      }
      return Promise.resolve([]);
    });

    const mockChunks = [
      {
        fileName: "file1.txt",
        content: "diff --git a/file1.txt b/file1.txt...",
        hunk: { newStart: 1, newLines: 3 },
      },
      {
        fileName: "file2.txt",
        content: "diff --git a/file2.txt b/file2.txt...",
        hunk: { newStart: 4, newLines: 2 },
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
    expect(mockGithubClient.createReview).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      [...mockFindings1, ...mockFindings2], // All findings combined
      expect.objectContaining({
        prType: "feature",
        summaryPoints: ["Test summary point"],
        keyRisks: [],
        hunks: [],
        decision: expect.objectContaining({
          recommendation: expect.any(String),
          reasoning: expect.any(String),
        }),
      }),
    );
  });

  it("should handle createReview failure and fallback to individual comments", async () => {
    // Arrange
    mockGithubClient.getExistingComments.mockResolvedValue([]);
    mockGithubClient.createReview.mockRejectedValue(
      new Error("Review API failed"),
    );
    mockGithubClient.createReviewComment.mockResolvedValue(undefined);

    const mockFindings: Finding[] = [
      {
        path: "file1.txt",
        line: 2,
        message: "A finding",
        severity: "required",
      },
    ];

    (callWithRetry as jest.Mock).mockImplementation((fn, hunkIdx) => {
      if (hunkIdx === 0) {
        return Promise.resolve({
          prType: "feature",
          summaryPoints: ["Test summary point"],
          keyRisks: [],
          hunks: [],
          decision: {
            recommendation: "REQUEST_CHANGES",
            reasoning: "Issues found that need attention",
          },
        });
      } else {
        return Promise.resolve(mockFindings);
      }
    });

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
    expect(mockGithubClient.createReview).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      mockFindings,
      expect.objectContaining({
        prType: "feature",
        summaryPoints: ["Test summary point"],
        keyRisks: [],
        hunks: [],
        decision: expect.objectContaining({
          recommendation: expect.any(String),
          reasoning: expect.any(String),
        }),
      }),
    );

    // Should fallback to individual comments
    expect(mockGithubClient.createReviewComment).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      mockFindings[0],
    );
  });

  it("should create review with decision even when no findings are found", async () => {
    // Arrange
    mockGithubClient.getExistingComments.mockResolvedValue([]);

    (callWithRetry as jest.Mock).mockImplementation((fn, hunkIdx) => {
      if (hunkIdx === 0) {
        return Promise.resolve({
          prType: "feature",
          summaryPoints: ["Test summary point"],
          keyRisks: [],
          hunks: [],
          decision: {
            recommendation: "APPROVE",
            reasoning: "Code looks good overall",
          },
        });
      } else {
        return Promise.resolve([]); // No findings
      }
    });

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
    expect(mockGithubClient.createReview).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      [], // No findings
      expect.objectContaining({
        prType: "feature",
        summaryPoints: ["Test summary point"],
        keyRisks: [],
        hunks: [],
        decision: {
          recommendation: "APPROVE",
          reasoning: "Code looks good overall",
        },
      }),
    );
    expect(mockGithubClient.createReviewComment).not.toHaveBeenCalled();
  });

  it("should pass existing reviews and comments to summarizeDiff for context", async () => {
    // Arrange
    mockGithubClient.getExistingComments.mockResolvedValue([
      {
        path: "different-file.txt",
        line: 5,
        body: "Previous comment",
        user: { login: "github-actions[bot]" },
      },
    ] as any);

    const existingReview = {
      user: { login: "github-actions[bot]" },
      body: "Previous review body",
      submitted_at: "2023-01-01T00:00:00Z",
    } as any;

    mockGithubClient.getExistingReviews.mockResolvedValue([existingReview]);

    const mockFindings: Finding[] = [
      {
        path: "file1.txt",
        line: 2,
        message: "A finding",
        severity: "required",
      },
    ];

    (callWithRetry as jest.Mock).mockImplementation((fn, hunkIdx) => {
      if (hunkIdx === 0) {
        return Promise.resolve({
          prType: "feature",
          summaryPoints: ["Test summary point"],
          keyRisks: [],
          hunks: [],
          decision: {
            recommendation: "APPROVE",
            reasoning: "No specific reasoning provided",
          },
        });
      } else {
        return Promise.resolve(mockFindings);
      }
    });

    const mockChunks = [
      {
        fileName: "file1.txt",
        content: "diff --git a/file1.txt b/file1.txt...",
        hunk: { newStart: 1, newLines: 3 },
      },
    ];

    jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);
    jest
      .spyOn(require("fs"), "readFileSync")
      .mockReturnValue("mock diff content");
    jest
      .spyOn(require("../src/diff-parser"), "splitDiff")
      .mockReturnValue(mockChunks);

    // Act
    await (reviewService as any).execute();

    // Assert - Check that summarizeDiff was called with existing reviews and comments
    expect(callWithRetry).toHaveBeenCalledWith(expect.any(Function), 0);
    expect(callWithRetry).toHaveBeenCalledWith(expect.any(Function), 1);
    // Verify that both existing reviews and comments were fetched
    expect(mockGithubClient.getExistingReviews).toHaveBeenCalledWith(1);
    expect(mockGithubClient.getExistingComments).toHaveBeenCalledWith(1);
    // Verify that the review was created with the diff summary
    expect(mockGithubClient.createReview).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      mockFindings,
      expect.objectContaining({
        prType: "feature",
        summaryPoints: ["Test summary point"],
        keyRisks: [],
        hunks: [],
        decision: expect.objectContaining({
          recommendation: expect.any(String),
          reasoning: expect.any(String),
        }),
      }),
    );
  });

  it("should create review with REQUEST_CHANGES decision", async () => {
    // Arrange
    mockGithubClient.getExistingComments.mockResolvedValue([]);

    const mockFindings: Finding[] = [
      {
        path: "file1.txt",
        line: 2,
        message: "Critical security issue",
        severity: "required",
      },
    ];

    (callWithRetry as jest.Mock).mockImplementation((fn, hunkIdx) => {
      if (hunkIdx === 0) {
        return Promise.resolve({
          prType: "feature",
          summaryPoints: ["Added new authentication feature"],
          keyRisks: [{ tag: "SEC", description: "Missing input validation" }],
          hunks: [],
          decision: {
            recommendation: "REQUEST_CHANGES",
            reasoning:
              "Critical security vulnerabilities must be addressed before merge",
          },
        });
      } else {
        return Promise.resolve(mockFindings);
      }
    });

    const mockChunks = [
      {
        fileName: "file1.txt",
        content: "diff --git a/file1.txt b/file1.txt...",
        hunk: { newStart: 1, newLines: 3 },
      },
    ];

    jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);
    jest
      .spyOn(require("fs"), "readFileSync")
      .mockReturnValue("mock diff content");
    jest
      .spyOn(require("../src/diff-parser"), "splitDiff")
      .mockReturnValue(mockChunks);

    // Act
    await (reviewService as any).execute();

    // Assert
    expect(mockGithubClient.createReview).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      mockFindings,
      expect.objectContaining({
        prType: "feature",
        summaryPoints: ["Added new authentication feature"],
        keyRisks: [{ tag: "SEC", description: "Missing input validation" }],
        hunks: [],
        decision: {
          recommendation: "REQUEST_CHANGES",
          reasoning:
            "Critical security vulnerabilities must be addressed before merge",
        },
      }),
    );
  });

  it("should APPROVE PR with findings when decision is APPROVE", async () => {
    // Arrange
    mockGithubClient.getExistingComments.mockResolvedValue([]);

    const mockFindings: Finding[] = [
      {
        path: "src/utils.ts",
        line: 15,
        message: "Consider adding JSDoc for better documentation",
        severity: "optional",
      },
      {
        path: "src/utils.ts",
        line: 32,
        message: "Minor: This variable could be const instead of let",
        severity: "optional",
      },
      {
        path: "tests/utils.test.ts",
        line: 8,
        message: "Suggestion: Add edge case test for empty input",
        severity: "optional",
      },
    ];

    (callWithRetry as jest.Mock).mockImplementation((fn, hunkIdx) => {
      if (hunkIdx === 0) {
        return Promise.resolve({
          prType: "feature",
          summaryPoints: ["Added utility functions for data processing"],
          keyRisks: [
            { tag: "STYLE", description: "Minor formatting inconsistencies" },
            {
              tag: "TEST",
              description: "Could benefit from additional test coverage",
            },
          ],
          hunks: [],
          decision: {
            recommendation: "APPROVE",
            reasoning:
              "Minor suggestions don't block merge. Code quality is good overall and functionality is sound.",
          },
        });
      } else {
        return Promise.resolve(mockFindings);
      }
    });

    const mockChunks = [
      {
        fileName: "src/utils.ts",
        content: "diff --git a/src/utils.ts b/src/utils.ts...",
        hunk: { newStart: 1, newLines: 10 },
      },
    ];

    jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);
    jest
      .spyOn(require("fs"), "readFileSync")
      .mockReturnValue("mock diff content");
    jest
      .spyOn(require("../src/diff-parser"), "splitDiff")
      .mockReturnValue(mockChunks);

    // Act
    await (reviewService as any).execute();

    // Assert
    expect(mockGithubClient.createReview).toHaveBeenCalledWith(
      1,
      "mock-commit-id",
      mockFindings, // Should include all 3 findings as comments
      expect.objectContaining({
        prType: "feature",
        summaryPoints: ["Added utility functions for data processing"],
        keyRisks: [
          { tag: "STYLE", description: "Minor formatting inconsistencies" },
          {
            tag: "TEST",
            description: "Could benefit from additional test coverage",
          },
        ],
        hunks: [],
        decision: {
          recommendation: "APPROVE", // Should approve despite having findings
          reasoning:
            "Minor suggestions don't block merge. Code quality is good overall and functionality is sound.",
        },
      }),
    );

    // Verify we're calling createReview once (not falling back to individual comments)
    expect(mockGithubClient.createReview).toHaveBeenCalledTimes(1);
    expect(mockGithubClient.createReviewComment).not.toHaveBeenCalled();
  });
});
