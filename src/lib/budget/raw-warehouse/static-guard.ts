import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  RawWarehouseStaticGuardIssue,
  RawWarehouseStaticGuardReport,
} from "./types.ts";

export const RAW_WAREHOUSE_FORBIDDEN_IMPORT_KEYWORDS = [
  "renderers",
  "renderer",
  "BudgetOutputSnapshot",
  "RenderedBudgetDocument",
  "generateBudgetEstimate",
  "budget-generator",
  "pricing-rules",
  "material-resolver",
  "MethodSpecCatalog",
  "method-spec",
  "RAG",
  "ai",
  "openai",
  "supabase",
  "database",
  "db",
  "payment",
  "escrow",
  "listing-fee",
  "plan-puzzle",
  "preview_floor_plan",
  "preview-floor-plan",
];

const guardFileNames = new Set([
  "static-guard.ts",
  "demo-raw-warehouse-static-guard.ts",
]);

export function runRawWarehouseStaticGuard(
  rawWarehouseDir = dirname(fileURLToPath(import.meta.url)),
): RawWarehouseStaticGuardReport {
  const files = listTsFiles(rawWarehouseDir);
  const errors: RawWarehouseStaticGuardIssue[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    const relativePath = normalizePath(relative(rawWarehouseDir, filePath));

    scanImports(content, relativePath, errors);

    if (!guardFileNames.has(relativePath)) {
      scanContentReferences(content, relativePath, errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    scanned_files: files.map((filePath) => normalizePath(relative(rawWarehouseDir, filePath))),
    forbidden_keywords: RAW_WAREHOUSE_FORBIDDEN_IMPORT_KEYWORDS,
  };
}

function listTsFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...listTsFiles(fullPath));
      continue;
    }

    if (entry.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function scanImports(
  content: string,
  filePath: string,
  errors: RawWarehouseStaticGuardIssue[],
): void {
  const importRegex = /^\s*import\s+(?:type\s+)?[\s\S]*?\s+from\s+["']([^"']+)["']/gm;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] ?? "";
    const line = getLineNumber(content, match.index);

    for (const keyword of RAW_WAREHOUSE_FORBIDDEN_IMPORT_KEYWORDS) {
      if (containsForbiddenKeyword(importPath, keyword)) {
        errors.push({
          file_path: filePath,
          keyword,
          line,
          message: `Forbidden raw-warehouse import boundary reference in import path: ${importPath}`,
        });
      }
    }
  }
}

function scanContentReferences(
  content: string,
  filePath: string,
  errors: RawWarehouseStaticGuardIssue[],
): void {
  const lines = content.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    for (const keyword of RAW_WAREHOUSE_FORBIDDEN_IMPORT_KEYWORDS) {
      if (containsForbiddenKeyword(lineText, keyword)) {
        errors.push({
          file_path: filePath,
          keyword,
          line: index + 1,
          message: `Forbidden raw-warehouse boundary keyword reference: ${keyword}`,
        });
      }
    }
  });
}

function containsForbiddenKeyword(text: string, keyword: string): boolean {
  if (!text) {
    return false;
  }

  if (keyword === "ai" || keyword === "db" || keyword === "RAG") {
    return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(text);
  }

  return text.toLowerCase().includes(keyword.toLowerCase());
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
