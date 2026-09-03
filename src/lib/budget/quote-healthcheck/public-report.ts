import type { QuotePdfIntakeResult } from "./pdf/intake.ts";
import { validateQuoteHealthReportV1 } from "./report.ts";
import type {
  BuildResult,
  QuoteFindingCode,
  QuoteHealthFinding,
  QuoteHealthReportV1,
  ValidationIssue,
  ValidationResult,
} from "./types.ts";

export const QUOTE_HEALTH_PUBLIC_REPORT_SCHEMA =
  "laibe.quote-health-public-report.v1" as const;
export const QUOTE_HEALTH_PUBLIC_REPORT_VERSION = "v1" as const;
export const QUOTE_HEALTH_PUBLIC_REPORT_DISCLAIMER =
  "FREE_HEALTHCHECK_NOT_PROFESSIONAL_APPROVAL" as const;
export const QUOTE_HEALTH_PUBLIC_REPORT_MAX_BYTES = 1_048_576;

const INTERNAL_REPORT_SCHEMA = "laibe.quote-health-report.v1" as const;

export type QuoteHealthPublicAnalysisStatus =
  | "complete"
  | "limited"
  | "unsupported"
  | "failed";
export type QuoteHealthPublicCategory =
  | "arithmetic"
  | "completeness"
  | "duplicate"
  | "unit"
  | "scope"
  | "version";
export type QuoteHealthPublicSeverity = "high" | "medium" | "low" | "info";
export type QuoteHealthPublicEvidenceStatus =
  | "observed"
  | "inferred"
  | "unconfirmed"
  | "insufficient_evidence";

export interface QuoteHealthPublicDocument {
  displayName: string;
  mimeType: "application/pdf";
  pageCount: number | null;
}

export interface QuoteHealthPublicSummary {
  headline: string;
  findingCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unconfirmedCount: number;
}

export interface QuoteHealthPublicFinding {
  findingId: string;
  category: QuoteHealthPublicCategory;
  severity: QuoteHealthPublicSeverity;
  title: string;
  description: string;
  evidenceStatus: QuoteHealthPublicEvidenceStatus;
  pageReferences: number[];
  suggestedNextStep: string;
}

export interface QuoteHealthPublicProvenance {
  sourceKind: "internal_report" | "terminal_extraction_outcome";
  sourceSchemaName: typeof INTERNAL_REPORT_SCHEMA | null;
  sourceSchemaVersion: 1 | null;
  sourceReportId: string | null;
  sourceFactsHash: string | null;
  publicFactsHash: string;
}

export interface QuoteHealthPublicReportV1 {
  schemaName: typeof QUOTE_HEALTH_PUBLIC_REPORT_SCHEMA;
  schemaVersion: typeof QUOTE_HEALTH_PUBLIC_REPORT_VERSION;
  artifactId: string;
  generatedAt: string;
  analysisStatus: QuoteHealthPublicAnalysisStatus;
  document: QuoteHealthPublicDocument;
  summary: QuoteHealthPublicSummary;
  findings: QuoteHealthPublicFinding[];
  limitations: string[];
  humanReviewRequired: true;
  professionalReviewRequired: true;
  disclaimerCode: typeof QUOTE_HEALTH_PUBLIC_REPORT_DISCLAIMER;
  provenance: QuoteHealthPublicProvenance;
}

type PublicFactsHashInput =
  & Omit<
    QuoteHealthPublicReportV1,
    "provenance"
  >
  & {
    provenance:
      | QuoteHealthPublicProvenance
      | Omit<QuoteHealthPublicProvenance, "publicFactsHash">;
  };

interface PublicReportBuildInput {
  artifactId: string;
  generatedAt: string;
  document: {
    displayName: string;
    mimeType: "application/pdf";
  };
  source:
    | { kind: "internal_report"; value: unknown }
    | { kind: "terminal_extraction_outcome"; value: unknown };
}

interface FindingProjection {
  category: QuoteHealthPublicCategory;
  severity: QuoteHealthPublicSeverity;
  evidenceStatus: QuoteHealthPublicEvidenceStatus;
  title: string;
  description: string;
  suggestedNextStep: string;
}

const FINDING_PROJECTIONS: Record<QuoteFindingCode, FindingProjection> = {
  MISSING_ITEM_NAME: {
    category: "completeness",
    severity: "high",
    evidenceStatus: "unconfirmed",
    title: "工項名稱待確認",
    description: "這一列未能從文件中確認工項名稱。",
    suggestedNextStep: "請設計師／統包補上名稱，並回到同一版報價核對。",
  },
  MISSING_UNIT: {
    category: "completeness",
    severity: "high",
    evidenceStatus: "unconfirmed",
    title: "計價單位待確認",
    description: "這一列未能從文件中確認計價單位。",
    suggestedNextStep: "請補上單位並確認與數量及單價採同一計價基準。",
  },
  UNKNOWN_QUANTITY: {
    category: "completeness",
    severity: "high",
    evidenceStatus: "unconfirmed",
    title: "數量待確認",
    description: "這一列的數量目前無法從文件確認。",
    suggestedNextStep: "請回到原報價補齊數量或註明計價方式。",
  },
  UNKNOWN_UNIT_PRICE: {
    category: "completeness",
    severity: "high",
    evidenceStatus: "unconfirmed",
    title: "單價待確認",
    description: "這一列的單價目前無法從文件確認。",
    suggestedNextStep: "請回到原報價補齊單價；本結果不判斷價格是否合理。",
  },
  UNKNOWN_MULTIPLIER: {
    category: "completeness",
    severity: "high",
    evidenceStatus: "unconfirmed",
    title: "計價倍數待確認",
    description: "這一列的計價倍數目前無法從文件確認。",
    suggestedNextStep: "請確認是否另有倍數、損耗或換算依據。",
  },
  UNKNOWN_AMOUNT: {
    category: "completeness",
    severity: "high",
    evidenceStatus: "unconfirmed",
    title: "金額待確認",
    description: "這一列的列示金額目前無法從文件確認。",
    suggestedNextStep: "請補齊金額並與數量、單價及倍數一併核對。",
  },
  LINE_AMOUNT_MISMATCH: {
    category: "arithmetic",
    severity: "high",
    evidenceStatus: "observed",
    title: "單列計算不一致",
    description: "依文件列示的數量、單價與倍數重算後，與該列金額不一致。",
    suggestedNextStep: "請專業人員回到原報價確認公式、進位與採用金額。",
  },
  SUBTOTAL_MISMATCH: {
    category: "arithmetic",
    severity: "high",
    evidenceStatus: "observed",
    title: "小計不一致",
    description: "依可讀各列金額加總後，與文件列示小計不一致。",
    suggestedNextStep: "請逐列核對納入範圍、加總與進位方式。",
  },
  TAX_MISMATCH: {
    category: "arithmetic",
    severity: "high",
    evidenceStatus: "observed",
    title: "稅額計算不一致",
    description: "依文件列示小計與稅率重算後，與列示稅額不一致。",
    suggestedNextStep: "請確認稅率、稅基與進位方式。",
  },
  TOTAL_MISMATCH: {
    category: "arithmetic",
    severity: "high",
    evidenceStatus: "observed",
    title: "總額計算不一致",
    description: "依文件列示小計與稅額重算後，與列示總額不一致。",
    suggestedNextStep: "請確認總額公式及採用版本。",
  },
  POSSIBLE_DUPLICATE: {
    category: "duplicate",
    severity: "medium",
    evidenceStatus: "inferred",
    title: "可能有重複列項",
    description: "兩列整理後的內容相同，可能是重複，也可能是刻意分列。",
    suggestedNextStep: "請依位置、範圍與報價說明確認是否應保留兩列。",
  },
  UNIT_CONFLICT: {
    category: "unit",
    severity: "high",
    evidenceStatus: "observed",
    title: "同名工項單位不一致",
    description: "文件中同名工項出現不同計價單位。",
    suggestedNextStep: "請確認是否為不同規格或統一計價基準。",
  },
  AMBIGUOUS_LUMP_SUM: {
    category: "scope",
    severity: "high",
    evidenceStatus: "observed",
    title: "一式計價範圍待確認",
    description: "文件出現「一式」字樣，但實際包含範圍仍需確認。",
    suggestedNextStep: "請把包含、排除與完成標準寫回同一版文件。",
  },
  SITE_DEPENDENT_SCOPE: {
    category: "scope",
    severity: "high",
    evidenceStatus: "observed",
    title: "依現場項目待確認",
    description: "文件出現「依現場」字樣，實際條件與責任仍未由本檢查確認。",
    suggestedNextStep: "請記錄現場確認方式、負責人與變更處理。",
  },
  PROVISIONAL_AMOUNT: {
    category: "scope",
    severity: "high",
    evidenceStatus: "observed",
    title: "暫估金額待確認",
    description: "文件出現「暫估」字樣；這只證明文件有暫估文字。",
    suggestedNextStep: "請確認轉正式金額的依據、時點與核准人。",
  },
  SEPARATE_ESTIMATE: {
    category: "scope",
    severity: "high",
    evidenceStatus: "observed",
    title: "另計項目待確認",
    description: "文件出現「另計」字樣，是否及如何計價仍待確認。",
    suggestedNextStep: "請把另計範圍、觸發條件與確認流程寫入文件。",
  },
  EXCLUDED_SCOPE: {
    category: "scope",
    severity: "high",
    evidenceStatus: "observed",
    title: "排除範圍待確認",
    description: "文件出現「未含」等排除字樣；本檢查不推定實際責任。",
    suggestedNextStep: "請由雙方確認排除項目及由誰負責。",
  },
  OWNER_SUPPLIED: {
    category: "scope",
    severity: "high",
    evidenceStatus: "observed",
    title: "甲供責任待確認",
    description: "文件出現「甲供」字樣；供應、搬運、安裝與瑕疵責任仍待確認。",
    suggestedNextStep: "請把甲供品項與各階段責任寫入同一版文件。",
  },
  OPTIONAL_ITEM: {
    category: "scope",
    severity: "high",
    evidenceStatus: "observed",
    title: "選配項目待決定",
    description: "文件出現「選配」字樣；本檢查不把它視為已包含或已採用。",
    suggestedNextStep: "請明確記錄是否採用、金額與確認版本。",
  },
  DOCUMENT_VERSION_SUPERSEDED: {
    category: "version",
    severity: "high",
    evidenceStatus: "observed",
    title: "這是舊版文件結果",
    description: "目前已有較新的文件版本，這份結果不能作為新的決策依據。",
    suggestedNextStep: "請以最新版本重新檢查；不得沿用舊結果或舊版紀錄。",
  },
};

const INPUT_KEYS = ["artifactId", "generatedAt", "document", "source"];
const DOCUMENT_INPUT_KEYS = ["displayName", "mimeType"];
const SOURCE_KEYS = ["kind", "value"];
const REPORT_KEYS = [
  "schemaName",
  "schemaVersion",
  "artifactId",
  "generatedAt",
  "analysisStatus",
  "document",
  "summary",
  "findings",
  "limitations",
  "humanReviewRequired",
  "professionalReviewRequired",
  "disclaimerCode",
  "provenance",
];
const DOCUMENT_KEYS = ["displayName", "mimeType", "pageCount"];
const SUMMARY_KEYS = [
  "headline",
  "findingCount",
  "highCount",
  "mediumCount",
  "lowCount",
  "unconfirmedCount",
];
const FINDING_KEYS = [
  "findingId",
  "category",
  "severity",
  "title",
  "description",
  "evidenceStatus",
  "pageReferences",
  "suggestedNextStep",
];
const PROVENANCE_KEYS = [
  "sourceKind",
  "sourceSchemaName",
  "sourceSchemaVersion",
  "sourceReportId",
  "sourceFactsHash",
  "publicFactsHash",
];

const identityPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const sha256Pattern = /^[a-f\d]{64}$/;
const dateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):(\d{2}))$/;
const unsafeDisplayPattern = /[<>`\p{C}]/u;
const pathLikeDisplayNamePattern = /^[A-Za-z][A-Za-z\d+.-]*:/;

const addIssue = (
  issues: ValidationIssue[],
  path: string,
  code: string,
  message: string,
): void => {
  issues.push({ path, code, message });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireClosedKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: ValidationIssue[],
): void => {
  const keys = Reflect.ownKeys(value);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (typeof key !== "string" || !allowed.includes(key)) {
      addIssue(
        issues,
        path ? `${path}.${String(key)}` : String(key),
        "UNKNOWN_KEY",
        "Only the closed public-report contract is accepted.",
      );
    }
  }
  for (let index = 0; index < allowed.length; index += 1) {
    const key = allowed[index];
    if (!Object.hasOwn(value, key)) {
      addIssue(
        issues,
        path ? `${path}.${key}` : key,
        "REQUIRED_KEY_MISSING",
        "A required public-report field is missing.",
      );
    }
  }
};

const isDisplayText = (value: unknown, maxLength = 1200): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength &&
  value === value.trim() && !unsafeDisplayPattern.test(value);

const isDisplayName = (value: unknown): value is string =>
  isDisplayText(value, 256) && !/[\\/]/.test(value) &&
  !pathLikeDisplayNamePattern.test(value);

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const isRfc3339DateTime = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = dateTimePattern.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (
    year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59 ||
    second > 59
  ) {
    return false;
  }
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (day < 1 || day > daysInMonth[month - 1]) return false;
  if (match[8] === "Z") return true;
  const offsetHour = Number(match[10]);
  const offsetMinute = Number(match[11]);
  if (offsetHour > 14 || offsetMinute > 59) return false;
  if (offsetHour === 14 && offsetMinute !== 0) return false;
  return !(match[9] === "-" && offsetHour === 0 && offsetMinute === 0);
};

const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;

const isNonnegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0;

const isAnalysisStatus = (
  value: unknown,
): value is QuoteHealthPublicAnalysisStatus =>
  value === "complete" || value === "limited" || value === "unsupported" ||
  value === "failed";

const rejectionCodes = new Set([
  "FILE_TOO_LARGE",
  "DOCUMENT_REFERENCE_INVALID",
  "DOCUMENT_HASH_MISMATCH",
  "CORRUPT_PDF",
  "ENCRYPTED_PDF",
  "UNSUPPORTED_ACTIVE_CONTENT",
  "UNSUPPORTED_COMPRESSED_CONTENT",
  "PAGE_LIMIT_EXCEEDED",
]);
const limitationCodes = new Set([
  "OCR_NOT_PERFORMED",
  "NO_STRUCTURED_QUOTE_ROWS",
  "MULTI_PAGE_TEXT_LOCATION_UNCERTAIN",
  "INVALID_TEXT_ENCODING",
  "BASELINE_INVALID",
]);

const validateTerminalProvenance = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  const allowed = [
    "sourceDocumentVersionId",
    "sourceDocumentSha256",
    "page",
    "textOffset",
    "extractionMethod",
  ];
  if (
    Reflect.ownKeys(value).length !== allowed.length ||
    !allowed.every((key) => Object.hasOwn(value, key))
  ) return false;
  return typeof value.sourceDocumentVersionId === "string" &&
    value.sourceDocumentVersionId.length > 0 &&
    typeof value.sourceDocumentSha256 === "string" &&
    sha256Pattern.test(value.sourceDocumentSha256) &&
    (value.page === null || isPositiveInteger(value.page)) &&
    isNonnegativeInteger(value.textOffset) &&
    value.extractionMethod === "UNCOMPRESSED_LITERAL_TEXT";
};

const validateTerminalRow = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  const allowed = [
    "itemName",
    "unit",
    "quantity",
    "unitPrice",
    "declaredAmount",
    "provenance",
  ];
  if (
    Reflect.ownKeys(value).length !== allowed.length ||
    !allowed.every((key) => Object.hasOwn(value, key))
  ) return false;
  return typeof value.itemName === "string" &&
    typeof value.unit === "string" && typeof value.quantity === "string" &&
    typeof value.unitPrice === "string" &&
    typeof value.declaredAmount === "string" &&
    validateTerminalProvenance(value.provenance);
};

const validateTerminalComparisonFinding = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  const allowed = ["code", "baselineId", "itemName", "rowProvenance"];
  if (
    Reflect.ownKeys(value).length !== allowed.length ||
    !allowed.every((key) => Object.hasOwn(value, key))
  ) return false;
  return (value.code === "BASELINE_ITEM_MISSING" ||
    value.code === "QUOTED_ITEM_NOT_IN_BASELINE") &&
    typeof value.baselineId === "string" && value.baselineId.length > 0 &&
    typeof value.itemName === "string" && value.itemName.length > 0 &&
    (value.rowProvenance === null ||
      validateTerminalProvenance(value.rowProvenance));
};

const validateTerminalOutcome = (
  value: unknown,
  issues: ValidationIssue[],
): QuotePdfIntakeResult | null => {
  if (!isRecord(value) || typeof value.accepted !== "boolean") {
    addIssue(
      issues,
      "source.value",
      "TERMINAL_OUTCOME_INVALID",
      "A validated terminal extraction outcome is required.",
    );
    return null;
  }
  if (value.accepted === false) {
    requireClosedKeys(value, ["accepted", "rejection"], "source.value", issues);
    if (!isRecord(value.rejection)) {
      addIssue(
        issues,
        "source.value.rejection",
        "TERMINAL_REJECTION_INVALID",
        "A closed terminal rejection is required.",
      );
      return null;
    }
    requireClosedKeys(
      value.rejection,
      ["code", "message"],
      "source.value.rejection",
      issues,
    );
    if (
      !rejectionCodes.has(String(value.rejection.code)) ||
      typeof value.rejection.message !== "string" ||
      value.rejection.message.length === 0
    ) {
      addIssue(
        issues,
        "source.value.rejection",
        "TERMINAL_REJECTION_INVALID",
        "The terminal rejection code and message must be valid.",
      );
    }
    return issues.length === 0
      ? value as unknown as QuotePdfIntakeResult
      : null;
  }

  requireClosedKeys(
    value,
    ["accepted", "inspection", "facts", "limitations", "comparison"],
    "source.value",
    issues,
  );
  if (!isRecord(value.inspection)) {
    addIssue(
      issues,
      "source.value.inspection",
      "INSPECTION_INVALID",
      "Inspection is required.",
    );
  } else {
    requireClosedKeys(
      value.inspection,
      ["byteLength", "pageCount", "readability"],
      "source.value.inspection",
      issues,
    );
    if (
      !isNonnegativeInteger(value.inspection.byteLength) ||
      !isPositiveInteger(value.inspection.pageCount) ||
      !["TEXT_LAYER", "IMAGE_ONLY", "NO_EXTRACTABLE_TEXT"].includes(
        String(value.inspection.readability),
      )
    ) {
      addIssue(
        issues,
        "source.value.inspection",
        "INSPECTION_INVALID",
        "Inspection facts are invalid.",
      );
    }
  }
  if (!isRecord(value.facts)) {
    addIssue(
      issues,
      "source.value.facts",
      "FACTS_INVALID",
      "Terminal facts are required.",
    );
  } else {
    requireClosedKeys(value.facts, ["rows"], "source.value.facts", issues);
    if (
      !Array.isArray(value.facts.rows) ||
      !value.facts.rows.every(validateTerminalRow)
    ) {
      addIssue(
        issues,
        "source.value.facts.rows",
        "FACTS_INVALID",
        "Terminal rows are invalid.",
      );
    }
  }
  if (
    !Array.isArray(value.limitations) ||
    !value.limitations.every((item) => {
      if (!isRecord(item)) return false;
      const keys = Reflect.ownKeys(item);
      return keys.length === 2 && Object.hasOwn(item, "code") &&
        Object.hasOwn(item, "message") &&
        limitationCodes.has(String(item.code)) &&
        typeof item.message === "string" && item.message.length > 0;
    })
  ) {
    addIssue(
      issues,
      "source.value.limitations",
      "LIMITATIONS_INVALID",
      "Terminal limitations are invalid.",
    );
  }
  if (!isRecord(value.comparison)) {
    addIssue(
      issues,
      "source.value.comparison",
      "COMPARISON_INVALID",
      "Terminal comparison is required.",
    );
  } else {
    requireClosedKeys(
      value.comparison,
      ["status", "findings"],
      "source.value.comparison",
      issues,
    );
    if (
      !["EVALUATED", "NOT_EVALUATED"].includes(
        String(value.comparison.status),
      ) ||
      !Array.isArray(value.comparison.findings) ||
      !value.comparison.findings.every(validateTerminalComparisonFinding)
    ) {
      addIssue(
        issues,
        "source.value.comparison",
        "COMPARISON_INVALID",
        "Terminal comparison is invalid.",
      );
    }
  }
  return issues.length === 0 ? value as unknown as QuotePdfIntakeResult : null;
};

const appendField = (preimage: string, name: string, value: unknown): string =>
  `${preimage}${name}:${JSON.stringify(value)}\n`;

const publicFactsPreimage = (
  report: PublicFactsHashInput,
): string => {
  let value = "laibe.quote-health-public-report.v1|public-facts|v1\n";
  value = appendField(value, "schemaName", report.schemaName);
  value = appendField(value, "schemaVersion", report.schemaVersion);
  value = appendField(value, "artifactId", report.artifactId);
  value = appendField(value, "analysisStatus", report.analysisStatus);
  value = appendField(
    value,
    "document.displayName",
    report.document.displayName,
  );
  value = appendField(value, "document.mimeType", report.document.mimeType);
  value = appendField(value, "document.pageCount", report.document.pageCount);
  value = appendField(value, "summary.headline", report.summary.headline);
  value = appendField(
    value,
    "summary.findingCount",
    report.summary.findingCount,
  );
  value = appendField(value, "summary.highCount", report.summary.highCount);
  value = appendField(value, "summary.mediumCount", report.summary.mediumCount);
  value = appendField(value, "summary.lowCount", report.summary.lowCount);
  value = appendField(
    value,
    "summary.unconfirmedCount",
    report.summary.unconfirmedCount,
  );
  for (let index = 0; index < report.findings.length; index += 1) {
    const finding = report.findings[index];
    const prefix = `findings.${index}`;
    value = appendField(value, `${prefix}.findingId`, finding.findingId);
    value = appendField(value, `${prefix}.category`, finding.category);
    value = appendField(value, `${prefix}.severity`, finding.severity);
    value = appendField(value, `${prefix}.title`, finding.title);
    value = appendField(value, `${prefix}.description`, finding.description);
    value = appendField(
      value,
      `${prefix}.evidenceStatus`,
      finding.evidenceStatus,
    );
    for (
      let pageIndex = 0;
      pageIndex < finding.pageReferences.length;
      pageIndex += 1
    ) {
      value = appendField(
        value,
        `${prefix}.pageReferences.${pageIndex}`,
        finding.pageReferences[pageIndex],
      );
    }
    value = appendField(
      value,
      `${prefix}.pageReferences.length`,
      finding.pageReferences.length,
    );
    value = appendField(
      value,
      `${prefix}.suggestedNextStep`,
      finding.suggestedNextStep,
    );
  }
  value = appendField(value, "findings.length", report.findings.length);
  for (let index = 0; index < report.limitations.length; index += 1) {
    value = appendField(
      value,
      `limitations.${index}`,
      report.limitations[index],
    );
  }
  value = appendField(value, "limitations.length", report.limitations.length);
  value = appendField(value, "humanReviewRequired", report.humanReviewRequired);
  value = appendField(
    value,
    "professionalReviewRequired",
    report.professionalReviewRequired,
  );
  value = appendField(value, "disclaimerCode", report.disclaimerCode);
  value = appendField(
    value,
    "provenance.sourceKind",
    report.provenance.sourceKind,
  );
  value = appendField(
    value,
    "provenance.sourceSchemaName",
    report.provenance.sourceSchemaName,
  );
  value = appendField(
    value,
    "provenance.sourceSchemaVersion",
    report.provenance.sourceSchemaVersion,
  );
  value = appendField(
    value,
    "provenance.sourceReportId",
    report.provenance.sourceReportId,
  );
  value = appendField(
    value,
    "provenance.sourceFactsHash",
    report.provenance.sourceFactsHash,
  );
  return value;
};

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  const bytes = new Uint8Array(digest);
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    result += bytes[index].toString(16).padStart(2, "0");
  }
  return result;
};

const sortedPageReferences = (
  finding: QuoteHealthFinding,
  sourceDocumentVersionId: string,
): number[] => {
  const pages: number[] = [];
  for (let index = 0; index < finding.evidence.length; index += 1) {
    const evidence = finding.evidence[index];
    if (
      evidence.kind !== "text_region" ||
      evidence.sourceDocumentVersionId !== sourceDocumentVersionId ||
      !isPositiveInteger(evidence.page) || pages.includes(evidence.page)
    ) continue;
    let insertion = 0;
    while (insertion < pages.length && pages[insertion] < evidence.page) {
      insertion += 1;
    }
    pages.splice(insertion, 0, evidence.page);
  }
  return pages;
};

const projectFinding = (
  finding: QuoteHealthFinding,
  sourceDocumentVersionId: string,
): QuoteHealthPublicFinding => {
  const projection = FINDING_PROJECTIONS[finding.code];
  return {
    findingId: finding.findingId,
    category: projection.category,
    severity: projection.severity,
    title: projection.title,
    description: projection.description,
    evidenceStatus: projection.evidenceStatus,
    pageReferences: sortedPageReferences(finding, sourceDocumentVersionId),
    suggestedNextStep: projection.suggestedNextStep,
  };
};

const pushUnique = (values: string[], value: string): void => {
  if (!values.includes(value)) values.push(value);
};

const internalLimitations = (report: QuoteHealthReportV1): string[] => {
  const limitations: string[] = [];
  if (report.lifecycleStatus === "STALE") {
    pushUnique(
      limitations,
      "這份分析所依據的文件已有更新版本，舊結果不得作為目前決策依據。",
    );
  }
  const sections = report.sections;
  if (
    sections.scopeComparison.status === "NOT_EVALUATED" ||
    sections.planComparison.status === "NOT_EVALUATED" ||
    sections.priceEvidenceComparison.status === "NOT_EVALUATED"
  ) {
    pushUnique(
      limitations,
      "本次免費健檢只整理文件內可確認的內容，未完成需求、圖面與價格依據的全面交叉比對。",
    );
  }
  pushUnique(
    limitations,
    "本結果不判斷價格是否合理，也不代表專業審查或核准。",
  );
  return limitations;
};

const terminalLimitationText: Record<string, string> = {
  OCR_NOT_PERFORMED: "本次未進行影像文字辨識。",
  NO_STRUCTURED_QUOTE_ROWS: "目前未能整理出可供檢查的報價列。",
  MULTI_PAGE_TEXT_LOCATION_UNCERTAIN: "多頁文字的位置仍需人工確認。",
  INVALID_TEXT_ENCODING: "部分文字編碼無法可靠判讀。",
  BASELINE_INVALID: "比較基準無法確認，相關差異未評估。",
};

const terminalStatusAndLimitations = (
  outcome: QuotePdfIntakeResult,
): {
  status: Exclude<QuoteHealthPublicAnalysisStatus, "complete">;
  limitations: string[];
  pageCount: number | null;
} => {
  if (!outcome.accepted) {
    if (outcome.rejection.code === "CORRUPT_PDF") {
      return {
        status: "limited",
        limitations: ["PDF 結構無法完整解析，本次只能提供有限結果。"],
        pageCount: null,
      };
    }
    if (
      outcome.rejection.code === "DOCUMENT_REFERENCE_INVALID" ||
      outcome.rejection.code === "DOCUMENT_HASH_MISMATCH"
    ) {
      return {
        status: "failed",
        limitations: ["文件驗證未通過，請重新選擇原始 PDF 後再試。"],
        pageCount: null,
      };
    }
    return {
      status: "unsupported",
      limitations: ["這份 PDF 的格式或保護方式目前不在免費健檢支援範圍。"],
      pageCount: null,
    };
  }
  if (
    outcome.inspection.readability === "IMAGE_ONLY" ||
    outcome.inspection.readability === "NO_EXTRACTABLE_TEXT"
  ) {
    return {
      status: "unsupported",
      limitations: [
        "這份 PDF 目前只有影像或無可讀文字，本次免費健檢尚不支援影像文字辨識。",
      ],
      pageCount: outcome.inspection.pageCount,
    };
  }
  const limitations = ["本次僅確認 PDF 可讀性，尚未完成完整報價健檢。"];
  for (let index = 0; index < outcome.limitations.length; index += 1) {
    const text = terminalLimitationText[outcome.limitations[index].code];
    if (text) pushUnique(limitations, text);
  }
  return {
    status: "limited",
    limitations,
    pageCount: outcome.inspection.pageCount,
  };
};

const headlineFor = (
  status: QuoteHealthPublicAnalysisStatus,
  findingCount: number,
): string => {
  if (status === "complete") {
    return findingCount === 0
      ? "本次免費健檢未發現需立即確認的報價項目。"
      : `本次免費健檢發現 ${findingCount} 項待確認內容。`;
  }
  if (status === "limited") {
    return "本次僅完成部分檢查，請依限制說明進一步確認。";
  }
  if (status === "unsupported") {
    return "目前無法分析這份 PDF，請依限制說明調整文件。";
  }
  return "本次分析未完成，請重新確認文件後再試。";
};

const summarize = (
  status: QuoteHealthPublicAnalysisStatus,
  findings: QuoteHealthPublicFinding[],
): QuoteHealthPublicSummary => {
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let unconfirmedCount = 0;
  for (let index = 0; index < findings.length; index += 1) {
    const finding = findings[index];
    if (finding.severity === "high") highCount += 1;
    if (finding.severity === "medium") mediumCount += 1;
    if (finding.severity === "low") lowCount += 1;
    if (finding.evidenceStatus !== "observed") unconfirmedCount += 1;
  }
  return {
    headline: headlineFor(status, findings.length),
    findingCount: findings.length,
    highCount,
    mediumCount,
    lowCount,
    unconfirmedCount,
  };
};

const parseBuildInput = (
  value: unknown,
  issues: ValidationIssue[],
): PublicReportBuildInput | null => {
  if (!isRecord(value)) {
    addIssue(
      issues,
      "",
      "INPUT_INVALID",
      "Public report input must be a closed object.",
    );
    return null;
  }
  requireClosedKeys(value, INPUT_KEYS, "", issues);
  if (!identityPattern.test(String(value.artifactId ?? ""))) {
    addIssue(
      issues,
      "artifactId",
      "ARTIFACT_ID_INVALID",
      "A stable artifact identity is required.",
    );
  }
  if (
    !isRfc3339DateTime(value.generatedAt)
  ) {
    addIssue(
      issues,
      "generatedAt",
      "GENERATED_AT_INVALID",
      "A valid generatedAt timestamp is required.",
    );
  }
  if (!isRecord(value.document)) {
    addIssue(
      issues,
      "document",
      "DOCUMENT_INVALID",
      "A closed public document descriptor is required.",
    );
  } else {
    requireClosedKeys(value.document, DOCUMENT_INPUT_KEYS, "document", issues);
    if (!isDisplayName(value.document.displayName)) {
      addIssue(
        issues,
        "document.displayName",
        "DISPLAY_NAME_INVALID",
        "A safe PDF display name is required.",
      );
    }
    if (value.document.mimeType !== "application/pdf") {
      addIssue(
        issues,
        "document.mimeType",
        "MIME_TYPE_INVALID",
        "Only application/pdf is accepted.",
      );
    }
  }
  if (!isRecord(value.source)) {
    addIssue(
      issues,
      "source",
      "SOURCE_INVALID",
      "Exactly one validated source is required.",
    );
  } else {
    requireClosedKeys(value.source, SOURCE_KEYS, "source", issues);
    if (
      value.source.kind !== "internal_report" &&
      value.source.kind !== "terminal_extraction_outcome"
    ) {
      addIssue(
        issues,
        "source.kind",
        "SOURCE_KIND_INVALID",
        "The public source kind is invalid.",
      );
    }
  }
  return issues.length === 0
    ? value as unknown as PublicReportBuildInput
    : null;
};

export const buildQuoteHealthPublicReportV1 = async (
  input: unknown,
): Promise<BuildResult<QuoteHealthPublicReportV1>> => {
  const issues: ValidationIssue[] = [];
  const parsed = parseBuildInput(input, issues);
  if (!parsed) return { ok: false, issues };

  let analysisStatus: QuoteHealthPublicAnalysisStatus;
  let pageCount: number | null;
  let findings: QuoteHealthPublicFinding[];
  let limitations: string[];
  let provenanceWithoutPublicHash: Omit<
    QuoteHealthPublicProvenance,
    "publicFactsHash"
  >;

  if (parsed.source.kind === "internal_report") {
    const validation = await validateQuoteHealthReportV1(parsed.source.value);
    if (!validation.valid) {
      return {
        ok: false,
        issues: validation.issues.map((issue) => ({
          path: issue.path ? `source.value.${issue.path}` : "source.value",
          code: issue.code,
          message: issue.message,
        })),
      };
    }
    const report = validation.value;
    analysisStatus = report.lifecycleStatus === "CURRENT" &&
        report.overallStatus === "COMPLETE"
      ? "complete"
      : "limited";
    pageCount = null;
    const sourceFindings = report.lifecycleStatus === "STALE"
      ? report.findings.filter((finding) =>
        finding.code === "DOCUMENT_VERSION_SUPERSEDED"
      )
      : report.findings;
    findings = sourceFindings.map((finding) =>
      projectFinding(finding, report.sourceDocumentVersionId)
    );
    limitations = internalLimitations(report);
    provenanceWithoutPublicHash = {
      sourceKind: "internal_report",
      sourceSchemaName: INTERNAL_REPORT_SCHEMA,
      sourceSchemaVersion: 1,
      sourceReportId: report.packetId,
      sourceFactsHash: report.factsHash,
    };
  } else {
    const outcome = validateTerminalOutcome(parsed.source.value, issues);
    if (!outcome) return { ok: false, issues };
    const terminal = terminalStatusAndLimitations(outcome);
    analysisStatus = terminal.status;
    pageCount = terminal.pageCount;
    findings = [];
    limitations = terminal.limitations;
    provenanceWithoutPublicHash = {
      sourceKind: "terminal_extraction_outcome",
      sourceSchemaName: null,
      sourceSchemaVersion: null,
      sourceReportId: null,
      sourceFactsHash: null,
    };
  }

  const reportWithoutPublicHash = {
    schemaName: QUOTE_HEALTH_PUBLIC_REPORT_SCHEMA,
    schemaVersion: QUOTE_HEALTH_PUBLIC_REPORT_VERSION,
    artifactId: parsed.artifactId,
    generatedAt: parsed.generatedAt,
    analysisStatus,
    document: {
      displayName: parsed.document.displayName,
      mimeType: "application/pdf" as const,
      pageCount,
    },
    summary: summarize(analysisStatus, findings),
    findings,
    limitations,
    humanReviewRequired: true as const,
    professionalReviewRequired: true as const,
    disclaimerCode: QUOTE_HEALTH_PUBLIC_REPORT_DISCLAIMER,
    provenance: provenanceWithoutPublicHash,
  };
  const publicFactsHash = await sha256(
    publicFactsPreimage(reportWithoutPublicHash),
  );
  const report: QuoteHealthPublicReportV1 = {
    ...reportWithoutPublicHash,
    provenance: { ...provenanceWithoutPublicHash, publicFactsHash },
  };
  const validation = await validateQuoteHealthPublicReportV1(report);
  return validation.valid
    ? { ok: true, value: report }
    : { ok: false, issues: validation.issues };
};

const categoryValues = new Set([
  "arithmetic",
  "completeness",
  "duplicate",
  "unit",
  "scope",
  "version",
]);
const severityValues = new Set(["high", "medium", "low", "info"]);
const evidenceStatusValues = new Set([
  "observed",
  "inferred",
  "unconfirmed",
  "insufficient_evidence",
]);

export const validateQuoteHealthPublicReportV1 = async (
  value: unknown,
): Promise<ValidationResult<QuoteHealthPublicReportV1>> => {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{
        path: "",
        code: "PUBLIC_REPORT_INVALID",
        message: "Public report must be a closed object.",
      }],
    };
  }
  requireClosedKeys(value, REPORT_KEYS, "", issues);
  if (value.schemaName !== QUOTE_HEALTH_PUBLIC_REPORT_SCHEMA) {
    addIssue(
      issues,
      "schemaName",
      "CONSTANT_MISMATCH",
      "Public schemaName is invalid.",
    );
  }
  if (value.schemaVersion !== QUOTE_HEALTH_PUBLIC_REPORT_VERSION) {
    addIssue(
      issues,
      "schemaVersion",
      "CONSTANT_MISMATCH",
      "Public schemaVersion is invalid.",
    );
  }
  if (!identityPattern.test(String(value.artifactId ?? ""))) {
    addIssue(
      issues,
      "artifactId",
      "ARTIFACT_ID_INVALID",
      "Public artifactId is invalid.",
    );
  }
  if (
    !isRfc3339DateTime(value.generatedAt)
  ) {
    addIssue(
      issues,
      "generatedAt",
      "GENERATED_AT_INVALID",
      "Public generatedAt is invalid.",
    );
  }
  if (!isAnalysisStatus(value.analysisStatus)) {
    addIssue(
      issues,
      "analysisStatus",
      "ANALYSIS_STATUS_INVALID",
      "Public analysisStatus is invalid.",
    );
  }
  if (value.humanReviewRequired !== true) {
    addIssue(
      issues,
      "humanReviewRequired",
      "CONSTANT_MISMATCH",
      "Human review is always required.",
    );
  }
  if (value.professionalReviewRequired !== true) {
    addIssue(
      issues,
      "professionalReviewRequired",
      "CONSTANT_MISMATCH",
      "Professional review is always required.",
    );
  }
  if (value.disclaimerCode !== QUOTE_HEALTH_PUBLIC_REPORT_DISCLAIMER) {
    addIssue(
      issues,
      "disclaimerCode",
      "CONSTANT_MISMATCH",
      "Public disclaimerCode is invalid.",
    );
  }

  if (!isRecord(value.document)) {
    addIssue(
      issues,
      "document",
      "DOCUMENT_INVALID",
      "Public document is invalid.",
    );
  } else {
    requireClosedKeys(value.document, DOCUMENT_KEYS, "document", issues);
    if (!isDisplayName(value.document.displayName)) {
      addIssue(
        issues,
        "document.displayName",
        "DISPLAY_NAME_INVALID",
        "Public displayName is invalid.",
      );
    }
    if (value.document.mimeType !== "application/pdf") {
      addIssue(
        issues,
        "document.mimeType",
        "MIME_TYPE_INVALID",
        "Public mimeType is invalid.",
      );
    }
    if (
      value.document.pageCount !== null &&
      !isPositiveInteger(value.document.pageCount)
    ) {
      addIssue(
        issues,
        "document.pageCount",
        "PAGE_COUNT_INVALID",
        "Public pageCount is invalid.",
      );
    }
  }

  const publicFindings: QuoteHealthPublicFinding[] = [];
  if (!Array.isArray(value.findings) || value.findings.length > 256) {
    addIssue(
      issues,
      "findings",
      "FINDINGS_INVALID",
      "Public findings must be a bounded array.",
    );
  } else {
    for (let index = 0; index < value.findings.length; index += 1) {
      const item = value.findings[index];
      const path = `findings[${index}]`;
      if (!isRecord(item)) {
        addIssue(
          issues,
          path,
          "FINDING_INVALID",
          "Public finding must be a closed object.",
        );
        continue;
      }
      const issueStart = issues.length;
      requireClosedKeys(item, FINDING_KEYS, path, issues);
      if (!identityPattern.test(String(item.findingId ?? ""))) {
        addIssue(
          issues,
          `${path}.findingId`,
          "FINDING_ID_INVALID",
          "Public findingId is invalid.",
        );
      }
      if (!categoryValues.has(String(item.category))) {
        addIssue(
          issues,
          `${path}.category`,
          "CATEGORY_INVALID",
          "Public finding category is invalid.",
        );
      }
      if (!severityValues.has(String(item.severity))) {
        addIssue(
          issues,
          `${path}.severity`,
          "SEVERITY_INVALID",
          "Public finding severity is invalid.",
        );
      }
      if (!evidenceStatusValues.has(String(item.evidenceStatus))) {
        addIssue(
          issues,
          `${path}.evidenceStatus`,
          "EVIDENCE_STATUS_INVALID",
          "Public evidenceStatus is invalid.",
        );
      }
      for (const key of ["title", "description", "suggestedNextStep"]) {
        if (!isDisplayText(item[key])) {
          addIssue(
            issues,
            `${path}.${key}`,
            "DISPLAY_TEXT_INVALID",
            "Public finding text is invalid.",
          );
        }
      }
      if (
        !Array.isArray(item.pageReferences) || item.pageReferences.length > 100
      ) {
        addIssue(
          issues,
          `${path}.pageReferences`,
          "PAGE_REFERENCES_INVALID",
          "Page references must be a bounded array.",
        );
      } else {
        let previous = 0;
        for (
          let pageIndex = 0;
          pageIndex < item.pageReferences.length;
          pageIndex += 1
        ) {
          const page = item.pageReferences[pageIndex];
          if (!isPositiveInteger(page) || page <= previous) {
            addIssue(
              issues,
              `${path}.pageReferences[${pageIndex}]`,
              "PAGE_REFERENCES_INVALID",
              "Page references must be unique ascending positive integers.",
            );
          }
          previous = Number(page);
        }
      }
      if (issues.length === issueStart) {
        publicFindings.push(item as unknown as QuoteHealthPublicFinding);
      }
    }
  }

  const publicLimitations: string[] = [];
  if (!Array.isArray(value.limitations) || value.limitations.length > 128) {
    addIssue(
      issues,
      "limitations",
      "LIMITATIONS_INVALID",
      "Public limitations must be a bounded array.",
    );
  } else {
    for (let index = 0; index < value.limitations.length; index += 1) {
      const item = value.limitations[index];
      if (!isDisplayText(item) || publicLimitations.includes(String(item))) {
        addIssue(
          issues,
          `limitations[${index}]`,
          "LIMITATIONS_INVALID",
          "Limitations must be unique display-safe text.",
        );
      } else publicLimitations.push(item);
    }
  }

  const expectedSummary = isAnalysisStatus(value.analysisStatus)
    ? summarize(value.analysisStatus, publicFindings)
    : null;
  if (!isRecord(value.summary)) {
    addIssue(
      issues,
      "summary",
      "SUMMARY_INVALID",
      "Public summary is invalid.",
    );
  } else {
    requireClosedKeys(value.summary, SUMMARY_KEYS, "summary", issues);
    if (!isDisplayText(value.summary.headline)) {
      addIssue(
        issues,
        "summary.headline",
        "DISPLAY_TEXT_INVALID",
        "Public headline is invalid.",
      );
    }
    for (const key of SUMMARY_KEYS.slice(1)) {
      if (!isNonnegativeInteger(value.summary[key])) {
        addIssue(
          issues,
          `summary.${key}`,
          "SUMMARY_COUNT_INVALID",
          "Public summary count is invalid.",
        );
      }
    }
    if (expectedSummary) {
      for (const key of SUMMARY_KEYS) {
        if (
          value.summary[key] !==
            expectedSummary[key as keyof QuoteHealthPublicSummary]
        ) {
          addIssue(
            issues,
            `summary.${key}`,
            "SUMMARY_MISMATCH",
            "Public summary must match projected findings and status.",
          );
        }
      }
    }
  }

  if (
    value.analysisStatus !== "complete" && publicLimitations.length === 0
  ) {
    addIssue(
      issues,
      "limitations",
      "LIMITATION_REQUIRED",
      "Every non-complete artifact requires a public limitation.",
    );
  }
  if (
    (value.analysisStatus === "unsupported" ||
      value.analysisStatus === "failed") && publicFindings.length !== 0
  ) {
    addIssue(
      issues,
      "findings",
      "TERMINAL_STATUS_CONTENT_INVALID",
      "Unsupported and failed artifacts cannot carry findings.",
    );
  }

  if (!isRecord(value.provenance)) {
    addIssue(
      issues,
      "provenance",
      "PROVENANCE_INVALID",
      "Public provenance is invalid.",
    );
  } else {
    requireClosedKeys(value.provenance, PROVENANCE_KEYS, "provenance", issues);
    if (value.provenance.sourceKind === "internal_report") {
      if (
        value.provenance.sourceSchemaName !== INTERNAL_REPORT_SCHEMA ||
        value.provenance.sourceSchemaVersion !== 1 ||
        !identityPattern.test(String(value.provenance.sourceReportId ?? "")) ||
        typeof value.provenance.sourceFactsHash !== "string" ||
        !sha256Pattern.test(value.provenance.sourceFactsHash)
      ) {
        addIssue(
          issues,
          "provenance",
          "PROVENANCE_INVALID",
          "Internal report lineage is invalid.",
        );
      }
    } else if (value.provenance.sourceKind === "terminal_extraction_outcome") {
      if (
        value.provenance.sourceSchemaName !== null ||
        value.provenance.sourceSchemaVersion !== null ||
        value.provenance.sourceReportId !== null ||
        value.provenance.sourceFactsHash !== null
      ) {
        addIssue(
          issues,
          "provenance",
          "PROVENANCE_INVALID",
          "Terminal outcome lineage is invalid.",
        );
      }
      if (value.analysisStatus === "complete") {
        addIssue(
          issues,
          "analysisStatus",
          "SOURCE_STATUS_MISMATCH",
          "Only a validated internal report can support complete status.",
        );
      }
      if (publicFindings.length !== 0 || publicLimitations.length === 0) {
        addIssue(
          issues,
          "findings",
          "TERMINAL_SOURCE_CONTENT_INVALID",
          "A terminal extraction outcome cannot create findings and requires a limitation.",
        );
      }
    } else {
      addIssue(
        issues,
        "provenance.sourceKind",
        "SOURCE_KIND_INVALID",
        "Public sourceKind is invalid.",
      );
    }
    if (
      value.analysisStatus === "complete" &&
      value.provenance.sourceKind !== "internal_report"
    ) {
      addIssue(
        issues,
        "provenance.sourceKind",
        "SOURCE_STATUS_MISMATCH",
        "Complete status requires internal-report provenance.",
      );
    }
    if (
      typeof value.provenance.publicFactsHash !== "string" ||
      !sha256Pattern.test(value.provenance.publicFactsHash)
    ) {
      addIssue(
        issues,
        "provenance.publicFactsHash",
        "PUBLIC_HASH_INVALID",
        "Public facts hash is invalid.",
      );
    }
  }

  if (issues.length === 0) {
    const report = value as unknown as QuoteHealthPublicReportV1;
    const expectedHash = await sha256(publicFactsPreimage(report));
    if (report.provenance.publicFactsHash !== expectedHash) {
      addIssue(
        issues,
        "provenance.publicFactsHash",
        "PUBLIC_HASH_MISMATCH",
        "Public facts hash does not match the fixed-order public facts.",
      );
    }
    if (
      new TextEncoder().encode(JSON.stringify(report)).length >
        QUOTE_HEALTH_PUBLIC_REPORT_MAX_BYTES
    ) {
      addIssue(
        issues,
        "",
        "PAYLOAD_TOO_LARGE",
        "Public report must not exceed one MiB.",
      );
    }
  }
  return issues.length === 0
    ? {
      valid: true,
      value: value as unknown as QuoteHealthPublicReportV1,
      issues,
    }
    : { valid: false, issues };
};
