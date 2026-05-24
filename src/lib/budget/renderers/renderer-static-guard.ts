import {
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import {
  dirname,
  join,
  relative,
} from "node:path";
import { fileURLToPath } from "node:url";

export type RendererStaticGuardIssueKind =
  | "forbidden_import"
  | "forbidden_keyword"
  | "dynamic_import"
  | "require_call"
  | "path_alias"
  | "re_export"
  | "restricted_usage";

export type RendererStaticGuardRuleType =
  | "full_text"
  | "import_pattern"
  | "restricted_usage";

export interface RendererStaticGuardIssue {
  file: string;
  line: number;
  rule: string;
  kind: RendererStaticGuardIssueKind;
  rule_type: RendererStaticGuardRuleType;
  match: string;
}

export interface RendererStaticGuardRuleSummary {
  label: string;
  kind: RendererStaticGuardIssueKind;
  rule_type: RendererStaticGuardRuleType;
  allowed_file_names?: string[];
}

export interface RendererStaticGuardReport {
  valid: boolean;
  scanned_files: string[];
  skipped_files: string[];
  issues: RendererStaticGuardIssue[];
  forbidden_rules_checked: RendererStaticGuardRuleSummary[];
  forbidden_rules: string[];
}

interface StaticGuardRule {
  label: string;
  kind: RendererStaticGuardIssueKind;
  rule_type: RendererStaticGuardRuleType;
  pattern: RegExp;
  allowedFileNames?: string[];
}

interface RendererStaticGuardOptions {
  rendererDir?: string;
}

const rendererDir = dirname(fileURLToPath(import.meta.url));

const skippedFileNames = new Set([
  "renderer-static-guard.ts",
  "demo-render-snapshot.ts",
  "demo-renderer-hardening.ts",
  "demo-formal-renderer-entry.ts",
  "demo-formal-file-writer-preflight.ts",
  "demo-file-writer-dry-run-hardening.ts",
  "demo-formal-file-writer-controlled-entry.ts",
  "run-renderer-static-guard.ts",
]);

const staticGuardRules: StaticGuardRule[] = [
  {
    label: "dynamic import",
    kind: "dynamic_import",
    rule_type: "full_text",
    pattern: /\bimport\s*\(/,
  },
  {
    label: "require call",
    kind: "require_call",
    rule_type: "full_text",
    pattern: /\brequire\s*\(/,
  },
  {
    label: "path alias @/",
    kind: "path_alias",
    rule_type: "import_pattern",
    pattern: /(?:from\s+["']@\/|import\s*\(\s*["']@\/|require\s*\(\s*["']@\/)/,
  },
  {
    label: "cross-file re-export",
    kind: "re_export",
    rule_type: "import_pattern",
    pattern: /export\s+(?:\*|\{[^}]*\})\s+from\s+["'][^"']+["']/,
  },
  {
    label: "budget-generator import",
    kind: "forbidden_import",
    rule_type: "import_pattern",
    pattern: /from\s+["'][^"']*budget-generator(?:\.ts)?["']/,
  },
  {
    label: "budget-generator token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bbudget-generator\b/,
  },
  {
    label: "generateBudgetEstimate",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bgenerateBudgetEstimate\b/,
  },
  {
    label: "mock-pricing token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bmock-pricing\b/,
  },
  {
    label: "seed-budget-catalog token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bseed-budget-catalog\b/,
  },
  {
    label: "material-code-resolver token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bmaterial-code-resolver\b/,
  },
  {
    label: "format-budget-output token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bformat-budget-output\b/,
  },
  {
    label: "LEGACY_BUDGET_OUTPUT_WARNING",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bLEGACY_BUDGET_OUTPUT_WARNING\b/,
  },
  {
    label: "rag",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\brag\b/i,
  },
  {
    label: "ai",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bai\b/i,
  },
  {
    label: "openai",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bopenai\b/i,
  },
  {
    label: "createFormalRendererToken restricted usage",
    kind: "restricted_usage",
    rule_type: "restricted_usage",
    pattern: /\bcreateFormalRendererToken\b/,
    allowedFileNames: [
      "formal-renderer-entry.ts",
      "formal-renderer-token.ts",
    ],
  },
  {
    label: "workbook library token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bworkbook\b/i,
  },
  {
    label: "xlsx package import",
    kind: "forbidden_import",
    rule_type: "import_pattern",
    pattern: /(?:from\s+["'][^"']*\bxlsx\b|import\s*\(\s*["'][^"']*\bxlsx\b|require\s*\(\s*["'][^"']*\bxlsx\b)/i,
  },
  {
    label: "pdfkit library token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bpdfkit\b/i,
  },
  {
    label: "jspdf library token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bjspdf\b/i,
  },
  {
    label: "puppeteer library token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bpuppeteer\b/i,
  },
  {
    label: "playwright library token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bplaywright\b/i,
  },
  {
    label: "html-pdf library token",
    kind: "forbidden_keyword",
    rule_type: "full_text",
    pattern: /\bhtml-pdf\b/i,
  },
  {
    label: "writeFileSync restricted usage",
    kind: "restricted_usage",
    rule_type: "restricted_usage",
    pattern: /\bwriteFileSync\b/,
    allowedFileNames: [
      "formal-placeholder-artifact-writer.ts",
    ],
  },
  {
    label: "createWriteStream restricted usage",
    kind: "restricted_usage",
    rule_type: "restricted_usage",
    pattern: /\bcreateWriteStream\b/,
    allowedFileNames: [
      "formal-placeholder-artifact-writer.ts",
    ],
  },
];

const collectTsFiles = (
  dir: string,
  rootDir: string,
  scannedFiles: string[],
  skippedFiles: string[],
): string[] =>
  readdirSync(dir)
    .flatMap((entry) => {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        return collectTsFiles(fullPath, rootDir, scannedFiles, skippedFiles);
      }

      if (!entry.endsWith(".ts")) {
        return [];
      }

      const relativePath = relative(rootDir, fullPath);
      if (skippedFileNames.has(entry)) {
        skippedFiles.push(relativePath);
        return [];
      }

      scannedFiles.push(relativePath);
      return [fullPath];
    });

const getLineNumber = (content: string, index: number): number =>
  content.slice(0, index).split(/\r?\n/).length;

const toGlobalPattern = (pattern: RegExp): RegExp => {
  const flags = new Set(pattern.flags.split(""));
  flags.add("g");
  return new RegExp(pattern.source, Array.from(flags).join(""));
};

const findRuleMatches = (
  content: string,
  rule: StaticGuardRule,
): Array<{ index: number; text: string }> =>
  Array.from(content.matchAll(toGlobalPattern(rule.pattern)))
    .filter((match) => match.index !== undefined)
    .map((match) => ({
      index: match.index ?? 0,
      text: match[0],
    }));

const fileNameFromPath = (filePath: string): string => {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] ?? filePath;
};

const ruleAllowedForFile = (
  rule: StaticGuardRule,
  filePath: string,
): boolean =>
  Boolean(rule.allowedFileNames?.includes(fileNameFromPath(filePath)));

const summarizeRules = (): RendererStaticGuardRuleSummary[] =>
  staticGuardRules.map((rule) => ({
    label: rule.label,
    kind: rule.kind,
    rule_type: rule.rule_type,
    allowed_file_names: rule.allowedFileNames,
  }));

export const scanRendererStaticGuardText = (
  content: string,
  filePath: string,
): RendererStaticGuardIssue[] => {
  const issues: RendererStaticGuardIssue[] = [];

  staticGuardRules.forEach((rule) => {
    if (ruleAllowedForFile(rule, filePath)) {
      return;
    }

    findRuleMatches(content, rule).forEach((match) => {
      issues.push({
        file: filePath,
        line: getLineNumber(content, match.index),
        rule: rule.label,
        kind: rule.kind,
        rule_type: rule.rule_type,
        match: match.text,
      });
    });
  });

  return issues;
};

export const runRendererStaticGuard = (
  options: RendererStaticGuardOptions = {},
): RendererStaticGuardReport => {
  const rootDir = options.rendererDir ?? rendererDir;
  const scannedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const issues: RendererStaticGuardIssue[] = [];
  const files = collectTsFiles(rootDir, rootDir, scannedFiles, skippedFiles);

  files.forEach((filePath) => {
    const content = readFileSync(filePath, "utf8");
    const relativePath = relative(rootDir, filePath);
    issues.push(...scanRendererStaticGuardText(content, relativePath));
  });

  return {
    valid: issues.length === 0,
    scanned_files: scannedFiles.sort(),
    skipped_files: skippedFiles.sort(),
    issues,
    forbidden_rules_checked: summarizeRules(),
    forbidden_rules: staticGuardRules.map((rule) => rule.label),
  };
};
