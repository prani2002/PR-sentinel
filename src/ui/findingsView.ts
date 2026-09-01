import * as vscode from 'vscode';
import { Finding, PullRequestInfo } from '../models/types';

/**
 * Findings View Provider for VS Code Sidebar & Panels
 * Renders the Blast Radius Investigation, Impacted Consumers, and Reasoning.
 */
export class FindingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'prSentinel.findingsView';
  private _view?: vscode.WebviewView;
  private _findings: Finding[] = [];
  private _prInfo?: PullRequestInfo;

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

    webviewView.webview.html = this._getHtmlForWebview();

    // Handle messages from the webview
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

    // If findings already exist, populate immediately
    if (this._findings.length > 0) {
      this.updateFindings(this._findings, this._prInfo);
    }
  }

  public updateFindings(findings: Finding[], prInfo?: PullRequestInfo): void {
    this._findings = findings;
    this._prInfo = prInfo;
    if (this._view) {
      this._view.webview.postMessage({
        type: 'setFindings',
        findings,
        prInfo,
      });
    }
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Sentinel Findings</title>
  <style>
    :root {
      --bg: var(--vscode-sideBar-background, #18181b);
      --fg: var(--vscode-sideBar-foreground, #cccccc);
      --border: var(--vscode-panel-border, #27272a);
      --accent: var(--vscode-button-background, #0284c7);
      --accent-hover: var(--vscode-button-hoverBackground, #0369a1);
      --red: #ef4444;
      --orange: #f97316;
      --green: #22c55e;
      --yellow: #eab308;
      --card-bg: var(--vscode-editor-background, #141416);
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--fg);
      background-color: var(--bg);
      margin: 0;
      padding: 12px;
      line-height: 1.5;
    }
    .pr-header {
      padding-bottom: 12px;
      margin-bottom: 14px;
      border-bottom: 1px solid var(--border);
    }
    .pr-title {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .pr-meta {
      font-size: 11px;
      color: #a1a1aa;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .badge-breaking {
      display: inline-block;
      background: rgba(239, 68, 68, 0.18);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      text-transform: uppercase;
    }
    .badge-warning {
      display: inline-block;
      background: rgba(249, 115, 22, 0.18);
      color: #fb923c;
      border: 1px solid rgba(249, 115, 22, 0.35);
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      text-transform: uppercase;
    }
    .badge-info {
      display: inline-block;
      background: rgba(56, 189, 248, 0.18);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      text-transform: uppercase;
    }
    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      margin: 8px 0 2px 0;
      color: #ffffff;
    }
    .subtitle {
      font-size: 11px;
      color: #a1a1aa;
      font-family: monospace;
      margin-bottom: 10px;
    }
    .diff-pill-container {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
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
      color: #a1a1aa;
      margin-top: 12px;
      margin-bottom: 4px;
    }
    .impact-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 8px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .impact-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: #38bdf8;
    }
    .impact-header {
      font-weight: 600;
      font-size: 11px;
      color: #f4f4f5;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .code-chip {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 5px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 11px;
      color: #e4e4e7;
      margin-top: 3px;
      display: inline-block;
      word-break: break-all;
    }
    .btn-primary {
      background: var(--accent);
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 7px 10px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      margin-top: 10px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-primary:hover {
      background: var(--accent-hover);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #e4e4e7;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 10px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      font-size: 11px;
      margin-top: 6px;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .empty-state {
      text-align: center;
      padding: 24px 8px;
      color: #a1a1aa;
    }
    .empty-icon {
      font-size: 28px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div id="app">
    <div class="empty-state">
      <div class="empty-icon">🛡️</div>
      <h3 style="color: #ffffff; margin: 4px 0 8px 0; font-size: 14px;">PR Sentinel Ready</h3>
      <p style="font-size: 12px; line-height: 1.5; margin-bottom: 14px;">
        Analyze any GitHub PR or GitLab MR to detect breaking changes and AST blast radius across your workspace.
      </p>
      <button class="btn-primary" onclick="vscode.postMessage({ type: 'reAnalyze' })">
        🔍 Analyze PR / MR Now
      </button>
      <button class="btn-secondary" onclick="vscode.postMessage({ type: 'setToken' })">
        🔑 Configure GitHub / GitLab PAT
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function renderFindings(findings, prInfo) {
      const app = document.getElementById('app');
      if (!findings || findings.length === 0) {
        app.innerHTML = \`
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <h3 style="color: #4ade80; margin: 4px 0 8px 0; font-size: 14px;">No Breaking Changes Detected</h3>
            <p style="font-size: 12px; line-height: 1.5; margin-bottom: 14px;">
              All PR changes maintain 100% compatibility with the current workspace consumers.
            </p>
            <button class="btn-secondary" onclick="vscode.postMessage({ type: 'reAnalyze' })">
              🔄 Re-analyze PR
            </button>
          </div>
        \`;
        return;
      }

      let headerHtml = '';
      if (prInfo) {
        headerHtml = \`
          <div class="pr-header">
            <div class="pr-title">#\${prInfo.number} \${escapeHtml(prInfo.title)}</div>
            <div class="pr-meta">
              <span>📦 \${escapeHtml(prInfo.owner)}/\${escapeHtml(prInfo.repository)}</span>
              <span>•</span>
              <span style="color: #ef4444; font-weight: 600;">\${findings.length} issue(s) detected</span>
            </div>
          </div>
        \`;
      }

      let cardsHtml = findings.map((finding) => {
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
            <div class="impact-item" onclick="vscode.postMessage({ type: 'openFile', file: '\${escapeHtml(ev.file)}', line: \${ev.line || 1} })" title="Click to navigate in editor">
              <div class="impact-header">
                <span>\${ev.severity === 'high' ? '🔴' : '🟠'} \${escapeHtml(ev.file)}:\${ev.line}</span>
                <span style="color: #38bdf8; font-size: 10px;">Open ↗</span>
              </div>
              \${ev.snippet ? \`<div class="code-chip">\${escapeHtml(ev.snippet)}</div>\` : ''}
              \${ev.description ? \`<div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">\${escapeHtml(ev.description)}</div>\` : ''}
            </div>
          \`).join('');
        }

        const primaryFile = finding.evidence?.[0]?.file || finding.filePath;
        const primaryLine = finding.evidence?.[0]?.line || finding.line || 1;

        return \`
          <div class="finding-card">
            <span class="\${badgeClass}">\${badgeLabel}</span>
            <h3 class="title">\${escapeHtml(finding.title)}</h3>
            <div class="subtitle">\${escapeHtml(finding.filePath)}</div>

            \${diffHtml}

            <div class="section-label">Impact</div>
            <div style="font-size: 12px; color: #a1a1aa; margin-bottom: 6px;">
              Affects \${finding.affectedConsumersCount} consumer location(s)
            </div>
            \${evidenceHtml}

            \${finding.explanation ? \`
              <div class="section-label">Explanation</div>
              <div style="font-size: 12px; color: #d4d4d8; line-height: 1.5;">
                \${escapeHtml(finding.explanation)}
              </div>
            \` : ''}

            \${finding.recommendation ? \`
              <div class="section-label">Recommendation</div>
              <div style="font-size: 12px; color: #d4d4d8; line-height: 1.5;">
                \${escapeHtml(finding.recommendation)}
              </div>
            \` : ''}

            \${primaryFile ? \`
              <button class="btn-primary" onclick="vscode.postMessage({ type: 'openFile', file: '\${escapeHtml(primaryFile)}', line: \${primaryLine} })">
                Open \${escapeHtml(primaryFile.split('/').pop() || primaryFile)} ↗
              </button>
            \` : ''}
          </div>
        \`;
      }).join('');

      app.innerHTML = headerHtml + cardsHtml;
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'setFindings') {
        renderFindings(message.findings, message.prInfo);
      }
    });
  </script>
</body>
</html>`;
  }
}
