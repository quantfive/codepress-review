import { FileLineMap } from "./types";

/**
 * Splits a diff into chunks for each file.
 */
export function splitDiff(diff: string): string[] {
  // Split by the file indicator, keeping the delimiter
  const chunks = diff.split(/(?=diff --git a\/)/);
  // The first element is often empty, so filter it out
  return chunks.filter((chunk) => chunk.trim().length > 0);
}

/**
 * Builds a mapping of file paths to line numbers from a diff chunk.
 */
export function buildFileLineMap(diffChunk: string): FileLineMap {
  const lines = diffChunk.split("\n");
  const fileLineMap: FileLineMap = {};

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
    } else if (line.startsWith(" ")) {
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
export function getFileNameFromChunk(chunk: string): string | null {
  const fileMatch = chunk.match(/^diff --git a\/(.+?) b\//);
  return fileMatch ? fileMatch[1] : null;
}
