import { ChangedFile, PullRequestInfo } from '../models/types';

export interface GitLabMergeRequestDiff {
  old_path: string;
  new_path: string;
  a_mode?: string;
  b_mode?: string;
  new_file?: boolean;
  renamed_file?: boolean;
  deleted_file?: boolean;
  diff: string;
}

export interface GitLabMergeRequestResponse {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  web_url: string;
  target_branch: string;
  source_branch: string;
  sha: string;
  diff_refs?: {
    base_sha?: string;
    head_sha?: string;
    start_sha?: string;
  };
  author?: {
    username: string;
    name: string;
  };
  changes?: GitLabMergeRequestDiff[];
}

export interface GitLabTokenValidationResult {
  valid: boolean;
  username?: string;
  name?: string;
  avatarUrl?: string;
  scopes?: string[];
  error?: string;
}

export class GitLabClient {
  private token?: string;
  private baseUrl: string;

  constructor(token?: any, host: string = 'https://gitlab.com') {
    this.token = typeof token === 'string' ? token.trim() : undefined;
    // Normalize host URL
    let cleanHost = (typeof host === 'string' && host ? host : 'https://gitlab.com').trim();
    if (!cleanHost.startsWith('http://') && !cleanHost.startsWith('https://')) {
      cleanHost = `https://${cleanHost}`;
    }
    cleanHost = cleanHost.replace(/\/+$/, '');
    this.baseUrl = `${cleanHost}/api/v4`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.token) {
      // GitLab accepts PRIVATE-TOKEN header or Bearer authorization
      headers['PRIVATE-TOKEN'] = this.token;
    }
    return headers;
  }

  /**
   * Validates a GitLab Personal Access Token against the /user endpoint
   */
  async validateToken(): Promise<GitLabTokenValidationResult> {
    if (!this.token) {
      return { valid: false, error: 'No GitLab Personal Access Token provided.' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 401) {
        return {
          valid: false,
          error: 'Invalid or expired GitLab Personal Access Token (401 Unauthorized).',
        };
      }

      if (response.status === 403) {
        return {
          valid: false,
          error: 'GitLab API token access forbidden or insufficient scopes.',
        };
      }

      if (!response.ok) {
        return {
          valid: false,
          error: `GitLab API returned status ${response.status}: ${response.statusText}`,
        };
      }

      const userData = await response.json();
      return {
        valid: true,
        username: userData.username,
        name: userData.name,
        avatarUrl: userData.avatar_url,
        scopes: ['api', 'read_api', 'read_repository'],
      };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || 'Network error while communicating with GitLab API.',
      };
    }
  }

  private formatErrorMessage(
    errorText: string,
    status: number,
    projectPath: string,
    mrIid: number
  ): string {
    let parsedMsg = '';
    try {
      const json = JSON.parse(errorText);
      parsedMsg = json.message || json.error || '';
    } catch {
      parsedMsg = errorText;
    }

    if (status === 404) {
      if (this.token) {
        return `GitLab MR !${mrIid} or project "${projectPath}" was not found (404 Not Found). Please verify the project path and MR IID, and check if your GitLab token has "read_api" and "read_repository" scopes.`;
      }
      return `GitLab MR !${mrIid} not found on project "${projectPath}" (404 Not Found). If this is a private project, please enter and validate a GitLab Personal Access Token (glpat-...) below.`;
    }
    if (status === 403 || status === 429) {
      return `GitLab API rate limit exceeded or access forbidden (Status ${status}: ${parsedMsg}). Add or validate a GitLab Personal Access Token (glpat-...).`;
    }
    if (status === 401) {
      return `Invalid or unauthorized GitLab Personal Access Token (401 Unauthorized). Please check and re-validate your token.`;
    }

    return `Failed to fetch GitLab MR !${mrIid} from "${projectPath}" (${status}): ${parsedMsg || errorText}`;
  }

  /**
   * Fetches metadata for a GitLab Merge Request
   */
  async getMergeRequest(projectPath: string, mrIid: number): Promise<PullRequestInfo> {
    // GitLab requires URL-encoding the project path (e.g. gitlab-org/gitlab -> gitlab-org%2Fgitlab)
    const encodedProject = encodeURIComponent(projectPath.trim());
    const url = `${this.baseUrl}/projects/${encodedProject}/merge_requests/${mrIid}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(this.formatErrorMessage(errorText, response.status, projectPath, mrIid));
    }

    const data: GitLabMergeRequestResponse = await response.json();

    const parts = projectPath.split('/');
    const repo = parts.pop() || projectPath;
    const owner = parts.join('/') || 'gitlab';

    return {
      provider: 'gitlab',
      typeLabel: 'MR',
      owner,
      repository: repo,
      number: data.iid,
      title: data.title,
      baseSha: data.diff_refs?.base_sha || data.diff_refs?.start_sha || 'base',
      headSha: data.diff_refs?.head_sha || data.sha || 'head',
      htmlUrl: data.web_url,
      branchName: data.source_branch,
      baseBranch: data.target_branch,
      author: data.author?.username || data.author?.name || 'gitlab-user',
      updatedAt: data.updated_at || data.created_at,
    };
  }

  /**
   * Fetches changed files & diffs for a GitLab Merge Request
   */
  async getMergeRequestChanges(projectPath: string, mrIid: number): Promise<ChangedFile[]> {
    const encodedProject = encodeURIComponent(projectPath.trim());
    const url = `${this.baseUrl}/projects/${encodedProject}/merge_requests/${mrIid}/changes`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(this.formatErrorMessage(errorText, response.status, projectPath, mrIid));
    }

    const data: GitLabMergeRequestResponse = await response.json();
    const rawChanges: GitLabMergeRequestDiff[] = data.changes || [];

    return rawChanges.map((change) => {
      const patch = change.diff || '';
      let additions = 0;
      let deletions = 0;

      // Count additions and deletions from diff
      if (patch) {
        const lines = patch.split('\n');
        for (const line of lines) {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++;
          }
        }
      }

      let status = 'modified';
      if (change.new_file) status = 'added';
      else if (change.deleted_file) status = 'deleted';
      else if (change.renamed_file) status = 'renamed';

      return {
        filename: change.new_path || change.old_path,
        status,
        additions,
        deletions,
        changes: additions + deletions,
        sha: data.diff_refs?.head_sha || data.sha || 'gitlab-sha',
        patch,
      };
    });
  }
}
