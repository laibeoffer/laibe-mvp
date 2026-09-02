import type {
  AnalysisFindingDraft,
  ContractRegionCitation,
  DocumentManifestGapCitation,
  SourceDocumentVersion,
} from "./contracts.ts";

type ContractDocument = Readonly<{
  documentId: string;
  documentVersionId: string;
  documentKind: "contract";
  sha256: string;
  pageManifest: readonly number[];
  missingPages?: readonly number[];
}>;

type ContractClause = Readonly<{
  clause: string;
  value: string | null;
  status?: "unknown";
  requiredEvidence?: string;
  page: number;
  textRegion: Readonly<{ start: number; end: number }>;
  documentVersionId: string;
}>;

type ContractFixture = Readonly<{
  caseId: string;
  documents: readonly ContractDocument[];
  clauses: readonly ContractClause[];
}>;

type HealthcheckContext = Readonly<{
  caseId: string;
  runId: string;
  runKeySha256: string;
}>;

function source(document: ContractDocument): SourceDocumentVersion {
  return Object.freeze({
    documentId: document.documentId,
    documentVersionId: document.documentVersionId,
    documentSha256: document.sha256,
  });
}

function clauseCitation(
  caseId: string,
  document: ContractDocument,
  clause: ContractClause,
): ContractRegionCitation {
  return Object.freeze({
    kind: "contract_region",
    caseId,
    documentId: document.documentId,
    documentVersionId: document.documentVersionId,
    documentSha256: document.sha256,
    clause: clause.clause,
    page: clause.page,
    textRegion: Object.freeze({ ...clause.textRegion }),
  });
}

export function runContractHealthcheck(
  fixture: ContractFixture,
  context: HealthcheckContext,
): readonly AnalysisFindingDraft[] {
  if (fixture.caseId !== context.caseId) return Object.freeze([]);
  const documents = new Map(
    fixture.documents.map((document) => [document.documentVersionId, document]),
  );
  const findings: AnalysisFindingDraft[] = [];
  const grouped = new Map<string, ContractClause[]>();
  for (const clause of fixture.clauses) {
    const values = grouped.get(clause.clause) ?? [];
    values.push(clause);
    grouped.set(clause.clause, values);
  }
  for (const clauses of grouped.values()) {
    const known = clauses.filter((clause) => typeof clause.value === "string");
    if (
      known.length > 1 && new Set(known.map((clause) => clause.value)).size > 1
    ) {
      const citations = known.map((clause) =>
        clauseCitation(
          context.caseId,
          documents.get(clause.documentVersionId)!,
          clause,
        )
      );
      const sources = known.map((clause) =>
        source(documents.get(clause.documentVersionId)!)
      );
      findings.push(Object.freeze({
        schemaVersion: "laibe.drs.analysis-finding-draft.v1",
        findingId: "c1111111-1111-4111-8111-111111111111",
        findingVersion: 1,
        runId: context.runId,
        runKeySha256: context.runKeySha256,
        caseId: context.caseId,
        domain: "contract",
        code: "CONTRACT_CLAUSE_VALUE_CONFLICT",
        classification: "conflict",
        severity: "high",
        statement: `「${known[0].clause}」在不同不可變文件版本中內容不一致。`,
        rationale:
          "此結果只標示文件差異，需由 DRS 與適當專業人員確認採用版本。",
        citations: Object.freeze(citations),
        unknowns: Object.freeze([]),
        sourceDocumentVersions: Object.freeze(sources),
        providerNeutral: true,
        humanReviewRequired: true,
        formalImpact: "none",
        lifecycle: "current",
      }));
      break;
    }
  }
  const unknown = fixture.clauses.find((clause) =>
    clause.status === "unknown" || clause.value === null
  );
  if (unknown) {
    const document = documents.get(unknown.documentVersionId)!;
    const exactSource = source(document);
    const exactClauseCitation = clauseCitation(
      context.caseId,
      document,
      unknown,
    );
    const manifestCitation: DocumentManifestGapCitation = Object.freeze({
      kind: "document_manifest_gap",
      caseId: context.caseId,
      documentId: document.documentId,
      documentVersionId: document.documentVersionId,
      documentSha256: document.sha256,
      gapType: "missing_page",
      missingPages: Object.freeze([...(document.missingPages ?? [])]),
    });
    findings.push(Object.freeze({
      schemaVersion: "laibe.drs.analysis-finding-draft.v1",
      findingId: "c2222222-2222-4222-8222-222222222222",
      findingVersion: 1,
      runId: context.runId,
      runKeySha256: context.runKeySha256,
      caseId: context.caseId,
      domain: "contract",
      code: "CONTRACT_PAGE_OR_CLAUSE_MISSING",
      classification: "unknown",
      severity: "high",
      statement:
        `「${unknown.clause}」所在頁面不完整，內容仍待補件與人工覆核。`,
      rationale:
        "缺頁與目錄線索只能證明文件不完整，需由適任人員依完整版本覆核。",
      citations: Object.freeze([manifestCitation, exactClauseCitation]),
      unknowns: Object.freeze([Object.freeze({
        code: "CONTRACT_PAGE_OR_CLAUSE_MISSING",
        requiredEvidence: unknown.requiredEvidence ?? "補齊缺頁與完整條款",
        sourceDocumentVersions: Object.freeze([exactSource]),
        citations: Object.freeze([manifestCitation, exactClauseCitation]),
        nextActor: "external_professional",
      })]),
      sourceDocumentVersions: Object.freeze([exactSource]),
      providerNeutral: true,
      humanReviewRequired: true,
      formalImpact: "none",
      lifecycle: "current",
    }));
  }
  return Object.freeze(findings);
}
