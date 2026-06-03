import { readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  BudgetHarnessStaticGuardIssue,
  BudgetHarnessStaticGuardReport,
} from "./types.ts";

interface StaticGuardRule {
  label: string;
  pattern: RegExp;
  message: string;
}

const integrationDir = dirname(fileURLToPath(import.meta.url));

const scannedFiles = [
  "types.ts",
  "fixture-placeholder-project-brief.ts",
  "fixture-placeholder-plan-quantities.ts",
  "build-budget-input-bundle.ts",
  "demo-budget-harness-mvp.ts",
];

const rules: StaticGuardRule[] = [
  {
    label: "renderer import",
    pattern: /from\s+["'][^"']*renderers[\\/][^"']*["']/,
    message: "Minimal dry-run entry must not import renderer modules.",
  },
  {
    label: "payment import",
    pattern: /from\s+["'][^"']*(payment|escrow|listing)[^"']*["']/i,
    message: "Minimal dry-run entry must not import payment, escrow, or listing modules.",
  },
  {
    label: "AI / RAG import",
    pattern: /from\s+["'][^"']*(openai|rag|ai-api|ai_api|llm)[^"']*["']/i,
    message: "Minimal dry-run entry must not import AI or RAG modules.",
  },
  {
    label: "DB / Supabase import",
    pattern: /from\s+["'][^"']*(supabase|database|db)[^"']*["']/i,
    message: "Minimal dry-run entry must not import DB or Supabase modules.",
  },
  {
    label: "n8n / webhook import",
    pattern: /from\s+["'][^"']*(n8n|webhook)[^"']*["']/i,
    message: "Minimal dry-run entry must not import n8n or webhook modules.",
  },
  {
    label: "formal price",
    pattern: /formal_price_generated:\s*true|formal_quote_generated:\s*true/,
    message: "Minimal dry-run entry must not enable formal price or quote generation.",
  },
  {
    label: "PricingRule write",
    pattern: /pricing_rule_written:\s*true|pricing_rules\s*\.\s*(push|splice)|writePricingRule|createPricingRule/,
    message: "Minimal dry-run entry must not write pricing rules.",
  },
  {
    label: "BudgetEstimateLine from PriceRange",
    pattern:
      /budget_estimate_line_from_price_range:\s*true|PriceRange[\s\S]{0,80}BudgetEstimateLine|BudgetEstimateLine[\s\S]{0,80}PriceRange/,
    message: "Minimal dry-run entry must not create budget lines from price ranges.",
  },
  {
    label: "SVG production quantity",
    pattern: /svg_production_quantity_used:\s*true|production_quantity_allowed:\s*true/,
    message: "Minimal dry-run entry must not treat SVG quantity as production quantity.",
  },
];

export const runBudgetHarnessStaticGuard = (): BudgetHarnessStaticGuardReport => {
  const issues: BudgetHarnessStaticGuardIssue[] = [];

  scannedFiles.forEach((file) => {
    const absolutePath = join(integrationDir, file);
    const text = readFileSync(absolutePath, "utf8");

    rules.forEach((rule) => {
      if (rule.pattern.test(text)) {
        issues.push({
          file: relative(integrationDir, absolutePath),
          rule: rule.label,
          message: rule.message,
        });
      }
    });
  });

  return {
    valid: issues.length === 0,
    issue_count: issues.length,
    scanned_files: scannedFiles.map((file) => basename(file)),
    issues,
  };
};

const report = runBudgetHarnessStaticGuard();

console.log(JSON.stringify(report, null, 2));

if (!report.valid) {
  process.exitCode = 1;
}
