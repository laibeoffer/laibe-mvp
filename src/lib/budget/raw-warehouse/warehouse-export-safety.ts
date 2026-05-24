import type {
  CatalogReviewItem,
  HandoffProposal,
  RawCatalogCandidate,
} from "./types.ts";
import {
  RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  RAW_WAREHOUSE_PRICE_AUTHORITY,
} from "./types.ts";

export interface WarehouseExportSafetyInput {
  candidates: RawCatalogCandidate[];
  review_items: CatalogReviewItem[];
  handoff_proposals: HandoffProposal[];
  repository_export_snapshot?: unknown;
}

export interface WarehouseExportSafetyReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  scanned_object_count: number;
  forbidden_field_hit_count: number;
  forbidden_field_hits: Array<{
    object_type: string;
    object_id: string;
    field_path: string;
    field_name: string;
  }>;
}

const forbiddenFields = new Set([
  "unit_price",
  "formal_price",
  "approved_price",
  "amount_as_price",
  "pricing_rule_id",
  "material_spec_id",
  "labor_rule_id",
  "method_spec_id",
  "budget_estimate_line_id",
]);

export function validateWarehouseExportSafety(
  input: WarehouseExportSafetyInput,
): WarehouseExportSafetyReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const hits: WarehouseExportSafetyReport["forbidden_field_hits"] = [];
  const scanTargets: Array<{
    object_type: string;
    object_id: string;
    value: unknown;
  }> = [
    ...input.candidates.map((candidate) => ({
      object_type: "candidate",
      object_id: candidate.candidate_id,
      value: candidate,
    })),
    ...input.review_items.map((item) => ({
      object_type: "review_item",
      object_id: item.id,
      value: item,
    })),
    ...input.handoff_proposals.map((proposal) => ({
      object_type: "handoff_proposal",
      object_id: proposal.proposal_id,
      value: proposal,
    })),
  ];

  if (input.repository_export_snapshot !== undefined) {
    scanTargets.push({
      object_type: "repository_export_snapshot",
      object_id: "repository_export_snapshot",
      value: input.repository_export_snapshot,
    });
  }

  for (const target of scanTargets) {
    scanObject(target.value, target, hits, errors, warnings);
  }

  for (const hit of hits) {
    errors.push(
      `${hit.object_type} ${hit.object_id} contains forbidden export field ${hit.field_path}.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    scanned_object_count: scanTargets.length,
    forbidden_field_hit_count: hits.length,
    forbidden_field_hits: hits,
  };
}

function scanObject(
  value: unknown,
  target: {
    object_type: string;
    object_id: string;
    value: unknown;
  },
  hits: WarehouseExportSafetyReport["forbidden_field_hits"],
  errors: string[],
  warnings: string[],
  currentPath = target.object_type,
): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanObject(item, target, hits, errors, warnings, `${currentPath}[${index}]`);
    });
    return;
  }

  for (const [key, childValue] of Object.entries(value)) {
    const fieldPath = `${currentPath}.${key}`;

    if (forbiddenFields.has(key)) {
      hits.push({
        object_type: target.object_type,
        object_id: target.object_id,
        field_path: fieldPath,
        field_name: key,
      });
    }

    if (key === "formal_price_generated" && childValue !== RAW_WAREHOUSE_FORMAL_PRICE_GENERATED) {
      errors.push(`${target.object_type} ${target.object_id} formal_price_generated must be false.`);
    }

    if (key === "price_authority" && childValue !== RAW_WAREHOUSE_PRICE_AUTHORITY) {
      errors.push(`${target.object_type} ${target.object_id} price_authority must be none.`);
    }

    if (key === "observed_price" && childValue !== null) {
      warnings.push(
        `${target.object_type} ${target.object_id} contains observed_price evidence only; downstream review is required.`,
      );
    }

    scanObject(childValue, target, hits, errors, warnings, fieldPath);
  }
}
