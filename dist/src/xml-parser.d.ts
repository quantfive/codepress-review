import { Finding } from "./types";
/**
 * Parses XML response from AI model into Finding objects.
 */
export declare function parseXMLResponse(xmlText: string): Finding[];
/**
 * Resolves line numbers for findings by matching against diff content.
 */
export declare function resolveLineNumbers(findings: Finding[], diffChunk: string): Finding[];
//# sourceMappingURL=xml-parser.d.ts.map