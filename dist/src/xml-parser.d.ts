import type { Finding, AgentResponse } from "./types";
/**
 * Parses XML response from AI model into Finding objects.
 * @deprecated Use parseAgentResponse instead
 */
export declare function parseXMLResponse(xmlText: string): Finding[];
/**
 * Parses XML response from AI model into AgentResponse with findings and resolved comments.
 */
export declare function parseAgentResponse(xmlText: string): AgentResponse;
/**
 * Resolves line numbers for findings by matching against diff content.
 */
export declare function resolveLineNumbers(findings: Finding[], diffChunk: string): Finding[];
//# sourceMappingURL=xml-parser.d.ts.map