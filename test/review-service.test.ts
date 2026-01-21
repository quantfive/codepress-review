// Mock jsdom and turndown before importing anything that uses them
jest.mock("jsdom", () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: {
      document: {
        querySelectorAll: jest.fn().mockReturnValue([]),
        querySelector: jest.fn().mockReturnValue(null),
        body: { innerHTML: "" },
      },
    },
  })),
}));
jest.mock("turndown", () => {
  return jest.fn().mockImplementation(() => ({
    turndown: jest.fn().mockReturnValue(""),
  }));
});

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
    (fs.readFileSync as jest.Mock).mockReturnValue("[]");

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
    it("should call reviewFullDiff with PR context (agent fetches diff)", async () => {
      (agent.reviewFullDiff as jest.Mock).mockResolvedValue(undefined);

      const service = new ReviewService(mockReviewConfig);
      await service.execute();

      expect(agent.reviewFullDiff).toHaveBeenCalledTimes(1);
      // The new signature: (modelConfig, repoFilePaths, prContext, maxTurns, blockingOnly, existingComments)
      expect(agent.reviewFullDiff).toHaveBeenCalledWith(
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
        expect.any(Object),
        expect.any(Array),
        expect.any(Object),
        20,
        true, // blockingOnly should be true
        [], // existingComments
      );
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
