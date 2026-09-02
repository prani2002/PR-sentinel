import * as vscode from 'vscode';
import {
  parseGitUrlOrInput,
  fetchRemotePullOrMergeRequest,
  validateRemoteToken,
  listRemotePullOrMergeRequests,
  ParsedGitTarget,
  GitProviderType,
} from '../git/gitProvider';
import { parseAllChangedFiles } from '../github/pullRequest';
import { DeterministicPipeline } from '../pipeline/deterministicPipeline';
import { ProjectFileSource } from '../analyzer/projectScanner';
import { FindingsViewProvider, FindingsPanel } from '../ui/findingsView';
import { Finding, PullRequestInfo, ChangedFile, PRReviewReport } from '../models/types';
import { CodeReviewer } from '../reviewer/codeReviewer';
import { RepoLinker } from '../reviewer/repoLinker';

/**
 * Discovers repository target from local git remotes if available
 */
async function detectGitRepository(): Promise<ParsedGitTarget | null> {
  try {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension) {
      const git = gitExtension.exports.getAPI(1);
      if (git && git.repositories && git.repositories.length > 0) {
        const repo = git.repositories[0];
        const remotes = repo.state?.remotes || [];
        const origin = remotes.find((r: any) => r.name === 'origin') || remotes[0];
        if (origin && origin.fetchUrl) {
          const parsed = parseGitUrlOrInput(origin.fetchUrl);
          if (parsed.target) {
            return parsed.target;
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
 * Retrieves a stored Personal Access Token for GitHub or GitLab
 */
async function getStoredToken(
  context: vscode.ExtensionContext,
  provider: GitProviderType
): Promise<string | undefined> {
  // 1. Check secure secret storage
  try {
    const secret = await context.secrets.get(`pr_sentinel_pat_${provider}`);
    if (secret && secret.trim()) return secret.trim();
    const legacySecret = await context.secrets.get('pr_sentinel_pat');
    if (legacySecret && legacySecret.trim()) return legacySecret.trim();
  } catch {}

  // 2. Check VS Code settings
  const config = vscode.workspace.getConfiguration('prSentinel');
  const configToken =
    provider === 'gitlab'
      ? config.get<string>('gitlabToken')
      : config.get<string>('githubToken');
  if (configToken && configToken.trim()) return configToken.trim();

  // 3. Check environment variables
  const envToken =
    provider === 'gitlab'
      ? process.env.GITLAB_TOKEN || process.env.GITLAB_PAT
      : process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken && envToken.trim()) return envToken.trim();

  // 4. Try VS Code GitHub Authentication Session for GitHub
  if (provider === 'github') {
    try {
      const session = await vscode.authentication.getSession('github', ['repo'], {
        createIfNone: false,
      });
      if (session && session.accessToken) {
        return session.accessToken;
      }
    } catch {}
  }

  return undefined;
}

/**
 * Prompts the user to enter and validate a PAT token, storing it securely
 */
async function promptAndStoreToken(
  context: vscode.ExtensionContext,
  provider: GitProviderType,
  host?: string,
  reasonMessage?: string
): Promise<string | null> {
  const isGitLab = provider === 'gitlab';
  const tokenLabel = isGitLab ? 'GitLab Personal Access Token' : 'GitHub Personal Access Token';
  const placeholder = isGitLab ? 'glpat-...' : 'ghp_...';

  const tokenInput = await vscode.window.showInputBox({
    prompt:
      reasonMessage ||
      `Enter your ${tokenLabel} (with "repo" / "read_api" permissions) to access private repositories:`,
    placeHolder: placeholder,
    password: true,
    ignoreFocusOut: true,
    validateInput: (val) => {
      if (!val || !val.trim()) {
        return 'Please enter a valid token';
      }
      return null;
    },
  });

  if (!tokenInput || !tokenInput.trim()) {
    return null;
  }

  const token = tokenInput.trim();

  // Validate the token
  const validation = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `PR Sentinel: Validating ${tokenLabel}...`,
      cancellable: false,
    },
    async () => {
      return await validateRemoteToken(provider, token, host);
    }
  );

  if (!validation.valid) {
    vscode.window.showErrorMessage(
      `PR Sentinel Token Validation Failed: ${validation.error || 'Invalid credentials'}`
    );
    return null;
  }

  // Store in secrets
  await context.secrets.store(`pr_sentinel_pat_${provider}`, token);

  vscode.window.showInformationMessage(
    `PR Sentinel: ${tokenLabel} validated successfully${
      validation.username ? ` (@${validation.username})` : ''
    } and securely saved.`
  );

  return token;
}

/**
 * Loads project workspace files into memory for deterministic AST blast radius analysis
 */
async function collectWorkspaceSources(): Promise<ProjectFileSource[]> {
  const sources: ProjectFileSource[] = [];
  try {
    const uris = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx,json}',
      '{**/node_modules/**,**/dist/**,**/build/**,**/.git/**,**/.next/**}'
    );

    for (const uri of uris) {
      try {
        const fileData = await vscode.workspace.fs.readFile(uri);
        const content = Buffer.from(fileData).toString('utf8');
        const relativePath = vscode.workspace.asRelativePath(uri);
        sources.push({
          path: relativePath,
          content,
        });
      } catch {}
    }
  } catch (err) {
    console.warn('Could not collect workspace sources:', err);
  }
  return sources;
}

/**
 * Core function that executes PR fetch, deterministic AST scan, and Senior Code Review
 */
export async function executePRAnalysisAndReview(
  context: vscode.ExtensionContext,
  target: ParsedGitTarget,
  findingsViewProvider?: FindingsViewProvider
): Promise<void> {
  const targetIdentifier =
    target.provider === 'gitlab' ? target.projectPath : `${target.owner}/${target.repo}`;

  let token = await getStoredToken(context, target.provider);

  let fetchResult;
  let attemptFetch = async (currentToken?: string) => {
    return await fetchRemotePullOrMergeRequest(target, currentToken);
  };

  try {
    fetchResult = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `PR Sentinel: Fetching ${target.typeLabel} #${target.number} from ${targetIdentifier}...`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Connecting to API...' });
        return await attemptFetch(token);
      }
    );
  } catch (fetchErr: any) {
    const errMsg = fetchErr?.message || String(fetchErr);
    const isAuthError =
      errMsg.includes('404') ||
      errMsg.includes('401') ||
      errMsg.includes('403') ||
      errMsg.includes('Not Found') ||
      errMsg.includes('rate limit');

    if (isAuthError) {
      const action = await vscode.window.showWarningMessage(
        `PR Sentinel: ${target.typeLabel} #${target.number} not found on "${targetIdentifier}" (or repository is private/rate-limited).`,
        'Enter Access Token (PAT)',
        'Cancel'
      );

      if (action === 'Enter Access Token (PAT)') {
        const newToken = await promptAndStoreToken(
          context,
          target.provider,
          target.host,
          `Enter Personal Access Token for ${
            target.provider === 'gitlab' ? 'GitLab' : 'GitHub'
          } to access "${targetIdentifier}":`
        );
        if (newToken) {
          token = newToken;
          fetchResult = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `PR Sentinel: Retrying ${target.typeLabel} #${target.number} with authentication...`,
              cancellable: false,
            },
            async () => await attemptFetch(token)
          );
        } else {
          return;
        }
      } else {
        return;
      }
    } else {
      throw fetchErr;
    }
  }

  if (!fetchResult) {
    return;
  }

  const { prInfo, changedFiles } = fetchResult;

  // Run AST Blast Radius Pipeline + Senior Code Reviewer
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `PR Sentinel: Reviewing Code & Blast Radius for ${target.typeLabel} #${target.number}...`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: 'Analyzing AST changes and code quality...' });

      const workspaceSources = await collectWorkspaceSources();

      // 1. AST Blast Radius Pipeline
      const pipeline = new DeterministicPipeline();
      const analysisResult = pipeline.run(prInfo, changedFiles, workspaceSources);

      // 2. Senior Code Reviewer Engine (Architecture, Security, Performance, Good vs Bad Fixes)
      const reviewer = new CodeReviewer();
      const reviewReport = reviewer.reviewPullRequest(
        prInfo,
        changedFiles,
        analysisResult.findings,
        workspaceSources
      );

      // 3. Update Webview Providers
      if (findingsViewProvider) {
        findingsViewProvider.updateFindings(
          analysisResult.findings,
          prInfo,
          changedFiles,
          reviewReport
        );
      }

      // Display Dashboard Helper
      const showDashboard = async () => {
        try {
          FindingsPanel.createOrShow(
            context.extensionUri,
            analysisResult.findings,
            prInfo,
            changedFiles,
            reviewReport
          );
          await vscode.commands.executeCommand('workbench.view.extension.pr-sentinel');
          await vscode.commands.executeCommand('prSentinel.findingsView.focus');
        } catch (openErr) {
          console.warn('Could not focus PR Sentinel panel:', openErr);
        }
      };

      const breakingCount = analysisResult.metrics.breakingCount;
      const issuesCount = reviewReport.items.length;
      const verdictStr =
        reviewReport.verdict === 'APPROVE'
          ? '✅ Approved'
          : reviewReport.verdict === 'REQUEST_CHANGES'
          ? '⚠️ Changes Requested'
          : reviewReport.verdict === 'CRITICAL_RISK'
          ? '🛑 Critical Risk'
          : '💬 Suggestions Available';

      const summaryMessage = `PR Sentinel: [Score: ${reviewReport.overallScore}/100 | ${verdictStr}] - Found ${issuesCount} review item(s) & ${breakingCount} breaking change(s).`;

      const choice = await vscode.window.showInformationMessage(
        summaryMessage,
        'View Code Review & Fixes',
        'Copy Markdown Review',
        'View Changed Files Diff'
      );

      if (choice === 'View Code Review & Fixes') {
        await showDashboard();
      } else if (choice === 'Copy Markdown Review') {
        await vscode.env.clipboard.writeText(reviewReport.generatedMarkdownReview);
        vscode.window.showInformationMessage('PR Sentinel: Full Markdown Review copied to clipboard!');
      } else if (choice === 'View Changed Files Diff') {
        const doc = await vscode.workspace.openTextDocument({
          content: reviewReport.generatedMarkdownReview,
          language: 'markdown',
        });
        await vscode.window.showTextDocument(doc, { preview: true });
      }
    }
  );
}

/**
 * Register all PR Sentinel commands
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  findingsViewProvider?: FindingsViewProvider
): void {
  // Command: Analyze Pull Request / Merge Request
  const analyzePRCommand = vscode.commands.registerCommand(
    'pr-sentinel.analyzePR',
    async () => {
      try {
        // 1. Auto-detect workspace repository
        let defaultPromptValue = '';
        const detected = await detectGitRepository();
        if (detected) {
          defaultPromptValue =
            detected.provider === 'gitlab'
              ? `${detected.projectPath}`
              : `${detected.owner}/${detected.repo}`;
        }

        // 2. Prompt for PR/MR URL or repository path
        const repoInput = await vscode.window.showInputBox({
          prompt: 'Enter Pull Request URL or repository name',
          value: defaultPromptValue,
          placeHolder: 'e.g. facebook/react/pull/28000 or prani2002/PR-sentinel or full GitHub/GitLab URL',
          ignoreFocusOut: true,
          validateInput: (value) => {
            if (!value || !value.trim()) {
              return 'Please enter a valid PR URL or repository path';
            }
            const parsed = parseGitUrlOrInput(value);
            if (parsed.error && !value.includes('/')) {
              return parsed.error;
            }
            return null;
          },
        });

        if (!repoInput) {
          return;
        }

        // 3. Parse target with the universal parser
        let parsed = parseGitUrlOrInput(repoInput);
        if (parsed.error || !parsed.target) {
          vscode.window.showErrorMessage(
            `PR Sentinel Error: ${parsed.error || 'Invalid repository or URL specified.'}`
          );
          return;
        }

        let target = parsed.target;

        // 4. If PR number was not in the URL, prompt for it
        if (!target.number) {
          const prNumberInput = await vscode.window.showInputBox({
            prompt: `Enter ${target.typeLabel} number for ${
              target.provider === 'gitlab'
                ? target.projectPath
                : target.owner + '/' + target.repo
            }`,
            placeHolder: 'e.g. 1',
            ignoreFocusOut: true,
            validateInput: (val) => {
              const num = parseInt(val, 10);
              if (isNaN(num) || num <= 0) {
                return `Please enter a valid positive ${target.typeLabel} number`;
              }
              return null;
            },
          });

          if (!prNumberInput) {
            return;
          }

          target = {
            ...target,
            number: parseInt(prNumberInput, 10),
          };
        }

        await executePRAnalysisAndReview(context, target, findingsViewProvider);
      } catch (error: any) {
        console.error('PR Sentinel analysis error:', error);
        vscode.window.showErrorMessage(
          `PR Sentinel Error: ${error.message || error}`
        );
      }
    }
  );

  // Command: Link Workspace Repository & Browse Open PRs
  const linkRepoCommand = vscode.commands.registerCommand(
    'pr-sentinel.linkRepo',
    async () => {
      try {
        const detected = await detectGitRepository();
        let target: ParsedGitTarget | null = detected;

        if (!target) {
          const input = await vscode.window.showInputBox({
            prompt: 'Enter GitHub / GitLab repository to link (e.g. owner/repo)',
            placeHolder: 'owner/repo or https://github.com/owner/repo',
            ignoreFocusOut: true,
          });
          if (!input) return;
          const parsed = parseGitUrlOrInput(input);
          if (parsed.target) target = parsed.target;
        }

        if (!target) {
          vscode.window.showWarningMessage('No repository target could be determined.');
          return;
        }

        const token = await getStoredToken(context, target.provider);
        const repoName = target.provider === 'gitlab' ? target.projectPath : `${target.owner}/${target.repo}`;

        // Fetch open PRs
        const prs = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `PR Sentinel: Fetching open ${target.typeLabel}s for ${repoName}...`,
            cancellable: false,
          },
          async () => {
            return await listRemotePullOrMergeRequests(target!, token, 'open');
          }
        );

        if (!prs || prs.length === 0) {
          vscode.window.showInformationMessage(
            `PR Sentinel: No open ${target.typeLabel}s found in ${repoName}.`
          );
          return;
        }

        const items = prs.map((pr) => ({
          label: `${target!.typeLabel} #${pr.number}: ${pr.title}`,
          description: `by @${pr.author || 'unknown'} • branch: ${pr.branchName || 'head'}`,
          detail: `Updated: ${pr.updatedAt || pr.createdAt || 'recently'}`,
          pr,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: `Select an open ${target.typeLabel} in ${repoName} to review`,
          matchOnDescription: true,
          matchOnDetail: true,
        });

        if (selected) {
          const fullTarget: ParsedGitTarget = {
            ...target,
            number: selected.pr.number,
          };
          await executePRAnalysisAndReview(context, fullTarget, findingsViewProvider);
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to link repository: ${err.message || err}`);
      }
    }
  );

  // Command: Full Staff Code Review
  const reviewPRCommand = vscode.commands.registerCommand(
    'pr-sentinel.reviewPR',
    async () => {
      vscode.commands.executeCommand('pr-sentinel.analyzePR');
    }
  );

  // Command: Configure / Set Personal Access Token
  const setTokenCommand = vscode.commands.registerCommand(
    'pr-sentinel.setToken',
    async () => {
      const providerChoice = await vscode.window.showQuickPick(
        [
          {
            label: 'GitHub Personal Access Token (PAT)',
            description: 'For github.com or GitHub Enterprise repositories',
            provider: 'github' as GitProviderType,
          },
          {
            label: 'GitLab Personal Access Token',
            description: 'For gitlab.com or self-hosted GitLab repositories',
            provider: 'gitlab' as GitProviderType,
          },
        ],
        {
          placeHolder: 'Select Git Provider to configure token',
        }
      );

      if (!providerChoice) return;

      await promptAndStoreToken(context, providerChoice.provider);
    }
  );

  // Command: Clear Saved Token
  const clearTokenCommand = vscode.commands.registerCommand(
    'pr-sentinel.clearToken',
    async () => {
      await context.secrets.delete('pr_sentinel_pat_github');
      await context.secrets.delete('pr_sentinel_pat_gitlab');
      await context.secrets.delete('pr_sentinel_pat');
      vscode.window.showInformationMessage(
        'PR Sentinel: Saved access tokens have been cleared.'
      );
    }
  );

  context.subscriptions.push(analyzePRCommand);
  context.subscriptions.push(linkRepoCommand);
  context.subscriptions.push(reviewPRCommand);
  context.subscriptions.push(setTokenCommand);
  context.subscriptions.push(clearTokenCommand);
}
