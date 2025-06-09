"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseXMLResponse = parseXMLResponse;
exports.resolveLineNumbers = resolveLineNumbers;
const diff_parser_1 = require("./diff-parser");
/**
 * Parses XML response from AI model into Finding objects.
 */
function parseXMLResponse(xmlText) {
    const findings = [];
    // Extract all <comment> blocks
    const commentRegex = /<comment>([\s\S]*?)<\/comment>/g;
    let match;
    while ((match = commentRegex.exec(xmlText)) !== null) {
        const commentContent = match[1];
        // Extract individual fields
        const severityMatch = commentContent.match(/<severity>(.*?)<\/severity>/s);
        const fileMatch = commentContent.match(/<file>(.*?)<\/file>/s);
        const lineMatch = commentContent.match(/<line>(.*?)<\/line>/s);
        const messageMatch = commentContent.match(/<message>([\s\S]*?)<\/message>/s);
        const suggestionMatch = commentContent.match(/<suggestion>([\s\S]*?)<\/suggestion>/s);
        const codeMatch = commentContent.match(/<code>([\s\S]*?)<\/code>/s);
        if (!fileMatch || !lineMatch || !messageMatch) {
            continue; // Skip incomplete comments
        }
        const filePath = fileMatch[1].trim();
        const message = messageMatch[1].trim();
        const severity = severityMatch ? severityMatch[1].trim() : undefined;
        const suggestion = suggestionMatch ? suggestionMatch[1].trim() : undefined;
        const code = codeMatch ? codeMatch[1].trim() : undefined;
        findings.push({
            path: filePath,
            line: null, // Will be resolved later
            message: message,
            severity: severity,
            suggestion: suggestion,
            code: code,
        });
    }
    return findings;
}
/**
 * Resolves line numbers for findings by matching against diff content.
 */
function resolveLineNumbers(findings, diffChunk) {
    const fileLineMap = (0, diff_parser_1.buildFileLineMap)(diffChunk);
    // Update findings with resolved line numbers
    return findings.map((finding) => {
        const fileMap = fileLineMap[finding.path];
        if (fileMap) {
            // Try to find a matching line in the file map
            for (const [lineContent, lineNum] of Object.entries(fileMap)) {
                // This is a simple heuristic - in practice, you might need more sophisticated matching
                if (lineContent.includes(finding.message.substring(0, 20))) {
                    finding.line = lineNum;
                    break;
                }
            }
        }
        return finding;
    });
}
//# sourceMappingURL=xml-parser.js.map