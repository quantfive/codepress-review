import { tool } from "@openai/agents";
import { z } from "zod";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { spawnSync } from "child_process";
import { resolve, dirname, join, extname, relative } from "path";
import { rgPath as vscodeRipgrepPath } from "@vscode/ripgrep";
import ignore from "ignore";
import { DEFAULT_IGNORE_PATTERNS } from "../constants";

/**
 * Resolve a working ripgrep binary path.
 * - Prefer @vscode/ripgrep's downloaded binary if it exists
 * - Fallback to system 'rg' if available
 */
function resolveRipgrepBinary(): string | null {
  try {
    if (vscodeRipgrepPath && existsSync(vscodeRipgrepPath)) {
      return vscodeRipgrepPath;
    }
  } catch {
    // ignore and probe for system rg
  }
  try {
    const probe = spawnSync("rg", ["--version"], { encoding: "utf-8" });
    if (!probe.error && (probe.status === 0 || probe.status === 1)) {
      return "rg";
    }
  } catch {
    // no system rg
  }
  return null;
}

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
 * Collects repository files filtered by extension and optional path scopes
 */
function getAllSearchableFiles(
  extensions?: string[],
  paths?: string[],
  ig?: ReturnType<typeof ignore>,
): string[] {
  const files: string[] = [];

  function walkDir(dir: string) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (
            !["node_modules", ".git", "dist", "build", ".next"].includes(entry)
          ) {
            walkDir(fullPath);
          }
        } else if (stat.isFile()) {
          if (!extensions || extensions.length === 0) {
            const rel = relative(process.cwd(), fullPath);
            if (!ig || !ig.ignores(rel)) {
              files.push(rel);
            }
          } else if (extensions.includes(extname(entry))) {
            const rel = relative(process.cwd(), fullPath);
            if (!ig || !ig.ignores(rel)) {
              files.push(rel);
            }
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  if (paths && paths.length > 0) {
    for (const p of paths) {
      try {
        const full = resolve(process.cwd(), p);
        const s = statSync(full);
        if (s.isDirectory()) {
          walkDir(full);
        } else if (s.isFile()) {
          if (
            !extensions ||
            extensions.length === 0 ||
            extensions.includes(extname(p))
          ) {
            const rel = relative(process.cwd(), full);
            if (!ig || !ig.ignores(rel)) {
              files.push(rel);
            }
          }
        }
      } catch {
        // Skip unreadable paths
      }
    }
  } else {
    walkDir(process.cwd());
  }

  return files;
}

/**
 * Find all .codepressignore files under provided paths or repo root.
 */
function findCodepressIgnoreFiles(paths?: string[] | null): string[] {
  const results: string[] = [];
  function walkDir(dir: string) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          if (
            !["node_modules", ".git", "dist", "build", ".next"].includes(entry)
          ) {
            walkDir(fullPath);
          }
        } else if (stat.isFile() && entry === ".codepressignore") {
          results.push(relative(process.cwd(), fullPath));
        }
      }
    } catch {
      // skip unreadable
    }
  }
  if (paths && paths.length > 0) {
    for (const p of paths) {
      try {
        const full = resolve(process.cwd(), p);
        const s = statSync(full);
        if (s.isDirectory()) {
          walkDir(full);
        } else if (s.isFile() && full.endsWith(".codepressignore")) {
          results.push(relative(process.cwd(), full));
        }
      } catch {
        // skip
      }
    }
  } else {
    walkDir(process.cwd());
  }
  return results;
}

/**
 * Build ignore matcher from default patterns + all discovered .codepressignore files.
 */
function buildIgnoreMatcher(ignoreFiles: string[]): ReturnType<typeof ignore> {
  const ig = ignore();
  ig.add(DEFAULT_IGNORE_PATTERNS);
  for (const relPath of ignoreFiles) {
    try {
      const absolute = resolve(process.cwd(), relPath);
      const content = readFileSync(absolute, "utf-8");
      const dir = dirname(relPath);
      const patterns = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
      for (const pat of patterns) {
        const rebased = pat.startsWith("/") ? join(dir, pat) : join(dir, pat);
        ig.add(rebased.replace(/\\/g, "/"));
      }
    } catch {
      // skip bad ignore file
    }
  }
  return ig;
}

/**
 * Tool to fetch the full contents of multiple files.
 */
export const fetchFilesTool = tool({
  name: "fetch_files",
  description: "Return the full contents of multiple file paths.",
  parameters: z.object({
    paths: z
      .array(z.string())
      .nonempty()
      .describe("Array of repo-relative file paths"),
  }),
  execute: async ({ paths }) => {
    const outputs: string[] = [];
    for (const path of paths) {
      const absolutePath = resolve(process.cwd(), path);
      if (!existsSync(absolutePath)) {
        outputs.push(`=== ${path} ===\nError: File not found at ${path}`);
        continue;
      }
      try {
        const content = readFileSync(absolutePath, "utf-8");
        outputs.push(`=== ${path} ===\n${content}`);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        outputs.push(`=== ${path} ===\nError reading file: ${errorMessage}`);
      }
    }
    return outputs.join("\n\n");
  },
});

/**
 * Tool to fetch a snippet from a file by searching for specific text.
 */
export const fetchSnippetTool = tool({
  name: "fetch_snippet",
  description:
    "Search for and return code snippets containing specific text patterns from a file path. Returns the found text with surrounding context lines for better understanding.",
  parameters: z.object({
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
      .default(5)
      .describe(
        "Number of lines before and after the match to include (default: 5)",
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
  parameters: z.object({
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

/**
 * Tool to search the repository for a plain-text query across common text/code files.
 */
export async function runSearchRepo(params: {
  query: string;
  caseSensitive?: boolean | null;
  extensions?: string[] | null;
  paths?: string[] | null;
  contextLines?: number;
  maxResults?: number;
}): Promise<string> {
  const {
    query,
    caseSensitive = null,
    extensions = null,
    paths = null,
    contextLines = 5,
    maxResults = 200,
  } = params;

  // Build ignore set from .codepressignore and defaults
  const codepressIgnoreFiles = findCodepressIgnoreFiles(paths);
  const ig = buildIgnoreMatcher(codepressIgnoreFiles);

  // Prefer ripgrep if available. It respects .gitignore and is fast.
  try {
    const args: string[] = ["-n", "--json", "-F"]; // -F: fixed-strings
    const isCaseSensitive = caseSensitive === true;
    if (!isCaseSensitive) args.push("-i");

    // Optional extension globs
    if (Array.isArray(extensions) && extensions.length > 0) {
      for (const ext of extensions) {
        const pattern = ext.startsWith(".") ? `*${ext}` : `*.${ext}`;
        args.push("-g", pattern);
      }
    }

    // Pattern
    args.push(query);

    // Paths scope or default to current directory
    if (Array.isArray(paths) && paths.length > 0) {
      for (const p of paths) args.push(p);
    } else {
      args.push(".");
    }

    const rgBinary = resolveRipgrepBinary();
    if (!rgBinary) {
      throw new Error("ripgrep not available");
    }
    // Add .codepressignore files to ripgrep as additional ignore files
    for (const f of codepressIgnoreFiles) {
      args.push("--ignore-file", f);
    }
    const rg = spawnSync(rgBinary, args, {
      cwd: process.cwd(),
      encoding: "utf-8",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (rg.error || (typeof rg.status === "number" && rg.status === 2)) {
      throw rg.error || new Error("ripgrep execution failed");
    }

    const stdout = rg.stdout || "";
    const lines = stdout.split("\n");

    interface MatchRec {
      path: string;
      lineNumber: number;
    }

    const matchesByFile = new Map<string, MatchRec[]>();
    let total = 0;
    for (const line of lines) {
      if (!line) continue;
      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      if (obj.type === "match") {
        const filePath: string | undefined = obj.data?.path?.text;
        const lineNum: number | undefined = obj.data?.line_number;
        if (!filePath || typeof lineNum !== "number") continue;
        const arr = matchesByFile.get(filePath) || [];
        arr.push({ path: filePath, lineNumber: lineNum });
        matchesByFile.set(filePath, arr);
        total++;
        if (total >= maxResults) break;
      }
    }

    if (total === 0) {
      return `No matches found for "${query}"`;
    }

    // Build output with context by reading files once
    const outputs: string[] = [];
    for (const [file, recs] of matchesByFile.entries()) {
      const absolutePath = resolve(process.cwd(), file);
      if (!existsSync(absolutePath)) continue;
      let content = "";
      try {
        content = readFileSync(absolutePath, "utf-8");
      } catch {
        continue;
      }
      const fileLines = content.split("\n");
      outputs.push(
        `=== ${file} (${recs.length} match${recs.length === 1 ? "" : "es"}) ===`,
      );
      const snippets: string[] = [];
      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i];
        const idx = rec.lineNumber - 1;
        const start = Math.max(0, idx - contextLines);
        const end = Math.min(fileLines.length - 1, idx + contextLines);
        const snippet = fileLines
          .slice(start, end + 1)
          .map((lineText, j) => {
            const lineNo = start + j + 1;
            const isMatch = lineNo === rec.lineNumber;
            const prefix = isMatch ? ">>> " : "    ";
            return `${prefix}${lineNo.toString().padStart(4)}: ${lineText}`;
          })
          .join("\n");
        snippets.push(
          `--- Match ${i + 1} (line ${rec.lineNumber}) ---\n${snippet}`,
        );
      }
      outputs.push(snippets.join("\n\n"));
    }

    return outputs.join("\n\n");
  } catch {
    // Fallback to in-process search if ripgrep is unavailable
    const files = getAllSearchableFiles(
      extensions ?? undefined,
      paths ?? undefined,
      ig,
    );

    const isCaseSensitive = caseSensitive === true;
    const needle = isCaseSensitive ? query : query.toLowerCase();
    let total = 0;
    let truncated = false;
    const outputs: string[] = [];

    for (const file of files) {
      if (total >= maxResults) break;
      const absolutePath = resolve(process.cwd(), file);
      if (!existsSync(absolutePath)) continue;

      let content: string;
      try {
        content = readFileSync(absolutePath, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");
      const matches: Array<{ lineNumber: number; snippet: string }> = [];

      for (let i = 0; i < lines.length; i++) {
        const hay = isCaseSensitive ? lines[i] : lines[i].toLowerCase();
        if (hay.includes(needle)) {
          const start = Math.max(0, i - contextLines);
          const end = Math.min(lines.length - 1, i + contextLines);
          const snippet = lines
            .slice(start, end + 1)
            .map((line, idx) => {
              const lineNo = start + idx + 1;
              const isMatch = lineNo === i + 1;
              const prefix = isMatch ? ">>> " : "    ";
              return `${prefix}${lineNo.toString().padStart(4)}: ${line}`;
            })
            .join("\n");

          matches.push({ lineNumber: i + 1, snippet });
          total++;
          if (total >= maxResults) break;
        }
      }

      if (matches.length > 0) {
        outputs.push(
          `=== ${file} (${matches.length} match${matches.length === 1 ? "" : "es"}) ===`,
        );
        if (matches.length === 1) {
          outputs.push(matches[0].snippet);
        } else {
          outputs.push(
            matches
              .map(
                (m, idx) =>
                  `--- Match ${idx + 1} (line ${m.lineNumber}) ---\n${m.snippet}`,
              )
              .join("\n\n"),
          );
        }
      }

      if (total >= maxResults) {
        truncated = true;
        break;
      }
    }

    if (outputs.length === 0) {
      return `No matches found for "${query}"`;
    }

    if (truncated) {
      outputs.push(`\n[Truncated after ${maxResults} matches]`);
    }

    return outputs.join("\n\n");
  }
}

export const searchRepoTool = tool({
  name: "search_repo",
  description:
    "Search the repository (respects .gitignore) for a plain-text query using ripgrep when available. Returns file paths and matching line snippets with context.",
  parameters: z.object({
    query: z
      .string()
      .describe("Plain-text query to search for (case-insensitive by default)"),
    caseSensitive: z
      .boolean()
      .nullish()
      .describe(
        "If true, perform a case-sensitive search (null = default insensitive)",
      ),
    extensions: z
      .array(z.string())
      .nullish()
      .describe(
        "Optional list of file extensions to include (e.g., ['.py','.go','.rb','.md']). Defaults to all files when null",
      ),
    paths: z
      .array(z.string())
      .nullish()
      .describe(
        "Optional repo-relative directories or files to scope the search",
      ),
    contextLines: z
      .number()
      .int()
      .min(0)
      .default(5)
      .describe(
        "Number of lines before and after each match to include (default: 5)",
      ),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .default(200)
      .describe(
        "Maximum total matches to return across all files (default: 200)",
      ),
  }),
  execute: runSearchRepo,
});

export const allTools = [
  fetchFilesTool,
  fetchSnippetTool,
  depGraphTool,
  searchRepoTool,
];
