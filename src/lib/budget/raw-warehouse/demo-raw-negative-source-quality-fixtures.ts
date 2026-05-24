import { runRawNegativeSourceQualityFixtureTrial } from "./negative-source-quality-fixtures.ts";

const result = runRawNegativeSourceQualityFixtureTrial();

if (result.summary.needs_more_info_count <= 0) {
  throw new Error("Negative fixture demo must produce needs_more_info candidates.");
}

if (result.summary.blocked_count <= 0) {
  throw new Error("Negative fixture demo must produce blocked candidates.");
}

if (result.summary.rejected_count <= 0) {
  throw new Error("Negative fixture demo must produce rejected review items.");
}

if (!result.summary.proposal_contract_valid) {
  throw new Error("Handoff proposal contract check failed.");
}

if (!result.summary.warehouse_export_safety_valid) {
  throw new Error("Warehouse export safety check failed.");
}

if (!result.summary.observed_price_safety_valid) {
  throw new Error("Observed price safety check failed.");
}

if (!result.summary.static_guard_valid) {
  throw new Error("Raw warehouse static guard check failed.");
}

if (result.summary.formal_price_generated !== false) {
  throw new Error("Raw warehouse must not generate formal price.");
}

if (result.summary.price_authority !== "none") {
  throw new Error("Raw warehouse price authority must remain none.");
}

const requiredPositiveCounts = [
  "missing_source_date_count",
  "missing_currency_count",
  "missing_unit_count",
  "blocked_negative_price_count",
  "price_outlier_high_count",
  "price_outlier_low_count",
  "unit_mismatch_count",
  "same_source_period_duplicate_count",
  "missing_model_count",
  "missing_spec_count",
  "low_source_reliability_count",
  "ambiguous_name_count",
] as const;

for (const key of requiredPositiveCounts) {
  if (result.summary[key] <= 0) {
    throw new Error(`Negative fixture demo did not produce ${key}.`);
  }
}

const negativePriceCandidateIds = new Set(
  result.fixture_statuses
    .filter((status) => status.fixture === "blocked_negative_price")
    .map((status) => status.candidate_id),
);
const negativePriceProposal = result.handoff_proposals.find((proposal) =>
  negativePriceCandidateIds.has(proposal.candidate_id),
);

if (negativePriceProposal) {
  throw new Error("Blocked negative price candidate must not produce a handoff proposal.");
}

console.log(
  JSON.stringify(
    {
      summary: result.summary,
      fixture_statuses: result.fixture_statuses,
      reports: {
        proposal_contract: {
          valid: result.reports.proposal_contract.valid,
          checked_count: result.reports.proposal_contract.checked_count,
          error_count: result.reports.proposal_contract.errors.length,
          warning_count: result.reports.proposal_contract.warnings.length,
        },
        warehouse_export_safety: {
          valid: result.reports.warehouse_export_safety.valid,
          scanned_object_count:
            result.reports.warehouse_export_safety.scanned_object_count,
          forbidden_field_hit_count:
            result.reports.warehouse_export_safety.forbidden_field_hit_count,
          error_count: result.reports.warehouse_export_safety.errors.length,
        },
        observed_price_safety: {
          valid: result.reports.observed_price_safety.valid,
          error_count: result.reports.observed_price_safety.errors.length,
          forbidden_field_hit_count:
            result.reports.observed_price_safety.forbidden_field_hits.length,
        },
        static_guard: {
          valid: result.reports.static_guard.valid,
          error_count: result.reports.static_guard.errors.length,
          scanned_file_count: result.reports.static_guard.scanned_files.length,
        },
        merge_policy: {
          flag_counts: result.reports.merge_policy.flag_counts,
          recommendation_count: result.reports.merge_policy.recommendation_count,
        },
      },
    },
    null,
    2,
  ),
);
