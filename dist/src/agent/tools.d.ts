import { z } from "zod";
/**
 * Tool to fetch the full contents of multiple files.
 */
export declare const fetchFilesTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    paths: z.ZodArray<z.ZodString, "atleastone">;
}, "strip", z.ZodTypeAny, {
    paths: [string, ...string[]];
}, {
    paths: [string, ...string[]];
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
export declare const allTools: (import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    paths: z.ZodArray<z.ZodString, "atleastone">;
}, "strip", z.ZodTypeAny, {
    paths: [string, ...string[]];
}, {
    paths: [string, ...string[]];
}>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
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
}>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    depth: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    path: string;
    depth: number;
}, {
    path: string;
    depth: number;
}>, string>)[];
//# sourceMappingURL=tools.d.ts.map