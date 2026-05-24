import { classifyRawCatalogItems } from "./candidate-classifier.ts";
import { validateCandidates } from "./candidate-validator.ts";
import { createHandoffProposals } from "./handoff-proposal.ts";
import { validateHandoffProposalContract } from "./handoff-proposal-contract-validator.ts";
import { validateObservedPriceSafety } from "./observed-price-safety.ts";
import {
  countReviewStatuses,
  createReviewQueue,
  simulateHumanReview,
} from "./review-queue.ts";
import { collectRawCatalogItems } from "./source-collector.ts";
import { runRawWarehouseStaticGuard } from "./static-guard.ts";
import {
  RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  RAW_WAREHOUSE_PRICE_AUTHORITY,
} from "./types.ts";
import type {
  CandidateValidationResult,
  CatalogReviewItem,
  HandoffProposal,
  RawCatalogCandidate,
  RawCatalogItem,
  RawCatalogSource,
} from "./types.ts";
import { validateWarehouseExportSafety } from "./warehouse-export-safety.ts";

export interface BudgetSheetSampleRow {
  工程類別: string;
  品名: string;
  單位: string;
  數量: number;
  單價: number;
  金額: number;
  備註: string;
}

export interface RawDataFeedingTrialResult {
  sample_rows: BudgetSheetSampleRow[];
  raw_source: RawCatalogSource;
  raw_items: RawCatalogItem[];
  candidates: RawCatalogCandidate[];
  validation_results: CandidateValidationResult[];
  review_queue: CatalogReviewItem[];
  handoff_proposals: HandoffProposal[];
  summary: {
    sample_row_count: number;
    raw_item_count: number;
    candidate_count: number;
    valid_for_review_count: number;
    needs_more_info_count: number;
    blocked_count: number;
    review_queue_count: number;
    proposal_count: number;
    proposal_contract_valid: boolean;
    warehouse_export_safety_valid: boolean;
    observed_price_safety_valid: boolean;
    static_guard_valid: boolean;
    formal_price_generated: false;
    price_authority: "none";
    formal_pricing_rule_generated: false;
    formal_budget_line_generated: false;
  };
  reports: {
    proposal_contract: ReturnType<typeof validateHandoffProposalContract>;
    warehouse_export_safety: ReturnType<typeof validateWarehouseExportSafety>;
    observed_price_safety: ReturnType<typeof validateObservedPriceSafety>;
    static_guard: ReturnType<typeof runRawWarehouseStaticGuard>;
  };
}

export const rawDataFeedingTrialSampleRows: BudgetSheetSampleRow[] = [
  {
    工程類別: "木作工程",
    品名: "中島吧檯矮櫃",
    單位: "尺",
    數量: 5.5,
    單價: 3500,
    金額: 19250,
    備註: "不含人造石及設備",
  },
  {
    工程類別: "木作工程",
    品名: "衣櫃桶身",
    單位: "尺",
    數量: 8,
    單價: 3200,
    金額: 25600,
    備註: "E1 等級",
  },
  {
    工程類別: "木作工程",
    品名: "鞋櫃桶身",
    單位: "尺",
    數量: 5,
    單價: 3000,
    金額: 15000,
    備註: "E1 等級",
  },
  {
    工程類別: "泥作工程",
    品名: "浴室彈性水泥防水 H:240",
    單位: "間",
    數量: 2,
    單價: 12000,
    金額: 24000,
    備註: "施作兩層",
  },
  {
    工程類別: "泥作工程",
    品名: "浴室壁磚貼工",
    單位: "坪",
    數量: 14,
    單價: 3000,
    金額: 42000,
    備註: "不含磁磚",
  },
  {
    工程類別: "泥作工程",
    品名: "浴室地磚貼工",
    單位: "坪",
    數量: 4,
    單價: 3000,
    金額: 12000,
    備註: "不含磁磚",
  },
  {
    工程類別: "水電工程",
    品名: "插座出口延伸",
    單位: "口",
    數量: 8,
    單價: 1800,
    金額: 14400,
    備註: "依現場管線調整",
  },
  {
    工程類別: "水電工程",
    品名: "燈具出線及安裝",
    單位: "盞",
    數量: 6,
    單價: 1200,
    金額: 7200,
    備註: "不含燈具本體",
  },
  {
    工程類別: "其他",
    品名: "保護工程",
    單位: "式",
    數量: 1,
    單價: 15000,
    金額: 15000,
    備註: "依現場狀況",
  },
  {
    工程類別: "其他",
    品名: "清潔工程",
    單位: "式",
    數量: 1,
    單價: 8000,
    金額: 8000,
    備註: "完工清潔",
  },
];

export function createRawCatalogSourceFromBudgetRows(
  rows: BudgetSheetSampleRow[],
  options: {
    source_id?: string;
    source_name?: string;
    source_date?: string;
    captured_at?: string;
    region?: string;
    currency?: string;
  } = {},
): RawCatalogSource {
  const sourceId = options.source_id ?? "raw_source_budget_sheet_trial_001";
  const sourceDate = options.source_date ?? "2026-05-23";
  const capturedAt = options.captured_at ?? "2026-05-23T00:00:00.000Z";
  const region = options.region ?? "TW-TPE";
  const currency = options.currency ?? "TWD";

  return {
    id: sourceId,
    source_type: "historical_quote",
    source_name: options.source_name ?? "R1.2A manually arranged budget sheet sample",
    source_owner: "laibe_raw_warehouse_trial",
    source_date: sourceDate,
    captured_at: capturedAt,
    region,
    currency,
    source_note:
      "Small batch feeding sample; candidate evidence only, no formal price generated.",
    source_reliability: "medium",
    raw_items: rows.map((row, index) => ({
      id: `raw_item_budget_sheet_trial_${String(index + 1).padStart(3, "0")}`,
      source_id: sourceId,
      row_index: index + 1,
      raw_category: row.工程類別,
      raw_name: row.品名,
      raw_brand: null,
      raw_model: null,
      raw_spec: row.備註,
      raw_unit: row.單位,
      raw_quantity: row.數量,
      raw_unit_price: row.單價,
      raw_amount: row.金額,
      raw_currency: currency,
      raw_note: row.備註,
      raw_text: [
        row.工程類別,
        row.品名,
        row.單位,
        String(row.數量),
        String(row.單價),
        String(row.金額),
        row.備註,
      ].join(" / "),
      effective_date: sourceDate,
      region,
      vendor_name: null,
      metadata: {
        source_row_shape: "manual_budget_sheet_sample",
        original_row: row,
      },
    })),
    metadata: {
      source_shape: "manual_budget_sheet_rows",
      row_count: rows.length,
    },
  };
}

export function runRawDataFeedingTrial(
  rows = rawDataFeedingTrialSampleRows,
): RawDataFeedingTrialResult {
  const rawSource = createRawCatalogSourceFromBudgetRows(rows);
  const sources = [rawSource];
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
  const observedPriceSafety = validateObservedPriceSafety({
    candidates,
    proposals: handoffProposals,
  });
  const proposalContract = validateHandoffProposalContract(handoffProposals);
  const warehouseExportSafety = validateWarehouseExportSafety({
    candidates,
    review_items: reviewQueue,
    handoff_proposals: handoffProposals,
  });
  const staticGuard = runRawWarehouseStaticGuard();
  const validationCounts = countValidationStatuses(validationResults);

  return {
    sample_rows: rows,
    raw_source: rawSource,
    raw_items: rawItems,
    candidates,
    validation_results: validationResults,
    review_queue: reviewQueue,
    handoff_proposals: handoffProposals,
    summary: {
      sample_row_count: rows.length,
      raw_item_count: rawItems.length,
      candidate_count: candidates.length,
      valid_for_review_count: validationCounts.valid_for_review,
      needs_more_info_count: validationCounts.needs_more_info,
      blocked_count: validationCounts.blocked,
      review_queue_count: reviewQueue.length,
      proposal_count: handoffProposals.length,
      proposal_contract_valid: proposalContract.valid,
      warehouse_export_safety_valid: warehouseExportSafety.valid,
      observed_price_safety_valid: observedPriceSafety.valid,
      static_guard_valid: staticGuard.valid,
      formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
      price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
      formal_pricing_rule_generated: false,
      formal_budget_line_generated: false,
    },
    reports: {
      proposal_contract: proposalContract,
      warehouse_export_safety: warehouseExportSafety,
      observed_price_safety: observedPriceSafety,
      static_guard: staticGuard,
    },
  };
}

export function countReviewQueueStatuses(
  reviewQueue: CatalogReviewItem[],
): Record<string, number> {
  return countReviewStatuses(reviewQueue);
}

function countValidationStatuses(
  validationResults: CandidateValidationResult[],
): Record<"valid_for_review" | "needs_more_info" | "blocked", number> {
  return validationResults.reduce(
    (counts, result) => {
      counts[result.status] += 1;
      return counts;
    },
    {
      valid_for_review: 0,
      needs_more_info: 0,
      blocked: 0,
    },
  );
}
