export const MAX_OWNER_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const REQUIRED_OWNER_DOCUMENTS = Object.freeze([
  Object.freeze({
    id: "contractor_quote_pdf",
    label: "乙方報價單 PDF",
    accept: "application/pdf",
    guidance: "請提供目前準備討論或簽署的完整報價版本。",
  }),
  Object.freeze({
    id: "construction_drawing_pdf",
    label: "施工圖 PDF",
    accept: "application/pdf",
    guidance: "施工圖至少包含平面圖，並應能看見圖名或版次。",
  }),
]);

const READINESS_KEYS = Object.freeze([
  "auth",
  "privacy",
  "storage",
  "intakeWriter",
]);

export function getOwnerOnboardingReadiness(config = {}) {
  const missing = READINESS_KEYS.filter((key) =>
    key === "intakeWriter"
      ? typeof config[key] !== "function"
      : config[key] !== true
  );

  return Object.freeze({
    ready: missing.length === 0,
    missing: Object.freeze(missing),
    message: missing.length === 0
      ? "註冊與文件收件已可使用。"
      : "正式註冊與收件設定完成後即可上傳；你可以先查看需要準備的文件。",
  });
}

function validatePdf(file, label) {
  if (!file || typeof file !== "object") {
    return `請選擇${label}。`;
  }

  const name = typeof file.name === "string" ? file.name.trim() : "";
  const type = typeof file.type === "string" ? file.type.toLowerCase() : "";
  const size = Number(file.size);

  if (type !== "application/pdf" || !name.toLowerCase().endsWith(".pdf")) {
    return `${label}只接受 PDF 檔案。`;
  }

  if (!Number.isFinite(size) || size <= 0) {
    return `${label}是空白檔案，請重新選擇。`;
  }

  if (size > MAX_OWNER_DOCUMENT_BYTES) {
    return `${label}不可超過 25 MB。`;
  }

  return "";
}

export function validateOwnerDocuments(documents = {}) {
  const errors = {};

  for (const document of REQUIRED_OWNER_DOCUMENTS) {
    const error = validatePdf(documents[document.id], document.label);
    if (error) {
      errors[document.id] = error;
    }
  }

  return Object.freeze({
    valid: Object.keys(errors).length === 0,
    errors: Object.freeze(errors),
  });
}
