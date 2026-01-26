/**
 * Represents a file changed in a PR with its patch/diff
 */
export interface PRFile {
    filename: string;
    status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    previousFilename?: string;
}
/**
 * Filters PR files to remove ignored patterns (lock files, build outputs, etc.)
 */
export declare function filterPRFiles(files: PRFile[]): PRFile[];
/**
 * Formats filtered PR files into a string for the agent prompt
 */
export declare function formatPRFilesForPrompt(files: PRFile[], includePatches?: boolean): string;
/**
 * Determines if patches should be included based on total size
 * Include patches for small PRs (< 10 files or < 100KB total patch size)
 */
export declare function shouldIncludePatches(files: PRFile[]): boolean;
/**
 * Gets statistics about filtered vs total files
 */
export declare function getFilterStats(originalCount: number, filteredFiles: PRFile[]): string;
//# sourceMappingURL=pr-files.d.ts.map