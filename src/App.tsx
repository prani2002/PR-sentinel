import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  FileCode2,
  GitBranch,
  X,
  Layers,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Search,
  Settings,
  User,
  ArrowRight,
  CheckCircle,
  FileText,
  Workflow,
  Code2,
  AlertTriangle,
  FileDiff,
  DownloadCloud,
  Globe,
  Key,
  ShieldCheck,
  Lock,
  Unlock,
  Check,
  XCircle,
  Sparkles,
  Zap,
  Bug,
  Copy,
  CheckCheck,
  FolderGit2,
  GitPullRequest,
  GitMerge,
  Split,
  Terminal,
  Filter
} from 'lucide-react';

import { REAL_PR_SCENARIOS, PRScenario } from './data/mockScenarios';
import { DeterministicPipeline } from './pipeline/deterministicPipeline';
import {
  parseGitUrlOrInput,
  fetchRemotePullOrMergeRequest,
  validateRemoteToken,
  listRemotePullOrMergeRequests,
  GitProviderType,
  ParsedGitTarget,
  UniversalTokenValidationResult
} from './git/gitProvider';
import { Finding, ConsumerReference, PullRequestInfo, ChangedFile, PRReviewReport, ReviewItem, ReviewCategory, ReviewSeverity } from './models/types';
import { ProjectFileSource } from './analyzer/projectScanner';
import { CodeReviewer } from './reviewer/codeReviewer';
import { RepoLinker } from './reviewer/repoLinker';
import { GitHubIcon, GitLabIcon } from './ui/GitIcons';

export default function App() {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [customScenario, setCustomScenario] = useState<PRScenario | null>(null);
  const [mainView, setMainView] = useState<'reviewer' | 'blastRadius' | 'diff' | 'repoLinker'>('reviewer');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedConsumerFile, setSelectedConsumerFile] = useState<string>('frontend/Checkout.tsx');
  const [highlightedLine, setHighlightedLine] = useState<number>(6);
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);
  const [showFetchModal, setShowFetchModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [copiedReview, setCopiedReview] = useState<boolean>(false);
  const [appliedFixes, setAppliedFixes] = useState<Record<string, boolean>>({});

  // Live Git Provider fetch & token states
  const [providerMode, setProviderMode] = useState<'auto' | 'github' | 'gitlab'>('auto');
  const [gitRepoInput, setGitRepoInput] = useState<string>('facebook/react');
  const [gitNumberInput, setGitNumberInput] = useState<string>('28000');
  const [gitTokenInput, setGitTokenInput] = useState<string>('');
  const [isFetchingRemote, setIsFetchingRemote] = useState<boolean>(false);
  const [isValidatingToken, setIsValidatingToken] = useState<boolean>(false);
  const [tokenValidation, setTokenValidation] = useState<UniversalTokenValidationResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState<boolean>(false);

  // Repository Linker state
  const [openPRsList, setOpenPRsList] = useState<PullRequestInfo[]>([]);
  const [isLoadingPRs, setIsLoadingPRs] = useState<boolean>(false);

  // Load saved token from localStorage on initial render
  useEffect(() => {
    try {
      const savedGhToken = localStorage.getItem('pr_sentinel_pat_github');
      const savedGlToken = localStorage.getItem('pr_sentinel_pat_gitlab');
      if (savedGhToken) {
        setGitTokenInput(savedGhToken);
      } else if (savedGlToken) {
        setGitTokenInput(savedGlToken);
      }
    } catch {
      // localStorage may be disabled in some environments
    }
  }, []);

  const scenario: PRScenario = customScenario || REAL_PR_SCENARIOS[selectedScenarioIndex];

  // Dynamically analyze current input to detect target and provider
  const detectedTarget: { target?: ParsedGitTarget; error?: string } = useMemo(() => {
    return parseGitUrlOrInput(
      gitRepoInput,
      gitNumberInput,
      providerMode === 'auto' ? undefined : providerMode
    );
  }, [gitRepoInput, gitNumberInput, providerMode]);

  // Run deterministic AST analysis pipeline
  const pipeline = useMemo(() => new DeterministicPipeline(), []);
  const analysisResult = useMemo(() => {
    return pipeline.run(
      scenario.pr,
      scenario.changedFiles,
      scenario.workspaceFiles
    );
  }, [pipeline, scenario]);

  // Run Senior Code Reviewer Engine
  const reviewer = useMemo(() => new CodeReviewer(), []);
  const reviewReport: PRReviewReport = useMemo(() => {
    return reviewer.reviewPullRequest(
      scenario.pr,
      scenario.changedFiles,
      analysisResult.findings,
      scenario.workspaceFiles
    );
  }, [reviewer, scenario, analysisResult]);

  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  const selectedFinding: Finding | undefined = useMemo(() => {
    if (analysisResult.findings.length === 0) return undefined;
    if (!selectedFindingId) return analysisResult.findings[0];
    return (
      analysisResult.findings.find((f) => f.id === selectedFindingId) ||
      analysisResult.findings[0]
    );
  }, [analysisResult, selectedFindingId]);

  // Filtered review items
  const filteredReviewItems = useMemo(() => {
    return reviewReport.items.filter((item) => {
      const catMatch = selectedCategory === 'all' || item.category === selectedCategory;
      const sevMatch = selectedSeverity === 'all' || item.severity === selectedSeverity;
      return catMatch && sevMatch;
    });
  }, [reviewReport, selectedCategory, selectedSeverity]);

  const handleReanalyze = () => {
    setIsReanalyzing(true);
    setTimeout(() => {
      setIsReanalyzing(false);
    }, 500);
  };

  const handleOpenConsumer = (file: string, line: number) => {
    setSelectedConsumerFile(file);
    setHighlightedLine(line);
    setMainView('diff');
  };

  const handleApplyFix = (itemId: string) => {
    setAppliedFixes((prev) => ({ ...prev, [itemId]: true }));
    setTimeout(() => {
      // Keep applied state
    }, 100);
  };

  const handleCopyReviewMarkdown = () => {
    navigator.clipboard.writeText(reviewReport.generatedMarkdownReview);
    setCopiedReview(true);
    setTimeout(() => setCopiedReview(false), 2000);
  };

  // Validate personal access token against GitHub/GitLab
  const handleValidateToken = async (explicitToken?: string): Promise<boolean> => {
    const token = (explicitToken !== undefined ? explicitToken : gitTokenInput).trim();
    if (!token) {
      setTokenValidation({
        valid: false,
        provider: detectedTarget.target?.provider || 'github',
        error: 'Please enter a Personal Access Token.',
      });
      return false;
    }

    const provider = detectedTarget.target?.provider || (providerMode === 'gitlab' ? 'gitlab' : 'github');
    const host = detectedTarget.target?.host;

    setIsValidatingToken(true);
    try {
      const res = await validateRemoteToken(provider, token, host);
      setTokenValidation(res);
      if (res.valid) {
        try {
          localStorage.setItem(`pr_sentinel_pat_${provider}`, token);
        } catch {}
      }
      return res.valid;
    } catch (err: any) {
      setTokenValidation({
        valid: false,
        provider,
        error: err.message || 'Token validation failed.',
      });
      return false;
    } finally {
      setIsValidatingToken(false);
    }
  };

  // Handler to fetch live PR/MR from GitHub or GitLab and immediately review
  const handleFetchRemotePrOrMr = async (explicitPrNum?: number) => {
    const parsed = detectedTarget;
    if (parsed.error || !parsed.target) {
      setFetchError(parsed.error || 'Please enter a valid GitHub or GitLab URL or repository path.');
      return;
    }

    const target: ParsedGitTarget = {
      ...parsed.target,
      number: explicitPrNum || parsed.target.number,
    };

    if (!target.number || target.number <= 0) {
      setFetchError(`Please enter a valid positive ${target.typeLabel} number.`);
      return;
    }

    setIsFetchingRemote(true);
    setFetchError(null);

    // If token provided, validate in background if not already valid
    if (gitTokenInput && (!tokenValidation || !tokenValidation.valid)) {
      await handleValidateToken(gitTokenInput);
    }

    try {
      const { prInfo, changedFiles } = await fetchRemotePullOrMergeRequest(
        target,
        gitTokenInput || undefined
      );

      if (!changedFiles || changedFiles.length === 0) {
        setFetchError(`${target.typeLabel} #${target.number} returned no changed files or diffs.`);
        setIsFetchingRemote(false);
        return;
      }

      // Build workspace file representations from patch data
      const workspaceFiles: ProjectFileSource[] = changedFiles.map((f) => {
        const lines = f.patch
          ? f.patch
              .split('\n')
              .filter((l) => !l.startsWith('-'))
              .map((l) => (l.startsWith('+') ? l.substring(1) : l))
              .join('\n')
          : '';
        return {
          path: f.filename,
          content: lines || `// File: ${f.filename}\n// Changes: +${f.additions} -${f.deletions}`,
        };
      });

      const newScenario: PRScenario = {
        id: `${target.provider}-${target.owner}-${target.repo}-${target.number}`,
        pr: prInfo,
        changedFiles,
        workspaceFiles,
      };

      setCustomScenario(newScenario);
      setSelectedFindingId(null);
      setShowFetchModal(false);
      setMainView('reviewer');
      if (changedFiles.length > 0) {
        setSelectedConsumerFile(changedFiles[0].filename);
      }
    } catch (err: any) {
      console.error('Failed to fetch remote Git PR/MR:', err);
      setFetchError(err.message || 'Error communicating with Git Provider API. Check permissions or rate limit.');
    } finally {
      setIsFetchingRemote(false);
    }
  };

  // Handler to fetch all open PRs for the repository
  const handleFetchOpenPRsForRepo = async () => {
    if (!detectedTarget.target) return;
    setIsLoadingPRs(true);
    try {
      const prs = await listRemotePullOrMergeRequests(
        detectedTarget.target,
        gitTokenInput || undefined,
        'open'
      );
      setOpenPRsList(prs);
    } catch (err: any) {
      console.warn('Could not list open PRs:', err);
    } finally {
      setIsLoadingPRs(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1 rounded-md font-semibold text-sm shadow-sm">
            <Shield className="w-4 h-4" />
            <span>PR Sentinel</span>
          </div>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 font-medium px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Senior Staff Code Reviewer & AST Sentinel
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Scenario Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2 font-medium">Scenario:</span>
            {REAL_PR_SCENARIOS.map((sc, idx) => (
              <button
                key={sc.id}
                onClick={() => {
                  setCustomScenario(null);
                  setSelectedScenarioIndex(idx);
                  setSelectedFindingId(null);
                  setAppliedFixes({});
                }}
                className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1.5 ${
                  !customScenario && selectedScenarioIndex === idx
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                {sc.pr.provider === 'gitlab' ? (
                  <GitLabIcon className="w-3 h-3 text-orange-400" />
                ) : (
                  <GitHubIcon className="w-3 h-3 text-white" />
                )}
                <span>
                  {sc.pr.typeLabel} #{sc.pr.number}
                </span>
              </button>
            ))}
            {customScenario && (
              <span className="px-2.5 py-1 rounded bg-indigo-600 text-white font-medium flex items-center gap-1">
                {customScenario.pr.provider === 'gitlab' ? (
                  <GitLabIcon className="w-3 h-3 text-orange-400" />
                ) : (
                  <GitHubIcon className="w-3 h-3 text-white" />
                )}
                <span>Live {customScenario.pr.typeLabel} #{customScenario.pr.number}</span>
              </span>
            )}
          </div>

          {/* Fetch Live PR Button */}
          <button
            onClick={() => setShowFetchModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Link Remote Repo / PR</span>
          </button>

          {/* Export Review Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Export Review Markdown</span>
          </button>

          {/* Re-analyze Button */}
          <button
            onClick={handleReanalyze}
            disabled={isReanalyzing}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Re-run pipeline analysis"
          >
            <RefreshCw className={`w-4 h-4 ${isReanalyzing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4">
        {/* PR Overview & Health Scorecard Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-lg mt-0.5">
                {scenario.pr.provider === 'gitlab' ? (
                  <GitLabIcon className="w-6 h-6 text-orange-400" />
                ) : (
                  <GitHubIcon className="w-6 h-6 text-slate-200" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {scenario.pr.provider === 'gitlab' ? scenario.pr.projectPath : `${scenario.pr.owner}/${scenario.pr.repository}`}
                  </span>
                  <span className="text-xs text-slate-400">&bull;</span>
                  <span className="text-xs text-slate-400">
                    Author: <span className="text-slate-200 font-medium">@{scenario.pr.author || 'developer'}</span>
                  </span>
                  <span className="text-xs text-slate-400">&bull;</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <GitBranch className="w-3 h-3 text-slate-400" />
                    {scenario.pr.branchName || 'feature'} &rarr; {scenario.pr.baseBranch || 'main'}
                  </span>
                </div>
                <h1 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>
                    {scenario.pr.typeLabel || 'PR'} #{scenario.pr.number}: {scenario.pr.title}
                  </span>
                  {scenario.pr.htmlUrl && (
                    <a
                      href={scenario.pr.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 inline-flex items-center text-xs"
                      title="Open on GitHub/GitLab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                  )}
                </h1>
              </div>
            </div>

            {/* Verdict Badge */}
            <div className="flex items-center gap-2">
              {reviewReport.verdict === 'APPROVE' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-bold text-sm shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Approved &bull; Ready to Merge</span>
                </div>
              )}
              {reviewReport.verdict === 'REQUEST_CHANGES' && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-bold text-sm shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Changes Requested</span>
                </div>
              )}
              {reviewReport.verdict === 'CRITICAL_RISK' && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-bold text-sm shadow-sm">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Critical Risk Blocked</span>
                </div>
              )}
              {reviewReport.verdict === 'NEEDS_DISCUSSION' && (
                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-bold text-sm shadow-sm">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  <span>Suggestions Available</span>
                </div>
              )}
            </div>
          </div>

          {/* Dimensional Scorecard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800">
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-center">
              <div className="text-xl font-extrabold text-blue-400">{reviewReport.overallScore}/100</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Overall Health</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-center">
              <div className={`text-xl font-extrabold ${reviewReport.breakdown.architectureScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {reviewReport.breakdown.architectureScore}/100
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Architecture</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-center">
              <div className={`text-xl font-extrabold ${reviewReport.breakdown.securityScore >= 90 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {reviewReport.breakdown.securityScore}/100
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Security</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-center">
              <div className={`text-xl font-extrabold ${reviewReport.breakdown.performanceScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {reviewReport.breakdown.performanceScore}/100
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Performance</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-center">
              <div className={`text-xl font-extrabold ${reviewReport.breakdown.resilienceScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {reviewReport.breakdown.resilienceScore}/100
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Resilience</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-center">
              <div className={`text-xl font-extrabold ${reviewReport.breakdown.compatibilityScore >= 90 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {reviewReport.breakdown.compatibilityScore}/100
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">AST Compatibility</div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMainView('reviewer')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mainView === 'reviewer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Senior Code Review & Fixes</span>
              <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">
                {reviewReport.items.length}
              </span>
            </button>

            <button
              onClick={() => setMainView('blastRadius')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mainView === 'blastRadius'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>AST Blast Radius Impact</span>
              <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">
                {analysisResult.findings.length}
              </span>
            </button>

            <button
              onClick={() => setMainView('diff')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mainView === 'diff'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileDiff className="w-3.5 h-3.5" />
              <span>Changed Files & Diffs</span>
              <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">
                {scenario.changedFiles.length}
              </span>
            </button>

            <button
              onClick={() => {
                setMainView('repoLinker');
                handleFetchOpenPRsForRepo();
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mainView === 'repoLinker'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Workspace Repo Linker</span>
            </button>
          </div>

          {/* Quick Copy Markdown Review */}
          <button
            onClick={handleCopyReviewMarkdown}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            {copiedReview ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReview ? 'Copied to Clipboard!' : 'Copy Review Markdown'}</span>
          </button>
        </div>

        {/* View 1: Senior Code Review & Best Replacements ("Good vs Bad Fixes") */}
        {mainView === 'reviewer' && (
          <div className="flex flex-col gap-4">
            {/* Category and Severity Filter Chips */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3 text-slate-500" /> Filter Category:
                </span>
                {['all', 'breaking-changes', 'security', 'performance', 'edge-cases', 'type-safety', 'code-quality'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize font-medium ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat.replace('-', ' ')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium mr-1">Severity:</span>
                {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors uppercase font-mono text-[11px] ${
                      selectedSeverity === sev
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Review Findings with Side-by-Side Good vs Bad Fixes */}
            {filteredReviewItems.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Zero Actionable Code Smells or Vulnerabilities</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  All analyzed files in this PR comply with senior engineering standards, type safety, and AST backward compatibility.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredReviewItems.map((item, idx) => {
                  const isApplied = appliedFixes[item.id];
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md transition-all hover:border-slate-700"
                    >
                      {/* Review Card Header */}
                      <div className="p-3.5 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              item.severity === 'critical'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : item.severity === 'high'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : item.severity === 'medium'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {item.severity}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {idx + 1}. {item.title}
                          </span>
                          <span className="text-[11px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                            {item.ruleId}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenConsumer(item.file, item.line)}
                            className="text-xs font-mono text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                          >
                            <span>{item.file}:{item.line}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Critique Body */}
                      <div className="p-4 flex flex-col gap-3">
                        <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                          <strong className="text-slate-200 block mb-1 text-xs">Senior Staff Critique:</strong>
                          {item.critique}
                        </div>

                        {item.codeSnippet && (
                          <div>
                            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                              CURRENT PR CODE IN FILE:
                            </span>
                            <pre className="text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 overflow-x-auto">
                              {item.codeSnippet}
                            </pre>
                          </div>
                        )}

                        {/* Side-by-Side Good vs Bad Fix Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                          {/* Bad Fix Box */}
                          <div className="bg-rose-950/15 border border-rose-500/25 rounded-lg p-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase tracking-wider mb-1.5">
                                <span className="flex items-center gap-1.5">
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                  ❌ Suboptimal / Bad Fix (Avoid)
                                </span>
                              </div>
                              <pre className="text-xs font-mono bg-slate-950/80 border border-rose-500/20 rounded p-2.5 text-rose-200/90 overflow-x-auto whitespace-pre-wrap">
                                {item.fixComparison.badFixSnippet}
                              </pre>
                            </div>
                            <div className="text-xs text-slate-400 mt-2.5 pt-2 border-t border-rose-500/20">
                              <strong className="text-rose-300">Why it fails: </strong>
                              {item.fixComparison.badFixWhy}
                            </div>
                          </div>

                          {/* Good Fix Box */}
                          <div className="bg-emerald-950/15 border border-emerald-500/25 rounded-lg p-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  ✅ Recommended Best Replacement
                                </span>
                                <button
                                  onClick={() => handleApplyFix(item.id)}
                                  className={`text-[11px] px-2.5 py-1 rounded font-semibold transition-all flex items-center gap-1 ${
                                    isApplied
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                  }`}
                                >
                                  {isApplied ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Applied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3 h-3" />
                                      <span>Apply Fix</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="text-xs font-mono bg-slate-950/80 border border-emerald-500/20 rounded p-2.5 text-emerald-200/90 overflow-x-auto whitespace-pre-wrap">
                                {item.fixComparison.goodFixSnippet}
                              </pre>
                            </div>
                            <div className="text-xs text-slate-400 mt-2.5 pt-2 border-t border-emerald-500/20">
                              <strong className="text-emerald-300">Why it is optimal: </strong>
                              {item.fixComparison.goodFixWhy}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View 2: AST Blast Radius Impact */}
        {mainView === 'blastRadius' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <h2 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Detected AST Findings ({analysisResult.findings.length})</span>
                <span className="text-xs font-normal text-slate-400">AST Hard Evidence</span>
              </h2>

              {analysisResult.findings.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Zero breaking AST signature changes detected in this PR.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {analysisResult.findings.map((finding) => {
                    const isSelected = selectedFinding?.id === finding.id;
                    return (
                      <div
                        key={finding.id}
                        onClick={() => setSelectedFindingId(finding.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-blue-500 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            {finding.severity}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {finding.affectedConsumersCount} consumer site(s)
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate">{finding.title}</div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">{finding.filePath}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Finding Detail */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              {selectedFinding ? (
                <>
                  <div className="border-b border-slate-800 pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">{selectedFinding.title}</h3>
                      <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {selectedFinding.filePath}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{selectedFinding.explanation}</p>
                  </div>

                  {/* Consumers List */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Affected Consumer Call Sites ({selectedFinding.evidence.length})
                    </h4>
                    <div className="flex flex-col gap-2">
                      {selectedFinding.evidence.map((ev, i) => (
                        <div
                          key={i}
                          onClick={() => handleOpenConsumer(ev.file, ev.line)}
                          className="bg-slate-950 border border-slate-800/80 hover:border-blue-500/60 rounded-lg p-2.5 transition-colors cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-xs font-mono text-blue-400 font-medium">{ev.file}:{ev.line}</div>
                            <div className="text-xs text-slate-300 mt-0.5">{ev.description}</div>
                          </div>
                          <div className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded">
                            {ev.snippet}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-950/20 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-200">
                    <strong className="block text-blue-300 mb-1">Sentinel Recommendation:</strong>
                    {selectedFinding.recommendation}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">Select a finding to inspect blast radius.</div>
              )}
            </div>
          </div>
        )}

        {/* View 3: Changed Files & Diffs */}
        {mainView === 'diff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Modified Files ({scenario.changedFiles.length})
              </h2>
              {scenario.changedFiles.map((file) => (
                <div
                  key={file.filename}
                  onClick={() => setSelectedConsumerFile(file.filename)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                    selectedConsumerFile === file.filename
                      ? 'bg-slate-800 border-blue-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono truncate">{file.filename}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-emerald-400">+{file.additions}</span>
                    <span className="text-rose-400">-{file.deletions}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono text-slate-200">{selectedConsumerFile}</span>
                <span className="text-xs text-slate-400">Target Line: {highlightedLine}</span>
              </div>
              <pre className="text-xs font-mono bg-slate-950 border border-slate-800/80 rounded-lg p-4 overflow-x-auto text-slate-300 whitespace-pre-wrap leading-relaxed">
                {scenario.changedFiles.find((f) => f.filename === selectedConsumerFile)?.patch ||
                  scenario.workspaceFiles.find((f) => f.path === selectedConsumerFile)?.content ||
                  '// No file content available for preview.'}
              </pre>
            </div>
          </div>
        )}

        {/* View 4: Workspace Repository Linker */}
        {mainView === 'repoLinker' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-blue-400" />
                  <span>Linked Repository: {detectedTarget.target?.owner}/{detectedTarget.target?.repo}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  PR Sentinel seamlessly binds with your local opened workspace git remote to pull and review pull requests.
                </p>
              </div>

              <button
                onClick={handleFetchOpenPRsForRepo}
                disabled={isLoadingPRs}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPRs ? 'animate-spin' : ''}`} />
                <span>Refresh Open PRs List</span>
              </button>
            </div>

            {/* Open PRs list */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Available Open PRs / MRs in Repository:
              </h3>

              {isLoadingPRs ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                  Fetching open pull requests...
                </div>
              ) : openPRsList.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-6 text-center text-slate-400 text-xs">
                  Click <strong>Refresh Open PRs List</strong> to query live PRs from GitHub/GitLab or select one of the built-in test scenarios.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {openPRsList.map((pr) => (
                    <div
                      key={pr.number}
                      onClick={() => handleFetchRemotePrOrMr(pr.number)}
                      className="bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-lg p-3 cursor-pointer transition-all flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                          <span>{pr.typeLabel || 'PR'} #{pr.number}: {pr.title}</span>
                          <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                            {pr.branchName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Author: @{pr.author} &bull; Updated: {pr.updatedAt?.slice(0, 10) || 'recently'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-blue-400 font-semibold hover:underline">
                          Run Review &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Link Remote PR / MR */}
      {showFetchModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-blue-400" />
                <span>Link Remote Repository or PR / MR</span>
              </h3>
              <button
                onClick={() => setShowFetchModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  GitHub / GitLab Repository URL or Name:
                </label>
                <input
                  type="text"
                  value={gitRepoInput}
                  onChange={(e) => setGitRepoInput(e.target.value)}
                  placeholder="e.g. facebook/react/pull/28000 or gitlab-org/gitlab"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  PR / MR Number:
                </label>
                <input
                  type="number"
                  value={gitNumberInput}
                  onChange={(e) => setGitNumberInput(e.target.value)}
                  placeholder="e.g. 28000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Personal Access Token (for Private Repos / 5,000 req/hr):
                </label>
                <input
                  type="password"
                  value={gitTokenInput}
                  onChange={(e) => setGitTokenInput(e.target.value)}
                  placeholder="ghp_... or glpat-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {fetchError && (
                <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-2.5 rounded-lg text-xs">
                  {fetchError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setShowFetchModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFetchRemotePrOrMr()}
                disabled={isFetchingRemote}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5"
              >
                {isFetchingRemote && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isFetchingRemote ? 'Fetching & Analyzing...' : 'Fetch & Review'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Export Review Markdown */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DownloadCloud className="w-4 h-4 text-blue-400" />
                <span>Export Formatted Markdown Code Review</span>
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              This review is ready to be posted as a PR comment or review summary on GitHub / GitLab.
            </p>

            <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-y-auto whitespace-pre-wrap">
              {reviewReport.generatedMarkdownReview}
            </pre>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <button
                onClick={handleCopyReviewMarkdown}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5"
              >
                {copiedReview ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReview ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
              </button>

              <button
                onClick={() => setShowExportModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
