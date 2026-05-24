import { classifyRawCatalogItems } from "./candidate-classifier.ts";
import { validateCandidates } from "./candidate-validator.ts";
import { createHandoffProposals } from "./handoff-proposal.ts";
import { validateHandoffProposalContract } from "./handoff-proposal-contract-validator.ts";
import { validateObservedPriceSafety } from "./observed-price-safety.ts";
import { createReviewQueue, simulateHumanReview } from "./review-queue.ts";
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
  RawCandidateType,
} from "./types.ts";
import { validateWarehouseExportSafety } from "./warehouse-export-safety.ts";

const capturedAt = "2026-05-23T00:00:00.000Z";
const sourceDate = "2026-05-23";
const region = "TW-TPE";
const currency = "TWD";

export interface RawMultiSourceFixtureTrialResult {
  sources: RawCatalogSource[];
  raw_items: RawCatalogItem[];
  candidates: RawCatalogCandidate[];
  validation_results: CandidateValidationResult[];
  review_queue: CatalogReviewItem[];
  handoff_proposals: HandoffProposal[];
  summary: {
    source_count: number;
    source_type_counts: Record<string, number>;
    raw_item_count: number;
    candidate_count: number;
    candidate_type_counts: Record<string, number>;
    price_bearing_candidate_count: number;
    non_price_bearing_candidate_count: number;
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
    brand_model_candidate_count: number;
    brand_model_price_bearing_count: number;
  };
  reports: {
    proposal_contract: ReturnType<typeof validateHandoffProposalContract>;
    warehouse_export_safety: ReturnType<typeof validateWarehouseExportSafety>;
    observed_price_safety: ReturnType<typeof validateObservedPriceSafety>;
    static_guard: ReturnType<typeof runRawWarehouseStaticGuard>;
  };
}

export const rawMultiSourceFixtureSources: RawCatalogSource[] = [
  buildSource("raw_source_multi_hq_001", "historical_quote", "R1.3 historical quote sample", [
    buildItem({
      id: "raw_item_multi_hq_001",
      source_id: "raw_source_multi_hq_001",
      row_index: 1,
      raw_category: "木作工程",
      raw_name: "中島吧檯矮櫃",
      raw_model: "WOOD_ISLAND_BASE_CABINET",
      raw_unit: "尺",
      raw_quantity: 5.5,
      raw_unit_price: 3500,
      raw_amount: 19250,
      raw_note: "不含人造石及設備",
    }),
    buildItem({
      id: "raw_item_multi_hq_002",
      source_id: "raw_source_multi_hq_001",
      row_index: 2,
      raw_category: "泥作工程",
      raw_name: "浴室彈性水泥防水 H:240",
      raw_model: "BATHROOM_WATERPROOF_H240",
      raw_unit: "間",
      raw_quantity: 2,
      raw_unit_price: 12000,
      raw_amount: 24000,
      raw_note: "施作兩層",
    }),
  ]),
  buildSource(
    "raw_source_multi_material_001",
    "material_price_sheet",
    "R1.3 material price sheet sample",
    [
      buildItem({
        id: "raw_item_multi_material_001",
        source_id: "raw_source_multi_material_001",
        row_index: 1,
        raw_category: "板材",
        raw_name: "E1 系統櫃板材",
        raw_brand: "SamplePanel",
        raw_model: "PANEL_E1_STANDARD",
        raw_spec: "E1 等級",
        raw_unit: "片",
        raw_quantity: 1,
        raw_unit_price: 1800,
        raw_amount: 1800,
        raw_note: "E1 等級",
        vendor_name: "sample_material_vendor",
      }),
      buildItem({
        id: "raw_item_multi_material_002",
        source_id: "raw_source_multi_material_001",
        row_index: 2,
        raw_category: "檯面",
        raw_name: "韓國人造石",
        raw_brand: "KRStone",
        raw_model: "STONE_ARTIFICIAL_KR",
        raw_spec: "依色號調整",
        raw_unit: "CM",
        raw_quantity: 1,
        raw_unit_price: 180,
        raw_amount: 180,
        raw_note: "依色號調整",
        vendor_name: "sample_material_vendor",
      }),
      buildItem({
        id: "raw_item_multi_material_003",
        source_id: "raw_source_multi_material_001",
        row_index: 3,
        raw_category: "磁磚",
        raw_name: "30x60 壁磚",
        raw_brand: "TileSample",
        raw_model: "TILE_30X60_WALL",
        raw_spec: "30x60",
        raw_unit: "坪",
        raw_quantity: 1,
        raw_unit_price: 2200,
        raw_amount: 2200,
        raw_note: "不含貼工",
        vendor_name: "sample_material_vendor",
      }),
    ],
  ),
  buildSource("raw_source_multi_vendor_001", "vendor_quote", "R1.3 vendor quote sample", [
    buildItem({
      id: "raw_item_multi_vendor_001",
      source_id: "raw_source_multi_vendor_001",
      row_index: 1,
      raw_category: "衛浴設備",
      raw_name: "TOTO 分離式馬桶",
      raw_brand: "TOTO",
      raw_model: "CW767CTW",
      raw_spec: "型號 CW767CTW",
      raw_unit: "組",
      raw_quantity: 1,
      raw_unit_price: 17460,
      raw_amount: 17460,
      raw_note: "型號 CW767CTW",
      vendor_name: "sample_vendor_quote",
    }),
    buildItem({
      id: "raw_item_multi_vendor_002",
      source_id: "raw_source_multi_vendor_001",
      row_index: 2,
      raw_category: "衛浴設備",
      raw_name: "國際牌浴室暖風乾燥機",
      raw_brand: "Panasonic",
      raw_model: "BATH_DRYER_220V_WIRELESS",
      raw_spec: "220V 無線",
      raw_unit: "組",
      raw_quantity: 1,
      raw_unit_price: 11500,
      raw_amount: 11500,
      raw_note: "220V 無線",
      vendor_name: "sample_vendor_quote",
    }),
  ]),
  buildSource(
    "raw_source_multi_labor_001",
    "labor_rate_sheet",
    "R1.3 labor rate sheet sample",
    [
      buildItem({
        id: "raw_item_multi_labor_001",
        source_id: "raw_source_multi_labor_001",
        row_index: 1,
        raw_category: "人工",
        raw_name: "木工師傅",
        raw_model: "LABOR_WOOD_CARPENTER_DAY",
        raw_spec: "日工",
        raw_unit: "工",
        raw_quantity: 1,
        raw_unit_price: 3500,
        raw_amount: 3500,
        raw_note: "日工",
        vendor_name: "sample_labor_source",
      }),
      buildItem({
        id: "raw_item_multi_labor_002",
        source_id: "raw_source_multi_labor_001",
        row_index: 2,
        raw_category: "人工",
        raw_name: "水電師傅",
        raw_model: "LABOR_ELECTRICIAN_DAY",
        raw_spec: "日工",
        raw_unit: "工",
        raw_quantity: 1,
        raw_unit_price: 3600,
        raw_amount: 3600,
        raw_note: "日工",
        vendor_name: "sample_labor_source",
      }),
      buildItem({
        id: "raw_item_multi_labor_003",
        source_id: "raw_source_multi_labor_001",
        row_index: 3,
        raw_category: "人工",
        raw_name: "泥作貼磚工",
        raw_model: "LABOR_TILE_LAYING_PING",
        raw_spec: "工資不含料",
        raw_unit: "坪",
        raw_quantity: 1,
        raw_unit_price: 3000,
        raw_amount: 3000,
        raw_note: "工資不含料",
        vendor_name: "sample_labor_source",
      }),
    ],
  ),
  buildSource(
    "raw_source_multi_brand_001",
    "brand_model_catalog",
    "R1.3 brand model catalog sample",
    [
      buildItem({
        id: "raw_item_multi_brand_001",
        source_id: "raw_source_multi_brand_001",
        row_index: 1,
        raw_category: "馬桶",
        raw_name: "TOTO CW767CTW",
        raw_brand: "TOTO",
        raw_model: "CW767CTW",
        raw_spec: "型號資料",
        raw_unit: "組",
        raw_quantity: null,
        raw_unit_price: null,
        raw_amount: null,
        raw_currency: null,
        raw_note: "不帶價格",
        vendor_name: "sample_brand_catalog",
      }),
      buildItem({
        id: "raw_item_multi_brand_002",
        source_id: "raw_source_multi_brand_001",
        row_index: 2,
        raw_category: "燈具",
        raw_name: "舞光 9.5cm LED 崁燈",
        raw_brand: "DanceLight",
        raw_model: "LED_DOWNLIGHT_95MM",
        raw_spec: "型號資料",
        raw_unit: "盞",
        raw_quantity: null,
        raw_unit_price: null,
        raw_amount: null,
        raw_currency: null,
        raw_note: "不帶價格",
        vendor_name: "sample_brand_catalog",
      }),
      buildItem({
        id: "raw_item_multi_brand_003",
        source_id: "raw_source_multi_brand_001",
        row_index: 3,
        raw_category: "開關面板",
        raw_name: "國際牌星光面板",
        raw_brand: "Panasonic",
        raw_model: "STAR_SWITCH_PANEL",
        raw_spec: "型號資料",
        raw_unit: "組",
        raw_quantity: null,
        raw_unit_price: null,
        raw_amount: null,
        raw_currency: null,
        raw_note: "不帶價格",
        vendor_name: "sample_brand_catalog",
      }),
    ],
  ),
];

export function runRawMultiSourceFixtureTrial(
  sources = rawMultiSourceFixtureSources,
): RawMultiSourceFixtureTrialResult {
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
  const brandModelCandidates = candidates.filter(
    (candidate) => candidate.candidate_type === "brand_model",
  );
  const priceBearingCandidateCount = candidates.filter(
    (candidate) => candidate.observed_price !== null,
  ).length;

  return {
    sources,
    raw_items: rawItems,
    candidates,
    validation_results: validationResults,
    review_queue: reviewQueue,
    handoff_proposals: handoffProposals,
    summary: {
      source_count: sources.length,
      source_type_counts: countBy(sources, (source) => source.source_type),
      raw_item_count: rawItems.length,
      candidate_count: candidates.length,
      candidate_type_counts: countBy(candidates, (candidate) => candidate.candidate_type),
      price_bearing_candidate_count: priceBearingCandidateCount,
      non_price_bearing_candidate_count: candidates.length - priceBearingCandidateCount,
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
      brand_model_candidate_count: brandModelCandidates.length,
      brand_model_price_bearing_count: brandModelCandidates.filter(
        (candidate) => candidate.observed_price !== null,
      ).length,
    },
    reports: {
      proposal_contract: proposalContract,
      warehouse_export_safety: warehouseExportSafety,
      observed_price_safety: observedPriceSafety,
      static_guard: staticGuard,
    },
  };
}

function buildSource(
  id: string,
  sourceType: RawCatalogSourceType,
  sourceName: string,
  rawItems: RawCatalogItem[],
): RawCatalogSource {
  return {
    id,
    source_type: sourceType,
    source_name: sourceName,
    source_owner: "laibe_raw_warehouse_fixture",
    source_date: sourceDate,
    captured_at: capturedAt,
    region,
    currency,
    source_note: "R1.3 multi-source sample; candidate evidence only.",
    source_reliability: "medium",
    raw_items: rawItems,
    metadata: {
      fixture_phase: "R1.3",
      source_shape: sourceType,
      row_count: rawItems.length,
    },
  };
}

function buildItem(
  input: Omit<RawCatalogItem, "raw_text" | "effective_date" | "region" | "metadata"> & {
    raw_text?: string;
    effective_date?: string | null;
    region?: string;
    metadata?: Record<string, unknown>;
  },
): RawCatalogItem {
  const itemRegion = input.region ?? region;
  const itemCurrency = input.raw_currency ?? currency;

  return {
    ...input,
    raw_brand: input.raw_brand ?? null,
    raw_model: input.raw_model ?? null,
    raw_spec: input.raw_spec ?? input.raw_note,
    raw_currency: itemCurrency,
    effective_date: input.effective_date ?? sourceDate,
    region: itemRegion,
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
      fixture_phase: "R1.3",
      ...input.metadata,
    },
  };
}

function countBy<T>(
  records: T[],
  getKey: (record: T) => RawCatalogSourceType | RawCandidateType | string,
): Record<string, number> {
  return records.reduce<Record<string, number>>((counts, record) => {
    const key = getKey(record);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
