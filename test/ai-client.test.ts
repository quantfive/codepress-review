import { summarizeDiff, summarizeFindings } from "../src/ai-client";
import { ProcessableChunk } from "../src/diff-parser";
import {
  ModelConfig,
  DiffSummary,
  PRType,
  RiskTag,
  Finding,
} from "../src/types";

// Mock the ai library
jest.mock("ai", () => ({
  generateText: jest.fn(),
  APICallError: {
    isInstance: jest.fn(),
  },
}));

// Mock the AI SDK providers
jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn(() => () => "mock-openai-model"),
}));

jest.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: jest.fn(() => () => "mock-anthropic-model"),
}));

jest.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: jest.fn(() => () => "mock-google-model"),
}));

// Mock system prompt modules
jest.mock("../src/summary-agent-system-prompt", () => ({
  getSummarySystemPrompt: jest
    .fn()
    .mockReturnValue("Mock summary system prompt"),
}));

// Import the generateText mock
const { generateText } = require("ai");

describe("AI Client", () => {
  let mockModelConfig: ModelConfig;
  let mockChunks: ProcessableChunk[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console.log and console.error for cleaner test output
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    mockModelConfig = {
      provider: "openai",
      modelName: "gpt-4",
      apiKey: "test-api-key",
    };

    mockChunks = [
      {
        fileName: "src/example.ts",
        content: `--- a/src/example.ts
+++ b/src/example.ts
@@ -1,5 +1,8 @@
 function example() {
-  return "old";
+  return "new";
 }
+
+function newFunction() {
+  return "added";
+}`,
        hunk: { newStart: 1, newLines: 8, oldStart: 1, oldLines: 5 },
      },
      {
        fileName: "README.md",
        content: `--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
 # Project
 
 Description
+New line added`,
        hunk: { newStart: 1, newLines: 4, oldStart: 1, oldLines: 3 },
      },
    ];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("summarizeDiff", () => {
    it("should successfully summarize a diff with valid XML response", async () => {
      const mockXMLResponse = `
<global>
<prType>feature</prType>
<overview>
  <item>Added new function to handle user requests</item>
  <item>Updated README with additional documentation</item>
</overview>
<keyRisks>
  <item tag="TEST">No unit tests provided for new function</item>
  <item tag="PERF">New function may have performance implications</item>
</keyRisks>
<hunks>
  <hunk index="0" file="src/example.ts">
    <overview>Refactored return value and added new function</overview>
    <risks>
      <item tag="TEST">Missing test coverage</item>
    </risks>
    <tests>
      <item>Should test newFunction return value</item>
      <item>Should test backward compatibility</item>
    </tests>
  </hunk>
  <hunk index="1" file="README.md">
    <overview>Added documentation line</overview>
    <risks>
      <item tag="STYLE">Minor documentation update</item>
    </risks>
    <tests>
      <item>Verify documentation accuracy</item>
    </tests>
  </hunk>
</hunks>
</global>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: mockXMLResponse,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result).toEqual({
        prType: "feature",
        summaryPoints: [
          "Added new function to handle user requests",
          "Updated README with additional documentation",
        ],
        keyRisks: [
          {
            tag: "TEST",
            description: "No unit tests provided for new function",
          },
          {
            tag: "PERF",
            description: "New function may have performance implications",
          },
        ],
        hunks: [
          {
            index: 0,
            file: "src/example.ts",
            overview: "Refactored return value and added new function",
            risks: [{ tag: "TEST", description: "Missing test coverage" }],
            tests: [
              "Should test newFunction return value",
              "Should test backward compatibility",
            ],
          },
          {
            index: 1,
            file: "README.md",
            overview: "Added documentation line",
            risks: [
              { tag: "STYLE", description: "Minor documentation update" },
            ],
            tests: ["Verify documentation accuracy"],
          },
        ],
        decision: {
          recommendation: "COMMENT",
          reasoning: "No specific reasoning provided",
        },
      });

      expect(generateText).toHaveBeenCalledWith({
        model: "mock-openai-model",
        system: "Mock summary system prompt",
        messages: [
          {
            role: "user",
            content: expect.stringContaining(
              '<chunk index="0" file="src/example.ts">',
            ),
          },
        ],
      });
    });

    it("should handle file-based custom prompt in summarizeDiff", async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: `<prType>bugfix</prType><overview><item>Security fix</item></overview><keyRisks></keyRisks><hunks></hunks>`,
      });

      await summarizeDiff(mockChunks, mockModelConfig);

      expect(
        require("../src/summary-agent-system-prompt").getSummarySystemPrompt,
      ).toHaveBeenCalledWith();
    });

    it("should handle API errors gracefully", async () => {
      (generateText as jest.Mock).mockRejectedValue(new Error("API Error"));

      await expect(summarizeDiff(mockChunks, mockModelConfig)).rejects.toThrow(
        "API Error",
      );
    });

    it("should handle different model providers", async () => {
      const anthropicConfig: ModelConfig = {
        provider: "anthropic",
        modelName: "claude-3-sonnet",
        apiKey: "test-key",
      };

      (generateText as jest.Mock).mockResolvedValue({
        text: `<global><prType>refactor</prType><overview></overview><keyRisks></keyRisks><hunks></hunks></global>`,
      });

      const result = await summarizeDiff(mockChunks, anthropicConfig);

      expect(result.prType).toBe("refactor");
      expect(generateText).toHaveBeenCalled();
    });

    it("should handle malformed XML gracefully", async () => {
      const malformedXml = `<global>
        <prType>feature</prType>
        <overview><item>Missing closing tag</overview>
        <keyRisks><item tag="TEST">Unclosed item</keyRisks>
        <hunks>Invalid structure
      </global>`; // Missing closing tags

      (generateText as jest.Mock).mockResolvedValue({ text: malformedXml });

      const result = await summarizeDiff([], mockModelConfig);

      // The parser should handle malformed XML gracefully
      // We don't need to predict exact output, just ensure it doesn't crash
      expect(result).toBeDefined();
      expect(result.prType).toBeDefined();
      expect(Array.isArray(result.summaryPoints)).toBe(true);
      expect(Array.isArray(result.keyRisks)).toBe(true);
      expect(Array.isArray(result.hunks)).toBe(true);
      expect(result.decision).toBeDefined();
      expect(result.decision.recommendation).toBeDefined();
    });
  });

  describe("parseSummaryResponse", () => {
    // Since parseSummaryResponse is a private function, we'll test it through summarizeDiff
    // and create focused tests for the parsing logic

    it("should parse complete XML response correctly", async () => {
      const completeXML = `<global>
<prType>feature</prType>
<overview>
  <item>First summary point</item>
  <item>Second summary point</item>
  <item>Third summary point</item>
</overview>
<keyRisks>
  <item tag="SEC">Security vulnerability in authentication</item>
  <item tag="PERF">Performance degradation possible</item>
  <item tag="TEST">Missing test coverage</item>
</keyRisks>
<hunks>
  <hunk index="0" file="src/auth.ts">
    <overview>Updated authentication logic</overview>
    <risks>
      <item tag="SEC">Potential for injection</item>
    </risks>
    <tests>
      <item>Add integration tests for new logic</item>
    </tests>
  </hunk>
</hunks>
<decision>
  <recommendation>REQUEST_CHANGES</recommendation>
  <reasoning>Significant security concerns identified.</reasoning>
</decision>
</global>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: completeXML,
      });

      const result = await summarizeDiff([], mockModelConfig);

      expect(result.prType).toBe("feature");
      expect(result.summaryPoints).toHaveLength(3);
      expect(result.keyRisks).toHaveLength(3);
      expect(result.hunks).toHaveLength(1);
      expect(result.hunks[0].file).toBe("src/auth.ts");
      expect(result.hunks[0].risks).toHaveLength(1);
      expect(result.hunks[0].tests).toHaveLength(1);
      expect(result.decision.recommendation).toBe("REQUEST_CHANGES");
      expect(result.decision.reasoning).toBe(
        "Significant security concerns identified.",
      );
    });

    it("should handle empty or minimal XML response", async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "<global></global>",
      });

      const result = await summarizeDiff([], mockModelConfig);
      expect(result.prType).toBe("unknown");
      expect(result.summaryPoints).toEqual([]);
      expect(result.keyRisks).toEqual([]);
      expect(result.hunks).toEqual([]);
      expect(result.decision.recommendation).toBe("COMMENT");
    });

    it("should handle malformed XML gracefully", async () => {
      const malformedXml = `<global>
        <prType>feature</prType>
        <overview><item>Missing closing tag</overview>
        <keyRisks><item tag="TEST">Unclosed item</keyRisks>
        <hunks>Invalid structure
      </global>`; // Missing closing tags

      (generateText as jest.Mock).mockResolvedValue({ text: malformedXml });

      const result = await summarizeDiff([], mockModelConfig);

      // The parser should handle malformed XML gracefully
      // We don't need to predict exact output, just ensure it doesn't crash
      expect(result).toBeDefined();
      expect(result.prType).toBeDefined();
      expect(Array.isArray(result.summaryPoints)).toBe(true);
      expect(Array.isArray(result.keyRisks)).toBe(true);
      expect(Array.isArray(result.hunks)).toBe(true);
      expect(result.decision).toBeDefined();
      expect(result.decision.recommendation).toBeDefined();
    });
  });

  describe("summarizeFindings", () => {
    let mockRequiredFindings: Finding[];
    let mockOptionalFindings: Finding[];
    let mockNitFindings: Finding[];
    let mockFyiFindings: Finding[];
    let mockPraiseFindings: Finding[];

    beforeEach(() => {
      mockRequiredFindings = [
        {
          path: "src/auth.ts",
          line: 42,
          message:
            "Missing input validation could lead to security vulnerability",
          severity: "required",
        },
        {
          path: "src/db.ts",
          line: 15,
          message: "SQL injection risk in query construction",
          severity: "required",
        },
      ];

      mockOptionalFindings = [
        {
          path: "src/utils.ts",
          line: 23,
          message: "Consider using a more efficient algorithm here",
          severity: "optional",
        },
      ];

      mockNitFindings = [
        {
          path: "src/style.ts",
          line: 8,
          message: "Inconsistent spacing in function declaration",
          severity: "nit",
        },
      ];

      mockFyiFindings = [
        {
          path: "src/config.ts",
          line: 5,
          message: "This pattern is deprecated but still functional",
          severity: "fyi",
        },
      ];

      mockPraiseFindings = [
        {
          path: "src/test.ts",
          line: 30,
          message: "Excellent error handling implementation",
          severity: "praise",
        },
        {
          path: "src/api.ts",
          line: 67,
          message: "Great use of TypeScript generics for type safety",
          severity: "praise",
        },
      ];
    });

    it("should summarize findings from all categories successfully", async () => {
      const mockResponse = `
<summaryResponse>
<praiseSummary>The code demonstrates excellent practices with strong error handling and effective use of TypeScript features for type safety.</praiseSummary>
<requiredSummary>Critical security vulnerabilities were identified including missing input validation and SQL injection risks.</requiredSummary>
<othersSummary>Several improvement opportunities were noted including algorithm efficiency enhancements and code style consistency.</othersSummary>
</summaryResponse>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: mockResponse,
      });

      const result = await summarizeFindings(
        mockRequiredFindings,
        mockOptionalFindings,
        mockNitFindings,
        mockFyiFindings,
        mockPraiseFindings,
        mockModelConfig,
      );

      expect(result).toEqual({
        praiseSummary:
          "The code demonstrates excellent practices with strong error handling and effective use of TypeScript features for type safety.",
        requiredSummary:
          "Critical security vulnerabilities were identified including missing input validation and SQL injection risks.",
        othersSummary:
          "Several improvement opportunities were noted including algorithm efficiency enhancements and code style consistency.",
      });

      expect(generateText).toHaveBeenCalledWith({
        model: "mock-openai-model",
        system: expect.stringContaining("technical writing assistant"),
        messages: [
          {
            role: "user",
            content: expect.stringContaining("<findingsSummaryRequest>"),
          },
        ],
      });
    });

    it("should handle API errors gracefully", async () => {
      (generateText as jest.Mock).mockRejectedValue(
        new Error("API rate limit exceeded"),
      );

      const result = await summarizeFindings(
        mockRequiredFindings,
        mockOptionalFindings,
        [],
        [],
        [],
        mockModelConfig,
      );

      expect(result).toEqual({});
      expect(console.error).toHaveBeenCalledWith(
        "Failed to parse findings summary response:",
        expect.any(Error),
      );
    });

    it("should handle malformed XML response gracefully", async () => {
      const modelConfig: ModelConfig = {
        provider: "openai",
        modelName: "gpt-4",
        apiKey: "test-api-key",
      };

      // Missing closing tag for praiseSummary
      const malformedXml = `<summaryResponse>
        <requiredSummary>Security issues found</requiredSummary>
        <praiseSummary>Well done!
      </summaryResponse>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: malformedXml,
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: "stop",
      });

      const result = await summarizeFindings(
        [{ message: "sec", path: "s.js", line: 1 }],
        [],
        [],
        [],
        [{ message: "praise", path: "p.js", line: 1 }],
        modelConfig,
      );

      // The parser should handle malformed XML gracefully
      // We don't need to predict exact output, just ensure it doesn't crash
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      // The result might be empty or might contain some parsed fields
      // Either is acceptable for malformed XML
    });

    it("should return empty object on API error", async () => {
      (generateText as jest.Mock).mockRejectedValue(new Error("API Error"));

      const result = await summarizeFindings(
        mockRequiredFindings,
        mockOptionalFindings,
        mockNitFindings,
        mockFyiFindings,
        mockPraiseFindings,
        mockModelConfig,
      );

      expect(result).toEqual({});
    });

    it("should handle malformed XML response gracefully", async () => {
      const malformedXml = `<global>
        <prType>feature</prType>
        <overview><item>Missing closing tag</overview>
        <keyRisks><item tag="TEST">Unclosed item</keyRisks>
        <hunks>Invalid structure
      </global>`; // Missing closing tags

      (generateText as jest.Mock).mockResolvedValue({ text: malformedXml });

      const result = await summarizeFindings(
        mockRequiredFindings,
        mockOptionalFindings,
        mockNitFindings,
        mockFyiFindings,
        mockPraiseFindings,
        mockModelConfig,
      );

      // The parser should handle malformed XML gracefully
      // We don't need to predict exact output, just ensure it doesn't crash
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      // The result might be empty or might contain some parsed fields
      // Either is acceptable for malformed XML
    });
  });
});
