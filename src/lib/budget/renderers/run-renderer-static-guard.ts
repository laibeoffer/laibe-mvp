import { runRendererStaticGuard } from "./renderer-static-guard.ts";

const report = runRendererStaticGuard();

const summary = {
  valid: report.valid,
  issue_count: report.issues.length,
  scanned_files: report.scanned_files,
  skipped_files: report.skipped_files,
  forbidden_rules_checked: report.forbidden_rules_checked,
  issues: report.issues,
};

console.log(JSON.stringify(summary, null, 2));

if (!report.valid) {
  process.exitCode = 1;
}
