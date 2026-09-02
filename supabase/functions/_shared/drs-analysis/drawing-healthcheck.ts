import type {
  AnalysisFindingDraft,
  DrawingRegionCitation,
  SourceDocumentVersion,
} from "./contracts.ts";

type DrawingDocument = Readonly<{
  documentId: string;
  documentVersionId: string;
  documentKind: "drawing";
  sha256: string;
}>;

type DrawingObservation = Readonly<{
  code: "DRAWING_SCALE_MISSING" | "DRAWING_SCAN_UNREADABLE";
  setName: string;
  sheet: string;
  page: number;
  scaleStatus: "missing" | "unreadable";
  scaleValue: null;
  coordinateRegion: Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  documentVersionId: string;
}>;

type DrawingFixture = Readonly<{
  caseId: string;
  documents: readonly DrawingDocument[];
  observations: readonly DrawingObservation[];
}>;

type HealthcheckContext = Readonly<{
  caseId: string;
  runId: string;
  runKeySha256: string;
}>;

export function runDrawingHealthcheck(
  fixture: DrawingFixture,
  context: HealthcheckContext,
): readonly AnalysisFindingDraft[] {
  if (fixture.caseId !== context.caseId) return Object.freeze([]);
  const documents = new Map(
    fixture.documents.map((document) => [document.documentVersionId, document]),
  );
  return Object.freeze(fixture.observations.map((observation, index) => {
    const document = documents.get(observation.documentVersionId)!;
    const exactSource: SourceDocumentVersion = Object.freeze({
      documentId: document.documentId,
      documentVersionId: document.documentVersionId,
      documentSha256: document.sha256,
    });
    const exactCitation: DrawingRegionCitation = Object.freeze({
      kind: "drawing_region",
      caseId: context.caseId,
      documentId: document.documentId,
      documentVersionId: document.documentVersionId,
      documentSha256: document.sha256,
      setName: observation.setName,
      sheet: observation.sheet,
      page: observation.page,
      scaleStatus: observation.scaleStatus,
      scaleValue: null,
      coordinateRegion: Object.freeze({ ...observation.coordinateRegion }),
    });
    const unreadable = observation.code === "DRAWING_SCAN_UNREADABLE";
    return Object.freeze(
      {
        schemaVersion: "laibe.drs.analysis-finding-draft.v1",
        findingId: index === 0
          ? "b1111111-1111-4111-8111-111111111111"
          : "b2222222-2222-4222-8222-222222222222",
        findingVersion: 1,
        runId: context.runId,
        runKeySha256: context.runKeySha256,
        caseId: context.caseId,
        domain: "drawing",
        code: observation.code,
        classification: "unknown",
        severity: unreadable ? "high" : "medium",
        statement: unreadable
          ? "此圖面掃描區域無法可靠辨識，內容仍待補件。"
          : "此圖面未能辨識比例，尺寸關係仍未解決。",
        rationale: unreadable
          ? "無法辨識的影像不能作為圖面確認或施工依據。"
          : "缺少比例時不能從像素距離推定實際尺寸。",
        citations: Object.freeze([exactCitation]),
        unknowns: Object.freeze([Object.freeze({
          code: observation.code,
          requiredEvidence: unreadable
            ? "提供可清楚辨識的同版圖面或原始 PDF"
            : "提供比例標示或一組可校正的已知尺寸",
          sourceDocumentVersions: Object.freeze([exactSource]),
          citations: Object.freeze([exactCitation]),
          nextActor: "owner",
        })]),
        sourceDocumentVersions: Object.freeze([exactSource]),
        providerNeutral: true,
        humanReviewRequired: true,
        formalImpact: "none",
        lifecycle: "current",
      } as const,
    );
  }));
}
