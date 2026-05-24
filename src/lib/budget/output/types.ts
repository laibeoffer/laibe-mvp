import type { PriceSource } from "../types.ts";
import type { MethodSpecCatalog } from "../specs/types.ts";

export interface CustomerBudgetLine {
  trade_category: string;
  line_no: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  customer_note: string;
}

export interface InternalBudgetLine {
  trade_category: string;
  line_no: string;
  item_code: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  customer_note: string;
  internal_note: string;
  source_type: string;
  source_id: string;
  recipe_id: string;
  material_code: string | null;
  quantity_formula: string;
  price_source: PriceSource;
  confidence: number;
  requires_review: boolean;
  inclusions: string[];
  exclusions: string[];
  assumptions: string[];
  risks: string[];
}

export interface BudgetSheetTradeGroup<LineType = CustomerBudgetLine> {
  trade_category: string;
  lines: LineType[];
  subtotal: number;
}

export interface BudgetSheetTotals {
  total_amount: number;
  customer_line_count: number;
  internal_line_count: number;
  trade_group_count: number;
  review_required_count: number;
}

export interface BudgetSheetOutput {
  estimate_id: string;
  project_id: string;
  stage: string;
  generated_at: string;
  customer_view: BudgetSheetTradeGroup<CustomerBudgetLine>[];
  internal_view: BudgetSheetTradeGroup<InternalBudgetLine>[];
  totals: BudgetSheetTotals;
  warnings: string[];
}

export interface BudgetOutputValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BudgetOutputSourceSummary {
  estimate_line_count: number;
  customer_line_count: number;
  internal_line_count: number;
  review_required_count: number;
  material_linked_line_count: number;
  material_unlinked_line_count: number;
}

export interface BudgetOutputSnapshot {
  snapshot_id: string;
  estimate_id: string;
  project_id: string;
  estimate_stage: string;
  output_version: string;
  generated_at: string;
  catalog_version: string;
  customer_view: BudgetSheetTradeGroup<CustomerBudgetLine>[];
  internal_view: BudgetSheetTradeGroup<InternalBudgetLine>[];
  totals: BudgetSheetTotals;
  validation_report: BudgetOutputValidationReport;
  warnings: string[];
  source_summary: BudgetOutputSourceSummary;
}

export interface BudgetOutputSnapshotOptions {
  snapshot_id?: string;
  output_version?: string;
  generated_at?: string;
  catalog_version: string;
  validation_report: BudgetOutputValidationReport;
}

export interface RendererGateOptions {
  methodSpecCatalog?: MethodSpecCatalog;
  requireCustomerView?: boolean;
  requireInternalView?: boolean;
}

export interface RendererGateResult {
  allowed: boolean;
  errors: string[];
  warnings: string[];
  snapshot_id: string | null;
  estimate_id: string | null;
  estimate_stage: string | null;
  output_version: string | null;
}
