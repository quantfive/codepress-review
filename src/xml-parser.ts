import type { Finding, ResolvedComment, AgentResponse } from "./types";
import { buildFileLineMap } from "./diff-parser";

/**
 * Parses XML response from AI model into Finding objects.
 * @deprecated Use parseAgentResponse instead
 */
export function parseXMLResponse(xmlText: string): Finding[] {
  const response = parseAgentResponse(xmlText);
  return response.findings;
}

/**
 * Parses XML response from AI model into AgentResponse with findings and resolved comments.
 */
export function parseAgentResponse(xmlText: string): AgentResponse {
  const findings: Finding[] = [];
  const resolvedComments: ResolvedComment[] = [];

  // Extract PR summary
  const prSummaryMatch = xmlText.match(/<prSummary>([\s\S]*?)<\/prSummary>/s);
  const prSummary = prSummaryMatch ? prSummaryMatch[1].trim() : undefined;

  // Extract all <comment> blocks from <comments> section
  const commentsSection = xmlText.match(/<comments>([\s\S]*?)<\/comments>/s);
  if (commentsSection) {
    const commentRegex = /<comment>([\s\S]*?)<\/comment>/g;
    let match;

    while ((match = commentRegex.exec(commentsSection[1])) !== null) {
      const commentContent = match[1];

      // Extract individual fields
      const severityMatch = commentContent.match(
        /<severity>(.*?)<\/severity>/s,
      );
      const fileMatch = commentContent.match(/<file>(.*?)<\/file>/s);
      const lineMatch = commentContent.match(/<line>(.*?)<\/line>/s);
      const messageMatch = commentContent.match(
        /<message>([\s\S]*?)<\/message>/s,
      );
      const suggestionMatch = commentContent.match(
        /<suggestion>([\s\S]*?)<\/suggestion>/s,
      );

      if (!fileMatch || !lineMatch || !messageMatch) {
        continue; // Skip incomplete comments
      }

      const filePath = fileMatch[1].trim();
      const message = messageMatch[1].trim();
      const severity = severityMatch ? severityMatch[1].trim() : undefined;
      const suggestion = suggestionMatch
        ? suggestionMatch[1].trim()
        : undefined;
      let lineToMatch: string | undefined;

      // The line content is used for matching, we need to strip the diff marker.
      let lineContent = lineMatch[1];
      if (
        lineContent.startsWith("+") ||
        lineContent.startsWith("-") ||
        lineContent.startsWith(" ")
      ) {
        lineToMatch = lineContent.substring(1);
      } else {
        lineToMatch = lineContent;
      }

      findings.push({
        path: filePath,
        line: null, // Will be resolved later
        lineToMatch: lineToMatch,
        message: message,
        severity: severity,
        suggestion: suggestion,
      });
    }
  }

  // Extract all <resolved> blocks from <resolvedComments> section
  const resolvedSection = xmlText.match(
    /<resolvedComments>([\s\S]*?)<\/resolvedComments>/s,
  );
  if (resolvedSection) {
    const resolvedRegex = /<resolved>([\s\S]*?)<\/resolved>/g;
    let match;

    while ((match = resolvedRegex.exec(resolvedSection[1])) !== null) {
      const resolvedContent = match[1];

      // Extract individual fields
      const pathMatch = resolvedContent.match(/<path>(.*?)<\/path>/s);
      const lineMatch = resolvedContent.match(/<line>(.*?)<\/line>/s);
      const reasonMatch = resolvedContent.match(
        /<reason>([\s\S]*?)<\/reason>/s,
      );
      const commentIdMatch = resolvedContent.match(
        /<commentId>(.*?)<\/commentId>/s,
      );

      if (!pathMatch || !lineMatch || !reasonMatch) {
        continue; // Skip incomplete resolved comments
      }

      const path = pathMatch[1].trim();
      const line = parseInt(lineMatch[1].trim(), 10);
      const reason = reasonMatch[1].trim();
      const commentId = commentIdMatch
        ? commentIdMatch[1].trim()
        : `${path}:${line}`;

      resolvedComments.push({
        commentId: commentId,
        path: path,
        line: line,
        reason: reason,
      });
    }
  }

  // Fallback: if no structured sections found, try parsing as old format
  if (findings.length === 0 && resolvedComments.length === 0) {
    const commentRegex = /<comment>([\s\S]*?)<\/comment>/g;
    let match;

    while ((match = commentRegex.exec(xmlText)) !== null) {
      const commentContent = match[1];

      // Extract individual fields
      const severityMatch = commentContent.match(
        /<severity>(.*?)<\/severity>/s,
      );
      const fileMatch = commentContent.match(/<file>(.*?)<\/file>/s);
      const lineMatch = commentContent.match(/<line>(.*?)<\/line>/s);
      const messageMatch = commentContent.match(
        /<message>([\s\S]*?)<\/message>/s,
      );
      const suggestionMatch = commentContent.match(
        /<suggestion>([\s\S]*?)<\/suggestion>/s,
      );

      if (!fileMatch || !lineMatch || !messageMatch) {
        continue; // Skip incomplete comments
      }

      const filePath = fileMatch[1].trim();
      const message = messageMatch[1].trim();
      const severity = severityMatch ? severityMatch[1].trim() : undefined;
      const suggestion = suggestionMatch
        ? suggestionMatch[1].trim()
        : undefined;
      let lineToMatch: string | undefined;

      // The line content is used for matching, we need to strip the diff marker.
      let lineContent = lineMatch[1];
      if (
        lineContent.startsWith("+") ||
        lineContent.startsWith("-") ||
        lineContent.startsWith(" ")
      ) {
        lineToMatch = lineContent.substring(1);
      } else {
        lineToMatch = lineContent;
      }

      findings.push({
        path: filePath,
        line: null, // Will be resolved later
        lineToMatch: lineToMatch,
        message: message,
        severity: severity,
        suggestion: suggestion,
      });
    }
  }

  return { findings, resolvedComments, prSummary };
}

/**
 * Resolves line numbers for findings by matching against diff content.
 */
export function resolveLineNumbers(
  findings: Finding[],
  diffChunk: string,
): Finding[] {
  const fileLineMap = buildFileLineMap(diffChunk);

  // Update findings with resolved line numbers
  const resolvedFindings = findings.map((finding) => {
    if (!finding.lineToMatch) {
      return finding; // Cannot resolve without line content to match
    }

    const fileMap = fileLineMap[finding.path];
    if (fileMap) {
      // Try to find a matching line in the file map
      for (const [lineContent, lineNum] of Object.entries(fileMap)) {
        // Use the 'lineToMatch' from the finding to match the line content from the diff
        if (lineContent.includes(finding.lineToMatch)) {
          return { ...finding, line: lineNum };
        }
      }
    }
    return finding;
  });

  return resolvedFindings;
}
