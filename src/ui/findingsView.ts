import * as vscode from 'vscode';
import { Finding, PullRequestInfo, ChangedFile, PRReviewReport, ReviewItem } from '../models/types';
import { CodeReviewer } from '../reviewer/codeReviewer';

/**
 * Generates the full HTML for the PR Sentinel Reviewer & Blast Radius Dashboard
 */
export function getBlastRadiusHtml(
  findings: Finding[] = [],
  prInfo?: PullRequestInfo,
  changedFiles: ChangedFile[] = [],
  reviewReport?: PRReviewReport
): string {
  // If no review report is provided, run reviewer synchronously
  const effectiveReport: PRReviewReport =
    reviewReport ||
    new CodeReviewer().reviewPullRequest(
      prInfo || {
        owner: 'repository',
        repository: 'project',
        number: 1,
        title: 'Analysis Target',
        baseSha: 'base',
        headSha: 'head',
      },
      changedFiles,
      findings
    );

  const serializedFindings = JSON.stringify(findings);
  const serializedPrInfo = JSON.stringify(prInfo || null);
  const serializedChangedFiles = JSON.stringify(changedFiles);
  const serializedReport = JSON.stringify(effectiveReport);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Sentinel - Senior Code Reviewer & Blast Radius</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #0b0f17);
      --sidebar-bg: var(--vscode-sideBar-background, #111827);
      --fg: var(--vscode-editor-foreground, #f3f4f6);
      --muted: var(--vscode-descriptionForeground, #9ca3af);
      --border: var(--vscode-panel-border, #1f2937);
      --accent: var(--vscode-button-background, #2563eb);
      --accent-hover: var(--vscode-button-hoverBackground, #1d4ed8);
      --card-bg: var(--vscode-editorWidget-background, rgba(17, 24, 39, 0.7));
      --red: #ef4444;
      --orange: #f97316;
      --green: #10b981;
      --yellow: #f59e0b;
      --blue: #3b82f6;
      --purple: #8b5cf6;
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--fg);
      background-color: var(--bg);
      margin: 0;
      padding: 16px;
      line-height: 1.5;
    }
    .header-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .pr-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .pr-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .badge-approve {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .badge-changes {
      background: rgba(249, 115, 22, 0.15);
      color: #fb923c;
      border: 1px solid rgba(249, 115, 22, 0.4);
    }
    .badge-critical {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .score-banner {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
    }
    .score-card {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .score-card .val {
      font-size: 18px;
      font-weight: 800;
      color: #fff;
    }
    .score-card .lbl {
      font-size: 10px;
      color: var(--muted);
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 2px;
    }
    .tabs-nav {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: var(--fg);
    }
    .tab-btn.active {
      color: #60a5fa;
      border-bottom-color: #3b82f6;
    }
    .pill {
      font-size: 10px;
      background: rgba(255,255,255,0.1);
      padding: 2px 6px;
      border-radius: 9999px;
      font-weight: 700;
    }
    .review-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .review-header {
      padding: 12px 16px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .review-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .review-body {
      padding: 16px;
    }
    .critique-box {
      font-size: 13px;
      color: #e5e7eb;
      margin-bottom: 14px;
      line-height: 1.6;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }
    @media (max-width: 768px) {
      .comparison-grid { grid-template-columns: 1fr; }
    }
    .fix-box {
      border-radius: 6px;
      padding: 12px;
      font-size: 12px;
    }
    .fix-box-bad {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    .fix-box-good {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .fix-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .fix-box-bad .fix-title { color: #f87171; }
    .fix-box-good .fix-title { color: #34d399; }
    pre {
      background: #05070c;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 4px;
      padding: 10px;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      color: #f1f5f9;
      margin: 6px 0;
      line-height: 1.4;
    }
    .fix-why {
      font-size: 11px;
      color: var(--muted);
      margin-top: 6px;
      line-height: 1.4;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn:hover { background: var(--accent-hover); }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--fg);
    }
    .btn-outline:hover {
      background: rgba(255,255,255,0.05);
    }
    .btn-apply {
      background: #059669;
    }
    .btn-apply:hover {
      background: #047857;
    }
    .file-link {
      color: #60a5fa;
      text-decoration: underline;
      cursor: pointer;
      font-family: monospace;
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--muted);
    }
    .file-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      cursor: pointer;
    }
    .file-item:hover {
      border-color: #3b82f6;
    }
  </style>
</head>
<body>
  <div id="app"></div>

  <script>
    (function() {
      const vscode = acquireVsCodeApi();
      let state = {
        findings: ${serializedFindings},
        prInfo: ${serializedPrInfo},
        changedFiles: ${serializedChangedFiles},
        report: ${serializedReport},
        activeTab: 'review'
      };

      function render() {
        const app = document.getElementById('app');
        if (!app) return;

        const pr = state.prInfo || state.report?.pr || {
          owner: 'Workspace',
          repository: 'Repository',
          number: 0,
          title: 'PR Review & Blast Radius'
        };

        const report = state.report;
        const items = report?.items || [];
        const files = state.changedFiles || [];
        const findings = state.findings || [];

        let verdictBadge = '';
        if (report?.verdict === 'APPROVE') {
          verdictBadge = '<span class="badge badge-approve">✅ Approved</span>';
        } else if (report?.verdict === 'REQUEST_CHANGES') {
          verdictBadge = '<span class="badge badge-changes">⚠️ Changes Requested</span>';
        } else if (report?.verdict === 'CRITICAL_RISK') {
          verdictBadge = '<span class="badge badge-critical">🛑 Critical Risk</span>';
        } else {
          verdictBadge = '<span class="badge badge-changes">💬 Needs Discussion</span>';
        }

        let html = '';

        // 1. Header Card
        html += '<div class="header-card">';
        html += '  <div class="pr-title-row">';
        html += '    <div class="pr-title">' + (pr.typeLabel || 'PR') + ' #' + pr.number + ': ' + escapeHtml(pr.title || 'Untitled') + '</div>';
        html += '    <div>' + verdictBadge + '</div>';
        html += '  </div>';
        html += '  <div style="font-size:12px; color:var(--muted); margin-bottom: 8px;">';
        html += '    Repository: <strong>' + escapeHtml(pr.owner + '/' + pr.repository) + '</strong> &bull; Author: @' + escapeHtml(pr.author || 'contributor');
        html += '  </div>';

        // Scorecard
        if (report) {
          html += '<div class="score-banner">';
          html += '  <div class="score-card"><div class="val" style="color:#60a5fa;">' + report.overallScore + '/100</div><div class="lbl">Overall Score</div></div>';
          html += '  <div class="score-card"><div class="val" style="color:' + (report.breakdown.architectureScore >= 80 ? '#34d399':'#f87171') + '">' + report.breakdown.architectureScore + '</div><div class="lbl">Architecture</div></div>';
          html += '  <div class="score-card"><div class="val" style="color:' + (report.breakdown.securityScore >= 90 ? '#34d399':'#f87171') + '">' + report.breakdown.securityScore + '</div><div class="lbl">Security</div></div>';
          html += '  <div class="score-card"><div class="val" style="color:' + (report.breakdown.performanceScore >= 80 ? '#34d399':'#fb923c') + '">' + report.breakdown.performanceScore + '</div><div class="lbl">Performance</div></div>';
          html += '  <div class="score-card"><div class="val" style="color:' + (report.breakdown.compatibilityScore >= 90 ? '#34d399':'#f87171') + '">' + report.breakdown.compatibilityScore + '</div><div class="lbl">Compatibility</div></div>';
          html += '</div>';
        }

        html += '</div>'; // header-card

        // 2. Action Bar
        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">';
        html += '  <div style="display:flex; gap:8px;">';
        html += '    <button class="btn btn-outline" id="btn-reanalyze">🔄 Re-Analyze PR</button>';
        html += '    <button class="btn btn-outline" id="btn-linkrepo">🔗 Link Repository</button>';
        html += '  </div>';
        html += '  <button class="btn" id="btn-copy-review">📋 Copy Markdown Review</button>';
        html += '</div>';

        // 3. Navigation Tabs
        html += '<div class="tabs-nav">';
        html += '  <button class="tab-btn ' + (state.activeTab === 'review' ? 'active' : '') + '" onclick="setTab(\'review\')">🧑‍💻 Staff Code Review <span class="pill">' + items.length + '</span></button>';
        html += '  <button class="tab-btn ' + (state.activeTab === 'blast' ? 'active' : '') + '" onclick="setTab(\'blast\')">💥 Blast Radius & Breakages <span class="pill">' + findings.length + '</span></button>';
        html += '  <button class="tab-btn ' + (state.activeTab === 'files' ? 'active' : '') + '" onclick="setTab(\'files\')">📁 Changed Files <span class="pill">' + files.length + '</span></button>';
        html += '</div>';

        // 4. Tab Content
        if (state.activeTab === 'review') {
          if (items.length === 0) {
            html += '<div class="empty-state">';
            html += '  <div style="font-size:32px; margin-bottom:8px;">✨</div>';
            html += '  <h3 style="color:#fff; margin-bottom:4px;">No Code Defects or Breaking Changes Found</h3>';
            html += '  <p>The analyzed PR conforms to production-grade quality, security, and TypeScript AST compatibility.</p>';
            html += '</div>';
          } else {
            items.forEach(function(item, idx) {
              const sevBadge = item.severity === 'critical' ? '<span class="badge badge-critical">Critical</span>' :
                               item.severity === 'high' ? '<span class="badge badge-critical">High</span>' :
                               item.severity === 'medium' ? '<span class="badge badge-changes">Medium</span>' :
                               '<span class="badge badge-approve">Low</span>';

              html += '<div class="review-card">';
              html += '  <div class="review-header">';
              html += '    <div class="review-header-left">';
              html += '      ' + sevBadge;
              html += '      <strong style="color:#fff;">' + (idx + 1) + '. ' + escapeHtml(item.title) + '</strong>';
              html += '    </div>';
              html += '    <div style="font-size:11px;">';
              html += '      <span class="file-link" onclick="openFile(\'' + escapeHtml(item.file) + '\', ' + item.line + ')">' + escapeHtml(item.file) + ':' + item.line + '</span>';
              html += '    </div>';
              html += '  </div>';

              html += '  <div class="review-body">';
              html += '    <div class="critique-box">' + escapeHtml(item.critique) + '</div>';

              if (item.codeSnippet) {
                html += '    <div style="font-size:11px; color:var(--muted); font-weight:700; margin-bottom:2px;">CURRENT PR CODE:</div>';
                html += '    <pre>' + escapeHtml(item.codeSnippet) + '</pre>';
              }

              // Side-by-side comparison
              html += '    <div class="comparison-grid">';
              html += '      <div class="fix-box fix-box-bad">';
              html += '        <div class="fix-title">❌ Suboptimal / Bad Fix (Avoid)</div>';
              html += '        <pre>' + escapeHtml(item.fixComparison.badFixSnippet) + '</pre>';
              html += '        <div class="fix-why"><strong>Why it fails:</strong> ' + escapeHtml(item.fixComparison.badFixWhy) + '</div>';
              html += '      </div>';

              html += '      <div class="fix-box fix-box-good">';
              html += '        <div class="fix-title">';
              html += '          <span>✅ Recommended Best Replacement</span>';
              html += '          <button class="btn btn-apply" style="font-size:10px; padding:2px 6px;" onclick="applyFix(\'' + escapeHtml(item.file) + '\', ' + item.line + ', ' + idx + ')">Apply Fix</button>';
              html += '        </div>';
              html += '        <pre>' + escapeHtml(item.fixComparison.goodFixSnippet) + '</pre>';
              html += '        <div class="fix-why"><strong>Why it is optimal:</strong> ' + escapeHtml(item.fixComparison.goodFixWhy) + '</div>';
              html += '      </div>';
              html += '    </div>';

              html += '  </div>'; // review-body
              html += '</div>'; // review-card
            });
          }
        } else if (state.activeTab === 'blast') {
          if (findings.length === 0) {
            html += '<div class="empty-state">';
            html += '  <div style="font-size:32px; margin-bottom:8px;">🛡️</div>';
            html += '  <h3 style="color:#fff; margin-bottom:4px;">Zero Breaking Changes Detected</h3>';
            html += '  <p>All AST symbols, enum variants, and interface signatures remain 100% backward compatible.</p>';
            html += '</div>';
          } else {
            findings.forEach(function(f, idx) {
              html += '<div class="review-card">';
              html += '  <div class="review-header">';
              html += '    <strong style="color:#f87171;">⚠️ ' + escapeHtml(f.title) + '</strong>';
              html += '    <span class="file-link" onclick="openFile(\'' + escapeHtml(f.filePath) + '\', ' + (f.line || 1) + ')">' + escapeHtml(f.filePath) + '</span>';
              html += '  </div>';
              html += '  <div class="review-body">';
              html += '    <p style="margin-top:0;">' + escapeHtml(f.explanation) + '</p>';
              html += '    <div style="background:rgba(239,68,68,0.1); border-left:3px solid #ef4444; padding:8px 12px; font-size:12px; margin-bottom:12px;">';
              html += '      <strong>Impact:</strong> ' + f.affectedConsumersCount + ' consumer site(s) reference this symbol.';
              html += '    </div>';
              if (f.evidence && f.evidence.length > 0) {
                html += '    <div style="font-size:11px; font-weight:700; color:var(--muted); margin-bottom:4px;">EVIDENCE SITES:</div>';
                f.evidence.forEach(function(ev) {
                  html += '    <div style="font-size:11px; margin-bottom:4px;">';
                  html += '      &bull; <span class="file-link" onclick="openFile(\'' + escapeHtml(ev.file) + '\', ' + ev.line + ')">' + escapeHtml(ev.file) + ':' + ev.line + '</span> - ' + escapeHtml(ev.description);
                  html += '    </div>';
                });
              }
              html += '  </div>';
              html += '</div>';
            });
          }
        } else if (state.activeTab === 'files') {
          if (files.length === 0) {
            html += '<div class="empty-state">No changed files in this PR.</div>';
          } else {
            files.forEach(function(file) {
              html += '<div class="file-item" onclick="openFile(\'' + escapeHtml(file.filename) + '\', 1)">';
              html += '  <div>';
              html += '    <strong style="color:#fff;">' + escapeHtml(file.filename) + '</strong>';
              html += '    <div style="font-size:11px; color:var(--muted);">' + escapeHtml(file.status) + '</div>';
              html += '  </div>';
              html += '  <div style="font-size:11px;">';
              html += '    <span style="color:#34d399;">+' + file.additions + '</span> ';
              html += '    <span style="color:#f87171;">-' + file.deletions + '</span>';
              html += '  </div>';
              html += '</div>';
            });
          }
        }

        app.innerHTML = html;

        // Bind top actions
        const reanalyzeBtn = document.getElementById('btn-reanalyze');
        if (reanalyzeBtn) {
          reanalyzeBtn.onclick = function() {
            vscode.postMessage({ type: 'reAnalyze' });
          };
        }

        const linkRepoBtn = document.getElementById('btn-linkrepo');
        if (linkRepoBtn) {
          linkRepoBtn.onclick = function() {
            vscode.postMessage({ type: 'linkRepo' });
          };
        }

        const copyBtn = document.getElementById('btn-copy-review');
        if (copyBtn) {
          copyBtn.onclick = function() {
            vscode.postMessage({
              type: 'copyReview',
              markdown: state.report?.generatedMarkdownReview || ''
            });
          };
        }
      }

      window.setTab = function(tab) {
        state.activeTab = tab;
        render();
      };

      window.openFile = function(file, line) {
        vscode.postMessage({ type: 'openFile', file: file, line: line });
      };

      window.applyFix = function(file, line, itemIndex) {
        const item = state.report?.items[itemIndex];
        if (item) {
          vscode.postMessage({
            type: 'applyFix',
            file: file,
            line: line,
            goodCode: item.fixComparison.goodFixSnippet,
            title: item.title
          });
        }
      };

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      window.addEventListener('message', function(event) {
        const message = event.data;
        if (message.type === 'setFindings' || message.type === 'setReview') {
          state.findings = message.findings || [];
          state.prInfo = message.prInfo;
          state.changedFiles = message.changedFiles || [];
          state.report = message.report || state.report;
          render();
        }
      });

      render();
    })();
  </script>
</body>
</html>`;
}

/**
 * Findings & Review Panel (Webview Panel for Editor Tab)
 */
export class FindingsPanel {
  public static currentPanel: FindingsPanel | undefined;
  public static readonly viewType = 'prSentinel.findingsPanel';
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    findings: Finding[] = [],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = [],
    reviewReport?: PRReviewReport
  ): FindingsPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (FindingsPanel.currentPanel) {
      FindingsPanel.currentPanel._panel.reveal(column);
      FindingsPanel.currentPanel.update(findings, prInfo, changedFiles, reviewReport);
      return FindingsPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      FindingsPanel.viewType,
      `PR Sentinel: ${prInfo ? `#${prInfo.number} Review` : 'Review & Blast Radius'}`,
      column || vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true,
      }
    );

    FindingsPanel.currentPanel = new FindingsPanel(
      panel,
      extensionUri,
      findings,
      prInfo,
      changedFiles,
      reviewReport
    );
    return FindingsPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    findings: Finding[],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = [],
    reviewReport?: PRReviewReport
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this.update(findings, prInfo, changedFiles, reviewReport);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (data) => {
        switch (data.type) {
          case 'openFile': {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
              try {
                const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, data.file);
                const doc = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(doc, {
                  viewColumn: vscode.ViewColumn.One,
                });
                if (data.line && data.line > 0) {
                  const position = new vscode.Position(data.line - 1, 0);
                  editor.selection = new vscode.Selection(position, position);
                  editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                  );
                }
              } catch (err: any) {
                vscode.window.showWarningMessage(
                  `Could not open file "${data.file}": ${err.message || err}`
                );
              }
            }
            break;
          }
          case 'applyFix': {
            await handleApplyFix(data.file, data.line, data.goodCode, data.title);
            break;
          }
          case 'copyReview': {
            if (data.markdown) {
              await vscode.env.clipboard.writeText(data.markdown);
              vscode.window.showInformationMessage(
                'PR Sentinel: Full Markdown Code Review copied to clipboard!'
              );
            }
            break;
          }
          case 'reAnalyze': {
            vscode.commands.executeCommand('pr-sentinel.analyzePR');
            break;
          }
          case 'linkRepo': {
            vscode.commands.executeCommand('pr-sentinel.linkRepo');
            break;
          }
        }
      },
      null,
      this._disposables
    );
  }

  public update(
    findings: Finding[],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = [],
    reviewReport?: PRReviewReport
  ): void {
    this._panel.webview.html = getBlastRadiusHtml(
      findings,
      prInfo,
      changedFiles,
      reviewReport
    );
  }

  public dispose(): void {
    FindingsPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

/**
 * Findings View Provider for VS Code Sidebar
 */
export class FindingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'prSentinel.findingsView';
  private _view?: vscode.WebviewView;
  private _findings: Finding[] = [];
  private _prInfo?: PullRequestInfo;
  private _changedFiles: ChangedFile[] = [];
  private _reviewReport?: PRReviewReport;
  private _hasAnalyzed = false;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = getBlastRadiusHtml(
      this._findings,
      this._prInfo,
      this._changedFiles,
      this._reviewReport
    );

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'openFile': {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            try {
              const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, data.file);
              const doc = await vscode.workspace.openTextDocument(uri);
              const editor = await vscode.window.showTextDocument(doc);
              if (data.line && data.line > 0) {
                const position = new vscode.Position(data.line - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                  new vscode.Range(position, position),
                  vscode.TextEditorRevealType.InCenter
                );
              }
            } catch (err: any) {
              vscode.window.showWarningMessage(
                `Could not open file "${data.file}": ${err.message || err}`
              );
            }
          }
          break;
        }
        case 'applyFix': {
          await handleApplyFix(data.file, data.line, data.goodCode, data.title);
          break;
        }
        case 'copyReview': {
          if (data.markdown) {
            await vscode.env.clipboard.writeText(data.markdown);
            vscode.window.showInformationMessage(
              'PR Sentinel: Full Markdown Code Review copied to clipboard!'
            );
          }
          break;
        }
        case 'reAnalyze': {
          vscode.commands.executeCommand('pr-sentinel.analyzePR');
          break;
        }
        case 'linkRepo': {
          vscode.commands.executeCommand('pr-sentinel.linkRepo');
          break;
        }
      }
    });

    if (this._hasAnalyzed) {
      this.updateFindings(this._findings, this._prInfo, this._changedFiles, this._reviewReport);
    }
  }

  public updateFindings(
    findings: Finding[],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = [],
    reviewReport?: PRReviewReport
  ): void {
    this._hasAnalyzed = true;
    this._findings = findings;
    this._prInfo = prInfo;
    this._changedFiles = changedFiles;
    this._reviewReport = reviewReport;

    if (this._view) {
      this._view.webview.html = getBlastRadiusHtml(
        findings,
        prInfo,
        changedFiles,
        reviewReport
      );
    }
  }
}

/**
 * Handles applying recommended best fix directly into local workspace file
 */
async function handleApplyFix(
  filePath: string,
  line: number,
  goodCode: string,
  title: string
): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('No active workspace folder found to apply fix.');
      return;
    }

    const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);

    // Prompt user confirmation
    const choice = await vscode.window.showInformationMessage(
      `PR Sentinel: Apply recommended best fix for "${title}" in ${filePath}?`,
      'Apply Fix',
      'Cancel'
    );

    if (choice === 'Apply Fix') {
      const edit = new vscode.WorkspaceEdit();
      // Insert / replace at the target line
      const targetLine = Math.max(0, line - 1);
      const targetPos = new vscode.Position(targetLine, 0);

      edit.insert(uri, targetPos, `\n// [PR Sentinel Optimal Fix]:\n${goodCode}\n`);
      await vscode.workspace.applyEdit(edit);
      await doc.save();

      vscode.window.showInformationMessage(`✅ Fix successfully applied to ${filePath}!`);
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to apply fix: ${err.message || err}`);
  }
}
