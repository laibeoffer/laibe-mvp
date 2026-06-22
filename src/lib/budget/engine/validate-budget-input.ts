import type {
  BudgetSelection,
  CanonicalBudgetInput,
  VerifiedQuantityFact,
} from "../contracts/budget-input.ts";
import type {
  BudgetBlockingError,
  BudgetSourceGateCode,
} from "../contracts/budget-errors.ts";
import type { BudgetValidationResult } from "../contracts/budget-output.ts";
import type { BudgetSourceGateResult } from "../contracts/source-gates.ts";

const blockedError = (
  code: BudgetSourceGateCode,
  message: string,
  field?: string,
  sourceId?: string,
  requiredEvidence?: string,
): BudgetBlockingError => ({
  code,
  severity: "blocked",
  message,
  field,
  sourceId,
  requiredEvidence,
});

const blockedGate = (
  gate: string,
  error: BudgetBlockingError,
): BudgetSourceGateResult => ({
  gate,
  status: "blocked",
  blocksFormalEstimate: true,
  code: error.code,
  reason: error.message,
  requiredEvidence: error.requiredEvidence,
  sourceId: error.sourceId,
  errors: [error],
  warnings: [],
});

const pushBlock = (
  errors: BudgetBlockingError[],
  gates: BudgetSourceGateResult[],
  gate: string,
  code: BudgetSourceGateCode,
  message: string,
  field?: string,
  sourceId?: string,
  requiredEvidence?: string,
): void => {
  const error = blockedError(code, message, field, sourceId, requiredEvidence);
  errors.push(error);
  gates.push(blockedGate(gate, error));
};

const hasText = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const requiresMaterialTrace = (selection: BudgetSelection): boolean =>
  !hasText(selection.materialId) &&
  !hasText(selection.productId) &&
  !hasText(selection.specId);

const requiresGeometrySourceHash = (fact: VerifiedQuantityFact): boolean =>
  fact.sourceType === "verified_floor_plan" ||
  fact.sourceType === "reviewer_approved_takeoff";

export const validateBudgetInput = (
  input: CanonicalBudgetInput,
): BudgetValidationResult => {
  const errors: BudgetBlockingError[] = [];
  const sourceGateResults: BudgetSourceGateResult[] = [];
  const quantityFactsById = new Map<string, VerifiedQuantityFact>();

  for (const fact of input.quantityFacts) {
    quantityFactsById.set(fact.factId, fact);
  }

  if (input.estimateMode === "formal") {
    const policy = input.sourceGateContext;

    if (
      policy.allowMockPricing !== false ||
      policy.allowCandidateQuantity !== false ||
      policy.allowStaticUiSource !== false ||
      policy.requireReviewerApproval !== true ||
      policy.requireCatalogVersion !== true ||
      policy.requireSourceHashes !== true
    ) {
      pushBlock(
        errors,
        sourceGateResults,
        "formal_source_gate_policy",
        "BUDGET_SOURCE_NOT_CANONICAL",
        "Formal estimate requires strict source gate policy.",
        "sourceGateContext",
        input.requestId,
        "allowMockPricing:false, allowCandidateQuantity:false, allowStaticUiSource:false, requireReviewerApproval:true, requireCatalogVersion:true, requireSourceHashes:true",
      );
    }
  }

  for (const fact of input.quantityFacts) {
    if (
      fact.verificationStatus === "candidate_only" ||
      fact.verificationStatus === "blocked"
    ) {
      pushBlock(
        errors,
        sourceGateResults,
        "quantity_fact_verification",
        "QUANTITY_SOURCE_NOT_VERIFIED",
        "Quantity fact is not verified for formal budget input.",
        "quantityFacts.verificationStatus",
        fact.factId,
        "verified quantity source",
      );
    }

    if (fact.sourceType === "candidate_floor_plan") {
      pushBlock(
        errors,
        sourceGateResults,
        "quantity_source_type",
        "QUANTITY_SOURCE_NOT_VERIFIED",
        "Candidate floor-plan quantity cannot be used as production quantity.",
        "quantityFacts.sourceType",
        fact.factId,
        "verified_floor_plan, manual_measurement, reviewer_approved_takeoff, or catalog_default",
      );
    }

    if (requiresGeometrySourceHash(fact) && !hasText(fact.geometrySourceHash)) {
      pushBlock(
        errors,
        sourceGateResults,
        "quantity_source_hash",
        "SNAPSHOT_SOURCE_HASH_MISSING",
        "Verified floor-plan or reviewer-approved takeoff fact requires geometrySourceHash.",
        "quantityFacts.geometrySourceHash",
        fact.factId,
        "geometry source hash",
      );
    }

    if (
      input.sourceGateContext.requireReviewerApproval &&
      (!fact.reviewerApproval || fact.reviewerApproval.approved !== true)
    ) {
      pushBlock(
        errors,
        sourceGateResults,
        "reviewer_approval",
        "QUANTITY_SOURCE_NOT_VERIFIED",
        "Reviewer approval is required and missing or not approved.",
        "quantityFacts.reviewerApproval",
        fact.factId,
        "approved reviewer approval",
      );
    }

    if (!Number.isFinite(fact.quantity)) {
      pushBlock(
        errors,
        sourceGateResults,
        "quantity_finite",
        "QUANTITY_SOURCE_NOT_VERIFIED",
        "Quantity must be finite.",
        "quantityFacts.quantity",
        fact.factId,
        "finite quantity",
      );
    }

    if (fact.quantity === 0) {
      pushBlock(
        errors,
        sourceGateResults,
        "quantity_zero_policy",
        "SILENT_ZERO_NOT_ALLOWED",
        "Zero quantity requires an explicit verified zero policy; no such policy exists yet.",
        "quantityFacts.quantity",
        fact.factId,
        "explicit verified zero policy",
      );
    }
  }

  const catalog = input.pricingCatalog;

  if (
    catalog.approvalStatus === "mock" ||
    catalog.approvalStatus === "draft" ||
    catalog.approvalStatus === "blocked"
  ) {
    pushBlock(
      errors,
      sourceGateResults,
      "pricing_catalog_approval",
      "MOCK_PRICING_NOT_ALLOWED",
      "Pricing catalog must be approved; mock, draft, or blocked catalog is not allowed.",
      "pricingCatalog.approvalStatus",
      catalog.catalogId,
      "approved pricing catalog",
    );
  }

  if (catalog.priceSource === "mock" || catalog.priceSource === "draft") {
    pushBlock(
      errors,
      sourceGateResults,
      "pricing_catalog_source",
      "MOCK_PRICING_NOT_ALLOWED",
      "Mock or draft pricing source cannot be used as formal pricing.",
      "pricingCatalog.priceSource",
      catalog.catalogId,
      "approved price source",
    );
  }

  if (!hasText(catalog.catalogVersion)) {
    pushBlock(
      errors,
      sourceGateResults,
      "catalog_version",
      "CATALOG_VERSION_MISSING",
      "Pricing catalog version is required.",
      "pricingCatalog.catalogVersion",
      catalog.catalogId,
      "catalog version",
    );
  }

  if (!hasText(input.calculationPolicy.unitConversionPolicyId)) {
    pushBlock(
      errors,
      sourceGateResults,
      "unit_conversion_policy",
      "UNIT_CONVERSION_POLICY_MISSING",
      "Unit conversion policy id is required.",
      "calculationPolicy.unitConversionPolicyId",
      input.requestId,
      "unit conversion policy id",
    );
  }

  if (!input.calculationPolicy.roundingPolicy) {
    pushBlock(
      errors,
      sourceGateResults,
      "rounding_policy",
      "ROUNDING_POLICY_MISSING",
      "Rounding policy is required.",
      "calculationPolicy.roundingPolicy",
      input.requestId,
      "rounding policy",
    );
  }

  if (input.selections.length === 0) {
    pushBlock(
      errors,
      sourceGateResults,
      "required_selection",
      "REQUIRED_SELECTION_MISSING",
      "At least one budget selection is required.",
      "selections",
      input.requestId,
      "budget selection",
    );
  }

  for (const selection of input.selections) {
    const fact = quantityFactsById.get(selection.quantityFactId);

    if (!hasText(selection.quantityFactId) || !fact) {
      pushBlock(
        errors,
        sourceGateResults,
        "selection_quantity_fact",
        "REQUIRED_FACT_MISSING",
        "Selection references a missing quantity fact.",
        "selections.quantityFactId",
        selection.selectionId,
        "matching quantity fact",
      );
    }

    if (
      !hasText(selection.methodId) ||
      !hasText(selection.recipeId) ||
      !hasText(selection.pricingRuleId)
    ) {
      pushBlock(
        errors,
        sourceGateResults,
        "selection_trace_ids",
        "REQUIRED_SELECTION_MISSING",
        "Selection requires methodId, recipeId, and pricingRuleId.",
        "selections",
        selection.selectionId,
        "methodId, recipeId, pricingRuleId",
      );
    }

    if (input.estimateMode === "formal" && requiresMaterialTrace(selection)) {
      pushBlock(
        errors,
        sourceGateResults,
        "selection_material_trace",
        "REQUIRED_SELECTION_MISSING",
        "Formal line selection requires at least one materialId, productId, or specId trace.",
        "selections.materialId",
        selection.selectionId,
        "materialId, productId, or specId",
      );
    }
  }

  return {
    valid: errors.length === 0,
    severity: errors.length > 0 ? "blocked" : "pass",
    errors,
    warnings: [],
    sourceGateResults,
  };
};
