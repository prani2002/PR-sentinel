import {
  ChangedFile,
  ChangedSymbol,
  ConsumerReference,
  BlastRadiusNode,
} from '../models/types';
import { SymbolAnalyzer } from './symbolAnalyzer';
import { ReferenceAnalyzer } from './referenceAnalyzer';
import { PatchParser } from '../diff/patchParser';

export interface ProjectFileSource {
  path: string;
  content: string;
}

/**
 * ProjectScanner coordinates the deterministic AST phase:
 * 1. Parses changed files in PR
 * 2. Extracts affected symbols
 * 3. Scans all project files for references & consumer sites
 * 4. Produces the deterministic Blast Radius tree with evidence
 */
export class ProjectScanner {
  private symbolAnalyzer = new SymbolAnalyzer();
  private referenceAnalyzer = new ReferenceAnalyzer();
  private patchParser = new PatchParser();

  /**
   * Runs the deterministic analysis over the PR changes and workspace files.
   */
  public analyzeBlastRadius(
    changedFiles: ChangedFile[],
    workspaceFiles: ProjectFileSource[]
  ): {
    changedSymbols: ChangedSymbol[];
    blastRadius: BlastRadiusNode[];
  } {
    const changedSymbols: ChangedSymbol[] = [];
    const workspaceMap = new Map<string, string>();
    workspaceFiles.forEach((f) => workspaceMap.set(f.path, f.content));

    // Step 1: Deterministically find changed symbols from PR diff & source AST
    for (const file of changedFiles) {
      const parsedPatch = this.patchParser.parsePatch(file.filename, file.patch || '');
      const content = workspaceMap.get(file.filename) || '';
      const symbols = this.symbolAnalyzer.extractChangedSymbols(
        file.filename,
        content,
        parsedPatch
      );
      changedSymbols.push(...symbols);
    }

    // Step 2: Deterministically find consumers across the entire project
    const blastRadius: BlastRadiusNode[] = [];

    for (const symbol of changedSymbols) {
      const symbolConsumers: ConsumerReference[] = [];

      for (const workspaceFile of workspaceFiles) {
        // Skip the file where the symbol was defined to focus on consumers
        if (workspaceFile.path === symbol.filePath) {
          continue;
        }

        const consumers = this.referenceAnalyzer.findSymbolConsumers(
          workspaceFile.path,
          workspaceFile.content,
          [symbol]
        );

        symbolConsumers.push(...consumers);
      }

      blastRadius.push({
        symbol,
        consumers: symbolConsumers,
      });
    }

    return {
      changedSymbols,
      blastRadius,
    };
  }
}
