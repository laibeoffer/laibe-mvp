import type {
  BudgetBlockingError,
  BudgetSourceGateCode,
} from "./budget-errors.ts";

export type { BudgetSourceGateCode } from "./budget-errors.ts";

export type BudgetSourceGateStatus = "pass" | "warning" | "blocked";

export interface BudgetSourceGateResult {
  gate: string;
  status: BudgetSourceGateStatus;
  blocksFormalEstimate: boolean;
  code?: BudgetSourceGateCode;
  reason: string;
  requiredEvidence?: string;
  sourceId?: string;
  errors: BudgetBlockingError[];
  warnings: string[];
}

export interface BudgetSourceGatePolicy {
  allowMockPricing: false;
  allowCandidateQuantity: false;
  allowStaticUiSource: false;
  requireReviewerApproval: true;
  requireCatalogVersion: true;
  requireSourceHashes: true;
  oldQuotationRecalculationPolicy?:
    | "freeze_original"
    | "recalculate_with_current_catalog"
    | "manual_review_required";
}
