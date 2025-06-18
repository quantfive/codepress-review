import { z } from "zod";
/**
 * Tool to fetch the full content of a file.
 */
export declare const fetchFileTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
}, {
    path: string;
}>, string>;
/**
 * Tool to fetch a snippet from a file.
 */
export declare const fetchSnippetTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    start: z.ZodNumber;
    end: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    path: string;
    start: number;
    end: number;
}, {
    path: string;
    start: number;
    end: number;
}>, string>;
/**
 * Tool to get the dependency graph for a file.
 */
export declare const depGraphTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    depth: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    path: string;
    depth: number;
}, {
    path: string;
    depth: number;
}>, string>;
export declare const allTools: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
}, {
    path: string;
}>, string>[];
//# sourceMappingURL=tools.d.ts.map