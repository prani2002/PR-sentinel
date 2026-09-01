import { GitHubClient, TokenValidationResult as GitHubValidationResult } from '../github/githubClient';
import { GitLabClient, GitLabTokenValidationResult } from '../gitlab/gitlabClient';
import { ChangedFile, PullRequestInfo } from '../models/types';

export type GitProviderType = 'github' | 'gitlab';

export interface ParsedGitTarget {
  provider: GitProviderType;
  host: string;
  owner: string;
  repo: string;
  projectPath: string; // for GitLab (e.g. group/subgroup/project)
  number?: number;
  typeLabel: 'PR' | 'MR';
  rawInput: string;
}

export interface UniversalTokenValidationResult {
  valid: boolean;
  provider: GitProviderType;
  username?: string;
  name?: string;
  avatarUrl?: string;
  scopes?: string[];
  rateLimitRemaining?: number;
  rateLimitLimit?: number;
  rateLimit?: {
    remaining: number;
    limit: number;
  };
  error?: string;
}

/**
 * Universal URL & Input parser that automatically detects GitHub vs GitLab
 * Supporting:
 * GitHub:
 *   - https://github.com/facebook/react/pull/28000
 *   - github.com/facebook/react/pull/28000
 *   - facebook/react#28000
 *   - facebook/react with explicit PR number
 *   - git@github.com:facebook/react.git
 *   - https:/github.com/facebook/react/pull/28000 (resilient to single slash typos)
 *
 * GitLab:
 *   - https://gitlab.com/gitlab-org/gitlab/-/merge_requests/120000
 *   - https://gitlab.com/group/subgroup/project/merge_requests/42
 *   - gitlab.com/gitlab-org/gitlab-runner/-/merge_requests/4500
 *   - gitlab-org/gitlab!120000
 *   - gitlab-org/gitlab with explicit MR number
 *   - https://self-hosted-gitlab.com/org/repo/-/merge_requests/10
 */
export function parseGitUrlOrInput(
  input: string,
  explicitNumber?: string | number,
  forcedProvider?: GitProviderType
): { target?: ParsedGitTarget; error?: string } {
  let cleaned = (input || '').trim();
  if (!cleaned) {
    return {
      error: 'Please enter a GitHub PR URL (github.com/...) or GitLab MR URL (gitlab.com/...) or repository path.',
    };
  }

  let host = '';
  let provider: GitProviderType = forcedProvider || 'github';

  // Check and extract host if valid standard URL
  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const parsedUrl = new URL(cleaned);
      host = parsedUrl.hostname.toLowerCase();
      cleaned = parsedUrl.pathname + (parsedUrl.hash || '');
    } catch {
      // Handled by regex cleaning below
    }
  }

  // Strip git@, ssh://, http://, https://, http:/, https:/
  cleaned = cleaned.replace(/^git@[^:]+:/i, '');
  cleaned = cleaned.replace(/^ssh:\/+/i, '');
  cleaned = cleaned.replace(/^https?:\/+/i, '');
  cleaned = cleaned.replace(/^www\./i, '');

  // Detect provider and domain
  if (host.includes('gitlab') || cleaned.startsWith('gitlab.com/') || cleaned.startsWith('gitlab.com')) {
    provider = 'gitlab';
    if (!host) host = 'gitlab.com';
    cleaned = cleaned.replace(/^gitlab\.com\/?/i, '');
  } else if (host.includes('github') || cleaned.startsWith('github.com/') || cleaned.startsWith('github.com')) {
    provider = 'github';
    if (!host) host = 'github.com';
    cleaned = cleaned.replace(/^github\.com\/?/i, '');
  } else if (cleaned.includes('/merge_requests/') || cleaned.includes('/-/merge_requests/') || cleaned.includes('!')) {
    provider = 'gitlab';
    if (!host) host = 'gitlab.com';
  } else if (cleaned.includes('/pull/') || cleaned.includes('/pulls/') || cleaned.includes('#')) {
    provider = 'github';
    if (!host) host = 'github.com';
  } else if (forcedProvider) {
    provider = forcedProvider;
    if (!host) host = forcedProvider === 'gitlab' ? 'gitlab.com' : 'github.com';
  } else {
    // Default host if not specified
    host = 'github.com';
  }

  // Clean api.github.com/repos/ prefix if user pasted direct API endpoint
  cleaned = cleaned.replace(/^api\.github\.com\/repos\//i, '');
  cleaned = cleaned.replace(/^api\/v4\/projects\//i, '');

  // Strip query parameters
  cleaned = cleaned.split('?')[0];

  let extractedNumber: number | undefined;

  // Handle #123 (GitHub PR) or !123 (GitLab MR)
  if (cleaned.includes('#')) {
    const parts = cleaned.split('#');
    cleaned = parts[0];
    const n = parseInt(parts[1], 10);
    if (!isNaN(n) && n > 0) extractedNumber = n;
    provider = 'github';
  } else if (cleaned.includes('!')) {
    const parts = cleaned.split('!');
    cleaned = parts[0];
    const n = parseInt(parts[1], 10);
    if (!isNaN(n) && n > 0) extractedNumber = n;
    provider = 'gitlab';
  }

  // Remove trailing and leading slashes
  cleaned = cleaned.replace(/^\/+|\/+$/g, '');

  let owner = '';
  let repo = '';
  let projectPath = '';

  if (provider === 'gitlab') {
    // GitLab URL patterns:
    // 1) .../-/merge_requests/123
    // 2) .../merge_requests/123
    const mrRegex = /(?:^|\/)(.+?)(?:\/-\/merge_requests\/|\/merge_requests\/)(\d+)/i;
    const mrMatch = cleaned.match(mrRegex);
    if (mrMatch) {
      projectPath = mrMatch[1].replace(/\/-\/?$/, '').replace(/^\/+|\/+$/g, '');
      extractedNumber = parseInt(mrMatch[2], 10);
    } else {
      projectPath = cleaned.replace(/\/-\/?$/, '').replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '');
    }

    const segments = projectPath
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !s.includes(':') && !s.includes('@') && s !== 'https' && s !== 'http' && s !== '-');

    if (segments.length < 1) {
      return {
        error: 'Invalid GitLab project path. Example: gitlab-org/gitlab or https://gitlab.com/gitlab-org/gitlab/-/merge_requests/120000',
      };
    }

    const validSegmentRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!segments.every((s) => validSegmentRegex.test(s))) {
      return {
        error: 'Invalid characters in GitLab project path. Segments must contain only alphanumeric characters, dots, underscores, or hyphens.',
      };
    }

    repo = segments[segments.length - 1];
    owner = segments.slice(0, -1).join('/') || segments[0];
    projectPath = segments.join('/');
  } else {
    // GitHub URL pattern: owner/repo/pull/123
    const prRegex = /(?:^|\/)(.+?)\/(.+?)\/pull(?:s)?\/(\d+)/i;
    const prMatch = cleaned.match(prRegex);
    if (prMatch) {
      owner = prMatch[1];
      repo = prMatch[2].replace(/\.git$/i, '');
      extractedNumber = parseInt(prMatch[3], 10);
    } else {
      const segments = cleaned.split('/').filter(Boolean).filter((s) => !s.includes(':') && !s.includes('@') && s !== 'https' && s !== 'http');
      if (segments.length >= 2) {
        owner = segments[0];
        repo = segments[1].replace(/\.git$/i, '');
      } else if (segments.length === 1) {
        return {
          error: `Incomplete repository name "${segments[0]}". Please specify in owner/repo format (e.g. facebook/react).`,
        };
      }
    }

    const validSegmentRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!owner || !repo || !validSegmentRegex.test(owner) || !validSegmentRegex.test(repo)) {
      return {
        error: 'Invalid repository or PR format. Please provide a valid GitHub PR URL (e.g. github.com/owner/repo/pull/123) or owner/repo path.',
      };
    }

    projectPath = `${owner}/${repo}`;
  }

  if (explicitNumber !== undefined && explicitNumber !== '') {
    const parsedNum = typeof explicitNumber === 'number' ? explicitNumber : parseInt(explicitNumber.toString().trim(), 10);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      extractedNumber = parsedNum;
    }
  }

  return {
    target: {
      provider,
      host: host || (provider === 'gitlab' ? 'gitlab.com' : 'github.com'),
      owner,
      repo,
      projectPath: projectPath || `${owner}/${repo}`,
      number: extractedNumber,
      typeLabel: provider === 'gitlab' ? 'MR' : 'PR',
      rawInput: input,
    },
  };
}

/**
 * Validates a Personal Access Token with the target Git Provider
 */
export async function validateRemoteToken(
  provider: GitProviderType,
  token: string,
  host?: string
): Promise<UniversalTokenValidationResult> {
  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return { valid: false, provider, error: 'Please enter a Personal Access Token.' };
  }

  if (provider === 'gitlab') {
    const hostUrl = host ? `https://${host}` : 'https://gitlab.com';
    const client = new GitLabClient(cleanToken, hostUrl);
    const result = await client.validateToken();
    return {
      valid: result.valid,
      provider: 'gitlab',
      username: result.username,
      name: result.name,
      avatarUrl: result.avatarUrl,
      scopes: result.scopes,
      error: result.error,
    };
  } else {
    const client = new GitHubClient(cleanToken);
    const result = await client.validateToken();
    return {
      valid: result.valid,
      provider: 'github',
      username: result.username,
      name: result.name,
      avatarUrl: result.avatarUrl,
      scopes: result.scopes,
      rateLimitRemaining: result.rateLimitRemaining,
      rateLimitLimit: result.rateLimitLimit,
      rateLimit:
        result.rateLimitRemaining !== undefined && result.rateLimitLimit !== undefined
          ? { remaining: result.rateLimitRemaining, limit: result.rateLimitLimit }
          : undefined,
      error: result.error,
    };
  }
}

/**
 * Universal Fetcher that routes dynamically to either GitHub REST API or GitLab REST API v4
 */
export async function fetchRemotePullOrMergeRequest(
  target: ParsedGitTarget,
  tokenOrNumber?: string | number,
  optionalToken?: string
): Promise<{ prInfo: PullRequestInfo; changedFiles: ChangedFile[] }> {
  let prNumber = target.number;
  let token: string | undefined;

  if (typeof tokenOrNumber === 'number') {
    prNumber = tokenOrNumber;
    token = typeof optionalToken === 'string' ? optionalToken.trim() : undefined;
  } else if (typeof tokenOrNumber === 'string') {
    token = tokenOrNumber.trim();
  }

  if (!prNumber || prNumber <= 0) {
    throw new Error(`Please provide a valid ${target.typeLabel} number.`);
  }

  if (target.provider === 'gitlab') {
    const hostUrl = target.host ? `https://${target.host}` : 'https://gitlab.com';
    const client = new GitLabClient(token, hostUrl);
    const prInfo = await client.getMergeRequest(target.projectPath, prNumber);
    const changedFiles = await client.getMergeRequestChanges(target.projectPath, prNumber);

    return { prInfo, changedFiles };
  } else {
    const client = new GitHubClient(token);
    const prInfo = await client.getPullRequest(target.owner, target.repo, prNumber);
    const changedFiles = await client.getPullRequestFiles(target.owner, target.repo, prNumber);

    return { prInfo, changedFiles };
  }
}
