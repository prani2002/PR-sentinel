import { ChangedFile, PullRequestInfo } from '../models/types';

export class GitHubClient {
  private token?: string;
  private baseUrl = 'https://api.github.com';

  constructor(token?: string) {
    this.token = token;
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
        `Failed to fetch PR #${pullNumber} from ${owner}/${repository} (${response.status}: ${response.statusText}): ${errorText}`
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
        `Failed to fetch files for PR #${pullNumber} (${response.status}: ${response.statusText}): ${errorText}`
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
