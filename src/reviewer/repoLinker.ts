import { WorkspaceRepoInfo, PullRequestInfo, ChangedFile } from '../models/types';
import { parseGitUrlOrInput, listRemotePullOrMergeRequests, ParsedGitTarget } from '../git/gitProvider';

/**
 * Repository Linker
 * Links workspace folders and git remotes to remote GitHub / GitLab repositories,
 * fetching live PR/MR metadata, branches, and coordinating file mapping.
 */
export class RepoLinker {
  /**
   * Resolves a Git remote URL into structured WorkspaceRepoInfo
   */
  public static parseRemoteUrl(remoteUrl: string, currentBranch = 'main'): WorkspaceRepoInfo | null {
    const parsed = parseGitUrlOrInput(remoteUrl);
    if (!parsed.target) return null;

    const target = parsed.target;
    return {
      provider: target.provider,
      host: target.host || (target.provider === 'gitlab' ? 'gitlab.com' : 'github.com'),
      owner: target.owner,
      repo: target.repo,
      projectPath: target.projectPath || `${target.owner}/${target.repo}`,
      currentBranch,
      remotes: [{ name: 'origin', url: remoteUrl }],
      isLinked: true,
    };
  }

  /**
   * Fetches open PRs/MRs for the linked repository
   */
  public static async fetchOpenPRs(
    repoInfo: WorkspaceRepoInfo,
    token?: string
  ): Promise<PullRequestInfo[]> {
    const target: ParsedGitTarget = {
      provider: repoInfo.provider,
      typeLabel: repoInfo.provider === 'gitlab' ? 'MR' : 'PR',
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      projectPath: repoInfo.projectPath,
      host: repoInfo.host,
      rawInput: `${repoInfo.owner}/${repoInfo.repo}`,
    };

    return await listRemotePullOrMergeRequests(target, token, 'open');
  }

  /**
   * Finds matching local workspace path for a PR changed file
   */
  public static matchWorkspaceFile(
    changedFile: ChangedFile,
    workspaceFiles: string[]
  ): string | null {
    const cleanName = changedFile.filename.replace(/^\/+/, '');

    // 1. Exact match
    const exact = workspaceFiles.find((f) => f.endsWith(cleanName) || cleanName.endsWith(f));
    if (exact) return exact;

    // 2. Basename match
    const base = cleanName.split('/').pop();
    if (base) {
      const match = workspaceFiles.find((f) => f.endsWith(base));
      if (match) return match;
    }

    return null;
  }
}
