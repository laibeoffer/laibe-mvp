import type {
  CandidateValidationResult,
  RawCatalogCandidate,
  RawCatalogItem,
  RawCatalogSource,
  RawCandidateRiskFlag,
  RawCandidateType,
  ReviewStatus,
  ReviewerChecklistItem,
  ReviewerChecklistStatus,
  SourceQualityAssessment,
  SourceQualityGrade,
} from "./types.ts";
import {
  RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  RAW_WAREHOUSE_PRICE_AUTHORITY,
} from "./types.ts";

const priceBearingCandidateTypes = new Set<RawCandidateType>([
  "historical_quote_line",
  "material_price",
  "vendor_quote",
  "market_price",
  "labor_rate",
]);

export interface SourceQualityScoringContext {
  sources: RawCatalogSource[];
  raw_items: RawCatalogItem[];
  candidates: RawCatalogCandidate[];
  validation_results: CandidateValidationResult[];
}

export interface SourceQualityScoringSummary {
  assessment_count: number;
  average_quality_score: number;
  grade_counts: Record<SourceQualityGrade, number>;
  checklist_status_counts: Record<ReviewerChecklistStatus, number>;
  reviewer_checklist_item_count: number;
  needs_more_info_recommendation_count: number;
  blocked_recommendation_count: number;
  formal_price_generated: false;
  price_authority: "none";
}

export interface SourceQualityScoringResult {
  assessments: SourceQualityAssessment[];
  summary: SourceQualityScoringSummary;
}

export function scoreSourceQualityForCandidates(
  context: SourceQualityScoringContext,
): SourceQualityScoringResult {
  const sourceById = new Map(context.sources.map((source) => [source.id, source]));
  const rawItemById = new Map(context.raw_items.map((item) => [item.id, item]));
  const validationByCandidateId = new Map(
    context.validation_results.map((result) => [result.candidate_id, result]),
  );

  const assessments = context.candidates.map((candidate) => {
    const rawItem = rawItemById.get(candidate.source_item_id);
    const source = rawItem ? sourceById.get(rawItem.source_id) : undefined;
    const validation = validationByCandidateId.get(candidate.candidate_id);

    return buildSourceQualityAssessment(candidate, rawItem, source, validation);
  });

  return {
    assessments,
    summary: summarizeSourceQualityAssessments(assessments),
  };
}

function buildSourceQualityAssessment(
  candidate: RawCatalogCandidate,
  rawItem: RawCatalogItem | undefined,
  source: RawCatalogSource | undefined,
  validation: CandidateValidationResult | undefined,
): SourceQualityAssessment {
  const riskFlags = [
    ...new Set([...(candidate.risk_flags ?? []), ...(validation?.risk_flags ?? [])]),
  ];
  const checklist = buildReviewerChecklist(candidate, rawItem, source, validation, riskFlags);
  const evidenceCompletenessScore = scoreEvidenceCompleteness(checklist);
  const traceabilityScore = scoreTraceability(source, rawItem);
  const commercialEvidenceScore = scoreCommercialEvidence(candidate, rawItem);
  const riskScorePenalty = scoreRiskPenalty(candidate, source, validation, riskFlags);
  const qualityScore = clampScore(
    Math.round(
      evidenceCompletenessScore * 0.4 +
        traceabilityScore * 0.25 +
        commercialEvidenceScore * 0.2 +
        candidate.confidence * 15 -
        riskScorePenalty,
    ),
  );
  const recommendedReviewStatus = getRecommendedReviewStatus(
    qualityScore,
    candidate,
    validation,
    riskFlags,
  );

  return {
    assessment_id: `source_quality_${candidate.candidate_id}`,
    candidate_id: candidate.candidate_id,
    source_item_id: candidate.source_item_id,
    source_id: source?.id ?? rawItem?.source_id ?? "UNKNOWN_SOURCE",
    source_type: source?.source_type ?? candidate.source_type,
    source_reliability: source?.source_reliability ?? candidate.source_reliability,
    source_date: source?.source_date ?? candidate.effective_date ?? "",
    quality_score: qualityScore,
    quality_grade: getQualityGrade(qualityScore, recommendedReviewStatus),
    evidence_completeness_score: evidenceCompletenessScore,
    traceability_score: traceabilityScore,
    commercial_evidence_score: commercialEvidenceScore,
    risk_score_penalty: riskScorePenalty,
    reviewer_checklist: checklist,
    recommended_review_status: recommendedReviewStatus,
    recommendation_reason: getRecommendationReason(
      recommendedReviewStatus,
      qualityScore,
      riskFlags,
    ),
    formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
    price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
    observed_price_is_evidence_only: true,
  };
}

function buildReviewerChecklist(
  candidate: RawCatalogCandidate,
  rawItem: RawCatalogItem | undefined,
  source: RawCatalogSource | undefined,
  validation: CandidateValidationResult | undefined,
  riskFlags: RawCandidateRiskFlag[],
): ReviewerChecklistItem[] {
  const hasObservedPrice = candidate.observed_price !== null || rawItem?.raw_unit_price !== null;
  const isPriceBearing = priceBearingCandidateTypes.has(candidate.candidate_type);

  return [
    checklistItem(
      "source_identity",
      "Source identity is traceable",
      source?.id && source.source_name ? "pass" : "fail",
      source?.id && source.source_name
        ? "Source id and name are present."
        : "Source id or name is missing.",
      [],
    ),
    checklistItem(
      "source_date",
      "Source date is present",
      source?.source_date ? "pass" : "warning",
      source?.source_date
        ? "Source date is present."
        : "Source date is missing and must be confirmed.",
      ["missing_source_date", "effective_date_missing"],
    ),
    checklistItem(
      "source_reliability",
      "Source reliability is reviewable",
      source?.source_reliability === "high" || source?.source_reliability === "medium"
        ? "pass"
        : "warning",
      `Source reliability is ${source?.source_reliability ?? candidate.source_reliability}.`,
      ["low_source_reliability", "manual_review_required"],
    ),
    checklistItem(
      "raw_item_trace",
      "Raw item preserves source row evidence",
      rawItem?.id && rawItem.raw_name ? "pass" : "fail",
      rawItem?.id && rawItem.raw_name
        ? "Raw row id and raw name are present."
        : "Raw row id or raw name is missing.",
      ["source_scope_unclear"],
    ),
    checklistItem(
      "candidate_code",
      "Suggested code is present",
      candidate.suggested_code ? "pass" : "warning",
      candidate.suggested_code
        ? "Suggested code exists for review."
        : "Suggested code is missing.",
      ["missing_suggested_code", "possible_merge_required"],
    ),
    checklistItem(
      "unit",
      "Unit is present when needed",
      !isPriceBearing || candidate.unit ? "pass" : "warning",
      !isPriceBearing
        ? "Unit is not required for this non-price-bearing candidate."
        : candidate.unit
          ? "Unit is present."
          : "Unit is missing and must be confirmed.",
      ["missing_unit", "unit_mismatch"],
    ),
    checklistItem(
      "currency",
      "Currency is present for price evidence",
      !isPriceBearing || candidate.currency ? "pass" : "warning",
      !isPriceBearing
        ? "Currency is not required for this non-price-bearing candidate."
        : candidate.currency
          ? "Currency is present."
          : "Currency is missing and must be confirmed.",
      ["missing_currency"],
    ),
    checklistItem(
      "observed_price",
      "Observed price is evidence only",
      !hasObservedPrice
        ? "not_applicable"
        : candidate.observed_price !== null && candidate.observed_price >= 0
          ? "warning"
          : "fail",
      !hasObservedPrice
        ? "No observed price is attached to this candidate."
        : candidate.observed_price !== null && candidate.observed_price >= 0
          ? "Observed price exists but remains candidate evidence only."
          : "Observed price is invalid.",
      ["missing_price", "blocked_negative_price", "price_outlier_high", "price_outlier_low"],
    ),
    checklistItem(
      "validation_status",
      "Validation status can be reviewed",
      validation?.status === "valid_for_review"
        ? "pass"
        : validation?.status === "needs_more_info"
          ? "warning"
          : "fail",
      `Validation status is ${validation?.status ?? "missing"}.`,
      riskFlags,
    ),
  ];
}

function checklistItem(
  checklistCode: string,
  label: string,
  status: ReviewerChecklistStatus,
  reason: string,
  relatedRiskFlags: RawCandidateRiskFlag[],
): ReviewerChecklistItem {
  return {
    checklist_code: checklistCode,
    label,
    status,
    reason,
    related_risk_flags: relatedRiskFlags,
  };
}

function scoreEvidenceCompleteness(checklist: ReviewerChecklistItem[]): number {
  const scoredItems = checklist.filter((item) => item.status !== "not_applicable");
  const passScore = scoredItems.reduce((total, item) => {
    if (item.status === "pass") {
      return total + 1;
    }
    if (item.status === "warning") {
      return total + 0.5;
    }
    return total;
  }, 0);

  if (scoredItems.length === 0) {
    return 0;
  }

  return clampScore(Math.round((passScore / scoredItems.length) * 100));
}

function scoreTraceability(
  source: RawCatalogSource | undefined,
  rawItem: RawCatalogItem | undefined,
): number {
  let score = 0;

  if (source?.id) score += 20;
  if (source?.source_name) score += 20;
  if (source?.source_date) score += 20;
  if (source?.region) score += 15;
  if (rawItem?.id) score += 15;
  if (rawItem?.row_index !== undefined) score += 10;

  return clampScore(score);
}

function scoreCommercialEvidence(
  candidate: RawCatalogCandidate,
  rawItem: RawCatalogItem | undefined,
): number {
  if (!priceBearingCandidateTypes.has(candidate.candidate_type)) {
    return 100;
  }

  let score = 0;

  if (candidate.unit) score += 25;
  if (candidate.currency) score += 25;
  if (candidate.observed_price !== null && candidate.observed_price >= 0) score += 25;
  if (rawItem?.vendor_name || rawItem?.raw_note) score += 15;
  if (candidate.effective_date) score += 10;

  return clampScore(score);
}

function scoreRiskPenalty(
  candidate: RawCatalogCandidate,
  source: RawCatalogSource | undefined,
  validation: CandidateValidationResult | undefined,
  riskFlags: RawCandidateRiskFlag[],
): number {
  let penalty = 0;

  if (validation?.status === "blocked") penalty += 50;
  if (validation?.status === "needs_more_info") penalty += 20;
  if (candidate.confidence < 0.5) penalty += 15;
  if (source?.source_reliability === "low") penalty += 20;
  if (source?.source_reliability === "unknown") penalty += 25;
  if (riskFlags.includes("blocked_negative_price")) penalty += 50;
  if (riskFlags.includes("ambiguous_name")) penalty += 20;
  if (riskFlags.includes("missing_currency")) penalty += 15;
  if (riskFlags.includes("missing_unit")) penalty += 15;
  if (riskFlags.includes("missing_source_date")) penalty += 15;
  if (riskFlags.includes("price_outlier_high")) penalty += 15;
  if (riskFlags.includes("price_outlier_low")) penalty += 15;
  if (riskFlags.includes("unit_mismatch")) penalty += 15;

  return Math.min(penalty, 90);
}

function getRecommendedReviewStatus(
  qualityScore: number,
  candidate: RawCatalogCandidate,
  validation: CandidateValidationResult | undefined,
  riskFlags: RawCandidateRiskFlag[],
): ReviewStatus {
  if (validation?.status === "blocked" || riskFlags.includes("blocked_negative_price")) {
    return "rejected";
  }

  if (validation?.status === "needs_more_info" || qualityScore < 55) {
    return "needs_more_info";
  }

  if (
    riskFlags.includes("possible_merge_required") ||
    riskFlags.includes("duplicate_suggested_code")
  ) {
    return "needs_merge";
  }

  if (candidate.confidence >= 0.7 && qualityScore >= 70) {
    return "approved_as_candidate";
  }

  return "pending";
}

function getQualityGrade(
  score: number,
  recommendedReviewStatus: ReviewStatus,
): SourceQualityGrade {
  if (recommendedReviewStatus === "rejected") return "blocked";
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "watch";
  return "poor";
}

function getRecommendationReason(
  status: ReviewStatus,
  score: number,
  riskFlags: RawCandidateRiskFlag[],
): string {
  if (status === "rejected") {
    return "Candidate should be rejected or held because blocking risk was detected.";
  }
  if (status === "needs_more_info") {
    return "Candidate needs more source evidence before downstream review.";
  }
  if (status === "needs_merge") {
    return "Candidate should be checked against existing similar evidence.";
  }
  if (status === "approved_as_candidate") {
    return "Candidate evidence is strong enough to move to downstream review only.";
  }

  return `Candidate can remain pending review with score ${score} and ${riskFlags.length} risk flags.`;
}

function summarizeSourceQualityAssessments(
  assessments: SourceQualityAssessment[],
): SourceQualityScoringSummary {
  const gradeCounts = initGradeCounts();
  const checklistStatusCounts = initChecklistCounts();
  let checklistItemCount = 0;

  for (const assessment of assessments) {
    gradeCounts[assessment.quality_grade] += 1;

    for (const item of assessment.reviewer_checklist) {
      checklistStatusCounts[item.status] += 1;
      checklistItemCount += 1;
    }
  }

  return {
    assessment_count: assessments.length,
    average_quality_score:
      assessments.length === 0
        ? 0
        : Math.round(
            assessments.reduce((total, item) => total + item.quality_score, 0) /
              assessments.length,
          ),
    grade_counts: gradeCounts,
    checklist_status_counts: checklistStatusCounts,
    reviewer_checklist_item_count: checklistItemCount,
    needs_more_info_recommendation_count: assessments.filter(
      (item) => item.recommended_review_status === "needs_more_info",
    ).length,
    blocked_recommendation_count: assessments.filter(
      (item) => item.recommended_review_status === "rejected",
    ).length,
    formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
    price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
  };
}

function initGradeCounts(): Record<SourceQualityGrade, number> {
  return {
    excellent: 0,
    good: 0,
    watch: 0,
    poor: 0,
    blocked: 0,
  };
}

function initChecklistCounts(): Record<ReviewerChecklistStatus, number> {
  return {
    pass: 0,
    warning: 0,
    fail: 0,
    not_applicable: 0,
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}
