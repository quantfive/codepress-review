import { tool } from "@openai/agents";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { cruise, IModule, IReporterOutput } from "dependency-cruiser";

/**
 * Tool to fetch the full content of a file.
 */
export const fetchFileTool = tool({
  name: "fetch_file",
  description: "Return the full contents of a file path.",
  parameters: z.object({
    path: z.string().describe("Repo-relative file path"),
  }),
  execute: async ({ path }) => {
    const absolutePath = resolve(process.cwd(), path);
    if (!existsSync(absolutePath)) {
      return `Error: File not found at ${path}`;
    }
    try {
      return readFileSync(absolutePath, "utf-8");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      return `Error reading file: ${errorMessage}`;
    }
  },
});

/**
 * Tool to fetch a snippet from a file.
 */
export const fetchSnippetTool = tool({
  name: "fetch_snippet",
  description: "Return a specific line range (inclusive) from a file path.",
  parameters: z.object({
    path: z.string().describe("Repo-relative file path"),
    start: z.number().int().positive().describe("1-based start line"),
    end: z.number().int().positive().describe("1-based end line"),
  }),
  execute: async ({ path, start, end }) => {
    const absolutePath = resolve(process.cwd(), path);
    if (!existsSync(absolutePath)) {
      return `Error: File not found at ${path}`;
    }
    if (start > end) {
      return `Error: Start line must be less than or equal to end line.`;
    }
    try {
      const content = readFileSync(absolutePath, "utf-8");
      const lines = content.split("\n");
      if (start > lines.length) {
        return `Error: Start line ${start} is beyond file length of ${lines.length} lines.`;
      }
      return lines.slice(start - 1, end).join("\n");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      return `Error reading file: ${errorMessage}`;
    }
  },
});

function formatCruiseResult(modules: IModule[], targetFile: string): string {
  if (!modules || modules.length === 0) {
    return `No dependency information found for ${targetFile}`;
  }

  const output: string[] = [];
  const importersMap = new Map<string, string[]>();

  modules.forEach((mod: IModule) => {
    mod.dependencies.forEach((dep) => {
      if (!importersMap.has(dep.resolved)) {
        importersMap.set(dep.resolved, []);
      }
      importersMap.get(dep.resolved)!.push(mod.source);
    });
  });

  modules.forEach((mod: IModule) => {
    output.push(`\n=== ${mod.source} ===`);
    const imports = mod.dependencies.map((dep) => dep.resolved);
    const importedBy = importersMap.get(mod.source) || [];

    if (imports.length > 0) {
      output.push(`Imports (${imports.length}):`);
      imports.forEach((imp) => output.push(`  → ${imp}`));
    }

    if (importedBy.length > 0) {
      output.push(`Imported by (${importedBy.length}):`);
      importedBy.forEach((imp) => output.push(`  ← ${imp}`));
    }

    if (imports.length === 0 && importedBy.length === 0) {
      output.push(`No dependencies found in the analyzed scope.`);
    }
  });

  return output.join("\n");
}

/**
 * Tool to get the dependency graph for a file.
 * Uses `dependency-cruiser` to perform AST-based analysis.
 */
export const depGraphTool = tool({
  name: "dep_graph",
  description:
    "Return files directly importing or imported by path, up to depth hops. " +
    "This uses AST-based analysis and supports path aliases.",
  parameters: z.object({
    path: z.string().describe("Repo-relative file path"),
    depth: z
      .number()
      .int()
      .min(1)
      .max(10)
      .describe("Depth of the graph to traverse (1-10)"),
  }),
  execute: async ({ path, depth }) => {
    try {
      const cruiseResult: IReporterOutput = await cruise(
        [path],
        {
          maxDepth: depth,
          includeOnly: "^src",
          ruleSet: {},
          tsConfig: {
            fileName: "tsconfig.json",
          },
        },
        undefined,
        { tsConfig: "tsconfig.json" },
      );

      if (
        typeof cruiseResult.output === "string" ||
        cruiseResult.output.modules.length === 0
      ) {
        return `No dependencies found for ${path}. It might be an un-imported file or an error occurred.`;
      }

      return formatCruiseResult(cruiseResult.output.modules, path);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      return `Error running dependency analysis: ${errorMessage}`;
    }
  },
});

export const allTools = [fetchFileTool, fetchSnippetTool, depGraphTool];
