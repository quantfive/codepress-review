"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterPRFiles = filterPRFiles;
exports.formatPRFilesForPrompt = formatPRFilesForPrompt;
exports.shouldIncludePatches = shouldIncludePatches;
exports.getFilterStats = getFilterStats;
const ignore_1 = __importDefault(require("ignore"));
const constants_1 = require("./constants");
/**
 * Creates an ignore filter from DEFAULT_IGNORE_PATTERNS
 */
function createIgnoreFilter() {
    const ig = (0, ignore_1.default)();
    ig.add(constants_1.DEFAULT_IGNORE_PATTERNS);
    return ig;
}
/**
 * Filters PR files to remove ignored patterns (lock files, build outputs, etc.)
 */
function filterPRFiles(files) {
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
function formatPRFilesForPrompt(files, includePatches = false) {
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
function shouldIncludePatches(files) {
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
function getFilterStats(originalCount, filteredFiles) {
    const filteredCount = filteredFiles.length;
    const ignoredCount = originalCount - filteredCount;
    if (ignoredCount === 0) {
        return "";
    }
    return `\n(${ignoredCount} file${ignoredCount === 1 ? "" : "s"} filtered out: lock files, build outputs, etc.)`;
}
//# sourceMappingURL=pr-files.js.map