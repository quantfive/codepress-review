import { ReviewService } from "../src/review-service";
import * as agent from "../src/agent";
import * as config from "../src/config";
import { GitHubClient } from "../src/github-client";

// Mock octokit first (before importing anything that uses it)
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({})),
}));

// Mock dependencies
jest.mock("../src/agent");
jest.mock("../src/config");
jest.mock("../src/github-client");
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));
jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

const fs = require("fs");
const { execSync } = require("child_process");

describe("ReviewService", () => {
  let mockGitHubClient: jest.Mocked<GitHubClient>;

  const mockReviewConfig = {
    diff: "/tmp/test.diff",
    pr: 123,
    provider: "openai",
    modelName: "gpt-4",
    githubToken: "test-token",
    githubRepository: "owner/repo",
    maxTurns: 20,
    updatePrDescription: false,
    debug: false,
    blockingOnly: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console output
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    // Setup config mocks
    (config.getGitHubConfig as jest.Mock).mockReturnValue({
      owner: "owner",
      repo: "repo",
      token: "test-token",
    });
    (config.getModelConfig as jest.Mock).mockReturnValue({
      provider: "openai",
      modelName: "gpt-4",
      apiKey: "test-key",
    });

    // Setup GitHubClient mock
    mockGitHubClient = {
      getPRInfo: jest.fn().mockResolvedValue({ commitId: "abc123" }),
      getExistingComments: jest.fn().mockResolvedValue([]),
      getExistingReviews: jest.fn().mockResolvedValue([]),
      createReview: jest.fn().mockResolvedValue(undefined),
      createReviewComment: jest.fn().mockResolvedValue(undefined),
      resolveReviewComment: jest.fn().mockResolvedValue(undefined),
      updatePRDescription: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<GitHubClient>;
    (GitHubClient as jest.Mock).mockImplementation(() => mockGitHubClient);

    // Setup fs mocks
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue(`
diff --git a/src/test.ts b/src/test.ts
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,4 @@
 function test() {
+  console.log("hello");
   return true;
 }
`);

    // Setup execSync mock for git ls-files
    (execSync as jest.Mock).mockReturnValue("src/test.ts\nsrc/other.ts\n");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("execute", () => {
    it("should call reviewFullDiff with the complete diff", async () => {
      (agent.reviewFullDiff as jest.Mock).mockResolvedValue({
        findings: [],
        resolvedComments: [],
      });

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      expect(agent.reviewFullDiff).toHaveBeenCalledTimes(1);
      expect(agent.reviewFullDiff).toHaveBeenCalledWith(
        expect.stringContaining("diff --git"),
        expect.any(Object), // modelConfig
        expect.any(Array), // repoFilePaths
        expect.any(Array), // existingComments
        20, // maxTurns
        false // blockingOnly
      );
    });

    it("should create a review when findings are returned", async () => {
      (agent.reviewFullDiff as jest.Mock).mockResolvedValue({
        findings: [
          {
            path: "src/test.ts",
            line: 2,
            message: "Consider using a logger",
            severity: "optional",
          },
        ],
        resolvedComments: [],
      });

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      expect(mockGitHubClient.createReview).toHaveBeenCalledWith(
        123,
        "abc123",
        expect.arrayContaining([
          expect.objectContaining({
            path: "src/test.ts",
            line: 2,
          }),
        ]),
        undefined
      );
    });

    it("should not create a review when no findings are returned", async () => {
      (agent.reviewFullDiff as jest.Mock).mockResolvedValue({
        findings: [],
        resolvedComments: [],
      });

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      expect(mockGitHubClient.createReview).not.toHaveBeenCalled();
    });

    it("should resolve comments when resolvedComments are returned", async () => {
      (agent.reviewFullDiff as jest.Mock).mockResolvedValue({
        findings: [],
        resolvedComments: [
          {
            commentId: "12345",
            path: "src/test.ts",
            line: 1,
            reason: "Issue has been fixed",
          },
        ],
      });

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      expect(mockGitHubClient.resolveReviewComment).toHaveBeenCalledWith(
        123,
        12345,
        "Issue has been fixed"
      );
    });

    it("should filter out fyi and praise severity findings", async () => {
      (agent.reviewFullDiff as jest.Mock).mockResolvedValue({
        findings: [
          {
            path: "src/test.ts",
            line: 1,
            message: "Great job!",
            severity: "praise",
          },
          {
            path: "src/test.ts",
            line: 2,
            message: "FYI note",
            severity: "fyi",
          },
          {
            path: "src/test.ts",
            line: 3,
            message: "Bug found",
            severity: "required",
          },
        ],
        resolvedComments: [],
      });

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      expect(mockGitHubClient.createReview).toHaveBeenCalledWith(
        123,
        "abc123",
        expect.arrayContaining([
          expect.objectContaining({
            line: 3,
            severity: "required",
          }),
        ]),
        undefined
      );

      // Verify the filtered findings don't include praise or fyi
      const findings = (mockGitHubClient.createReview as jest.Mock).mock
        .calls[0][2];
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe("required");
    });

    it("should skip duplicate comments on same line", async () => {
      mockGitHubClient.getExistingComments.mockResolvedValue([
        {
          path: "src/test.ts",
          line: 2,
          body: "<!-- CodePress Review -->Existing comment",
        } as any,
      ]);

      (agent.reviewFullDiff as jest.Mock).mockResolvedValue({
        findings: [
          {
            path: "src/test.ts",
            line: 2,
            message: "New comment on same line",
            severity: "required",
          },
        ],
        resolvedComments: [],
      });

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      // Should not create review since the only finding was filtered as duplicate
      expect(mockGitHubClient.createReview).not.toHaveBeenCalled();
    });

    it("should filter to only required severity in blockingOnly mode", async () => {
      const blockingConfig = { ...mockReviewConfig, blockingOnly: true };

      (agent.reviewFullDiff as jest.Mock).mockResolvedValue({
        findings: [
          {
            path: "src/test.ts",
            line: 1,
            message: "Optional improvement",
            severity: "optional",
          },
          {
            path: "src/test.ts",
            line: 2,
            message: "Must fix bug",
            severity: "required",
          },
          {
            path: "src/test.ts",
            line: 3,
            message: "Nit pick",
            severity: "nit",
          },
        ],
        resolvedComments: [],
      });

      const service = new ReviewService(blockingConfig);
      await service.execute();

      const findings = (mockGitHubClient.createReview as jest.Mock).mock
        .calls[0][2];
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe("required");
    });

    it("should deduplicate similar findings", async () => {
      (agent.reviewFullDiff as jest.Mock).mockResolvedValue({
        findings: [
          {
            path: "src/test.ts",
            line: 1,
            message: "Consider adding error handling",
            severity: "optional",
          },
          {
            path: "src/other.ts",
            line: 5,
            message: "Consider adding error handling",
            severity: "optional",
          },
        ],
        resolvedComments: [],
      });

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      const findings = (mockGitHubClient.createReview as jest.Mock).mock
        .calls[0][2];
      // Should be deduplicated to one finding with annotation
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain("applies to 2 similar spots");
    });

    it("should filter files by .codepressignore patterns", async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === ".codepressignore";
      });
      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path === ".codepressignore") {
          return "*.test.ts\ndist/";
        }
        // Diff with both ignored and non-ignored files
        return `
diff --git a/src/test.test.ts b/src/test.test.ts
--- a/src/test.test.ts
+++ b/src/test.test.ts
@@ -1 +1 @@
-old
+new
diff --git a/src/main.ts b/src/main.ts
--- a/src/main.ts
+++ b/src/main.ts
@@ -1 +1 @@
-old
+new
`;
      });

      (agent.reviewFullDiff as jest.Mock).mockResolvedValue({
        findings: [],
        resolvedComments: [],
      });

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      // The diff should be filtered to exclude ignored files but include non-ignored
      expect(agent.reviewFullDiff).toHaveBeenCalled();
      const callArgs = (agent.reviewFullDiff as jest.Mock).mock.calls[0];
      expect(callArgs[0]).not.toContain("test.test.ts");
      expect(callArgs[0]).toContain("main.ts");
    });
  });
});
