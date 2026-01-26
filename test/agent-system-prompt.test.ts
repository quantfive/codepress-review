import { getInteractiveSystemPrompt } from "../src/agent/agent-system-prompt";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Mock the fs module
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockedReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

describe("getInteractiveSystemPrompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should use default guidelines when no custom files exist", () => {
    mockedExistsSync.mockReturnValue(false);

    const prompt = getInteractiveSystemPrompt(false, 75);

    expect(prompt).toContain("autonomous code-review agent");
    expect(prompt).toContain("<reviewPrinciples>");
    expect(prompt).not.toContain("<projectRules>");
  });

  it("should replace defaults when custom-codepress-review-prompt.md exists", () => {
    const customPrompt = "# My Custom Guidelines\n\nCustom review rules here.";

    mockedExistsSync.mockImplementation((path) => {
      return (path as string).includes("custom-codepress-review-prompt.md");
    });
    mockedReadFileSync.mockReturnValue(customPrompt);

    const prompt = getInteractiveSystemPrompt(false, 75);

    expect(prompt).toContain("My Custom Guidelines");
    expect(prompt).toContain("Custom review rules here");
    expect(prompt).not.toContain("<reviewPrinciples>");
  });

  it("should append rules when codepress-review-rules.md exists", () => {
    const additionalRules =
      "## Security\n- All queries must be parameterized";

    mockedExistsSync.mockImplementation((path) => {
      return (path as string).includes("codepress-review-rules.md");
    });
    mockedReadFileSync.mockReturnValue(additionalRules);

    const prompt = getInteractiveSystemPrompt(false, 75);

    // Should have both defaults AND additional rules
    expect(prompt).toContain("<reviewPrinciples>");
    expect(prompt).toContain("<projectRules>");
    expect(prompt).toContain("All queries must be parameterized");
    expect(prompt).toContain(
      "these project-specific rules take precedence",
    );
  });

  it("should use custom prompt AND append rules when both files exist", () => {
    const customPrompt = "# Custom Base Guidelines";
    const additionalRules = "## Extra Rules\n- Must have tests";

    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockImplementation((path) => {
      if ((path as string).includes("custom-codepress-review-prompt.md")) {
        return customPrompt;
      }
      if ((path as string).includes("codepress-review-rules.md")) {
        return additionalRules;
      }
      return "";
    });

    const prompt = getInteractiveSystemPrompt(false, 75);

    // Should have custom prompt (not defaults) AND additional rules
    expect(prompt).toContain("Custom Base Guidelines");
    expect(prompt).not.toContain("<reviewPrinciples>");
    expect(prompt).toContain("<projectRules>");
    expect(prompt).toContain("Must have tests");
  });

  it("should handle errors reading custom prompt file gracefully", () => {
    mockedExistsSync.mockImplementation((path) => {
      return (path as string).includes("custom-codepress-review-prompt.md");
    });
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const consoleSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const prompt = getInteractiveSystemPrompt(false, 75);

    // Should fall back to defaults
    expect(prompt).toContain("<reviewPrinciples>");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to read custom prompt file"),
    );

    consoleSpy.mockRestore();
  });

  it("should handle errors reading rules file gracefully", () => {
    mockedExistsSync.mockImplementation((path) => {
      return (path as string).includes("codepress-review-rules.md");
    });
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const consoleSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const prompt = getInteractiveSystemPrompt(false, 75);

    // Should have defaults but no project rules section
    expect(prompt).toContain("<reviewPrinciples>");
    expect(prompt).not.toContain("<projectRules>");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to read additional rules file"),
    );

    consoleSpy.mockRestore();
  });

  it("should include blocking-only mode instructions when enabled", () => {
    mockedExistsSync.mockReturnValue(false);

    const prompt = getInteractiveSystemPrompt(true, 75);

    expect(prompt).toContain("BLOCKING-ONLY MODE");
    expect(prompt).toContain("Security vulnerabilities");
  });

  it("should include turn budget in the prompt", () => {
    mockedExistsSync.mockReturnValue(false);

    const prompt = getInteractiveSystemPrompt(false, 50);

    expect(prompt).toContain("50 turns");
  });

  it("should check for files in the current working directory", () => {
    mockedExistsSync.mockReturnValue(false);

    getInteractiveSystemPrompt(false, 75);

    expect(mockedExistsSync).toHaveBeenCalledWith(
      join(process.cwd(), "custom-codepress-review-prompt.md"),
    );
    expect(mockedExistsSync).toHaveBeenCalledWith(
      join(process.cwd(), "codepress-review-rules.md"),
    );
  });
});
