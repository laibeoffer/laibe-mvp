import { classifyRawCatalogItems } from "./candidate-classifier.ts";
import { validateCandidates } from "./candidate-validator.ts";
import {
  createHandoffProposals,
  hasFullProposalProvenance,
} from "./handoff-proposal.ts";
import { validateHandoffProposalContract } from "./handoff-proposal-contract-validator.ts";
import { InMemoryRawCatalogRepository } from "./in-memory-raw-catalog-repository.ts";
import { evaluateRawCandidateMergePolicy } from "./merge-policy.ts";
import { mockRawCatalogSources } from "./mock-raw-sources.ts";
import { validateObservedPriceSafety } from "./observed-price-safety.ts";
import {
  countReviewStatuses,
  createReviewQueue,
  simulateHumanReview,
} from "./review-queue.ts";
import { collectRawCatalogItems } from "./source-collector.ts";
import { runRawWarehouseStaticGuard } from "./static-guard.ts";
import {
  RAW_WAREHOUSE_APPROVED_AS_CANDIDATE_IS_FORMAL_APPROVAL,
  RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  RAW_WAREHOUSE_PRICE_AUTHORITY,
} from "./types.ts";
import type {
  RawCandidateRiskFlag,
  RawCandidateType,
  RawWarehouseSummary,
} from "./types.ts";
import { validateWarehouseExportSafety } from "./warehouse-export-safety.ts";

const existingCatalogCodes = new Set([
  "WOOD_ISLAND_BASE_CABINET",
  "BATHROOM_WALL_TILE_LABOR",
]);

const priceCandidateTypes = new Set<RawCandidateType>([
  "historical_quote_line",
  "material_price",
  "vendor_quote",
  "market_price",
  "labor_rate",
]);

const repository = new InMemoryRawCatalogRepository();

repository.saveSources(mockRawCatalogSources);

const rawItems = collectRawCatalogItems(repository.listSources());
const candidates = classifyRawCatalogItems(rawItems, repository.listSources());
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
  sources: repository.listSources(),
  raw_items: rawItems,
  validation_results: validationResults,
});
const observedPriceSafetyReport = validateObservedPriceSafety({
  candidates,
  proposals: handoffProposals,
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
const staticGuardReport = runRawWarehouseStaticGuard();

repository.saveCandidates(candidates);
repository.saveReviewItems(reviewedQueue);
repository.saveHandoffProposals(handoffProposals);

const validationStatusCounts = validationResults.reduce<Record<string, number>>(
  (counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  },
  {},
);
const reviewStatusCounts = countReviewStatuses(reviewedQueue);
const candidateTypeCounts = candidates.reduce<Record<string, number>>(
  (counts, candidate) => {
    counts[candidate.candidate_type] = (counts[candidate.candidate_type] ?? 0) + 1;
    return counts;
  },
  {},
);
const priceCandidateCount = candidates.filter((candidate) =>
  priceCandidateTypes.has(candidate.candidate_type),
).length;
const approvedCandidateIds = new Set(
  reviewedQueue
    .filter((item) => item.status === "approved_as_candidate")
    .map((item) => item.candidate_id),
);
const unapprovedPriceCount = candidates.filter(
  (candidate) =>
    priceCandidateTypes.has(candidate.candidate_type) &&
    !approvedCandidateIds.has(candidate.candidate_id),
).length;
const proposalWithFullProvenanceCount = handoffProposals.filter((proposal) =>
  hasFullProposalProvenance(proposal),
).length;
const proposalMissingProvenanceCount =
  handoffProposals.length - proposalWithFullProvenanceCount;
const riskFlagCounts = countRiskFlags(
  validationResults.flatMap((result) => result.risk_flags),
);

const summary: RawWarehouseSummary = {
  source_count: repository.listSources().length,
  raw_item_count: rawItems.length,
  candidate_count: candidates.length,
  candidate_type_counts: candidateTypeCounts,
  valid_for_review_count: validationStatusCounts.valid_for_review ?? 0,
  needs_more_info_count: validationStatusCounts.needs_more_info ?? 0,
  blocked_count: validationStatusCounts.blocked ?? 0,
  approved_as_candidate_count: reviewStatusCounts.approved_as_candidate,
  rejected_count: reviewStatusCounts.rejected,
  needs_merge_count: reviewStatusCounts.needs_merge,
  proposal_count: repository.listHandoffProposals().length,
  price_candidate_count: priceCandidateCount,
  unapproved_price_count: unapprovedPriceCount,
  approved_as_candidate_is_formal_approval:
    RAW_WAREHOUSE_APPROVED_AS_CANDIDATE_IS_FORMAL_APPROVAL,
  formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
  observed_price_safety_valid: observedPriceSafetyReport.valid,
  observed_price_safety_error_count: observedPriceSafetyReport.errors.length,
  proposal_contract_valid: proposalContractReport.valid,
  proposal_contract_error_count: proposalContractReport.errors.length,
  proposal_contract_warning_count: proposalContractReport.warnings.length,
  warehouse_export_safety_valid: warehouseExportSafetyReport.valid,
  warehouse_export_safety_error_count: warehouseExportSafetyReport.errors.length,
  warehouse_forbidden_field_hit_count:
    warehouseExportSafetyReport.forbidden_field_hit_count,
  static_guard_valid: staticGuardReport.valid,
  static_guard_error_count: staticGuardReport.errors.length,
  proposal_with_full_provenance_count: proposalWithFullProvenanceCount,
  proposal_missing_provenance_count: proposalMissingProvenanceCount,
  merge_policy_flag_count: mergePolicyReport.flag_count,
  merge_policy_recommendation_count: mergePolicyReport.recommendation_count,
  risk_flag_counts: riskFlagCounts,
};

if (
  summary.approved_as_candidate_is_formal_approval !==
  RAW_WAREHOUSE_APPROVED_AS_CANDIDATE_IS_FORMAL_APPROVAL
) {
  throw new Error("approved_as_candidate must remain candidate evidence only.");
}
if (summary.formal_price_generated !== RAW_WAREHOUSE_FORMAL_PRICE_GENERATED) {
  throw new Error("Raw Candidate Warehouse must never generate formal prices.");
}
if (summary.price_authority !== RAW_WAREHOUSE_PRICE_AUTHORITY) {
  throw new Error("Raw Candidate Warehouse price authority must remain none.");
}
if (!observedPriceSafetyReport.valid) {
  throw new Error("Observed price safety validation failed.");
}
if (!proposalContractReport.valid) {
  throw new Error("Handoff proposal contract validation failed.");
}
if (!warehouseExportSafetyReport.valid) {
  throw new Error("Warehouse export safety validation failed.");
}
if (!staticGuardReport.valid) {
  throw new Error("Raw warehouse static guard failed.");
}

console.log(
  JSON.stringify(
    {
      summary,
      handoff_proposals: repository.listHandoffProposals(),
      validation_samples: validationResults.slice(0, 3),
      observed_price_safety: observedPriceSafetyReport,
      proposal_contract: proposalContractReport,
      warehouse_export_safety: warehouseExportSafetyReport,
      merge_policy: mergePolicyReport,
      static_guard: {
        valid: staticGuardReport.valid,
        error_count: staticGuardReport.errors.length,
        scanned_files: staticGuardReport.scanned_files,
      },
    },
    null,
    2,
  ),
);

function countRiskFlags(flags: RawCandidateRiskFlag[]): Record<string, number> {
  return flags.reduce<Record<string, number>>((counts, flag) => {
    counts[flag] = (counts[flag] ?? 0) + 1;
    return counts;
  }, {});
}
