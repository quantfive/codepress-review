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
/**
 * Tool to search the repository for a plain-text query across common text/code files.
 */
export declare function runSearchRepo(params: {
    query: string;
    caseSensitive?: boolean | null;
    regex?: boolean | null;
    wordBoundary?: boolean | null;
    extensions?: string[] | null;
    paths?: string[] | null;
    contextLines?: number;
    maxResults?: number;
}): Promise<string>;
export declare const searchRepoTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    query: z.ZodString;
    caseSensitive: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    regex: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    wordBoundary: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    extensions: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    paths: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    contextLines: z.ZodDefault<z.ZodNumber>;
    maxResults: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    contextLines: number;
    query: string;
    maxResults: number;
    paths?: string[] | null | undefined;
    caseSensitive?: boolean | null | undefined;
    regex?: boolean | null | undefined;
    wordBoundary?: boolean | null | undefined;
    extensions?: string[] | null | undefined;
}, {
    query: string;
    paths?: string[] | null | undefined;
    contextLines?: number | undefined;
    caseSensitive?: boolean | null | undefined;
    regex?: boolean | null | undefined;
    wordBoundary?: boolean | null | undefined;
    extensions?: string[] | null | undefined;
    maxResults?: number | undefined;
}>, string>;
/**
 * Tool to run bash commands in the repository.
 * Useful for git operations, GitHub CLI, grep, find, etc.
 */
export declare const bashTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    command: z.ZodString;
}, "strip", z.ZodTypeAny, {
    command: string;
}, {
    command: string;
}>, string>;
/**
 * Tool for the agent to manage a todo list during the review.
 * Helps track tasks like "update PR description" or "check for duplicates".
 */
export declare const todoTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    action: z.ZodEnum<["add", "done", "list"]>;
    task: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "add" | "done" | "list";
    task?: string | undefined;
}, {
    action: "add" | "done" | "list";
    task?: string | undefined;
}>, string>;
export declare function resetTodoList(): void;
export declare const allTools: (import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    depth: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    path: string;
    depth: number;
}, {
    path: string;
    depth: number;
}>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    command: z.ZodString;
}, "strip", z.ZodTypeAny, {
    command: string;
}, {
    command: string;
}>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    action: z.ZodEnum<["add", "done", "list"]>;
    task: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "add" | "done" | "list";
    task?: string | undefined;
}, {
    action: "add" | "done" | "list";
    task?: string | undefined;
}>, string>)[];
//# sourceMappingURL=tools.d.ts.map