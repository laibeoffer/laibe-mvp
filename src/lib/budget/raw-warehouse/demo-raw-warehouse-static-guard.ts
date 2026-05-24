import { runRawWarehouseStaticGuard } from "./static-guard.ts";

const report = runRawWarehouseStaticGuard();

console.log(
  JSON.stringify(
    {
      static_guard_valid: report.valid,
      static_guard_error_count: report.errors.length,
      scanned_file_count: report.scanned_files.length,
      forbidden_keywords: report.forbidden_keywords,
      errors: report.errors,
      warnings: report.warnings,
    },
    null,
    2,
  ),
);

if (!report.valid) {
  process.exitCode = 1;
}
