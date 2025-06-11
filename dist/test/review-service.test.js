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
jest.mock("../src/ai-client");
describe("ReviewService", () => {
    let reviewService;
    let mockGithubClient;
    beforeEach(() => {
        // Suppress console.log and console.error
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });
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
        const existingComments = new Map();
        existingComments.set("file1.txt", new Set([2]));
        mockGithubClient.getExistingComments.mockResolvedValue([
            {
                path: "file1.txt",
                line: 2,
                body: "An existing comment",
                user: { login: "github-actions[bot]" },
            },
        ]);
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
        expect(ai_client_1.callWithRetry).not.toHaveBeenCalled();
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
        ai_client_1.callWithRetry.mockResolvedValue(mockFindings);
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
        expect(ai_client_1.callWithRetry).toHaveBeenCalled();
        expect(mockGithubClient.createReviewComment).toHaveBeenCalledWith(1, "mock-commit-id", mockFindings[0]);
    });
});
//# sourceMappingURL=review-service.test.js.map