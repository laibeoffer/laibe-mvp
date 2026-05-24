import type {
  HandoffAllowedNextAction,
  HandoffBlockedAction,
  HandoffProposal,
} from "./types.ts";
import {
  RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
  RAW_WAREHOUSE_PRICE_AUTHORITY,
} from "./types.ts";

export interface HandoffProposalContractValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checked_count: number;
  invalid_count: number;
}

const requiredFields = [
  "proposal_id",
  "proposal_type",
  "source_id",
  "source_type",
  "source_name",
  "source_reliability",
  "source_date",
  "raw_item_id",
  "candidate_id",
  "review_item_id",
  "validation_status",
  "review_status",
  "reviewer_note",
  "observed_price",
  "currency",
  "unit",
  "formal_price_generated",
  "price_authority",
  "allowed_next_actions",
  "blocked_actions",
  "provenance_trace",
] as const;

const allowedNextActions = new Set<HandoffAllowedNextAction>([
  "send_to_method_spec_review",
  "send_to_pricing_review",
  "send_to_material_spec_review",
  "keep_as_historical_reference",
  "request_more_info",
  "reject_candidate",
]);

const requiredBlockedActions = new Set<HandoffBlockedAction>([
  "create_formal_pricing_rule",
  "create_budget_estimate_line",
  "overwrite_catalog",
  "publish_without_human_review",
  "render_customer_output",
]);

const forbiddenFields = new Set([
  "unit_price",
  "formal_price",
  "approved_price",
  "amount_as_price",
  "pricing_rule_id",
  "material_spec_id",
  "labor_rule_id",
  "budget_estimate_line_id",
]);

export function validateHandoffProposalContract(
  proposals: HandoffProposal[],
): HandoffProposalContractValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invalidProposalIds = new Set<string>();

  for (const proposal of proposals) {
    const proposalId = getRecordId(proposal);
    const beforeErrorCount = errors.length;

    validateRequiredFields(proposal, proposalId, errors);
    validatePriceAuthority(proposal, proposalId, errors);
    validateActions(proposal, proposalId, errors);
    validateProvenanceTrace(proposal, proposalId, errors, warnings);
    validateForbiddenFields(proposal, proposalId, errors);

    if (errors.length > beforeErrorCount) {
      invalidProposalIds.add(proposalId);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checked_count: proposals.length,
    invalid_count: invalidProposalIds.size,
  };
}

function validateRequiredFields(
  proposal: HandoffProposal,
  proposalId: string,
  errors: string[],
): void {
  const record = proposal as unknown as Record<string, unknown>;

  for (const field of requiredFields) {
    if (!(field in record)) {
      errors.push(`Proposal ${proposalId} is missing required field: ${field}.`);
    }
  }

  if (!Array.isArray(proposal.allowed_next_actions)) {
    errors.push(`Proposal ${proposalId} allowed_next_actions must be an array.`);
  }

  if (!Array.isArray(proposal.blocked_actions)) {
    errors.push(`Proposal ${proposalId} blocked_actions must be an array.`);
  }
}

function validatePriceAuthority(
  proposal: HandoffProposal,
  proposalId: string,
  errors: string[],
): void {
  if (proposal.formal_price_generated !== RAW_WAREHOUSE_FORMAL_PRICE_GENERATED) {
    errors.push(`Proposal ${proposalId} formal_price_generated must be false.`);
  }

  if (proposal.price_authority !== RAW_WAREHOUSE_PRICE_AUTHORITY) {
    errors.push(`Proposal ${proposalId} price_authority must be none.`);
  }
}

function validateActions(
  proposal: HandoffProposal,
  proposalId: string,
  errors: string[],
): void {
  for (const action of proposal.allowed_next_actions ?? []) {
    if (!allowedNextActions.has(action)) {
      errors.push(`Proposal ${proposalId} contains invalid allowed_next_action: ${action}.`);
    }
  }

  for (const requiredAction of requiredBlockedActions) {
    if (!proposal.blocked_actions?.includes(requiredAction)) {
      errors.push(
        `Proposal ${proposalId} blocked_actions must include ${requiredAction}.`,
      );
    }
  }
}

function validateProvenanceTrace(
  proposal: HandoffProposal,
  proposalId: string,
  errors: string[],
  warnings: string[],
): void {
  const trace = proposal.provenance_trace;

  if (!trace) {
    errors.push(`Proposal ${proposalId} provenance_trace is required.`);
    return;
  }

  compareTraceValue(proposalId, "source.id", trace.source?.id, proposal.source_id, errors);
  compareTraceValue(
    proposalId,
    "source.source_type",
    trace.source?.source_type,
    proposal.source_type,
    errors,
  );
  compareTraceValue(
    proposalId,
    "source.source_name",
    trace.source?.source_name,
    proposal.source_name,
    errors,
  );
  compareTraceValue(
    proposalId,
    "source.source_reliability",
    trace.source?.source_reliability,
    proposal.source_reliability,
    errors,
  );
  compareTraceValue(
    proposalId,
    "source.source_date",
    trace.source?.source_date,
    proposal.source_date,
    errors,
  );
  compareTraceValue(
    proposalId,
    "raw_item.id",
    trace.raw_item?.id,
    proposal.raw_item_id,
    errors,
  );
  compareTraceValue(
    proposalId,
    "candidate.candidate_id",
    trace.candidate?.candidate_id,
    proposal.candidate_id,
    errors,
  );
  compareTraceValue(
    proposalId,
    "validation.status",
    trace.validation?.status,
    proposal.validation_status,
    errors,
  );
  compareTraceValue(
    proposalId,
    "review.review_item_id",
    trace.review?.review_item_id,
    proposal.review_item_id,
    errors,
  );
  compareTraceValue(
    proposalId,
    "review.review_status",
    trace.review?.review_status,
    proposal.review_status,
    errors,
  );
  compareTraceValue(
    proposalId,
    "proposal.proposal_id",
    trace.proposal?.proposal_id,
    proposal.proposal_id,
    errors,
  );
  compareTraceValue(
    proposalId,
    "proposal.proposal_type",
    trace.proposal?.proposal_type,
    proposal.proposal_type,
    errors,
  );
  compareTraceValue(
    proposalId,
    "proposal.formal_price_generated",
    trace.proposal?.formal_price_generated,
    RAW_WAREHOUSE_FORMAL_PRICE_GENERATED,
    errors,
  );
  compareTraceValue(
    proposalId,
    "proposal.price_authority",
    trace.proposal?.price_authority,
    RAW_WAREHOUSE_PRICE_AUTHORITY,
    errors,
  );

  if (trace.raw_item?.raw_unit !== null && trace.raw_item?.raw_unit !== proposal.unit) {
    warnings.push(`Proposal ${proposalId} unit differs from raw_item.raw_unit.`);
  }

  if (trace.raw_item?.raw_currency !== null && trace.raw_item?.raw_currency !== proposal.currency) {
    warnings.push(`Proposal ${proposalId} currency differs from raw_item.raw_currency.`);
  }
}

function validateForbiddenFields(
  proposal: HandoffProposal,
  proposalId: string,
  errors: string[],
): void {
  const hits: string[] = [];
  collectForbiddenFieldHits(proposal, "proposal", hits);

  for (const hit of hits) {
    errors.push(`Proposal ${proposalId} contains forbidden field: ${hit}.`);
  }
}

function compareTraceValue(
  proposalId: string,
  fieldPath: string,
  actual: unknown,
  expected: unknown,
  errors: string[],
): void {
  if (actual !== expected) {
    errors.push(
      `Proposal ${proposalId} provenance_trace.${fieldPath} does not match proposal contract.`,
    );
  }
}

function collectForbiddenFieldHits(
  value: unknown,
  currentPath: string,
  hits: string[],
): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectForbiddenFieldHits(item, `${currentPath}[${index}]`, hits);
    });
    return;
  }

  for (const [key, childValue] of Object.entries(value)) {
    const fieldPath = `${currentPath}.${key}`;

    if (forbiddenFields.has(key)) {
      hits.push(fieldPath);
    }

    collectForbiddenFieldHits(childValue, fieldPath, hits);
  }
}

function getRecordId(proposal: HandoffProposal): string {
  return proposal.proposal_id || "UNKNOWN_PROPOSAL";
}
