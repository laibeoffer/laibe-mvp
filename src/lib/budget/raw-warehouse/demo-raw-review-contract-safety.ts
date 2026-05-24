import { classifyRawCatalogItems } from "./candidate-classifier.ts";
import { validateCandidates } from "./candidate-validator.ts";
import { createHandoffProposals } from "./handoff-proposal.ts";
import { validateHandoffProposalContract } from "./handoff-proposal-contract-validator.ts";
import { evaluateRawCandidateMergePolicy } from "./merge-policy.ts";
import { mockRawCatalogSources } from "./mock-raw-sources.ts";
import {
  countReviewStatuses,
  createReviewQueue,
  simulateHumanReview,
} from "./review-queue.ts";
import { collectRawCatalogItems } from "./source-collector.ts";
import {
  RAW_WAREHOUSE_APPROVED_AS_CANDIDATE_IS_FORMAL_APPROVAL,
  RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  RAW_WAREHOUSE_PRICE_AUTHORITY,
} from "./types.ts";
import { validateWarehouseExportSafety } from "./warehouse-export-safety.ts";

const existingCatalogCodes = new Set([
  "WOOD_ISLAND_BASE_CABINET",
  "BATHROOM_WALL_TILE_LABOR",
]);

const rawItems = collectRawCatalogItems(mockRawCatalogSources);
const candidates = classifyRawCatalogItems(rawItems, mockRawCatalogSources);
const validationResults = validateCandidates(candidates, {
  existing_catalog_codes: existingCatalogCodes,
});
const initialReviewQueue = createReviewQueue(
  candidates,
  validationResults,
  existingCatalogCodes,
);
const reviewedQueue = simulateHumanReview(initialReviewQueue, candidates);
const handoffProposals = createHandoffProposals(reviewedQueue, candidates, {
  sources: mockRawCatalogSources,
  raw_items: rawItems,
  validation_results: validationResults,
});
const proposalContractReport = validateHandoffProposalContract(handoffProposals);
const warehouseExportSafetyReport = validateWarehouseExportSafety({
  candidates,
  review_items: reviewedQueue,
  handoff_proposals: handoffProposals,
});
const mergePolicyReport = evaluateRawCandidateMergePolicy(candidates, {
  raw_items: rawItems,
  existing_catalog_codes: existingCatalogCodes,
});
const reviewStatusCounts = countReviewStatuses(reviewedQueue);

const summary = {
  proposal_contract_valid: proposalContractReport.valid,
  proposal_contract_error_count: proposalContractReport.errors.length,
  proposal_contract_warning_count: proposalContractReport.warnings.length,
  warehouse_export_safety_valid: warehouseExportSafetyReport.valid,
  warehouse_export_safety_error_count: warehouseExportSafetyReport.errors.length,
  warehouse_forbidden_field_hit_count:
    warehouseExportSafetyReport.forbidden_field_hit_count,
  approved_as_candidate_is_formal_approval:
    RAW_WAREHOUSE_APPROVED_AS_CANDIDATE_IS_FORMAL_APPROVAL,
  formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
  merge_policy_flag_count: mergePolicyReport.flag_count,
  merge_policy_recommendation_count: mergePolicyReport.recommendation_count,
  approved_as_candidate_count: reviewStatusCounts.approved_as_candidate,
  needs_merge_count: reviewStatusCounts.needs_merge,
  proposal_count: handoffProposals.length,
};

if (!proposalContractReport.valid) {
  throw new Error("R1.2 proposal contract validation failed.");
}

if (!warehouseExportSafetyReport.valid) {
  throw new Error("R1.2 warehouse export safety validation failed.");
}

if (summary.formal_price_generated !== false) {
  throw new Error("R1.2 demo must keep formal_price_generated false.");
}

if (summary.price_authority !== "none") {
  throw new Error("R1.2 demo must keep price_authority none.");
}

if (summary.approved_as_candidate_is_formal_approval !== false) {
  throw new Error("approved_as_candidate must not be treated as final approval.");
}

console.log(
  JSON.stringify(
    {
      summary,
      proposal_contract: proposalContractReport,
      warehouse_export_safety: {
        valid: warehouseExportSafetyReport.valid,
        error_count: warehouseExportSafetyReport.errors.length,
        warning_count: warehouseExportSafetyReport.warnings.length,
        forbidden_field_hit_count:
          warehouseExportSafetyReport.forbidden_field_hit_count,
        warnings_sample: warehouseExportSafetyReport.warnings.slice(0, 5),
      },
      merge_policy: {
        flag_counts: mergePolicyReport.flag_counts,
        recommendation_count: mergePolicyReport.recommendation_count,
        recommendations_sample: mergePolicyReport.recommendations.slice(0, 5),
      },
    },
    null,
    2,
  ),
);
