import { allSkills, getSkillByName, reviewFullSkill, answerQuestionSkill, reviewTargetedSkill } from "../src/agent/skills";
import type { SkillContext } from "../src/agent/skills/types";

describe("Skills Registry", () => {
  it("should export all skills", () => {
    expect(allSkills).toHaveLength(3);
    expect(allSkills).toContain(reviewFullSkill);
    expect(allSkills).toContain(answerQuestionSkill);
    expect(allSkills).toContain(reviewTargetedSkill);
  });

  it("should find skills by name", () => {
    expect(getSkillByName("review-full")).toBe(reviewFullSkill);
    expect(getSkillByName("answer-question")).toBe(answerQuestionSkill);
    expect(getSkillByName("review-targeted")).toBe(reviewTargetedSkill);
    expect(getSkillByName("nonexistent")).toBeUndefined();
  });
});

describe("review-full skill", () => {
  const baseContext: SkillContext = {
    repo: "owner/repo",
    prNumber: 123,
    commitSha: "abc123",
    repoFilePaths: ["src/index.ts", "src/utils.ts"],
  };

  it("should have correct name and description", () => {
    expect(reviewFullSkill.name).toBe("review-full");
    expect(reviewFullSkill.description).toContain("complete code review");
  });

  it("should generate instructions with PR context", () => {
    const instructions = reviewFullSkill.getInstructions(baseContext);

    expect(instructions).toContain("PR #123");
    expect(instructions).toContain("owner/repo");
    expect(instructions).toContain("abc123");
  });

  it("should include blocking mode instructions when enabled", () => {
    const blockingContext: SkillContext = {
      ...baseContext,
      blockingOnly: true,
    };

    const instructions = reviewFullSkill.getInstructions(blockingContext);

    expect(instructions).toContain("BLOCKING-ONLY MODE");
    expect(instructions).toContain("CRITICAL");
  });

  it("should include turn budget when specified", () => {
    const context: SkillContext = {
      ...baseContext,
      maxTurns: 50,
    };

    const instructions = reviewFullSkill.getInstructions(context);

    expect(instructions).toContain("50 turns");
  });

  it("should indicate unlimited turns when maxTurns is null", () => {
    const context: SkillContext = {
      ...baseContext,
      maxTurns: null,
    };

    const instructions = reviewFullSkill.getInstructions(context);

    expect(instructions).toContain("unlimited turns");
  });

  it("should include re-review context when applicable", () => {
    const context: SkillContext = {
      ...baseContext,
      triggerContext: {
        isReReview: true,
        triggerEvent: "synchronize",
        previousReviewState: "APPROVED",
        previousReviewCommitSha: "def456",
      },
    };

    const instructions = reviewFullSkill.getInstructions(context);

    expect(instructions).toContain("RE-REVIEW");
  });

  it("should include force full review context when applicable", () => {
    const context: SkillContext = {
      ...baseContext,
      triggerContext: {
        isReReview: true,
        triggerEvent: "comment_trigger",
        forceFullReview: true,
      },
    };

    const instructions = reviewFullSkill.getInstructions(context);

    expect(instructions).toContain("FULL REVIEW MODE ENABLED");
  });

  it("should include review guidelines", () => {
    const instructions = reviewFullSkill.getInstructions(baseContext);

    // Check for key review principles
    expect(instructions).toContain("reviewPrinciples");
    expect(instructions).toContain("logical errors");
  });

  it("should include gh CLI commands for posting comments", () => {
    const instructions = reviewFullSkill.getInstructions(baseContext);

    expect(instructions).toContain("gh api repos/owner/repo/pulls/123/comments");
    expect(instructions).toContain("gh pr review 123");
  });
});

describe("answer-question skill", () => {
  const baseContext: SkillContext = {
    repo: "owner/repo",
    prNumber: 123,
    commitSha: "abc123",
    repoFilePaths: [],
    interactiveMention: {
      userMessage: "What does this function do?",
      commentId: 456,
      commentAuthor: "testuser",
      commentBody: "@codepress What does this function do?",
      isReviewComment: false,
    },
  };

  it("should have correct name and description", () => {
    expect(answerQuestionSkill.name).toBe("answer-question");
    expect(answerQuestionSkill.description).toContain("question");
  });

  it("should include user message in instructions", () => {
    const instructions = answerQuestionSkill.getInstructions(baseContext);

    expect(instructions).toContain("What does this function do?");
    expect(instructions).toContain("@testuser");
  });

  it("should include reply command for issue comments", () => {
    const instructions = answerQuestionSkill.getInstructions(baseContext);

    expect(instructions).toContain("gh api repos/owner/repo/issues/123/comments");
  });

  it("should include reply command for review comments", () => {
    const reviewContext: SkillContext = {
      ...baseContext,
      interactiveMention: {
        ...baseContext.interactiveMention!,
        isReviewComment: true,
        filePath: "src/index.ts",
        line: 42,
        diffHunk: "@@ -10,5 +10,8 @@",
      },
    };

    const instructions = answerQuestionSkill.getInstructions(reviewContext);

    expect(instructions).toContain("in_reply_to=456");
    expect(instructions).toContain("src/index.ts");
    expect(instructions).toContain("Line");
    expect(instructions).toContain("42");
  });

  it("should return error when no interactive mention context", () => {
    const noMentionContext: SkillContext = {
      ...baseContext,
      interactiveMention: undefined,
    };

    const instructions = answerQuestionSkill.getInstructions(noMentionContext);

    expect(instructions).toContain("Error");
  });
});

describe("review-targeted skill", () => {
  const baseContext: SkillContext = {
    repo: "owner/repo",
    prNumber: 123,
    commitSha: "abc123",
    repoFilePaths: [],
    interactiveMention: {
      userMessage: "Please check the error handling in this file",
      commentId: 456,
      commentAuthor: "testuser",
      commentBody: "@codepress Please check the error handling in this file",
      isReviewComment: true,
      filePath: "src/utils.ts",
      line: 50,
      diffHunk: "@@ -45,10 +45,15 @@",
    },
  };

  it("should have correct name and description", () => {
    expect(reviewTargetedSkill.name).toBe("review-targeted");
    expect(reviewTargetedSkill.description).toContain("specific code areas");
  });

  it("should include user request in instructions", () => {
    const instructions = reviewTargetedSkill.getInstructions(baseContext);

    expect(instructions).toContain("error handling");
    expect(instructions).toContain("@testuser");
  });

  it("should include code context for review comments", () => {
    const instructions = reviewTargetedSkill.getInstructions(baseContext);

    expect(instructions).toContain("src/utils.ts");
    expect(instructions).toContain("Line");
    expect(instructions).toContain("50");
    expect(instructions).toContain("@@ -45,10 +45,15 @@");
  });

  it("should include inline comment posting command", () => {
    const instructions = reviewTargetedSkill.getInstructions(baseContext);

    expect(instructions).toContain("gh api repos/owner/repo/pulls/123/comments");
    expect(instructions).toContain("commit_id");
    expect(instructions).toContain("abc123");
  });

  it("should use verdict NONE for targeted reviews", () => {
    const instructions = reviewTargetedSkill.getInstructions(baseContext);

    expect(instructions).toContain('verdict: "NONE"');
  });

  it("should return error when no interactive mention context", () => {
    const noMentionContext: SkillContext = {
      ...baseContext,
      interactiveMention: undefined,
    };

    const instructions = reviewTargetedSkill.getInstructions(noMentionContext);

    expect(instructions).toContain("Error");
  });
});
