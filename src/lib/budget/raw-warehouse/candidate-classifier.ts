import { normalizeRawCatalogItem } from "./raw-item-normalizer.ts";
import type {
  RawCatalogCandidate,
  RawCatalogItem,
  RawCatalogSource,
  RawCandidateType,
  RawCandidateRiskFlag,
} from "./types.ts";

const priceCandidateTypes = new Set<RawCandidateType>([
  "historical_quote_line",
  "material_price",
  "vendor_quote",
  "market_price",
  "labor_rate",
]);

export function classifyRawCatalogItems(
  rawItems: RawCatalogItem[],
  sources: RawCatalogSource[],
): RawCatalogCandidate[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return rawItems.map((item) => {
    const source = sourceById.get(item.source_id);
    const normalized = normalizeRawCatalogItem(item);
    const candidateType = classifyCandidateType(item, source);
    const tradeCategory = classifyTradeCategory(item);
    const itemCategory = classifyItemCategory(item, candidateType);
    const confidence = calculateConfidence(item, source, candidateType, normalized.suggested_code);
    const riskFlags = buildRiskFlags(
      item,
      source,
      candidateType,
      normalized.suggested_code,
      confidence,
    );
    const requiresHumanReview =
      confidence < 0.85 ||
      priceCandidateTypes.has(candidateType) ||
      riskFlags.length > 0 ||
      source?.source_reliability === "low" ||
      source?.source_reliability === "unknown";

    return {
      candidate_id: `candidate_${item.id}`,
      source_item_id: item.id,
      candidate_type: candidateType,
      suggested_code: normalized.suggested_code,
      suggested_name: normalized.normalized_name || item.raw_text || "UNKNOWN_RAW_ITEM",
      trade_category: tradeCategory,
      item_category: itemCategory,
      unit: normalized.normalized_unit,
      observed_price: item.raw_unit_price,
      currency: item.raw_currency ?? source?.currency ?? null,
      brand: normalized.normalized_brand,
      model: normalized.normalized_model,
      spec: normalized.normalized_spec,
      effective_date: item.effective_date ?? source?.source_date ?? null,
      confidence,
      requires_human_review: requiresHumanReview,
      reason: buildReason(candidateType, requiresHumanReview),
      risk_flags: riskFlags,
      source_type: source?.source_type ?? "manual_admin_entry",
      source_reliability: source?.source_reliability ?? "unknown",
      metadata: {
        raw_category: item.raw_category,
        vendor_name: item.vendor_name,
        raw_note: item.raw_note,
        normalized_from: normalized,
      },
    } as RawCatalogCandidate;
  });
}

function classifyCandidateType(
  item: RawCatalogItem,
  source?: RawCatalogSource,
): RawCandidateType {
  if (!item.raw_name.trim() && !item.raw_text.trim()) {
    return "unknown";
  }

  switch (source?.source_type) {
    case "historical_quote":
      return "historical_quote_line";
    case "material_price_sheet":
      return "material_price";
    case "vendor_quote":
      return "vendor_quote";
    case "market_price_reference":
      return "market_price";
    case "brand_model_catalog":
      return "brand_model";
    case "labor_rate_sheet":
      return "labor_rate";
    case "note_sheet":
      return "catalog_note";
    default:
      break;
  }

  const text = `${item.raw_category} ${item.raw_name} ${item.raw_note} ${item.raw_text}`;

  if (/備註|說明|不含|依.*調整/.test(text) && item.raw_unit_price === null) {
    return "catalog_note";
  }

  if (/師傅|人工|工$|工班/.test(text)) {
    return "labor_rate";
  }

  if (/板材|人造石|水泥|磁磚|壁磚|地磚|燈具|馬桶|設備/.test(text)) {
    return "material_price";
  }

  return "unknown";
}

function classifyTradeCategory(item: RawCatalogItem): string {
  const text = `${item.raw_category} ${item.raw_name} ${item.raw_spec ?? ""}`;

  if (/木作|櫃|板材|人造石|中島/.test(text)) {
    return "木作工程";
  }

  if (/泥作|防水|磁磚|壁磚|地磚|水泥/.test(text)) {
    return "泥作工程";
  }

  if (/水電|插座|燈具|崁燈/.test(text)) {
    return "水電工程";
  }

  if (/衛浴|馬桶/.test(text)) {
    return "衛浴設備";
  }

  if (/人工|師傅|工班/.test(text)) {
    return "人工";
  }

  return "其他";
}

function classifyItemCategory(
  item: RawCatalogItem,
  candidateType: RawCandidateType,
): string {
  if (candidateType === "catalog_note") {
    return "note";
  }

  if (candidateType === "labor_rate") {
    return "labor";
  }

  const text = `${item.raw_category} ${item.raw_name} ${item.raw_spec ?? ""}`;

  if (/板材|人造石|水泥|磁磚|壁磚|地磚/.test(text)) {
    return "material";
  }

  if (/馬桶|設備|燈具|崁燈/.test(text)) {
    return "brand_model_or_fixture";
  }

  if (/櫃|中島|貼工|防水|插座/.test(text)) {
    return "quote_item_reference";
  }

  return "unknown";
}

function calculateConfidence(
  item: RawCatalogItem,
  source: RawCatalogSource | undefined,
  candidateType: RawCandidateType,
  suggestedCode: string | null,
): number {
  let confidence = candidateType === "unknown" ? 0.3 : 0.62;

  if (item.raw_name.trim()) {
    confidence += 0.1;
  }
  if (suggestedCode) {
    confidence += 0.1;
  }
  if (item.raw_unit) {
    confidence += 0.05;
  }
  if (item.raw_unit_price !== null || candidateType === "brand_model" || candidateType === "catalog_note") {
    confidence += 0.06;
  }
  if (item.effective_date) {
    confidence += 0.03;
  }
  if (source?.source_reliability === "high") {
    confidence += 0.06;
  }
  if (source?.source_reliability === "low" || source?.source_reliability === "unknown") {
    confidence -= 0.08;
  }
  if (candidateType === "catalog_note") {
    confidence += 0.1;
  }

  return Number(Math.max(0, Math.min(confidence, 0.98)).toFixed(2));
}

function buildRiskFlags(
  item: RawCatalogItem,
  source: RawCatalogSource | undefined,
  candidateType: RawCandidateType,
  suggestedCode: string | null,
  confidence: number,
): RawCandidateRiskFlag[] {
  const flags: RawCandidateRiskFlag[] = [];
  const text = `${item.raw_category} ${item.raw_name} ${item.raw_note} ${item.raw_text}`;

  if (
    (!item.raw_name.trim() && !item.raw_text.trim()) ||
    /材料一批|五金另計|現場追加/.test(text)
  ) {
    flags.push("ambiguous_name");
  }
  if (!suggestedCode) {
    flags.push("missing_suggested_code");
  }
  if (priceCandidateTypes.has(candidateType)) {
    flags.push("manual_review_required");
  }
  if (priceCandidateTypes.has(candidateType) && !item.raw_unit) {
    flags.push("missing_unit");
  }
  if (priceCandidateTypes.has(candidateType) && item.raw_unit_price === null) {
    flags.push("missing_price");
  }
  if (priceCandidateTypes.has(candidateType) && !item.raw_currency && !source?.currency) {
    flags.push("missing_currency");
  }
  if (item.raw_unit_price !== null && item.raw_unit_price < 0) {
    flags.push("blocked_negative_price");
  }
  if (item.raw_unit_price !== null && item.raw_unit_price > 100000) {
    flags.push("price_outlier_high");
  }
  if (item.raw_unit_price !== null && item.raw_unit_price > 0 && item.raw_unit_price < 50) {
    flags.push("price_outlier_low");
  }
  if (!source?.source_date) {
    flags.push("missing_source_date");
  }
  if (!item.effective_date) {
    flags.push("effective_date_missing");
  }
  if (!item.region && !source?.region) {
    flags.push("region_missing");
  }
  if (
    source?.source_reliability === "low" ||
    source?.source_reliability === "unknown" ||
    !source
  ) {
    flags.push("low_source_reliability");
  }
  if (candidateType === "market_price") {
    flags.push("source_scope_unclear");
  }
  if (candidateType === "vendor_quote") {
    flags.push("source_scope_unclear");
  }
  if (candidateType === "historical_quote_line") {
    flags.push("source_scope_unclear");
  }
  if (candidateType === "unknown") {
    flags.push("unknown_candidate_type");
  }
  if (confidence < 0.85) {
    flags.push("low_confidence");
  }
  if (
    (candidateType === "material_price" || candidateType === "brand_model") &&
    !item.raw_brand
  ) {
    flags.push("missing_brand");
  }
  if (candidateType === "brand_model" && !item.raw_model) {
    flags.push("missing_model");
  }
  if (
    (candidateType === "material_price" || candidateType === "brand_model") &&
    !item.raw_spec
  ) {
    flags.push("missing_spec");
  }

  return [...new Set(flags)];
}

function buildReason(
  candidateType: RawCandidateType,
  requiresHumanReview: boolean,
): string {
  if (candidateType === "unknown") {
    return "Raw item cannot be safely classified.";
  }

  if (requiresHumanReview) {
    return "Classified as candidate evidence; human review required before any downstream use.";
  }

  return "Classified as non-price candidate evidence.";
}
