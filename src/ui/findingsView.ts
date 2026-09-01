import * as vscode from 'vscode';
import { Finding, PullRequestInfo, ChangedFile } from '../models/types';

/**
 * Generates the full HTML for the Blast Radius Dashboard (used by both Sidebar Webview and Editor Webview Panel)
 */
export function getBlastRadiusHtml(
  findings: Finding[] = [],
  prInfo?: PullRequestInfo,
  changedFiles: ChangedFile[] = []
): string {
  const serializedFindings = JSON.stringify(findings);
  const serializedPrInfo = JSON.stringify(prInfo || null);
  const serializedChangedFiles = JSON.stringify(changedFiles);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Sentinel Blast Radius</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #0f1117);
      --sidebar-bg: var(--vscode-sideBar-background, #161822);
      --fg: var(--vscode-editor-foreground, #e2e8f0);
      --muted: var(--vscode-descriptionForeground, #94a3b8);
      --border: var(--vscode-panel-border, #1e293b);
      --accent: var(--vscode-button-background, #0284c7);
      --accent-hover: var(--vscode-button-hoverBackground, #0369a1);
      --card-bg: var(--vscode-editorWidget-background, rgba(30, 41, 59, 0.4));
      --red: #ef4444;
      --orange: #f97316;
      --green: #22c55e;
      --yellow: #eab308;
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
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 16px;
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
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
    }
    .pr-badges {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pr-meta {
      font-size: 11px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .badge-breaking {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .badge-clean {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.35);
    }
    .badge-warning {
      background: rgba(249, 115, 22, 0.15);
      color: #fb923c;
      border: 1px solid rgba(249, 115, 22, 0.35);
    }
    .nav-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .nav-tab {
      background: transparent;
      border: none;
      color: var(--muted);
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }
    .nav-tab:hover {
      color: #ffffff;
    }
    .nav-tab.active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
    }
    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 14px;
    }
    .finding-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
    }
    .filepath {
      font-size: 11px;
      font-family: monospace;
      color: #38bdf8;
      margin-top: 2px;
    }
    .diff-pill-container {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 8px 0 12px 0;
      flex-wrap: wrap;
    }
    .diff-pill-del {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 3px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
    }
    .diff-pill-add {
      background: rgba(34, 197, 94, 0.15);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 3px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-top: 10px;
      margin-bottom: 4px;
    }
    .impact-item {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .impact-item:hover {
      background: rgba(56, 189, 248, 0.08);
      border-color: #38bdf8;
    }
    .impact-header {
      font-weight: 600;
      font-size: 11px;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .code-chip {
      background: rgba(0, 0, 0, 0.4);
      padding: 4px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      color: #f1f5f9;
      margin-top: 4px;
      word-break: break-all;
    }
    .btn-primary {
      background: var(--accent);
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 8px 12px;
      font-weight: 600;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-primary:hover {
      background: var(--accent-hover);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 12px;
      font-weight: 500;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .clean-box {
      background: rgba(34, 197, 94, 0.06);
      border: 1px solid rgba(34, 197, 94, 0.25);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin-bottom: 16px;
    }
    .file-list-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: monospace;
      font-size: 12px;
    }
    .stat-pill {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div id="app"></div>

  <script>
    const vscode = acquireVsCodeApi();

    let findings = ${serializedFindings};
    let prInfo = ${serializedPrInfo};
    let changedFiles = ${serializedChangedFiles};
    let activeTab = 'blast-radius';

    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function setTab(tab) {
      activeTab = tab;
      renderApp();
    }

    function renderApp() {
      const app = document.getElementById('app');

      if (!prInfo && (!findings || findings.length === 0)) {
        app.innerHTML = \`
          <div style="text-align: center; padding: 40px 16px;">
            <div style="font-size: 36px; margin-bottom: 12px;">🛡️</div>
            <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 16px;">PR Sentinel Ready</h2>
            <p style="color: var(--muted); font-size: 13px; max-width: 420px; margin: 0 auto 16px auto;">
              Analyze any GitHub PR or GitLab MR to detect breaking changes and AST blast radius across your workspace.
            </p>
            <div style="display: flex; gap: 8px; justify-content: center;">
              <button class="btn-primary" onclick="vscode.postMessage({ type: 'reAnalyze' })">
                🔍 Analyze PR / MR Now
              </button>
              <button class="btn-secondary" onclick="vscode.postMessage({ type: 'setToken' })">
                🔑 Set Access Token
              </button>
            </div>
          </div>
        \`;
        return;
      }

      const breakingCount = (findings || []).filter(f => f.severity === 'high' || f.category === 'breaking-change').length;
      const warningCount = (findings || []).length - breakingCount;
      const totalFiles = (changedFiles || []).length;

      let headerHtml = '';
      if (prInfo) {
        headerHtml = \`
          <div class="header-card">
            <div class="pr-title-row">
              <div class="pr-title">#\${prInfo.number} \${escapeHtml(prInfo.title)}</div>
              <div class="pr-badges">
                \${breakingCount > 0 
                  ? \`<span class="badge badge-breaking">🔴 \${breakingCount} Breaking Change\${breakingCount > 1 ? 's' : ''}</span>\`
                  : \`<span class="badge badge-clean">✅ 100% Compatible</span>\`
                }
              </div>
            </div>
            <div class="pr-meta">
              <span>📦 <strong>\${escapeHtml(prInfo.owner)}/\${escapeHtml(prInfo.repository)}</strong></span>
              <span>•</span>
              <span>📄 <strong>\${totalFiles}</strong> Changed File(s)</span>
              <span>•</span>
              <span>🔀 <strong>\${escapeHtml(prInfo.headBranch || 'head')}</strong> → <strong>\${escapeHtml(prInfo.baseBranch || 'main')}</strong></span>
            </div>
          </div>
        \`;
      }

      let tabsHtml = \`
        <div class="nav-tabs">
          <button class="nav-tab \${activeTab === 'blast-radius' ? 'active' : ''}" onclick="setTab('blast-radius')">
            💥 Blast Radius Findings (\${(findings || []).length})
          </button>
          <button class="nav-tab \${activeTab === 'changed-files' ? 'active' : ''}" onclick="setTab('changed-files')">
            📄 Changed Files (\${(changedFiles || []).length})
          </button>
        </div>
      \`;

      let contentHtml = '';

      if (activeTab === 'blast-radius') {
        if (!findings || findings.length === 0) {
          contentHtml = \`
            <div class="clean-box">
              <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
              <h3 style="color: #4ade80; margin: 0 0 6px 0; font-size: 15px;">No Breaking Changes Detected</h3>
              <p style="color: var(--muted); font-size: 12px; margin: 0 0 14px 0; max-width: 480px; margin-left: auto; margin-right: auto;">
                All \${totalFiles} changed file(s) in this MR/PR maintain full backward compatibility with workspace consumers.
              </p>
              <button class="btn-secondary" onclick="vscode.postMessage({ type: 'reAnalyze' })">
                🔄 Re-analyze PR / MR
              </button>
            </div>
          \`;
        } else {
          contentHtml = (findings || []).map((finding) => {
            const isBreaking = finding.severity === 'high' || finding.category === 'breaking-change';
            const badgeClass = isBreaking ? 'badge-breaking' : 'badge-warning';
            const badgeLabel = isBreaking ? 'Breaking Change' : 'Warning';

            let diffHtml = '';
            if (finding.oldValue || finding.newValue) {
              diffHtml = \`
                <div class="diff-pill-container">
                  \${finding.oldValue ? \`<span class="diff-pill-del">\${escapeHtml(finding.oldValue)}</span>\` : ''}
                  <span>→</span>
                  \${finding.newValue ? \`<span class="diff-pill-add">\${escapeHtml(finding.newValue)}</span>\` : ''}
                </div>
              \`;
            }

            let evidenceHtml = '';
            if (finding.evidence && finding.evidence.length > 0) {
              evidenceHtml = finding.evidence.map((ev) => \`
                <div class="impact-item" onclick="vscode.postMessage({ type: 'openFile', file: '\${escapeHtml(ev.file)}', line: \${ev.line || 1} })" title="Click to jump to line in editor">
                  <div class="impact-header">
                    <span>\${ev.severity === 'high' ? '🔴' : '🟠'} \${escapeHtml(ev.file)}:\${ev.line}</span>
                    <span style="color: #38bdf8; font-size: 10px;">Jump to Line ↗</span>
                  </div>
                  \${ev.snippet ? \`<div class="code-chip">\${escapeHtml(ev.snippet)}</div>\` : ''}
                  \${ev.description ? \`<div style="font-size: 11px; color: var(--muted); margin-top: 4px;">\${escapeHtml(ev.description)}</div>\` : ''}
                </div>
              \`).join('');
            }

            const primaryFile = finding.evidence?.[0]?.file || finding.filePath;
            const primaryLine = finding.evidence?.[0]?.line || finding.line || 1;

            return \`
              <div class="finding-card">
                <div class="finding-header">
                  <div>
                    <h3 class="title">\${escapeHtml(finding.title)}</h3>
                    <div class="filepath">\${escapeHtml(finding.filePath)}</div>
                  </div>
                  <span class="badge \${badgeClass}">\${badgeLabel}</span>
                </div>

                \${diffHtml}

                <div class="section-label">Impacted Workspace Consumers (\${finding.affectedConsumersCount})</div>
                \${evidenceHtml || '<div style="font-size: 12px; color: var(--muted);">Direct signature modification</div>'}

                \${finding.explanation ? \`
                  <div class="section-label">Why this breaks</div>
                  <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">\${escapeHtml(finding.explanation)}</div>
                \` : ''}

                \${finding.recommendation ? \`
                  <div class="section-label">Fix Recommendation</div>
                  <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">\${escapeHtml(finding.recommendation)}</div>
                \` : ''}

                \${primaryFile ? \`
                  <div style="margin-top: 12px;">
                    <button class="btn-primary" onclick="vscode.postMessage({ type: 'openFile', file: '\${escapeHtml(primaryFile)}', line: \${primaryLine} })">
                      Open \${escapeHtml(primaryFile.split('/').pop() || primaryFile)} (Line \${primaryLine}) ↗
                    </button>
                  </div>
                \` : ''}
              </div>
            \`;
          }).join('');
        }
      } else if (activeTab === 'changed-files') {
        contentHtml = (changedFiles || []).map((file) => \`
          <div class="file-list-item">
            <span style="color: #e2e8f0;">\${escapeHtml(file.filename)}</span>
            <div style="display: flex; gap: 6px;">
              <span class="stat-pill" style="background: rgba(34, 197, 94, 0.15); color: #4ade80;">+\${file.additions}</span>
              <span class="stat-pill" style="background: rgba(239, 68, 68, 0.15); color: #f87171;">-\${file.deletions}</span>
            </div>
          </div>
        \`).join('') || '<div style="color: var(--muted); padding: 12px;">No changed files found.</div>';
      }

      app.innerHTML = headerHtml + tabsHtml + contentHtml;
    }

    renderApp();

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'setFindings') {
        findings = message.findings || [];
        prInfo = message.prInfo;
        changedFiles = message.changedFiles || [];
        renderApp();
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Findings Webview Panel in Editor Tab (Main view for "View Blast Radius Details")
 */
export class FindingsPanel {
  public static currentPanel: FindingsPanel | undefined;
  public static readonly viewType = 'prSentinel.blastRadiusReport';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    findings: Finding[],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = []
  ): FindingsPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    if (FindingsPanel.currentPanel) {
      FindingsPanel.currentPanel._panel.reveal(column);
      FindingsPanel.currentPanel.update(findings, prInfo, changedFiles);
      return FindingsPanel.currentPanel;
    }

    const panelTitle = prInfo
      ? `PR Sentinel: #${prInfo.number} ${prInfo.title.slice(0, 30)}`
      : 'PR Sentinel: Blast Radius';

    const panel = vscode.window.createWebviewPanel(
      FindingsPanel.viewType,
      panelTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    FindingsPanel.currentPanel = new FindingsPanel(panel, extensionUri, findings, prInfo, changedFiles);
    return FindingsPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    findings: Finding[],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = []
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this.update(findings, prInfo, changedFiles);

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
                const editor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One });
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
          case 'reAnalyze': {
            vscode.commands.executeCommand('pr-sentinel.analyzePR');
            break;
          }
          case 'setToken': {
            vscode.commands.executeCommand('pr-sentinel.setToken');
            break;
          }
        }
      },
      null,
      this._disposables
    );
  }

  public update(findings: Finding[], prInfo?: PullRequestInfo, changedFiles: ChangedFile[] = []): void {
    this._panel.webview.html = getBlastRadiusHtml(findings, prInfo, changedFiles);
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
      this._changedFiles
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
        case 'reAnalyze': {
          vscode.commands.executeCommand('pr-sentinel.analyzePR');
          break;
        }
        case 'setToken': {
          vscode.commands.executeCommand('pr-sentinel.setToken');
          break;
        }
      }
    });

    if (this._hasAnalyzed) {
      this.updateFindings(this._findings, this._prInfo, this._changedFiles);
    }
  }

  public updateFindings(
    findings: Finding[],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = []
  ): void {
    this._hasAnalyzed = true;
    this._findings = findings;
    this._prInfo = prInfo;
    this._changedFiles = changedFiles;

    if (this._view) {
      this._view.webview.postMessage({
        type: 'setFindings',
        findings,
        prInfo,
        changedFiles,
      });
    }
  }
}
