import ts from 'typescript';
import { ConsumerReference, ChangedSymbol } from '../models/types';

/**
 * ReferenceAnalyzer scans project consumer files to find AST identifiers, property accesses,
 * binary equality checks, and switch case statements referencing the changed symbols.
 */
export class ReferenceAnalyzer {
  /**
   * Scans a file AST for direct imports, usages, and property equality checks against a changed symbol.
   */
  public findSymbolConsumers(
    filePath: string,
    fileContent: string,
    changedSymbols: ChangedSymbol[]
  ): ConsumerReference[] {
    if (!fileContent || changedSymbols.length === 0) {
      return [];
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      fileContent,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const consumers: ConsumerReference[] = [];
    const symbolMap = new Map<string, ChangedSymbol>();
    changedSymbols.forEach((s) => symbolMap.set(s.name, s));

    const lines = fileContent.split('\n');

    const visit = (node: ts.Node) => {
      // 1. Check for identifier usages matching changed symbols
      if (ts.isIdentifier(node)) {
        const text = node.text;
        if (symbolMap.has(text)) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const lineNum = line + 1;
          const snippet = lines[line]?.trim() || node.getText(sourceFile);

          consumers.push({
            consumerFilePath: filePath,
            targetSymbolName: text,
            line: lineNum,
            column: character + 1,
            snippet,
          });
        }
      }

      // 2. Check for binary equality checks e.g. payment.status === 'success' or status === 'success'
      if (ts.isBinaryExpression(node)) {
        const op = node.operatorToken.kind;
        if (
          op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
          op === ts.SyntaxKind.EqualsEqualsToken ||
          op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
          op === ts.SyntaxKind.ExclamationEqualsToken
        ) {
          // Check if right or left is a string literal that matches any removed member
          let checkedLiteral: string | null = null;
          if (ts.isStringLiteral(node.right)) {
            checkedLiteral = node.right.text;
          } else if (ts.isStringLiteral(node.left)) {
            checkedLiteral = node.left.text;
          }

          if (checkedLiteral) {
            for (const sym of changedSymbols) {
              if (sym.removedMembers && sym.removedMembers.includes(checkedLiteral)) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                const lineNum = line + 1;
                const snippet = lines[line]?.trim() || node.getText(sourceFile);

                consumers.push({
                  consumerFilePath: filePath,
                  targetSymbolName: sym.name,
                  line: lineNum,
                  column: character + 1,
                  snippet,
                  checksValue: checkedLiteral,
                });
              }
            }
          }
        }
      }

      // 3. Check for switch case clauses (e.g. case 'success':)
      if (ts.isCaseClause(node) && node.expression && ts.isStringLiteral(node.expression)) {
        const caseLiteral = node.expression.text;
        for (const sym of changedSymbols) {
          if (sym.removedMembers && sym.removedMembers.includes(caseLiteral)) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const lineNum = line + 1;
            const snippet = lines[line]?.trim() || node.getText(sourceFile);

            consumers.push({
              consumerFilePath: filePath,
              targetSymbolName: sym.name,
              line: lineNum,
              column: character + 1,
              snippet,
              checksValue: caseLiteral,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Deduplicate consumers on the same file & line
    const seen = new Set<string>();
    return consumers.filter((c) => {
      const key = `${c.consumerFilePath}:${c.line}:${c.checksValue || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
