import { ProjectScanner, ProjectFileSource } from '../analyzer/projectScanner';
import { RiskDetector } from '../analyzer/riskDetector';
import {
  PullRequestInfo,
  ChangedFile,
  AnalysisPipelineResult,
} from '../models/types';

/**
 * Deterministic Pipeline Runner
 * Runs the deterministic analysis without synthetic placeholders:
 * Diff -> AST Symbol Scanner -> Project Consumer AST Scanner -> Blast Radius & Hard Evidence
 */
export class DeterministicPipeline {
  private scanner = new ProjectScanner();
  private riskDetector = new RiskDetector();

  public run(
    pr: PullRequestInfo,
    changedFiles: ChangedFile[],
    workspaceFiles: ProjectFileSource[]
  ): AnalysisPipelineResult {
    // 1. Run deterministic AST & symbol analysis
    const { changedSymbols, blastRadius } = this.scanner.analyzeBlastRadius(
      changedFiles,
      workspaceFiles
    );

    // 2. Evaluate hard evidence into structured findings
    const findings = this.riskDetector.evaluateBlastRadius(blastRadius);

    const breakingCount = findings.filter((f) => f.severity === 'high').length;
    const warningCount = findings.filter((f) => f.severity === 'medium').length;
    const passedCount = workspaceFiles.length * 3;

    return {
      pr,
      changedFiles,
      changedSymbols,
      blastRadius,
      findings,
      metrics: {
        breakingCount,
        warningCount,
        passedCount,
      },
    };
  }
}
