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
const review_service_1 = require("../src/review-service");
const agent = __importStar(require("../src/agent"));
const config = __importStar(require("../src/config"));
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
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });
        jest.spyOn(console, "warn").mockImplementation(() => { });
        // Setup config mocks
        config.getModelConfig.mockReturnValue({
            provider: "openai",
            modelName: "gpt-4",
            apiKey: "test-key",
        });
        // Setup fs mocks
        fs.existsSync.mockReturnValue(false);
        fs.readFileSync.mockReturnValue(`
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
        execSync.mockReturnValue("src/test.ts\nsrc/other.ts\n");
        // Setup environment
        process.env.COMMIT_SHA = "abc123";
    });
    afterEach(() => {
        jest.restoreAllMocks();
        delete process.env.COMMIT_SHA;
    });
    describe("execute", () => {
        it("should call reviewFullDiff with the complete diff and PR context", async () => {
            agent.reviewFullDiff.mockResolvedValue(undefined);
            const service = new review_service_1.ReviewService(mockReviewConfig);
            await service.execute();
            expect(agent.reviewFullDiff).toHaveBeenCalledTimes(1);
            expect(agent.reviewFullDiff).toHaveBeenCalledWith(expect.stringContaining("diff --git"), expect.any(Object), // modelConfig
            expect.any(Array), // repoFilePaths
            expect.objectContaining({
                repo: "owner/repo",
                prNumber: 123,
                commitSha: "abc123",
            }), // prContext
            20, // maxTurns
            false);
        });
        it("should pass blockingOnly flag to agent", async () => {
            const blockingConfig = { ...mockReviewConfig, blockingOnly: true };
            agent.reviewFullDiff.mockResolvedValue(undefined);
            const service = new review_service_1.ReviewService(blockingConfig);
            await service.execute();
            expect(agent.reviewFullDiff).toHaveBeenCalledWith(expect.any(String), expect.any(Object), expect.any(Array), expect.any(Object), 20, true);
        });
        it("should filter files by .codepressignore patterns", async () => {
            fs.existsSync.mockImplementation((path) => {
                return path === ".codepressignore";
            });
            fs.readFileSync.mockImplementation((path) => {
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
            agent.reviewFullDiff.mockResolvedValue(undefined);
            const service = new review_service_1.ReviewService(mockReviewConfig);
            await service.execute();
            // The diff should be filtered to exclude ignored files but include non-ignored
            expect(agent.reviewFullDiff).toHaveBeenCalled();
            const callArgs = agent.reviewFullDiff.mock.calls[0];
            expect(callArgs[0]).not.toContain("test.test.ts");
            expect(callArgs[0]).toContain("main.ts");
        });
        it("should not call agent when all files are ignored", async () => {
            fs.existsSync.mockImplementation((path) => {
                return path === ".codepressignore";
            });
            fs.readFileSync.mockImplementation((path) => {
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
            const service = new review_service_1.ReviewService(mockReviewConfig);
            await service.execute();
            // Agent should not be called when all files are filtered out
            expect(agent.reviewFullDiff).not.toHaveBeenCalled();
        });
        it("should warn when COMMIT_SHA is not set", async () => {
            delete process.env.COMMIT_SHA;
            agent.reviewFullDiff.mockResolvedValue(undefined);
            const service = new review_service_1.ReviewService(mockReviewConfig);
            await service.execute();
            expect(console.error).toHaveBeenCalledWith("COMMIT_SHA not set - agent will not be able to post inline comments");
        });
        it("should handle agent errors gracefully", async () => {
            agent.reviewFullDiff.mockRejectedValue(new Error("Agent failed"));
            const service = new review_service_1.ReviewService(mockReviewConfig);
            await service.execute();
            expect(console.error).toHaveBeenCalledWith("Review failed:", "Agent failed");
        });
    });
});
//# sourceMappingURL=review-service.test.js.map