import type {
  HandoffProposal,
  ObservedPriceSafetyReport,
  RawCatalogCandidate,
} from "./types.ts";
import {
  RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  RAW_WAREHOUSE_PRICE_AUTHORITY,
} from "./types.ts";

const forbiddenFormalPriceFields = new Set([
  "unit_price",
  "formal_price",
  "approved_price",
  "amount_as_price",
  "pricing_rule_id",
]);

export interface ObservedPriceSafetyInput {
  candidates: RawCatalogCandidate[];
  proposals: HandoffProposal[];
}

export function validateObservedPriceSafety(
  input: ObservedPriceSafetyInput,
): ObservedPriceSafetyReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const forbiddenFieldHits: ObservedPriceSafetyReport["forbidden_field_hits"] = [];

  for (const candidate of input.candidates) {
    collectForbiddenFieldHits(candidate, {
      record_type: "candidate",
      record_id: candidate.candidate_id,
      current_path: "candidate",
      hits: forbiddenFieldHits,
    });

    if (candidate.observed_price !== null && !candidate.requires_human_review) {
      warnings.push(
        `Candidate ${candidate.candidate_id} has observed_price and should remain review-gated.`,
      );
    }
  }

  for (const proposal of input.proposals) {
    collectForbiddenFieldHits(proposal, {
      record_type: "proposal",
      record_id: proposal.proposal_id,
      current_path: "proposal",
      hits: forbiddenFieldHits,
    });

    if (proposal.formal_price_generated !== RAW_WAREHOUSE_FORMAL_PRICE_GENERATED) {
      errors.push(
        `Proposal ${proposal.proposal_id} violates formal_price_generated=false.`,
      );
    }

    if (proposal.price_authority !== RAW_WAREHOUSE_PRICE_AUTHORITY) {
      errors.push(`Proposal ${proposal.proposal_id} violates price_authority=none.`);
    }
  }

  for (const hit of forbiddenFieldHits) {
    errors.push(
      `${hit.record_type} ${hit.record_id} contains forbidden formal price field ${hit.field_path}.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checked_candidate_count: input.candidates.length,
    checked_proposal_count: input.proposals.length,
    formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
    price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
    forbidden_field_hits: forbiddenFieldHits,
  };
}

function collectForbiddenFieldHits(
  value: unknown,
  context: {
    record_type: "candidate" | "proposal";
    record_id: string;
    current_path: string;
    hits: ObservedPriceSafetyReport["forbidden_field_hits"];
  },
): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectForbiddenFieldHits(item, {
        ...context,
        current_path: `${context.current_path}[${index}]`,
      });
    });
    return;
  }

  for (const [key, childValue] of Object.entries(value)) {
    const fieldPath = `${context.current_path}.${key}`;

    if (forbiddenFormalPriceFields.has(key)) {
      context.hits.push({
        record_type: context.record_type,
        record_id: context.record_id,
        field_path: fieldPath,
        field_name: key,
      });
    }

    collectForbiddenFieldHits(childValue, {
      ...context,
      current_path: fieldPath,
    });
  }
}
