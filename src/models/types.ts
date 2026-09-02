/**
 * PR Sentinel - Core Data Models & Reviewer Schema
 */

export interface PullRequestInfo {
  provider?: 'github' | 'gitlab';
  typeLabel?: 'PR' | 'MR';
  projectPath?: string;
  owner: string;
  repository: string;
  number: number;
  title: string;
  baseSha: string;
  headSha: string;
  htmlUrl?: string;
  branchName?: string;
  baseBranch?: string;
  author?: string;
  authorAvatar?: string;
  updatedAt?: string;
  createdAt?: string;
  description?: string;
  state?: 'open' | 'closed' | 'merged';
}

export interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  sha: string;
  patch?: string;
  rawUrl?: string;
}

export interface PatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface ParsedPatch {
  filename: string;
  hunks: PatchHunk[];
  addedLines: { line: number; text: string }[];
  deletedLines: { line: number; text: string }[];
}

export type SymbolKind =
  | 'type-alias'
  | 'interface'
  | 'enum'
  | 'function'
  | 'class'
  | 'variable'
  | 'property';

export interface ChangedSymbol {
  name: string;
  kind: SymbolKind;
  filePath: string;
  startLine: number;
  endLine: number;
  oldSnippet?: string;
  newSnippet?: string;
  removedMembers?: string[];
  addedMembers?: string[];
}

export interface ConsumerReference {
  consumerFilePath: string;
  targetSymbolName: string;
  line: number;
  column: number;
  snippet: string;
  surroundingContext?: string;
  checksValue?: string; // e.g. checked === 'success'
}

export interface BlastRadiusNode {
  symbol: ChangedSymbol;
  consumers: ConsumerReference[];
}

export interface EvidenceItem {
  file: string;
  line: number;
  description: string;
  snippet: string;
  severity: 'high' | 'medium' | 'low';
}

export interface Finding {
  id: string;
  severity: 'high' | 'medium' | 'low';
  category: 'breaking-change' | 'warning' | 'info';
  title: string;
  filePath: string;
  line?: number;
  oldValue?: string;
  newValue?: string;
  affectedConsumersCount: number;
  evidence: EvidenceItem[];
  explanation: string;
  recommendation: string;
  confidence: number;
}

export interface AnalysisPipelineResult {
  pr: PullRequestInfo;
  changedFiles: ChangedFile[];
  changedSymbols: ChangedSymbol[];
  blastRadius: BlastRadiusNode[];
  findings: Finding[];
  metrics: {
    breakingCount: number;
    warningCount: number;
    passedCount: number;
  };
}

/**
 * Staff-Level PR Reviewer Models
 */
export type ReviewCategory =
  | 'architecture'
  | 'security'
  | 'performance'
  | 'edge-cases'
  | 'breaking-changes'
  | 'code-quality'
  | 'type-safety';

export type ReviewSeverity = 'critical' | 'high' | 'medium' | 'low' | 'suggestion';

export interface FixComparison {
  /** Suboptimal or dangerous fix often attempted */
  badFixSnippet: string;
  /** Explanation of why the bad fix fails, introduces bugs or tech debt */
  badFixWhy: string;
  /** Production-grade optimal replacement */
  goodFixSnippet: string;
  /** Detailed senior-engineer rationale for why the good fix is superior */
  goodFixWhy: string;
  /** Ready-to-apply diff patch */
  diffPatch?: string;
}

export interface ReviewItem {
  id: string;
  category: ReviewCategory;
  severity: ReviewSeverity;
  title: string;
  file: string;
  line: number;
  codeSnippet: string;
  critique: string;
  fixComparison: FixComparison;
  ruleId: string;
  impactScore: number; // 1-10
  tags: string[];
}

export type ReviewVerdict =
  | 'APPROVE'
  | 'REQUEST_CHANGES'
  | 'NEEDS_DISCUSSION'
  | 'CRITICAL_RISK';

export interface PRReviewReport {
  pr: PullRequestInfo;
  verdict: ReviewVerdict;
  overallScore: number; // 0 to 100
  breakdown: {
    architectureScore: number; // 0-100
    securityScore: number;     // 0-100
    performanceScore: number;  // 0-100
    resilienceScore: number;   // 0-100
    compatibilityScore: number;// 0-100
  };
  summary: string;
  goodAspects: string[];
  criticalRisks: string[];
  items: ReviewItem[];
  automatedFixPatches: {
    file: string;
    line?: number;
    description: string;
    patch: string;
    goodCode: string;
  }[];
  generatedMarkdownReview: string;
}

export interface WorkspaceRepoInfo {
  provider: 'github' | 'gitlab';
  host: string;
  owner: string;
  repo: string;
  projectPath: string;
  currentBranch?: string;
  remotes: { name: string; url: string }[];
  isLinked: boolean;
}
