import { reviewFullSkill } from "./review-full";
import { answerQuestionSkill } from "./answer-question";
import { reviewTargetedSkill } from "./review-targeted";
import type { Skill } from "./types";

/**
 * All available skills, ordered by priority/specificity.
 * More specific skills should come before general ones.
 */
export const allSkills: Skill[] = [
  reviewFullSkill,
  answerQuestionSkill,
  reviewTargetedSkill,
];

/**
 * Find a skill by name.
 */
export function getSkillByName(name: string): Skill | undefined {
  return allSkills.find((skill) => skill.name === name);
}

// Re-export types and individual skills
export type { Skill, SkillContext } from "./types";
export { reviewFullSkill } from "./review-full";
export { answerQuestionSkill } from "./answer-question";
export { reviewTargetedSkill } from "./review-targeted";
