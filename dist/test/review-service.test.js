"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const review_service_1 = require("../src/review-service");
const github_client_1 = require("../src/github-client");
const ai_client_1 = require("../src/ai-client");
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
jest.mock("../src/ai-client", () => ({
    callWithRetry: jest.fn(),
    reviewChunk: jest.fn(),
    summarizeDiff: jest.fn(),
}));
describe("ReviewService", () => {
    let reviewService;
    let mockGithubClient;
    beforeEach(() => {
        // Suppress console.log and console.error
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });
        jest.spyOn(console, "warn").mockImplementation(() => { });
        // Mock summarizeDiff to return a valid DiffSummary
        ai_client_1.summarizeDiff.mockResolvedValue({
            prType: "feature",
            summaryPoints: ["Test summary point"],
            keyRisks: [],
            hunks: [],
        });
        reviewService = new review_service_1.ReviewService({
            pr: 1,
            diff: "mock-diff-path",
            customPrompt: "",
            provider: "openai",
            modelName: "gpt-4",
            githubToken: "mock-token",
            githubRepository: "mock-owner/mock-repo",
        });
        // Mock the dependencies
        mockGithubClient = new github_client_1.GitHubClient({
            token: "mock-token",
            owner: "mock-owner",
            repo: "mock-repo",
        });
        reviewService.githubClient = mockGithubClient;
        mockGithubClient.getPRInfo.mockResolvedValue({
            commitId: "mock-commit-id",
            prInfo: {},
        });
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
                body: "An existing comment",
                user: { login: "github-actions[bot]" },
            },
        ]);
        // Mock callWithRetry to only return diff summary
        ai_client_1.callWithRetry.mockImplementation((fn, hunkIdx) => {
            if (hunkIdx === 0) {
                // This is the summarizeDiff call
                return Promise.resolve({
                    prType: "feature",
                    summaryPoints: ["Test summary point"],
                    keyRisks: [],
                    hunks: [],
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
        await reviewService.execute();
        // Assert
        // callWithRetry should be called once for summarizeDiff, but not for reviewChunk
        expect(ai_client_1.callWithRetry).toHaveBeenCalledTimes(1);
        expect(ai_client_1.callWithRetry).toHaveBeenCalledWith(expect.any(Function), 0);
    });
    it("should process a chunk without existing comments", async () => {
        // Arrange
        mockGithubClient.getExistingComments.mockResolvedValue([]);
        const mockFindings = [
            {
                path: "file1.txt",
                line: 2,
                message: "A new finding",
                severity: "optional",
            },
        ];
        // Mock callWithRetry to return different values based on the hunk index
        ai_client_1.callWithRetry.mockImplementation((fn, hunkIdx) => {
            if (hunkIdx === 0) {
                // This is the summarizeDiff call
                return Promise.resolve({
                    prType: "feature",
                    summaryPoints: ["Test summary point"],
                    keyRisks: [],
                    hunks: [],
                });
            }
            else {
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
        await reviewService.execute();
        // Assert
        // callWithRetry should be called at least twice: once for summarizeDiff (hunkIdx=0) and once for reviewChunk (hunkIdx=1)
        expect(ai_client_1.callWithRetry).toHaveBeenCalledWith(expect.any(Function), 0); // summarizeDiff
        expect(ai_client_1.callWithRetry).toHaveBeenCalledWith(expect.any(Function), 1); // reviewChunk
        expect(mockGithubClient.createReviewComment).toHaveBeenCalledWith(1, "mock-commit-id", mockFindings[0]);
    });
});
//# sourceMappingURL=review-service.test.js.map