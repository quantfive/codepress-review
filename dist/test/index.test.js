"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const index_1 = require("../src/index"); // Adjust the path to your main file
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
    let mockGetInput;
    let mockGetBooleanInput;
    let mockGetOctokit;
    let mockPullsGet;
    let mockPullsList;
    let originalContext;
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
        // Mock core.getBooleanInput
        mockGetBooleanInput = jest
            .spyOn(core, "getBooleanInput")
            .mockImplementation((name) => {
            switch (name) {
                case "update_pr_description":
                    return false;
                default:
                    return false;
            }
        });
        // Mock core.info and core.setFailed
        jest.spyOn(core, "info").mockImplementation(() => { });
        jest.spyOn(core, "setFailed").mockImplementation(() => { });
        // Mock Octokit
        mockPullsGet = jest.fn().mockResolvedValue({ data: "diff" });
        mockPullsList = jest.fn();
        mockGetOctokit = jest.spyOn(github, "getOctokit").mockReturnValue({
            rest: { pulls: { get: mockPullsGet, list: mockPullsList } },
        });
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
        await (0, index_1.run)();
        expect(core.info).toHaveBeenCalledWith("Running CodePress Review for PR #123");
        expect(mockPullsGet).toHaveBeenCalledWith(expect.objectContaining({ pull_number: 123 }));
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
        await (0, index_1.run)();
        expect(core.info).toHaveBeenCalledWith("Running CodePress Review for PR #456");
        expect(mockPullsGet).toHaveBeenCalledWith(expect.objectContaining({ pull_number: 456 }));
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
        await (0, index_1.run)();
        expect(core.info).toHaveBeenCalledWith("Workflow dispatched manually. Finding PR from branch...");
        expect(mockPullsList).toHaveBeenCalledWith({
            owner: "test-owner",
            repo: "test-repo",
            head: "test-owner:dispatch-branch",
            state: "open",
            sort: "updated",
            direction: "desc",
            per_page: 1,
        });
        expect(core.info).toHaveBeenCalledWith("Running CodePress Review for PR #789");
        expect(mockPullsGet).toHaveBeenCalledWith(expect.objectContaining({ pull_number: 789 }));
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
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("Could not find an open pull request for branch 'no-pr-branch'.");
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
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("This action must be run in the context of a pull request, a pull request comment, or a manual dispatch.");
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
        const { main: reviewMain } = await Promise.resolve().then(() => __importStar(require("../src/ai-review")));
        await (0, index_1.run)();
        expect(reviewMain).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining("pr.diff"), "diff");
    });
    it("should fail if PR number is NaN from pull_request event", async () => {
        Object.defineProperty(github, "context", {
            value: {
                repo: { owner: "test-owner", repo: "test-repo" },
                eventName: "pull_request",
                payload: { pull_request: { number: "invalid" } },
                ref: "refs/heads/feature",
            },
            writable: true,
        });
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("Could not determine a valid pull request number.");
    });
    it("should fail if PR number is undefined from pull_request event", async () => {
        Object.defineProperty(github, "context", {
            value: {
                repo: { owner: "test-owner", repo: "test-repo" },
                eventName: "pull_request",
                payload: { pull_request: { number: undefined } },
                ref: "refs/heads/feature",
            },
            writable: true,
        });
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("Could not determine a valid pull request number.");
    });
    it("should fail if PR number is NaN from issue_comment event", async () => {
        Object.defineProperty(github, "context", {
            value: {
                repo: { owner: "test-owner", repo: "test-repo" },
                eventName: "issue_comment",
                payload: {
                    issue: { number: "not-a-number", pull_request: {} },
                },
                ref: "refs/heads/feature",
            },
            writable: true,
        });
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("Could not determine a valid pull request number.");
    });
    it("should fail if workflow_dispatch GitHub API call throws an error", async () => {
        Object.defineProperty(github, "context", {
            value: {
                repo: { owner: "test-owner", repo: "test-repo" },
                eventName: "workflow_dispatch",
                payload: {},
                ref: "refs/heads/error-branch",
            },
            writable: true,
        });
        mockPullsList.mockRejectedValue(new Error("API Error"));
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("Failed to find PR for branch 'error-branch'. Error: API Error");
    });
    it("should fail if diff generation fails", async () => {
        Object.defineProperty(github, "context", {
            value: {
                repo: { owner: "test-owner", repo: "test-repo" },
                eventName: "pull_request",
                payload: { pull_request: { number: 123 } },
                ref: "refs/heads/feature",
            },
            writable: true,
        });
        mockPullsGet.mockRejectedValue(new Error("GitHub API Error"));
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("Failed to fetch diff from GitHub API: Error: GitHub API Error");
    });
    it("should handle API key validation for OpenAI", async () => {
        mockGetInput.mockImplementation((name) => {
            switch (name) {
                case "github_token":
                    return "test-token";
                case "model_provider":
                    return "openai";
                case "model_name":
                    return "gpt-4o";
                case "openai_api_key":
                    return ""; // Missing API key
                default:
                    return "";
            }
        });
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("openai_api_key is required when using OpenAI provider");
    });
    it("should handle API key validation for Anthropic", async () => {
        mockGetInput.mockImplementation((name) => {
            switch (name) {
                case "github_token":
                    return "test-token";
                case "model_provider":
                    return "anthropic";
                case "model_name":
                    return "claude-3-5-sonnet-20241022";
                case "anthropic_api_key":
                    return ""; // Missing API key
                default:
                    return "";
            }
        });
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("anthropic_api_key is required when using Anthropic provider");
    });
    it("should handle API key validation for Gemini", async () => {
        mockGetInput.mockImplementation((name) => {
            switch (name) {
                case "github_token":
                    return "test-token";
                case "model_provider":
                    return "gemini";
                case "model_name":
                    return "gemini-1.5-pro";
                case "gemini_api_key":
                    return ""; // Missing API key
                default:
                    return "";
            }
        });
        await (0, index_1.run)();
        expect(core.setFailed).toHaveBeenCalledWith("gemini_api_key is required when using Gemini provider");
    });
});
//# sourceMappingURL=index.test.js.map