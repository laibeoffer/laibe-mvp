import type {
  AnalysisFindingDraft,
  QuoteRowCitation,
  SourceDocumentVersion,
} from "./contracts.ts";

type QuoteDocument = Readonly<{
  documentId: string;
  documentVersionId: string;
  documentVersionRef: string;
  documentKind: "quote";
  sha256: string;
}>;

type QuoteRow = Readonly<{
  label: string;
  amount: number | null;
  status?: "unknown";
  requiredEvidence?: string;
  documentVersionId: string;
  page?: number;
  sheet?: string;
  row: number;
  cellRange?: string;
}>;

type QuoteFixture = Readonly<{
  caseId: string;
  documents: readonly QuoteDocument[];
  rows: readonly QuoteRow[];
}>;

type HealthcheckContext = Readonly<{
  caseId: string;
  runId: string;
  runKeySha256: string;
}>;

function source(document: QuoteDocument): SourceDocumentVersion {
  return Object.freeze({
    documentId: document.documentId,
    documentVersionId: document.documentVersionId,
    documentSha256: document.sha256,
  });
}

function citation(
  caseId: string,
  document: QuoteDocument,
  row: QuoteRow,
): QuoteRowCitation {
  const base = {
    kind: "quote_row" as const,
    caseId,
    documentId: document.documentId,
    documentVersionId: document.documentVersionId,
    documentSha256: document.sha256,
    row: row.row,
  };
  return Object.freeze(
    typeof row.page === "number"
      ? { ...base, page: row.page }
      : { ...base, sheet: row.sheet!, cellRange: row.cellRange! },
  );
}

function draft(
  context: HealthcheckContext,
  input: Readonly<{
    findingId: string;
    code: string;
    classification: "conflict" | "unknown";
    statement: string;
    rationale: string;
    citations: readonly QuoteRowCitation[];
    sources: readonly SourceDocumentVersion[];
    unknowns: AnalysisFindingDraft["unknowns"];
  }>,
): AnalysisFindingDraft {
  return Object.freeze({
    schemaVersion: "laibe.drs.analysis-finding-draft.v1",
    findingId: input.findingId,
    findingVersion: 1,
    runId: context.runId,
    runKeySha256: context.runKeySha256,
    caseId: context.caseId,
    domain: "quote",
    code: input.code,
    classification: input.classification,
    severity: "medium",
    statement: input.statement,
    rationale: input.rationale,
    citations: Object.freeze([...input.citations]),
    unknowns: Object.freeze([...input.unknowns]),
    sourceDocumentVersions: Object.freeze([...input.sources]),
    providerNeutral: true,
    humanReviewRequired: true,
    formalImpact: "none",
    lifecycle: "current",
  });
}

export function runQuoteHealthcheck(
  fixture: QuoteFixture,
  context: HealthcheckContext,
): readonly AnalysisFindingDraft[] {
  if (fixture.caseId !== context.caseId) return Object.freeze([]);
  const documents = new Map(
    fixture.documents.map((document) => [document.documentVersionId, document]),
  );
  const findings: AnalysisFindingDraft[] = [];
  const byLabel = new Map<string, QuoteRow[]>();
  for (const row of fixture.rows) {
    const rows = byLabel.get(row.label) ?? [];
    rows.push(row);
    byLabel.set(row.label, rows);
  }
  for (const rows of byLabel.values()) {
    const priced = rows.filter((row) => typeof row.amount === "number");
    const amounts = new Set(priced.map((row) => row.amount));
    if (priced.length > 1 && amounts.size > 1) {
      const citations = priced.map((row) =>
        citation(context.caseId, documents.get(row.documentVersionId)!, row)
      );
      const sources = priced.map((row) =>
        source(documents.get(row.documentVersionId)!)
      );
      findings.push(draft(context, {
        findingId: "a1111111-1111-4111-8111-111111111111",
        code: "QUOTE_SAME_LABEL_VALUE_CONFLICT",
        classification: "conflict",
        statement: `「${priced[0].label}」在不同不可變報價版本中出現不同金額。`,
        rationale: "兩個版本均保留精確列位與 SHA-256，需由 DRS 確認採用依據。",
        citations,
        sources,
        unknowns: [],
      }));
      break;
    }
  }
  const unknown = fixture.rows.find((row) =>
    row.status === "unknown" || row.amount === null
  );
  if (unknown) {
    const document = documents.get(unknown.documentVersionId)!;
    const exactCitation = citation(context.caseId, document, unknown);
    const exactSource = source(document);
    findings.push(draft(context, {
      findingId: "a2222222-2222-4222-8222-222222222222",
      code: "QUOTE_PRICE_BASIS_UNKNOWN",
      classification: "unknown",
      statement: `「${unknown.label}」缺少可比較的完整計價依據。`,
      rationale: "目前版本只能辨識項目名稱，計價是否合理仍屬未知。",
      citations: [exactCitation],
      sources: [exactSource],
      unknowns: [Object.freeze({
        code: "QUOTE_PRICE_BASIS_UNKNOWN",
        requiredEvidence: unknown.requiredEvidence ?? "數量、單價與計價單位",
        sourceDocumentVersions: Object.freeze([exactSource]),
        citations: Object.freeze([exactCitation]),
        nextActor: "vendor",
      })],
    }));
  }
  return Object.freeze(findings);
}
