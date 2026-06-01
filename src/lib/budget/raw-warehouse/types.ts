export const RAW_WAREHOUSE_FORMAL_PRICE_GENERATED = false;
export const RAW_WAREHOUSE_PRICE_AUTHORITY = "none" as const;
export const RAW_WAREHOUSE_APPROVED_AS_CANDIDATE_IS_FORMAL_APPROVAL = false;

export type RawCatalogSourceType =
  | "historical_quote"
  | "material_price_sheet"
  | "vendor_quote"
  | "market_price_reference"
  | "brand_model_catalog"
  | "labor_rate_sheet"
  | "note_sheet"
  | "manual_admin_entry";

export type SourceReliability = "high" | "medium" | "low" | "unknown";

export type RawCandidateType =
  | "historical_quote_line"
  | "material_price"
  | "vendor_quote"
  | "market_price"
  | "brand_model"
  | "labor_rate"
  | "catalog_note"
  | "unknown";

export type ReviewStatus =
  | "pending"
  /**
   * Candidate evidence can move to downstream review only.
   * This is not formal price approval, catalog publishing, PricingRule approval,
   * MaterialSpec approval, LaborRule approval, BudgetEstimateLine input, or customer output.
   */
  | "approved_as_candidate"
  | "rejected"
  | "needs_more_info"
  | "needs_merge"
  | "deprecated";

export type SourceQualityGrade = "excellent" | "good" | "watch" | "poor" | "blocked";

export type ReviewerChecklistStatus =
  | "pass"
  | "warning"
  | "fail"
  | "not_applicable";

export type CandidateValidationStatus =
  | "valid_for_review"
  | "needs_more_info"
  | "blocked";

export type RawCandidateRiskFlag =
  | "missing_unit"
  | "missing_price"
  | "missing_currency"
  | "missing_source_date"
  | "low_source_reliability"
  | "low_confidence"
  | "duplicate_suggested_code"
  | "possible_merge_required"
  | "price_outlier_high"
  | "price_outlier_low"
  | "unit_mismatch"
  | "ambiguous_name"
  | "missing_brand"
  | "missing_model"
  | "missing_spec"
  | "unknown_candidate_type"
  | "blocked_negative_price"
  | "source_scope_unclear"
  | "region_missing"
  | "effective_date_missing"
  | "manual_review_required"
  | "missing_suggested_code"
  | "same_source_period_duplicate"
  | "possible_material_duplicate";

export type HandoffProposalType =
  | "material_candidate_proposal"
  | "labor_rate_candidate_proposal"
  | "historical_quote_reference_proposal"
  | "vendor_quote_reference_proposal"
  | "market_price_reference_proposal"
  | "merge_proposal";

export type HandoffAllowedNextAction =
  | "send_to_method_spec_review"
  | "send_to_pricing_review"
  | "send_to_material_spec_review"
  | "keep_as_historical_reference"
  | "request_more_info"
  | "reject_candidate";

export type HandoffBlockedAction =
  | "create_formal_pricing_rule"
  | "create_budget_estimate_line"
  | "overwrite_catalog"
  | "publish_without_human_review"
  | "render_customer_output";

export type RawWarehousePriceAuthority = typeof RAW_WAREHOUSE_PRICE_AUTHORITY;

export interface RawCatalogSource {
  id: string;
  source_type: RawCatalogSourceType;
  source_name: string;
  source_owner: string;
  source_date: string;
  captured_at: string;
  region: string;
  currency: string;
  source_note: string;
  source_reliability: SourceReliability;
  raw_items: RawCatalogItem[];
  metadata: Record<string, unknown>;
}

export interface RawCatalogItem {
  id: string;
  source_id: string;
  row_index: number;
  raw_category: string;
  raw_name: string;
  raw_brand: string | null;
  raw_model: string | null;
  raw_spec: string | null;
  raw_unit: string | null;
  raw_quantity: number | null;
  raw_unit_price: number | null;
  raw_amount: number | null;
  raw_currency: string | null;
  raw_note: string;
  raw_text: string;
  effective_date: string | null;
  region: string;
  vendor_name: string | null;
  metadata: Record<string, unknown>;
}

export interface NormalizedRawCatalogItem {
  source_item_id: string;
  normalized_name: string;
  normalized_unit: string | null;
  suggested_code: string | null;
  normalized_brand: string | null;
  normalized_model: string | null;
  normalized_spec: string | null;
  normalized_note: string;
}

export interface RawCatalogCandidateBase {
  candidate_id: string;
  source_item_id: string;
  candidate_type: RawCandidateType;
  suggested_code: string | null;
  suggested_name: string;
  trade_category: string;
  item_category: string;
  unit: string | null;
  observed_price: number | null;
  currency: string | null;
  brand: string | null;
  model: string | null;
  spec: string | null;
  effective_date: string | null;
  confidence: number;
  requires_human_review: boolean;
  reason: string;
  risk_flags: RawCandidateRiskFlag[];
  source_type: RawCatalogSourceType;
  source_reliability: SourceReliability;
  metadata: Record<string, unknown>;
}

export type HistoricalQuoteLineCandidate = RawCatalogCandidateBase & {
  candidate_type: "historical_quote_line";
};

export type MaterialPriceCandidate = RawCatalogCandidateBase & {
  candidate_type: "material_price";
};

export type VendorQuoteCandidate = RawCatalogCandidateBase & {
  candidate_type: "vendor_quote";
};

export type MarketPriceCandidate = RawCatalogCandidateBase & {
  candidate_type: "market_price";
};

export type BrandModelCandidate = RawCatalogCandidateBase & {
  candidate_type: "brand_model";
};

export type LaborRateCandidate = RawCatalogCandidateBase & {
  candidate_type: "labor_rate";
};

export type CatalogNoteCandidate = RawCatalogCandidateBase & {
  candidate_type: "catalog_note";
};

export type UnknownCandidate = RawCatalogCandidateBase & {
  candidate_type: "unknown";
};

export type RawCatalogCandidate =
  | HistoricalQuoteLineCandidate
  | MaterialPriceCandidate
  | VendorQuoteCandidate
  | MarketPriceCandidate
  | BrandModelCandidate
  | LaborRateCandidate
  | CatalogNoteCandidate
  | UnknownCandidate;

export interface CandidateValidationResult {
  candidate_id: string;
  source_item_id: string;
  status: CandidateValidationStatus;
  errors: string[];
  warnings: string[];
  risk_flags: RawCandidateRiskFlag[];
}

export interface ReviewerChecklistItem {
  checklist_code: string;
  label: string;
  status: ReviewerChecklistStatus;
  reason: string;
  related_risk_flags: RawCandidateRiskFlag[];
}

export interface SourceQualityAssessment {
  assessment_id: string;
  candidate_id: string;
  source_item_id: string;
  source_id: string;
  source_type: RawCatalogSourceType;
  source_reliability: SourceReliability;
  source_date: string;
  quality_score: number;
  quality_grade: SourceQualityGrade;
  evidence_completeness_score: number;
  traceability_score: number;
  commercial_evidence_score: number;
  risk_score_penalty: number;
  reviewer_checklist: ReviewerChecklistItem[];
  recommended_review_status: ReviewStatus;
  recommendation_reason: string;
  formal_price_generated: false;
  price_authority: RawWarehousePriceAuthority;
  observed_price_is_evidence_only: true;
}

export interface CatalogReviewItem {
  id: string;
  candidate_id: string;
  status: ReviewStatus;
  reviewer_note: string;
  approved_payload: RawCatalogCandidate | null;
  validation_status: CandidateValidationStatus;
  risk_flags: RawCandidateRiskFlag[];
}

export interface HandoffProposalProvenanceTrace {
  source: {
    id: string;
    source_type: RawCatalogSourceType;
    source_name: string;
    source_reliability: SourceReliability;
    source_date: string;
  };
  raw_item: {
    id: string;
    row_index: number;
    raw_category: string;
    raw_name: string;
    raw_unit: string | null;
    raw_unit_price: number | null;
    raw_amount: number | null;
    raw_currency: string | null;
    effective_date: string | null;
    region: string;
    vendor_name: string | null;
  };
  candidate: {
    candidate_id: string;
    candidate_type: RawCandidateType;
    suggested_code: string | null;
    suggested_name: string;
    confidence: number;
    requires_human_review: boolean;
    risk_flags: RawCandidateRiskFlag[];
  };
  validation: {
    status: CandidateValidationStatus;
    errors: string[];
    warnings: string[];
    risk_flags: RawCandidateRiskFlag[];
  };
  review: {
    review_item_id: string;
    review_status: ReviewStatus;
    reviewer_note: string;
  };
  proposal: {
    proposal_id: string;
    proposal_type: HandoffProposalType;
    formal_price_generated: false;
    price_authority: RawWarehousePriceAuthority;
  };
}

export interface HandoffProposal {
  proposal_id: string;
  proposal_type: HandoffProposalType;
  source_id: string;
  source_type: RawCatalogSourceType;
  source_name: string;
  source_reliability: SourceReliability;
  source_date: string;
  raw_item_id: string;
  candidate_id: string;
  review_item_id: string;
  validation_status: CandidateValidationStatus;
  review_status: ReviewStatus;
  reviewer_note: string;
  source_item_id: string;
  suggested_code: string | null;
  suggested_name: string;
  unit: string | null;
  observed_price: number | null;
  currency: string | null;
  reason: string;
  risk_flags: RawCandidateRiskFlag[];
  formal_price_generated: false;
  price_authority: RawWarehousePriceAuthority;
  allowed_next_actions: HandoffAllowedNextAction[];
  blocked_actions: HandoffBlockedAction[];
  provenance_trace: HandoffProposalProvenanceTrace;
  metadata: Record<string, unknown>;
}

export interface ObservedPriceSafetyReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checked_candidate_count: number;
  checked_proposal_count: number;
  formal_price_generated: false;
  price_authority: RawWarehousePriceAuthority;
  forbidden_field_hits: Array<{
    record_type: "candidate" | "proposal";
    record_id: string;
    field_path: string;
    field_name: string;
  }>;
}

export interface RawWarehouseStaticGuardIssue {
  file_path: string;
  keyword: string;
  line: number;
  message: string;
}

export interface RawWarehouseStaticGuardReport {
  valid: boolean;
  errors: RawWarehouseStaticGuardIssue[];
  warnings: string[];
  scanned_files: string[];
  forbidden_keywords: string[];
}

export interface RawWarehouseSummary {
  source_count: number;
  raw_item_count: number;
  candidate_count: number;
  candidate_type_counts: Record<string, number>;
  valid_for_review_count: number;
  needs_more_info_count: number;
  blocked_count: number;
  approved_as_candidate_count: number;
  rejected_count: number;
  needs_merge_count: number;
  proposal_count: number;
  price_candidate_count: number;
  unapproved_price_count: number;
  approved_as_candidate_is_formal_approval: false;
  formal_price_generated: false;
  price_authority: RawWarehousePriceAuthority;
  observed_price_safety_valid: boolean;
  observed_price_safety_error_count: number;
  proposal_contract_valid: boolean;
  proposal_contract_error_count: number;
  proposal_contract_warning_count: number;
  warehouse_export_safety_valid: boolean;
  warehouse_export_safety_error_count: number;
  warehouse_forbidden_field_hit_count: number;
  static_guard_valid: boolean;
  static_guard_error_count: number;
  proposal_with_full_provenance_count: number;
  proposal_missing_provenance_count: number;
  merge_policy_flag_count: number;
  merge_policy_recommendation_count: number;
  risk_flag_counts: Record<string, number>;
}
