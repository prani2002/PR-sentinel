import { ChangedFile, PullRequestInfo } from '../models/types';

export interface ParsedGitHubTarget {
  owner: string;
  repo: string;
  prNumber?: number;
}

export interface TokenValidationResult {
  valid: boolean;
  username?: string;
  name?: string;
  avatarUrl?: string;
  scopes?: string[];
  rateLimitRemaining?: number;
  rateLimitLimit?: number;
  error?: string;
}

/**
 * Robust parser supporting:
 * - https://github.com/facebook/react/pull/28000
 * - github.com/facebook/react/pull/28000
 * - facebook/react/pull/28000
 * - https://github.com/facebook/react
 * - facebook/react
 * - git@github.com:facebook/react.git
 * - Single slash typos like https:/github.com/...
 */
export function parseGitHubInput(
  input: string,
  explicitPrNum?: string | number
): { target?: ParsedGitHubTarget; error?: string } {
  let cleaned = (input || '').trim();
  if (!cleaned) {
    return { error: 'Please enter a GitHub repository (e.g. facebook/react) or PR URL.' };
  }

  // Robust protocol and prefix stripping (handles https://, http://, https:/, git@github.com:, etc.)
  cleaned = cleaned.replace(/^git@github\.com:/i, '');
  cleaned = cleaned.replace(/^https?:\/+/i, '');
  cleaned = cleaned.replace(/^ssh:\/+/i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.replace(/^github\.com\//i, '');
  cleaned = cleaned.replace(/^api\.github\.com\/repos\//i, '');

  // Strip query parameters and anchor hashes
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

  // Filter out any segment that contains protocol artifacts or invalid characters
  const validSegments = segments.filter((seg) => !seg.includes(':') && !seg.includes('@') && seg !== 'https' && seg !== 'http');

  if (validSegments.length === 0) {
    return {
      error: 'Please enter a valid GitHub repository (e.g. owner/repo) or PR URL (e.g. https://github.com/owner/repo/pull/123).',
    };
  }

  let owner = '';
  let repo = '';

  if (validSegments.length >= 2) {
    owner = validSegments[0];
    repo = validSegments[1].replace(/\.git$/i, '');

    // Check if URL has /pull/123 or /pulls/123
    const pullIdx = validSegments.findIndex(
      (s) => s.toLowerCase() === 'pull' || s.toLowerCase() === 'pulls'
    );
    if (pullIdx !== -1 && validSegments[pullIdx + 1]) {
      const parsedNum = parseInt(validSegments[pullIdx + 1], 10);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        extractedPr = parsedNum;
      }
    }
  } else if (validSegments.length === 1) {
    return {
      error: `Incomplete repository name "${validSegments[0]}". Please provide both owner and repo (e.g. facebook/react).`,
    };
  }

  // Sanity check owner and repo
  const validNameRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!owner || !repo || !validNameRegex.test(owner) || !validNameRegex.test(repo)) {
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

  /**
   * Validates a GitHub Personal Access Token against the /user endpoint
   */
  public async validateToken(): Promise<TokenValidationResult> {
    if (!this.token) {
      return { valid: false, error: 'No Personal Access Token provided.' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const scopesHeader = response.headers.get('x-oauth-scopes') || '';
      const scopes = scopesHeader
        ? scopesHeader.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining') || '', 10);
      const rateLimitLimit = parseInt(response.headers.get('x-ratelimit-limit') || '', 10);

      if (response.status === 401) {
        return {
          valid: false,
          error: 'Invalid or expired GitHub Personal Access Token (401 Unauthorized). Please check your token.',
        };
      }

      if (response.status === 403) {
        const errorText = await response.text();
        return {
          valid: false,
          error: `GitHub API access forbidden (403): ${errorText}`,
        };
      }

      if (!response.ok) {
        return {
          valid: false,
          error: `GitHub API error (${response.status}): ${response.statusText}`,
        };
      }

      const userData = await response.json();
      return {
        valid: true,
        username: userData.login,
        name: userData.name,
        avatarUrl: userData.avatar_url,
        scopes,
        rateLimitRemaining: isNaN(rateLimitRemaining) ? undefined : rateLimitRemaining,
        rateLimitLimit: isNaN(rateLimitLimit) ? undefined : rateLimitLimit,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || 'Network error while communicating with GitHub API.',
      };
    }
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
      if (this.token) {
        return `PR #${pullNumber} or repository "${owner}/${repository}" was not found (404 Not Found). Please verify the repo name and PR number, and ensure your Personal Access Token has the "repo" scope to read private repositories.`;
      }
      return `PR #${pullNumber} not found on repository "${owner}/${repository}" (404 Not Found). If this is a private repository, please enter and validate a GitHub Personal Access Token (PAT) with "repo" scope below.`;
    }
    if (status === 403 || status === 429) {
      return `GitHub API rate limit exceeded or access forbidden (Status ${status}: ${parsedMsg}). Add or validate a GitHub Personal Access Token to get 5,000 requests/hr.`;
    }
    if (status === 401) {
      return `Invalid or expired GitHub Personal Access Token (401 Unauthorized). Please check and re-validate your token.`;
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
      provider: 'github',
      typeLabel: 'PR',
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
