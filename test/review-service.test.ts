import { ReviewService } from "../src/review-service";
import * as agent from "../src/agent";
import * as config from "../src/config";

// Mock dependencies
jest.mock("../src/agent");
jest.mock("../src/config");
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
  const mockReviewConfig = {
    diff: "/tmp/test.diff",
    pr: 123,
    provider: "openai",
    modelName: "gpt-4",
    githubToken: "test-token",
    githubRepository: "owner/repo",
    maxTurns: 20,
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
    (config.getModelConfig as jest.Mock).mockReturnValue({
      provider: "openai",
      modelName: "gpt-4",
      apiKey: "test-key",
    });

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

    // Setup environment
    process.env.COMMIT_SHA = "abc123";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.COMMIT_SHA;
  });

  describe("execute", () => {
    it("should call reviewFullDiff with the complete diff and PR context", async () => {
      (agent.reviewFullDiff as jest.Mock).mockResolvedValue(undefined);

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      expect(agent.reviewFullDiff).toHaveBeenCalledTimes(1);
      expect(agent.reviewFullDiff).toHaveBeenCalledWith(
        expect.stringContaining("diff --git"),
        expect.any(Object), // modelConfig
        expect.any(Array), // repoFilePaths
        expect.objectContaining({
          repo: "owner/repo",
          prNumber: 123,
          commitSha: "abc123",
        }), // prContext
        20, // maxTurns
        false, // blockingOnly
        [], // existingComments (empty when no pr-comments.json)
      );
    });

    it("should pass blockingOnly flag to agent", async () => {
      const blockingConfig = { ...mockReviewConfig, blockingOnly: true };

      (agent.reviewFullDiff as jest.Mock).mockResolvedValue(undefined);

      const service = new ReviewService(blockingConfig);
      await service.execute();

      expect(agent.reviewFullDiff).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Array),
        expect.any(Object),
        20,
        true, // blockingOnly should be true
        [], // existingComments
      );
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

      (agent.reviewFullDiff as jest.Mock).mockResolvedValue(undefined);

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      // The diff should be filtered to exclude ignored files but include non-ignored
      expect(agent.reviewFullDiff).toHaveBeenCalled();
      const callArgs = (agent.reviewFullDiff as jest.Mock).mock.calls[0];
      expect(callArgs[0]).not.toContain("test.test.ts");
      expect(callArgs[0]).toContain("main.ts");
    });

    it("should not call agent when all files are ignored", async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === ".codepressignore";
      });
      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path === ".codepressignore") {
          return "*.ts";
        }
        return `
diff --git a/src/test.ts b/src/test.ts
--- a/src/test.ts
+++ b/src/test.ts
@@ -1 +1 @@
-old
+new
`;
      });

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      // Agent should not be called when all files are filtered out
      expect(agent.reviewFullDiff).not.toHaveBeenCalled();
    });

    it("should warn when COMMIT_SHA is not set", async () => {
      delete process.env.COMMIT_SHA;

      (agent.reviewFullDiff as jest.Mock).mockResolvedValue(undefined);

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      expect(console.error).toHaveBeenCalledWith(
        "COMMIT_SHA not set - agent will not be able to post inline comments",
      );
    });

    it("should handle agent errors gracefully", async () => {
      (agent.reviewFullDiff as jest.Mock).mockRejectedValue(
        new Error("Agent failed"),
      );

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      expect(console.error).toHaveBeenCalledWith(
        "Review failed:",
        "Agent failed",
      );
    });
  });
});
