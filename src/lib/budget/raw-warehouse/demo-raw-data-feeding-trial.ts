import { runRawDataFeedingTrial } from "./raw-data-feeding-trial.ts";

const result = runRawDataFeedingTrial();

if (!result.summary.observed_price_safety_valid) {
  throw new Error("Observed price safety failed in raw data feeding trial.");
}

if (!result.summary.proposal_contract_valid) {
  throw new Error("Proposal contract failed in raw data feeding trial.");
}

if (!result.summary.warehouse_export_safety_valid) {
  throw new Error("Warehouse export safety failed in raw data feeding trial.");
}

if (!result.summary.static_guard_valid) {
  throw new Error("Raw warehouse static guard failed in raw data feeding trial.");
}

if (result.summary.formal_price_generated !== false) {
  throw new Error("Raw data feeding trial must not generate formal prices.");
}

if (result.summary.price_authority !== "none") {
  throw new Error("Raw data feeding trial price authority must remain none.");
}

if (result.summary.formal_pricing_rule_generated !== false) {
  throw new Error("Raw data feeding trial must not generate formal pricing rules.");
}

if (result.summary.formal_budget_line_generated !== false) {
  throw new Error("Raw data feeding trial must not generate formal budget lines.");
}

console.log(
  JSON.stringify(
    {
      summary: result.summary,
      raw_source: {
        id: result.raw_source.id,
        source_type: result.raw_source.source_type,
        source_name: result.raw_source.source_name,
        source_date: result.raw_source.source_date,
        source_reliability: result.raw_source.source_reliability,
        raw_item_count: result.raw_source.raw_items.length,
      },
      candidate_samples: result.candidates.slice(0, 3).map((candidate) => ({
        candidate_id: candidate.candidate_id,
        candidate_type: candidate.candidate_type,
        suggested_code: candidate.suggested_code,
        suggested_name: candidate.suggested_name,
        unit: candidate.unit,
        observed_price: candidate.observed_price,
        risk_flags: candidate.risk_flags,
      })),
      review_queue_status_counts: result.review_queue.reduce<Record<string, number>>(
        (counts, item) => {
          counts[item.status] = (counts[item.status] ?? 0) + 1;
          return counts;
        },
        {},
      ),
      proposal_contract: {
        valid: result.reports.proposal_contract.valid,
        error_count: result.reports.proposal_contract.errors.length,
        warning_count: result.reports.proposal_contract.warnings.length,
        checked_count: result.reports.proposal_contract.checked_count,
      },
      warehouse_export_safety: {
        valid: result.reports.warehouse_export_safety.valid,
        error_count: result.reports.warehouse_export_safety.errors.length,
        warning_count: result.reports.warehouse_export_safety.warnings.length,
        forbidden_field_hit_count:
          result.reports.warehouse_export_safety.forbidden_field_hit_count,
      },
      observed_price_safety: {
        valid: result.reports.observed_price_safety.valid,
        error_count: result.reports.observed_price_safety.errors.length,
        checked_candidate_count:
          result.reports.observed_price_safety.checked_candidate_count,
        checked_proposal_count:
          result.reports.observed_price_safety.checked_proposal_count,
      },
      static_guard: {
        valid: result.reports.static_guard.valid,
        error_count: result.reports.static_guard.errors.length,
        scanned_file_count: result.reports.static_guard.scanned_files.length,
      },
    },
    null,
    2,
  ),
);
