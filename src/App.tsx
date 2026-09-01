import React, { useState, useMemo } from 'react';
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
  MoreHorizontal,
  Sun,
  LayoutGrid,
  ArrowRight,
  CheckCircle,
  FileText,
  Workflow,
  Code2,
  AlertTriangle,
  FileDiff,
  Github,
  DownloadCloud
} from 'lucide-react';

import { REAL_PR_SCENARIOS, PRScenario } from './data/mockScenarios';
import { DeterministicPipeline } from './pipeline/deterministicPipeline';
import { GitHubClient } from './github/githubClient';
import { Finding, ConsumerReference, PullRequestInfo, ChangedFile } from './models/types';
import { ProjectFileSource } from './analyzer/projectScanner';

export default function App() {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [customScenario, setCustomScenario] = useState<PRScenario | null>(null);
  const [activeTab, setActiveTab] = useState<'diff' | 'consumer' | 'blastRadius'>('diff');
  const [selectedConsumerFile, setSelectedConsumerFile] = useState<string>('frontend/Checkout.tsx');
  const [highlightedLine, setHighlightedLine] = useState<number>(6);
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);
  const [showFetchModal, setShowFetchModal] = useState<boolean>(false);
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);

  // Live GitHub fetch states
  const [githubRepoInput, setGithubRepoInput] = useState<string>('facebook/react');
  const [githubPrNumberInput, setGithubPrNumberInput] = useState<string>('28000');
  const [githubTokenInput, setGithubTokenInput] = useState<string>('');
  const [isFetchingGithub, setIsFetchingGithub] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const scenario: PRScenario = customScenario || REAL_PR_SCENARIOS[selectedScenarioIndex];

  // Run the real deterministic AST analysis pipeline dynamically on current PR scenario
  const pipeline = useMemo(() => new DeterministicPipeline(), []);
  const analysisResult = useMemo(() => {
    return pipeline.run(
      scenario.pr,
      scenario.changedFiles,
      scenario.workspaceFiles
    );
  }, [pipeline, scenario]);

  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  const selectedFinding: Finding | undefined = useMemo(() => {
    if (analysisResult.findings.length === 0) return undefined;
    if (!selectedFindingId) return analysisResult.findings[0];
    return (
      analysisResult.findings.find((f) => f.id === selectedFindingId) ||
      analysisResult.findings[0]
    );
  }, [analysisResult, selectedFindingId]);

  const handleReanalyze = () => {
    setIsReanalyzing(true);
    setTimeout(() => {
      setIsReanalyzing(false);
    }, 600);
  };

  const handleOpenConsumer = (file: string, line: number) => {
    setSelectedConsumerFile(file);
    setHighlightedLine(line);
    setActiveTab('consumer');
  };

  // Handler to fetch live GitHub PR
  const handleFetchLiveGitHubPR = async () => {
    if (!githubRepoInput || !githubRepoInput.includes('/')) {
      setFetchError('Please enter a valid owner/repo repository (e.g. facebook/react).');
      return;
    }
    const prNum = parseInt(githubPrNumberInput, 10);
    if (isNaN(prNum) || prNum <= 0) {
      setFetchError('Please enter a valid positive PR number.');
      return;
    }

    const [owner, repo] = githubRepoInput.split('/').map((s) => s.trim());
    setIsFetchingGithub(true);
    setFetchError(null);

    try {
      const client = new GitHubClient(githubTokenInput || undefined);
      const prInfo: PullRequestInfo = await client.getPullRequest(owner, repo, prNum);
      const changedFiles: ChangedFile[] = await client.getPullRequestFiles(owner, repo, prNum);

      // Build workspace file representations from patch data
      const workspaceFiles: ProjectFileSource[] = changedFiles.map((f) => {
        // Extract added lines from patch as simulated source content if not locally available
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
        id: `github-${owner}-${repo}-${prNum}`,
        pr: prInfo,
        changedFiles,
        workspaceFiles,
      };

      setCustomScenario(newScenario);
      setSelectedFindingId(null);
      setShowFetchModal(false);
      if (changedFiles.length > 0) {
        setSelectedConsumerFile(changedFiles[0].filename);
      }
    } catch (err: any) {
      console.error('Failed to fetch GitHub PR:', err);
      setFetchError(err.message || 'Error communicating with GitHub API. Rate limit or invalid PR.');
    } finally {
      setIsFetchingGithub(false);
    }
  };

  // Find active consumer file content
  const activeConsumerContent = useMemo(() => {
    const file = scenario.workspaceFiles.find((f) => f.path === selectedConsumerFile);
    return file ? file.content : '';
  }, [scenario, selectedConsumerFile]);

  // Find active diff file content
  const activeDiffFile = scenario.changedFiles[0] || {
    filename: 'No changed files',
    status: 'none',
    additions: 0,
    deletions: 0,
    changes: 0,
    sha: '',
    patch: '',
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#141416] text-[#cccccc] font-sans overflow-hidden select-none">
      {/* VS Code Title Bar */}
      <header className="h-9 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between px-3 text-xs text-[#a1a1aa] shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-[#ef4444] opacity-85 hover:opacity-100 transition cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#eab308] opacity-85 hover:opacity-100 transition cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#22c55e] opacity-85 hover:opacity-100 transition cursor-pointer" />
          </div>
          <span className="text-[#a1a1aa] text-[12px] font-mono tracking-wide">
            {scenario.pr.owner}/{scenario.pr.repository} (PR #{scenario.pr.number})
          </span>
        </div>

        {/* PR Switcher Dropdown & Live GitHub Fetch Button */}
        <div className="flex-1 max-w-lg mx-4 flex justify-center items-center gap-2">
          <span className="text-[11px] text-[#71717a]">PR:</span>
          <select
            value={customScenario ? 'custom' : selectedScenarioIndex}
            onChange={(e) => {
              if (e.target.value === 'custom') return;
              setCustomScenario(null);
              setSelectedScenarioIndex(Number(e.target.value));
              setSelectedFindingId(null);
            }}
            className="bg-[#202024] text-xs text-[#e4e4e7] border border-[#2e2e34] rounded px-2.5 py-1 outline-none focus:border-[#38bdf8] max-w-[260px] truncate"
          >
            {customScenario && (
              <option value="custom">
                [Live GitHub] {customScenario.pr.owner}/{customScenario.pr.repository} #{customScenario.pr.number}
              </option>
            )}
            {REAL_PR_SCENARIOS.map((sc, idx) => (
              <option key={sc.id} value={idx}>
                PR #{sc.pr.number}: {sc.pr.title.slice(0, 35)}...
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFetchModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0284c7]/20 hover:bg-[#0284c7]/30 text-[#38bdf8] border border-[#0284c7]/40 text-xs font-medium transition cursor-pointer"
            title="Fetch any live PR from GitHub"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Fetch from GitHub</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 text-[#a1a1aa]">
          <LayoutGrid className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
          <MoreHorizontal className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
          <Settings className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Activity Bar */}
        <aside className="w-12 bg-[#18181b] border-r border-[#27272a] flex flex-col items-center py-2 space-y-4 text-[#71717a] shrink-0 z-10">
          <button className="p-2 hover:text-[#d4d4d8] cursor-pointer" title="Explorer">
            <FileText className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-[#d4d4d8] cursor-pointer" title="Search">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-[#d4d4d8] cursor-pointer" title="Source Control">
            <GitBranch className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-[#d4d4d8] cursor-pointer" title="Run and Debug">
            <Workflow className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-[#d4d4d8] cursor-pointer" title="Extensions">
            <Layers className="w-5 h-5" />
          </button>

          {/* PR Sentinel Extension Tab */}
          <button
            className="p-2 text-[#38bdf8] border-l-2 border-[#0284c7] w-full flex justify-center bg-[#1e293b]/40 cursor-pointer"
            title="PR Sentinel"
          >
            <Shield className="w-5 h-5 fill-[#0284c7]/20" />
          </button>

          <div className="mt-auto flex flex-col space-y-3 pb-1">
            <button className="p-2 hover:text-[#d4d4d8] cursor-pointer">
              <User className="w-5 h-5" />
            </button>
            <button className="p-2 hover:text-[#d4d4d8] cursor-pointer">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Primary Sidebar: PR Sentinel Findings View */}
        <aside className="w-72 bg-[#18181b] border-r border-[#27272a] flex flex-col shrink-0 overflow-y-auto">
          {/* Header */}
          <div className="h-9 px-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa] border-b border-[#27272a]">
            <span>PR SENTINEL</span>
            <MoreHorizontal className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
          </div>

          <div className="p-3.5 space-y-4">
            {/* PR Info Header */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">PR #{scenario.pr.number}</span>
                <span className="text-[10px] font-semibold bg-[#14532d] text-[#86efac] border border-[#22c55e]/40 px-1.5 py-0.2 rounded">
                  Open
                </span>
                {scenario.pr.htmlUrl && (
                  <a
                    href={scenario.pr.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#38bdf8] hover:text-[#7dd3fc]"
                    title="Open on GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="text-[13px] font-semibold text-[#f4f4f5] leading-tight line-clamp-2">
                {scenario.pr.title}
              </div>
              <div className="text-[11px] text-[#71717a] font-mono flex items-center gap-1">
                <span className="truncate">{scenario.pr.branchName || 'head'}</span>
                <span>→</span>
                <span>{scenario.pr.baseBranch || 'base'}</span>
              </div>
            </div>

            {/* Dynamic Metric Cards from AST Analysis */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#202024] border border-[#2e2e34] rounded p-2 text-center">
                <div className="text-base font-bold text-[#ef4444]">
                  {analysisResult.metrics.breakingCount}
                </div>
                <div className="text-[10px] text-[#ef4444] font-medium">Breaking</div>
              </div>
              <div className="bg-[#202024] border border-[#2e2e34] rounded p-2 text-center">
                <div className="text-base font-bold text-[#f97316]">
                  {analysisResult.metrics.warningCount}
                </div>
                <div className="text-[10px] text-[#f97316] font-medium">Warnings</div>
              </div>
              <div className="bg-[#202024] border border-[#2e2e34] rounded p-2 text-center">
                <div className="text-base font-bold text-[#22c55e]">
                  {analysisResult.metrics.passedCount}
                </div>
                <div className="text-[10px] text-[#22c55e] font-medium">Passed</div>
              </div>
            </div>

            {/* Deterministic Blast Radius Tree Trigger */}
            <button
              onClick={() => setActiveTab('blastRadius')}
              className="w-full h-8 bg-[#202024] hover:bg-[#27272a] border border-[#2e2e34] rounded flex items-center justify-between px-2.5 text-xs text-[#d4d4d8] font-medium transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Workflow className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Blast Radius Tree</span>
              </span>
              <span className="text-[10px] font-mono text-[#38bdf8] bg-[#38bdf8]/10 px-1.5 py-0.5 rounded">
                AST
              </span>
            </button>

            {/* DETERMINISTIC FINDINGS */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-[#71717a]">
                <span>AST FINDINGS</span>
                <span className="w-4 h-4 rounded-full bg-[#ef4444]/20 text-[#ef4444] text-[10px] flex items-center justify-center font-bold">
                  {analysisResult.findings.length}
                </span>
              </div>

              {analysisResult.findings.length === 0 ? (
                <div className="p-3 bg-[#202024] border border-[#2e2e34] rounded text-xs text-[#a1a1aa] text-center">
                  No breaking contract violations found.
                </div>
              ) : (
                analysisResult.findings.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFindingId(f.id)}
                    className={`p-2.5 rounded border transition cursor-pointer ${
                      selectedFinding?.id === f.id
                        ? 'bg-[#27272a] border-[#ef4444]/60 ring-1 ring-[#ef4444]/30'
                        : 'bg-[#202024] border-[#2e2e34] hover:bg-[#27272a]'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                          f.severity === 'high' ? 'bg-[#ef4444]' : 'bg-[#f97316]'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">{f.title}</div>
                        <div className="text-[11px] text-[#71717a] font-mono truncate">{f.filePath}</div>
                        <div className="text-[10px] text-[#a1a1aa] mt-0.5">
                          {f.affectedConsumersCount} impacted consumer(s)
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* CHANGED FILES IN PR */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-[#71717a]">
                <span>FILES CHANGED</span>
                <span className="text-[11px] text-[#71717a]">{scenario.changedFiles.length}</span>
              </div>
              <div className="space-y-1 text-xs font-mono max-h-48 overflow-y-auto">
                {scenario.changedFiles.map((file) => (
                  <div
                    key={file.filename}
                    onClick={() => {
                      setSelectedConsumerFile(file.filename);
                      setActiveTab('diff');
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer ${
                      activeDiffFile.filename === file.filename ? 'bg-[#27272a] text-white' : 'text-[#a1a1aa] hover:bg-[#202024]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FileDiff className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span className="truncate">{file.filename}</span>
                    </span>
                    <span className="text-[10px] text-[#22c55e] font-bold">+{file.additions}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Re-analyze Button */}
            <div className="pt-2">
              <button
                onClick={handleReanalyze}
                disabled={isReanalyzing}
                className="w-full h-8 bg-[#202024] hover:bg-[#27272a] border border-[#2e2e34] rounded flex items-center justify-center gap-2 text-xs text-[#d4d4d8] font-medium transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin text-[#38bdf8]' : ''}`} />
                <span>{isReanalyzing ? 'Running AST Reference Scanner...' : 'Re-run AST Pipeline'}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Center Editor Pane */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#141416] overflow-hidden">
          {/* Editor Tabs Bar */}
          <div className="h-9 bg-[#18181b] border-b border-[#27272a] flex items-center overflow-x-auto shrink-0">
            <div
              onClick={() => setActiveTab('diff')}
              className={`h-full px-4 border-r border-[#27272a] flex items-center space-x-2 text-xs cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-[#141416] text-white border-t-2 border-t-[#0284c7]'
                  : 'bg-[#18181b] text-[#71717a] hover:text-[#cccccc]'
              }`}
            >
              <FileDiff className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>{activeDiffFile.filename} (PR Diff)</span>
              <X className="w-3 h-3 text-[#71717a] hover:text-white" />
            </div>

            <div
              onClick={() => setActiveTab('consumer')}
              className={`h-full px-4 border-r border-[#27272a] flex items-center space-x-2 text-xs cursor-pointer ${
                activeTab === 'consumer'
                  ? 'bg-[#141416] text-white border-t-2 border-t-[#0284c7]'
                  : 'bg-[#18181b] text-[#71717a] hover:text-[#cccccc]'
              }`}
            >
              <span className="text-[#38bdf8] font-mono text-[11px]">⚛</span>
              <span>{selectedConsumerFile}</span>
            </div>

            <div
              onClick={() => setActiveTab('blastRadius')}
              className={`h-full px-4 border-r border-[#27272a] flex items-center space-x-2 text-xs cursor-pointer ${
                activeTab === 'blastRadius'
                  ? 'bg-[#141416] text-white border-t-2 border-t-[#0284c7]'
                  : 'bg-[#18181b] text-[#71717a] hover:text-[#cccccc]'
              }`}
            >
              <Workflow className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Blast Radius AST Graph</span>
            </div>
          </div>

          {/* Main Code Diff & Consumer Code View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'blastRadius' ? (
              /* Deterministic Blast Radius Pipeline Tree */
              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-[#38bdf8]" />
                      Deterministic Blast Radius AST Graph
                    </h3>
                    <p className="text-xs text-[#a1a1aa] mt-1">
                      Pure TypeScript Compiler API Symbol Scanner &amp; Reference Discovery Engine.
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 font-mono">
                    PR Diff → TypeScript AST → Consumer References → Scoped Evidence
                  </span>
                </div>

                {analysisResult.blastRadius.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#71717a]">
                    No changed symbol nodes found in this PR.
                  </div>
                ) : (
                  analysisResult.blastRadius.map((node, nIdx) => (
                    <div key={nIdx} className="flex flex-col items-center space-y-4 py-2 font-mono text-xs">
                      {/* Symbol definition node */}
                      <div className="p-3.5 bg-[#1e293b] border border-[#38bdf8]/40 rounded-lg text-center shadow-lg w-80">
                        <div className="text-[10px] text-[#38bdf8] font-bold uppercase tracking-wider">
                          1. Changed Symbol (AST {node.symbol.kind})
                        </div>
                        <div className="text-sm font-bold text-white mt-1">{node.symbol.name}</div>
                        <div className="text-[11px] text-[#94a3b8] mt-0.5">{node.symbol.filePath}</div>
                        {node.symbol.removedMembers && (
                          <div className="mt-2 flex items-center justify-center gap-2 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/50">
                              - {node.symbol.removedMembers.map((m) => `'${m}'`).join(', ')}
                            </span>
                            <span className="text-zinc-500">→</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                              + {node.symbol.addedMembers?.map((m) => `'${m}'`).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="w-0.5 h-6 bg-[#38bdf8]/40" />

                      {/* AST Reference Scanner */}
                      <div className="p-2.5 bg-[#202024] border border-[#2e2e34] rounded text-center text-xs text-[#d4d4d8] w-72">
                        <div className="text-[10px] text-[#a1a1aa] uppercase font-bold">2. AST Reference Scanner</div>
                        <div>Found {node.consumers.length} Project Consumer Call-sites</div>
                      </div>

                      {/* Consumer Branches */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl pt-2">
                        {node.consumers.map((consumer: ConsumerReference, cIdx: number) => {
                          const isHigh = consumer.checksValue !== undefined;
                          return (
                            <div
                              key={cIdx}
                              onClick={() => handleOpenConsumer(consumer.consumerFilePath, consumer.line)}
                              className={`p-3.5 bg-[#202024] rounded-lg cursor-pointer transition shadow-md border-2 ${
                                isHigh
                                  ? 'border-[#ef4444]/60 hover:border-[#ef4444]'
                                  : 'border-[#f97316]/60 hover:border-[#f97316]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white truncate">
                                  {consumer.consumerFilePath}:{consumer.line}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    isHigh
                                      ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
                                      : 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/40'
                                  }`}
                                >
                                  {isHigh ? '🔴 BREAKING' : '🟠 WARNING'}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#a1a1aa] mt-2 font-mono bg-[#141416] p-1.5 rounded border border-[#27272a] truncate">
                                {consumer.snippet}
                              </div>
                              <div className="mt-2 text-[11px] text-[#ef4444] leading-tight">
                                {consumer.checksValue
                                  ? `Strict comparison against removed variant '${consumer.checksValue}'`
                                  : `References modified symbol '${consumer.targetSymbolName}'`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'diff' ? (
              /* Raw Git Diff Patch Display */
              <div className="bg-[#18181b] border border-[#27272a] rounded overflow-hidden shadow-md">
                <div className="px-3.5 py-2 bg-[#202024] border-b border-[#27272a] text-xs font-mono text-[#a1a1aa] flex items-center justify-between">
                  <span>{activeDiffFile.filename}</span>
                  <span className="text-[11px] text-[#71717a]">Unified PR Diff</span>
                </div>
                <pre className="p-4 font-mono text-xs text-[#d4d4d8] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {activeDiffFile.patch || 'No patch text available for this file.'}
                </pre>
              </div>
            ) : (
              /* Dynamic Consumer File AST Inspector */
              <div className="bg-[#18181b] border border-[#27272a] rounded overflow-hidden shadow-md">
                <div className="px-3.5 py-2 bg-[#202024] border-b border-[#27272a] text-xs font-mono text-[#a1a1aa] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#38bdf8]">⚛</span>
                    <span className="text-white font-semibold">{selectedConsumerFile}</span>
                  </div>
                  <span className="text-[11px] text-[#ef4444]">Target Line: {highlightedLine}</span>
                </div>

                <div className="p-3 font-mono text-[13px] leading-relaxed">
                  {activeConsumerContent.split('\n').map((lineText, idx) => {
                    const lineNum = idx + 1;
                    const isTarget = lineNum === highlightedLine;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center px-1 -mx-1 ${
                          isTarget ? 'bg-[#450a0a]/50 text-[#fca5a5] border-l-2 border-[#ef4444]' : ''
                        }`}
                      >
                        <div className="w-4 flex justify-center select-none">
                          {isTarget && <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />}
                        </div>
                        <span
                          className={`w-8 text-right pr-4 select-none ${
                            isTarget ? 'text-[#fca5a5] font-bold' : 'text-[#52525b]'
                          }`}
                        >
                          {lineNum}
                        </span>
                        <span className={isTarget ? 'font-semibold text-white' : 'text-[#d4d4d8]'}>
                          {lineText || ' '}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: PR Sentinel Findings Panel */}
        <aside className="w-80 md:w-96 bg-[#18181b] border-l border-[#27272a] flex flex-col shrink-0 overflow-y-auto">
          {/* Header */}
          <div className="h-9 px-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa] border-b border-[#27272a]">
            <span>PR SENTINEL</span>
            <div className="flex items-center space-x-3 text-[#71717a]">
              <Sun className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
              <MoreHorizontal className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
              <X className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
            </div>
          </div>

          {selectedFinding ? (
            <div className="p-4 space-y-4">
              {/* Severity Pill */}
              <div>
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                    selectedFinding.severity === 'high'
                      ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/35'
                      : 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/35'
                  }`}
                >
                  {selectedFinding.severity === 'high' ? 'BREAKING CHANGE' : 'WARNING'}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-white">{selectedFinding.title}</h2>
                <div className="text-xs text-[#71717a] font-mono">{selectedFinding.filePath}</div>
              </div>

              {/* Transition Pills */}
              {selectedFinding.oldValue && selectedFinding.newValue && (
                <div className="flex items-center space-x-2 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#ef4444]/15 text-[#fca5a5] border border-[#ef4444]/30">
                    {selectedFinding.oldValue}
                  </span>
                  <span className="text-[#71717a]">→</span>
                  <span className="px-2.5 py-1 rounded bg-[#22c55e]/15 text-[#86efac] border border-[#22c55e]/30">
                    {selectedFinding.newValue}
                  </span>
                </div>
              )}

              {/* DETERMINISTIC IMPACT SECTION */}
              <div className="space-y-2 pt-2 border-t border-[#27272a]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                  IMPACTED CONSUMERS
                </div>
                <div className="text-xs text-[#71717a]">
                  Affects {selectedFinding.affectedConsumersCount} workspace consumer(s)
                </div>

                {/* Evidence Items */}
                <div className="space-y-2">
                  {selectedFinding.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleOpenConsumer(ev.file, ev.line)}
                      className="p-2.5 bg-[#202024] hover:bg-[#27272a] border border-[#2e2e34] rounded transition cursor-pointer"
                    >
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                        <span className={ev.severity === 'high' ? 'text-[#ef4444]' : 'text-[#f97316]'}>
                          {ev.severity === 'high' ? '🔴' : '🟠'}
                        </span>
                        <span>
                          {ev.file}:{ev.line}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#141416] text-[#e4e4e7] border border-[#27272a]">
                          {ev.snippet}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DETERMINISTIC EXPLANATION */}
              <div className="space-y-1.5 pt-2 border-t border-[#27272a]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">EXPLANATION</div>
                <p className="text-xs text-[#d4d4d8] leading-relaxed">{selectedFinding.explanation}</p>
              </div>

              {/* RECOMMENDATION */}
              <div className="space-y-1.5 pt-2 border-t border-[#27272a]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">RECOMMENDATION</div>
                <p className="text-xs text-[#d4d4d8] leading-relaxed">{selectedFinding.recommendation}</p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2 pt-3">
                {selectedFinding.evidence.length > 0 && (
                  <button
                    onClick={() =>
                      handleOpenConsumer(
                        selectedFinding.evidence[0].file,
                        selectedFinding.evidence[0].line
                      )
                    }
                    className="w-full h-8 bg-[#0284c7] hover:bg-[#0369a1] text-white font-medium text-xs rounded flex items-center justify-center gap-1.5 transition cursor-pointer shadow"
                  >
                    <span>Open {selectedFinding.evidence[0].file}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => setShowExplanationModal(true)}
                  className="w-full h-8 bg-[#202024] hover:bg-[#27272a] border border-[#2e2e34] text-[#d4d4d8] font-medium text-xs rounded flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#71717a]" />
                  <span>Why is this a problem?</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#71717a]">
              No breaking findings detected for this PR.
            </div>
          )}
        </aside>
      </div>

      {/* Live GitHub PR Fetch Modal */}
      {showFetchModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center space-x-2">
                <Github className="w-4 h-4 text-[#38bdf8]" />
                <h3 className="text-sm font-bold text-white">Fetch Live GitHub Pull Request</h3>
              </div>
              <button onClick={() => setShowFetchModal(false)} className="text-[#71717a] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#d4d4d8]">
              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1">
                  Repository (owner/repo)
                </label>
                <input
                  type="text"
                  value={githubRepoInput}
                  onChange={(e) => setGithubRepoInput(e.target.value)}
                  placeholder="e.g. facebook/react or vercel/next.js"
                  className="w-full bg-[#141416] border border-[#27272a] rounded px-3 py-2 text-xs text-white focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1">
                  Pull Request Number
                </label>
                <input
                  type="number"
                  value={githubPrNumberInput}
                  onChange={(e) => setGithubPrNumberInput(e.target.value)}
                  placeholder="e.g. 28000"
                  className="w-full bg-[#141416] border border-[#27272a] rounded px-3 py-2 text-xs text-white focus:border-[#38bdf8] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1">
                  GitHub Personal Access Token (Optional for public repos)
                </label>
                <input
                  type="password"
                  value={githubTokenInput}
                  onChange={(e) => setGithubTokenInput(e.target.value)}
                  placeholder="ghp_... (increases rate limit)"
                  className="w-full bg-[#141416] border border-[#27272a] rounded px-3 py-2 text-xs text-white focus:border-[#38bdf8] outline-none"
                />
              </div>

              {fetchError && (
                <div className="p-2.5 rounded bg-red-950/60 border border-red-800/60 text-red-300 text-xs">
                  {fetchError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#27272a]">
              <button
                onClick={() => setShowFetchModal(false)}
                className="px-3 py-1.5 bg-[#202024] hover:bg-[#27272a] text-[#d4d4d8] text-xs font-medium rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFetchLiveGitHubPR}
                disabled={isFetchingGithub}
                className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isFetchingGithub ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching API...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Fetch &amp; Analyze PR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Mismatch Explainer Modal */}
      {showExplanationModal && selectedFinding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#ef4444]" />
                <h3 className="text-sm font-bold text-white">Deterministic AST Evidence &amp; Blast Radius</h3>
              </div>
              <button onClick={() => setShowExplanationModal(false)} className="text-[#71717a] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#d4d4d8]">
              <p className="leading-relaxed">
                Deterministic AST parsing identified that symbol{' '}
                <code className="text-[#38bdf8] font-mono">{selectedFinding.title}</code> was altered in the PR diff:
              </p>

              <div className="bg-[#141416] p-3 rounded font-mono text-[11px] space-y-2 border border-[#27272a]">
                <div className="text-[#a1a1aa] font-bold">REMOVED VARIANTS</div>
                <div className="text-red-400">{selectedFinding.oldValue}</div>

                <div className="text-[#22c55e] font-bold pt-1">ADDED VARIANTS</div>
                <div className="text-emerald-400">{selectedFinding.newValue}</div>
              </div>

              <p className="text-[11px] text-[#a1a1aa]">
                The Reference Analyzer scanned all project AST nodes and isolated{' '}
                {selectedFinding.affectedConsumersCount} direct consumer site(s) requiring code updates.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#27272a]">
              <button
                onClick={() => setShowExplanationModal(false)}
                className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-medium rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VS Code Bottom Status Bar */}
      <footer className="h-6 bg-[#0284c7] text-white flex items-center px-3 justify-between text-[11px] shrink-0 select-none">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 hover:bg-[#0369a1] px-2 h-full cursor-pointer">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{scenario.pr.branchName || 'main'}*</span>
            <ArrowRight className="w-3 h-3 mx-0.5" />
          </div>
          <div className="flex items-center space-x-2">
            <span>⊗ {analysisResult.metrics.breakingCount}</span>
            <span>⚠ {analysisResult.metrics.warningCount}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span>AST Deterministic Engine</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span className="flex items-center gap-1">
            <Code2 className="w-3 h-3" />
            TypeScript Compiler API
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        </div>
      </footer>
    </div>
  );
}
