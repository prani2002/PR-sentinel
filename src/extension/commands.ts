import * as vscode from 'vscode';
import { GitHubClient } from '../github/githubClient';
import { parseAllChangedFiles, parseGitHubRemoteUrl } from '../github/pullRequest';

/**
 * Discovers repository owner & name from local git remotes if available
 */
async function detectGitRepository(): Promise<{ owner: string; repo: string } | null> {
  try {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension) {
      const git = gitExtension.exports.getAPI(1);
      if (git && git.repositories && git.repositories.length > 0) {
        const repo = git.repositories[0];
        const remotes = repo.state.remotes;
        const origin = remotes.find((r: any) => r.name === 'origin') || remotes[0];
        if (origin && origin.fetchUrl) {
          const parsed = parseGitHubRemoteUrl(origin.fetchUrl);
          if (parsed) {
            return parsed;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not auto-detect git repository:', err);
  }
  return null;
}

/**
 * Register all PR Sentinel commands
 */
export function registerCommands(context: vscode.ExtensionContext): void {
  const analyzePRCommand = vscode.commands.registerCommand(
    'pr-sentinel.analyzePR',
    async () => {
      try {
        // 1. Auto-detect or prompt for repository owner & repo
        let defaultRepo = '';
        const detected = await detectGitRepository();
        if (detected) {
          defaultRepo = `${detected.owner}/${detected.repo}`;
        }

        const repoInput = await vscode.window.showInputBox({
          prompt: 'Enter GitHub repository (owner/repo)',
          value: defaultRepo,
          placeHolder: 'e.g. prani2002/PR-sentinel or facebook/react',
          ignoreFocusOut: true,
          validateInput: (value) => {
            if (!value || !value.includes('/')) {
              return 'Please enter repository in owner/repo format';
            }
            return null;
          },
        });

        if (!repoInput) {
          return;
        }

        const [owner, repo] = repoInput.split('/').map((s) => s.trim());

        // 2. Prompt for PR number
        const prInput = await vscode.window.showInputBox({
          prompt: `Enter Pull Request number for ${owner}/${repo}`,
          placeHolder: 'e.g. 1',
          ignoreFocusOut: true,
          validateInput: (value) => {
            const num = parseInt(value, 10);
            if (isNaN(num) || num <= 0) {
              return 'Please enter a valid positive PR number';
            }
            return null;
          },
        });

        if (!prInput) {
          return;
        }

        const prNumber = parseInt(prInput, 10);

        // 3. Progress notification while querying real GitHub API
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `PR Sentinel: Fetching PR #${prNumber} from ${owner}/${repo}...`,
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: 'Contacting GitHub API...' });

            const githubToken = process.env.GITHUB_TOKEN;
            const client = new GitHubClient(githubToken);

            const pr = await client.getPullRequest(owner, repo, prNumber);
            progress.report({ message: `Fetched PR "${pr.title}". Fetching changed files...` });

            const changedFiles = await client.getPullRequestFiles(owner, repo, prNumber);
            const parsed = parseAllChangedFiles(changedFiles);

            const totalAdditions = changedFiles.reduce((acc, f) => acc + f.additions, 0);
            const totalDeletions = changedFiles.reduce((acc, f) => acc + f.deletions, 0);

            const fileSummary = changedFiles.map((f) => ` • ${f.filename} (+${f.additions} -${f.deletions})`).join('\n');

            console.log(`[PR Sentinel] PR #${prNumber}: ${pr.title}`);
            console.log(`[PR Sentinel] Changed files count: ${changedFiles.length}`);
            console.log(fileSummary);

            const selection = await vscode.window.showInformationMessage(
              `PR Sentinel: PR #${prNumber} "${pr.title}" fetched successfully. ${changedFiles.length} file(s) changed (+${totalAdditions}, -${totalDeletions}).`,
              'View Changed Files',
              'OK'
            );

            if (selection === 'View Changed Files') {
              const doc = await vscode.workspace.openTextDocument({
                content: `# PR #${pr.number}: ${pr.title}\n\n**Base SHA:** \`${pr.baseSha}\`\n**Head SHA:** \`${pr.headSha}\`\n**Total Changes:** +${totalAdditions}, -${totalDeletions}\n\n## Changed Files (${changedFiles.length}):\n${fileSummary}\n\n## Parsed Patches Summary:\n${parsed.map(p => `### ${p.parsedPatch.filename}\n- Added lines: ${p.parsedPatch.addedLines.length}\n- Deleted lines: ${p.parsedPatch.deletedLines.length}\n- Hunks: ${p.parsedPatch.hunks.length}`).join('\n\n')}`,
                language: 'markdown',
              });
              await vscode.window.showTextDocument(doc, { preview: true });
            }
          }
        );
      } catch (error: any) {
        console.error('PR Sentinel GitHub fetch error:', error);
        vscode.window.showErrorMessage(
          `PR Sentinel Error: ${error.message || error}`
        );
      }
    }
  );

  context.subscriptions.push(analyzePRCommand);
}
