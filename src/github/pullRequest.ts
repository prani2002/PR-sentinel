import { ChangedFile, ParsedPatch, PatchHunk } from '../models/types';

/**
 * Parses a standard unified git patch from GitHub REST API into structured hunks and added/deleted lines.
 */
export function parsePatch(filename: string, patch?: string): ParsedPatch {
  if (!patch) {
    return {
      filename,
      hunks: [],
      addedLines: [],
      deletedLines: [],
    };
  }

  const lines = patch.split('\n');
  const hunks: PatchHunk[] = [];
  const addedLines: { line: number; text: string }[] = [];
  const deletedLines: { line: number; text: string }[] = [];

  let currentHunk: PatchHunk | null = null;
  let currentOldLine = 0;
  let currentNewLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Example: @@ -1,4 +1,4 @@
      const match = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (match) {
        currentOldLine = parseInt(match[1], 10);
        const oldLinesCount = match[2] ? parseInt(match[2], 10) : 1;
        currentNewLine = parseInt(match[3], 10);
        const newLinesCount = match[4] ? parseInt(match[4], 10) : 1;

        currentHunk = {
          oldStart: currentOldLine,
          oldLines: oldLinesCount,
          newStart: currentNewLine,
          newLines: newLinesCount,
          lines: [],
        };
        hunks.push(currentHunk);
      }
      continue;
    }

    if (currentHunk) {
      currentHunk.lines.push(line);

      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines.push({
          line: currentNewLine,
          text: line.slice(1),
        });
        currentNewLine++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletedLines.push({
          line: currentOldLine,
          text: line.slice(1),
        });
        currentOldLine++;
      } else {
        // Unchanged context line
        currentOldLine++;
        currentNewLine++;
      }
    }
  }

  return {
    filename,
    hunks,
    addedLines,
    deletedLines,
  };
}

/**
 * Parses all changed files in a PR and attaches parsed patch data
 */
export function parseAllChangedFiles(files: ChangedFile[]): Array<{ file: ChangedFile; parsedPatch: ParsedPatch }> {
  return files.map((file) => ({
    file,
    parsedPatch: parsePatch(file.filename, file.patch),
  }));
}

/**
 * Extracts owner and repo from standard git remote URLs (HTTPS or SSH)
 * e.g., "https://github.com/owner/repo.git" or "git@github.com:owner/repo.git"
 */
export function parseGitHubRemoteUrl(remoteUrl: string): { owner: string; repo: string } | null {
  if (!remoteUrl) return null;
  const trimmed = remoteUrl.trim().replace(/\.git$/, '');

  // HTTPS match: https://github.com/owner/repo
  const httpsMatch = trimmed.match(/github\.com\/([^\/]+)\/([^\/]+)$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH match: git@github.com:owner/repo
  const sshMatch = trimmed.match(/github\.com:([^\/]+)\/([^\/]+)$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}
