import * as vscode from 'vscode';

/**
 * Findings View Provider scaffold (To be implemented in Phase 7)
 */
export class FindingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'prSentinel.findingsView';

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = `<!DOCTYPE html><html><body><p>PR Sentinel Findings</p></body></html>`;
  }
}
