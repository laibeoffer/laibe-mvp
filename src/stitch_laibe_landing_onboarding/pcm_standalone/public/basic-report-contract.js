export const BASIC_REPORT_SECTIONS = Object.freeze([
  Object.freeze({
    id: "document_completeness",
    label: "文件完整性",
  }),
  Object.freeze({
    id: "document_versions",
    label: "文件版本",
  }),
  Object.freeze({
    id: "quote_scope_comparison",
    label: "報價範圍差異",
  }),
  Object.freeze({
    id: "drawing_cross_check",
    label: "施工圖對照",
  }),
  Object.freeze({
    id: "missing_documents",
    label: "待補件",
  }),
  Object.freeze({
    id: "next_step",
    label: "下一步",
  }),
]);

export const BASIC_REPORT_BOUNDARY = Object.freeze({
  formalImpact: "none",
  formalAcceptance: false,
  legalOpinion: false,
  priceGuarantee: false,
  paymentAuthorization: false,
});

export const BASIC_REPORT_SCOPE_STATEMENT =
  "僅依甲方提交且可辨識的乙方報價單與施工圖版本進行書面整理。";
export const BASIC_REPORT_RESPONSIBILITY_STATEMENT =
  "PCM 對基本檢討的文件核對、差異標示、來源引用與留痕負責。";

const SECTION_IDS = new Set(BASIC_REPORT_SECTIONS.map(({ id }) => id));
const BASIC_REPORT_STATUSES = new Set([
  "awaiting_source_confirmation",
  "documents_incomplete",
  "supplement_required",
  "basic_review_draft",
  "basic_review_published",
]);
const LEGACY_STATUS_ALIASES = Object.freeze({
  published: "basic_review_published",
});
const FORBIDDEN_PUBLIC_TERMS = Object.freeze([
  "db",
  "api",
  "debug",
  "mock",
  "stacktrace",
  "servicerole",
  "rawjson",
  "github",
  "n8n",
  "金流託管",
  "支付託管",
  "代收代付",
  "最低價",
  "零風險",
  "老屋煉金術",
  "老屋投資報酬",
  "翻修獲利模型",
  "裝修理財",
  "ai監工",
  "pcm監工",
  "pcm驗屋",
  "現場品質保證",
  "工程品質保證",
  "驗收合格",
]);

function requireText(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(message);
  }

  return value.trim();
}

function requirePublicText(value, message) {
  const text = requireText(value, message);
  const normalized = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}_]+/gu, "");

  if (FORBIDDEN_PUBLIC_TERMS.some((term) => normalized.includes(term))) {
    throw new RangeError("這段內容不適合顯示於基本檢討報告。");
  }

  return text;
}

function normalizeCitation(citation) {
  if (!citation || typeof citation !== "object") {
    throw new TypeError("每一項意見都必須引用文件與版次。");
  }

  return Object.freeze({
    documentId: requireText(
      citation.documentId,
      "每一項意見都必須引用文件與版次。",
    ),
    documentLabel: requirePublicText(
      citation.documentLabel,
      "每一項意見都必須引用文件與版次。",
    ),
    version: requirePublicText(
      citation.version,
      "每一項意見都必須引用文件與版次。",
    ),
  });
}

function normalizeFinding(finding) {
  if (!finding || typeof finding !== "object") {
    throw new TypeError("基本檢討項目格式不正確。");
  }

  if (!SECTION_IDS.has(finding.section)) {
    throw new RangeError("這項內容不在基本檢討範圍內。");
  }

  if (!Array.isArray(finding.citations) || finding.citations.length === 0) {
    throw new TypeError("每一項意見都必須引用文件與版次。");
  }

  const citations = Object.freeze(finding.citations.map(normalizeCitation));

  return Object.freeze({
    section: finding.section,
    title: requirePublicText(
      finding.title,
      "每一項意見都需要清楚的標題。",
    ),
    detail: requirePublicText(
      finding.detail,
      "每一項意見都需要檢討說明。",
    ),
    citations,
  });
}

export function createBasicReport(input = {}) {
  if (!input || typeof input !== "object") {
    throw new TypeError("基本檢討報告格式不正確。");
  }

  if (!Array.isArray(input.findings)) {
    throw new TypeError("基本檢討項目格式不正確。");
  }

  if (
    input.formalImpact !== undefined &&
    input.formalImpact !== BASIC_REPORT_BOUNDARY.formalImpact
  ) {
    throw new RangeError("基本檢討報告不會產生正式驗收效力。");
  }

  const findings = Object.freeze(input.findings.map(normalizeFinding));
  const requestedStatus = typeof input.status === "string" &&
      input.status.trim()
    ? input.status.trim()
    : "awaiting_source_confirmation";
  const status = LEGACY_STATUS_ALIASES[requestedStatus] ?? requestedStatus;

  if (!BASIC_REPORT_STATUSES.has(status)) {
    throw new RangeError("基本檢討報告狀態不正確。");
  }

  return Object.freeze({
    status,
    actor: input.actor === undefined
      ? "萊比 PCM"
      : requirePublicText(input.actor, "目前處理者不可為空白。"),
    nextAction: input.nextAction === undefined
      ? "等待文件版本確認"
      : requirePublicText(input.nextAction, "下一步不可為空白。"),
    formalImpact: BASIC_REPORT_BOUNDARY.formalImpact,
    scopeStatement: BASIC_REPORT_SCOPE_STATEMENT,
    responsibilityStatement: BASIC_REPORT_RESPONSIBILITY_STATEMENT,
    paymentAuthorization: false,
    contractorPaymentDue: "NOT_DETERMINED",
    onSiteQuality: "NOT_DETERMINED",
    findings,
  });
}
