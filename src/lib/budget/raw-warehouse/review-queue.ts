import type {
  CandidateValidationResult,
  CatalogReviewItem,
  RawCatalogCandidate,
  ReviewStatus,
} from "./types.ts";

export function createReviewQueue(
  candidates: RawCatalogCandidate[],
  validationResults: CandidateValidationResult[],
  existingCatalogCodes: Set<string> = new Set(),
): CatalogReviewItem[] {
  const validationByCandidateId = new Map(
    validationResults.map((result) => [result.candidate_id, result]),
  );

  return candidates.map((candidate) => {
    const validation = validationByCandidateId.get(candidate.candidate_id);
    const status = getInitialReviewStatus(candidate, validation, existingCatalogCodes);

    return {
      id: `review_${candidate.candidate_id}`,
      candidate_id: candidate.candidate_id,
      status,
      reviewer_note: getInitialReviewerNote(status),
      approved_payload: null,
      validation_status: validation?.status ?? "blocked",
      risk_flags: [...new Set([...(candidate.risk_flags ?? []), ...(validation?.risk_flags ?? [])])],
    };
  });
}

export function simulateHumanReview(
  reviewItems: CatalogReviewItem[],
  candidates: RawCatalogCandidate[],
): CatalogReviewItem[] {
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.candidate_id, candidate]),
  );

  return reviewItems.map((item) => {
    const candidate = candidateById.get(item.candidate_id);

    if (!candidate) {
      return {
        ...item,
        status: "rejected",
        reviewer_note: "Candidate missing during simulated review.",
      };
    }

    if (item.status === "pending" && candidate.confidence >= 0.7) {
      return {
        ...item,
        status: "approved_as_candidate",
        reviewer_note:
          "Simulated review approved as candidate evidence only; not formal price approval, catalog publishing, rule approval, line input, or customer output.",
        approved_payload: candidate,
      };
    }

    return item;
  });
}

export function countReviewStatuses(
  reviewItems: CatalogReviewItem[],
): Record<ReviewStatus, number> {
  return reviewItems.reduce<Record<ReviewStatus, number>>(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    {
      pending: 0,
      approved_as_candidate: 0,
      rejected: 0,
      needs_more_info: 0,
      needs_merge: 0,
      deprecated: 0,
    },
  );
}

function getInitialReviewStatus(
  candidate: RawCatalogCandidate,
  validation: CandidateValidationResult | undefined,
  existingCatalogCodes: Set<string>,
): ReviewStatus {
  if (!validation || validation.status === "blocked") {
    return "rejected";
  }

  if (validation.status === "needs_more_info") {
    return "needs_more_info";
  }

  if (candidate.suggested_code && existingCatalogCodes.has(candidate.suggested_code)) {
    return "needs_merge";
  }

  return "pending";
}

function getInitialReviewerNote(status: ReviewStatus): string {
  switch (status) {
    case "pending":
      return "Ready for candidate review.";
    case "needs_more_info":
      return "Missing required source or classification information.";
    case "needs_merge":
      return "Suggested code already exists; merge review required.";
    case "rejected":
      return "Blocked by validation.";
    default:
      return "Review status initialized.";
  }
}
