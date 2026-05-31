import { classifyRawCatalogItems } from "./candidate-classifier.ts";
import { validateCandidates } from "./candidate-validator.ts";
import { createHandoffProposals } from "./handoff-proposal.ts";
import { validateHandoffProposalContract } from "./handoff-proposal-contract-validator.ts";
import { rawMultiSourceFixtureSources } from "./multi-source-fixtures.ts";
import { rawNegativeSourceQualityFixtureSources } from "./negative-source-quality-fixtures.ts";
import { validateObservedPriceSafety } from "./observed-price-safety.ts";
import {
  createReviewQueue,
  simulateHumanReview,
} from "./review-queue.ts";
import { collectRawCatalogItems } from "./source-collector.ts";
import { scoreSourceQualityForCandidates } from "./source-quality-scoring.ts";
import { runRawWarehouseStaticGuard } from "./static-guard.ts";
import {
  RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  RAW_WAREHOUSE_PRICE_AUTHORITY,
} from "./types.ts";
import { validateWarehouseExportSafety } from "./warehouse-export-safety.ts";

const sources = [
  ...rawMultiSourceFixtureSources,
  ...rawNegativeSourceQualityFixtureSources,
];
const rawItems = collectRawCatalogItems(sources);
const candidates = classifyRawCatalogItems(rawItems, sources);
const validationResults = validateCandidates(candidates);
const reviewQueue = simulateHumanReview(
  createReviewQueue(candidates, validationResults),
  candidates,
);
const handoffProposals = createHandoffProposals(reviewQueue, candidates, {
  sources,
  raw_items: rawItems,
  validation_results: validationResults,
});
const sourceQuality = scoreSourceQualityForCandidates({
  sources,
  raw_items: rawItems,
  candidates,
  validation_results: validationResults,
});
const proposalContract = validateHandoffProposalContract(handoffProposals);
const warehouseExportSafety = validateWarehouseExportSafety({
  candidates,
  review_items: reviewQueue,
  handoff_proposals: handoffProposals,
});
const observedPriceSafety = validateObservedPriceSafety({
  candidates,
  proposals: handoffProposals,
});
const staticGuard = runRawWarehouseStaticGuard();

const summary = {
  source_count: sources.length,
  raw_item_count: rawItems.length,
  candidate_count: candidates.length,
  source_quality_assessment_count: sourceQuality.summary.assessment_count,
  average_quality_score: sourceQuality.summary.average_quality_score,
  grade_counts: sourceQuality.summary.grade_counts,
  checklist_status_counts: sourceQuality.summary.checklist_status_counts,
  reviewer_checklist_item_count:
    sourceQuality.summary.reviewer_checklist_item_count,
  needs_more_info_recommendation_count:
    sourceQuality.summary.needs_more_info_recommendation_count,
  blocked_recommendation_count:
    sourceQuality.summary.blocked_recommendation_count,
  proposal_count: handoffProposals.length,
  proposal_contract_valid: proposalContract.valid,
  warehouse_export_safety_valid: warehouseExportSafety.valid,
  observed_price_safety_valid: observedPriceSafety.valid,
  static_guard_valid: staticGuard.valid,
  formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
  formal_pricing_rule_generated: false,
  formal_budget_line_generated: false,
};

if (summary.source_quality_assessment_count !== summary.candidate_count) {
  throw new Error("Every candidate must receive one source quality assessment.");
}

if (summary.formal_price_generated !== false) {
  throw new Error("Raw source quality scoring must not generate formal price.");
}

if (summary.price_authority !== "none") {
  throw new Error("Raw source quality scoring price authority must remain none.");
}

if (!summary.proposal_contract_valid) {
  throw new Error("Handoff proposal contract validation failed.");
}

if (!summary.warehouse_export_safety_valid) {
  throw new Error("Warehouse export safety validation failed.");
}

if (!summary.observed_price_safety_valid) {
  throw new Error("Observed price safety validation failed.");
}

if (!summary.static_guard_valid) {
  throw new Error("Raw warehouse static guard failed.");
}

console.log(
  JSON.stringify(
    {
      summary,
      first_assessment: sourceQuality.assessments[0] ?? null,
      sample_needs_attention: sourceQuality.assessments
        .filter((assessment) =>
          ["needs_more_info", "rejected"].includes(
            assessment.recommended_review_status,
          ),
        )
        .slice(0, 5),
      reports: {
        proposal_contract: {
          valid: proposalContract.valid,
          error_count: proposalContract.errors.length,
          warning_count: proposalContract.warnings.length,
        },
        warehouse_export_safety: {
          valid: warehouseExportSafety.valid,
          error_count: warehouseExportSafety.errors.length,
          forbidden_field_hit_count:
            warehouseExportSafety.forbidden_field_hit_count,
        },
        observed_price_safety: {
          valid: observedPriceSafety.valid,
          error_count: observedPriceSafety.errors.length,
          forbidden_field_hit_count:
            observedPriceSafety.forbidden_field_hits.length,
        },
        static_guard: {
          valid: staticGuard.valid,
          error_count: staticGuard.errors.length,
          scanned_file_count: staticGuard.scanned_files.length,
        },
      },
    },
    null,
    2,
  ),
);
