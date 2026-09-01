import ts from 'typescript';
import { ChangedSymbol, SymbolKind, ParsedPatch } from '../models/types';

/**
 * SymbolAnalyzer uses TypeScript Compiler API AST to deterministically
 * parse changed code files and identify types, interfaces, enums, functions, and union changes.
 */
export class SymbolAnalyzer {
  /**
   * Parses source text using TypeScript compiler AST
   */
  public parseSourceFile(fileName: string, sourceText: string): ts.SourceFile {
    return ts.createSourceFile(
      fileName,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
  }

  /**
   * Analyzes parsed patch lines against an AST to find which TypeScript symbols were modified.
   */
  public extractChangedSymbols(
    fileName: string,
    fileContent: string,
    parsedPatch: ParsedPatch
  ): ChangedSymbol[] {
    if (!fileContent) {
      return [];
    }

    const sourceFile = this.parseSourceFile(fileName, fileContent);
    const changedSymbols: ChangedSymbol[] = [];

    // Collect all line numbers affected by additions or deletions
    const affectedLines = new Set<number>();
    parsedPatch.addedLines.forEach((l) => affectedLines.add(l.line));
    parsedPatch.deletedLines.forEach((l) => affectedLines.add(l.line));

    // Also inspect removed union variants from deleted lines
    const removedVariants: string[] = [];
    for (const d of parsedPatch.deletedLines) {
      const match = d.text.match(/['"`]([a-zA-Z0-9_-]+)['"`]/);
      if (match) {
        removedVariants.push(match[1]);
      }
    }

    // Inspect added union variants from added lines
    const addedVariants: string[] = [];
    for (const a of parsedPatch.addedLines) {
      const match = a.text.match(/['"`]([a-zA-Z0-9_-]+)['"`]/);
      if (match) {
        addedVariants.push(match[1]);
      }
    }

    const visit = (node: ts.Node) => {
      let symbolName: string | null = null;
      let symbolKind: SymbolKind | null = null;
      let removedMembers: string[] = [];
      let addedMembers: string[] = [];

      if (ts.isTypeAliasDeclaration(node)) {
        symbolName = node.name.text;
        symbolKind = 'type-alias';

        // Extract union types
        if (ts.isUnionTypeNode(node.type)) {
          removedMembers = [...removedVariants];
          addedMembers = [...addedVariants];
        }
      } else if (ts.isInterfaceDeclaration(node)) {
        symbolName = node.name.text;
        symbolKind = 'interface';
      } else if (ts.isEnumDeclaration(node)) {
        symbolName = node.name.text;
        symbolKind = 'enum';
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        symbolName = node.name.text;
        symbolKind = 'function';
      } else if (ts.isClassDeclaration(node) && node.name) {
        symbolName = node.name.text;
        symbolKind = 'class';
      }

      if (symbolName && symbolKind) {
        const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const actualStart = startLine + 1;
        const actualEnd = endLine + 1;

        // Check if any added or deleted line falls within this symbol's range
        let isAffected = false;
        for (let l = actualStart; l <= actualEnd; l++) {
          if (affectedLines.has(l)) {
            isAffected = true;
            break;
          }
        }

        if (isAffected || affectedLines.size === 0) {
          changedSymbols.push({
            name: symbolName,
            kind: symbolKind,
            filePath: fileName,
            startLine: actualStart,
            endLine: actualEnd,
            newSnippet: node.getText(sourceFile),
            removedMembers: removedMembers.length > 0 ? removedMembers : undefined,
            addedMembers: addedMembers.length > 0 ? addedMembers : undefined,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return changedSymbols;
  }
}
