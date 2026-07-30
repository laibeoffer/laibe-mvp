import type {
  RawCatalogCandidate,
  RawCatalogItem,
  RawCandidateRiskFlag,
} from "./types.ts";

export type MergePolicyRecommendationType =
  | "review_existing_code_merge"
  | "review_same_source_period_duplicate"
  | "review_unit_mismatch"
  | "review_material_duplicate"
  | "review_price_outlier";

export interface MergePolicyRecommendation {
  candidate_id: string;
  related_candidate_ids: string[];
  flags: RawCandidateRiskFlag[];
  recommendation: MergePolicyRecommendationType;
  reason: string;
}

export interface MergePolicyOptions {
  raw_items?: RawCatalogItem[];
  existing_catalog_codes?: Set<string>;
  price_outlier_ratio?: number;
}

export interface MergePolicyReport {
  recommendations: MergePolicyRecommendation[];
  flag_counts: Record<string, number>;
  flag_count: number;
  recommendation_count: number;
}

export function evaluateRawCandidateMergePolicy(
  candidates: RawCatalogCandidate[],
  options: MergePolicyOptions = {},
): MergePolicyReport {
  const recommendations: MergePolicyRecommendation[] = [];
  const rawItemById = new Map(
    (options.raw_items ?? []).map((item) => [item.id, item]),
  );
  const bySuggestedCode = groupCandidates(
    candidates.filter((candidate) => Boolean(candidate.suggested_code)),
    (candidate) => candidate.suggested_code ?? "",
  );
  const bySourcePeriod = groupCandidates(
    candidates.filter((candidate) => Boolean(candidate.suggested_code)),
    (candidate) => {
      const rawItem = rawItemById.get(candidate.source_item_id);
      return [
        candidate.suggested_code,
        rawItem?.vendor_name ?? "",
        rawItem?.region ?? candidate.metadata.region ?? "",
        candidate.effective_date ?? "",
      ].join("|");
    },
  );
  const byMaterialIdentity = groupCandidates(
    candidates.filter((candidate) =>
      ["material_price", "brand_model"].includes(candidate.candidate_type),
    ),
    (candidate) =>
      [
        candidate.brand ?? "",
        candidate.model ?? "",
        candidate.spec ?? "",
      ].join("|"),
  );

  for (const candidate of candidates) {
    if (
      candidate.suggested_code &&
      options.existing_catalog_codes?.has(candidate.suggested_code)
    ) {
      recommendations.push({
        candidate_id: candidate.candidate_id,
        related_candidate_ids: [],
        flags: ["possible_merge_required"],
        recommendation: "review_existing_code_merge",
        reason:
          "suggested_code already appears in the known catalog code list; review before any downstream handoff.",
      });
    }
  }

  for (const sameCodeCandidates of bySuggestedCode.values()) {
    if (sameCodeCandidates.length < 2) {
      continue;
    }

    for (const candidate of sameCodeCandidates) {
      recommendations.push({
        candidate_id: candidate.candidate_id,
        related_candidate_ids: sameCodeCandidates
          .filter((related) => related.candidate_id !== candidate.candidate_id)
          .map((related) => related.candidate_id),
        flags: ["possible_merge_required"],
        recommendation: "review_existing_code_merge",
        reason:
          "Multiple candidates share the same suggested_code; keep as candidate evidence until reviewed.",
      });
    }

    const units = new Set(sameCodeCandidates.map((candidate) => candidate.unit));
    if (units.size > 1) {
      for (const candidate of sameCodeCandidates) {
        recommendations.push({
          candidate_id: candidate.candidate_id,
          related_candidate_ids: sameCodeCandidates
            .filter((related) => related.candidate_id !== candidate.candidate_id)
            .map((related) => related.candidate_id),
          flags: ["unit_mismatch"],
          recommendation: "review_unit_mismatch",
          reason:
            "Candidates with the same suggested_code use different units; do not merge automatically.",
        });
      }
    }

    recommendations.push(...buildPriceOutlierRecommendations(sameCodeCandidates, options));
  }

  for (const samePeriodCandidates of bySourcePeriod.values()) {
    if (samePeriodCandidates.length < 2) {
      continue;
    }

    for (const candidate of samePeriodCandidates) {
      recommendations.push({
        candidate_id: candidate.candidate_id,
        related_candidate_ids: samePeriodCandidates
          .filter((related) => related.candidate_id !== candidate.candidate_id)
          .map((related) => related.candidate_id),
        flags: ["same_source_period_duplicate"],
        recommendation: "review_same_source_period_duplicate",
        reason:
          "suggested_code, vendor, region, and effective_date match; review as same source period duplicate evidence.",
      });
    }
  }

  for (const materialCandidates of byMaterialIdentity.values()) {
    if (materialCandidates.length < 2) {
      continue;
    }

    for (const candidate of materialCandidates) {
      recommendations.push({
        candidate_id: candidate.candidate_id,
        related_candidate_ids: materialCandidates
          .filter((related) => related.candidate_id !== candidate.candidate_id)
          .map((related) => related.candidate_id),
        flags: ["possible_material_duplicate"],
        recommendation: "review_material_duplicate",
        reason:
          "Material candidates share brand, model, and spec; review before any merge decision.",
      });
    }
  }

  const flagCounts = countMergeFlags(recommendations);

  return {
    recommendations,
    flag_counts: flagCounts,
    flag_count: Object.values(flagCounts).reduce((sum, count) => sum + count, 0),
    recommendation_count: recommendations.length,
  };
}

function buildPriceOutlierRecommendations(
  sameCodeCandidates: RawCatalogCandidate[],
  options: MergePolicyOptions,
): MergePolicyRecommendation[] {
  const pricedCandidates = sameCodeCandidates.filter(
    (candidate) => candidate.observed_price !== null && candidate.observed_price > 0,
  );

  if (pricedCandidates.length < 2) {
    return [];
  }

  const ratio = options.price_outlier_ratio ?? 0.5;
  const average =
    pricedCandidates.reduce(
      (sum, candidate) => sum + (candidate.observed_price ?? 0),
      0,
    ) / pricedCandidates.length;
  const highThreshold = average * (1 + ratio);
  const lowThreshold = average * (1 - ratio);

  return pricedCandidates.flatMap((candidate): MergePolicyRecommendation[] => {
    const price = candidate.observed_price ?? 0;

    if (price > highThreshold) {
      return [
        {
          candidate_id: candidate.candidate_id,
          related_candidate_ids: pricedCandidates
            .filter((related) => related.candidate_id !== candidate.candidate_id)
            .map((related) => related.candidate_id),
          flags: ["price_outlier_high" as const],
          recommendation: "review_price_outlier" as const,
          reason:
            "observed_price is high relative to candidates with the same suggested_code; keep as evidence only.",
        },
      ];
    }

    if (price < lowThreshold) {
      return [
        {
          candidate_id: candidate.candidate_id,
          related_candidate_ids: pricedCandidates
            .filter((related) => related.candidate_id !== candidate.candidate_id)
            .map((related) => related.candidate_id),
          flags: ["price_outlier_low" as const],
          recommendation: "review_price_outlier" as const,
          reason:
            "observed_price is low relative to candidates with the same suggested_code; keep as evidence only.",
        },
      ];
    }

    return [];
  });
}

function groupCandidates(
  candidates: RawCatalogCandidate[],
  buildKey: (candidate: RawCatalogCandidate) => string,
): Map<string, RawCatalogCandidate[]> {
  const groups = new Map<string, RawCatalogCandidate[]>();

  for (const candidate of candidates) {
    const key = buildKey(candidate);

    if (!key || key.replace(/\|/g, "").trim() === "") {
      continue;
    }

    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }

  return groups;
}

function countMergeFlags(
  recommendations: MergePolicyRecommendation[],
): Record<string, number> {
  return recommendations.reduce<Record<string, number>>((counts, recommendation) => {
    for (const flag of recommendation.flags) {
      counts[flag] = (counts[flag] ?? 0) + 1;
    }

    return counts;
  }, {});
}
