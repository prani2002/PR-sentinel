import { ChangedFile, PullRequestInfo } from '../models/types';

export interface ParsedGitHubTarget {
  owner: string;
  repo: string;
  prNumber?: number;
}

/**
 * Robust parser supporting:
 * - https://github.com/facebook/react/pull/28000
 * - github.com/facebook/react/pull/28000
 * - facebook/react/pull/28000
 * - https://github.com/facebook/react
 * - facebook/react
 */
export function parseGitHubInput(
  input: string,
  explicitPrNum?: string | number
): { target?: ParsedGitHubTarget; error?: string } {
  let cleaned = (input || '').trim();
  if (!cleaned) {
    return { error: 'Please enter a GitHub repository (e.g. facebook/react) or PR URL.' };
  }

  // Remove protocol and domain prefixes if present
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.replace(/^github\.com\//i, '');

  // Strip query parameters and hashes
  cleaned = cleaned.split('?')[0];

  let extractedPr: number | undefined;
  if (cleaned.includes('#')) {
    const parts = cleaned.split('#');
    cleaned = parts[0];
    const hashPr = parseInt(parts[1], 10);
    if (!isNaN(hashPr) && hashPr > 0) {
      extractedPr = hashPr;
    }
  }

  // Remove leading and trailing slashes
  cleaned = cleaned.replace(/^\/+|\/+$/g, '');

  const segments = cleaned.split('/').filter(Boolean);

  let owner = '';
  let repo = '';

  if (segments.length >= 2) {
    owner = segments[0];
    repo = segments[1].replace(/\.git$/i, '');

    // Check if URL has /pull/123 or /pulls/123
    const pullIdx = segments.findIndex(
      (s) => s.toLowerCase() === 'pull' || s.toLowerCase() === 'pulls'
    );
    if (pullIdx !== -1 && segments[pullIdx + 1]) {
      const parsedNum = parseInt(segments[pullIdx + 1], 10);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        extractedPr = parsedNum;
      }
    }
  }

  if (!owner || !repo || owner.includes(':') || repo.includes(':')) {
    return {
      error:
        'Invalid repository format. Please enter "owner/repo" (e.g. facebook/react) or a full PR URL (e.g. https://github.com/facebook/react/pull/28000).',
    };
  }

  let finalPrNumber = extractedPr;
  if (explicitPrNum !== undefined && explicitPrNum !== '') {
    const parsedExplicit =
      typeof explicitPrNum === 'number'
        ? explicitPrNum
        : parseInt(explicitPrNum.toString().trim(), 10);
    if (!isNaN(parsedExplicit) && parsedExplicit > 0) {
      finalPrNumber = parsedExplicit;
    }
  }

  return {
    target: {
      owner,
      repo,
      prNumber: finalPrNumber,
    },
  };
}

export class GitHubClient {
  private token?: string;
  private baseUrl = 'https://api.github.com';

  constructor(token?: string) {
    this.token = token?.trim();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    // User-Agent is a restricted header in browser Fetch API, only set in Node/extension runtime
    if (typeof window === 'undefined') {
      headers['User-Agent'] = 'PR-Sentinel-VSCode-Extension';
    }
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  private formatErrorMessage(
    errorText: string,
    status: number,
    owner: string,
    repository: string,
    pullNumber: number
  ): string {
    let parsedMsg = '';
    try {
      const json = JSON.parse(errorText);
      parsedMsg = json.message || '';
    } catch {
      parsedMsg = errorText;
    }

    if (status === 404) {
      return `PR #${pullNumber} not found on repository ${owner}/${repository} (404 Not Found). Please verify the repo name and PR number. For private repositories, enter a GitHub Personal Access Token.`;
    }
    if (status === 403 || status === 429) {
      return `GitHub API rate limit exceeded or access forbidden (Status ${status}: ${parsedMsg}). Add a GitHub Personal Access Token to get 5,000 requests/hr.`;
    }
    if (status === 401) {
      return `Invalid or expired GitHub Personal Access Token (401 Unauthorized).`;
    }

    return `Failed to fetch PR #${pullNumber} from ${owner}/${repository} (${status}): ${parsedMsg || errorText}`;
  }

  /**
   * Fetches metadata for a GitHub Pull Request
   */
  public async getPullRequest(
    owner: string,
    repository: string,
    pullNumber: number
  ): Promise<PullRequestInfo> {
    const url = `${this.baseUrl}/repos/${owner}/${repository}/pulls/${pullNumber}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        this.formatErrorMessage(errorText, response.status, owner, repository, pullNumber)
      );
    }

    const data = await response.json();
    return {
      owner,
      repository,
      number: data.number,
      title: data.title,
      baseSha: data.base?.sha || '',
      headSha: data.head?.sha || '',
      htmlUrl: data.html_url,
      branchName: data.head?.ref,
      baseBranch: data.base?.ref,
      author: data.user?.login,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Fetches changed files list and patches for a GitHub Pull Request
   */
  public async getPullRequestFiles(
    owner: string,
    repository: string,
    pullNumber: number
  ): Promise<ChangedFile[]> {
    const url = `${this.baseUrl}/repos/${owner}/${repository}/pulls/${pullNumber}/files?per_page=100`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        this.formatErrorMessage(errorText, response.status, owner, repository, pullNumber)
      );
    }

    const files = await response.json();
    return files.map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      sha: f.sha,
      patch: f.patch,
      rawUrl: f.raw_url,
    }));
  }
}
