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
 * Tool to find similar patterns in the codebase
 */
export const findPatternsTool = tool({
  name: "find_patterns",
  description: "Find similar code patterns or implementations in the codebase for a given domain or file type",
  parameters: z.object({
    domain: z.string().describe("Domain or feature area (e.g., 'components', 'auth', 'api')"),
    filePattern: z.string().optional().describe("File pattern to match (e.g., '*.tsx', 'Button*')"),
    maxResults: z.number().int().min(1).max(10).default(5).describe("Maximum number of examples to return"),
  }),
  execute: async ({ domain, filePattern, maxResults }) => {
    const sourceFiles = getAllSourceFiles();
    
    let matchingFiles = sourceFiles.filter(file => {
      if (filePattern) {
        const pattern = filePattern.replace(/\*/g, '.*');
        const regex = new RegExp(pattern, 'i');
        return regex.test(file);
      }
      return file.toLowerCase().includes(domain.toLowerCase());
    });

    matchingFiles = matchingFiles.slice(0, maxResults);
    
    const results: string[] = [];
    for (const file of matchingFiles) {
      try {
        const absolutePath = resolve(process.cwd(), file);
        if (existsSync(absolutePath)) {
          const content = readFileSync(absolutePath, 'utf-8');
          // Get first 50 lines for pattern analysis
          const preview = content.split('\n').slice(0, 50).join('\n');
          results.push(`\n=== ${file} ===\n${preview}\n`);
        }
      } catch {
        results.push(`\n=== ${file} ===\nError reading file\n`);
      }
    }
    
    if (results.length === 0) {
      return `No patterns found for domain "${domain}"${filePattern ? ` with pattern "${filePattern}"` : ''}`;
    }
    
    return `Found ${results.length} pattern examples:\n${results.join('\n')}`;
  },
});

/**
 * Tool to find available utilities in the codebase
 */
export const findUtilitiesTool = tool({
  name: "find_utilities",
  description: "Find available utility functions, hooks, or services that might be relevant to the current changes",
  parameters: z.object({
    category: z.string().describe("Category to search for (e.g., 'validation', 'formatting', 'api', 'hooks')"),
    keyword: z.string().optional().describe("Optional keyword to filter results"),
  }),
  execute: async ({ category, keyword }) => {
    const sourceFiles = getAllSourceFiles();
    
    // Look for utility files
    const utilityFiles = sourceFiles.filter(file => {
      const lowerFile = file.toLowerCase();
      return (
        lowerFile.includes('util') ||
        lowerFile.includes('helper') ||
        lowerFile.includes('hook') ||
        lowerFile.includes('service') ||
        lowerFile.includes(category.toLowerCase()) ||
        (keyword && lowerFile.includes(keyword.toLowerCase()))
      );
    }).slice(0, 8);
    
    const utilities: string[] = [];
    
    for (const file of utilityFiles) {
      try {
        const absolutePath = resolve(process.cwd(), file);
        if (existsSync(absolutePath)) {
          const content = readFileSync(absolutePath, 'utf-8');
          
          // Extract exported functions/constants
          const exportMatches = [
            ...content.matchAll(/export\s+(function|const|class)\s+(\w+)/g),
            ...content.matchAll(/export\s*{\s*([^}]+)\s*}/g),
          ];
          
          if (exportMatches.length > 0) {
            const exports = exportMatches.map(match => {
              if (match[1] === 'function' || match[1] === 'const' || match[1] === 'class') {
                return match[2];
              } else {
                // Parse export list
                return match[1].split(',').map(exp => exp.trim()).join(', ');
              }
            }).join(', ');
            
            // Get JSDoc comment if available
            const commentMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            const description = commentMatch 
              ? commentMatch[1].replace(/\s*\*\s?/g, ' ').trim().slice(0, 100)
              : '';
            
            utilities.push(`\n=== ${file} ===\nExports: ${exports}\n${description ? `Description: ${description}` : ''}`);
          }
        }
      } catch {
        // Skip files we can't read
      }
    }
    
    if (utilities.length === 0) {
      return `No utilities found for category "${category}"${keyword ? ` with keyword "${keyword}"` : ''}`;
    }
    
    return `Found ${utilities.length} relevant utilities:\n${utilities.join('\n')}`;
  },
});

/**
 * Tool to analyze architectural context
 */
export const analyzeArchitectureTool = tool({
  name: "analyze_architecture", 
  description: "Analyze the architectural context and relationships for changed files",
  parameters: z.object({
    filePaths: z.array(z.string()).describe("Array of file paths to analyze"),
    depth: z.number().int().min(1).max(3).default(2).describe("Depth of analysis"),
  }),
  execute: async ({ filePaths, depth }) => {
    const results: string[] = [];
    
    for (const filePath of filePaths.slice(0, 5)) { // Limit to avoid overwhelming
      if (!existsSync(resolve(process.cwd(), filePath))) {
        results.push(`\n=== ${filePath} ===\nFile not found`);
        continue;
      }
      
      // Get dependency information for the file
      const { imports } = extractDependencies(filePath);
      const importedBy = findImporters(filePath, getAllSourceFiles());
      
      let depGraph = `Dependencies: ${imports.length > 0 ? imports.join(', ') : 'None'}`;
      depGraph += `\nImported by: ${importedBy.length > 0 ? importedBy.join(', ') : 'None'}`;
      
      // Analyze the file type and purpose
      const fileType = inferFileType(filePath);
      const purpose = await inferFilePurpose(filePath);
      
      results.push(`\n=== ${filePath} ===`);
      results.push(`Type: ${fileType}`);
      results.push(`Purpose: ${purpose}`);
      results.push(`Dependencies:`);
      results.push(depGraph);
    }
    
    return results.join('\n');
  },
});

// Helper functions for the new tools

function inferFileType(filePath: string): string {
  const ext = extname(filePath);
  const dir = dirname(filePath);
  const name = filePath.toLowerCase();
  
  if (name.includes('component') || name.includes('page') || ext === '.tsx') {
    return 'React Component';
  }
  if (name.includes('hook')) return 'Custom Hook';
  if (name.includes('util') || name.includes('helper')) return 'Utility';
  if (name.includes('service') || name.includes('api')) return 'Service';
  if (name.includes('type') || name.includes('interface')) return 'Type Definition';
  if (name.includes('test') || name.includes('spec')) return 'Test';
  if (dir.includes('store') || name.includes('reducer')) return 'State Management';
  
  return 'Module';
}

async function inferFilePurpose(filePath: string): Promise<string> {
  try {
    const content = readFileSync(resolve(process.cwd(), filePath), 'utf-8');
    
    // Look for JSDoc comments at the top
    const docMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
    if (docMatch) {
      const doc = docMatch[1].replace(/\s*\*\s?/g, ' ').trim();
      if (doc.length > 10) {
        return doc.slice(0, 100) + (doc.length > 100 ? '...' : '');
      }
    }
    
    // Look for single-line comments
    const commentMatch = content.match(/^\/\/\s*(.+)/m);
    if (commentMatch) {
      return commentMatch[1].trim().slice(0, 100);
    }
    
    // Infer from exports
    if (content.includes('export default')) {
      const defaultExport = content.match(/export default\s+(\w+)/);
      if (defaultExport) {
        return `Exports ${defaultExport[1]}`;
      }
    }
    
    return 'Purpose not documented';
  } catch {
    return 'Could not analyze';
  }
}

export const allTools = [fetchFileTool, fetchSnippetTool, depGraphTool, findPatternsTool, findUtilitiesTool, analyzeArchitectureTool];
