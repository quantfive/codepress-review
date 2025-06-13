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
            provider: "openai",
            modelName: "gpt-4",
            githubToken: "mock-token",
            githubRepository: "mock-owner/mock-repo",
            maxTurns: 20,
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
        expect(mockGithubClient.createReview).toHaveBeenCalledWith(1, "mock-commit-id", mockFindings, expect.stringContaining("Code Review Summary"));
    });
    it("should create a batch review with multiple findings from different chunks", async () => {
        // Arrange
        mockGithubClient.getExistingComments.mockResolvedValue([]);
        const mockFindings1 = [
            {
                path: "file1.txt",
                line: 2,
                message: "First finding",
                severity: "required",
            },
        ];
        const mockFindings2 = [
            {
                path: "file2.txt",
                line: 5,
                message: "Second finding",
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
            else if (hunkIdx === 1) {
                return Promise.resolve(mockFindings1);
            }
            else if (hunkIdx === 2) {
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
        await reviewService.execute();
        // Assert
        expect(mockGithubClient.createReview).toHaveBeenCalledWith(1, "mock-commit-id", [...mockFindings1, ...mockFindings2], // All findings combined
        expect.stringContaining("Found 2 items that need attention: 1 required, 1 optional"));
    });
    it("should handle createReview failure and fallback to individual comments", async () => {
        // Arrange
        mockGithubClient.getExistingComments.mockResolvedValue([]);
        mockGithubClient.createReview.mockRejectedValue(new Error("Review API failed"));
        mockGithubClient.createReviewComment.mockResolvedValue(undefined);
        const mockFindings = [
            {
                path: "file1.txt",
                line: 2,
                message: "A finding",
                severity: "required",
            },
        ];
        ai_client_1.callWithRetry.mockImplementation((fn, hunkIdx) => {
            if (hunkIdx === 0) {
                return Promise.resolve({
                    prType: "feature",
                    summaryPoints: ["Test summary point"],
                    keyRisks: [],
                    hunks: [],
                });
            }
            else {
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
        expect(mockGithubClient.createReview).toHaveBeenCalledWith(1, "mock-commit-id", mockFindings, expect.stringContaining("Code Review Summary"));
        // Should fallback to individual comments
        expect(mockGithubClient.createReviewComment).toHaveBeenCalledWith(1, "mock-commit-id", mockFindings[0]);
    });
    it("should not create review when no findings are found", async () => {
        // Arrange
        mockGithubClient.getExistingComments.mockResolvedValue([]);
        ai_client_1.callWithRetry.mockImplementation((fn, hunkIdx) => {
            if (hunkIdx === 0) {
                return Promise.resolve({
                    prType: "feature",
                    summaryPoints: ["Test summary point"],
                    keyRisks: [],
                    hunks: [],
                });
            }
            else {
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
        await reviewService.execute();
        // Assert
        expect(mockGithubClient.createReview).not.toHaveBeenCalled();
        expect(mockGithubClient.createReviewComment).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=review-service.test.js.map