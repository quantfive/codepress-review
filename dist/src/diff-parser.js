"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitDiff = splitDiff;
exports.buildFileLineMap = buildFileLineMap;
exports.getFileNameFromChunk = getFileNameFromChunk;
/**
 * Splits a diff into individual hunks for focused review.
 * Each hunk becomes its own chunk with the necessary file headers.
 * This ensures each review is focused on a specific change rather than arbitrary size limits.
 */
function splitDiff(diff) {
    // Split on hunk headers to create individual chunks per hunk
    const hunks = diff.split(/(^@@ .+ @@.*$)/m).filter(Boolean);
    const chunks = [];
    let currentChunk = "";
    let fileHeader = "";
    for (let i = 0; i < hunks.length; i++) {
        const part = hunks[i];
        // Check if this is a file header (--- or +++ lines)
        if (part.match(/^(---|\+\+\+) /m)) {
            fileHeader += part;
            continue;
        }
        // If this is a hunk header (@@), start a new chunk
        if (part.startsWith("@@")) {
            // Save previous chunk if it exists
            if (currentChunk.trim()) {
                chunks.push(currentChunk);
            }
            // Start new chunk with file header and hunk header
            currentChunk = fileHeader + part;
        }
        else {
            // Add hunk content to current chunk
            currentChunk += part;
        }
    }
    // Add the final chunk
    if (currentChunk.trim()) {
        chunks.push(currentChunk);
    }
    return chunks.filter((chunk) => chunk.trim().length > 0);
}
/**
 * Builds a mapping of file paths to line numbers from a diff chunk.
 */
function buildFileLineMap(diffChunk) {
    const lines = diffChunk.split("\n");
    const fileLineMap = {};
    let currentFile = "";
    let currentNewLine = 0;
    for (const line of lines) {
        // Check for file header
        const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
        if (fileMatch) {
            currentFile = fileMatch[1];
            fileLineMap[currentFile] = {};
            continue;
        }
        // Check for hunk header
        const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunkMatch) {
            currentNewLine = parseInt(hunkMatch[1]);
            continue;
        }
        // Track line numbers for added/unchanged lines
        if (line.startsWith("+") && !line.startsWith("+++")) {
            if (currentFile && !fileLineMap[currentFile][line]) {
                fileLineMap[currentFile][line] = currentNewLine;
            }
            currentNewLine++;
        }
        else if (line.startsWith(" ")) {
            currentNewLine++;
        }
    }
    return fileLineMap;
}
/**
 * Extracts the file path from a diff chunk.
 * @param chunk A single diff chunk.
 * @returns The file path or null if not found.
 */
function getFileNameFromChunk(chunk) {
    const lines = chunk.split("\n");
    for (const line of lines) {
        const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
        if (fileMatch) {
            return fileMatch[1];
        }
    }
    return null;
}
//# sourceMappingURL=diff-parser.js.map