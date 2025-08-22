export interface Finding {
    path: string;
    line: number | null;
    lineToMatch?: string;
    message: string;
    severity?: string;
    suggestion?: string;
}
export interface ReviewConfig {
    diff: string;
    pr: number;
    provider: string;
    modelName: string;
    githubToken: string;
    githubRepository: string;
    maxTurns: number;
    updatePrDescription: boolean;
    debug: boolean;
    blockingOnly: boolean;
}
export interface ModelConfig {
    provider: string;
    modelName: string;
    apiKey: string;
}
export interface ParsedArgs {
    diff: string;
    pr: number;
}
export interface GitHubConfig {
    owner: string;
    repo: string;
    token: string;
}
export interface FileLineMap {
    [filePath: string]: {
        [lineContent: string]: number;
    };
}
export type PRType = "feature" | "bugfix" | "refactor" | "docs" | "test" | "chore" | "dependency-bump" | "mixed";
export type RiskTag = "SEC" | "PERF" | "ARCH" | "TEST" | "STYLE" | "DEP";
export interface RiskItem {
    tag: RiskTag;
    description: string;
}
export interface IssueItem {
    severity: string;
    kind: string;
    description: string;
}
export interface HunkSummary {
    index: number;
    file: string;
    overview: string;
    risks: RiskItem[];
    issues: IssueItem[];
    tests: string[];
}
export type ReviewDecision = "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
export interface DiffSummary {
    prType: PRType;
    summaryPoints: string[];
    keyRisks: RiskItem[];
    hunks: HunkSummary[];
    decision: {
        recommendation: ReviewDecision;
        reasoning: string;
    };
    prDescription?: string;
}
export interface ResolvedComment {
    commentId: string;
    path: string;
    line: number;
    reason: string;
}
export interface AgentResponse {
    findings: Finding[];
    resolvedComments: ResolvedComment[];
}
//# sourceMappingURL=types.d.ts.map