"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allTools = exports.depGraphTool = exports.fetchSnippetTool = exports.fetchFilesTool = void 0;
const agents_1 = require("@openai/agents");
const zod_1 = require("zod");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Resolves a relative import path to an absolute file path
 */
function resolveImportPath(importPath, fromFile) {
    const fromDir = (0, path_1.dirname)(fromFile);
    // Handle relative imports
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
        const resolved = (0, path_1.resolve)(fromDir, importPath);
        // Try different extensions
        const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
        for (const ext of extensions) {
            const withExt = resolved + ext;
            if ((0, fs_1.existsSync)(withExt)) {
                return (0, path_1.relative)(process.cwd(), withExt);
            }
        }
        // Try index files
        for (const ext of extensions) {
            const indexFile = (0, path_1.join)(resolved, `index${ext}`);
            if ((0, fs_1.existsSync)(indexFile)) {
                return (0, path_1.relative)(process.cwd(), indexFile);
            }
        }
    }
    return null; // Skip node_modules and other absolute imports
}
/**
 * Extracts import/export statements from a file
 */
function extractDependencies(filePath) {
    const absolutePath = (0, path_1.resolve)(process.cwd(), filePath);
    if (!(0, fs_1.existsSync)(absolutePath)) {
        return { imports: [], exports: [] };
    }
    try {
        const content = (0, fs_1.readFileSync)(absolutePath, "utf-8");
        const imports = [];
        const exports = [];
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
    }
    catch {
        return { imports: [], exports: [] };
    }
}
/**
 * Finds all files that import the given file
 */
function findImporters(targetFile, allFiles) {
    const importers = [];
    for (const file of allFiles) {
        if (file === targetFile)
            continue;
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
function getAllSourceFiles() {
    const sourceExtensions = [".ts", ".tsx", ".js", ".jsx"];
    const files = [];
    function walkDir(dir) {
        try {
            const entries = (0, fs_1.readdirSync)(dir);
            for (const entry of entries) {
                const fullPath = (0, path_1.join)(dir, entry);
                const stat = (0, fs_1.statSync)(fullPath);
                if (stat.isDirectory()) {
                    // Skip common directories that don't contain source code
                    if (!["node_modules", ".git", "dist", "build", ".next"].includes(entry)) {
                        walkDir(fullPath);
                    }
                }
                else if (stat.isFile() && sourceExtensions.includes((0, path_1.extname)(entry))) {
                    files.push((0, path_1.relative)(process.cwd(), fullPath));
                }
            }
        }
        catch {
            // Skip directories we can't read
        }
    }
    walkDir(process.cwd());
    return files;
}
/**
 * Tool to fetch the full contents of multiple files.
 */
exports.fetchFilesTool = (0, agents_1.tool)({
    name: "fetch_files",
    description: "Return the full contents of multiple file paths.",
    parameters: zod_1.z.object({
        paths: zod_1.z
            .array(zod_1.z.string())
            .nonempty()
            .describe("Array of repo-relative file paths"),
    }),
    execute: async ({ paths }) => {
        const outputs = [];
        for (const path of paths) {
            const absolutePath = (0, path_1.resolve)(process.cwd(), path);
            if (!(0, fs_1.existsSync)(absolutePath)) {
                outputs.push(`=== ${path} ===\nError: File not found at ${path}`);
                continue;
            }
            try {
                const content = (0, fs_1.readFileSync)(absolutePath, "utf-8");
                outputs.push(`=== ${path} ===\n${content}`);
            }
            catch (e) {
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
exports.fetchSnippetTool = (0, agents_1.tool)({
    name: "fetch_snippet",
    description: "Search for and return code snippets containing specific text patterns from a file path. Returns the found text with surrounding context lines for better understanding.",
    parameters: zod_1.z.object({
        path: zod_1.z.string().describe("Repo-relative file path"),
        searchText: zod_1.z
            .string()
            .describe("Text pattern to search for (can be partial function names, variable names, or code snippets)"),
        contextLines: zod_1.z
            .number()
            .int()
            .min(0)
            .default(25)
            .describe("Number of lines before and after the match to include (default: 25)"),
    }),
    execute: async ({ path, searchText, contextLines = 5 }) => {
        const absolutePath = (0, path_1.resolve)(process.cwd(), path);
        if (!(0, fs_1.existsSync)(absolutePath)) {
            return `Error: File not found at ${path}`;
        }
        try {
            const content = (0, fs_1.readFileSync)(absolutePath, "utf-8");
            const lines = content.split("\n");
            const matches = [];
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
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            return `Error reading file: ${errorMessage}`;
        }
    },
});
/**
 * Tool to get the dependency graph for a file.
 */
exports.depGraphTool = (0, agents_1.tool)({
    name: "dep_graph",
    description: "Return files directly importing or imported by path, up to depth hops.",
    parameters: zod_1.z.object({
        path: zod_1.z.string().describe("Repo-relative file path"),
        depth: zod_1.z.number().int().min(1).describe("Depth of the graph to traverse"),
    }),
    execute: async ({ path, depth }) => {
        if (!(0, fs_1.existsSync)((0, path_1.resolve)(process.cwd(), path))) {
            return `Error: File not found at ${path}`;
        }
        const allFiles = getAllSourceFiles();
        const visited = new Set();
        const result = {};
        function analyzeDependencies(filePath, currentDepth) {
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
        const output = [];
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
exports.allTools = [exports.fetchFilesTool, exports.fetchSnippetTool, exports.depGraphTool];
//# sourceMappingURL=tools.js.map