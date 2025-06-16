import { GitHubClient } from "../src/github-client";
import { GitHubConfig, ModelConfig } from "../src/types";
import { Octokit } from "@octokit/rest";
import { CODEPRESS_REVIEW_TAG } from "../src/constants";

// Mock the entire octokit library
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    pulls: {
      getReviewComment: jest.fn(),
      updateReviewComment: jest.fn(),
    },
    graphql: jest.fn(),
  })),
}));

describe("GitHubClient", () => {
  let client: GitHubClient;
  let mockOctokit: jest.Mocked<Octokit>;

  const githubConfig: GitHubConfig = {
    owner: "test-owner",
    repo: "test-repo",
    token: "test-token",
  };

  const modelConfig: ModelConfig = {
    provider: "openai",
    modelName: "gpt-4",
    apiKey: "test-key",
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create a new client instance for each test
    client = new GitHubClient(githubConfig, modelConfig);

    // Get a reference to the mocked octokit instance used by the client
    mockOctokit = (client as any).octokit;

    // Suppress console output during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("resolveReviewComment", () => {
    const prNumber = 123;
    const commentId = 456;
    const reason = "This has been fixed.";

    it("should update comment and resolve thread when found on first page", async () => {
      // Arrange
      const originalBody = "Original comment body";
      (
        mockOctokit.pulls.getReviewComment as unknown as jest.Mock
      ).mockResolvedValue({
        data: { body: originalBody },
      });

      const threadId = "thread-id-1";
      const graphqlResponse = {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [
                {
                  id: threadId,
                  isResolved: false,
                  comments: { nodes: [{ databaseId: commentId }] },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      };
      (mockOctokit.graphql as unknown as jest.Mock).mockResolvedValue(
        graphqlResponse,
      );

      // Act
      await client.resolveReviewComment(prNumber, commentId, reason);

      // Assert
      // Check that the comment body was updated
      const expectedBody = `${originalBody}\n\n---\n✅ **Resolved by ${CODEPRESS_REVIEW_TAG}**\n> ${reason}`;
      expect(mockOctokit.pulls.updateReviewComment).toHaveBeenCalledWith({
        owner: githubConfig.owner,
        repo: githubConfig.repo,
        comment_id: commentId,
        body: expectedBody,
      });

      // Check that the find thread query was called
      expect(mockOctokit.graphql).toHaveBeenCalledWith(
        expect.stringContaining("FindReviewThread"),
        expect.anything(),
      );

      // Check that the resolve thread mutation was called
      expect(mockOctokit.graphql).toHaveBeenCalledWith(
        expect.stringContaining("ResolveReviewThread"),
        { threadId },
      );
    });

    it("should handle pagination to find the correct thread", async () => {
      // Arrange
      const originalBody = "Original comment body";
      (
        mockOctokit.pulls.getReviewComment as unknown as jest.Mock
      ).mockResolvedValue({
        data: { body: originalBody },
      });

      const threadId = "thread-id-2";
      const firstPageResponse = {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [
                {
                  id: "other-thread",
                  isResolved: false,
                  comments: { nodes: [{ databaseId: 999 }] },
                },
              ],
              pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
            },
          },
        },
      };
      const secondPageResponse = {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [
                {
                  id: threadId,
                  isResolved: false,
                  comments: { nodes: [{ databaseId: commentId }] },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      };

      (mockOctokit.graphql as unknown as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      // Act
      await client.resolveReviewComment(prNumber, commentId, reason);

      // Assert
      // Check that graphql was called twice for pagination
      expect(mockOctokit.graphql).toHaveBeenCalledTimes(3); // 2 for find, 1 for resolve

      // Check that it was called with the cursor for the second call
      expect(mockOctokit.graphql).toHaveBeenCalledWith(
        expect.stringContaining("FindReviewThread"),
        expect.objectContaining({ after: "cursor-1" }),
      );

      // Check that the resolve mutation was called
      expect(mockOctokit.graphql).toHaveBeenCalledWith(
        expect.stringContaining("ResolveReviewThread"),
        { threadId },
      );
    });

    it("should not try to resolve a thread if it is not found", async () => {
      // Arrange
      const originalBody = "Original comment body";
      (
        mockOctokit.pulls.getReviewComment as unknown as jest.Mock
      ).mockResolvedValue({
        data: { body: originalBody },
      });

      const graphqlResponse = {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      };
      (mockOctokit.graphql as unknown as jest.Mock).mockResolvedValue(
        graphqlResponse,
      );

      // Act
      await client.resolveReviewComment(prNumber, commentId, reason);

      // Assert
      // Should have been called once to find the thread, but not again to resolve it
      expect(mockOctokit.graphql).toHaveBeenCalledTimes(1);
      expect(mockOctokit.graphql).not.toHaveBeenCalledWith(
        expect.stringContaining("ResolveReviewThread"),
        expect.anything(),
      );
    });

    it("should not try to resolve a thread if it is already resolved", async () => {
      // Arrange
      const originalBody = "Original comment body";
      (
        mockOctokit.pulls.getReviewComment as unknown as jest.Mock
      ).mockResolvedValue({
        data: { body: originalBody },
      });

      const threadId = "thread-id-3";
      const graphqlResponse = {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [
                {
                  id: threadId,
                  isResolved: true,
                  comments: { nodes: [{ databaseId: commentId }] },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      };
      (mockOctokit.graphql as unknown as jest.Mock).mockResolvedValue(
        graphqlResponse,
      );

      // Act
      await client.resolveReviewComment(prNumber, commentId, reason);

      // Assert
      // Should have been called once to find the thread, but not again to resolve it
      expect(mockOctokit.graphql).toHaveBeenCalledTimes(1);
      expect(mockOctokit.graphql).not.toHaveBeenCalledWith(
        expect.stringContaining("ResolveReviewThread"),
        expect.anything(),
      );
    });
  });
});
