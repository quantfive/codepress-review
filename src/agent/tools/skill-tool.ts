import { tool } from "@openai/agents";
import { z } from "zod";
import { allSkills, getSkillByName } from "../skills";
import type { SkillContext } from "../skills/types";

/**
 * Creates the skill tool with the given context.
 * The tool description lists all available skills so the agent can choose.
 */
export function createSkillTool(context: SkillContext) {
  // Build the skill list for the description
  const skillList = allSkills
    .map(
      (skill) => `  <skill name="${skill.name}">
    ${skill.description}
  </skill>`,
    )
    .join("\n");

  const description = `Load a skill to get detailed instructions for a specific task.
Skills provide specialized knowledge and step-by-step guidance for different types of work.

**When to use this tool:**
- At the start of your task, to load the appropriate skill
- Use the skill that best matches what you need to do

<available_skills>
${skillList}
</available_skills>

**How to choose:**
- For full PR reviews (@codepress/review, PR opened, new commits): use "review-full"
- For questions about code (what/why/how, explanations): use "answer-question"
- For targeted review requests (check this function, review security): use "review-targeted"

After loading a skill, follow its instructions completely.`;

  return tool({
    name: "skill",
    description,
    parameters: z.object({
      name: z
        .string()
        .describe("The skill name to load (from available_skills)"),
    }),
    execute: async ({ name }) => {
      const skill = getSkillByName(name);

      if (!skill) {
        const availableNames = allSkills.map((s) => s.name).join(", ");
        return `Error: Skill "${name}" not found. Available skills: ${availableNames}`;
      }

      // Get the instructions for this skill with the current context
      const instructions = skill.getInstructions(context);

      return `# Skill Loaded: ${skill.name}

${instructions}`;
    },
  });
}
