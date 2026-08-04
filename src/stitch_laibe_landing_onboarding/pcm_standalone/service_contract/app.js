import {
  CONTRACT_META,
  CONTRACT_SOURCE,
  CONTRACT_SOURCE_SHA256,
  KEY_CLAUSES,
  LIFECYCLE,
} from "./contract-content.js";

const ReflectApply = Reflect.apply;
const ObjectCreate = Object.create;
const ObjectDefineProperty = Object.defineProperty;
const ObjectFreeze = Object.freeze;
const ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const ObjectGetPrototypeOf = Object.getPrototypeOf;
const ObjectHasOwn = Object.hasOwn;
const ObjectPrototype = Object.prototype;
const ArrayPrototypePush = Array.prototype.push;
const StringPrototypeTrim = String.prototype.trim;
const EMPTY_ARGUMENTS = ObjectFreeze([]);

const ENVELOPE_FACT_NAMES = Object.freeze([
  "contractVersionHash",
  "ownerIdentityVerified",
  "ownerPartyId",
  "serviceProviderPartySnapshot",
  "writerReady",
  "legalReviewStatus",
]);

const PROVIDER_FACT_NAMES = Object.freeze([
  "partyType",
  "partyId",
  "signatoryActorId",
]);

const CONTRACT_CONTEXT_FACT_NAMES = Object.freeze([
  "caseId",
  "prerequisitesComplete",
  "ownerVersionHash",
  "providerVersionHash",
  "ownerAcceptedSameVersion",
  "providerAcceptedSameVersion",
  "pcmReviewState",
]);

export const G1_CAPABILITIES = Object.freeze({
  ownerDraftSubmission: false,
  formalAcceptance: false,
  signing: false,
  authentication: false,
  durableReceipt: false,
});

export const INITIAL_CONTRACT_CONTEXT = Object.freeze({
  caseId: "",
  prerequisitesComplete: false,
  ownerVersionHash: "",
  providerVersionHash: "",
  ownerAcceptedSameVersion: false,
  providerAcceptedSameVersion: false,
  pcmReviewState: "",
});

export const CONTRACT_FAILURE_STATES = Object.freeze({
  PREREQUISITES_MISSING: Object.freeze({
    code: "PREREQUISITES_MISSING",
    reason: "簽署前置資料或必要附件尚未齊全。",
    next: "先依案件文件清單補齊缺漏，再重新確認版本。",
    responsible: "甲方與案件乙方",
    recovery: "缺漏補齊並留下提送紀錄後，回到同版確認。",
  }),
  VERSION_MISMATCH: Object.freeze({
    code: "VERSION_MISMATCH",
    reason: "甲乙雙方目前查看的契約版本不同。",
    next: "停止確認，先比對版本與修訂紀錄。",
    responsible: "案件乙方",
    recovery: "乙方提送最新版本並標明修訂內容後，請雙方重新閱讀。",
  }),
  SAME_VERSION_NOT_ACCEPTED: Object.freeze({
    code: "SAME_VERSION_NOT_ACCEPTED",
    reason: "甲乙雙方尚未對同一版本表示無異議。",
    next: "逐項處理未確認事項，不進入簽署準備。",
    responsible: "尚未確認的一方",
    recovery: "雙方針對同版完成確認並留下紀錄後，再由甲方最終確認。",
  }),
  PCM_REVIEW_PENDING: Object.freeze({
    code: "PCM_REVIEW_PENDING",
    reason: "PCM 公開審查意見仍有待處理項目。",
    next: "先回應審查意見；需要修訂時由乙方更新版本。",
    responsible: "案件乙方",
    recovery: "意見逐項回覆、修訂與公開紀錄完成後，再回到雙方確認。",
  }),
  CONTEXT_UNAVAILABLE: Object.freeze({
    code: "CONTEXT_UNAVAILABLE",
    reason: "尚未載入可供判讀的案件資料。",
    next: "先返回案件入口，確認要閱讀的案件與文件。",
    responsible: "甲方",
    recovery: "案件資料帶入後，系統會重新檢查前置、版本與審查狀態。",
  }),
});

const FAILURE_STATE_LABELS = Object.freeze({
  PREREQUISITES_MISSING: "前置資料缺漏",
  VERSION_MISMATCH: "版本不同",
  SAME_VERSION_NOT_ACCEPTED: "雙方尚未接受同版",
  PCM_REVIEW_PENDING: "PCM 意見待處理",
  CONTEXT_UNAVAILABLE: "尚未載入案件",
});

const SECTION_ID_MAP = Object.freeze([
  ["萊比 LaiBE AI PCM 案件治理資訊服務契約", "contract-title"],
  ["第一條", "article-01"], ["第二條", "article-02"], ["第三條", "article-03"],
  ["第四條", "article-04"], ["第五條", "article-05"], ["第六條", "article-06"],
  ["第七條", "article-07"], ["第八條", "article-08"], ["第九條", "article-09"],
  ["第十條", "article-10"], ["第十一條", "article-11"], ["第十二條", "article-12"],
  ["第十三條", "article-13"], ["第十四條", "article-14"], ["第十五條", "article-15"],
  ["第十五條之一", "article-15-1"], ["第十五條之二", "article-15-2"],
  ["第十六條", "article-16"], ["第十七條", "article-17"], ["第十八條", "article-18"],
  ["第十九條", "article-19"], ["第二十條", "article-20"], ["第二十一條", "article-21"],
  ["第二十二條", "article-22"], ["第二十三條", "article-23"], ["第二十四條", "article-24"],
  ["第二十五條", "article-25"], ["第二十六條", "article-26"], ["第二十七條", "article-27"],
  ["第二十八條", "article-28"], ["附件一", "annex-01"], ["附件二", "annex-02"],
  ["附件三", "annex-03"], ["附件四", "annex-04"], ["附件五", "annex-05"],
  ["附件六", "annex-06"], ["附件七", "annex-07"], ["附件八", "annex-08"],
  ["附件九", "annex-09"], ["附件十", "annex-10"], ["附件十一", "annex-11"],
  ["附件十二", "annex-12"], ["附件十三", "annex-13"], ["附件十四", "annex-14"],
]);

const READINESS_ITEMS = Object.freeze([
  ["正式契約版本", "正式契約版本尚未固定"],
  ["甲方身分", "甲方身分尚未完成確認"],
  ["服務方資料", "自然人服務方資料尚未完成確認"],
  ["簽署紀錄", "正式簽署紀錄功能尚未就緒"],
  ["法務審閱", "契約仍在法務審閱中"],
]);

export const INITIAL_SIGNING_ENVELOPE = Object.freeze({
  contractVersionHash: "",
  ownerIdentityVerified: false,
  ownerPartyId: "",
  serviceProviderPartySnapshot: null,
  writerReady: false,
  legalReviewStatus: CONTRACT_META.legalReviewStatus,
});

function extractOwnDataFacts(value, factNames) {
  if (value === null || typeof value !== "object") return null;

  try {
    const prototype = ObjectGetPrototypeOf(value);
    if (prototype !== ObjectPrototype && prototype !== null) return null;

    const facts = ObjectCreate(null);
    for (let index = 0; index < factNames.length; index += 1) {
      const factName = factNames[index];
      const descriptor = ObjectGetOwnPropertyDescriptor(value, factName);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !ObjectHasOwn(descriptor, "value")
      ) {
        return null;
      }
      facts[factName] = descriptor.value;
    }
    return ObjectFreeze(facts);
  } catch {
    return null;
  }
}

function isNonEmptyString(value) {
  if (typeof value !== "string") return false;
  try {
    return ReflectApply(StringPrototypeTrim, value, EMPTY_ARGUMENTS).length > 0;
  } catch {
    return false;
  }
}

export function evaluateSigningReadiness(input = {}) {
  const reasons = [];
  ObjectDefineProperty(reasons, "push", {
    value: ArrayPrototypePush,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  const envelopeFacts = extractOwnDataFacts(input, ENVELOPE_FACT_NAMES);
  const contractVersionHash = envelopeFacts?.contractVersionHash;
  const ownerIdentityVerified = envelopeFacts?.ownerIdentityVerified;
  const ownerPartyId = envelopeFacts?.ownerPartyId;
  const serviceProviderPartySnapshot = envelopeFacts?.serviceProviderPartySnapshot;
  const writerReady = envelopeFacts?.writerReady;
  const legalReviewStatus = envelopeFacts?.legalReviewStatus;

  if (contractVersionHash !== CONTRACT_SOURCE_SHA256) {
    reasons.push("正式契約版本尚未固定");
  }
  if (
    ownerIdentityVerified !== true ||
    !isNonEmptyString(ownerPartyId)
  ) {
    reasons.push("甲方身分尚未完成確認");
  }

  const providerFacts = extractOwnDataFacts(
    serviceProviderPartySnapshot,
    PROVIDER_FACT_NAMES,
  );
  const partyType = providerFacts?.partyType;
  const providerPartyId = providerFacts?.partyId;
  const signatoryActorId = providerFacts?.signatoryActorId;
  if (
    typeof partyType !== "string" ||
    partyType !== "natural_person" ||
    !isNonEmptyString(providerPartyId) ||
    !isNonEmptyString(signatoryActorId)
  ) {
    reasons.push("自然人服務方資料尚未完成確認");
  }
  if (writerReady !== true) {
    reasons.push("正式簽署紀錄功能尚未就緒");
  }
  if (
    typeof legalReviewStatus !== "string" ||
    legalReviewStatus !== "LEGAL_FINAL"
  ) {
    reasons.push("契約仍在法務審閱中");
  }

  return ObjectFreeze({
    ready: reasons.length === 0,
    reasons: ObjectFreeze(reasons),
  });
}

function createContextResult(failure, readyForFinalOwnerConfirmation = false) {
  return ObjectFreeze({
    readyForFinalOwnerConfirmation,
    signingEnabled: false,
    failure,
  });
}

export function resolveContractContext(input = {}) {
  const contextFacts = extractOwnDataFacts(input, CONTRACT_CONTEXT_FACT_NAMES);
  if (!contextFacts) {
    return createContextResult(CONTRACT_FAILURE_STATES.CONTEXT_UNAVAILABLE);
  }

  const caseId = contextFacts.caseId;
  const prerequisitesComplete = contextFacts.prerequisitesComplete;
  const ownerVersionHash = contextFacts.ownerVersionHash;
  const providerVersionHash = contextFacts.providerVersionHash;
  const ownerAcceptedSameVersion = contextFacts.ownerAcceptedSameVersion;
  const providerAcceptedSameVersion = contextFacts.providerAcceptedSameVersion;
  const pcmReviewState = contextFacts.pcmReviewState;

  if (!isNonEmptyString(caseId)) {
    return createContextResult(CONTRACT_FAILURE_STATES.CONTEXT_UNAVAILABLE);
  }
  if (prerequisitesComplete !== true) {
    return createContextResult(CONTRACT_FAILURE_STATES.PREREQUISITES_MISSING);
  }
  if (
    ownerVersionHash !== CONTRACT_SOURCE_SHA256 ||
    providerVersionHash !== CONTRACT_SOURCE_SHA256 ||
    ownerVersionHash !== providerVersionHash
  ) {
    return createContextResult(CONTRACT_FAILURE_STATES.VERSION_MISMATCH);
  }
  if (
    ownerAcceptedSameVersion !== true ||
    providerAcceptedSameVersion !== true
  ) {
    return createContextResult(CONTRACT_FAILURE_STATES.SAME_VERSION_NOT_ACCEPTED);
  }
  if (pcmReviewState !== "PUBLISHED_RESOLVED") {
    return createContextResult(CONTRACT_FAILURE_STATES.PCM_REVIEW_PENDING);
  }

  return createContextResult(null, true);
}

function createTextElement(tagName, text, className) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function hasSectionLabel(heading, label) {
  if (typeof heading !== "string") return false;
  if (heading === label) return true;
  if (heading.slice(0, label.length) !== label) return false;

  const boundary = heading[label.length];
  return boundary === " " || boundary === "　";
}

export function resolveContractSectionId(heading, fallbackIndex) {
  for (let index = 0; index < SECTION_ID_MAP.length; index += 1) {
    const [label, id] = SECTION_ID_MAP[index];
    if (hasSectionLabel(heading, label)) return id;
  }
  return `contract-section-${fallbackIndex}`;
}

function renderKeyClauses() {
  const container = document.querySelector("[data-key-clauses]");
  if (!container) return;

  for (let index = 0; index < KEY_CLAUSES.length; index += 1) {
    const clause = KEY_CLAUSES[index];
    const article = document.createElement("article");
    article.className = "clause";
    article.id = clause.id;

    const heading = createTextElement("h3", clause.title);
    const tag = createTextElement("p", `${String(index + 1).padStart(2, "0")}｜${clause.tag}`, "clause__tag");
    const anchor = document.createElement("a");
    anchor.href = `#${resolveContractSectionId(clause.anchor, index + 1)}`;
    anchor.className = "clause__source";
    anchor.textContent = `查看${clause.anchor}`;
    const points = document.createElement("ul");

    for (let pointIndex = 0; pointIndex < clause.points.length; pointIndex += 1) {
      points.append(createTextElement("li", clause.points[pointIndex]));
    }

    article.append(tag, heading, points);
    if (clause.table) article.append(renderClauseTable(clause.table));
    article.append(anchor);
    container.append(article);
  }
}

function renderClauseTable(tableData) {
  const table = document.createElement("table");
  table.className = "clause__table";
  const head = document.createElement("thead");
  const row = document.createElement("tr");

  for (let index = 0; index < tableData.head.length; index += 1) {
    row.append(createTextElement("th", tableData.head[index]));
  }
  head.append(row);

  const body = document.createElement("tbody");
  for (let rowIndex = 0; rowIndex < tableData.rows.length; rowIndex += 1) {
    const sourceRow = tableData.rows[rowIndex];
    const tableRow = document.createElement("tr");
    for (let cellIndex = 0; cellIndex < sourceRow.length; cellIndex += 1) {
      tableRow.append(createTextElement("td", sourceRow[cellIndex]));
    }
    body.append(tableRow);
  }

  table.append(head, body);
  return table;
}

function renderContract() {
  const contract = document.querySelector("[data-contract]");
  const contents = document.querySelector("[data-contents]");
  if (!contract || !contents) return;

  const lines = CONTRACT_SOURCE.split("\n");
  let headingIndex = 0;
  let currentParagraph = [];

  function appendParagraph() {
    if (currentParagraph.length === 0) return;
    contract.append(createTextElement("p", currentParagraph.join("\n")));
    currentParagraph = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);

    if (headingMatch) {
      appendParagraph();
      headingIndex += 1;
      const level = headingMatch[1].length;
      const renderedLevel = level + 1;
      const headingText = headingMatch[2];
      const heading = createTextElement(`h${renderedLevel}`, headingText);
      const id = resolveContractSectionId(headingText, headingIndex);
      heading.id = id;
      contract.append(heading);

      if (level === 1 || /^第[一二三四五六七八九十百]+條/.test(headingText)) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${id}`;
        link.textContent = headingText;
        item.append(link);
        contents.append(item);
      }
      continue;
    }

    if (line === "---") {
      appendParagraph();
      contract.append(document.createElement("hr"));
      continue;
    }
    if (line.trim() === "") {
      appendParagraph();
      continue;
    }
    currentParagraph.push(line);
  }
  appendParagraph();
}

function renderReadiness(readiness) {
  const checklist = document.querySelector("[data-readiness-list]");
  const signButton = document.querySelector("[data-sign-button]");
  const summary = document.querySelector("[data-readiness-summary]");
  if (!checklist || !signButton || !summary) return;

  for (let index = 0; index < READINESS_ITEMS.length; index += 1) {
    const [label, pendingReason] = READINESS_ITEMS[index];
    const complete = readiness.reasons.indexOf(pendingReason) === -1;
    const item = document.createElement("li");
    item.className = complete ? "is-complete" : "is-pending";
    item.append(createTextElement("strong", label));
    item.append(createTextElement("span", complete ? "已確認" : "待確認"));
    checklist.append(item);
  }

  signButton.disabled = true;
  signButton.setAttribute("aria-disabled", "true");
  summary.textContent = readiness.ready
    ? "簽署前提已可供核對，但正式接受與簽署尚未開放。"
    : "目前是 v0.3 法務審閱稿，尚未進入正式接受或簽署；請先閱讀完整契約與預定流程。";
}

function renderContractContext(contextResult) {
  const caseStatus = document.querySelector("[data-case-status]");
  const nextResponsible = document.querySelector("[data-next-responsible]");
  const recentRecord = document.querySelector("[data-recent-record]");
  const contextNote = document.querySelector("[data-context-note]");
  if (!caseStatus || !nextResponsible || !recentRecord || !contextNote) return;

  if (contextResult.failure?.code === "CONTEXT_UNAVAILABLE") {
    caseStatus.textContent = "尚未載入案件資料";
    nextResponsible.textContent = "甲方｜先閱讀契約與流程";
    recentRecord.textContent = "尚無可顯示的案件紀錄";
    contextNote.textContent = "案件資料帶入後，才會依實際文件顯示負責人與最近紀錄。";
    return;
  }

  if (contextResult.failure) {
    caseStatus.textContent = contextResult.failure.reason;
    nextResponsible.textContent = `${contextResult.failure.responsible}｜${contextResult.failure.next}`;
    recentRecord.textContent = "請回到案件紀錄確認最近一次提送或修訂。";
    contextNote.textContent = contextResult.failure.recovery;
    return;
  }

  caseStatus.textContent = "同版確認與 PCM 意見處理已完成";
  nextResponsible.textContent = "甲方｜進行最終確認前複核";
  recentRecord.textContent = "請回到案件紀錄核對最新版本與確認人。";
  contextNote.textContent = "本頁仍不提供正式確認或簽署入口。";
}

function renderFailureStates() {
  const body = document.querySelector("[data-failure-states]");
  if (!body) return;

  const codes = Object.keys(CONTRACT_FAILURE_STATES);
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];
    const state = CONTRACT_FAILURE_STATES[code];
    const row = document.createElement("tr");
    row.append(createTextElement("th", FAILURE_STATE_LABELS[code]));
    row.append(createTextElement("td", state.reason));
    row.append(createTextElement("td", state.next));
    row.append(createTextElement("td", state.responsible));
    row.append(createTextElement("td", state.recovery));
    body.append(row);
  }
}

function initialisePage() {
  renderKeyClauses();
  renderContract();
  renderFailureStates();
  renderContractContext(resolveContractContext(INITIAL_CONTRACT_CONTEXT));
  const readiness = evaluateSigningReadiness(INITIAL_SIGNING_ENVELOPE);
  renderReadiness(readiness);

  const printButton = document.querySelector("[data-print-button]");
  if (printButton) {
    printButton.addEventListener("click", () => window.print());
  }

  const lifecycle = document.querySelector("[data-lifecycle]");
  if (lifecycle) {
    lifecycle.textContent = LIFECYCLE[0] === "DRAFT"
      ? "草稿 · 尚未進入簽署"
      : "尚未開始";
  }
}

if (typeof document !== "undefined") initialisePage();
