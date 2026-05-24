import type { BudgetSheetTotals } from "../output/types.ts";

export type BudgetRenderMode = "customer" | "internal_trace";

export type BudgetRenderFormat =
  | "structured_rows"
  | "html_skeleton"
  | "csv_skeleton";

export type FormalRendererAudience = "customer" | "internal_trace";

export type FormalRendererFormat = "excel_skeleton" | "pdf_skeleton";

export type FormalLayoutProfile =
  | "standard_a4"
  | "compact_a4"
  | "internal_trace_a4";

export type RenderedBudgetCellValue = string | number | boolean | null;

export type RenderedBudgetCells = Record<string, RenderedBudgetCellValue>;

export interface RenderedBudgetRow {
  cells: RenderedBudgetCells;
  metadata: Record<string, RenderedBudgetCellValue>;
}

export interface RenderedBudgetDocument {
  renderer_contract: "snapshot_gated_renderer";
  render_id: string;
  snapshot_id: string;
  project_id: string;
  estimate_id: string;
  estimate_stage: string;
  mode: BudgetRenderMode;
  format: BudgetRenderFormat;
  generated_at: string;
  title: string;
  rows: RenderedBudgetRow[];
  totals: BudgetSheetTotals;
  warnings: string[];
}

export interface BudgetRendererOptions {
  format?: BudgetRenderFormat;
  generated_at?: string;
  render_id?: string;
  title?: string;
}

export interface RenderSnapshotOptions extends BudgetRendererOptions {
  mode: BudgetRenderMode;
  format: BudgetRenderFormat;
}

export type RenderSnapshotResult = RenderedBudgetDocument | string;

export interface FormalRendererOptions {
  audience: FormalRendererAudience;
  format: FormalRendererFormat;
  layout_profile: FormalLayoutProfile;
  generated_at?: string;
  render_id?: string;
  title?: string;
}
