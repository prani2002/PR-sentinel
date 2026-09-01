import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { FindingsViewProvider } from '../ui/findingsView';

/**
 * Extension entry point
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('PR Sentinel extension is now active.');

  // Register commands
  registerCommands(context);

  // Register Findings Webview Provider
  const provider = new FindingsViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(FindingsViewProvider.viewType, provider)
  );

  // Command to show findings view
  context.subscriptions.push(
    vscode.commands.registerCommand('pr-sentinel.showFindings', () => {
      vscode.commands.executeCommand('prSentinel.findingsView.focus');
    })
  );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('PR Sentinel extension is now deactivated.');
}
