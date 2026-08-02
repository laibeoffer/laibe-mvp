const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_PATTERN = /^09\d{8}$/;

const CASE_TYPES = Object.freeze([
  "design",
  "construction",
  "design_and_construction",
  "unsure",
]);

const CURRENT_STAGES = Object.freeze([
  "requirements",
  "has_drawings",
  "comparing_quotes",
  "contract_preparation",
  "construction",
  "acceptance_or_closeout",
]);

export const INTAKE_SCHEMA = Object.freeze({
  fields: Object.freeze([
    "name",
    "contact_type",
    "contact_value",
    "case_type",
    "region",
    "current_stage",
    "needs_summary",
    "website",
  ]),
  contactTypes: Object.freeze(["email", "phone"]),
  caseTypes: CASE_TYPES,
  currentStages: CURRENT_STAGES,
});

export const INTAKE_NOTICE_VERSION = "pcm-intake-2026-07-27-v1";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function characterLength(value) {
  return [...value].length;
}

function normalizePhone(rawValue) {
  const compact = text(rawValue).replace(/\D/g, "");
  if (/^8869\d{8}$/.test(compact)) {
    return `0${compact.slice(3)}`;
  }
  return compact;
}

export function normalizeIntakePayload(input = {}) {
  const contactType = text(input.contact_type);
  const contactValue = contactType === "phone"
    ? normalizePhone(input.contact_value)
    : text(input.contact_value).toLowerCase();

  return {
    name: text(input.name),
    contact_type: contactType,
    contact_value: contactValue,
    case_type: text(input.case_type),
    region: text(input.region),
    current_stage: text(input.current_stage),
    needs_summary: text(input.needs_summary),
    website: text(input.website),
  };
}

export function validateIntake(input = {}) {
  const value = normalizeIntakePayload(input);
  const errors = {};

  if (
    characterLength(value.name) < 2 ||
    characterLength(value.name) > 80
  ) {
    errors.name = "請填寫 2 到 80 字的聯絡稱呼。";
  }

  if (!INTAKE_SCHEMA.contactTypes.includes(value.contact_type)) {
    errors.contact_type = "請選擇 Email 或台灣手機。";
  } else if (
    (value.contact_type === "email" &&
      !EMAIL_PATTERN.test(value.contact_value)) ||
    (value.contact_type === "phone" &&
      !MOBILE_PATTERN.test(value.contact_value))
  ) {
    errors.contact_value = value.contact_type === "email"
      ? "請填寫可收信的 Email。"
      : "請填寫 09 開頭的 10 碼台灣手機。";
  }

  if (!CASE_TYPES.includes(value.case_type)) {
    errors.case_type = "請選擇案件類型。";
  }

  if (
    characterLength(value.region) < 2 ||
    characterLength(value.region) > 80
  ) {
    errors.region = "請填寫 2 到 80 字的縣市或案件區域。";
  }

  if (!CURRENT_STAGES.includes(value.current_stage)) {
    errors.current_stage = "請選擇目前案件階段。";
  }

  if (
    characterLength(value.needs_summary) < 20 ||
    characterLength(value.needs_summary) > 1200
  ) {
    errors.needs_summary = "請用 20 到 1200 字說明目前需求。";
  }

  if (value.website) {
    errors.website = "目前無法送出，請重新整理後再試。";
  }

  return Object.freeze({
    valid: Object.keys(errors).length === 0,
    value: Object.freeze(value),
    errors: Object.freeze(errors),
  });
}

export function normalizeIntakeConfig({ meta = {}, runtime = {} } = {}) {
  const config = { ...meta, ...runtime };

  return Object.freeze({
    endpoint: text(config.endpoint),
    turnstileSiteKey: text(config.turnstileSiteKey),
    providerName: text(config.providerName),
    privacyContact: text(config.privacyContact),
    retentionPeriod: text(config.retentionPeriod),
  });
}

function isAllowedEndpoint(value) {
  try {
    const url = new URL(text(value));
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "::1"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

export function getIntakeConfigReadiness(config = normalizeIntakeConfig()) {
  const missing = [
    "endpoint",
    "turnstileSiteKey",
    "providerName",
    "privacyContact",
    "retentionPeriod",
  ].filter(
    (key) =>
      !text(config[key]) ||
      (key === "endpoint" && !isAllowedEndpoint(config.endpoint)),
  );

  return Object.freeze({
    ready: missing.length === 0,
    missing: Object.freeze(missing),
    message: missing.length === 0
      ? "申請資料會安全送交工作室確認。"
      : "申請入口準備中，暫時無法送出",
  });
}

export function createIntakeRequest({
  normalizedValue,
  submissionId,
  turnstileToken,
}) {
  return Object.freeze({
    submission_id: text(submissionId),
    name: normalizedValue.name,
    contact_method: normalizedValue.contact_type === "phone"
      ? "mobile"
      : "email",
    contact_value: normalizedValue.contact_value,
    case_type: normalizedValue.case_type,
    region: normalizedValue.region,
    project_stage: normalizedValue.current_stage,
    summary: normalizedValue.needs_summary,
    consent_version: INTAKE_NOTICE_VERSION,
    turnstile_token: text(turnstileToken),
    website: normalizedValue.website,
  });
}

function mapServerFieldErrors(fieldErrors) {
  const aliases = {
    contact_method: "contact_type",
    project_stage: "current_stage",
    summary: "needs_summary",
  };

  return Object.fromEntries(
    Object.entries(fieldErrors ?? {}).map(([name, message]) => [
      aliases[name] ?? name,
      message,
    ]),
  );
}

export function mapIntakeError({
  status = 0,
  code = "",
  fieldErrors = {},
  networkError = false,
} = {}) {
  if (networkError) {
    return Object.freeze({
      message: "目前連線不穩定，資料仍保留在畫面上，請稍後再試。",
      fieldErrors: Object.freeze({}),
      shouldRestart: false,
    });
  }

  if (status === 400 || code === "VALIDATION_FAILED") {
    return Object.freeze({
      message: "請檢查標示欄位，修正後再送出。",
      fieldErrors: Object.freeze(mapServerFieldErrors(fieldErrors)),
      shouldRestart: false,
    });
  }

  if (status === 409 || code === "SUBMISSION_CONFLICT") {
    return Object.freeze({
      message: "這份申請內容已變更，請重新開始後再送出。",
      fieldErrors: Object.freeze({}),
      shouldRestart: true,
    });
  }

  if (status === 429 || code === "RATE_LIMITED") {
    return Object.freeze({
      message: "短時間內送出次數較多，請稍後再試。",
      fieldErrors: Object.freeze({}),
      shouldRestart: false,
    });
  }

  if (status === 503 || code === "SERVICE_UNAVAILABLE") {
    return Object.freeze({
      message: "目前無法送出，資料仍保留在畫面上，請稍後再試。",
      fieldErrors: Object.freeze({}),
      shouldRestart: false,
    });
  }

  return Object.freeze({
    message: "目前無法送出，資料仍保留在畫面上，請稍後再試。",
    fieldErrors: Object.freeze({}),
    shouldRestart: false,
  });
}

export function getSuccessViewModel(response = {}) {
  return Object.freeze({
    receiptCode: text(response.receiptCode),
    statusLabel: "已收到，待工作室確認",
    handlerLabel: "個人工作室",
    nextStep:
      "工作室會依你提供的案件概況確認是否適合受理；在雙方確認服務並簽約前，尚未建立正式案件。",
  });
}

const RECEIPT_PATTERN = /^PCM-[A-F0-9]{20}$/;
const SERVER_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function validateSuccessResponse(response) {
  if (
    !response ||
    typeof response !== "object" ||
    Array.isArray(response)
  ) {
    return Object.freeze({ valid: false });
  }

  const value = {
    receiptCode: text(response.receiptCode),
    status: text(response.status),
    submittedAt: text(response.submittedAt),
  };
  const timestamp = new Date(value.submittedAt);
  const timestampIsValid = SERVER_TIMESTAMP_PATTERN.test(value.submittedAt) &&
    !Number.isNaN(timestamp.getTime()) &&
    timestamp.toISOString() === value.submittedAt;

  if (
    !RECEIPT_PATTERN.test(value.receiptCode) ||
    value.status !== "received" ||
    !timestampIsValid
  ) {
    return Object.freeze({ valid: false });
  }

  return Object.freeze({
    valid: true,
    value: Object.freeze(value),
  });
}
