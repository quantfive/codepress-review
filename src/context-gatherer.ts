import { ProcessableChunk } from "./diff-parser";
import { DiffSummary, ModelConfig } from "./types";
import { debugLog } from "./debug";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, extname } from "path";

export interface ReviewContext {
  featureIntent: FeatureIntent;
  codebasePatterns: CodebasePattern[];
  architecturalContext: ArchitecturalContext;
  availableUtilities: AvailableUtility[];
}

export interface FeatureIntent {
  summary: string;
  domain: string; // e.g., "authentication", "ui-components", "data-layer"
  changeType: string; // e.g., "feature", "bugfix", "refactor", "performance"
  businessContext: string;
  technicalApproach: string;
}

export interface CodebasePattern {
  type: string; // e.g., "component-structure", "error-handling", "state-management"
  pattern: string;
  examples: string[];
  files: string[];
}

export interface ArchitecturalContext {
  relatedFiles: string[];
  dataFlow: string[];
  integrationPoints: string[];
  potentialImpacts: string[];
}

export interface AvailableUtility {
  type: string; // e.g., "helper-function", "hook", "component", "service"
  name: string;
  file: string;
  description: string;
  usage: string;
}

/**
 * Gathers comprehensive context for human-like code reviews
 */
export class ContextGatherer {
  private repoRoot: string;
  private allSourceFiles: string[] = [];

  constructor() {
    this.repoRoot = process.cwd();
    this.allSourceFiles = this.getAllSourceFiles();
  }

  /**
   * Main method to gather all context before review
   */
  async gatherReviewContext(
    chunks: ProcessableChunk[],
    diffSummary?: DiffSummary,
    prInfo?: any
  ): Promise<ReviewContext> {
    debugLog("🔍 Gathering comprehensive review context...");

    const featureIntent = this.extractFeatureIntent(diffSummary, prInfo);
    const codebasePatterns = await this.discoverCodebasePatterns(chunks, featureIntent);
    const architecturalContext = await this.analyzeArchitecturalContext(chunks);
    const availableUtilities = await this.findAvailableUtilities(chunks, featureIntent);

    return {
      featureIntent,
      codebasePatterns,
      architecturalContext,
      availableUtilities,
    };
  }

  /**
   * Extract feature intent from PR description and diff summary
   */
  private extractFeatureIntent(
    diffSummary?: DiffSummary,
    prInfo?: any
  ): FeatureIntent {
    let summary = "Code changes";
    let businessContext = "";
    let technicalApproach = "";

    // Use auto-generated PR description if available
    if (diffSummary?.prDescription) {
      summary = diffSummary.prDescription;
      businessContext = this.extractBusinessContext(diffSummary.prDescription);
      technicalApproach = this.extractTechnicalApproach(diffSummary.prDescription);
    }

    // Fallback to PR title/body if no generated description
    if (prInfo?.title && (!diffSummary?.prDescription || diffSummary.prDescription.trim() === "")) {
      summary = prInfo.title + (prInfo.body ? `\n${prInfo.body}` : "");
    }

    // Determine domain from file paths and content
    const domain = this.inferDomain(diffSummary);
    const changeType = this.inferChangeType(summary, diffSummary);

    return {
      summary,
      domain,
      changeType,
      businessContext,
      technicalApproach,
    };
  }

  /**
   * Discover existing patterns in the codebase that are relevant to the changes
   */
  private async discoverCodebasePatterns(
    chunks: ProcessableChunk[],
    featureIntent: FeatureIntent
  ): Promise<CodebasePattern[]> {
    const patterns: CodebasePattern[] = [];
    
    // Get all unique file paths from chunks
    const changedFiles = [...new Set(chunks.map(chunk => chunk.fileName))];
    
    for (const file of changedFiles) {
      // Find similar files based on naming patterns and directory structure
      const similarFiles = this.findSimilarFiles(file, featureIntent.domain);
      
      if (similarFiles.length > 0) {
        // Analyze patterns in similar files
        const filePatterns = await this.extractPatternsFromFiles(similarFiles, file);
        patterns.push(...filePatterns);
      }
    }

    return this.deduplicatePatterns(patterns);
  }

  /**
   * Analyze architectural context and relationships
   */
  private async analyzeArchitecturalContext(
    chunks: ProcessableChunk[]
  ): Promise<ArchitecturalContext> {
    const relatedFiles: string[] = [];
    const dataFlow: string[] = [];
    const integrationPoints: string[] = [];
    const potentialImpacts: string[] = [];

    // For each changed file, find its dependencies and dependents
    for (const chunk of chunks) {
      const deps = this.extractDependencies(chunk.fileName);
      relatedFiles.push(...deps.imports);
      
      // Find files that import this file
      const dependents = this.findDependents(chunk.fileName);
      potentialImpacts.push(...dependents);
    }

    return {
      relatedFiles: [...new Set(relatedFiles)],
      dataFlow,
      integrationPoints,
      potentialImpacts: [...new Set(potentialImpacts)],
    };
  }

  /**
   * Find available utilities that could be relevant to the changes
   */
  private async findAvailableUtilities(
    chunks: ProcessableChunk[],
    featureIntent: FeatureIntent
  ): Promise<AvailableUtility[]> {
    const utilities: AvailableUtility[] = [];
    
    // Based on the domain, look for relevant utility files
    const utilityPatterns = this.getUtilityPatterns(featureIntent.domain);
    
    for (const pattern of utilityPatterns) {
      const matchingFiles = this.allSourceFiles.filter(file => 
        file.includes(pattern) || 
        file.includes('utils') || 
        file.includes('helpers') ||
        file.includes('hooks') ||
        file.includes('services')
      );
      
      for (const file of matchingFiles.slice(0, 5)) { // Limit to avoid overwhelming
        const utility = await this.analyzeUtilityFile(file);
        if (utility) {
          utilities.push(utility);
        }
      }
    }

    return utilities;
  }

  // Helper methods

  private extractBusinessContext(description: string): string {
    // Look for business context keywords
    const businessKeywords = /\b(user|customer|business|feature|requirement|goal)\b/gi;
    const lines = description.split('\n');
    return lines.filter(line => businessKeywords.test(line)).join(' ').slice(0, 200);
  }

  private extractTechnicalApproach(description: string): string {
    // Look for technical approach keywords
    const techKeywords = /\b(implement|using|with|library|framework|pattern|architecture)\b/gi;
    const lines = description.split('\n');
    return lines.filter(line => techKeywords.test(line)).join(' ').slice(0, 200);
  }

  private inferDomain(diffSummary?: DiffSummary): string {
    if (!diffSummary) return "general";

    // Use the PR type if available
    if (diffSummary.prType) {
      return diffSummary.prType.toLowerCase().replace(/\s+/g, '-');
    }

    // Fallback to analyzing file paths
    return "general";
  }

  private inferChangeType(summary: string, diffSummary?: DiffSummary): string {
    const lowerSummary = summary.toLowerCase();
    
    if (lowerSummary.includes('add') || lowerSummary.includes('new')) return 'feature';
    if (lowerSummary.includes('fix') || lowerSummary.includes('bug')) return 'bugfix';
    if (lowerSummary.includes('refactor') || lowerSummary.includes('restructure')) return 'refactor';
    if (lowerSummary.includes('performance') || lowerSummary.includes('optimize')) return 'performance';
    if (lowerSummary.includes('update') || lowerSummary.includes('upgrade')) return 'update';
    
    return 'enhancement';
  }

  private findSimilarFiles(targetFile: string, domain: string): string[] {
    const targetDir = dirname(targetFile);
    const targetExt = extname(targetFile);
    
    return this.allSourceFiles.filter(file => {
      // Same directory or similar naming pattern
      return (
        dirname(file) === targetDir || 
        file.includes(domain) ||
        (extname(file) === targetExt && this.calculateSimilarity(file, targetFile) > 0.3)
      );
    }).slice(0, 10); // Limit results
  }

  private calculateSimilarity(file1: string, file2: string): number {
    // Simple similarity based on path segments
    const segments1 = file1.split('/');
    const segments2 = file2.split('/');
    
    const commonSegments = segments1.filter(seg => segments2.includes(seg));
    return commonSegments.length / Math.max(segments1.length, segments2.length);
  }

  private async extractPatternsFromFiles(files: string[], contextFile: string): Promise<CodebasePattern[]> {
    // This would analyze the files to extract common patterns
    // For now, return a simplified version
    return [
      {
        type: "component-structure",
        pattern: "Function components with TypeScript interfaces",
        examples: files.slice(0, 3),
        files,
      }
    ];
  }

  private deduplicatePatterns(patterns: CodebasePattern[]): CodebasePattern[] {
    const seen = new Set<string>();
    return patterns.filter(pattern => {
      const key = `${pattern.type}-${pattern.pattern}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private extractDependencies(filePath: string): { imports: string[]; exports: string[] } {
    // Simplified version - in practice, this would parse the file
    return { imports: [], exports: [] };
  }

  private findDependents(filePath: string): string[] {
    // Find files that import the given file
    return this.allSourceFiles.filter(file => {
      if (file === filePath) return false;
      
      try {
        const content = readFileSync(resolve(this.repoRoot, file), 'utf-8');
        return content.includes(filePath) || content.includes(filePath.replace('.ts', ''));
      } catch {
        return false;
      }
    }).slice(0, 5); // Limit results
  }

  private getUtilityPatterns(domain: string): string[] {
    const commonPatterns = ['utils', 'helpers', 'hooks', 'services'];
    
    const domainSpecific: { [key: string]: string[] } = {
      'ui-components': ['components', 'ui', 'styled'],
      'authentication': ['auth', 'security', 'session'],
      'data-layer': ['api', 'store', 'models', 'schema'],
      'routing': ['router', 'navigation', 'routes'],
    };

    return [...commonPatterns, ...(domainSpecific[domain] || [])];
  }

  private async analyzeUtilityFile(filePath: string): Promise<AvailableUtility | null> {
    try {
      const content = readFileSync(resolve(this.repoRoot, filePath), 'utf-8');
      
      // Extract exported functions/components
      const exportMatches = content.match(/export\s+(function|const|class)\s+(\w+)/g);
      if (exportMatches && exportMatches.length > 0) {
        const name = exportMatches[0].split(/\s+/).pop() || '';
        
        return {
          type: this.inferUtilityType(filePath, content),
          name,
          file: filePath,
          description: this.extractUtilityDescription(content),
          usage: this.extractUsageExample(content, name),
        };
      }
    } catch (error) {
      debugLog(`Failed to analyze utility file ${filePath}:`, error);
    }
    
    return null;
  }

  private inferUtilityType(filePath: string, content: string): string {
    if (filePath.includes('hook') || content.includes('useState') || content.includes('useEffect')) {
      return 'hook';
    }
    if (filePath.includes('component') || content.includes('React') || content.includes('JSX')) {
      return 'component';
    }
    if (filePath.includes('service') || filePath.includes('api')) {
      return 'service';
    }
    return 'helper-function';
  }

  private extractUtilityDescription(content: string): string {
    // Look for JSDoc comments or comments near exports
    const commentMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
    if (commentMatch) {
      return commentMatch[1].replace(/\s*\*\s?/g, ' ').trim().slice(0, 100);
    }
    
    // Look for single-line comments
    const singleLineMatch = content.match(/\/\/\s*(.+)/);
    if (singleLineMatch) {
      return singleLineMatch[1].trim().slice(0, 100);
    }
    
    return 'Utility function';
  }

  private extractUsageExample(content: string, name: string): string {
    // Try to find usage examples in comments
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('@example') || lines[i].includes('Example:')) {
        const exampleLines = [];
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].trim() && !lines[j].includes('*/')) {
            exampleLines.push(lines[j].trim());
          } else break;
        }
        return exampleLines.join('\n');
      }
    }
    
    return `${name}()`;
  }

  private getAllSourceFiles(): string[] {
    // This would be implemented to get all source files
    // For now, return empty array - in practice, this would scan the repo
    return [];
  }
}