import { z } from "zod";
/**
 * Tool to fetch the full contents of multiple files.
 */
export declare const fetchFilesTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    paths: z.ZodArray<z.ZodString>;
}, z.core.$strip>, string>;
/**
 * Tool to fetch a snippet from a file by searching for specific text.
 */
export declare const fetchSnippetTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    searchText: z.ZodString;
    contextLines: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, string>;
/**
 * Tool to get the dependency graph for a file.
 */
export declare const depGraphTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    depth: z.ZodNumber;
}, z.core.$strip>, string>;
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
    extensions: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    paths: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    contextLines: z.ZodDefault<z.ZodNumber>;
    maxResults: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, string>;
/**
 * Tool to run bash commands in the repository.
 * Useful for git operations, GitHub CLI, grep, find, etc.
 */
export declare const bashTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    command: z.ZodString;
}, z.core.$strip>, string>;
/**
 * Tool for the agent to manage a todo list during the review.
 * Helps track tasks like "update PR description" or "check for duplicates".
 */
export declare const todoTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    action: z.ZodEnum<{
        add: "add";
        done: "done";
        list: "list";
    }>;
    task: z.ZodOptional<z.ZodString>;
    tasks: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, string>;
export declare function resetTodoList(): void;
/**
 * Tool to fetch content from a URL and convert it to readable format.
 * Useful for fetching documentation, READMEs, API references, etc.
 */
export declare const webFetchTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    url: z.ZodString;
    format: z.ZodDefault<z.ZodEnum<{
        text: "text";
        markdown: "markdown";
        html: "html";
    }>>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, string>;
/**
 * Tool to search the web for technical information using DuckDuckGo.
 */
export declare const webSearchTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    query: z.ZodString;
    maxResults: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, string>;
/**
 * Returns all tools for the agent.
 * Web search tools are enabled by default but can be disabled via ENABLE_WEB_SEARCH=false.
 */
export declare function getAllTools(): (import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    paths: z.ZodArray<z.ZodString>;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    searchText: z.ZodString;
    contextLines: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    depth: z.ZodNumber;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    query: z.ZodString;
    caseSensitive: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    regex: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    wordBoundary: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    extensions: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    paths: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    contextLines: z.ZodDefault<z.ZodNumber>;
    maxResults: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    command: z.ZodString;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    action: z.ZodEnum<{
        add: "add";
        done: "done";
        list: "list";
    }>;
    task: z.ZodOptional<z.ZodString>;
    tasks: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    url: z.ZodString;
    format: z.ZodDefault<z.ZodEnum<{
        text: "text";
        markdown: "markdown";
        html: "html";
    }>>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, string>)[];
export declare const allTools: (import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    paths: z.ZodArray<z.ZodString>;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    searchText: z.ZodString;
    contextLines: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    path: z.ZodString;
    depth: z.ZodNumber;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    query: z.ZodString;
    caseSensitive: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    regex: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    wordBoundary: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    extensions: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    paths: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    contextLines: z.ZodDefault<z.ZodNumber>;
    maxResults: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    command: z.ZodString;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    action: z.ZodEnum<{
        add: "add";
        done: "done";
        list: "list";
    }>;
    task: z.ZodOptional<z.ZodString>;
    tasks: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, string> | import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    url: z.ZodString;
    format: z.ZodDefault<z.ZodEnum<{
        text: "text";
        markdown: "markdown";
        html: "html";
    }>>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, string>)[];
//# sourceMappingURL=tools.d.ts.map