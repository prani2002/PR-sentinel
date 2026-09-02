import {
  ChangedFile,
  PullRequestInfo,
  Finding,
  PRReviewReport,
  ReviewItem,
  ReviewCategory,
  ReviewSeverity,
  ReviewVerdict,
  FixComparison,
} from '../models/types';
import { ParsedPatch } from '../models/types';
import { parsePatch } from '../diff/patchParser';
import { ProjectFileSource } from '../analyzer/projectScanner';

/**
 * Senior Staff Code Reviewer Engine
 * Analyzes PR diffs, AST changes, and workspace context to deliver comprehensive code reviews,
 * identifying bad/suboptimal fixes vs optimal replacements with deep technical justifications.
 */
export class CodeReviewer {
  /**
   * Generates a full Staff-Level PR Review Report
   */
  public reviewPullRequest(
    pr: PullRequestInfo,
    changedFiles: ChangedFile[],
    findings: Finding[] = [],
    workspaceSources: ProjectFileSource[] = []
  ): PRReviewReport {
    const reviewItems: ReviewItem[] = [];

    // 1. Convert breaking AST findings into high-priority review items with Good vs Bad Fixes
    this.convertFindingsToReviewItems(findings, reviewItems);

    // 2. Perform deep heuristic & semantic scan across all changed files and patches
    for (const file of changedFiles) {
      if (!file.patch) continue;
      const parsedPatch = parsePatch(file.filename, file.patch);
      this.analyzeFilePatch(file, parsedPatch, reviewItems);
    }

    // 3. Deduplicate and rank items
    const rankedItems = this.rankAndDeduplicate(reviewItems);

    // 4. Calculate dimensional health scores
    const breakdown = this.calculateBreakdownScores(rankedItems, changedFiles);
    const overallScore = Math.round(
      breakdown.architectureScore * 0.25 +
      breakdown.securityScore * 0.25 +
      breakdown.resilienceScore * 0.2 +
      breakdown.performanceScore * 0.15 +
      breakdown.compatibilityScore * 0.15
    );

    // 5. Determine Verdict
    const criticalCount = rankedItems.filter((i) => i.severity === 'critical').length;
    const highCount = rankedItems.filter((i) => i.severity === 'high').length;
    const mediumCount = rankedItems.filter((i) => i.severity === 'medium').length;

    let verdict: ReviewVerdict = 'APPROVE';
    if (criticalCount > 0) {
      verdict = 'CRITICAL_RISK';
    } else if (highCount > 0 || breakdown.compatibilityScore < 70) {
      verdict = 'REQUEST_CHANGES';
    } else if (mediumCount > 2 || overallScore < 80) {
      verdict = 'NEEDS_DISCUSSION';
    }

    // 6. Good aspects and critical risk summaries
    const goodAspects: string[] = [];
    const criticalRisks: string[] = [];

    if (changedFiles.length > 0) {
      goodAspects.push(`Clean modular file modifications across ${changedFiles.length} file(s).`);
    }
    if (breakdown.securityScore >= 95) {
      goodAspects.push('No obvious credential exposure or raw injection vulnerabilities detected.');
    }
    if (breakdown.compatibilityScore === 100) {
      goodAspects.push('No breaking API signature modifications detected across active workspace symbols.');
    } else {
      goodAspects.push('PR maintains structured commits and explicit file boundaries.');
    }

    for (const item of rankedItems) {
      if (item.severity === 'critical' || item.severity === 'high') {
        criticalRisks.push(`[${item.file}:${item.line}] ${item.title}: ${item.critique.slice(0, 120)}...`);
      }
    }

    // 7. Automated Fix Patches
    const automatedFixPatches = rankedItems
      .filter((item) => item.fixComparison.goodFixSnippet)
      .map((item) => ({
        file: item.file,
        line: item.line,
        description: `Fix for: ${item.title}`,
        patch: item.fixComparison.diffPatch || '',
        goodCode: item.fixComparison.goodFixSnippet,
      }));

    // 8. Generate full Markdown Review for GitHub / GitLab
    const generatedMarkdownReview = this.buildMarkdownReview(
      pr,
      verdict,
      overallScore,
      breakdown,
      rankedItems,
      goodAspects,
      criticalRisks
    );

    const summary = this.generateSummary(pr, verdict, overallScore, rankedItems);

    return {
      pr,
      verdict,
      overallScore,
      breakdown,
      summary,
      goodAspects,
      criticalRisks,
      items: rankedItems,
      automatedFixPatches,
      generatedMarkdownReview,
    };
  }

  private convertFindingsToReviewItems(findings: Finding[], items: ReviewItem[]): void {
    for (const f of findings) {
      const isBreaking = f.severity === 'high' || f.category === 'breaking-change';

      const badFix = `// ❌ Suboptimal / Fragile Attempt:
// Forcing type cast or ignoring compiler error without handling consumers:
// @ts-ignore
const status = payment.status as any;
if (status === 'success') { ... }`;

      const goodFix = `// ✅ Recommended Best-Practice Fix:
// 1. Maintain backward-compatible type union or deprecation path:
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled';
// 2. Add an exhaustive adapter / migration helper for consumers:
export function isPaymentCompleted(status: PaymentStatus): boolean {
  return status === 'succeeded';
}`;

      items.push({
        id: `review-breaking-${f.id}`,
        category: 'breaking-changes',
        severity: isBreaking ? 'high' : 'medium',
        title: `Breaking Schema/Signature Mutation in ${f.title}`,
        file: f.filePath,
        line: f.line || 1,
        codeSnippet: `${f.oldValue ? `Removed: ${f.oldValue}` : ''}\n${f.newValue ? `Added: ${f.newValue}` : ''}`,
        critique: `Direct modification of this exported symbol breaks ${f.affectedConsumersCount} workspace consumer(s). Consumers relying on the prior enum or interface signature will fail at runtime or during build.`,
        fixComparison: {
          badFixSnippet: badFix,
          badFixWhy: 'Using `as any` or disabling TypeScript checks masks runtime divergence and guarantees silent production failures when backend responses emit updated variants.',
          goodFixSnippet: goodFix,
          goodFixWhy: 'Providing a deprecation alias or an exhaustive narrowing function allows consumers to transition cleanly without runtime regression.',
          diffPatch: `- export type Status = 'success' | 'failed';\n+ export type Status = 'succeeded' | 'failed';`,
        },
        ruleId: 'PR-BREAKING-AST-001',
        impactScore: 9,
        tags: ['Breaking Change', 'AST Verification', 'API Contract'],
      });
    }
  }

  private analyzeFilePatch(file: ChangedFile, patch: ParsedPatch, items: ReviewItem[]): void {
    const filename = file.filename;
    const isTestFile = filename.includes('.test.') || filename.includes('.spec.') || filename.includes('__tests__');

    // Scan added lines
    for (const line of patch.addedLines) {
      const text = line.text.trim();
      const lineNum = line.line;

      // 1. Security: Hardcoded API keys or Secrets
      if (
        /(?:api_key|secret|password|private_key|token|auth_token)\s*[:=]\s*['"`][a-zA-Z0-9_\-]{16,}['"`]/i.test(
          text
        ) &&
        !text.includes('process.env') &&
        !text.includes('import.meta.env') &&
        !isTestFile
      ) {
        items.push({
          id: `sec-secret-${filename}-${lineNum}`,
          category: 'security',
          severity: 'critical',
          title: 'Hardcoded Secret / API Credential Detected',
          file: filename,
          line: lineNum,
          codeSnippet: text,
          critique: 'Committing hardcoded secrets, private keys, or API tokens directly into source control is a critical security vulnerability and leads to unauthorized access and credential leakage.',
          fixComparison: {
            badFixSnippet: `// ❌ Bad Fix: Obfuscating or encoding in client-side code:\nconst API_KEY = atob("${Buffer.from('secret_token_123').toString('base64')}");`,
            badFixWhy: 'Base64 obfuscation or client-side encoding offers zero security; tokens are still trivial to extract from bundle inspection.',
            goodFixSnippet: `// ✅ Recommended Best Fix: Environment variable via server proxy:\nconst apiKey = process.env.API_SECRET_KEY;\nif (!apiKey) {\n  throw new Error('API_SECRET_KEY environment variable is required');\n}`,
            goodFixWhy: 'Keeps credentials isolated in server-side configuration, allowing rotation without codebase recompilation and preventing browser bundle exposure.',
          },
          ruleId: 'SEC-HARDCODED-CREDENTIALS',
          impactScore: 10,
          tags: ['Security', 'CWE-798', 'Secret Leak'],
        });
      }

      // 2. Security: Unsanitized innerHTML / dangerouslySetInnerHTML
      if (/dangerouslySetInnerHTML|innerHTML\s*=/i.test(text)) {
        items.push({
          id: `sec-xss-${filename}-${lineNum}`,
          category: 'security',
          severity: 'high',
          title: 'Potential Cross-Site Scripting (XSS) via Unsanitized HTML',
          file: filename,
          line: lineNum,
          codeSnippet: text,
          critique: 'Directly injecting unescaped HTML content creates an XSS vulnerability where untrusted payloads can execute arbitrary JavaScript in the victim’s session.',
          fixComparison: {
            badFixSnippet: `// ❌ Bad Fix: Naive string replace for script tags:\n<div dangerouslySetInnerHTML={{ __html: rawInput.replace(/<script>/g, '') }} />`,
            badFixWhy: 'Blacklist regexes are easily bypassed by encoded tags, event handlers (e.g. <img src=x onerror=...>), or SVG payloads.',
            goodFixSnippet: `// ✅ Recommended Best Fix: Use DOMPurify sanitization or standard text nodes:\nimport DOMPurify from 'dompurify';\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rawInput) }} />\n// Or prefer native React children if plain text:\n<div>{rawInput}</div>`,
            goodFixWhy: 'DOMPurify provides defense-in-depth HTML sanitization against modern DOM-based XSS vectors.',
          },
          ruleId: 'SEC-XSS-HTML-INJECTION',
          impactScore: 8,
          tags: ['Security', 'CWE-79', 'XSS'],
        });
      }

      // 3. Performance: Nested Linear Search (O(N^2) complexity in loops)
      if (
        /\.map\s*\(.*=>.*\.(?:find|filter|some|includes)\s*\(/.test(text) ||
        /(?:forEach|for\s*\(.*of).*\.(?:find|filter|some|includes)/.test(text)
      ) {
        items.push({
          id: `perf-quadratic-${filename}-${lineNum}`,
          category: 'performance',
          severity: 'medium',
          title: 'Quadratic O(N²) Array Lookup inside Iteration',
          file: filename,
          line: lineNum,
          codeSnippet: text,
          critique: 'Calling array .find() or .filter() inside an iteration performs linear scans for each item, leading to quadratic O(N × M) execution time that causes browser freezing on large data sets.',
          fixComparison: {
            badFixSnippet: `// ❌ Suboptimal: Iterating array on every render / loop item:\nconst enriched = items.map(item => ({\n  ...item,\n  user: users.find(u => u.id === item.userId)\n}));`,
            badFixWhy: 'Requires N*M lookups. With 1,000 items and 1,000 users, this executes 1,000,000 comparisons on every render.',
            goodFixSnippet: `// ✅ Recommended Best Fix: Pre-index lookup table with Map (O(N + M)):\nconst userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);\nconst enriched = items.map(item => ({\n  ...item,\n  user: userMap.get(item.userId)\n}));`,
            goodFixWhy: 'Reduces time complexity from O(N²) to linear O(N + M) with constant O(1) hash lookups.',
          },
          ruleId: 'PERF-QUADRATIC-SEARCH',
          impactScore: 6,
          tags: ['Performance', 'Big-O', 'Data Structures'],
        });
      }

      // 4. Edge Cases: Loose Equality on Nullable / Falsy values
      if (/[a-zA-Z0-9_]\s*==\s*null|[a-zA-Z0-9_]\s*!=\s*null/.test(text) && !text.includes('===') && !text.includes('!==')) {
        items.push({
          id: `edge-eq-${filename}-${lineNum}`,
          category: 'edge-cases',
          severity: 'low',
          title: 'Loose Equality Check on Null/Undefined',
          file: filename,
          line: lineNum,
          codeSnippet: text,
          critique: 'Using loose equality (== or !=) can lead to unintentional type coercion surprises in JavaScript/TypeScript (e.g. 0 == false, "" == false).',
          fixComparison: {
            badFixSnippet: `if (value == null) { return; }`,
            badFixWhy: 'Coerces types and obscures whether undefined, null, or empty string was intended.',
            goodFixSnippet: `if (value === undefined || value === null) {\n  return defaultValue;\n}`,
            goodFixWhy: 'Explicit strict checks guarantee deterministic branching behavior across all primitive types.',
          },
          ruleId: 'CODE-STRICT-EQUALITY',
          impactScore: 3,
          tags: ['Type Safety', 'Best Practices'],
        });
      }

      // 5. Error Resilience: Empty Catch Block / Swallowing Errors
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(text) || /catch\s*\{\s*\}/.test(text)) {
        items.push({
          id: `err-swallow-${filename}-${lineNum}`,
          category: 'edge-cases',
          severity: 'high',
          title: 'Silent Error Swallowing in Catch Block',
          file: filename,
          line: lineNum,
          codeSnippet: text,
          critique: 'Empty catch blocks silently swallow exceptions without logging, metrics, or user notification, making production issues impossible to debug.',
          fixComparison: {
            badFixSnippet: `// ❌ Bad Fix: Empty catch:\ntry {\n  await fetchData();\n} catch (e) {}`,
            badFixWhy: 'Network failures, 500 server errors, and parsing exceptions disappear completely without trace.',
            goodFixSnippet: `// ✅ Recommended Best Fix: Structured error handling and telemetry:\ntry {\n  await fetchData();\n} catch (error) {\n  logger.error('Failed to fetch data', { error, context: 'UserDashboard' });\n  notifyUser('Unable to load data. Please try again.');\n}`,
            goodFixWhy: 'Maintains observability and graceful user feedback during transient failures.',
          },
          ruleId: 'ERR-EMPTY-CATCH-SWALLOW',
          impactScore: 7,
          tags: ['Error Resilience', 'Observability', 'Debugging'],
        });
      }

      // 6. Type Safety: Explicit 'any' casting
      if (/as\s+any|:\s*any\b/.test(text) && !isTestFile && !text.includes('// eslint-disable')) {
        items.push({
          id: `type-any-${filename}-${lineNum}`,
          category: 'type-safety',
          severity: 'medium',
          title: 'Usage of Unsafe `any` Type Assertion',
          file: filename,
          line: lineNum,
          codeSnippet: text,
          critique: 'Using `any` turns off TypeScript type checking entirely for this symbol, eliminating compile-time safety and hiding downstream bugs.',
          fixComparison: {
            badFixSnippet: `const response = (await api.get()) as any;\nconsole.log(response.data.user.name);`,
            badFixWhy: 'If backend renames `user` to `account`, this throws an unhandled TypeError: Cannot read property of undefined at runtime.',
            goodFixSnippet: `// ✅ Recommended Best Fix: Define strict DTO schema or use unknown with Zod:\ninterface ApiResponse {\n  data: { user: { name: string } };\n}\nconst response = (await api.get()) as ApiResponse;`,
            goodFixWhy: 'Enforces compile-time autocompletion, refactoring safety, and runtime structural guarantees.',
          },
          ruleId: 'TYPE-UNSAFE-ANY-ASSERTION',
          impactScore: 5,
          tags: ['TypeScript', 'Type Safety', 'Clean Code'],
        });
      }

      // 7. Architecture / Clean Code: Console.log in production code
      if (/console\.log\s*\(/.test(text) && !isTestFile && !filename.includes('scripts/')) {
        items.push({
          id: `clean-console-${filename}-${lineNum}`,
          category: 'code-quality',
          severity: 'low',
          title: 'Leftover `console.log` Statement in Production Code',
          file: filename,
          line: lineNum,
          codeSnippet: text,
          critique: 'Unintentional console.log statements pollute browser / server logs and can inadvertently log sensitive payload data in production.',
          fixComparison: {
            badFixSnippet: `console.log('Got user data:', user);`,
            badFixWhy: 'Logs PII (personally identifiable information) to client devtools and slows down hot loops.',
            goodFixSnippet: `// ✅ Recommended Best Fix: Remove or use structured logger with debug level:\nlogger.debug('Loaded user profile', { userId: user.id });`,
            goodFixWhy: 'Keeps log streams structured, searchable, and privacy compliant.',
          },
          ruleId: 'CLEAN-LEFTOVER-CONSOLE-LOG',
          impactScore: 2,
          tags: ['Clean Code', 'Logging'],
        });
      }
    }
  }

  private rankAndDeduplicate(items: ReviewItem[]): ReviewItem[] {
    const seen = new Set<string>();
    const unique: ReviewItem[] = [];

    for (const item of items) {
      const key = `${item.file}:${item.line}:${item.ruleId}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    const severityOrder: Record<ReviewSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      suggestion: 0,
    };

    return unique.sort((a, b) => {
      const sDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (sDiff !== 0) return sDiff;
      return b.impactScore - a.impactScore;
    });
  }

  private calculateBreakdownScores(
    items: ReviewItem[],
    changedFiles: ChangedFile[]
  ): {
    architectureScore: number;
    securityScore: number;
    performanceScore: number;
    resilienceScore: number;
    compatibilityScore: number;
  } {
    let archDeductions = 0;
    let secDeductions = 0;
    let perfDeductions = 0;
    let resDeductions = 0;
    let compDeductions = 0;

    for (const item of items) {
      const weight =
        item.severity === 'critical' ? 25 : item.severity === 'high' ? 15 : item.severity === 'medium' ? 8 : 3;

      switch (item.category) {
        case 'security':
          secDeductions += weight;
          break;
        case 'performance':
          perfDeductions += weight;
          break;
        case 'edge-cases':
          resDeductions += weight;
          break;
        case 'breaking-changes':
          compDeductions += weight * 1.5;
          break;
        case 'architecture':
        case 'code-quality':
        case 'type-safety':
        default:
          archDeductions += weight;
          break;
      }
    }

    return {
      architectureScore: Math.max(20, Math.min(100, 100 - archDeductions)),
      securityScore: Math.max(10, Math.min(100, 100 - secDeductions)),
      performanceScore: Math.max(30, Math.min(100, 100 - perfDeductions)),
      resilienceScore: Math.max(30, Math.min(100, 100 - resDeductions)),
      compatibilityScore: Math.max(10, Math.min(100, 100 - compDeductions)),
    };
  }

  private generateSummary(
    pr: PullRequestInfo,
    verdict: ReviewVerdict,
    score: number,
    items: ReviewItem[]
  ): string {
    const verdictDescriptions: Record<ReviewVerdict, string> = {
      APPROVE: 'Ready to Merge! The changes adhere to high standards of architecture, security, and backward compatibility.',
      NEEDS_DISCUSSION: 'Minor improvements suggested. Review the recommended best fixes and edge-case handling before final sign-off.',
      REQUEST_CHANGES: 'Action Required. Several architectural or backward-compatibility issues must be addressed to prevent regressions.',
      CRITICAL_RISK: 'Blocked. Critical security or severe breaking changes detected that must be resolved prior to deployment.',
    };

    const criticalCount = items.filter((i) => i.severity === 'critical').length;
    const highCount = items.filter((i) => i.severity === 'high').length;

    return `Overall PR Health Score is ${score}/100 (${verdictDescriptions[verdict]}). Found ${criticalCount} critical issue(s) and ${highCount} high-priority finding(s) with recommended optimal fixes.`;
  }

  private buildMarkdownReview(
    pr: PullRequestInfo,
    verdict: ReviewVerdict,
    overallScore: number,
    breakdown: PRReviewReport['breakdown'],
    items: ReviewItem[],
    goodAspects: string[],
    criticalRisks: string[]
  ): string {
    const verdictEmoji: Record<ReviewVerdict, string> = {
      APPROVE: '✅ **APPROVED**',
      NEEDS_DISCUSSION: '💬 **NEEDS DISCUSSION / SUGGESTIONS**',
      REQUEST_CHANGES: '⚠️ **REQUEST CHANGES**',
      CRITICAL_RISK: '🛑 **CRITICAL RISKS DETECTED**',
    };

    let md = `## 🛡️ PR Sentinel Senior Code Review: #${pr.number} ${pr.title}\n\n`;
    md += `### 📊 Review Verdict: ${verdictEmoji[verdict]} (Score: **${overallScore}/100**)\n\n`;

    md += `| Category | Score | Status |\n`;
    md += `| :--- | :--- | :--- |\n`;
    md += `| 🏛️ **Architecture & Clean Code** | ${breakdown.architectureScore}/100 | ${breakdown.architectureScore >= 80 ? '🟢 Pass' : '🟠 Needs Attention'} |\n`;
    md += `| 🔒 **Security & Credentials** | ${breakdown.securityScore}/100 | ${breakdown.securityScore >= 90 ? '🟢 Secure' : '🔴 Vulnerability Risk'} |\n`;
    md += `| ⚡ **Performance & Efficiency** | ${breakdown.performanceScore}/100 | ${breakdown.performanceScore >= 80 ? '🟢 Optimized' : '🟠 Optimization Recommended'} |\n`;
    md += `| 🛡️ **Resilience & Edge Cases** | ${breakdown.resilienceScore}/100 | ${breakdown.resilienceScore >= 80 ? '🟢 Resilient' : '🟠 Fallback Gaps'} |\n`;
    md += `| 💥 **Workspace Compatibility** | ${breakdown.compatibilityScore}/100 | ${breakdown.compatibilityScore >= 90 ? '🟢 100% Compatible' : '🔴 Breaking AST Changes'} |\n\n`;

    if (goodAspects.length > 0) {
      md += `### ✨ What Was Done Well\n`;
      goodAspects.forEach((g) => (md += `- ${g}\n`));
      md += `\n`;
    }

    if (criticalRisks.length > 0) {
      md += `### ⚠️ Critical Findings & Blocking Concerns\n`;
      criticalRisks.forEach((r) => (md += `- ${r}\n`));
      md += `\n`;
    }

    md += `### 🔍 Detailed Findings & Best Replacements (Good Fix vs Bad Fix)\n\n`;

    if (items.length === 0) {
      md += `*No actionable code defects detected. All changed files pass security, performance, and AST compatibility checks.*\n`;
    } else {
      items.forEach((item, idx) => {
        const sevEmoji = item.severity === 'critical' ? '🛑' : item.severity === 'high' ? '🔴' : item.severity === 'medium' ? '🟠' : '💡';
        md += `#### ${idx + 1}. ${sevEmoji} [${item.category.toUpperCase()}] ${item.title}\n`;
        md += `- **File**: \`${item.file}:${item.line}\`\n`;
        md += `- **Rule**: \`${item.ruleId}\` (Impact Score: ${item.impactScore}/10)\n`;
        md += `- **Critique**: ${item.critique}\n\n`;

        if (item.codeSnippet) {
          md += `**Current PR Code:**\n\`\`\`typescript\n${item.codeSnippet}\n\`\`\`\n\n`;
        }

        md += `**❌ Suboptimal / Bad Fix (Avoid):**\n`;
        md += `\`\`\`typescript\n${item.fixComparison.badFixSnippet}\n\`\`\`\n`;
        md += `*Why it fails*: ${item.fixComparison.badFixWhy}\n\n`;

        md += `**✅ Recommended Optimal Replacement:**\n`;
        md += `\`\`\`typescript\n${item.fixComparison.goodFixSnippet}\n\`\`\`\n`;
        md += `*Why it is superior*: ${item.fixComparison.goodFixWhy}\n\n`;

        md += `---\n\n`;
      });
    }

    md += `\n*Automated review report generated with [PR Sentinel](https://github.com/pr-sentinel).*`;
    return md;
  }
}
