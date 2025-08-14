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
 * Tool to fetch a snippet from a file by searching for specific text.
 */
export declare const fetchSnippetTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    searchText: z.ZodString;
    contextLines: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    path: string;
    searchText: string;
    contextLines: number;
}, {
    path: string;
    searchText: string;
    contextLines?: number | undefined;
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