import type { BudgetSheetTotals } from "../output/types.ts";
import type { FormalRendererToken } from "./formal-renderer-token.ts";
import {
  assertFormalSkeletonInputFromEntry,
  buildFormalRowsFromSnapshot,
  type FormalColumnSpec,
  type FormalLayoutContract,
  type FormalSectionSpec,
  type FormalSkeletonInput,
} from "./formal-layout-contract.ts";
import type {
  FormalRendererAudience,
  RenderedBudgetRow,
} from "./types.ts";

export interface FormalExcelSkeletonSheet {
  sheet_name: string;
  audience: FormalRendererAudience;
  columns: FormalColumnSpec[];
  sections: FormalSectionSpec[];
  frozen_rows: number;
  print_area: string;
  rows: RenderedBudgetRow[];
}

export interface FormalExcelSkeletonOutput {
  renderer_contract: "formal_renderer_entry_gated";
  renderer_entry_token: FormalRendererToken;
  renderer: "formal_excel_skeleton";
  audience: FormalRendererAudience;
  format: "excel_skeleton";
  render_id: string;
  snapshot_id: string;
  project_id: string;
  estimate_id: string;
  estimate_stage: string;
  generated_at: string;
  title: string;
  layout_contract: FormalLayoutContract;
  sheets: FormalExcelSkeletonSheet[];
  rows: RenderedBudgetRow[];
  totals: BudgetSheetTotals;
  warnings: string[];
}

const sheetNameForAudience = (audience: FormalRendererAudience): string =>
  audience === "customer" ? "Customer Budget" : "Internal Trace";

export const renderFormalExcelSkeleton = (
  input: FormalSkeletonInput,
): FormalExcelSkeletonOutput => {
  assertFormalSkeletonInputFromEntry(input);

  const rows = buildFormalRowsFromSnapshot(
    input.snapshot,
    input.layout_contract,
  );
  const sheet: FormalExcelSkeletonSheet = {
    sheet_name: sheetNameForAudience(input.layout_contract.audience),
    audience: input.layout_contract.audience,
    columns: input.layout_contract.columns,
    sections: input.layout_contract.sections,
    frozen_rows: input.layout_contract.pagination.repeat_header ? 1 : 0,
    print_area: input.layout_contract.pagination.page_size,
    rows,
  };

  return {
    renderer_contract: "formal_renderer_entry_gated",
    renderer_entry_token: input.renderer_entry_token,
    renderer: "formal_excel_skeleton",
    audience: input.layout_contract.audience,
    format: "excel_skeleton",
    render_id: input.render_id,
    snapshot_id: input.snapshot.snapshot_id,
    project_id: input.snapshot.project_id,
    estimate_id: input.snapshot.estimate_id,
    estimate_stage: input.snapshot.estimate_stage,
    generated_at: input.generated_at,
    title: input.title,
    layout_contract: input.layout_contract,
    sheets: [sheet],
    rows,
    totals: input.snapshot.totals,
    warnings: input.document.warnings,
  };
};
