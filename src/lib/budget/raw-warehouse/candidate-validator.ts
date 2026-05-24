import type {
  CandidateValidationResult,
  RawCatalogCandidate,
  RawCandidateType,
  RawCandidateRiskFlag,
} from "./types.ts";

const priceCandidateTypes = new Set<RawCandidateType>([
  "historical_quote_line",
  "material_price",
  "vendor_quote",
  "market_price",
  "labor_rate",
]);

const knownUnits = new Set([
  "CM",
  "m2",
  "尺",
  "式",
  "口",
  "盞",
  "工",
  "箱",
  "片",
  "桶",
  "組",
]);

export interface CandidateValidationOptions {
  existing_catalog_codes?: Set<string>;
  minimum_review_confidence?: number;
}

export function validateCandidate(
  candidate: RawCatalogCandidate,
  options: CandidateValidationOptions = {},
): CandidateValidationResult {
  const minimumReviewConfidence = options.minimum_review_confidence ?? 0.5;
  const errors: string[] = [];
  const warnings: string[] = [];
  const riskFlags = new Set<RawCandidateRiskFlag>(candidate.risk_flags);

  if (!candidate.candidate_id) {
    errors.push("candidate_id is required.");
  }
  if (!candidate.source_item_id) {
    errors.push("source_item_id is required.");
  }
  if (!candidate.suggested_name || candidate.suggested_name === "UNKNOWN_RAW_ITEM") {
    errors.push("suggested_name is required.");
    riskFlags.add("ambiguous_name");
  }
  if (candidate.candidate_type === "unknown") {
    errors.push("unknown candidate type is blocked until manually identified.");
    riskFlags.add("unknown_candidate_type");
  }
  if (candidate.observed_price !== null && candidate.observed_price < 0) {
    errors.push("observed_price cannot be negative.");
    riskFlags.add("blocked_negative_price");
  }

  if (!candidate.suggested_code) {
    warnings.push("suggested_code is missing.");
    riskFlags.add("missing_suggested_code");
  }
  if (priceCandidateTypes.has(candidate.candidate_type) && !candidate.unit) {
    warnings.push("price candidate is missing unit.");
    riskFlags.add("missing_unit");
  }
  if (priceCandidateTypes.has(candidate.candidate_type) && candidate.observed_price === null) {
    warnings.push("price candidate is missing observed_price.");
    riskFlags.add("missing_price");
  }
  if (priceCandidateTypes.has(candidate.candidate_type) && !candidate.currency) {
    warnings.push("price candidate is missing currency.");
    riskFlags.add("missing_currency");
  }
  if (priceCandidateTypes.has(candidate.candidate_type)) {
    warnings.push("observed_price is evidence only and cannot become formal unit_price.");
    riskFlags.add("manual_review_required");
  }
  if (candidate.confidence < minimumReviewConfidence) {
    warnings.push(`confidence ${candidate.confidence} is below review minimum ${minimumReviewConfidence}.`);
    riskFlags.add("low_confidence");
  }
  if (candidate.source_reliability === "low" || candidate.source_reliability === "unknown") {
    warnings.push(`source reliability is ${candidate.source_reliability}.`);
    riskFlags.add("low_source_reliability");
  }
  if (!candidate.effective_date) {
    warnings.push("effective_date is missing.");
    riskFlags.add("effective_date_missing");
  }
  if (candidate.unit && !knownUnits.has(candidate.unit)) {
    warnings.push(`unit ${candidate.unit} is not in known raw warehouse unit taxonomy.`);
    riskFlags.add("unit_mismatch");
  }
  if (candidate.observed_price !== null && candidate.observed_price > 100000) {
    warnings.push("observed_price is unusually high and requires review.");
    riskFlags.add("price_outlier_high");
  }
  if (
    candidate.observed_price !== null &&
    candidate.observed_price > 0 &&
    candidate.observed_price < 50
  ) {
    warnings.push("observed_price is unusually low and requires review.");
    riskFlags.add("price_outlier_low");
  }
  if (
    (candidate.candidate_type === "material_price" || candidate.candidate_type === "brand_model") &&
    !candidate.brand
  ) {
    warnings.push("material or brand/model candidate is missing brand.");
    riskFlags.add("missing_brand");
  }
  if (candidate.candidate_type === "brand_model" && !candidate.model) {
    warnings.push("brand/model candidate is missing model.");
    riskFlags.add("missing_model");
  }
  if (
    (candidate.candidate_type === "material_price" || candidate.candidate_type === "brand_model") &&
    !candidate.spec
  ) {
    warnings.push("material or brand/model candidate is missing spec.");
    riskFlags.add("missing_spec");
  }
  if (
    candidate.suggested_code &&
    options.existing_catalog_codes?.has(candidate.suggested_code)
  ) {
    warnings.push(`suggested_code ${candidate.suggested_code} may need merge with existing catalog.`);
    riskFlags.add("duplicate_suggested_code");
    riskFlags.add("possible_merge_required");
  }

  const needsMoreInfo =
    !candidate.suggested_code ||
    (priceCandidateTypes.has(candidate.candidate_type) &&
      (!candidate.unit || candidate.observed_price === null || !candidate.currency)) ||
    riskFlags.has("missing_source_date") ||
    riskFlags.has("effective_date_missing") ||
    riskFlags.has("ambiguous_name") ||
    riskFlags.has("missing_model") ||
    riskFlags.has("missing_spec") ||
    candidate.confidence < minimumReviewConfidence;

  return {
    candidate_id: candidate.candidate_id,
    source_item_id: candidate.source_item_id,
    status: errors.length > 0 ? "blocked" : needsMoreInfo ? "needs_more_info" : "valid_for_review",
    errors,
    warnings,
    risk_flags: [...riskFlags],
  };
}

export function validateCandidates(
  candidates: RawCatalogCandidate[],
  options: CandidateValidationOptions = {},
): CandidateValidationResult[] {
  return candidates.map((candidate) => validateCandidate(candidate, options));
}
