export const OWNER_ACCOUNT_TYPES = Object.freeze([
  "individual",
  "company",
]);

export const OWNER_REGISTRATION_FIELDS = Object.freeze([
  Object.freeze({ name: "account_type", required: true }),
  Object.freeze({ name: "company_name", required: false }),
  Object.freeze({ name: "contact_name", required: true }),
  Object.freeze({ name: "mobile", required: true }),
  Object.freeze({ name: "region", required: false }),
  Object.freeze({ name: "email", required: true }),
  Object.freeze({ name: "password", required: true }),
  Object.freeze({ name: "terms_accepted", required: true }),
]);

const READINESS_KEYS = Object.freeze([
  "auth",
  "privacy",
  "accountWriter",
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMobile(value) {
  return normalizeText(value).replace(/\D/g, "");
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

export function getOwnerRegistrationReadiness(config = {}) {
  const missing = READINESS_KEYS.filter((key) =>
    key === "accountWriter"
      ? typeof config[key] !== "function"
      : config[key] !== true
  );

  return Object.freeze({
    ready: missing.length === 0,
    missing: Object.freeze(missing),
    message: missing.length === 0
      ? "甲方帳號註冊已可使用。"
      : "正式註冊設定完成後即可建立甲方帳號；你仍可先查看需要準備的資料。",
  });
}

export function validateOwnerRegistration(input = {}) {
  const values = {
    account_type: normalizeText(input.account_type),
    company_name: normalizeText(input.company_name),
    contact_name: normalizeText(input.contact_name),
    mobile: normalizeMobile(input.mobile),
    region: normalizeText(input.region),
    email: normalizeEmail(input.email),
    password: typeof input.password === "string" ? input.password : "",
    terms_accepted: input.terms_accepted === true,
  };
  const errors = {};

  if (!OWNER_ACCOUNT_TYPES.includes(values.account_type)) {
    errors.account_type = "請選擇個人或公司／法人帳號。";
  }

  if (
    values.account_type === "company" &&
    values.company_name.length === 0
  ) {
    errors.company_name = "請填寫公司名稱。";
  } else if (values.company_name.length > 120) {
    errors.company_name = "公司名稱不可超過 120 個字。";
  }

  if (values.contact_name.length === 0) {
    errors.contact_name = "請填寫姓名或聯絡人。";
  } else if (values.contact_name.length > 80) {
    errors.contact_name = "姓名或聯絡人不可超過 80 個字。";
  }

  if (!/^09\d{8}$/.test(values.mobile)) {
    errors.mobile = "請填寫正確的台灣手機號碼。";
  }

  if (values.region.length > 30) {
    errors.region = "所在地區不可超過 30 個字。";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "請填寫正確的 Email。";
  }

  if (
    values.password.length < 8 ||
    !/[A-Za-z]/.test(values.password) ||
    !/\d/.test(values.password)
  ) {
    errors.password = "密碼至少 8 碼，並須包含英文字母與數字。";
  }

  if (!values.terms_accepted) {
    errors.terms_accepted = "請先閱讀並同意服務與隱私說明。";
  }

  if (Object.keys(errors).length > 0) {
    delete values.password;
  }

  return Object.freeze({
    valid: Object.keys(errors).length === 0,
    values: Object.freeze(values),
    errors: Object.freeze(errors),
  });
}
