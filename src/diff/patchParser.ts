import { ParsedPatch, PatchHunk } from '../models/types';

/**
 * PatchParser parses Git unified diffs into structured hunks and added/deleted lines
 */
export class PatchParser {
  public parsePatch(filename: string, patchText: string): ParsedPatch {
    const hunks: PatchHunk[] = [];
    const addedLines: { line: number; text: string }[] = [];
    const deletedLines: { line: number; text: string }[] = [];

    if (!patchText) {
      return { filename, hunks, addedLines, deletedLines };
    }

    const lines = patchText.split('\n');
    let currentHunk: PatchHunk | null = null;
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of lines) {
      // Hunk header: @@ -1,5 +1,5 @@
      const hunkHeaderMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunkHeaderMatch) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        oldLineNum = parseInt(hunkHeaderMatch[1], 10);
        newLineNum = parseInt(hunkHeaderMatch[2], 10);
        currentHunk = {
          oldStart: oldLineNum,
          oldLines: 0,
          newStart: newLineNum,
          newLines: 0,
          lines: [],
        };
        continue;
      }

      if (!currentHunk) continue;
      currentHunk.lines.push(line);

      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines.push({ line: newLineNum, text: line.substring(1) });
        newLineNum++;
        currentHunk.newLines++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletedLines.push({ line: oldLineNum, text: line.substring(1) });
        oldLineNum++;
        currentHunk.oldLines++;
      } else {
        oldLineNum++;
        newLineNum++;
        currentHunk.oldLines++;
        currentHunk.newLines++;
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return {
      filename,
      hunks,
      addedLines,
      deletedLines,
    };
  }
}

export function parsePatch(filename: string, patchText: string): ParsedPatch {
  return new PatchParser().parsePatch(filename, patchText);
}

