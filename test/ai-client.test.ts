import { summarizeDiff } from "../src/ai-client";
import { ProcessableChunk } from "../src/diff-parser";
import { ModelConfig, DiffSummary, PRType, RiskTag } from "../src/types";

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
  <hunk index="0">
    <file>src/example.ts</file>
    <overview>Refactored return value and added new function</overview>
    <risks>
      <item tag="TEST">Missing test coverage</item>
    </risks>
    <tests>
      <item>Should test newFunction return value</item>
      <item>Should test backward compatibility</item>
    </tests>
  </hunk>
  <hunk index="1">
    <file>README.md</file>
    <overview>Added documentation line</overview>
    <risks>
      <item tag="STYLE">Minor documentation update</item>
    </risks>
    <tests>
      <item>Verify documentation accuracy</item>
    </tests>
  </hunk>
</hunks>`;

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
            issues: [],
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
            issues: [],
            tests: ["Verify documentation accuracy"],
          },
        ],
        decision: {
          recommendation: "COMMENT",
          reasoning: "No specific reasoning provided",
        },
        prDescription: undefined,
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
        text: `<prType>refactor</prType><overview></overview><keyRisks></keyRisks><hunks></hunks>`,
      });

      const result = await summarizeDiff(mockChunks, anthropicConfig);

      expect(result.prType).toBe("refactor");
      expect(generateText).toHaveBeenCalled();
    });

    it("should parse PR description from AI response", async () => {
      const mockXMLResponseWithPRDescription = `
<global>
  <prType>feature</prType>
  <overview>
    <item>Added authentication service</item>
  </overview>
  <keyRisks>
    <item tag="SEC">Authentication needs validation</item>
  </keyRisks>
  <prDescription>
    ## Add User Authentication Service

    This PR introduces a new authentication service for user login and session management.

    **Key Changes:**
    - Added AuthService class with JWT token handling
    - Integrated authentication middleware for protected routes
    - Added user session management and logout functionality

    **Review Notes:**
    - Please verify the JWT token validation logic
    - Ensure proper error handling for invalid credentials
  </prDescription>
  <decision>
    <recommendation>APPROVE</recommendation>
    <reasoning>Authentication implementation looks solid</reasoning>
  </decision>
</global>
<hunks></hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: mockXMLResponseWithPRDescription,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.prDescription).toBe(`## Add User Authentication Service

This PR introduces a new authentication service for user login and session management.

**Key Changes:**
- Added AuthService class with JWT token handling
- Integrated authentication middleware for protected routes
- Added user session management and logout functionality

**Review Notes:**
- Please verify the JWT token validation logic
- Ensure proper error handling for invalid credentials`);

      expect(result.prType).toBe("feature");
      expect(result.decision).toEqual({
        recommendation: "APPROVE",
        reasoning: "Authentication implementation looks solid",
      });
    });

    it("should handle response without PR description", async () => {
      const mockXMLResponseWithoutPRDescription = `
<global>
  <prType>bugfix</prType>
  <overview>
    <item>Fixed memory leak</item>
  </overview>
  <keyRisks></keyRisks>
  <decision>
    <recommendation>APPROVE</recommendation>
    <reasoning>Bug fix is straightforward</reasoning>
  </decision>
</global>
<hunks></hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: mockXMLResponseWithoutPRDescription,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.prDescription).toBeUndefined();
      expect(result.prType).toBe("bugfix");
    });
  });

  describe("parseSummaryResponse", () => {
    // Since parseSummaryResponse is a private function, we'll test it through summarizeDiff
    // and create focused tests for the parsing logic

    it("should parse complete XML response correctly", async () => {
      const completeXML = `
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
  <hunk index="0">
    <file>src/auth.ts</file>
    <overview>Updated authentication logic</overview>
    <risks>
      <item tag="SEC">Potential security flaw</item>
      <item tag="TEST">No tests for new auth flow</item>
    </risks>
    <tests>
      <item>Test valid credentials</item>
      <item>Test invalid credentials</item>
      <item>Test edge cases</item>
    </tests>
  </hunk>
  <hunk index="1">
    <file>src/utils.ts</file>
    <overview>Added utility functions</overview>
    <risks>
      <item tag="PERF">May impact performance</item>
    </risks>
    <tests>
      <item>Test utility function outputs</item>
    </tests>
  </hunk>
</hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: completeXML,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result).toEqual({
        prType: "feature",
        summaryPoints: [
          "First summary point",
          "Second summary point",
          "Third summary point",
        ],
        keyRisks: [
          {
            tag: "SEC",
            description: "Security vulnerability in authentication",
          },
          { tag: "PERF", description: "Performance degradation possible" },
          { tag: "TEST", description: "Missing test coverage" },
        ],
        hunks: [
          {
            index: 0,
            file: "src/auth.ts",
            overview: "Updated authentication logic",
            risks: [
              { tag: "SEC", description: "Potential security flaw" },
              { tag: "TEST", description: "No tests for new auth flow" },
            ],
            issues: [],
            tests: [
              "Test valid credentials",
              "Test invalid credentials",
              "Test edge cases",
            ],
          },
          {
            index: 1,
            file: "src/utils.ts",
            overview: "Added utility functions",
            risks: [{ tag: "PERF", description: "May impact performance" }],
            issues: [],
            tests: ["Test utility function outputs"],
          },
        ],
        decision: {
          recommendation: "COMMENT",
          reasoning: "No specific reasoning provided",
        },
        prDescription: undefined,
      });
    });

    it("should handle partial XML with missing sections", async () => {
      const partialXML = `
<prType>bugfix</prType>
<overview>
  <item>Fixed critical bug</item>
</overview>
<keyRisks>
</keyRisks>
<hunks>
  <hunk index="0">
    <file>src/bug.ts</file>
    <overview>Fixed the bug</overview>
    <risks>
    </risks>
    <tests>
    </tests>
  </hunk>
</hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: partialXML,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result).toEqual({
        prType: "bugfix",
        summaryPoints: ["Fixed critical bug"],
        keyRisks: [],
        hunks: [
          {
            index: 0,
            file: "src/bug.ts",
            overview: "Fixed the bug",
            risks: [],
            issues: [],
            tests: [],
          },
        ],
        decision: {
          recommendation: "COMMENT",
          reasoning: "No specific reasoning provided",
        },
        prDescription: undefined,
      });
    });

    it("should handle malformed XML gracefully", async () => {
      const malformedXML = `
<prType>feature
<overview>
  <item>Missing closing tag
</overview>
<keyRisks>
  <item tag="TEST">Unclosed item
<hunks>
  Invalid structure
`;

      (generateText as jest.Mock).mockResolvedValue({
        text: malformedXML,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      // Should parse what it can from malformed XML
      expect(result.prType).toBe("unknown"); // prType regex doesn't match due to missing closing tag
      expect(result.summaryPoints).toEqual([]);
      expect(result.keyRisks).toEqual([]);
      expect(result.hunks).toEqual([]);
    });

    it("should handle empty XML response", async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "",
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result).toEqual({
        prType: "unknown",
        summaryPoints: [],
        keyRisks: [],
        hunks: [],
        decision: {
          recommendation: "COMMENT",
          reasoning: "No specific reasoning provided",
        },
        prDescription: undefined,
      });
    });

    it("should handle non-XML text response", async () => {
      const plainTextResponse =
        "This is just plain text without any XML structure";

      (generateText as jest.Mock).mockResolvedValue({
        text: plainTextResponse,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result).toEqual({
        prType: "unknown",
        summaryPoints: [],
        keyRisks: [],
        hunks: [],
        decision: {
          recommendation: "COMMENT",
          reasoning: "No specific reasoning provided",
        },
        prDescription: undefined,
      });
    });

    it("should handle parsing errors with fallback values", async () => {
      // Create a response that will cause a parsing error
      const problematicXML = `<prType>feature</prType><overview><item>Valid</item></overview>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: problematicXML,
      });

      // Mock console.error to capture the error
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Temporarily mock the regex match to throw an error
      const originalMatch = String.prototype.match;
      String.prototype.match = jest.fn().mockImplementation(() => {
        throw new Error("Regex error");
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      // Restore the original method
      String.prototype.match = originalMatch;

      expect(result).toEqual({
        prType: "mixed",
        summaryPoints: ["Failed to parse summary"],
        keyRisks: [],
        hunks: [],
        decision: {
          recommendation: "COMMENT",
          reasoning: "Failed to parse summary response",
        },
        prDescription: undefined,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse summary response:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("should handle XML with invalid risk tags", async () => {
      const xmlWithInvalidTags = `
<prType>feature</prType>
<overview>
  <item>Valid summary</item>
</overview>
<keyRisks>
  <item tag="INVALID">Should still be parsed</item>
  <item tag="SEC">Valid security risk</item>
</keyRisks>
<hunks>
</hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xmlWithInvalidTags,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.keyRisks).toEqual([
        { tag: "INVALID", description: "Should still be parsed" },
        { tag: "SEC", description: "Valid security risk" },
      ]);
    });

    it("should handle XML with missing required attributes", async () => {
      const xmlWithMissingAttrs = `
<prType>feature</prType>
<overview>
  <item>Valid summary</item>
</overview>
<keyRisks>
  <item>Missing tag attribute</item>
</keyRisks>
<hunks>
  <hunk>
    <file>test.ts</file>
    <overview>Missing index attribute</overview>
    <risks></risks>
    <tests></tests>
  </hunk>
</hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xmlWithMissingAttrs,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      // Should ignore items with missing required attributes
      expect(result.keyRisks).toEqual([]);
      expect(result.hunks).toEqual([]);
    });

    it("should handle all valid PR types", async () => {
      const prTypes: PRType[] = [
        "feature",
        "bugfix",
        "refactor",
        "docs",
        "test",
        "chore",
        "dependency-bump",
        "mixed",
      ];

      for (const prType of prTypes) {
        const xml = `<prType>${prType}</prType><overview></overview><keyRisks></keyRisks><hunks></hunks>`;

        (generateText as jest.Mock).mockResolvedValue({
          text: xml,
        });

        const result = await summarizeDiff(mockChunks, mockModelConfig);
        expect(result.prType).toBe(prType);
      }
    });

    it("should handle all valid risk tags", async () => {
      const riskTags: RiskTag[] = [
        "SEC",
        "PERF",
        "ARCH",
        "TEST",
        "STYLE",
        "DEP",
      ];

      const xml = `
<prType>feature</prType>
<overview></overview>
<keyRisks>
  ${riskTags.map((tag) => `<item tag="${tag}">Risk for ${tag}</item>`).join("\n  ")}
</keyRisks>
<hunks></hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xml,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.keyRisks).toHaveLength(riskTags.length);
      riskTags.forEach((tag, index) => {
        expect(result.keyRisks[index]).toEqual({
          tag,
          description: `Risk for ${tag}`,
        });
      });
    });

    it("should parse decision recommendation correctly", async () => {
      const xmlWithDecision = `
<global>
  <prType>feature</prType>
  <overview>
    <item>Test summary</item>
  </overview>
  <keyRisks></keyRisks>
  <decision>
    <recommendation>REQUEST_CHANGES</recommendation>
    <reasoning>Critical security issues found that must be addressed.</reasoning>
  </decision>
</global>
<hunks></hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xmlWithDecision,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.decision).toEqual({
        recommendation: "REQUEST_CHANGES",
        reasoning: "Critical security issues found that must be addressed.",
      });
    });

    it("should parse all valid decision types", async () => {
      const decisionTypes = ["APPROVE", "REQUEST_CHANGES", "COMMENT"];

      for (const decisionType of decisionTypes) {
        const xmlWithDecision = `
<global>
  <prType>feature</prType>
  <overview>
    <item>Test summary</item>
  </overview>
  <keyRisks></keyRisks>
  <decision>
    <recommendation>${decisionType}</recommendation>
    <reasoning>Test reasoning for ${decisionType}.</reasoning>
  </decision>
</global>
<hunks></hunks>`;

        (generateText as jest.Mock).mockResolvedValue({
          text: xmlWithDecision,
        });

        const result = await summarizeDiff(mockChunks, mockModelConfig);

        expect(result.decision).toEqual({
          recommendation: decisionType,
          reasoning: `Test reasoning for ${decisionType}.`,
        });
      }
    });

    it("should handle invalid decision types with fallback", async () => {
      const xmlWithInvalidDecision = `
<global>
  <prType>feature</prType>
  <overview>
    <item>Test summary</item>
  </overview>
  <keyRisks></keyRisks>
  <decision>
    <recommendation>INVALID_DECISION</recommendation>
    <reasoning>This should use fallback decision.</reasoning>
  </decision>
</global>
<hunks></hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xmlWithInvalidDecision,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.decision).toEqual({
        recommendation: "COMMENT", // Should fallback to default
        reasoning: "This should use fallback decision.",
      });
    });

    it("should parse issues in hunks correctly", async () => {
      const xmlWithIssues = `
<prType>feature</prType>
<overview>
  <item>Added new authentication module</item>
</overview>
<keyRisks></keyRisks>
<hunks>
  <hunk index="0">
    <file>src/auth.ts</file>
    <overview>New authentication logic</overview>
    <risks></risks>
    <issues>
      <issue severity="high" kind="security">SQL injection vulnerability in login query</issue>
      <issue severity="medium" kind="performance">Inefficient password hashing algorithm</issue>
      <issue severity="low" kind="style">Missing JSDoc comments on public methods</issue>
    </issues>
    <tests></tests>
  </hunk>
</hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xmlWithIssues,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.hunks).toHaveLength(1);
      expect(result.hunks[0].issues).toEqual([
        {
          severity: "high",
          kind: "security",
          description: "SQL injection vulnerability in login query",
        },
        {
          severity: "medium",
          kind: "performance",
          description: "Inefficient password hashing algorithm",
        },
        {
          severity: "low",
          kind: "style",
          description: "Missing JSDoc comments on public methods",
        },
      ]);
    });

    it("should handle issues with missing attributes gracefully", async () => {
      const xmlWithInvalidIssues = `
<prType>feature</prType>
<overview>
  <item>Test summary</item>
</overview>
<keyRisks></keyRisks>
<hunks>
  <hunk index="0">
    <file>src/test.ts</file>
    <overview>Test overview</overview>
    <risks></risks>
    <issues>
      <issue severity="high" kind="security">Valid issue with all attributes</issue>
      <issue severity="medium">Missing kind attribute</issue>
      <issue kind="performance">Missing severity attribute</issue>
      <issue>Missing both severity and kind attributes</issue>
    </issues>
    <tests></tests>
  </hunk>
</hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xmlWithInvalidIssues,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.hunks).toHaveLength(1);
      // Should only include the issue with all required attributes
      expect(result.hunks[0].issues).toEqual([
        {
          severity: "high",
          kind: "security",
          description: "Valid issue with all attributes",
        },
      ]);
    });

    it("should handle multiple hunks with different issues", async () => {
      const xmlWithMultipleHunksAndIssues = `
<prType>refactor</prType>
<overview>
  <item>Refactored user management and database layer</item>
</overview>
<keyRisks></keyRisks>
<hunks>
  <hunk index="0">
    <file>src/user.ts</file>
    <overview>Refactored user validation</overview>
    <risks></risks>
    <issues>
      <issue severity="critical" kind="security">Weak password validation allows dictionary attacks</issue>
      <issue severity="high" kind="logic">Email validation regex doesn't handle edge cases</issue>
    </issues>
    <tests></tests>
  </hunk>
  <hunk index="1">
    <file>src/database.ts</file>
    <overview>Updated database connection handling</overview>
    <risks></risks>
    <issues>
      <issue severity="medium" kind="performance">Connection pool size may be insufficient</issue>
      <issue severity="low" kind="maintainability">Complex nested callbacks should use async/await</issue>
    </issues>
    <tests></tests>
  </hunk>
</hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xmlWithMultipleHunksAndIssues,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.hunks).toHaveLength(2);

      expect(result.hunks[0].issues).toEqual([
        {
          severity: "critical",
          kind: "security",
          description: "Weak password validation allows dictionary attacks",
        },
        {
          severity: "high",
          kind: "logic",
          description: "Email validation regex doesn't handle edge cases",
        },
      ]);

      expect(result.hunks[1].issues).toEqual([
        {
          severity: "medium",
          kind: "performance",
          description: "Connection pool size may be insufficient",
        },
        {
          severity: "low",
          kind: "maintainability",
          description: "Complex nested callbacks should use async/await",
        },
      ]);
    });

    it("should handle empty issues blocks", async () => {
      const xmlWithEmptyIssues = `
<prType>bugfix</prType>
<overview>
  <item>Fixed minor styling issue</item>
</overview>
<keyRisks></keyRisks>
<hunks>
  <hunk index="0">
    <file>src/styles.css</file>
    <overview>Updated margin values</overview>
    <risks></risks>
    <issues></issues>
    <tests></tests>
  </hunk>
</hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xmlWithEmptyIssues,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.hunks).toHaveLength(1);
      expect(result.hunks[0].issues).toEqual([]);
    });

    it("should handle hunks with both risks and issues", async () => {
      const xmlWithBothRisksAndIssues = `
<prType>feature</prType>
<overview>
  <item>Added payment processing module</item>
</overview>
<keyRisks></keyRisks>
<hunks>
  <hunk index="0">
    <file>src/payment.ts</file>
    <overview>New payment processing logic</overview>
    <risks>
      <item tag="SEC">Payment data handling needs security review</item>
      <item tag="TEST">Missing integration tests for payment flows</item>
    </risks>
    <issues>
      <issue severity="critical" kind="security">Credit card numbers stored in plain text</issue>
      <issue severity="high" kind="compliance">PCI DSS compliance requirements not met</issue>
      <issue severity="medium" kind="error-handling">Missing error handling for failed transactions</issue>
    </issues>
    <tests>
      <item>Test successful payment processing</item>
      <item>Test payment failure scenarios</item>
    </tests>
  </hunk>
</hunks>`;

      (generateText as jest.Mock).mockResolvedValue({
        text: xmlWithBothRisksAndIssues,
      });

      const result = await summarizeDiff(mockChunks, mockModelConfig);

      expect(result.hunks).toHaveLength(1);

      // Verify both risks and issues are parsed correctly
      expect(result.hunks[0].risks).toEqual([
        {
          tag: "SEC",
          description: "Payment data handling needs security review",
        },
        {
          tag: "TEST",
          description: "Missing integration tests for payment flows",
        },
      ]);

      expect(result.hunks[0].issues).toEqual([
        {
          severity: "critical",
          kind: "security",
          description: "Credit card numbers stored in plain text",
        },
        {
          severity: "high",
          kind: "compliance",
          description: "PCI DSS compliance requirements not met",
        },
        {
          severity: "medium",
          kind: "error-handling",
          description: "Missing error handling for failed transactions",
        },
      ]);

      expect(result.hunks[0].tests).toEqual([
        "Test successful payment processing",
        "Test payment failure scenarios",
      ]);
    });
  });
});
