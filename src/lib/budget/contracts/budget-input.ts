import type { BudgetSourceGatePolicy } from "./source-gates.ts";

export type BudgetEstimateMode = "formal" | "draft" | "dry_run_only";

export type BudgetQuantityVerificationStatus =
  | "verified"
  | "review_required"
  | "candidate_only"
  | "blocked";

export type BudgetPricingApprovalStatus = "approved" | "draft" | "mock" | "blocked";

export interface CanonicalBudgetInput {
  requestId: string;
  estimateMode: BudgetEstimateMode;
  generatedBy: BudgetActorReference;
  project: BudgetProjectContext;
  quantityFacts: VerifiedQuantityFact[];
  selections: BudgetSelection[];
  pricingCatalog: PricingCatalogReference;
  calculationPolicy: BudgetCalculationPolicy;
  sourceGateContext: BudgetSourceGatePolicy;
}

export interface BudgetActorReference {
  actorType: "system" | "reviewer" | "admin";
  actorId: string;
}

export interface BudgetProjectContext {
  projectId: string;
  projectName: string;
  customerContext?: {
    customerId?: string;
    displayName?: string;
  };
  internalContext?: {
    ownerIntentId?: string;
    projectRequirementBriefId?: string;
  };
  location?: {
    city?: string;
    district?: string;
    siteCondition?: string;
  };
  spaces: BudgetSpaceContext[];
}

export interface BudgetSpaceContext {
  spaceId: string;
  spaceName: string;
  spaceType: string;
  constructionCondition?:
    | "new_build"
    | "renovation"
    | "partial_repair"
    | "unknown";
}

export interface VerifiedQuantityFact {
  factId: string;
  sourceId: string;
  sourceType:
    | "verified_floor_plan"
    | "manual_measurement"
    | "reviewer_approved_takeoff"
    | "catalog_default"
    | "candidate_floor_plan";
  verificationStatus: BudgetQuantityVerificationStatus;
  spaceId?: string;
  objectId?: string;
  factType: string;
  quantity: number;
  unit: string;
  area?: number;
  materialQuantity?: number;
  pieceCount?: number;
  cutPieceCount?: number;
  halfPieceCount?: number;
  irregularPieceCount?: number;
  deductedArea?: number;
  excludedZones?: string[];
  geometrySourceHash?: string;
  reviewerApproval?: BudgetReviewerApprovalStatus;
  formulaInputs: Record<string, unknown>;
}

export interface BudgetReviewerApprovalStatus {
  approved: boolean;
  reviewerId?: string;
  reviewedAt?: string;
  note?: string;
}

export interface BudgetSelection {
  selectionId: string;
  quantityFactId: string;
  spaceId?: string;
  materialId?: string;
  productId?: string;
  specId?: string;
  methodId: string;
  recipeId: string;
  pricingRuleId: string;
  laborCategory?: string;
  processingType?: string;
}

export interface PricingCatalogReference {
  catalogId: string;
  catalogVersion: string;
  priceEffectiveDate: string;
  currency: "TWD";
  priceSource:
    | "approved_catalog"
    | "vendor_quote"
    | "historical_quote"
    | "mock"
    | "draft";
  approvalStatus: BudgetPricingApprovalStatus;
}

export interface BudgetCalculationPolicy {
  unitConversionPolicyId: string;
  roundingPolicy: BudgetRoundingPolicy;
  wasteRatePolicy: BudgetRatePolicy;
  spareRatePolicy: BudgetRatePolicy;
  taxRule?: BudgetRateChargeRule;
  discountRule?: BudgetDiscountRule;
  transportRule?: BudgetTransportRule;
  minimumChargeRule?: BudgetMinimumChargeRule;
}

export interface BudgetRoundingPolicy {
  quantityPrecision: number;
  moneyPrecision: number;
  lineRounding: "round" | "ceil" | "floor";
  totalRounding: "round" | "ceil" | "floor";
}

export interface BudgetRatePolicy {
  defaultRate: number;
  byMaterialId?: Record<string, number>;
}

export interface BudgetRateChargeRule {
  enabled: boolean;
  rate: number;
}

export interface BudgetDiscountRule {
  enabled: boolean;
  amount?: number;
  rate?: number;
}

export interface BudgetTransportRule {
  enabled: boolean;
  amount?: number;
  pricingRuleId?: string;
}

export interface BudgetMinimumChargeRule {
  enabled: boolean;
  minimumAmount: number;
}
