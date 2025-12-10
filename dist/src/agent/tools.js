"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allTools = exports.bashTool = exports.searchRepoTool = exports.depGraphTool = exports.fetchSnippetTool = exports.fetchFilesTool = void 0;
exports.runSearchRepo = runSearchRepo;
const agents_1 = require("@openai/agents");
const ripgrep_1 = require("@vscode/ripgrep");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const ignore_1 = __importDefault(require("ignore"));
const path_1 = require("path");
const zod_1 = require("zod");
const constants_1 = require("../constants");
// Maximum output size for bash commands (100KB)
const MAX_BASH_OUTPUT = 100 * 1024;
// Default timeout for bash commands (30 seconds)
const BASH_TIMEOUT_MS = 30 * 1000;
// Lightweight in-process LRU cache for search results
const SEARCH_CACHE = new Map();
const LRU_MAX = 100;
/**
 * Resolve a working ripgrep binary path.
 * - Prefer @vscode/ripgrep's downloaded binary if it exists
 * - Fallback to system 'rg' if available
 */
function resolveRipgrepBinary() {
    try {
        if (ripgrep_1.rgPath && (0, fs_1.existsSync)(ripgrep_1.rgPath)) {
            return ripgrep_1.rgPath;
        }
    }
    catch {
        // ignore and probe for system rg
    }
    try {
        const probe = (0, child_process_1.spawnSync)("rg", ["--version"], { encoding: "utf-8" });
        if (!probe.error && (probe.status === 0 || probe.status === 1)) {
            return "rg";
        }
    }
    catch {
        // no system rg
    }
    return null;
}
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
            let match = pattern.exec(content);
            while (match) {
                const resolvedPath = resolveImportPath(match[1], filePath);
                if (resolvedPath) {
                    imports.push(resolvedPath);
                }
                match = pattern.exec(content);
            }
        }
        // Extract re-exports
        for (const pattern of exportPatterns) {
            let match = pattern.exec(content);
            while (match) {
                const resolvedPath = resolveImportPath(match[1], filePath);
                if (resolvedPath) {
                    exports.push(resolvedPath);
                }
                match = pattern.exec(content);
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
 * Collects repository files filtered by extension and optional path scopes
 */
function getAllSearchableFiles(extensions, paths, ig) {
    const files = [];
    function walkDir(dir) {
        try {
            const entries = (0, fs_1.readdirSync)(dir);
            for (const entry of entries) {
                const fullPath = (0, path_1.join)(dir, entry);
                const stat = (0, fs_1.statSync)(fullPath);
                if (stat.isDirectory()) {
                    if (!["node_modules", ".git", "dist", "build", ".next"].includes(entry)) {
                        walkDir(fullPath);
                    }
                }
                else if (stat.isFile()) {
                    if (!extensions || extensions.length === 0) {
                        const rel = (0, path_1.relative)(process.cwd(), fullPath);
                        if (!ig || !ig.ignores(rel)) {
                            files.push(rel);
                        }
                    }
                    else if (extensions.includes((0, path_1.extname)(entry))) {
                        const rel = (0, path_1.relative)(process.cwd(), fullPath);
                        if (!ig || !ig.ignores(rel)) {
                            files.push(rel);
                        }
                    }
                }
            }
        }
        catch {
            // Skip directories we can't read
        }
    }
    if (paths && paths.length > 0) {
        for (const p of paths) {
            try {
                const full = (0, path_1.resolve)(process.cwd(), p);
                const s = (0, fs_1.statSync)(full);
                if (s.isDirectory()) {
                    walkDir(full);
                }
                else if (s.isFile()) {
                    if (!extensions ||
                        extensions.length === 0 ||
                        extensions.includes((0, path_1.extname)(p))) {
                        const rel = (0, path_1.relative)(process.cwd(), full);
                        if (!ig || !ig.ignores(rel)) {
                            files.push(rel);
                        }
                    }
                }
            }
            catch {
                // Skip unreadable paths
            }
        }
    }
    else {
        walkDir(process.cwd());
    }
    return files;
}
/**
 * Find all .codepressignore files under provided paths or repo root.
 */
function findCodepressIgnoreFiles(paths) {
    const results = [];
    function walkDir(dir) {
        try {
            const entries = (0, fs_1.readdirSync)(dir);
            for (const entry of entries) {
                const fullPath = (0, path_1.join)(dir, entry);
                const stat = (0, fs_1.statSync)(fullPath);
                if (stat.isDirectory()) {
                    if (!["node_modules", ".git", "dist", "build", ".next"].includes(entry)) {
                        walkDir(fullPath);
                    }
                }
                else if (stat.isFile() && entry === ".codepressignore") {
                    results.push((0, path_1.relative)(process.cwd(), fullPath));
                }
            }
        }
        catch {
            // skip unreadable
        }
    }
    if (paths && paths.length > 0) {
        for (const p of paths) {
            try {
                const full = (0, path_1.resolve)(process.cwd(), p);
                const s = (0, fs_1.statSync)(full);
                if (s.isDirectory()) {
                    walkDir(full);
                }
                else if (s.isFile() && full.endsWith(".codepressignore")) {
                    results.push((0, path_1.relative)(process.cwd(), full));
                }
            }
            catch {
                // skip
            }
        }
    }
    else {
        walkDir(process.cwd());
    }
    return results;
}
/**
 * Build ignore matcher from default patterns + all discovered .codepressignore files.
 */
function buildIgnoreMatcher(ignoreFiles) {
    const ig = (0, ignore_1.default)();
    ig.add(constants_1.DEFAULT_IGNORE_PATTERNS);
    for (const relPath of ignoreFiles) {
        try {
            const absolute = (0, path_1.resolve)(process.cwd(), relPath);
            const content = (0, fs_1.readFileSync)(absolute, "utf-8");
            const dir = (0, path_1.dirname)(relPath);
            const patterns = content
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith("#"));
            for (const pat of patterns) {
                const rebased = pat.startsWith("/") ? (0, path_1.join)(dir, pat) : (0, path_1.join)(dir, pat);
                ig.add(rebased.replace(/\\/g, "/"));
            }
        }
        catch {
            // skip bad ignore file
        }
    }
    return ig;
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
            .default(5)
            .describe("Number of lines before and after the match to include (default: 5)"),
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
                for (const imp of deps.imports) {
                    output.push(`  → ${imp}`);
                }
            }
            if (deps.importedBy.length > 0) {
                output.push(`Imported by (${deps.importedBy.length}):`);
                for (const imp of deps.importedBy) {
                    output.push(`  ← ${imp}`);
                }
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
async function runSearchRepo(params) {
    const { query, caseSensitive = null, regex = null, wordBoundary = null, extensions = null, paths = null, contextLines = 5, maxResults = 200, } = params;
    const cacheKey = {
        q: query,
        cs: caseSensitive,
        rx: regex,
        wb: wordBoundary,
        exts: Array.isArray(extensions) ? [...extensions].sort().join(",") : null,
        p: Array.isArray(paths) ? [...paths].sort().join(",") : null,
        cl: contextLines,
        mr: maxResults,
    };
    const cacheKeyStr = JSON.stringify(cacheKey);
    const cached = SEARCH_CACHE.get(cacheKeyStr);
    if (cached) {
        // refresh recency
        SEARCH_CACHE.delete(cacheKeyStr);
        SEARCH_CACHE.set(cacheKeyStr, cached);
        return cached;
    }
    // Build ignore set from .codepressignore and defaults
    const codepressIgnoreFiles = findCodepressIgnoreFiles(paths);
    const ig = buildIgnoreMatcher(codepressIgnoreFiles);
    // Prefer ripgrep if available. It respects .gitignore and is fast.
    try {
        const args = ["-n", "--json"]; // choose -F conditionally
        const isCaseSensitive = caseSensitive === true;
        if (!isCaseSensitive)
            args.push("-i");
        // Determine query mode and pattern
        let useRegex = regex === true;
        let pattern = query;
        function escapeRegexLiteral(s) {
            return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }
        if (wordBoundary === true) {
            if (!useRegex) {
                // Promote to regex with word boundaries
                useRegex = true;
                pattern = `\\b${escapeRegexLiteral(query)}\\b`;
            }
            else {
                // Already regex: wrap with word boundaries for exact symbol match
                pattern = `\\b(?:${pattern})\\b`;
            }
        }
        if (!useRegex) {
            args.push("-F"); // fixed-strings for plain search
        }
        // Optional extension globs
        if (Array.isArray(extensions) && extensions.length > 0) {
            for (const ext of extensions) {
                const pattern = ext.startsWith(".") ? `*${ext}` : `*.${ext}`;
                args.push("-g", pattern);
            }
        }
        // Pattern
        args.push(pattern);
        // Paths scope or default to current directory
        if (Array.isArray(paths) && paths.length > 0) {
            for (const p of paths)
                args.push(p);
        }
        else {
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
        const rg = (0, child_process_1.spawnSync)(rgBinary, args, {
            cwd: process.cwd(),
            encoding: "utf-8",
            maxBuffer: 32 * 1024 * 1024,
        });
        if (rg.error || (typeof rg.status === "number" && rg.status === 2)) {
            throw rg.error || new Error("ripgrep execution failed");
        }
        const stdout = rg.stdout || "";
        const lines = stdout.split("\n");
        const matchesByFile = new Map();
        let total = 0;
        for (const line of lines) {
            if (!line)
                continue;
            let obj = null;
            try {
                obj = JSON.parse(line);
            }
            catch {
                continue;
            }
            if (obj.type === "match") {
                const filePath = obj.data?.path?.text;
                const lineNum = obj.data?.line_number;
                if (!filePath || typeof lineNum !== "number")
                    continue;
                const arr = matchesByFile.get(filePath) || [];
                arr.push({ path: filePath, lineNumber: lineNum });
                matchesByFile.set(filePath, arr);
                total++;
                if (total >= maxResults)
                    break;
            }
        }
        if (total === 0) {
            const out = `No matches found for "${query}"`;
            // insert into cache
            SEARCH_CACHE.set(cacheKeyStr, out);
            if (SEARCH_CACHE.size > LRU_MAX) {
                // delete oldest
                const firstKey = SEARCH_CACHE.keys().next().value;
                if (firstKey)
                    SEARCH_CACHE.delete(firstKey);
            }
            return out;
        }
        // Build output with context by reading files once
        const outputs = [];
        for (const [file, recs] of matchesByFile.entries()) {
            const absolutePath = (0, path_1.resolve)(process.cwd(), file);
            if (!(0, fs_1.existsSync)(absolutePath))
                continue;
            let content = "";
            try {
                content = (0, fs_1.readFileSync)(absolutePath, "utf-8");
            }
            catch {
                continue;
            }
            const fileLines = content.split("\n");
            outputs.push(`=== ${file} (${recs.length} match${recs.length === 1 ? "" : "es"}) ===`);
            const snippets = [];
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
                snippets.push(`--- Match ${i + 1} (line ${rec.lineNumber}) ---\n${snippet}`);
            }
            outputs.push(snippets.join("\n\n"));
        }
        const out = outputs.join("\n\n");
        SEARCH_CACHE.set(cacheKeyStr, out);
        if (SEARCH_CACHE.size > LRU_MAX) {
            const firstKey = SEARCH_CACHE.keys().next().value;
            if (firstKey)
                SEARCH_CACHE.delete(firstKey);
        }
        return out;
    }
    catch {
        // Fallback to in-process search if ripgrep is unavailable
        const files = getAllSearchableFiles(extensions ?? undefined, paths ?? undefined, ig);
        const isCaseSensitive = caseSensitive === true;
        let useRegex = regex === true;
        let pattern = query;
        function escapeRegexLiteral(s) {
            return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }
        if (wordBoundary === true) {
            if (!useRegex) {
                useRegex = true;
                pattern = `\\b${escapeRegexLiteral(query)}\\b`;
            }
            else {
                pattern = `\\b(?:${pattern})\\b`;
            }
        }
        const flags = isCaseSensitive ? "g" : "gi";
        const re = useRegex ? new RegExp(pattern, flags) : null;
        const needle = isCaseSensitive ? query : query.toLowerCase();
        let total = 0;
        let truncated = false;
        const outputs = [];
        for (const file of files) {
            if (total >= maxResults)
                break;
            const absolutePath = (0, path_1.resolve)(process.cwd(), file);
            if (!(0, fs_1.existsSync)(absolutePath))
                continue;
            let content;
            try {
                content = (0, fs_1.readFileSync)(absolutePath, "utf-8");
            }
            catch {
                continue;
            }
            const lines = content.split("\n");
            const matches = [];
            for (let i = 0; i < lines.length; i++) {
                const hay = lines[i];
                const hayCmp = isCaseSensitive ? hay : hay.toLowerCase();
                const matched = re
                    ? re.test(hay)
                        ? true
                        : false
                    : hayCmp.includes(needle);
                if (matched) {
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
                    if (total >= maxResults)
                        break;
                }
            }
            if (matches.length > 0) {
                outputs.push(`=== ${file} (${matches.length} match${matches.length === 1 ? "" : "es"}) ===`);
                if (matches.length === 1) {
                    outputs.push(matches[0].snippet);
                }
                else {
                    outputs.push(matches
                        .map((m, idx) => `--- Match ${idx + 1} (line ${m.lineNumber}) ---\n${m.snippet}`)
                        .join("\n\n"));
                }
            }
            if (total >= maxResults) {
                truncated = true;
                break;
            }
        }
        if (outputs.length === 0) {
            const out = `No matches found for "${query}"`;
            SEARCH_CACHE.set(cacheKeyStr, out);
            if (SEARCH_CACHE.size > LRU_MAX) {
                const firstKey = SEARCH_CACHE.keys().next().value;
                if (firstKey)
                    SEARCH_CACHE.delete(firstKey);
            }
            return out;
        }
        if (truncated) {
            outputs.push(`\n[Truncated after ${maxResults} matches]`);
        }
        const out = outputs.join("\n\n");
        SEARCH_CACHE.set(cacheKeyStr, out);
        if (SEARCH_CACHE.size > LRU_MAX) {
            const firstKey = SEARCH_CACHE.keys().next().value;
            if (firstKey)
                SEARCH_CACHE.delete(firstKey);
        }
        return out;
    }
}
exports.searchRepoTool = (0, agents_1.tool)({
    name: "search_repo",
    description: "Search the repository (respects .gitignore) for a plain-text query using ripgrep when available. Returns file paths and matching line snippets with context.",
    parameters: zod_1.z.object({
        query: zod_1.z
            .string()
            .describe("Plain-text query to search for (case-insensitive by default)"),
        caseSensitive: zod_1.z
            .boolean()
            .nullish()
            .describe("If true, perform a case-sensitive search (null = default insensitive)"),
        regex: zod_1.z
            .boolean()
            .nullish()
            .describe("If true, treat 'query' as a regex (ripgrep default); otherwise use fixed-string"),
        wordBoundary: zod_1.z
            .boolean()
            .nullish()
            .describe("If true, perform word-boundary match (wraps query with \\b ... \\b)"),
        extensions: zod_1.z
            .array(zod_1.z.string())
            .nullish()
            .describe("Optional list of file extensions to include (e.g., ['.py','.go','.rb','.md']). Defaults to all files when null"),
        paths: zod_1.z
            .array(zod_1.z.string())
            .nullish()
            .describe("Optional repo-relative directories or files to scope the search"),
        contextLines: zod_1.z
            .number()
            .int()
            .min(0)
            .default(5)
            .describe("Number of lines before and after each match to include (default: 5)"),
        maxResults: zod_1.z
            .number()
            .int()
            .min(1)
            .max(5000)
            .default(200)
            .describe("Maximum total matches to return across all files (default: 200)"),
    }),
    execute: runSearchRepo,
});
/**
 * Tool to run bash commands in the repository.
 * Useful for git operations, GitHub CLI, grep, find, etc.
 */
exports.bashTool = (0, agents_1.tool)({
    name: "bash",
    description: `Run a bash command in the repository root. Useful for:
- Read files: cat, head, tail, less
- Search code: rg (ripgrep), grep -r
- Git commands: git log, git diff, git blame, git show
- GitHub CLI: gh pr view, gh issue list, gh api
- File operations: find, ls, wc, tree
- Text processing: awk, sed, sort, uniq
- Package info: npm list, pip list, cargo tree

Note: Git history may be limited (shallow clone). If git blame/log fails, proceed without that context.
Commands run with a 30-second timeout and 100KB output limit.`,
    parameters: zod_1.z.object({
        command: zod_1.z
            .string()
            .describe("The bash command to execute. Can include pipes and shell features."),
    }),
    execute: async ({ command }) => {
        try {
            // Build environment with GitHub token for gh CLI
            const env = { ...process.env };
            // Ensure GH_TOKEN is set for GitHub CLI (it uses GH_TOKEN or GITHUB_TOKEN)
            if (process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
                env.GH_TOKEN = process.env.GITHUB_TOKEN;
            }
            // Run the command from the repository root
            const result = (0, child_process_1.execSync)(command, {
                cwd: process.cwd(),
                encoding: "utf-8",
                timeout: BASH_TIMEOUT_MS,
                maxBuffer: MAX_BASH_OUTPUT,
                shell: "/bin/bash",
                env,
                // Capture both stdout and stderr
                stdio: ["pipe", "pipe", "pipe"],
            });
            if (!result || result.trim() === "") {
                return "(command completed with no output)";
            }
            // Truncate if needed
            if (result.length > MAX_BASH_OUTPUT) {
                return (result.slice(0, MAX_BASH_OUTPUT) +
                    `\n\n[Output truncated at ${MAX_BASH_OUTPUT} bytes]`);
            }
            return result;
        }
        catch (error) {
            const err = error;
            // Handle timeout
            if (err.killed) {
                return `Error: Command timed out after ${BASH_TIMEOUT_MS / 1000} seconds`;
            }
            // Return stderr if available, otherwise the error message
            const stderr = err.stderr?.trim();
            const stdout = err.stdout?.trim();
            const exitCode = err.status;
            let output = "";
            if (stdout)
                output += stdout + "\n";
            if (stderr)
                output += stderr + "\n";
            if (exitCode !== undefined) {
                output += `\nExit code: ${exitCode}`;
            }
            return output.trim() || `Error: ${err.message || "Command failed"}`;
        }
    },
});
exports.allTools = [exports.bashTool, exports.depGraphTool];
//# sourceMappingURL=tools.js.map