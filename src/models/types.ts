/**
 * PR Sentinel - Core Data Models (Sprint 1)
 */

export interface PullRequestInfo {
  owner: string;
  repository: string;
  number: number;
  title: string;
  baseSha: string;
  headSha: string;
  htmlUrl?: string;
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

export interface SymbolInfo {
  name: string;
  kind: string;
  filePath: string;
  startLine: number;
  endLine: number;
}

export interface ReferenceInfo {
  sourceFile: string;
  targetSymbol: string;
  line: number;
}

export interface Evidence {
  file: string;
  line?: number;
  description: string;
  snippet?: string;
}

export interface Finding {
  severity: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  explanation: string;
  recommendation: string;
  confidence: number;
  evidence: Evidence[];
}

export interface GeminiAnalysisResult {
  severity: 'low' | 'medium' | 'high';
  category: 'frontend-breaking-change' | 'no-breaking-change' | 'uncertain';
  confidence: number;
  explanation: string;
  recommendation: string;
}
