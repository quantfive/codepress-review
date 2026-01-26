import ignore from "ignore";
import { DEFAULT_IGNORE_PATTERNS } from "./constants";

/**
 * Represents a file changed in a PR with its patch/diff
 */
export interface PRFile {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string; // The diff/patch for this file (may be undefined for binary files)
  previousFilename?: string; // For renamed files
}

/**
 * Creates an ignore filter from DEFAULT_IGNORE_PATTERNS
 */
function createIgnoreFilter() {
  const ig = ignore();
  ig.add(DEFAULT_IGNORE_PATTERNS);
  return ig;
}

/**
 * Filters PR files to remove ignored patterns (lock files, build outputs, etc.)
 */
export function filterPRFiles(files: PRFile[]): PRFile[] {
  const ig = createIgnoreFilter();

  return files.filter((file) => {
    // Check if the file should be ignored
    const isIgnored = ig.ignores(file.filename);
    return !isIgnored;
  });
}

/**
 * Formats filtered PR files into a string for the agent prompt
 */
export function formatPRFilesForPrompt(files: PRFile[], includePatches: boolean = false): string {
  if (files.length === 0) {
    return "<prFiles>\nNo files to review (all files matched ignore patterns).\n</prFiles>";
  }

  const fileList = files.map((file) => {
    const status = file.status === "renamed" && file.previousFilename
      ? `renamed from ${file.previousFilename}`
      : file.status;
    const stats = `+${file.additions}/-${file.deletions}`;
    return `  - ${file.filename} (${status}, ${stats})`;
  }).join("\n");

  let output = `<prFiles count="${files.length}">
**Changed files to review:**
${fileList}
</prFiles>`;

  // Include patches if requested and files are small enough
  if (includePatches) {
    const patchesSection = files
      .filter((file) => file.patch && file.patch.length < 50000) // Skip very large patches
      .map((file) => `<filePatch filename="${file.filename}" status="${file.status}">
${file.patch}
</filePatch>`)
      .join("\n\n");

    if (patchesSection) {
      output += `\n\n<patches>
${patchesSection}
</patches>`;
    }
  }

  return output;
}

/**
 * Determines if patches should be included based on total size
 * Include patches for small PRs (< 10 files or < 100KB total patch size)
 */
export function shouldIncludePatches(files: PRFile[]): boolean {
  if (files.length > 15) {
    return false;
  }

  const totalPatchSize = files.reduce((sum, file) => {
    return sum + (file.patch?.length || 0);
  }, 0);

  // Include patches if total is under 200KB
  return totalPatchSize < 200 * 1024;
}

/**
 * Gets statistics about filtered vs total files
 */
export function getFilterStats(originalCount: number, filteredFiles: PRFile[]): string {
  const filteredCount = filteredFiles.length;
  const ignoredCount = originalCount - filteredCount;

  if (ignoredCount === 0) {
    return "";
  }

  return `\n(${ignoredCount} file${ignoredCount === 1 ? "" : "s"} filtered out: lock files, build outputs, etc.)`;
}
