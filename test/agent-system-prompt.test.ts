import { getSystemPrompt, getInteractiveSystemPrompt, INTERACTIVE_SYSTEM_PROMPT } from "../src/agent/agent-system-prompt";

describe("getSystemPrompt", () => {
  it("should return a minimal system prompt", () => {
    const prompt = getSystemPrompt();

    // Should identify the agent
    expect(prompt).toContain("CodePress");
    expect(prompt).toContain("code review assistant");

    // Should mention the skill tool
    expect(prompt).toContain("skill");
    expect(prompt).toContain("review-full");
    expect(prompt).toContain("answer-question");
    expect(prompt).toContain("review-targeted");

    // Should describe the completion schema
    expect(prompt).toContain("completed");
    expect(prompt).toContain("summary");
    expect(prompt).toContain("verdict");
  });

  it("should include all skill names for reference", () => {
    const prompt = getSystemPrompt();

    expect(prompt).toContain("review-full");
    expect(prompt).toContain("answer-question");
    expect(prompt).toContain("review-targeted");
  });

  it("should describe the completion JSON schema", () => {
    const prompt = getSystemPrompt();

    expect(prompt).toContain('"completed": true');
    expect(prompt).toContain("APPROVE");
    expect(prompt).toContain("REQUEST_CHANGES");
    expect(prompt).toContain("COMMENT");
    expect(prompt).toContain("NONE");
  });
});

describe("getInteractiveSystemPrompt (backward compatibility)", () => {
  it("should return the minimal system prompt regardless of parameters", () => {
    const prompt1 = getInteractiveSystemPrompt(false, 75);
    const prompt2 = getInteractiveSystemPrompt(true, 50);
    const prompt3 = getInteractiveSystemPrompt(false, null);

    // All should return the same minimal prompt
    expect(prompt1).toBe(prompt2);
    expect(prompt2).toBe(prompt3);
    expect(prompt1).toContain("CodePress");
  });

  it("should equal INTERACTIVE_SYSTEM_PROMPT constant", () => {
    const prompt = getInteractiveSystemPrompt(false, null);
    expect(prompt).toBe(INTERACTIVE_SYSTEM_PROMPT);
  });
});
