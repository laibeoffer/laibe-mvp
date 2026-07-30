export const BUDGET_SOURCE_GATE_ERROR_CODES = [
  "BUDGET_SOURCE_NOT_CANONICAL",
  "QUANTITY_SOURCE_NOT_VERIFIED",
  "PRICING_RULE_NOT_FOUND",
  "MOCK_PRICING_NOT_ALLOWED",
  "UNIT_CONVERSION_POLICY_MISSING",
  "REQUIRED_FACT_MISSING",
  "SILENT_ZERO_NOT_ALLOWED",
  "FORMAL_RENDERER_BLOCKED",
  "SNAPSHOT_SOURCE_HASH_MISSING",
  "CATALOG_VERSION_MISSING",
  "RECALCULATION_POLICY_UNDEFINED",
  "REQUIRED_SELECTION_MISSING",
  "ROUNDING_POLICY_MISSING",
  "CHARGE_POLICY_MISSING",
  "FRONTEND_BACKEND_ESTIMATE_MISMATCH",
] as const;

export type BudgetSourceGateCode =
  (typeof BUDGET_SOURCE_GATE_ERROR_CODES)[number];

export type BudgetBlockingErrorSeverity = "warning" | "blocked";

export interface BudgetBlockingError {
  code: BudgetSourceGateCode;
  severity: BudgetBlockingErrorSeverity;
  message: string;
  field?: string;
  sourceId?: string;
  requiredEvidence?: string;
}
