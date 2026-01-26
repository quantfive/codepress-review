import { z } from "zod";
import { BotComment, ExistingReviewComment, ModelConfig, RelatedRepo, TriggerContext } from "../types";
/**
 * Schema for the agent's final output.
 * The agent MUST produce this structured output to signal completion.
 * This prevents the agent from stopping prematurely on text-only responses.
 */
declare const ReviewCompletionSchema: z.ZodObject<{
    completed: z.ZodBoolean;
    summary: z.ZodString;
    commentsPosted: z.ZodNumber;
    verdict: z.ZodEnum<{
        APPROVE: "APPROVE";
        REQUEST_CHANGES: "REQUEST_CHANGES";
        COMMENT: "COMMENT";
        NONE: "NONE";
    }>;
}, z.core.$strip>;
export type ReviewCompletion = z.infer<typeof ReviewCompletionSchema>;
export interface PRContext {
    repo: string;
    prNumber: number;
    commitSha: string;
    triggerContext?: TriggerContext;
}
/**
 * Reviews a PR using a single interactive agent with agentic diff exploration.
 * The agent has full autonomy to:
 * - Fetch the diff via gh CLI (on demand)
 * - Explore the codebase with bash, search, and file tools
 * - Search the web for documentation and references
 * - View existing PR comments
 * - Post review comments directly
 * - Update PR description if blank
 */
export declare function reviewFullDiff(modelConfig: ModelConfig, repoFilePaths: string[], prContext: PRContext, maxTurns?: number | null, // null = unlimited (default)
blockingOnly?: boolean, existingComments?: ExistingReviewComment[], botPreviousComments?: BotComment[], relatedRepos?: RelatedRepo[], prFilesFormatted?: string): Promise<void>;
export {};
//# sourceMappingURL=index.d.ts.map