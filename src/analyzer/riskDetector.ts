import {
  BlastRadiusNode,
  Finding,
  EvidenceItem,
} from '../models/types';

/**
 * RiskDetector evaluates deterministic evidence collected by ProjectScanner
 * and structures exact findings before or alongside Gemini evaluation.
 */
export class RiskDetector {
  /**
   * Converts blast radius nodes into deterministic findings based on hard AST evidence.
   */
  public evaluateBlastRadius(blastRadius: BlastRadiusNode[]): Finding[] {
    const findings: Finding[] = [];

    for (const node of blastRadius) {
      const { symbol, consumers } = node;

      // Check for removed union members (breaking changes)
      if (symbol.removedMembers && symbol.removedMembers.length > 0) {
        const removedStr = symbol.removedMembers.map((m) => `'${m}'`).join(', ');
        const addedStr = symbol.addedMembers ? symbol.addedMembers.map((m) => `'${m}'`).join(', ') : 'None';

        const brokenConsumers = consumers.filter((c) => c.checksValue !== undefined);
        const evidence: EvidenceItem[] = consumers.map((c) => ({
          file: c.consumerFilePath,
          line: c.line,
          snippet: c.snippet,
          description: c.checksValue
            ? `Equality check against removed value '${c.checksValue}'`
            : `Reference to changed symbol ${symbol.name}`,
          severity: c.checksValue ? 'high' : 'medium',
        }));

        const isBreaking = brokenConsumers.length > 0 || consumers.length > 0;

        findings.push({
          id: `finding-${symbol.name}-${Date.now()}`,
          severity: isBreaking ? 'high' : 'medium',
          category: isBreaking ? 'breaking-change' : 'warning',
          title: `${symbol.name} changed`,
          filePath: symbol.filePath,
          line: symbol.startLine,
          oldValue: removedStr,
          newValue: addedStr,
          affectedConsumersCount: consumers.length,
          evidence,
          explanation: `The ${symbol.kind} '${symbol.name}' removed member(s) ${removedStr} and added ${addedStr}. ${
            brokenConsumers.length > 0
              ? `${brokenConsumers.length} consumer site(s) perform equality checks against the removed variant.`
              : 'Consumers reference this symbol and must be checked for exhaustive pattern coverage.'
          }`,
          recommendation: `Update consumer references in ${consumers
            .map((c) => c.consumerFilePath)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(', ')} to handle ${addedStr} and update corresponding tests.`,
          confidence: 0.98,
        });
      }
    }

    return findings;
  }
}
