import * as vscode from 'vscode';
import { registerCommands } from './commands';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('PR Sentinel extension is now active.');
  registerCommands(context);
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('PR Sentinel extension is now deactivated.');
}
