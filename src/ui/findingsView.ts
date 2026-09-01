import * as vscode from 'vscode';
import { Finding } from '../models/types';

/**
 * Findings View Provider for VS Code Sidebar & Panels
 * Renders the Blast Radius Investigation, Impacted Consumers, and Reasoning.
 */
export class FindingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'prSentinel.findingsView';
  private _view?: vscode.WebviewView;

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

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'openFile': {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, data.file);
            const doc = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(doc);
            if (data.line) {
              const position = new vscode.Position(data.line - 1, 0);
              editor.selection = new vscode.Selection(position, position);
              editor.revealRange(
                new vscode.Range(position, position),
                vscode.TextEditorRevealType.InCenter
              );
            }
          }
          break;
        }
        case 'reAnalyze': {
          vscode.commands.executeCommand('pr-sentinel.analyzePR');
          break;
        }
      }
    });
  }

  public updateFindings(findings: Finding[]): void {
    if (this._view) {
      this._view.webview.postMessage({ type: 'setFindings', findings });
    }
  }

  private _getHtmlForWebview(_webview: vscode.Webview): string {
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
      --accent: var(--vscode-button-background, #007acc);
      --red: #ef4444;
      --orange: #f97316;
      --green: #22c55e;
    }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--fg);
      background-color: var(--bg);
      margin: 0;
      padding: 16px;
      line-height: 1.5;
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
    .title {
      font-size: 16px;
      font-weight: 600;
      margin: 8px 0 2px 0;
      color: #ffffff;
    }
    .subtitle {
      font-size: 12px;
      color: #a1a1aa;
      font-family: monospace;
      margin-bottom: 12px;
    }
    .diff-pill-container {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .diff-pill-del {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .diff-pill-add {
      background: rgba(34, 197, 94, 0.15);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #a1a1aa;
      margin-top: 16px;
      margin-bottom: 6px;
    }
    .impact-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      cursor: pointer;
    }
    .impact-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .impact-header {
      font-weight: 600;
      font-size: 12px;
      color: #f4f4f5;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .code-chip {
      background: #18181b;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      color: #e4e4e7;
      margin-top: 4px;
      display: inline-block;
    }
    .btn-primary {
      background: #007acc;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 8px 12px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      margin-top: 16px;
      font-size: 12px;
    }
    .btn-primary:hover {
      background: #0062a3;
    }
  </style>
</head>
<body>
  <div>
    <span class="badge-breaking">Breaking Change</span>
    <h2 class="title">PaymentStatus changed</h2>
    <div class="subtitle">backend/types.ts</div>

    <div class="diff-pill-container">
      <span class="diff-pill-del">'success'</span>
      <span>→</span>
      <span class="diff-pill-add">'completed'</span>
    </div>

    <div class="section-label">Impact</div>
    <div style="font-size: 12px; color: #a1a1aa; margin-bottom: 8px;">This change affects 2 consumer(s)</div>

    <div class="impact-item" onclick="vscode.postMessage({ type: 'openFile', file: 'frontend/Checkout.tsx', line: 42 })">
      <div class="impact-header">
        <span style="color: #ef4444;">🔴</span> Checkout.tsx:42
      </div>
      <div class="code-chip">status === 'success'</div>
    </div>

    <div class="impact-item" onclick="vscode.postMessage({ type: 'openFile', file: 'frontend/PaymentStatus.tsx', line: 15 })">
      <div class="impact-header">
        <span style="color: #f97316;">🟠</span> PaymentStatus.tsx:15
      </div>
      <div style="font-size: 11px; color: #d4d4d8; margin-top: 2px;">Missing 'completed' case</div>
    </div>

    <div class="section-label">Explanation</div>
    <div style="font-size: 12px; color: #d4d4d8;">
      The backend changed the PaymentStatus value <span class="code-chip">'success'</span> to <span class="code-chip">'completed'</span>, but <span class="code-chip">Checkout.tsx</span> still expects <span class="code-chip">'success'</span> in a strict equality check.
    </div>

    <div class="section-label">Recommendation</div>
    <div style="font-size: 12px; color: #d4d4d8;">
      Update <span class="code-chip">Checkout.tsx</span> to handle <span class="code-chip">'completed'</span> and add/update tests.
    </div>

    <button class="btn-primary" onclick="vscode.postMessage({ type: 'openFile', file: 'frontend/Checkout.tsx', line: 42 })">
      Open Checkout.tsx ↗
    </button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
  </script>
</body>
</html>`;
  }
}
