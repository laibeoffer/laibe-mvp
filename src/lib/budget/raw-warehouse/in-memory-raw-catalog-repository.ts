import type {
  CatalogReviewItem,
  HandoffProposal,
  RawCatalogCandidate,
  RawCatalogSource,
} from "./types.ts";

export interface RawCatalogRepository {
  saveSources(sources: RawCatalogSource[]): void;
  listSources(): RawCatalogSource[];
  saveCandidates(candidates: RawCatalogCandidate[]): void;
  listCandidates(): RawCatalogCandidate[];
  saveReviewItems(reviewItems: CatalogReviewItem[]): void;
  listReviewItems(): CatalogReviewItem[];
  saveHandoffProposals(proposals: HandoffProposal[]): void;
  listHandoffProposals(): HandoffProposal[];
}

export class InMemoryRawCatalogRepository implements RawCatalogRepository {
  private sources = new Map<string, RawCatalogSource>();
  private candidates = new Map<string, RawCatalogCandidate>();
  private reviewItems = new Map<string, CatalogReviewItem>();
  private proposals = new Map<string, HandoffProposal>();

  saveSources(sources: RawCatalogSource[]): void {
    for (const source of sources) {
      this.sources.set(source.id, source);
    }
  }

  listSources(): RawCatalogSource[] {
    return [...this.sources.values()];
  }

  saveCandidates(candidates: RawCatalogCandidate[]): void {
    for (const candidate of candidates) {
      this.candidates.set(candidate.candidate_id, candidate);
    }
  }

  listCandidates(): RawCatalogCandidate[] {
    return [...this.candidates.values()];
  }

  saveReviewItems(reviewItems: CatalogReviewItem[]): void {
    for (const reviewItem of reviewItems) {
      this.reviewItems.set(reviewItem.id, reviewItem);
    }
  }

  listReviewItems(): CatalogReviewItem[] {
    return [...this.reviewItems.values()];
  }

  saveHandoffProposals(proposals: HandoffProposal[]): void {
    for (const proposal of proposals) {
      this.proposals.set(proposal.proposal_id, proposal);
    }
  }

  listHandoffProposals(): HandoffProposal[] {
    return [...this.proposals.values()];
  }
}
