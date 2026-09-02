import * as vscode from 'vscode';
import { Finding, PullRequestInfo, ChangedFile, PRReviewReport, ReviewItem } from '../models/types';
import { CodeReviewer } from '../reviewer/codeReviewer';

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates the full HTML for the PR Sentinel Reviewer & Blast Radius Dashboard
 */
export function getBlastRadiusHtml(
  findings: Finding[] = [],
  prInfo?: PullRequestInfo,
  changedFiles: ChangedFile[] = [],
  reviewReport?: PRReviewReport,
  webview?: vscode.Webview
): string {
  const nonce = getNonce();
  const cspSource = webview ? webview.cspSource : '*';
  const isInitialState = !prInfo && findings.length === 0 && changedFiles.length === 0;

  // If no review report is provided and not initial state, run reviewer synchronously
  const effectiveReport: PRReviewReport | null = isInitialState
    ? null
    : reviewReport ||
      new CodeReviewer().reviewPullRequest(
        prInfo || {
          owner: 'workspace',
          repository: 'repo',
          number: 1,
          title: 'PR Analysis',
          baseSha: 'base',
          headSha: 'head',
        },
        changedFiles,
        findings
      );

  const serializedFindings = JSON.stringify(findings);
  const serializedPrInfo = JSON.stringify(prInfo || null);
  const serializedChangedFiles = JSON.stringify(changedFiles);
  const serializedReport = JSON.stringify(effectiveReport);

  // Pre-rendered HTML for instant display before client JS runs
  let preRenderedHtml = '';
  if (isInitialState) {
    preRenderedHtml = `
      <div class="welcome-container">
        <div class="welcome-header">
          <div class="welcome-logo">🛡️</div>
          <h2 class="welcome-title">PR Sentinel</h2>
          <p class="welcome-subtitle">Senior Staff PR Code Reviewer & AST Blast Radius Detector</p>
        </div>

        <div class="quick-actions">
          <button class="btn btn-primary" id="btn-quick-analyze">
            🚀 Analyze Pull / Merge Request
          </button>
          <button class="btn btn-outline" id="btn-quick-link">
            🔗 Link Workspace Repo & Browse PRs
          </button>
          <button class="btn btn-outline" id="btn-quick-token">
            🔑 Configure Access Token (PAT)
          </button>
        </div>

        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-title">💥 AST Breaking Change Detection</div>
            <div class="feature-desc">Analyzes TypeScript/JavaScript ASTs to identify deleted enum members, modified schema contracts, and broken consumer call sites before merge.</div>
          </div>
          <div class="feature-card">
            <div class="feature-title">🧑‍💻 Staff-Level Code Reviews</div>
            <div class="feature-desc">Comprehensive dimensional reviews across Architecture, Security, Performance, and Resilience with overall Health Scoring (0–100).</div>
          </div>
          <div class="feature-card">
            <div class="feature-title">⚖️ Good vs. Bad Fix Comparisons</div>
            <div class="feature-desc">Highlights suboptimal band-aid fixes (why they fail) alongside production-ready replacements (why they are optimal).</div>
          </div>
          <div class="feature-card">
            <div class="feature-title">🛠️ One-Click Fix Insertion</div>
            <div class="feature-desc">Directly patches workspace files with type-safe, backward-compatible fixes with a single click.</div>
          </div>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>PR Sentinel - Senior Code Reviewer & Blast Radius</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #0b0f17);
      --sidebar-bg: var(--vscode-sideBar-background, #111827);
      --fg: var(--vscode-editor-foreground, #f3f4f6);
      --muted: var(--vscode-descriptionForeground, #9ca3af);
      --border: var(--vscode-panel-border, #1f2937);
      --accent: var(--vscode-button-background, #2563eb);
      --accent-hover: var(--vscode-button-hoverBackground, #1d4ed8);
      --card-bg: var(--vscode-editorWidget-background, rgba(17, 24, 39, 0.7));
      --card-sub-bg: rgba(0, 0, 0, 0.25);
      --red: #ef4444;
      --orange: #f97316;
      --green: #10b981;
      --yellow: #f59e0b;
      --blue: #3b82f6;
      --purple: #8b5cf6;
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--fg);
      background-color: var(--bg);
      margin: 0;
      padding: 14px;
      line-height: 1.5;
    }
    .welcome-container {
      padding: 8px 4px;
    }
    .welcome-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .welcome-logo {
      font-size: 36px;
      margin-bottom: 8px;
    }
    .welcome-title {
      font-size: 18px;
      font-weight: 800;
      color: #fff;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }
    .welcome-subtitle {
      font-size: 12px;
      color: var(--muted);
      margin: 0;
      line-height: 1.4;
    }
    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    .feature-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .feature-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
    }
    .feature-title {
      font-size: 12px;
      font-weight: 700;
      color: #93c5fd;
      margin-bottom: 4px;
    }
    .feature-desc {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.4;
    }
    .header-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .pr-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .pr-title {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.3;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .badge-approve {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .badge-changes {
      background: rgba(249, 115, 22, 0.15);
      color: #fb923c;
      border: 1px solid rgba(249, 115, 22, 0.4);
    }
    .badge-critical {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .score-banner {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
    .score-card {
      background: var(--card-sub-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 6px;
      text-align: center;
    }
    .score-card .val {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
    }
    .score-card .lbl {
      font-size: 9px;
      color: var(--muted);
      text-transform: uppercase;
      font-weight: 700;
      margin-top: 2px;
    }
    .tabs-nav {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 14px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--muted);
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: var(--fg);
    }
    .tab-btn.active {
      color: #60a5fa;
      border-bottom-color: #3b82f6;
    }
    .pill {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 9999px;
      padding: 1px 6px;
      font-size: 10px;
    }
    .review-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .review-header {
      background: rgba(0, 0, 0, 0.2);
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .review-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    .review-body {
      padding: 14px;
    }
    .critique-box {
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--fg);
      margin-bottom: 12px;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    @media (min-width: 600px) {
      .comparison-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .fix-box {
      border-radius: 6px;
      padding: 12px;
      font-size: 11.5px;
      border: 1px solid;
    }
    .fix-box-bad {
      background: rgba(239, 68, 68, 0.05);
      border-color: rgba(239, 68, 68, 0.25);
    }
    .fix-box-good {
      background: rgba(16, 185, 129, 0.05);
      border-color: rgba(16, 185, 129, 0.25);
    }
    .fix-title {
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .fix-box-bad .fix-title { color: #f87171; }
    .fix-box-good .fix-title { color: #34d399; }
    pre {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 8px 10px;
      font-family: var(--vscode-editor-font-family, Consolas, 'Courier New', monospace);
      font-size: 11px;
      overflow-x: auto;
      margin: 6px 0;
      color: #e5e7eb;
    }
    .fix-why {
      font-size: 11px;
      color: var(--muted);
      margin-top: 8px;
      line-height: 1.4;
    }
    .btn {
      background: var(--accent);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s;
      width: 100%;
    }
    .btn:hover {
      background: var(--accent-hover);
    }
    .btn-primary {
      background: #2563eb;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--fg);
    }
    .btn-outline:hover {
      background: rgba(255,255,255,0.06);
      border-color: #3b82f6;
    }
    .btn-apply {
      background: #059669;
      width: auto;
    }
    .btn-apply:hover {
      background: #047857;
    }
    .file-link {
      color: #60a5fa;
      text-decoration: underline;
      cursor: pointer;
      font-family: monospace;
    }
    .file-link:hover {
      color: #93c5fd;
    }
    .empty-state {
      text-align: center;
      padding: 30px 16px;
      color: var(--muted);
    }
    .file-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      cursor: pointer;
    }
    .file-item:hover {
      border-color: #3b82f6;
    }
  </style>
</head>
<body>
  <div id="app">${preRenderedHtml}</div>

  <script nonce="${nonce}">
    (function() {
      var vscode = null;
      try {
        vscode = acquireVsCodeApi();
      } catch (e) {
        console.warn('VS Code API already acquired or not in VS Code context');
      }

      var state = {
        findings: ${serializedFindings},
        prInfo: ${serializedPrInfo},
        changedFiles: ${serializedChangedFiles},
        report: ${serializedReport},
        activeTab: 'review'
      };

      function render() {
        var app = document.getElementById('app');
        if (!app) return;

        var isInit = !state.prInfo && (!state.findings || state.findings.length === 0) && (!state.changedFiles || state.changedFiles.length === 0);

        if (isInit) {
          app.innerHTML = \`
            <div class="welcome-container">
              <div class="welcome-header">
                <div class="welcome-logo">🛡️</div>
                <h2 class="welcome-title">PR Sentinel</h2>
                <p class="welcome-subtitle">Senior Staff PR Code Reviewer & AST Blast Radius Detector</p>
              </div>

              <div class="quick-actions">
                <button class="btn btn-primary" id="btn-quick-analyze">
                  🚀 Analyze Pull / Merge Request
                </button>
                <button class="btn btn-outline" id="btn-quick-link">
                  🔗 Link Workspace Repo & Browse PRs
                </button>
                <button class="btn btn-outline" id="btn-quick-token">
                  🔑 Configure Access Token (PAT)
                </button>
              </div>

              <div class="feature-grid">
                <div class="feature-card">
                  <div class="feature-title">💥 AST Breaking Change Detection</div>
                  <div class="feature-desc">Analyzes TypeScript/JavaScript ASTs to identify deleted enum members, modified schema contracts, and broken consumer call sites before merge.</div>
                </div>
                <div class="feature-card">
                  <div class="feature-title">🧑‍💻 Staff-Level Code Reviews</div>
                  <div class="feature-desc">Comprehensive dimensional reviews across Architecture, Security, Performance, and Resilience with overall Health Scoring (0–100).</div>
                </div>
                <div class="feature-card">
                  <div class="feature-title">⚖️ Good vs. Bad Fix Comparisons</div>
                  <div class="feature-desc">Highlights suboptimal band-aid fixes (why they fail) alongside production-ready replacements (why they are optimal).</div>
                </div>
                <div class="feature-card">
                  <div class="feature-title">🛠️ One-Click Fix Insertion</div>
                  <div class="feature-desc">Directly patches workspace files with type-safe, backward-compatible fixes with a single click.</div>
                </div>
              </div>
            </div>
          \`;
          bindWelcomeActions();
          return;
        }

        var pr = state.prInfo || (state.report && state.report.pr) || {
          owner: 'Workspace',
          repository: 'Repository',
          number: 0,
          title: 'PR Review & Blast Radius'
        };

        var report = state.report;
        var items = (report && report.items) || [];
        var files = state.changedFiles || [];
        var findings = state.findings || [];

        var verdictBadge = '';
        if (report && report.verdict === 'APPROVE') {
          verdictBadge = '<span class="badge badge-approve">✅ Approved</span>';
        } else if (report && report.verdict === 'REQUEST_CHANGES') {
          verdictBadge = '<span class="badge badge-changes">⚠️ Changes Requested</span>';
        } else if (report && report.verdict === 'CRITICAL_RISK') {
          verdictBadge = '<span class="badge badge-critical">🛑 Critical Risk</span>';
        } else {
          verdictBadge = '<span class="badge badge-changes">💬 Needs Discussion</span>';
        }

        var html = '';

        // 1. Header Card
        html += '<div class="header-card">';
        html += '  <div class="pr-title-row">';
        html += '    <div class="pr-title">' + (pr.typeLabel || 'PR') + ' #' + pr.number + ': ' + escapeHtml(pr.title || 'Untitled') + '</div>';
        html += '    <div>' + verdictBadge + '</div>';
        html += '  </div>';
        html += '  <div style="font-size:12px; color:var(--muted); margin-bottom: 6px;">';
        html += '    Repository: <strong>' + escapeHtml(pr.owner + '/' + pr.repository) + '</strong> &bull; Author: @' + escapeHtml(pr.author || 'contributor');
        html += '  </div>';

        // Scorecard
        if (report && report.breakdown) {
          html += '<div class="score-banner">';
          html += '  <div class="score-card"><div class="val" style="color:#60a5fa;">' + report.overallScore + '/100</div><div class="lbl">Overall</div></div>';
          html += '  <div class="score-card"><div class="val" style="color:' + (report.breakdown.architectureScore >= 80 ? '#34d399':'#f87171') + '">' + report.breakdown.architectureScore + '</div><div class="lbl">Arch</div></div>';
          html += '  <div class="score-card"><div class="val" style="color:' + (report.breakdown.securityScore >= 90 ? '#34d399':'#f87171') + '">' + report.breakdown.securityScore + '</div><div class="lbl">Sec</div></div>';
          html += '  <div class="score-card"><div class="val" style="color:' + (report.breakdown.performanceScore >= 80 ? '#34d399':'#fb923c') + '">' + report.breakdown.performanceScore + '</div><div class="lbl">Perf</div></div>';
          html += '  <div class="score-card"><div class="val" style="color:' + (report.breakdown.compatibilityScore >= 90 ? '#34d399':'#f87171') + '">' + report.breakdown.compatibilityScore + '</div><div class="lbl">Compat</div></div>';
          html += '</div>';
        }

        html += '</div>'; // header-card

        // 2. Action Bar
        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">';
        html += '  <div style="display:flex; gap:6px; flex:1;">';
        html += '    <button class="btn btn-outline" id="btn-reanalyze" style="width:auto; font-size:11px; padding:5px 10px;">🔄 Re-Analyze</button>';
        html += '    <button class="btn btn-outline" id="btn-linkrepo" style="width:auto; font-size:11px; padding:5px 10px;">🔗 Link Repo</button>';
        html += '  </div>';
        html += '  <button class="btn btn-primary" id="btn-copy-review" style="width:auto; font-size:11px; padding:5px 10px;">📋 Copy Review</button>';
        html += '</div>';

        // 3. Navigation Tabs
        html += '<div class="tabs-nav">';
        html += '  <button class="tab-btn ' + (state.activeTab === 'review' ? 'active' : '') + '" onclick="setTab(\'review\')">🧑‍💻 Review <span class="pill">' + items.length + '</span></button>';
        html += '  <button class="tab-btn ' + (state.activeTab === 'blast' ? 'active' : '') + '" onclick="setTab(\'blast\')">💥 Blast Radius <span class="pill">' + findings.length + '</span></button>';
        html += '  <button class="tab-btn ' + (state.activeTab === 'files' ? 'active' : '') + '" onclick="setTab(\'files\')">📁 Files <span class="pill">' + files.length + '</span></button>';
        html += '</div>';

        // 4. Tab Content
        if (state.activeTab === 'review') {
          if (items.length === 0) {
            html += '<div class="empty-state">';
            html += '  <div style="font-size:32px; margin-bottom:8px;">✨</div>';
            html += '  <h3 style="color:#fff; margin-bottom:4px;">No Code Defects or Breaking Changes</h3>';
            html += '  <p>The analyzed PR conforms to production-grade quality, security, and TypeScript AST compatibility.</p>';
            html += '</div>';
          } else {
            items.forEach(function(item, idx) {
              var sevBadge = item.severity === 'critical' ? '<span class="badge badge-critical">Critical</span>' :
                             item.severity === 'high' ? '<span class="badge badge-critical">High</span>' :
                             item.severity === 'medium' ? '<span class="badge badge-changes">Medium</span>' :
                             '<span class="badge badge-approve">Low</span>';

              html += '<div class="review-card">';
              html += '  <div class="review-header">';
              html += '    <div class="review-header-left">';
              html += '      ' + sevBadge;
              html += '      <strong style="color:#fff; font-size:12px;">' + (idx + 1) + '. ' + escapeHtml(item.title) + '</strong>';
              html += '    </div>';
              html += '    <div style="font-size:11px;">';
              html += '      <span class="file-link" onclick="openFile(\'' + escapeHtml(item.file) + '\', ' + item.line + ')">' + escapeHtml(item.file) + ':' + item.line + '</span>';
              html += '    </div>';
              html += '  </div>';

              html += '  <div class="review-body">';
              html += '    <div class="critique-box">' + escapeHtml(item.critique) + '</div>';

              if (item.codeSnippet) {
                html += '    <div style="font-size:10px; color:var(--muted); font-weight:700; margin-bottom:2px;">CURRENT PR CODE:</div>';
                html += '    <pre>' + escapeHtml(item.codeSnippet) + '</pre>';
              }

              // Side-by-side comparison
              if (item.fixComparison) {
                html += '    <div class="comparison-grid">';
                html += '      <div class="fix-box fix-box-bad">';
                html += '        <div class="fix-title">❌ Suboptimal / Bad Fix (Avoid)</div>';
                html += '        <pre>' + escapeHtml(item.fixComparison.badFixSnippet) + '</pre>';
                html += '        <div class="fix-why"><strong>Why it fails:</strong> ' + escapeHtml(item.fixComparison.badFixWhy) + '</div>';
                html += '      </div>';

                html += '      <div class="fix-box fix-box-good">';
                html += '        <div class="fix-title">';
                html += '          <span>✅ Recommended Best Replacement</span>';
                html += '          <button class="btn btn-apply" style="font-size:10px; padding:2px 6px;" onclick="applyFix(\'' + escapeHtml(item.file) + '\', ' + item.line + ', ' + idx + ')">Apply Fix</button>';
                html += '        </div>';
                html += '        <pre>' + escapeHtml(item.fixComparison.goodFixSnippet) + '</pre>';
                html += '        <div class="fix-why"><strong>Why it is optimal:</strong> ' + escapeHtml(item.fixComparison.goodFixWhy) + '</div>';
                html += '      </div>';
                html += '    </div>';
              }

              html += '  </div>'; // review-body
              html += '</div>'; // review-card
            });
          }
        } else if (state.activeTab === 'blast') {
          if (findings.length === 0) {
            html += '<div class="empty-state">';
            html += '  <div style="font-size:32px; margin-bottom:8px;">🛡️</div>';
            html += '  <h3 style="color:#fff; margin-bottom:4px;">Zero Breaking Changes Detected</h3>';
            html += '  <p>All AST symbols, enum variants, and interface signatures remain 100% backward compatible.</p>';
            html += '</div>';
          } else {
            findings.forEach(function(f, idx) {
              html += '<div class="review-card">';
              html += '  <div class="review-header">';
              html += '    <strong style="color:#f87171; font-size:12px;">⚠️ ' + escapeHtml(f.title) + '</strong>';
              html += '    <span class="file-link" onclick="openFile(\'' + escapeHtml(f.filePath) + '\', ' + (f.line || 1) + ')">' + escapeHtml(f.filePath) + '</span>';
              html += '  </div>';
              html += '  <div class="review-body">';
              html += '    <p style="margin-top:0; font-size:12px;">' + escapeHtml(f.explanation) + '</p>';
              html += '    <div style="background:rgba(239,68,68,0.1); border-left:3px solid #ef4444; padding:6px 10px; font-size:11px; margin-bottom:10px; border-radius: 0 4px 4px 0;">';
              html += '      <strong>Impact:</strong> ' + f.affectedConsumersCount + ' consumer site(s) reference this symbol.';
              html += '    </div>';
              if (f.evidence && f.evidence.length > 0) {
                html += '    <div style="font-size:10px; font-weight:700; color:var(--muted); margin-bottom:4px;">EVIDENCE SITES:</div>';
                f.evidence.forEach(function(ev) {
                  html += '    <div style="font-size:11px; margin-bottom:4px;">';
                  html += '      &bull; <span class="file-link" onclick="openFile(\'' + escapeHtml(ev.file) + '\', ' + ev.line + ')">' + escapeHtml(ev.file) + ':' + ev.line + '</span> - ' + escapeHtml(ev.description);
                  html += '    </div>';
                });
              }
              html += '  </div>';
              html += '</div>';
            });
          }
        } else if (state.activeTab === 'files') {
          if (files.length === 0) {
            html += '<div class="empty-state">No changed files in this PR.</div>';
          } else {
            files.forEach(function(file) {
              html += '<div class="file-item" onclick="openFile(\'' + escapeHtml(file.filename) + '\', 1)">';
              html += '  <div>';
              html += '    <strong style="color:#fff; font-size:12px;">' + escapeHtml(file.filename) + '</strong>';
              html += '    <div style="font-size:11px; color:var(--muted);">' + escapeHtml(file.status) + '</div>';
              html += '  </div>';
              html += '  <div style="font-size:11px;">';
              html += '    <span style="color:#34d399;">+' + file.additions + '</span> ';
              html += '    <span style="color:#f87171;">-' + file.deletions + '</span>';
              html += '  </div>';
              html += '</div>';
            });
          }
        }

        app.innerHTML = html;

        // Bind top actions
        var reanalyzeBtn = document.getElementById('btn-reanalyze');
        if (reanalyzeBtn) {
          reanalyzeBtn.onclick = function() {
            if (vscode) vscode.postMessage({ type: 'reAnalyze' });
          };
        }

        var linkRepoBtn = document.getElementById('btn-linkrepo');
        if (linkRepoBtn) {
          linkRepoBtn.onclick = function() {
            if (vscode) vscode.postMessage({ type: 'linkRepo' });
          };
        }

        var copyBtn = document.getElementById('btn-copy-review');
        if (copyBtn) {
          copyBtn.onclick = function() {
            if (vscode) {
              vscode.postMessage({
                type: 'copyReview',
                markdown: (state.report && state.report.generatedMarkdownReview) || ''
              });
            }
          };
        }
      }

      function bindWelcomeActions() {
        var quickAnalyze = document.getElementById('btn-quick-analyze');
        if (quickAnalyze) {
          quickAnalyze.onclick = function() {
            if (vscode) vscode.postMessage({ type: 'reAnalyze' });
          };
        }

        var quickLink = document.getElementById('btn-quick-link');
        if (quickLink) {
          quickLink.onclick = function() {
            if (vscode) vscode.postMessage({ type: 'linkRepo' });
          };
        }

        var quickToken = document.getElementById('btn-quick-token');
        if (quickToken) {
          quickToken.onclick = function() {
            if (vscode) vscode.postMessage({ type: 'setToken' });
          };
        }
      }

      window.setTab = function(tab) {
        state.activeTab = tab;
        render();
      };

      window.openFile = function(file, line) {
        if (vscode) vscode.postMessage({ type: 'openFile', file: file, line: line });
      };

      window.applyFix = function(file, line, itemIndex) {
        var item = state.report && state.report.items && state.report.items[itemIndex];
        if (item && item.fixComparison && vscode) {
          vscode.postMessage({
            type: 'applyFix',
            file: file,
            line: line,
            goodCode: item.fixComparison.goodFixSnippet,
            title: item.title
          });
        }
      };

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      window.addEventListener('message', function(event) {
        var message = event.data;
        if (message.type === 'setFindings' || message.type === 'setReview') {
          state.findings = message.findings || [];
          state.prInfo = message.prInfo;
          state.changedFiles = message.changedFiles || [];
          state.report = message.report || state.report;
          render();
        }
      });

      render();
    })();
  </script>
</body>
</html>`;
}

/**
 * Findings & Review Panel (Webview Panel for Editor Tab)
 */
export class FindingsPanel {
  public static currentPanel: FindingsPanel | undefined;
  public static readonly viewType = 'prSentinel.findingsPanel';
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    findings: Finding[] = [],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = [],
    reviewReport?: PRReviewReport
  ): FindingsPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (FindingsPanel.currentPanel) {
      FindingsPanel.currentPanel._panel.reveal(column);
      FindingsPanel.currentPanel.update(findings, prInfo, changedFiles, reviewReport);
      return FindingsPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      FindingsPanel.viewType,
      `PR Sentinel: ${prInfo ? `#${prInfo.number} Review` : 'Review & Blast Radius'}`,
      column || vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true,
      }
    );

    FindingsPanel.currentPanel = new FindingsPanel(
      panel,
      extensionUri,
      findings,
      prInfo,
      changedFiles,
      reviewReport
    );
    return FindingsPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    findings: Finding[],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = [],
    reviewReport?: PRReviewReport
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this.update(findings, prInfo, changedFiles, reviewReport);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (data) => {
        switch (data.type) {
          case 'openFile': {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
              try {
                const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, data.file);
                const doc = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(doc, {
                  viewColumn: vscode.ViewColumn.One,
                });
                if (data.line && data.line > 0) {
                  const position = new vscode.Position(data.line - 1, 0);
                  editor.selection = new vscode.Selection(position, position);
                  editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                  );
                }
              } catch (err: any) {
                vscode.window.showWarningMessage(
                  `Could not open file "${data.file}": ${err.message || err}`
                );
              }
            }
            break;
          }
          case 'applyFix': {
            await handleApplyFix(data.file, data.line, data.goodCode, data.title);
            break;
          }
          case 'copyReview': {
            if (data.markdown) {
              await vscode.env.clipboard.writeText(data.markdown);
              vscode.window.showInformationMessage(
                'PR Sentinel: Full Markdown Code Review copied to clipboard!'
              );
            }
            break;
          }
          case 'reAnalyze': {
            vscode.commands.executeCommand('pr-sentinel.analyzePR');
            break;
          }
          case 'linkRepo': {
            vscode.commands.executeCommand('pr-sentinel.linkRepo');
            break;
          }
          case 'setToken': {
            vscode.commands.executeCommand('pr-sentinel.setToken');
            break;
          }
        }
      },
      null,
      this._disposables
    );
  }

  public update(
    findings: Finding[],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = [],
    reviewReport?: PRReviewReport
  ): void {
    this._panel.webview.html = getBlastRadiusHtml(
      findings,
      prInfo,
      changedFiles,
      reviewReport,
      this._panel.webview
    );
  }

  public dispose(): void {
    FindingsPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

/**
 * Findings View Provider for VS Code Sidebar
 */
export class FindingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'prSentinel.findingsView';
  private _view?: vscode.WebviewView;
  private _findings: Finding[] = [];
  private _prInfo?: PullRequestInfo;
  private _changedFiles: ChangedFile[] = [];
  private _reviewReport?: PRReviewReport;
  private _hasAnalyzed = false;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = getBlastRadiusHtml(
      this._findings,
      this._prInfo,
      this._changedFiles,
      this._reviewReport,
      webviewView.webview
    );

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'openFile': {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            try {
              const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, data.file);
              const doc = await vscode.workspace.openTextDocument(uri);
              const editor = await vscode.window.showTextDocument(doc);
              if (data.line && data.line > 0) {
                const position = new vscode.Position(data.line - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                  new vscode.Range(position, position),
                  vscode.TextEditorRevealType.InCenter
                );
              }
            } catch (err: any) {
              vscode.window.showWarningMessage(
                `Could not open file "${data.file}": ${err.message || err}`
              );
            }
          }
          break;
        }
        case 'applyFix': {
          await handleApplyFix(data.file, data.line, data.goodCode, data.title);
          break;
        }
        case 'copyReview': {
          if (data.markdown) {
            await vscode.env.clipboard.writeText(data.markdown);
            vscode.window.showInformationMessage(
              'PR Sentinel: Full Markdown Code Review copied to clipboard!'
            );
          }
          break;
        }
        case 'reAnalyze': {
          vscode.commands.executeCommand('pr-sentinel.analyzePR');
          break;
        }
        case 'linkRepo': {
          vscode.commands.executeCommand('pr-sentinel.linkRepo');
          break;
        }
        case 'setToken': {
          vscode.commands.executeCommand('pr-sentinel.setToken');
          break;
        }
      }
    });

    if (this._hasAnalyzed) {
      this.updateFindings(this._findings, this._prInfo, this._changedFiles, this._reviewReport);
    }
  }

  public updateFindings(
    findings: Finding[],
    prInfo?: PullRequestInfo,
    changedFiles: ChangedFile[] = [],
    reviewReport?: PRReviewReport
  ): void {
    this._hasAnalyzed = true;
    this._findings = findings;
    this._prInfo = prInfo;
    this._changedFiles = changedFiles;
    this._reviewReport = reviewReport;

    if (this._view) {
      this._view.webview.html = getBlastRadiusHtml(
        findings,
        prInfo,
        changedFiles,
        reviewReport,
        this._view.webview
      );
    }
  }
}

/**
 * Handles applying recommended best fix directly into local workspace file
 */
async function handleApplyFix(
  filePath: string,
  line: number,
  goodCode: string,
  title: string
): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('No active workspace folder found to apply fix.');
      return;
    }

    const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    // Prompt user confirmation
    const choice = await vscode.window.showInformationMessage(
      `PR Sentinel: Apply recommended best fix for "${title}" in ${filePath}?`,
      'Apply Fix',
      'Cancel'
    );

    if (choice === 'Apply Fix') {
      const edit = new vscode.WorkspaceEdit();
      const targetLine = Math.max(0, line - 1);
      const targetPos = new vscode.Position(targetLine, 0);

      edit.insert(uri, targetPos, `\n// [PR Sentinel Optimal Fix]:\n${goodCode}\n`);
      await vscode.workspace.applyEdit(edit);
      await doc.save();

      vscode.window.showInformationMessage(`✅ Fix successfully applied to ${filePath}!`);
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to apply fix: ${err.message || err}`);
  }
}
