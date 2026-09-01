/**
 * PR Sentinel - Core Data Models
 */

export interface PullRequestInfo {
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
  updatedAt?: string;
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
