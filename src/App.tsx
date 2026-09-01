import React, { useState } from 'react';
import { Terminal, Shield, CheckCircle2, Play, FolderTree, Code2, Layers, X, FileCode2, ChevronRight, ChevronDown, GitBranch, AlertCircle, Info, Sparkles } from 'lucide-react';

export default function App() {
  const [commandOutput, setCommandOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'extension.ts' | 'commands.ts' | 'types.ts' | 'geminiClient.ts'>('extension.ts');
  const [showNotification, setShowNotification] = useState(false);

  const handleRunCommand = () => {
    setIsRunning(true);
    setCommandOutput(null);
    setShowNotification(false);
    setTimeout(() => {
      setIsRunning(false);
      setCommandOutput('PR Sentinel is running.');
      setShowNotification(true);
    }, 350);
  };

  const codeSnippets: Record<string, { lang: string; code: string; highlight: React.ReactNode }> = {
    'extension.ts': {
      lang: 'TS',
      code: 'extension.ts',
      highlight: (
        <div className="font-mono text-[13px] leading-relaxed text-[#d4d4d4] space-y-1">
          <div><span className="text-[#c586c0]">import</span> * <span className="text-[#c586c0]">as</span> <span className="text-[#9cdcfe]">vscode</span> <span className="text-[#c586c0]">from</span> <span className="text-[#ce9178]">&apos;vscode&apos;</span>;</div>
          <div><span className="text-[#c586c0]">import</span> &#123; <span className="text-[#dcdcaa]">registerCommands</span> &#125; <span className="text-[#c586c0]">from</span> <span className="text-[#ce9178]">&apos;./commands&apos;</span>;</div>
          <div className="py-1 text-[#6a9955]">// Extension activation entry point</div>
          <div><span className="text-[#569cd6]">export</span> <span className="text-[#569cd6]">function</span> <span className="text-[#dcdcaa]">activate</span>(<span className="text-[#9cdcfe]">context</span>: <span className="text-[#4ec9b0]">vscode.ExtensionContext</span>): <span className="text-[#4ec9b0]">void</span> &#123;</div>
          <div className="pl-4"><span className="text-[#9cdcfe]">console</span>.<span className="text-[#dcdcaa]">log</span>(<span className="text-[#ce9178]">&apos;PR Sentinel extension is now active.&apos;</span>);</div>
          <div className="pl-4"><span className="text-[#dcdcaa]">registerCommands</span>(<span className="text-[#9cdcfe]">context</span>);</div>
          <div>&#125;</div>
          <div className="py-1 text-[#6a9955]">// Extension deactivation</div>
          <div><span className="text-[#569cd6]">export</span> <span className="text-[#569cd6]">function</span> <span className="text-[#dcdcaa]">deactivate</span>(): <span className="text-[#4ec9b0]">void</span> &#123;</div>
          <div className="pl-4"><span className="text-[#9cdcfe]">console</span>.<span className="text-[#dcdcaa]">log</span>(<span className="text-[#ce9178]">&apos;PR Sentinel extension is now deactivated.&apos;</span>);</div>
          <div>&#125;</div>
        </div>
      ),
    },
    'commands.ts': {
      lang: 'TS',
      code: 'commands.ts',
      highlight: (
        <div className="font-mono text-[13px] leading-relaxed text-[#d4d4d4] space-y-1">
          <div><span className="text-[#c586c0]">import</span> * <span className="text-[#c586c0]">as</span> <span className="text-[#9cdcfe]">vscode</span> <span className="text-[#c586c0]">from</span> <span className="text-[#ce9178]">&apos;vscode&apos;</span>;</div>
          <div className="py-1 text-[#6a9955]">// Register PR Sentinel commands</div>
          <div><span className="text-[#569cd6]">export</span> <span className="text-[#569cd6]">function</span> <span className="text-[#dcdcaa]">registerCommands</span>(<span className="text-[#9cdcfe]">context</span>: <span className="text-[#4ec9b0]">vscode.ExtensionContext</span>): <span className="text-[#4ec9b0]">void</span> &#123;</div>
          <div className="pl-4"><span className="text-[#569cd6]">const</span> <span className="text-[#9cdcfe]">analyzePRCommand</span> = <span className="text-[#9cdcfe]">vscode</span>.<span className="text-[#9cdcfe]">commands</span>.<span className="text-[#dcdcaa]">registerCommand</span>(</div>
          <div className="pl-8"><span className="text-[#ce9178]">&apos;pr-sentinel.analyzePR&apos;</span>,</div>
          <div className="pl-8"><span className="text-[#569cd6]">async</span> () =&gt; &#123;</div>
          <div className="pl-12 text-[#6a9955]">// Phase 1 minimal placeholder response</div>
          <div className="pl-12"><span className="text-[#9cdcfe]">vscode</span>.<span className="text-[#9cdcfe]">window</span>.<span className="text-[#dcdcaa]">showInformationMessage</span>(<span className="text-[#ce9178]">&apos;PR Sentinel is running.&apos;</span>);</div>
          <div className="pl-8">&#125;</div>
          <div className="pl-4">);</div>
          <div className="pl-4"><span className="text-[#9cdcfe]">context</span>.<span className="text-[#9cdcfe]">subscriptions</span>.<span className="text-[#dcdcaa]">push</span>(<span className="text-[#9cdcfe]">analyzePRCommand</span>);</div>
          <div>&#125;</div>
        </div>
      ),
    },
    'types.ts': {
      lang: 'TS',
      code: 'types.ts',
      highlight: (
        <div className="font-mono text-[13px] leading-relaxed text-[#d4d4d4] space-y-1">
          <div><span className="text-[#569cd6]">export</span> <span className="text-[#569cd6]">interface</span> <span className="text-[#4ec9b0]">PullRequestInfo</span> &#123;</div>
          <div className="pl-4"><span className="text-[#9cdcfe]">owner</span>: <span className="text-[#4ec9b0]">string</span>; <span className="text-[#9cdcfe]">repository</span>: <span className="text-[#4ec9b0]">string</span>; <span className="text-[#9cdcfe]">number</span>: <span className="text-[#4ec9b0]">number</span>;</div>
          <div className="pl-4"><span className="text-[#9cdcfe]">title</span>: <span className="text-[#4ec9b0]">string</span>; <span className="text-[#9cdcfe]">baseSha</span>: <span className="text-[#4ec9b0]">string</span>; <span className="text-[#9cdcfe]">headSha</span>: <span className="text-[#4ec9b0]">string</span>;</div>
          <div>&#125;</div>
          <div className="py-1"><span className="text-[#569cd6]">export</span> <span className="text-[#569cd6]">interface</span> <span className="text-[#4ec9b0]">Finding</span> &#123;</div>
          <div className="pl-4"><span className="text-[#9cdcfe]">severity</span>: <span className="text-[#ce9178]">&apos;low&apos;</span> | <span className="text-[#ce9178]">&apos;medium&apos;</span> | <span className="text-[#ce9178]">&apos;high&apos;</span>;</div>
          <div className="pl-4"><span className="text-[#9cdcfe]">category</span>: <span className="text-[#4ec9b0]">string</span>; <span className="text-[#9cdcfe]">title</span>: <span className="text-[#4ec9b0]">string</span>; <span className="text-[#9cdcfe]">explanation</span>: <span className="text-[#4ec9b0]">string</span>;</div>
          <div className="pl-4"><span className="text-[#9cdcfe]">evidence</span>: <span className="text-[#4ec9b0]">Evidence</span>[];</div>
          <div>&#125;</div>
        </div>
      ),
    },
    'geminiClient.ts': {
      lang: 'TS',
      code: 'geminiClient.ts',
      highlight: (
        <div className="font-mono text-[13px] leading-relaxed text-[#d4d4d4] space-y-1">
          <div><span className="text-[#569cd6]">export</span> <span className="text-[#569cd6]">class</span> <span className="text-[#4ec9b0]">GeminiClient</span> &#123;</div>
          <div className="pl-4"><span className="text-[#c586c0]">private</span> <span className="text-[#9cdcfe]">apiKey</span>?: <span className="text-[#4ec9b0]">string</span>;</div>
          <div className="pl-4 py-1"><span className="text-[#c586c0]">constructor</span>(<span className="text-[#9cdcfe]">apiKey</span>?: <span className="text-[#4ec9b0]">string</span>) &#123;</div>
          <div className="pl-8"><span className="text-[#9cdcfe]">this</span>.<span className="text-[#9cdcfe]">apiKey</span> = <span className="text-[#9cdcfe]">apiKey</span>;</div>
          <div className="pl-4">&#125;</div>
          <div className="pl-4 py-1 text-[#6a9955]">// Phase 5: isolated Gemini reasoning interface</div>
          <div>&#125;</div>
        </div>
      ),
    },
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#1e1e1e] text-[#cccccc] font-sans overflow-x-hidden select-none">
      {/* VS Code Title Bar */}
      <header className="h-9 bg-[#323233] border-b border-[#252526] flex items-center justify-between px-3 text-xs text-[#969696] shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-[#f14c4c] opacity-80 hover:opacity-100 transition-opacity"></div>
            <div className="w-3 h-3 rounded-full bg-[#e2c08d] opacity-80 hover:opacity-100 transition-opacity"></div>
            <div className="w-3 h-3 rounded-full bg-[#70c268] opacity-80 hover:opacity-100 transition-opacity"></div>
          </div>
          <span className="font-semibold text-[#cccccc] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#007acc]" />
            PR Sentinel
          </span>
          <div className="hidden sm:flex space-x-3 text-[11px] text-[#969696]">
            <span className="hover:text-white cursor-pointer transition-colors">File</span>
            <span className="hover:text-white cursor-pointer transition-colors">Edit</span>
            <span className="hover:text-white cursor-pointer transition-colors">Selection</span>
            <span className="hover:text-white cursor-pointer transition-colors">View</span>
            <span className="hover:text-white cursor-pointer transition-colors">Go</span>
            <span className="hover:text-white cursor-pointer transition-colors">Run</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terminal</span>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden md:flex justify-center">
          <div className="w-full max-w-[420px] h-6 bg-[#3c3c3c] rounded border border-[#454545] flex items-center justify-center text-[11px] text-[#cccccc] px-3 shadow-inner">
            <span className="opacity-60 mr-1.5">pr-sentinel —</span> Phase 1 Extension Development Host
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#007acc]/20 text-[#007acc] border border-[#007acc]/40 font-mono font-medium">
            Phase 1 Active
          </span>
        </div>
      </header>

      {/* Main IDE Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <aside className="w-12 bg-[#333333] border-r border-[#252526] flex flex-col items-center py-3 space-y-4 text-[#858585] shrink-0">
          <button className="p-2 text-white border-l-2 border-[#007acc] w-full flex justify-center hover:text-white transition-colors" title="Explorer">
            <FolderTree className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-[#cccccc] transition-colors" title="Run & Debug">
            <Play className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-[#cccccc] transition-colors" title="Source Control">
            <GitBranch className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-[#cccccc] transition-colors" title="Extensions">
            <Layers className="w-5 h-5" />
          </button>
        </aside>

        {/* Sidebar: Explorer / Architecture */}
        <aside className="w-64 md:w-72 bg-[#252526] border-r border-[#3c3c3c] flex flex-col shrink-0 overflow-y-auto">
          <div className="h-9 px-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#969696] border-b border-[#333333]">
            <span className="flex items-center gap-1.5">
              <ChevronDown className="w-3.5 h-3.5" />
              Explorer: PR-SENTINEL
            </span>
          </div>

          {/* File Tree View */}
          <div className="py-2 text-[13px] font-mono">
            <div className="flex items-center px-4 py-1 text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer">
              <span className="mr-1.5 text-xs text-[#969696]">▼</span>
              <span className="font-semibold text-[#cccccc]">src</span>
            </div>

            <div className="pl-4">
              <div className="flex items-center px-3 py-1 text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer">
                <span className="mr-1.5 text-xs text-[#969696]">▼</span>
                <span className="text-[#4ec9b0] font-medium">extension</span>
              </div>
              <div
                onClick={() => setActiveTab('extension.ts')}
                className={`flex items-center pl-8 pr-3 py-1 text-xs cursor-pointer transition-colors ${
                  activeTab === 'extension.ts' ? 'bg-[#37373d] text-white font-medium' : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                }`}
              >
                <span className="text-[#519aba] font-bold mr-2 text-[11px]">TS</span>
                <span>extension.ts</span>
              </div>
              <div
                onClick={() => setActiveTab('commands.ts')}
                className={`flex items-center pl-8 pr-3 py-1 text-xs cursor-pointer transition-colors ${
                  activeTab === 'commands.ts' ? 'bg-[#37373d] text-white font-medium' : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                }`}
              >
                <span className="text-[#519aba] font-bold mr-2 text-[11px]">TS</span>
                <span>commands.ts</span>
              </div>
            </div>

            <div className="pl-4">
              <div className="flex items-center px-3 py-1 text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer">
                <span className="mr-1.5 text-xs text-[#969696]">▼</span>
                <span className="text-[#4ec9b0] font-medium">models</span>
              </div>
              <div
                onClick={() => setActiveTab('types.ts')}
                className={`flex items-center pl-8 pr-3 py-1 text-xs cursor-pointer transition-colors ${
                  activeTab === 'types.ts' ? 'bg-[#37373d] text-white font-medium' : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                }`}
              >
                <span className="text-[#519aba] font-bold mr-2 text-[11px]">TS</span>
                <span>types.ts</span>
              </div>
            </div>

            <div className="pl-4">
              <div className="flex items-center px-3 py-1 text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer">
                <span className="mr-1.5 text-xs text-[#969696]">▼</span>
                <span className="text-[#4ec9b0] font-medium">ai</span>
              </div>
              <div
                onClick={() => setActiveTab('geminiClient.ts')}
                className={`flex items-center pl-8 pr-3 py-1 text-xs cursor-pointer transition-colors ${
                  activeTab === 'geminiClient.ts' ? 'bg-[#37373d] text-white font-medium' : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                }`}
              >
                <span className="text-[#519aba] font-bold mr-2 text-[11px]">TS</span>
                <span>geminiClient.ts</span>
              </div>
            </div>

            {/* Root Config Files */}
            <div className="pt-2">
              <div className="flex items-center px-4 py-1 text-xs text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer">
                <span className="text-[#e37933] font-bold mr-2 text-[11px]">&#123; &#125;</span>
                <span>package.json</span>
              </div>
              <div className="flex items-center px-4 py-1 text-xs text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer">
                <span className="text-[#519aba] font-bold mr-2 text-[11px]">TS</span>
                <span>tsconfig.json</span>
              </div>
              <div className="flex items-center px-4 py-1 text-xs text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer">
                <span className="text-[#007acc] font-bold mr-2 text-[11px]">MD</span>
                <span>README.md</span>
              </div>
            </div>
          </div>

          {/* Quick Roadmap section in sidebar */}
          <div className="mt-auto border-t border-[#333333] p-3 space-y-2 bg-[#1e1e1e]/60">
            <div className="text-[11px] font-bold uppercase text-[#969696] flex items-center justify-between">
              <span>SPRINT 1 PROGRESS</span>
              <span className="text-[#007acc] font-mono">1 / 9</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between py-0.5 text-emerald-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Phase 1: Scaffold
                </span>
                <span className="text-[9px] bg-emerald-500/20 px-1 rounded">DONE</span>
              </div>
              <div className="flex items-center justify-between py-0.5 text-[#969696]">
                <span className="flex items-center gap-1.5 pl-4.5">Phase 2: GitHub Client</span>
                <span className="text-[9px] text-[#007acc]">NEXT</span>
              </div>
              <div className="flex items-center justify-between py-0.5 text-[#666666]">
                <span className="flex items-center gap-1.5 pl-4.5">Phase 3: AST Scanner</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Editor & Work Area */}
        <main className="flex-1 flex flex-col relative bg-[#1e1e1e] overflow-y-auto">
          {/* Editor Tab Bar */}
          <div className="h-9 bg-[#252526] flex items-center border-b border-[#1e1e1e] overflow-x-auto shrink-0">
            {Object.keys(codeSnippets).map((filename) => {
              const isActive = activeTab === filename;
              return (
                <div
                  key={filename}
                  onClick={() => setActiveTab(filename as any)}
                  className={`h-full px-4 border-r border-[#1e1e1e] flex items-center space-x-2 text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                      : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#282828] hover:text-[#cccccc]'
                  }`}
                >
                  <span className="text-[#519aba] font-mono font-bold text-[11px]">TS</span>
                  <span>{filename}</span>
                  <span className="ml-2 text-[#969696] hover:text-white">×</span>
                </div>
              );
            })}
          </div>

          {/* Workbench Grid Layout */}
          <div className="p-6 max-w-5xl space-y-6">
            {/* Command Runner Banner (QuickPick Simulation) */}
            <div className="bg-[#252526] border border-[#454545] rounded shadow-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#333333] pb-3">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-[#007acc]" />
                  <span className="text-xs font-semibold text-white tracking-wide uppercase">Command Palette Test Bed</span>
                </div>
                <span className="text-[11px] text-[#969696] font-mono">VS Code Extension Host</span>
              </div>

              <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-[#007acc] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#70c268] animate-pulse"></span>
                      &gt; PR Sentinel: Analyze Current PR
                    </div>
                    <p className="text-[12px] text-[#969696]">
                      Command identifier: <code className="text-[#cccccc] font-mono bg-[#2d2d2d] px-1 py-0.5 rounded">pr-sentinel.analyzePR</code>
                    </p>
                  </div>

                  <button
                    id="run-command-btn"
                    onClick={handleRunCommand}
                    disabled={isRunning}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#094771] disabled:opacity-50 text-white font-medium text-xs rounded transition cursor-pointer shadow"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isRunning ? 'Executing...' : 'Execute Command'}
                  </button>
                </div>
              </div>
            </div>

            {/* Code Viewer Stage */}
            <div className="bg-[#1e1e1e] border border-[#333333] rounded overflow-hidden shadow-lg">
              <div className="bg-[#252526] px-4 py-2 border-b border-[#333333] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <FileCode2 className="w-4 h-4 text-[#007acc]" />
                  <span className="font-mono text-[#cccccc]">src/{activeTab === 'extension.ts' || activeTab === 'commands.ts' ? 'extension/' : activeTab === 'types.ts' ? 'models/' : 'ai/'}{activeTab}</span>
                </div>
                <span className="text-[11px] text-[#969696] font-mono">TypeScript Module</span>
              </div>
              <div className="p-4 overflow-x-auto bg-[#1e1e1e]">
                {codeSnippets[activeTab]?.highlight}
              </div>
            </div>

            {/* Two Column Section: Milestones & Testing Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phase 1 Verification Checklist */}
              <div className="bg-[#252526] border border-[#3c3c3c] rounded p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#cccccc] uppercase tracking-wider border-b border-[#333333] pb-2">
                  <CheckCircle2 className="w-4 h-4 text-[#70c268]" />
                  <span>Phase 1 Requirements Verification</span>
                </div>
                <ul className="space-y-2.5 text-xs text-[#cccccc]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#70c268] font-bold">✓</span>
                    <span>TypeScript project scaffold &amp; VS Code extension manifest</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#70c268] font-bold">✓</span>
                    <span>Structured folders: <code className="text-[#519aba] font-mono">extension</code>, <code className="text-[#519aba] font-mono">github</code>, <code className="text-[#519aba] font-mono">analyzer</code>, <code className="text-[#519aba] font-mono">ai</code>, <code className="text-[#519aba] font-mono">models</code>, <code className="text-[#519aba] font-mono">ui</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#70c268] font-bold">✓</span>
                    <span>Command registered: <code className="text-[#ce9178] font-mono">&apos;pr-sentinel.analyzePR&apos;</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#70c268] font-bold">✓</span>
                    <span>Minimal placeholder: <code className="text-[#ce9178] font-mono">&apos;PR Sentinel is running.&apos;</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#70c268] font-bold">✓</span>
                    <span><kbd className="bg-[#3c3c3c] px-1 py-0.5 rounded border border-[#555] text-[10px]">F5</kbd> Launch configuration (<code className="text-[#9cdcfe] font-mono">.vscode/launch.json</code>)</span>
                  </li>
                </ul>
              </div>

              {/* Step-by-Step Run Instructions */}
              <div className="bg-[#252526] border border-[#3c3c3c] rounded p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#cccccc] uppercase tracking-wider border-b border-[#333333] pb-2">
                  <Code2 className="w-4 h-4 text-[#007acc]" />
                  <span>How to test in VS Code</span>
                </div>
                <ol className="space-y-2 text-xs text-[#cccccc] list-decimal list-inside leading-relaxed">
                  <li>Open the workspace in VS Code.</li>
                  <li>Press <kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded border border-[#555] font-mono text-[11px]">F5</kbd> to launch the Extension Host window.</li>
                  <li>In the host window, press <kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded border border-[#555] font-mono text-[11px]">Ctrl+Shift+P</kbd> or <kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded border border-[#555] font-mono text-[11px]">Cmd+Shift+P</kbd>.</li>
                  <li>Select <span className="font-semibold text-white">PR Sentinel: Analyze Current PR</span>.</li>
                  <li>Observe popup notification: <span className="text-[#70c268] font-mono">&quot;PR Sentinel is running.&quot;</span></li>
                </ol>
              </div>
            </div>
          </div>

          {/* VS Code Floating Toast Notification (Simulated) */}
          {showNotification && (
            <div className="fixed bottom-10 right-6 w-80 bg-[#333333] border border-[#454545] shadow-2xl p-4 flex flex-col space-y-3 z-50 rounded animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="text-[#007acc]">
                    <Info className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-white font-medium">PR Sentinel</span>
                </div>
                <button
                  onClick={() => setShowNotification(false)}
                  className="text-[#969696] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-[#cccccc] font-mono pl-7">
                {commandOutput}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setShowNotification(false)}
                  className="bg-[#0e639c] text-white px-3 py-1 text-xs rounded hover:bg-[#1177bb] transition cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* VS Code Blue Status Bar */}
      <footer className="h-6 bg-[#007acc] text-white flex items-center px-3 justify-between text-[11px] shrink-0 select-none">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            <GitBranch className="w-3.5 h-3.5" />
            <span>main*</span>
          </div>
          <div className="flex items-center space-x-2 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            <div className="flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>0</span>
            </div>
            <div className="flex items-center space-x-1">
              <Info className="w-3.5 h-3.5" />
              <span>0</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="hover:bg-[#1f8ad2] px-2 h-full flex items-center cursor-pointer transition-colors">UTF-8</span>
          <span className="hover:bg-[#1f8ad2] px-2 h-full flex items-center cursor-pointer transition-colors">TypeScript</span>
          <div className="flex items-center space-x-1.5 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            <div className="w-2 h-2 rounded-full bg-white opacity-80 animate-pulse"></div>
            <span>PR Sentinel: Phase 1 Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

