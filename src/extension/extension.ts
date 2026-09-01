import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { FindingsViewProvider } from '../ui/findingsView';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('PR Sentinel extension is now active.');

  // Register Findings Webview Provider
  const findingsProvider = new FindingsViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FindingsViewProvider.viewType,
      findingsProvider
    )
  );

  // Register all extension commands
  registerCommands(context, findingsProvider);

  // Command to show/focus findings view in sidebar
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
