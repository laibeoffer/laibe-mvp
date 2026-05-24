import { runRawMultiSourceFixtureTrial } from "./multi-source-fixtures.ts";

const result = runRawMultiSourceFixtureTrial();

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

if (result.summary.brand_model_price_bearing_count !== 0) {
  throw new Error("Brand model catalog candidates must not be price-bearing.");
}

console.log(
  JSON.stringify(
    {
      summary: result.summary,
      source_type_counts: result.summary.source_type_counts,
      candidate_type_counts: result.summary.candidate_type_counts,
      source_samples: result.sources.map((source) => ({
        source_id: source.id,
        source_type: source.source_type,
        source_name: source.source_name,
        source_reliability: source.source_reliability,
        source_date: source.source_date,
        raw_item_count: source.raw_items.length,
      })),
      candidate_samples: result.candidates.slice(0, 5).map((candidate) => ({
        candidate_id: candidate.candidate_id,
        candidate_type: candidate.candidate_type,
        source_type: candidate.source_type,
        suggested_name: candidate.suggested_name,
        suggested_code: candidate.suggested_code,
        observed_price: candidate.observed_price,
        currency: candidate.currency,
      })),
      brand_model_candidates: result.candidates
        .filter((candidate) => candidate.candidate_type === "brand_model")
        .map((candidate) => ({
          candidate_id: candidate.candidate_id,
          suggested_name: candidate.suggested_name,
          observed_price: candidate.observed_price,
          currency: candidate.currency,
        })),
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
      },
    },
    null,
    2,
  ),
);
