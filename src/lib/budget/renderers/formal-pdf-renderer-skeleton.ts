import type { BudgetSheetTotals } from "../output/types.ts";
import type { FormalRendererToken } from "./formal-renderer-token.ts";
import {
  assertFormalSkeletonInputFromEntry,
  buildFormalRowsFromSnapshot,
  type FormalLayoutContract,
  type FormalSectionSpec,
  type FormalSkeletonInput,
} from "./formal-layout-contract.ts";
import type {
  FormalRendererAudience,
  RenderedBudgetRow,
} from "./types.ts";

export interface FormalPdfSkeletonPage {
  page_no: number;
  row_start_index: number;
  row_end_index: number;
  section_codes: string[];
}

export interface FormalPdfSkeletonOutput {
  renderer_contract: "formal_renderer_entry_gated";
  renderer_entry_token: FormalRendererToken;
  renderer: "formal_pdf_skeleton";
  audience: FormalRendererAudience;
  format: "pdf_skeleton";
  render_id: string;
  snapshot_id: string;
  project_id: string;
  estimate_id: string;
  estimate_stage: string;
  generated_at: string;
  title: string;
  layout_contract: FormalLayoutContract;
  pages: FormalPdfSkeletonPage[];
  sections: FormalSectionSpec[];
  rows: RenderedBudgetRow[];
  totals: BudgetSheetTotals;
  warnings: string[];
}

const makePages = (
  rows: RenderedBudgetRow[],
  layout: FormalLayoutContract,
): FormalPdfSkeletonPage[] => {
  const rowsPerPage = Math.max(layout.pagination.rows_per_page, 1);
  const pageCount = Math.max(Math.ceil(rows.length / rowsPerPage), 1);
  const sectionCodes = layout.sections
    .filter((section) => section.enabled)
    .map((section) => section.section_code);

  return Array.from({ length: pageCount }, (_, index) => {
    const rowStart = index * rowsPerPage;
    const rowEnd = Math.min(rowStart + rowsPerPage - 1, rows.length - 1);

    return {
      page_no: index + 1,
      row_start_index: rowStart,
      row_end_index: rowEnd,
      section_codes: sectionCodes,
    };
  });
};

export const renderFormalPdfSkeleton = (
  input: FormalSkeletonInput,
): FormalPdfSkeletonOutput => {
  assertFormalSkeletonInputFromEntry(input);

  const rows = buildFormalRowsFromSnapshot(
    input.snapshot,
    input.layout_contract,
  );

  return {
    renderer_contract: "formal_renderer_entry_gated",
    renderer_entry_token: input.renderer_entry_token,
    renderer: "formal_pdf_skeleton",
    audience: input.layout_contract.audience,
    format: "pdf_skeleton",
    render_id: input.render_id,
    snapshot_id: input.snapshot.snapshot_id,
    project_id: input.snapshot.project_id,
    estimate_id: input.snapshot.estimate_id,
    estimate_stage: input.snapshot.estimate_stage,
    generated_at: input.generated_at,
    title: input.title,
    layout_contract: input.layout_contract,
    pages: makePages(rows, input.layout_contract),
    sections: input.layout_contract.sections,
    rows,
    totals: input.snapshot.totals,
    warnings: input.document.warnings,
  };
};
