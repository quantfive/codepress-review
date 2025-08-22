import { tool } from "@openai/agents";
import { z } from "zod";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname, join, extname, relative } from "path";

/**
 * Resolves a relative import path to an absolute file path
 */
function resolveImportPath(
  importPath: string,
  fromFile: string,
): string | null {
  const fromDir = dirname(fromFile);

  // Handle relative imports
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const resolved = resolve(fromDir, importPath);

    // Try different extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (existsSync(withExt)) {
        return relative(process.cwd(), withExt);
      }
    }

    // Try index files
    for (const ext of extensions) {
      const indexFile = join(resolved, `index${ext}`);
      if (existsSync(indexFile)) {
        return relative(process.cwd(), indexFile);
      }
    }
  }

  return null; // Skip node_modules and other absolute imports
}

/**
 * Extracts import/export statements from a file
 */
function extractDependencies(filePath: string): {
  imports: string[];
  exports: string[];
} {
  const absolutePath = resolve(process.cwd(), filePath);
  if (!existsSync(absolutePath)) {
    return { imports: [], exports: [] };
  }

  try {
    const content = readFileSync(absolutePath, "utf-8");
    const imports: string[] = [];
    const exports: string[] = [];

    // Regex patterns for different import/export styles
    const importPatterns = [
      /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    ];

    const exportPatterns = [
      /export\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
      /export\s*\*\s+from\s+['"`]([^'"`]+)['"`]/g,
    ];

    // Extract imports
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const resolvedPath = resolveImportPath(match[1], filePath);
        if (resolvedPath) {
          imports.push(resolvedPath);
        }
      }
    }

    // Extract re-exports
    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const resolvedPath = resolveImportPath(match[1], filePath);
        if (resolvedPath) {
          exports.push(resolvedPath);
        }
      }
    }

    return { imports: [...new Set(imports)], exports: [...new Set(exports)] };
  } catch {
    return { imports: [], exports: [] };
  }
}

/**
 * Finds all files that import the given file
 */
function findImporters(targetFile: string, allFiles: string[]): string[] {
  const importers: string[] = [];

  for (const file of allFiles) {
    if (file === targetFile) continue;

    const { imports } = extractDependencies(file);
    if (imports.includes(targetFile)) {
      importers.push(file);
    }
  }

  return importers;
}

/**
 * Gets all source files in the repository
 */
function getAllSourceFiles(): string[] {
  const sourceExtensions = [".ts", ".tsx", ".js", ".jsx"];
  const files: string[] = [];

  function walkDir(dir: string) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip common directories that don't contain source code
          if (
            !["node_modules", ".git", "dist", "build", ".next"].includes(entry)
          ) {
            walkDir(fullPath);
          }
        } else if (stat.isFile() && sourceExtensions.includes(extname(entry))) {
          files.push(relative(process.cwd(), fullPath));
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walkDir(process.cwd());
  return files;
}

/**
 * Tool to fetch the full content of a file.
 */
export const fetchFileTool = tool({
  name: "fetch_file",
  description: "Return the full contents of a file path.",
  inputSchema: z.object({
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
 * Tool to fetch a snippet from a file by searching for specific text.
 */
export const fetchSnippetTool = tool({
  name: "fetch_snippet",
  description:
    "Search for and return code snippets containing specific text patterns from a file path. Returns the found text with surrounding context lines for better understanding.",
  inputSchema: z.object({
    path: z.string().describe("Repo-relative file path"),
    searchText: z
      .string()
      .describe(
        "Text pattern to search for (can be partial function names, variable names, or code snippets)",
      ),
    contextLines: z
      .number()
      .int()
      .min(0)
      .default(25)
      .describe(
        "Number of lines before and after the match to include (default: 25)",
      ),
  }),
  execute: async ({ path, searchText, contextLines = 5 }) => {
    const absolutePath = resolve(process.cwd(), path);
    if (!existsSync(absolutePath)) {
      return `Error: File not found at ${path}`;
    }
    try {
      const content = readFileSync(absolutePath, "utf-8");
      const lines = content.split("\n");
      const matches: Array<{ lineNumber: number; snippet: string }> = [];

      // Search for the text in each line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchText)) {
          const startLine = Math.max(0, i - contextLines);
          const endLine = Math.min(lines.length - 1, i + contextLines);

          const snippet = lines
            .slice(startLine, endLine + 1)
            .map((line, index) => {
              const actualLineNumber = startLine + index + 1;
              const isMatchLine = actualLineNumber === i + 1;
              const prefix = isMatchLine ? ">>> " : "    ";
              return `${prefix}${actualLineNumber.toString().padStart(4)}: ${line}`;
            })
            .join("\n");

          matches.push({
            lineNumber: i + 1,
            snippet,
          });
        }
      }

      if (matches.length === 0) {
        return `No matches found for "${searchText}" in ${path}`;
      }

      if (matches.length === 1) {
        return `Found 1 match for "${searchText}" in ${path}:\n\n${matches[0].snippet}`;
      }

      // Multiple matches - show all with separators
      const results = matches
        .map((match, index) => {
          return `=== Match ${index + 1} (line ${match.lineNumber}) ===\n${match.snippet}`;
        })
        .join("\n\n");

      return `Found ${matches.length} matches for "${searchText}" in ${path}:\n\n${results}`;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      return `Error reading file: ${errorMessage}`;
    }
  },
});

/**
 * Tool to get the dependency graph for a file.
 */
export const depGraphTool = tool({
  name: "dep_graph",
  description:
    "Return files directly importing or imported by path, up to depth hops.",
  inputSchema: z.object({
    path: z.string().describe("Repo-relative file path"),
    depth: z.number().int().min(1).describe("Depth of the graph to traverse"),
  }),
  execute: async ({ path, depth }) => {
    if (!existsSync(resolve(process.cwd(), path))) {
      return `Error: File not found at ${path}`;
    }

    const allFiles = getAllSourceFiles();
    const visited = new Set<string>();
    const result: {
      [key: string]: { imports: string[]; importedBy: string[] };
    } = {};

    function analyzeDependencies(filePath: string, currentDepth: number) {
      if (currentDepth > depth || visited.has(filePath)) {
        return;
      }

      visited.add(filePath);

      // Get direct dependencies (files this file imports)
      const { imports } = extractDependencies(filePath);

      // Get files that import this file
      const importedBy = findImporters(filePath, allFiles);

      result[filePath] = {
        imports: imports.filter((imp) => allFiles.includes(imp)),
        importedBy,
      };

      // Recursively analyze dependencies if we haven't reached max depth
      if (currentDepth < depth) {
        for (const importedFile of imports) {
          if (allFiles.includes(importedFile)) {
            analyzeDependencies(importedFile, currentDepth + 1);
          }
        }

        for (const importer of importedBy) {
          analyzeDependencies(importer, currentDepth + 1);
        }
      }
    }

    analyzeDependencies(path, 1);

    // Format the output
    const output: string[] = [];
    for (const [file, deps] of Object.entries(result)) {
      output.push(`\n=== ${file} ===`);

      if (deps.imports.length > 0) {
        output.push(`Imports (${deps.imports.length}):`);
        deps.imports.forEach((imp) => output.push(`  → ${imp}`));
      }

      if (deps.importedBy.length > 0) {
        output.push(`Imported by (${deps.importedBy.length}):`);
        deps.importedBy.forEach((imp) => output.push(`  ← ${imp}`));
      }

      if (deps.imports.length === 0 && deps.importedBy.length === 0) {
        output.push(`No dependencies found`);
      }
    }

    return output.join("\n");
  },
});

export const allTools = [fetchFileTool, fetchSnippetTool, depGraphTool];
