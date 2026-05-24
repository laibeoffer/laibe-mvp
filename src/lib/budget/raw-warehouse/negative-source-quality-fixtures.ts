import { classifyRawCatalogItems } from "./candidate-classifier.ts";
import { validateCandidates } from "./candidate-validator.ts";
import { createHandoffProposals } from "./handoff-proposal.ts";
import { validateHandoffProposalContract } from "./handoff-proposal-contract-validator.ts";
import { evaluateRawCandidateMergePolicy } from "./merge-policy.ts";
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
  RawCatalogSourceType,
  RawCandidateRiskFlag,
  SourceReliability,
} from "./types.ts";
import { validateWarehouseExportSafety } from "./warehouse-export-safety.ts";

const capturedAt = "2026-05-24T00:00:00.000Z";
const defaultDate = "2026-05-24";
const defaultRegion = "TW-TPE";
const defaultCurrency = "TWD";

export interface RawNegativeSourceQualityFixtureResult {
  sources: RawCatalogSource[];
  raw_items: RawCatalogItem[];
  candidates: RawCatalogCandidate[];
  validation_results: CandidateValidationResult[];
  review_queue: CatalogReviewItem[];
  handoff_proposals: HandoffProposal[];
  summary: {
    negative_fixture_count: number;
    source_count: number;
    raw_item_count: number;
    candidate_count: number;
    valid_for_review_count: number;
    needs_more_info_count: number;
    blocked_count: number;
    rejected_count: number;
    pending_count: number;
    proposal_count: number;
    risk_flag_counts: Record<string, number>;
    missing_source_date_count: number;
    missing_currency_count: number;
    missing_unit_count: number;
    blocked_negative_price_count: number;
    price_outlier_high_count: number;
    price_outlier_low_count: number;
    unit_mismatch_count: number;
    same_source_period_duplicate_count: number;
    missing_model_count: number;
    missing_spec_count: number;
    low_source_reliability_count: number;
    ambiguous_name_count: number;
    proposal_contract_valid: boolean;
    warehouse_export_safety_valid: boolean;
    observed_price_safety_valid: boolean;
    static_guard_valid: boolean;
    formal_price_generated: false;
    price_authority: "none";
    formal_pricing_rule_generated: false;
    formal_budget_line_generated: false;
  };
  fixture_statuses: Array<{
    fixture: string;
    raw_item_id: string;
    candidate_id: string;
    validation_status: string;
    review_status: string;
    risk_flags: RawCandidateRiskFlag[];
  }>;
  reports: {
    proposal_contract: ReturnType<typeof validateHandoffProposalContract>;
    warehouse_export_safety: ReturnType<typeof validateWarehouseExportSafety>;
    observed_price_safety: ReturnType<typeof validateObservedPriceSafety>;
    static_guard: ReturnType<typeof runRawWarehouseStaticGuard>;
    merge_policy: ReturnType<typeof evaluateRawCandidateMergePolicy>;
  };
}

export const rawNegativeSourceQualityFixtureSources: RawCatalogSource[] = [
  buildSource({
    id: "raw_source_neg_missing_date",
    source_type: "historical_quote",
    source_name: "R1.4 missing source date",
    source_date: "",
    raw_items: [
      buildItem({
        id: "raw_item_neg_missing_date_001",
        source_id: "raw_source_neg_missing_date",
        row_index: 1,
        fixture: "missing_source_date",
        raw_category: "木作工程",
        raw_name: "中島吧檯矮櫃",
        raw_model: "WOOD_ISLAND_BASE_CABINET",
        raw_unit: "尺",
        raw_quantity: 5,
        raw_unit_price: 3500,
        raw_amount: 17500,
        raw_note: "source date intentionally blank",
        effective_date: null,
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_missing_currency",
    source_type: "material_price_sheet",
    source_name: "R1.4 missing currency",
    currency: "",
    raw_items: [
      buildItem({
        id: "raw_item_neg_missing_currency_001",
        source_id: "raw_source_neg_missing_currency",
        row_index: 1,
        fixture: "missing_currency",
        raw_category: "板材",
        raw_name: "E1 系統櫃板材",
        raw_brand: "SamplePanel",
        raw_model: "PANEL_E1_STANDARD",
        raw_spec: "E1",
        raw_unit: "片",
        raw_quantity: 1,
        raw_unit_price: 1800,
        raw_amount: 1800,
        raw_currency: null,
        raw_note: "currency intentionally blank",
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_missing_unit",
    source_type: "historical_quote",
    source_name: "R1.4 missing unit",
    raw_items: [
      buildItem({
        id: "raw_item_neg_missing_unit_001",
        source_id: "raw_source_neg_missing_unit",
        row_index: 1,
        fixture: "missing_unit",
        raw_category: "水電工程",
        raw_name: "插座出口延伸",
        raw_model: "ELECTRIC_SOCKET_EXTENSION",
        raw_unit: null,
        raw_quantity: 8,
        raw_unit_price: 1800,
        raw_amount: 14400,
        raw_note: "unit intentionally blank",
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_negative_price",
    source_type: "vendor_quote",
    source_name: "R1.4 negative price",
    raw_items: [
      buildItem({
        id: "raw_item_neg_negative_price_001",
        source_id: "raw_source_neg_negative_price",
        row_index: 1,
        fixture: "blocked_negative_price",
        raw_category: "衛浴設備",
        raw_name: "TOTO 分離式馬桶",
        raw_brand: "TOTO",
        raw_model: "CW767CTW",
        raw_spec: "negative sample",
        raw_unit: "組",
        raw_quantity: 1,
        raw_unit_price: -500,
        raw_amount: -500,
        raw_note: "negative observed price must be blocked",
        vendor_name: "negative_price_vendor",
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_outliers",
    source_type: "material_price_sheet",
    source_name: "R1.4 price outliers",
    raw_items: [
      buildItem({
        id: "raw_item_neg_outlier_normal_001",
        source_id: "raw_source_neg_outliers",
        row_index: 1,
        fixture: "price_outlier_baseline",
        raw_category: "板材",
        raw_name: "E1 系統櫃板材",
        raw_brand: "SamplePanel",
        raw_model: "PANEL_E1_STANDARD",
        raw_spec: "E1",
        raw_unit: "片",
        raw_quantity: 1,
        raw_unit_price: 1800,
        raw_amount: 1800,
        raw_note: "baseline",
        vendor_name: "outlier_vendor",
      }),
      buildItem({
        id: "raw_item_neg_outlier_high_001",
        source_id: "raw_source_neg_outliers",
        row_index: 2,
        fixture: "price_outlier_high",
        raw_category: "板材",
        raw_name: "E1 系統櫃板材",
        raw_brand: "SamplePanel",
        raw_model: "PANEL_E1_STANDARD",
        raw_spec: "E1",
        raw_unit: "片",
        raw_quantity: 1,
        raw_unit_price: 350000,
        raw_amount: 350000,
        raw_note: "high outlier",
        vendor_name: "outlier_vendor",
      }),
      buildItem({
        id: "raw_item_neg_outlier_low_001",
        source_id: "raw_source_neg_outliers",
        row_index: 3,
        fixture: "price_outlier_low",
        raw_category: "板材",
        raw_name: "E1 系統櫃板材",
        raw_brand: "SamplePanel",
        raw_model: "PANEL_E1_STANDARD",
        raw_spec: "E1",
        raw_unit: "片",
        raw_quantity: 1,
        raw_unit_price: 10,
        raw_amount: 10,
        raw_note: "low outlier",
        vendor_name: "outlier_vendor",
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_unit_mismatch",
    source_type: "material_price_sheet",
    source_name: "R1.4 unit mismatch",
    raw_items: [
      buildItem({
        id: "raw_item_neg_unit_mismatch_001",
        source_id: "raw_source_neg_unit_mismatch",
        row_index: 1,
        fixture: "unit_mismatch",
        raw_category: "檯面",
        raw_name: "韓國人造石",
        raw_brand: "KRStone",
        raw_model: "STONE_ARTIFICIAL_KR",
        raw_spec: "standard",
        raw_unit: "CM",
        raw_quantity: 1,
        raw_unit_price: 180,
        raw_amount: 180,
        raw_note: "unit CM",
        vendor_name: "unit_mismatch_vendor",
      }),
      buildItem({
        id: "raw_item_neg_unit_mismatch_002",
        source_id: "raw_source_neg_unit_mismatch",
        row_index: 2,
        fixture: "unit_mismatch",
        raw_category: "檯面",
        raw_name: "韓國人造石",
        raw_brand: "KRStone",
        raw_model: "STONE_ARTIFICIAL_KR",
        raw_spec: "standard",
        raw_unit: "式",
        raw_quantity: 1,
        raw_unit_price: 8000,
        raw_amount: 8000,
        raw_note: "unit differs",
        vendor_name: "unit_mismatch_vendor",
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_duplicate",
    source_type: "vendor_quote",
    source_name: "R1.4 same source period duplicate",
    raw_items: [
      buildItem({
        id: "raw_item_neg_duplicate_001",
        source_id: "raw_source_neg_duplicate",
        row_index: 1,
        fixture: "same_source_period_duplicate",
        raw_category: "衛浴設備",
        raw_name: "TOTO 分離式馬桶",
        raw_brand: "TOTO",
        raw_model: "CW767CTW",
        raw_spec: "same period duplicate",
        raw_unit: "組",
        raw_quantity: 1,
        raw_unit_price: 17460,
        raw_amount: 17460,
        raw_note: "duplicate A",
        vendor_name: "duplicate_vendor",
      }),
      buildItem({
        id: "raw_item_neg_duplicate_002",
        source_id: "raw_source_neg_duplicate",
        row_index: 2,
        fixture: "same_source_period_duplicate",
        raw_category: "衛浴設備",
        raw_name: "TOTO 分離式馬桶",
        raw_brand: "TOTO",
        raw_model: "CW767CTW",
        raw_spec: "same period duplicate",
        raw_unit: "組",
        raw_quantity: 1,
        raw_unit_price: 17460,
        raw_amount: 17460,
        raw_note: "duplicate B",
        vendor_name: "duplicate_vendor",
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_missing_model",
    source_type: "brand_model_catalog",
    source_name: "R1.4 missing model",
    raw_items: [
      buildItem({
        id: "raw_item_neg_missing_model_001",
        source_id: "raw_source_neg_missing_model",
        row_index: 1,
        fixture: "brand_model_missing_model",
        raw_category: "燈具",
        raw_name: "舞光 LED 崁燈",
        raw_brand: "DanceLight",
        raw_model: null,
        raw_spec: "model intentionally blank",
        raw_unit: "盞",
        raw_quantity: null,
        raw_unit_price: null,
        raw_amount: null,
        raw_currency: null,
        raw_note: "model intentionally blank",
        vendor_name: "brand_model_vendor",
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_missing_spec",
    source_type: "material_price_sheet",
    source_name: "R1.4 missing material spec",
    raw_items: [
      buildItem({
        id: "raw_item_neg_missing_spec_001",
        source_id: "raw_source_neg_missing_spec",
        row_index: 1,
        fixture: "material_missing_spec",
        raw_category: "板材",
        raw_name: "E1 系統櫃板材",
        raw_brand: "SamplePanel",
        raw_model: "PANEL_E1_STANDARD",
        raw_spec: null,
        raw_unit: "片",
        raw_quantity: 1,
        raw_unit_price: 1800,
        raw_amount: 1800,
        raw_note: "",
        vendor_name: "missing_spec_vendor",
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_low_reliability",
    source_type: "market_price_reference",
    source_name: "R1.4 low reliability",
    source_reliability: "low",
    raw_items: [
      buildItem({
        id: "raw_item_neg_low_reliability_001",
        source_id: "raw_source_neg_low_reliability",
        row_index: 1,
        fixture: "low_source_reliability",
        raw_category: "燈具",
        raw_name: "LED 崁燈",
        raw_brand: "MarketSample",
        raw_model: "LED_DOWNLIGHT_SAMPLE",
        raw_spec: "market note",
        raw_unit: "盞",
        raw_quantity: 1,
        raw_unit_price: 650,
        raw_amount: 650,
        raw_note: "low reliability source",
      }),
    ],
  }),
  buildSource({
    id: "raw_source_neg_ambiguous",
    source_type: "material_price_sheet",
    source_name: "R1.4 ambiguous raw names",
    raw_items: [
      buildItem({
        id: "raw_item_neg_ambiguous_001",
        source_id: "raw_source_neg_ambiguous",
        row_index: 1,
        fixture: "ambiguous_name",
        raw_category: "其他",
        raw_name: "材料一批",
        raw_unit: "式",
        raw_quantity: 1,
        raw_unit_price: 5000,
        raw_amount: 5000,
        raw_note: "ambiguous material bundle",
      }),
      buildItem({
        id: "raw_item_neg_ambiguous_002",
        source_id: "raw_source_neg_ambiguous",
        row_index: 2,
        fixture: "ambiguous_name",
        raw_category: "其他",
        raw_name: "現場追加",
        raw_unit: "式",
        raw_quantity: 1,
        raw_unit_price: 3000,
        raw_amount: 3000,
        raw_note: "ambiguous site add-on",
      }),
    ],
  }),
];

export function runRawNegativeSourceQualityFixtureTrial(
  sources = rawNegativeSourceQualityFixtureSources,
): RawNegativeSourceQualityFixtureResult {
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
  const mergePolicy = evaluateRawCandidateMergePolicy(candidates, {
    raw_items: rawItems,
    price_outlier_ratio: 0.5,
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
  const validationCounts = countValidationStatuses(validationResults);
  const reviewCounts = countReviewStatuses(reviewQueue);
  const riskFlagCounts = mergeRiskFlagCounts(
    countCandidateAndValidationRiskFlags(candidates, validationResults, reviewQueue),
    mergePolicy.flag_counts,
  );
  const fixtureStatuses = buildFixtureStatuses(
    rawItems,
    candidates,
    validationResults,
    reviewQueue,
  );

  return {
    sources,
    raw_items: rawItems,
    candidates,
    validation_results: validationResults,
    review_queue: reviewQueue,
    handoff_proposals: handoffProposals,
    summary: {
      negative_fixture_count: countDistinctFixtures(rawItems),
      source_count: sources.length,
      raw_item_count: rawItems.length,
      candidate_count: candidates.length,
      valid_for_review_count: validationCounts.valid_for_review,
      needs_more_info_count: validationCounts.needs_more_info,
      blocked_count: validationCounts.blocked,
      rejected_count: reviewCounts.rejected,
      pending_count: reviewCounts.pending,
      proposal_count: handoffProposals.length,
      risk_flag_counts: riskFlagCounts,
      missing_source_date_count: riskFlagCounts.missing_source_date ?? 0,
      missing_currency_count: riskFlagCounts.missing_currency ?? 0,
      missing_unit_count: riskFlagCounts.missing_unit ?? 0,
      blocked_negative_price_count: riskFlagCounts.blocked_negative_price ?? 0,
      price_outlier_high_count: riskFlagCounts.price_outlier_high ?? 0,
      price_outlier_low_count: riskFlagCounts.price_outlier_low ?? 0,
      unit_mismatch_count: riskFlagCounts.unit_mismatch ?? 0,
      same_source_period_duplicate_count:
        riskFlagCounts.same_source_period_duplicate ?? 0,
      missing_model_count: riskFlagCounts.missing_model ?? 0,
      missing_spec_count: riskFlagCounts.missing_spec ?? 0,
      low_source_reliability_count: riskFlagCounts.low_source_reliability ?? 0,
      ambiguous_name_count: riskFlagCounts.ambiguous_name ?? 0,
      proposal_contract_valid: proposalContract.valid,
      warehouse_export_safety_valid: warehouseExportSafety.valid,
      observed_price_safety_valid: observedPriceSafety.valid,
      static_guard_valid: staticGuard.valid,
      formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
      price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
      formal_pricing_rule_generated: false,
      formal_budget_line_generated: false,
    },
    fixture_statuses: fixtureStatuses,
    reports: {
      proposal_contract: proposalContract,
      warehouse_export_safety: warehouseExportSafety,
      observed_price_safety: observedPriceSafety,
      static_guard: staticGuard,
      merge_policy: mergePolicy,
    },
  };
}

function buildSource(input: {
  id: string;
  source_type: RawCatalogSourceType;
  source_name: string;
  raw_items: RawCatalogItem[];
  source_date?: string;
  currency?: string;
  source_reliability?: SourceReliability;
}): RawCatalogSource {
  return {
    id: input.id,
    source_type: input.source_type,
    source_name: input.source_name,
    source_owner: "laibe_raw_warehouse_negative_fixture",
    source_date: input.source_date ?? defaultDate,
    captured_at: capturedAt,
    region: defaultRegion,
    currency: input.currency ?? defaultCurrency,
    source_note: "R1.4 source quality sample; candidate evidence only.",
    source_reliability: input.source_reliability ?? "medium",
    raw_items: input.raw_items,
    metadata: {
      fixture_phase: "R1.4",
      source_shape: input.source_type,
      row_count: input.raw_items.length,
    },
  };
}

function buildItem(
  input: Omit<RawCatalogItem, "raw_text" | "effective_date" | "region" | "metadata"> & {
    fixture: string;
    raw_text?: string;
    effective_date?: string | null;
    region?: string;
    metadata?: Record<string, unknown>;
  },
): RawCatalogItem {
  return {
    ...input,
    raw_brand: input.raw_brand ?? null,
    raw_model: input.raw_model ?? null,
    raw_spec: input.raw_spec ?? null,
    raw_currency: input.raw_currency === undefined ? defaultCurrency : input.raw_currency,
    effective_date: input.effective_date === undefined ? defaultDate : input.effective_date,
    region: input.region ?? defaultRegion,
    vendor_name: input.vendor_name ?? null,
    raw_text:
      input.raw_text ??
      [
        input.raw_category,
        input.raw_name,
        input.raw_unit ?? "",
        input.raw_quantity ?? "",
        input.raw_unit_price ?? "",
        input.raw_amount ?? "",
        input.raw_note,
      ].join(" / "),
    metadata: {
      fixture_phase: "R1.4",
      negative_fixture: input.fixture,
      ...input.metadata,
    },
  };
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

function countCandidateAndValidationRiskFlags(
  candidates: RawCatalogCandidate[],
  validationResults: CandidateValidationResult[],
  reviewQueue: CatalogReviewItem[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const candidate of candidates) {
    addFlags(counts, candidate.risk_flags);
  }

  for (const result of validationResults) {
    addFlags(counts, result.risk_flags);
  }

  for (const reviewItem of reviewQueue) {
    addFlags(counts, reviewItem.risk_flags);
  }

  return counts;
}

function mergeRiskFlagCounts(
  baseCounts: Record<string, number>,
  additionalCounts: Record<string, number>,
): Record<string, number> {
  const merged = { ...baseCounts };

  for (const [flag, count] of Object.entries(additionalCounts)) {
    merged[flag] = (merged[flag] ?? 0) + count;
  }

  return merged;
}

function addFlags(counts: Record<string, number>, flags: RawCandidateRiskFlag[]): void {
  for (const flag of flags) {
    counts[flag] = (counts[flag] ?? 0) + 1;
  }
}

function countDistinctFixtures(rawItems: RawCatalogItem[]): number {
  return new Set(
    rawItems
      .map((item) => item.metadata.negative_fixture)
      .filter((fixture): fixture is string => typeof fixture === "string"),
  ).size;
}

function buildFixtureStatuses(
  rawItems: RawCatalogItem[],
  candidates: RawCatalogCandidate[],
  validationResults: CandidateValidationResult[],
  reviewQueue: CatalogReviewItem[],
): RawNegativeSourceQualityFixtureResult["fixture_statuses"] {
  const candidateByItemId = new Map(
    candidates.map((candidate) => [candidate.source_item_id, candidate]),
  );
  const validationByCandidateId = new Map(
    validationResults.map((result) => [result.candidate_id, result]),
  );
  const reviewByCandidateId = new Map(
    reviewQueue.map((reviewItem) => [reviewItem.candidate_id, reviewItem]),
  );

  return rawItems.map((item) => {
    const candidate = candidateByItemId.get(item.id);
    const validation = candidate
      ? validationByCandidateId.get(candidate.candidate_id)
      : undefined;
    const reviewItem = candidate ? reviewByCandidateId.get(candidate.candidate_id) : undefined;

    return {
      fixture:
        typeof item.metadata.negative_fixture === "string"
          ? item.metadata.negative_fixture
          : "unknown_fixture",
      raw_item_id: item.id,
      candidate_id: candidate?.candidate_id ?? "missing_candidate",
      validation_status: validation?.status ?? "missing_validation",
      review_status: reviewItem?.status ?? "missing_review",
      risk_flags: [
        ...new Set([
          ...(candidate?.risk_flags ?? []),
          ...(validation?.risk_flags ?? []),
          ...(reviewItem?.risk_flags ?? []),
        ]),
      ],
    };
  });
}
