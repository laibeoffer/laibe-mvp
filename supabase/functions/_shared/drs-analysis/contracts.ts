export const ANALYSIS_ENQUEUE_REQUEST_SCHEMA =
  "laibe.drs.analysis-enqueue.request.v1" as const;
export const ANALYSIS_OUTPUT_SCHEMA = "laibe.drs.analysis-output.v1" as const;
export const ANALYSIS_FINDING_DRAFT_SCHEMA =
  "laibe.drs.analysis-finding-draft.v1" as const;

const safeArrayIsArray = Array.isArray;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeGetPrototypeOf = Object.getPrototypeOf;
const safeNumberIsInteger = Number.isInteger;
const safeObjectFreeze = Object.freeze;
const safeObjectPrototype = Object.prototype;
const safeReflectOwnKeys = Reflect.ownKeys;

export type AnalysisDomain = "quote" | "drawing" | "contract";
export type FindingClassification =
  | "confirmed"
  | "conflict"
  | "unknown"
  | "risk";
export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";
export type FindingNextActor =
  | "owner"
  | "vendor"
  | "drs"
  | "external_professional";
export type FindingLifecycle = "current" | "stale";

export type AnalysisDocumentVersion = Readonly<{
  ordinal: number;
  caseId: string;
  documentId: string;
  documentVersionId: string;
  documentVersionRef: string;
  documentKind: AnalysisDomain;
  sha256: string;
}>;

export type AnalysisEnqueueRequest = Readonly<{
  schemaVersion: typeof ANALYSIS_ENQUEUE_REQUEST_SCHEMA;
  inputManifestSha256: string;
  documents: readonly AnalysisDocumentVersion[];
  prompt: Readonly<{ version: string; sha256: string }>;
  model: Readonly<{ adapterVersion: string; profileVersion: string }>;
  rule: Readonly<{ version: string; sha256: string }>;
  outputSchema: Readonly<{ version: string; sha256: string }>;
}>;

export type SourceDocumentVersion = Readonly<{
  documentId: string;
  documentVersionId: string;
  documentSha256: string;
}>;

type CitationBase = Readonly<{
  caseId: string;
  documentId: string;
  documentVersionId: string;
  documentSha256: string;
}>;

export type QuoteRowCitation =
  & CitationBase
  & Readonly<{
    kind: "quote_row";
    row: number;
    page?: number;
    sheet?: string;
    cellRange?: string;
  }>;

export type DrawingRegionCitation =
  & CitationBase
  & Readonly<{
    kind: "drawing_region";
    setName: string;
    sheet: string;
    page: number;
    scaleStatus: "confirmed" | "missing" | "unreadable" | "conflict";
    scaleValue: string | null;
    coordinateRegion: Readonly<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  }>;

export type ContractRegionCitation =
  & CitationBase
  & Readonly<{
    kind: "contract_region";
    clause: string;
    page: number;
    textRegion: Readonly<{ start: number; end: number }>;
  }>;

export type DocumentManifestGapCitation =
  & CitationBase
  & Readonly<{
    kind: "document_manifest_gap";
    gapType: "missing_page" | "whole_document_unreadable";
    missingPages: readonly number[];
  }>;

export type AnalysisCitation =
  | QuoteRowCitation
  | DrawingRegionCitation
  | ContractRegionCitation
  | DocumentManifestGapCitation;

export type FindingUnknown = Readonly<{
  code: string;
  requiredEvidence: string;
  sourceDocumentVersions: readonly SourceDocumentVersion[];
  citations: readonly AnalysisCitation[];
  nextActor: FindingNextActor;
}>;

export type AnalysisFindingDraft = Readonly<{
  schemaVersion: typeof ANALYSIS_FINDING_DRAFT_SCHEMA;
  findingId: string;
  findingVersion: number;
  runId: string;
  runKeySha256: string;
  caseId: string;
  domain: AnalysisDomain;
  code: string;
  classification: FindingClassification;
  severity: FindingSeverity;
  statement: string;
  rationale: string;
  citations: readonly AnalysisCitation[];
  unknowns: readonly FindingUnknown[];
  sourceDocumentVersions: readonly SourceDocumentVersion[];
  providerNeutral: true;
  humanReviewRequired: true;
  formalImpact: "none";
  lifecycle: FindingLifecycle;
}>;

export type AnalysisOutput = Readonly<{
  schemaVersion: typeof ANALYSIS_OUTPUT_SCHEMA;
  runId: string;
  runKeySha256: string;
  caseId: string;
  providerNeutral: true;
  humanReviewRequired: true;
  formalImpact: "none";
  findings: readonly AnalysisFindingDraft[];
}>;

export type AnalysisRunContext = Readonly<{
  runId: string;
  runKeySha256: string;
  caseId: string;
  documents: readonly AnalysisDocumentVersion[];
}>;

export type FindingReadModel = Readonly<{
  findingSource: "AI_DRAFT";
  reviewState: "PENDING_DRS_REVIEW" | "DRS_REVIEWED";
  finding: AnalysisFindingDraft;
  drsReview: Readonly<Record<string, unknown>> | null;
  partyStatement: Readonly<Record<string, unknown>> | null;
  ownerDecision: Readonly<Record<string, unknown>> | null;
}>;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const OPAQUE_VERSION_REF = /^dvr_[0-9a-z]{20,40}$/u;
const VERSION_LABEL = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const FINDING_CODE = /^[A-Z][A-Z0-9_]{2,127}$/u;

function plainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: unknown, expected: readonly string[]): boolean {
  if (!plainRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expected.length &&
    expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function readOwn(value: unknown, key: string): unknown {
  return plainRecord(value) && Object.prototype.hasOwnProperty.call(value, key)
    ? value[key]
    : undefined;
}

function boundedText(value: unknown, maximum = 2_000): value is string {
  return typeof value === "string" && value === value.trim() &&
    value.length > 0 && value.length <= maximum && !/[\p{C}]/u.test(value);
}

function validVersion(value: unknown): value is string {
  return typeof value === "string" && VERSION_LABEL.test(value);
}

function validSha(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function finiteUnit(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 &&
    value <= 1;
}

function parseDocumentVersion(
  value: unknown,
  expectedCaseId: string,
  expectedOrdinal: number,
): AnalysisDocumentVersion | null {
  if (
    !hasExactKeys(value, [
      "ordinal",
      "caseId",
      "documentId",
      "documentVersionId",
      "documentVersionRef",
      "documentKind",
      "sha256",
    ])
  ) return null;
  const ordinal = readOwn(value, "ordinal");
  const caseId = readOwn(value, "caseId");
  const documentId = readOwn(value, "documentId");
  const documentVersionId = readOwn(value, "documentVersionId");
  const documentVersionRef = readOwn(value, "documentVersionRef");
  const documentKind = readOwn(value, "documentKind");
  const sha256 = readOwn(value, "sha256");
  if (
    ordinal !== expectedOrdinal || caseId !== expectedCaseId ||
    !validUuid(documentId) || !validUuid(documentVersionId) ||
    typeof documentVersionRef !== "string" ||
    !OPAQUE_VERSION_REF.test(documentVersionRef) ||
    !["quote", "drawing", "contract"].includes(String(documentKind)) ||
    !validSha(sha256)
  ) return null;
  return Object.freeze({
    ordinal,
    caseId,
    documentId,
    documentVersionId,
    documentVersionRef,
    documentKind: documentKind as AnalysisDomain,
    sha256,
  });
}

export function parseAnalysisEnqueueRequest(
  value: unknown,
  expectedCaseId: string,
): AnalysisEnqueueRequest | null {
  if (
    !validUuid(expectedCaseId) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "inputManifestSha256",
      "documents",
      "prompt",
      "model",
      "rule",
      "outputSchema",
    ]) || readOwn(value, "schemaVersion") !== ANALYSIS_ENQUEUE_REQUEST_SCHEMA ||
    !validSha(readOwn(value, "inputManifestSha256"))
  ) return null;
  const documentsValue = readOwn(value, "documents");
  if (
    !Array.isArray(documentsValue) || documentsValue.length < 1 ||
    documentsValue.length > 24
  ) return null;
  const documents: AnalysisDocumentVersion[] = [];
  for (let index = 0; index < documentsValue.length; index += 1) {
    const parsed = parseDocumentVersion(
      documentsValue[index],
      expectedCaseId,
      index + 1,
    );
    if (!parsed) return null;
    documents.push(parsed);
  }
  if (
    new Set(documents.map((document) => document.documentVersionId)).size !==
      documents.length
  ) return null;
  const prompt = readOwn(value, "prompt");
  const model = readOwn(value, "model");
  const rule = readOwn(value, "rule");
  const outputSchema = readOwn(value, "outputSchema");
  if (
    !hasExactKeys(prompt, ["version", "sha256"]) ||
    !validVersion(readOwn(prompt, "version")) ||
    !validSha(readOwn(prompt, "sha256")) ||
    !hasExactKeys(model, ["adapterVersion", "profileVersion"]) ||
    !validVersion(readOwn(model, "adapterVersion")) ||
    !validVersion(readOwn(model, "profileVersion")) ||
    !hasExactKeys(rule, ["version", "sha256"]) ||
    !validVersion(readOwn(rule, "version")) ||
    !validSha(readOwn(rule, "sha256")) ||
    !hasExactKeys(outputSchema, ["version", "sha256"]) ||
    !validVersion(readOwn(outputSchema, "version")) ||
    !validSha(readOwn(outputSchema, "sha256"))
  ) return null;
  return Object.freeze({
    schemaVersion: ANALYSIS_ENQUEUE_REQUEST_SCHEMA,
    inputManifestSha256: readOwn(value, "inputManifestSha256") as string,
    documents: Object.freeze(documents),
    prompt: Object.freeze({
      version: readOwn(prompt, "version") as string,
      sha256: readOwn(prompt, "sha256") as string,
    }),
    model: Object.freeze({
      adapterVersion: readOwn(model, "adapterVersion") as string,
      profileVersion: readOwn(model, "profileVersion") as string,
    }),
    rule: Object.freeze({
      version: readOwn(rule, "version") as string,
      sha256: readOwn(rule, "sha256") as string,
    }),
    outputSchema: Object.freeze({
      version: readOwn(outputSchema, "version") as string,
      sha256: readOwn(outputSchema, "sha256") as string,
    }),
  });
}

export function canonicalRunIdentity(request: AnalysisEnqueueRequest): string {
  const lines = [
    `schemaVersion=${request.schemaVersion}`,
    `inputManifestSha256=${request.inputManifestSha256}`,
    `promptVersion=${request.prompt.version}`,
    `promptSha256=${request.prompt.sha256}`,
    `modelAdapterVersion=${request.model.adapterVersion}`,
    `modelProfileVersion=${request.model.profileVersion}`,
    `ruleVersion=${request.rule.version}`,
    `ruleSha256=${request.rule.sha256}`,
    `outputSchemaVersion=${request.outputSchema.version}`,
    `outputSchemaSha256=${request.outputSchema.sha256}`,
  ];
  for (const document of request.documents) {
    lines.push(
      `document.${document.ordinal}.caseId=${document.caseId}`,
      `document.${document.ordinal}.documentId=${document.documentId}`,
      `document.${document.ordinal}.documentVersionId=${document.documentVersionId}`,
      `document.${document.ordinal}.documentVersionRef=${document.documentVersionRef}`,
      `document.${document.ordinal}.documentKind=${document.documentKind}`,
      `document.${document.ordinal}.sha256=${document.sha256}`,
    );
  }
  return lines.join("\n");
}

export async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  let result = "";
  for (const byte of new Uint8Array(digest)) {
    result += byte.toString(16).padStart(2, "0");
  }
  return result;
}

export function canonicalRunKeySha256(
  request: AnalysisEnqueueRequest,
): Promise<string> {
  return sha256Text(canonicalRunIdentity(request));
}

function intrinsicOwnDataDescriptor(
  value: object,
  key: PropertyKey,
): PropertyDescriptor | null {
  const descriptor = safeGetOwnPropertyDescriptor(value, key);
  return descriptor && safeGetOwnPropertyDescriptor(descriptor, "value")
    ? descriptor
    : null;
}

function intrinsicExactOwnDataValues(
  value: unknown,
  keys: readonly string[],
): unknown[] | null {
  if (
    value === null || typeof value !== "object" || safeArrayIsArray(value) ||
    safeGetPrototypeOf(value) !== safeObjectPrototype
  ) return null;
  const ownKeys = safeReflectOwnKeys(value);
  if (ownKeys.length !== keys.length) return null;
  const values: unknown[] = [];
  values.length = keys.length;
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = intrinsicOwnDataDescriptor(value, keys[index]);
    if (!descriptor) return null;
    values[index] = descriptor.value;
  }
  return values;
}

function intrinsicDenseOwnDataElements(
  value: unknown,
  maximum: number,
): unknown[] | null {
  if (!safeArrayIsArray(value)) return null;
  const lengthDescriptor = intrinsicOwnDataDescriptor(value, "length");
  const length = lengthDescriptor?.value;
  if (
    !safeNumberIsInteger(length) || length < 1 || length > maximum ||
    safeReflectOwnKeys(value).length !== length + 1
  ) return null;
  const elements: unknown[] = [];
  elements.length = length;
  for (let index = 0; index < length; index += 1) {
    const descriptor = intrinsicOwnDataDescriptor(value, `${index}`);
    if (!descriptor) return null;
    elements[index] = descriptor.value;
  }
  return elements;
}

function intrinsicAnalysisRunDocument(
  value: unknown,
  expectedCaseId: string,
  expectedOrdinal: number,
): AnalysisDocumentVersion | null {
  const values = intrinsicExactOwnDataValues(value, [
    "ordinal",
    "caseId",
    "documentId",
    "documentVersionId",
    "documentVersionRef",
    "documentKind",
    "sha256",
  ]);
  if (!values) return null;
  const ordinal = values[0];
  const caseId = values[1];
  const documentId = values[2];
  const documentVersionId = values[3];
  const documentVersionRef = values[4];
  const documentKind = values[5];
  const sha256 = values[6];
  if (
    ordinal !== expectedOrdinal || caseId !== expectedCaseId ||
    !validUuid(documentId) || !validUuid(documentVersionId) ||
    typeof documentVersionRef !== "string" ||
    !OPAQUE_VERSION_REF.test(documentVersionRef) ||
    (documentKind !== "quote" && documentKind !== "drawing" &&
      documentKind !== "contract") ||
    !validSha(sha256)
  ) return null;
  return safeObjectFreeze({
    ordinal,
    caseId,
    documentId,
    documentVersionId,
    documentVersionRef,
    documentKind: documentKind as AnalysisDomain,
    sha256,
  });
}

export function validateAnalysisRunContext(
  value: unknown,
): AnalysisRunContext | null {
  try {
    const values = intrinsicExactOwnDataValues(value, [
      "runId",
      "runKeySha256",
      "caseId",
      "documents",
    ]);
    if (!values) return null;
    const runId = values[0];
    const runKeySha256 = values[1];
    const caseId = values[2];
    const documentsValue = values[3];
    if (!validUuid(runId) || !validSha(runKeySha256) || !validUuid(caseId)) {
      return null;
    }
    const documentValues = intrinsicDenseOwnDataElements(documentsValue, 24);
    if (!documentValues) return null;
    const documents: AnalysisDocumentVersion[] = [];
    documents.length = documentValues.length;
    for (let index = 0; index < documentValues.length; index += 1) {
      const document = intrinsicAnalysisRunDocument(
        documentValues[index],
        caseId,
        index + 1,
      );
      if (!document) return null;
      for (let prior = 0; prior < index; prior += 1) {
        if (
          documents[prior].documentVersionId === document.documentVersionId
        ) return null;
      }
      documents[index] = document;
    }
    return safeObjectFreeze({
      runId,
      runKeySha256,
      caseId,
      documents: safeObjectFreeze(documents),
    });
  } catch {
    return null;
  }
}

function sourceVersion(value: unknown): SourceDocumentVersion | null {
  if (
    !hasExactKeys(value, [
      "documentId",
      "documentVersionId",
      "documentSha256",
    ]) || !validUuid(readOwn(value, "documentId")) ||
    !validUuid(readOwn(value, "documentVersionId")) ||
    !validSha(readOwn(value, "documentSha256"))
  ) return null;
  return Object.freeze({
    documentId: readOwn(value, "documentId") as string,
    documentVersionId: readOwn(value, "documentVersionId") as string,
    documentSha256: readOwn(value, "documentSha256") as string,
  });
}

function citationBaseMatches(
  value: unknown,
  context: AnalysisRunContext,
): CitationBase | null {
  const caseId = readOwn(value, "caseId");
  const documentId = readOwn(value, "documentId");
  const documentVersionId = readOwn(value, "documentVersionId");
  const documentSha256 = readOwn(value, "documentSha256");
  if (
    caseId !== context.caseId || !validUuid(documentId) ||
    !validUuid(documentVersionId) || !validSha(documentSha256) ||
    !context.documents.some((document) =>
      document.caseId === caseId && document.documentId === documentId &&
      document.documentVersionId === documentVersionId &&
      document.sha256 === documentSha256
    )
  ) return null;
  return { caseId, documentId, documentVersionId, documentSha256 };
}

function parseCitation(
  value: unknown,
  context: AnalysisRunContext,
): AnalysisCitation | null {
  const base = citationBaseMatches(value, context);
  const kind = readOwn(value, "kind");
  if (!base) return null;
  if (kind === "quote_row") {
    const pageVariant = hasExactKeys(value, [
      "kind",
      "caseId",
      "documentId",
      "documentVersionId",
      "documentSha256",
      "page",
      "row",
    ]);
    const sheetVariant = hasExactKeys(value, [
      "kind",
      "caseId",
      "documentId",
      "documentVersionId",
      "documentSha256",
      "sheet",
      "row",
      "cellRange",
    ]);
    if (
      (!pageVariant && !sheetVariant) ||
      !Number.isSafeInteger(readOwn(value, "row")) ||
      (readOwn(value, "row") as number) < 1 ||
      (pageVariant &&
        (!Number.isSafeInteger(readOwn(value, "page")) ||
          (readOwn(value, "page") as number) < 1)) ||
      (sheetVariant &&
        (!boundedText(readOwn(value, "sheet"), 120) ||
          !boundedText(readOwn(value, "cellRange"), 64)))
    ) return null;
    return Object.freeze({
      kind,
      ...base,
      ...(pageVariant ? { page: readOwn(value, "page") as number } : {
        sheet: readOwn(value, "sheet") as string,
        cellRange: readOwn(value, "cellRange") as string,
      }),
      row: readOwn(value, "row") as number,
    });
  }
  if (kind === "drawing_region") {
    if (
      !hasExactKeys(value, [
        "kind",
        "caseId",
        "documentId",
        "documentVersionId",
        "documentSha256",
        "setName",
        "sheet",
        "page",
        "scaleStatus",
        "scaleValue",
        "coordinateRegion",
      ]) || !boundedText(readOwn(value, "setName"), 120) ||
      !boundedText(readOwn(value, "sheet"), 120) ||
      !Number.isSafeInteger(readOwn(value, "page")) ||
      (readOwn(value, "page") as number) < 1 ||
      !["confirmed", "missing", "unreadable", "conflict"].includes(
        String(readOwn(value, "scaleStatus")),
      ) ||
      !(readOwn(value, "scaleValue") === null ||
        boundedText(readOwn(value, "scaleValue"), 64))
    ) return null;
    const region = readOwn(value, "coordinateRegion");
    if (
      !hasExactKeys(region, ["x", "y", "width", "height"]) ||
      !finiteUnit(readOwn(region, "x")) || !finiteUnit(readOwn(region, "y")) ||
      !finiteUnit(readOwn(region, "width")) ||
      !finiteUnit(readOwn(region, "height")) ||
      (readOwn(region, "width") as number) <= 0 ||
      (readOwn(region, "height") as number) <= 0
    ) return null;
    return Object.freeze({
      kind,
      ...base,
      setName: readOwn(value, "setName") as string,
      sheet: readOwn(value, "sheet") as string,
      page: readOwn(value, "page") as number,
      scaleStatus: readOwn(
        value,
        "scaleStatus",
      ) as DrawingRegionCitation["scaleStatus"],
      scaleValue: readOwn(value, "scaleValue") as string | null,
      coordinateRegion: Object.freeze({
        x: readOwn(region, "x") as number,
        y: readOwn(region, "y") as number,
        width: readOwn(region, "width") as number,
        height: readOwn(region, "height") as number,
      }),
    });
  }
  if (kind === "contract_region") {
    const region = readOwn(value, "textRegion");
    if (
      !hasExactKeys(value, [
        "kind",
        "caseId",
        "documentId",
        "documentVersionId",
        "documentSha256",
        "clause",
        "page",
        "textRegion",
      ]) || !boundedText(readOwn(value, "clause"), 200) ||
      !Number.isSafeInteger(readOwn(value, "page")) ||
      (readOwn(value, "page") as number) < 1 ||
      !hasExactKeys(region, ["start", "end"]) ||
      !Number.isSafeInteger(readOwn(region, "start")) ||
      !Number.isSafeInteger(readOwn(region, "end")) ||
      (readOwn(region, "start") as number) < 0 ||
      (readOwn(region, "end") as number) <= (readOwn(region, "start") as number)
    ) return null;
    return Object.freeze({
      kind,
      ...base,
      clause: readOwn(value, "clause") as string,
      page: readOwn(value, "page") as number,
      textRegion: Object.freeze({
        start: readOwn(region, "start") as number,
        end: readOwn(region, "end") as number,
      }),
    });
  }
  if (kind === "document_manifest_gap") {
    const missingPages = readOwn(value, "missingPages");
    if (
      !hasExactKeys(value, [
        "kind",
        "caseId",
        "documentId",
        "documentVersionId",
        "documentSha256",
        "gapType",
        "missingPages",
      ]) ||
      !["missing_page", "whole_document_unreadable"].includes(
        String(readOwn(value, "gapType")),
      ) || !Array.isArray(missingPages) || missingPages.length < 1 ||
      missingPages.some((page) => !Number.isSafeInteger(page) || page < 1) ||
      new Set(missingPages).size !== missingPages.length
    ) return null;
    return Object.freeze({
      kind,
      ...base,
      gapType: readOwn(
        value,
        "gapType",
      ) as DocumentManifestGapCitation["gapType"],
      missingPages: Object.freeze([...missingPages]),
    });
  }
  return null;
}

function sourceCitationTripleSetsEqual(
  sources: readonly SourceDocumentVersion[],
  citations: readonly AnalysisCitation[],
): boolean {
  const tripleKey = (
    value: SourceDocumentVersion | AnalysisCitation,
  ): string =>
    `${value.documentId}\u0000${value.documentVersionId}\u0000${value.documentSha256}`;
  const sourceKeys = new Set(sources.map(tripleKey));
  const citationKeys = new Set(citations.map(tripleKey));
  return sourceKeys.size === citationKeys.size &&
    [...sourceKeys].every((key) => citationKeys.has(key));
}

function parseUnknown(
  value: unknown,
  context: AnalysisRunContext,
): FindingUnknown | null {
  if (
    !hasExactKeys(value, [
      "code",
      "requiredEvidence",
      "sourceDocumentVersions",
      "citations",
      "nextActor",
    ]) || typeof readOwn(value, "code") !== "string" ||
    !FINDING_CODE.test(readOwn(value, "code") as string) ||
    !boundedText(readOwn(value, "requiredEvidence"), 1_000) ||
    !["owner", "vendor", "drs", "external_professional"].includes(
      String(readOwn(value, "nextActor")),
    )
  ) return null;
  const sourceValues = readOwn(value, "sourceDocumentVersions");
  const citationValues = readOwn(value, "citations");
  if (
    !Array.isArray(sourceValues) || sourceValues.length < 1 ||
    !Array.isArray(citationValues) || citationValues.length < 1
  ) return null;
  const sources = sourceValues.map(sourceVersion);
  const citations = citationValues.map((citation) =>
    parseCitation(citation, context)
  );
  if (
    sources.some((source) => source === null) ||
    citations.some((c) => c === null) ||
    !sourceCitationTripleSetsEqual(
      sources as SourceDocumentVersion[],
      citations as AnalysisCitation[],
    )
  ) {
    return null;
  }
  return Object.freeze({
    code: readOwn(value, "code") as string,
    requiredEvidence: readOwn(value, "requiredEvidence") as string,
    sourceDocumentVersions: Object.freeze(sources as SourceDocumentVersion[]),
    citations: Object.freeze(citations as AnalysisCitation[]),
    nextActor: readOwn(value, "nextActor") as FindingNextActor,
  });
}

function sourceExists(
  source: SourceDocumentVersion,
  context: AnalysisRunContext,
): boolean {
  return context.documents.some((document) =>
    document.documentId === source.documentId &&
    document.documentVersionId === source.documentVersionId &&
    document.sha256 === source.documentSha256 &&
    document.caseId === context.caseId
  );
}

function parseFinding(
  value: unknown,
  context: AnalysisRunContext,
): AnalysisFindingDraft | null {
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "findingId",
      "findingVersion",
      "runId",
      "runKeySha256",
      "caseId",
      "domain",
      "code",
      "classification",
      "severity",
      "statement",
      "rationale",
      "citations",
      "unknowns",
      "sourceDocumentVersions",
      "providerNeutral",
      "humanReviewRequired",
      "formalImpact",
      "lifecycle",
    ]) || readOwn(value, "schemaVersion") !== ANALYSIS_FINDING_DRAFT_SCHEMA ||
    !validUuid(readOwn(value, "findingId")) ||
    !Number.isSafeInteger(readOwn(value, "findingVersion")) ||
    (readOwn(value, "findingVersion") as number) < 1 ||
    readOwn(value, "runId") !== context.runId ||
    readOwn(value, "runKeySha256") !== context.runKeySha256 ||
    readOwn(value, "caseId") !== context.caseId ||
    !["quote", "drawing", "contract"].includes(
      String(readOwn(value, "domain")),
    ) ||
    typeof readOwn(value, "code") !== "string" ||
    !FINDING_CODE.test(readOwn(value, "code") as string) ||
    !["confirmed", "conflict", "unknown", "risk"].includes(
      String(readOwn(value, "classification")),
    ) || !["info", "low", "medium", "high", "critical"].includes(
      String(readOwn(value, "severity")),
    ) || !boundedText(readOwn(value, "statement")) ||
    !boundedText(readOwn(value, "rationale")) ||
    readOwn(value, "providerNeutral") !== true ||
    readOwn(value, "humanReviewRequired") !== true ||
    readOwn(value, "formalImpact") !== "none" ||
    readOwn(value, "lifecycle") !== "current"
  ) return null;
  const citationValues = readOwn(value, "citations");
  const unknownValues = readOwn(value, "unknowns");
  const sourceValues = readOwn(value, "sourceDocumentVersions");
  if (
    !Array.isArray(citationValues) || !Array.isArray(unknownValues) ||
    !Array.isArray(sourceValues) || sourceValues.length < 1 ||
    sourceValues.length > 24
  ) return null;
  const citations = citationValues.map((citation) =>
    parseCitation(citation, context)
  );
  const unknowns = unknownValues.map((unknown) =>
    parseUnknown(unknown, context)
  );
  const sources = sourceValues.map(sourceVersion);
  if (
    citations.some((citation) => citation === null) ||
    unknowns.some((unknown) => unknown === null) ||
    sources.some((source) => source === null) ||
    !(sources as SourceDocumentVersion[]).every((source) =>
      sourceExists(source, context)
    ) ||
    !sourceCitationTripleSetsEqual(
      sources as SourceDocumentVersion[],
      citations as AnalysisCitation[],
    ) ||
    (["high", "critical"].includes(String(readOwn(value, "severity"))) &&
      citations.length < 1) ||
    (readOwn(value, "classification") === "unknown" && unknowns.length < 1)
  ) return null;
  const code = readOwn(value, "code") as string;
  if (
    /(STRUCTURAL|FIRE|CODE|MEP|WATERPROOF|SIGN_OFF)/u.test(code) &&
    !(unknowns as FindingUnknown[]).every((unknown) =>
      unknown.nextActor === "external_professional"
    )
  ) return null;
  return Object.freeze({
    schemaVersion: ANALYSIS_FINDING_DRAFT_SCHEMA,
    findingId: readOwn(value, "findingId") as string,
    findingVersion: readOwn(value, "findingVersion") as number,
    runId: context.runId,
    runKeySha256: context.runKeySha256,
    caseId: context.caseId,
    domain: readOwn(value, "domain") as AnalysisDomain,
    code,
    classification: readOwn(value, "classification") as FindingClassification,
    severity: readOwn(value, "severity") as FindingSeverity,
    statement: readOwn(value, "statement") as string,
    rationale: readOwn(value, "rationale") as string,
    citations: Object.freeze(citations as AnalysisCitation[]),
    unknowns: Object.freeze(unknowns as FindingUnknown[]),
    sourceDocumentVersions: Object.freeze(sources as SourceDocumentVersion[]),
    providerNeutral: true,
    humanReviewRequired: true,
    formalImpact: "none",
    lifecycle: "current",
  });
}

export function validateAnalysisOutput(
  context: AnalysisRunContext,
  value: unknown,
): AnalysisOutput | null {
  if (
    !validUuid(context.runId) || !validSha(context.runKeySha256) ||
    !validUuid(context.caseId) || !Array.isArray(context.documents) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "runId",
      "runKeySha256",
      "caseId",
      "providerNeutral",
      "humanReviewRequired",
      "formalImpact",
      "findings",
    ]) || readOwn(value, "schemaVersion") !== ANALYSIS_OUTPUT_SCHEMA ||
    readOwn(value, "runId") !== context.runId ||
    readOwn(value, "runKeySha256") !== context.runKeySha256 ||
    readOwn(value, "caseId") !== context.caseId ||
    readOwn(value, "providerNeutral") !== true ||
    readOwn(value, "humanReviewRequired") !== true ||
    readOwn(value, "formalImpact") !== "none"
  ) return null;
  const values = readOwn(value, "findings");
  if (!Array.isArray(values) || values.length < 1 || values.length > 200) {
    return null;
  }
  const findings = values.map((finding) => parseFinding(finding, context));
  if (
    findings.some((finding) => finding === null) ||
    new Set(findings.map((finding) => finding?.findingId)).size !==
      findings.length
  ) return null;
  return Object.freeze({
    schemaVersion: ANALYSIS_OUTPUT_SCHEMA,
    runId: context.runId,
    runKeySha256: context.runKeySha256,
    caseId: context.caseId,
    providerNeutral: true,
    humanReviewRequired: true,
    formalImpact: "none",
    findings: Object.freeze(findings as AnalysisFindingDraft[]),
  });
}

export function buildFindingReadModel(
  finding: AnalysisFindingDraft,
  drsReview: Readonly<Record<string, unknown>> | null,
): FindingReadModel {
  return Object.freeze({
    findingSource: "AI_DRAFT",
    reviewState: drsReview ? "DRS_REVIEWED" : "PENDING_DRS_REVIEW",
    finding,
    drsReview,
    partyStatement: null,
    ownerDecision: null,
  });
}
