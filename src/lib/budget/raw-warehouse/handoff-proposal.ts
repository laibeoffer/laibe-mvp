import type {
  CandidateValidationResult,
  CatalogReviewItem,
  HandoffAllowedNextAction,
  HandoffBlockedAction,
  HandoffProposal,
  HandoffProposalType,
  RawCatalogCandidate,
  RawCatalogItem,
  RawCatalogSource,
} from "./types.ts";
import {
  RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  RAW_WAREHOUSE_PRICE_AUTHORITY,
} from "./types.ts";

export interface HandoffProposalContext {
  sources: RawCatalogSource[];
  raw_items: RawCatalogItem[];
  validation_results: CandidateValidationResult[];
}

const blockedActions: HandoffBlockedAction[] = [
  "create_formal_pricing_rule",
  "create_budget_estimate_line",
  "overwrite_catalog",
  "publish_without_human_review",
  "render_customer_output",
];

export function createHandoffProposals(
  reviewItems: CatalogReviewItem[],
  candidates: RawCatalogCandidate[],
  context: HandoffProposalContext,
): HandoffProposal[] {
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.candidate_id, candidate]),
  );

  return reviewItems.flatMap((reviewItem) => {
    const candidate = candidateById.get(reviewItem.candidate_id);

    if (!candidate) {
      return [];
    }

    if (reviewItem.status === "needs_merge") {
      return [
        buildProposal(
          "merge_proposal",
          candidate,
          reviewItem,
          context,
          "Candidate overlaps an existing code and should be reviewed for merge.",
        ),
      ];
    }

    if (reviewItem.status !== "approved_as_candidate") {
      return [];
    }

    const proposalType = getProposalType(candidate);

    if (!proposalType) {
      return [];
    }

    return [
      buildProposal(
        proposalType,
        candidate,
        reviewItem,
        context,
        "Approved as candidate evidence only; downstream review is required before use.",
      ),
    ];
  });
}

export function hasFullProposalProvenance(proposal: HandoffProposal): boolean {
  return Boolean(
    proposal.proposal_id &&
      proposal.proposal_type &&
      proposal.source_id &&
      proposal.source_type &&
      proposal.source_name &&
      proposal.source_reliability &&
      proposal.source_date &&
      proposal.raw_item_id &&
      proposal.candidate_id &&
      proposal.review_item_id &&
      proposal.validation_status &&
      proposal.review_status &&
      proposal.price_authority === RAW_WAREHOUSE_PRICE_AUTHORITY &&
      proposal.formal_price_generated === RAW_WAREHOUSE_FORMAL_PRICE_GENERATED &&
      proposal.provenance_trace?.source?.id &&
      proposal.provenance_trace?.raw_item?.id &&
      proposal.provenance_trace?.candidate?.candidate_id &&
      proposal.provenance_trace?.validation?.status &&
      proposal.provenance_trace?.review?.review_item_id &&
      proposal.provenance_trace?.proposal?.proposal_id,
  );
}

function getProposalType(
  candidate: RawCatalogCandidate,
): HandoffProposalType | null {
  switch (candidate.candidate_type) {
    case "material_price":
    case "brand_model":
      return "material_candidate_proposal";
    case "labor_rate":
      return "labor_rate_candidate_proposal";
    case "historical_quote_line":
      return "historical_quote_reference_proposal";
    case "vendor_quote":
      return "vendor_quote_reference_proposal";
    case "market_price":
      return "market_price_reference_proposal";
    default:
      return null;
  }
}

function buildProposal(
  proposalType: HandoffProposalType,
  candidate: RawCatalogCandidate,
  reviewItem: CatalogReviewItem,
  context: HandoffProposalContext,
  reason: string,
): HandoffProposal {
  const rawItemById = new Map(context.raw_items.map((item) => [item.id, item]));
  const sourceById = new Map(context.sources.map((source) => [source.id, source]));
  const validationByCandidateId = new Map(
    context.validation_results.map((result) => [result.candidate_id, result]),
  );
  const rawItem = rawItemById.get(candidate.source_item_id);
  const source = rawItem ? sourceById.get(rawItem.source_id) : undefined;
  const validation = validationByCandidateId.get(candidate.candidate_id);
  const proposalId = `proposal_${proposalType}_${candidate.candidate_id}`;
  const sourceId = source?.id ?? rawItem?.source_id ?? "UNKNOWN_SOURCE";
  const sourceType = source?.source_type ?? candidate.source_type;
  const sourceName = source?.source_name ?? "UNKNOWN_SOURCE_NAME";
  const sourceReliability = source?.source_reliability ?? candidate.source_reliability;
  const sourceDate = source?.source_date ?? candidate.effective_date ?? "";
  const validationStatus = validation?.status ?? reviewItem.validation_status;
  const riskFlags = [
    ...new Set([
      ...(candidate.risk_flags ?? []),
      ...(validation?.risk_flags ?? []),
      ...(reviewItem.risk_flags ?? []),
    ]),
  ];

  return {
    proposal_id: proposalId,
    proposal_type: proposalType,
    source_id: sourceId,
    source_type: sourceType,
    source_name: sourceName,
    source_reliability: sourceReliability,
    source_date: sourceDate,
    raw_item_id: rawItem?.id ?? candidate.source_item_id,
    candidate_id: candidate.candidate_id,
    review_item_id: reviewItem.id,
    validation_status: validationStatus,
    review_status: reviewItem.status,
    reviewer_note: reviewItem.reviewer_note,
    source_item_id: candidate.source_item_id,
    suggested_code: candidate.suggested_code,
    suggested_name: candidate.suggested_name,
    unit: candidate.unit,
    observed_price: candidate.observed_price,
    currency: candidate.currency,
    reason,
    risk_flags: riskFlags,
    formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
    price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
    allowed_next_actions: getAllowedNextActions(proposalType),
    blocked_actions: blockedActions,
    provenance_trace: {
      source: {
        id: sourceId,
        source_type: sourceType,
        source_name: sourceName,
        source_reliability: sourceReliability,
        source_date: sourceDate,
      },
      raw_item: {
        id: rawItem?.id ?? candidate.source_item_id,
        row_index: rawItem?.row_index ?? -1,
        raw_category: rawItem?.raw_category ?? "",
        raw_name: rawItem?.raw_name ?? candidate.suggested_name,
        raw_unit: rawItem?.raw_unit ?? candidate.unit,
        raw_unit_price: rawItem?.raw_unit_price ?? candidate.observed_price,
        raw_amount: rawItem?.raw_amount ?? null,
        raw_currency: rawItem?.raw_currency ?? candidate.currency,
        effective_date: rawItem?.effective_date ?? candidate.effective_date,
        region: rawItem?.region ?? "",
        vendor_name: rawItem?.vendor_name ?? null,
      },
      candidate: {
        candidate_id: candidate.candidate_id,
        candidate_type: candidate.candidate_type,
        suggested_code: candidate.suggested_code,
        suggested_name: candidate.suggested_name,
        confidence: candidate.confidence,
        requires_human_review: candidate.requires_human_review,
        risk_flags: candidate.risk_flags,
      },
      validation: {
        status: validationStatus,
        errors: validation?.errors ?? [],
        warnings: validation?.warnings ?? [],
        risk_flags: validation?.risk_flags ?? [],
      },
      review: {
        review_item_id: reviewItem.id,
        review_status: reviewItem.status,
        reviewer_note: reviewItem.reviewer_note,
      },
      proposal: {
        proposal_id: proposalId,
        proposal_type: proposalType,
        formal_price_generated: RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
        price_authority: RAW_WAREHOUSE_PRICE_AUTHORITY,
      },
    },
    metadata: {
      candidate_type: candidate.candidate_type,
      trade_category: candidate.trade_category,
      item_category: candidate.item_category,
    },
  };
}

function getAllowedNextActions(
  proposalType: HandoffProposalType,
): HandoffAllowedNextAction[] {
  switch (proposalType) {
    case "material_candidate_proposal":
      return [
        "send_to_material_spec_review",
        "send_to_pricing_review",
        "keep_as_historical_reference",
        "request_more_info",
        "reject_candidate",
      ];
    case "labor_rate_candidate_proposal":
      return [
        "send_to_pricing_review",
        "keep_as_historical_reference",
        "request_more_info",
        "reject_candidate",
      ];
    case "historical_quote_reference_proposal":
    case "vendor_quote_reference_proposal":
    case "market_price_reference_proposal":
      return [
        "send_to_pricing_review",
        "keep_as_historical_reference",
        "request_more_info",
        "reject_candidate",
      ];
    case "merge_proposal":
      return [
        "send_to_method_spec_review",
        "send_to_pricing_review",
        "send_to_material_spec_review",
        "request_more_info",
        "reject_candidate",
      ];
  }
}
