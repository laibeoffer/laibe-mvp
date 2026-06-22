import type {
  BudgetActorReference,
  BudgetPricingApprovalStatus,
} from "./budget-input.ts";
import type { BudgetBlockingError } from "./budget-errors.ts";
import type { BudgetSourceGateResult } from "./source-gates.ts";

export type BudgetEstimateStatus =
  | "formal"
  | "draft"
  | "blocked"
  | "review_required"
  | "dry_run_only";

export interface BudgetEstimate {
  estimateId: string;
  estimateVersion: string;
  projectId: string;
  status: BudgetEstimateStatus;
  currency: "TWD";
  groups: BudgetEstimateGroup[];
  lines: BudgetEstimateLine[];
  totals: BudgetEstimateTotals;
  validation: BudgetValidationResult;
  blockingErrors: BudgetBlockingError[];
  warnings: string[];
  catalogVersion: string;
  quantitySourceHashes: string[];
  generatedAt: string;
  generatedBy: BudgetActorReference;
  customerView: BudgetCustomerView;
  internalAuditView: BudgetInternalAuditView;
  rendererExportView: BudgetRendererExportView;
  storageSnapshot: BudgetStorageSnapshot;
}

export interface BudgetEstimateLine {
  lineId: string;
  groupId: string;
  itemName: string;
  tradeCategory: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  materialAmount: number;
  laborAmount: number;
  processingAmount: number;
  wasteAmount: number;
  spareAmount: number;
  lineSubtotal: number;
  lineTotal: number;
  materialId?: string;
  productId?: string;
  specId?: string;
  methodId: string;
  recipeId: string;
  pricingRuleId: string;
  sourceReferences: BudgetSourceReference[];
  calculationTrace: BudgetCalculationTrace;
  customerVisible: boolean;
  reviewRequired: boolean;
  reviewReason?: string;
}

export interface BudgetEstimateGroup {
  groupId: string;
  tradeCategory: string;
  lineIds: string[];
  subtotal: number;
  reviewRequiredCount: number;
}

export interface BudgetEstimateTotals {
  materialSubtotal: number;
  laborSubtotal: number;
  processingSubtotal: number;
  transportAmount: number;
  wasteAmount: number;
  spareAmount: number;
  discountAmount: number;
  taxAmount: number;
  minimumChargeAdjustment: number;
  totalAmount: number;
}

export interface BudgetValidationResult {
  valid: boolean;
  severity: "pass" | "warning" | "blocked";
  errors: BudgetBlockingError[];
  warnings: string[];
  sourceGateResults: BudgetSourceGateResult[];
}

export interface BudgetSourceReference {
  sourceId: string;
  sourceType:
    | "verified_quantity_fact"
    | "approved_pricing_catalog"
    | "method_spec"
    | "material_spec"
    | "reviewer_approval";
  sourceHash?: string;
  catalogVersion?: string;
  approvedAt?: string;
}

export interface BudgetCalculationTrace {
  formula: string;
  formulaInputs: Record<string, number | string | boolean>;
  unitConversions: BudgetUnitConversionTrace[];
  rounding: BudgetRoundingTrace;
  priceTrace: BudgetPriceTrace;
}

export interface BudgetUnitConversionTrace {
  fromUnit: string;
  toUnit: string;
  factor: number;
  policyId: string;
}

export interface BudgetRoundingTrace {
  policy: string;
  before: number;
  after: number;
}

export interface BudgetPriceTrace {
  pricingRuleId: string;
  unitPrice: number;
  priceSource: string;
  priceEffectiveDate: string;
  approvalStatus: BudgetPricingApprovalStatus;
}

export interface BudgetCustomerView {
  estimateId: string;
  projectId: string;
  status: BudgetEstimateStatus;
  groups: BudgetCustomerGroup[];
  totalAmount: number;
  currency: "TWD";
  warnings: string[];
}

export interface BudgetCustomerGroup {
  groupId: string;
  tradeCategory: string;
  subtotal: number;
  lines: BudgetCustomerLine[];
}

export interface BudgetCustomerLine {
  lineId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customerNote?: string;
}

export interface BudgetInternalAuditView {
  estimateId: string;
  sourceReferences: BudgetSourceReference[];
  calculationTraces: Record<string, BudgetCalculationTrace>;
  blockingErrors: BudgetBlockingError[];
  warnings: string[];
}

export interface BudgetRendererExportView {
  renderable: boolean;
  blockedReasonCodes: string[];
  customerView: BudgetCustomerView;
  validation: BudgetValidationResult;
}

export interface BudgetStorageSnapshot {
  snapshotId: string;
  estimateId: string;
  estimateVersion: string;
  catalogVersion: string;
  quantitySourceHashes: string[];
  generatedAt: string;
  immutable: true;
  validation: BudgetValidationResult;
}
