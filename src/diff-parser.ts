import { FileLineMap } from "./types";
import { parsePatch } from "diff";

export interface ProcessableChunk {
  fileName: string;
  content: string;
  hunk: any;
}

/**
 * Splits a diff text into processable chunks.
 * @param diffText The raw diff text.
 * @returns An array of processable chunks.
 */
export function splitDiff(diffText: string): ProcessableChunk[] {
  const files = parsePatch(diffText);
  return files.flatMap((file) => {
    if (!file.hunks || !file.newFileName) {
      return [];
    }
    return file.hunks.map((hunk) => {
      const header = `--- ${file.oldFileName}\n+++ ${file.newFileName}\n`;
      const hunkContent = hunk.lines.join("\n");

      // For deleted files, newFileName is /dev/null. Use oldFileName instead.
      // For new files, oldFileName is /dev/null. Use newFileName.
      let fileName =
        file.newFileName !== "/dev/null" ? file.newFileName : file.oldFileName;

      // Remove the "a/" or "b/" prefix
      if (fileName.startsWith("a/") || fileName.startsWith("b/")) {
        fileName = fileName.substring(2);
      }

      return {
        fileName,
        content: `${header}@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n${hunkContent}`,
        hunk,
      };
    });
  });
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
