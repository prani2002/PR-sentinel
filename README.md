# PR Sentinel (Sprint 1)

PR Sentinel is a developer tool that detects potential **backend-to-frontend breaking changes** in GitHub Pull Requests using local TypeScript AST analysis and Gemini.

## Phase 1: Extension Scaffold

This phase delivers the core TypeScript project scaffold, manifest configuration, and VS Code command registration.

### Extension Commands

- **`PR Sentinel: Analyze Current PR`** (`pr-sentinel.analyzePR`)
  - Currently outputs placeholder status: `PR Sentinel is running.`

### Running and Testing in VS Code

1. Open this repository in VS Code.
2. Ensure dependencies are installed:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile-extension
   ```
4. Press **`F5`** (or go to **Run and Debug** and select **Run PR Sentinel Extension**).
5. A new **Extension Development Host** window will open.
6. In the new window, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
7. Run:
   ```text
   PR Sentinel: Analyze Current PR
   ```
8. You will see the notification:
   ```text
   PR Sentinel is running.
   ```

### Project Structure

```text
pr-sentinel/
├── .vscode/
│   ├── launch.json
│   └── tasks.json
├── src/
│   ├── extension/
│   │   ├── extension.ts
│   │   └── commands.ts
│   ├── github/
│   │   ├── githubClient.ts
│   │   └── pullRequest.ts
│   ├── analyzer/
│   │   ├── projectScanner.ts
│   │   ├── symbolAnalyzer.ts
│   │   ├── referenceAnalyzer.ts
│   │   └── riskDetector.ts
│   ├── ai/
│   │   ├── geminiClient.ts
│   │   └── prompts.ts
│   ├── models/
│   │   └── types.ts
│   └── ui/
│       └── findingsView.ts
├── package.json
├── tsconfig.json
└── README.md
```
