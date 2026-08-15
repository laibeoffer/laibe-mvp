import {
  BEGINNER_HIGHLIGHT_RULES,
  CONTRACT_META,
  CONTRACT_SOURCE,
  CONTRACT_SOURCE_SHA256,
  KEY_CLAUSES,
  LIFECYCLE,
} from "./contract-content.js?v=20260814-fee-model-v3";

export const CONTRACT_TYPES = Object.freeze({
  ENGINEERING: "engineering",
  DESIGN: "design",
});

export const DESIGN_CONTRACT_SOURCE_PATH = "./DRS_DESIGN_SERVICE_CONTRACT_v0.1.md";
export const DESIGN_CONTRACT_SOURCE_SHA256 =
  "94ba48f0574bc59830716d447aedb3fa26b9e1d3a3d291fa06c445327a9452c3";

const DESIGN_CONTRACT_PARTS = Object.freeze([
  Object.freeze({
    number: "01",
    title: "契約與費用",
    summary: "契約當事人、DRS 服務定位、資料基準、設計階段與費用規則。",
  }),
  Object.freeze({
    number: "02",
    title: "設計審查流程",
    summary: "簽約、3D、平面／系統圖、細部圖、版本確認、異議與 Override。",
  }),
  Object.freeze({
    number: "03",
    title: "責任與紀錄",
    summary: "付款決策、現場與資格邊界、案件留痕、電子文件、個資與智慧財產權。",
  }),
  Object.freeze({
    number: "04",
    title: "權益與簽署",
    summary: "中止、退費、責任限制、資料保存、審閱、準據法、簽署與七份附件。",
  }),
]);

const DESIGN_HIGHLIGHT_RULES = Object.freeze([
  Object.freeze({ id: "design-boundary", match: "DRS 不審查、評分或判斷：美不美" }),
  Object.freeze({ id: "design-fee", match: "DRS 設計審查總服務費率固定為 TOTAL_DESIGN_FEE 之 10%" }),
  Object.freeze({ id: "design-human-review", match: "AI_PRELIMINARY 不得單獨形成正式 DRS 審查通過" }),
  Object.freeze({ id: "design-immutable", match: "SIGNED_CONTRACT_IMMUTABLE = TRUE" }),
]);

const DESIGN_KEY_CLAUSES = Object.freeze([
  Object.freeze({
    id: "design-kc-boundary",
    tag: "永久責任邊界",
    title: "只審查工程理解所需的書面資訊",
    anchor: "第五條",
    points: Object.freeze([
      "不審查美感、風格、配色、創意或其他主觀設計判斷。",
      "只檢視工程理解與執行所需資料是否足夠、一致、可追溯。",
    ]),
  }),
  Object.freeze({
    id: "design-kc-fee",
    tag: "費用",
    title: "設計費與 DRS 審查費分開",
    anchor: "第八條",
    points: Object.freeze([
      "設計費分期為 20%／20%／20%／40%。",
      "DRS 審查費為設計費 10%，分階段 2%／2%／2%／4%，先付費後審查。",
    ]),
  }),
  Object.freeze({
    id: "design-kc-review",
    tag: "審查",
    title: "AI 初步分析必須經人工覆核",
    anchor: "第六條",
    points: Object.freeze([
      "AI_PRELIMINARY 不是正式 DRS 審查結果。",
      "服務方授權人工審查人員覆核後，才形成版本化 DRS_REVIEWED。",
    ]),
  }),
  Object.freeze({
    id: "design-kc-sign",
    tag: "簽署",
    title: "必要欄位未確認就不能簽署",
    anchor: "第二十一條",
    points: Object.freeze([
      "未解析 placeholder 或法務、政策未定稿時一律停止簽署。",
      "完成簽署的契約版本、SHA-256 與 PDF 識別不可被後續事件改寫。",
    ]),
  }),
]);

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
    reason: "DRS 公開審查意見仍有待處理項目。",
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
  PCM_REVIEW_PENDING: "DRS 意見待處理",
  CONTEXT_UNAVAILABLE: "尚未載入案件",
});

const SECTION_ID_MAP = Object.freeze([
  ["萊比DRS案件治理資訊服務契約", "contract-title"],
  ["萊比 DRS 案件治理資訊服務契約", "contract-title"],
  ["萊比 DRS 設計案件治理資訊服務契約", "contract-title"],
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
  ["第二十八條", "article-28"], ["第二十九條", "article-29"], ["第三十條", "article-30"],
  ["第三十一條", "article-31"], ["第三十二條", "article-32"], ["第三十三條", "article-33"],
  ["附件一", "annex-01"], ["附件二", "annex-02"],
  ["附件三", "annex-03"], ["附件四", "annex-04"], ["附件五", "annex-05"],
  ["附件六", "annex-06"], ["附件七", "annex-07"], ["附件八", "annex-08"],
  ["附件九", "annex-09"], ["附件十", "annex-10"], ["附件十一", "annex-11"],
  ["附件十二", "annex-12"], ["附件十三", "annex-13"], ["附件十四", "annex-14"],
]);

export const CONTRACT_PARTS = ObjectFreeze([
  ObjectFreeze({
    number: "01",
    title: "契約與服務",
    summary: "契約當事人、服務目的與範圍、DRS 責任邊界、案件類型與服務期間。",
  }),
  ObjectFreeze({
    number: "02",
    title: "費用與付款",
    summary: "服務費率 3.5%、付款節點、非服務方收入款項、甲方義務與現場疑慮揭露。",
  }),
  ObjectFreeze({
    number: "03",
    title: "責任與紀錄",
    summary: "服務方義務、AI 使用限制、案件紀錄、電子文件效力、個資與保密。",
  }),
  ObjectFreeze({
    number: "04",
    title: "權益與簽署",
    summary: "契約終止與服務費結算、責任限制、爭議處理、契約審閱、準據法、簽署與附件。",
  }),
]);

export const CONTRACT_VIEW_CONFIGS = ObjectFreeze({
  engineering: ObjectFreeze({
    type: CONTRACT_TYPES.ENGINEERING,
    title: "萊比 DRS 案件治理資訊服務契約",
    version: CONTRACT_META.version,
    versionLabel: CONTRACT_META.displayVersion,
    legalLabel: "法務審閱中",
    sourceSha256: CONTRACT_SOURCE_SHA256,
    sourcePath: "./contract-content.js",
    parts: CONTRACT_PARTS,
    keyClauses: KEY_CLAUSES,
    highlightRules: BEGINNER_HIGHLIGHT_RULES,
    boundaryNotice: "DRS 依可供審查文件提供程序品質與完整性審查，不取代現場、專業或甲方決策。",
    readinessSummary: "目前是 v0.4 法務審閱稿；必要欄位與正式簽署能力尚待確認。",
    availability: "正式接受、簽署與可追溯收據尚未開放；本頁不會寫入確認或簽署紀錄。",
    showEngineeringSections: true,
  }),
  design: ObjectFreeze({
    type: CONTRACT_TYPES.DESIGN,
    title: "萊比 DRS 設計案件治理資訊服務契約",
    version: "v0.1",
    versionLabel: "v0.1 候選草案",
    legalLabel: "法務與政策待確認",
    sourceSha256: DESIGN_CONTRACT_SOURCE_SHA256,
    sourcePath: DESIGN_CONTRACT_SOURCE_PATH,
    parts: DESIGN_CONTRACT_PARTS,
    keyClauses: DESIGN_KEY_CLAUSES,
    highlightRules: DESIGN_HIGHLIGHT_RULES,
    boundaryNotice: "DRS 不審查美感、風格、配色、創意或其他主觀設計判斷；只檢視工程理解／執行所需書面資訊是否足夠、一致、可追溯。",
    readinessSummary: "目前是 v0.1 候選草案；法務、設計費調整政策、必要欄位與正式簽署能力尚待確認。",
    availability: "設計契約仍待法務與政策確認，且沒有真實簽署能力；目前只提供完整閱讀與本機預覽。",
    showEngineeringSections: false,
  }),
});

export function resolveContractTypeFromLocation(locationLike = {}) {
  const search = typeof locationLike.search === "string" ? locationLike.search : "";
  const selected = new URLSearchParams(search).get("contract");
  return selected === CONTRACT_TYPES.DESIGN
    ? CONTRACT_TYPES.DESIGN
    : CONTRACT_TYPES.ENGINEERING;
}

export function buildContractTypeHref(contractType) {
  const safeType = contractType === CONTRACT_TYPES.DESIGN
    ? CONTRACT_TYPES.DESIGN
    : CONTRACT_TYPES.ENGINEERING;
  return `./code.html?contract=${safeType}#full-contract`;
}

function bytesToHex(bytes) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    result += bytes[index].toString(16).padStart(2, "0");
  }
  return result;
}

export async function verifyDesignContractBytes(inputBytes, subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.digest !== "function") {
    return ObjectFreeze({ ok: false, hash: "", source: "" });
  }

  const bytes = inputBytes instanceof Uint8Array
    ? inputBytes
    : new Uint8Array(inputBytes);
  const digest = await subtle.digest("SHA-256", bytes);
  const hash = bytesToHex(new Uint8Array(digest));
  const ok = hash === DESIGN_CONTRACT_SOURCE_SHA256;
  return ObjectFreeze({
    ok,
    hash,
    source: ok ? new TextDecoder("utf-8", { fatal: true }).decode(bytes) : "",
  });
}

async function loadDesignContractSource() {
  const response = await globalThis.fetch(DESIGN_CONTRACT_SOURCE_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error("DESIGN_CONTRACT_SOURCE_UNAVAILABLE");
  const verification = await verifyDesignContractBytes(await response.arrayBuffer());
  if (!verification.ok) throw new Error("DESIGN_CONTRACT_SOURCE_INTEGRITY_MISMATCH");
  return verification.source;
}

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

function createContractParagraph(text, highlightRules = BEGINNER_HIGHLIGHT_RULES) {
  const paragraph = document.createElement("p");
  let highlight = null;

  for (let index = 0; index < highlightRules.length; index += 1) {
    const rule = highlightRules[index];
    if (text.includes(rule.match)) {
      highlight = rule;
      break;
    }
  }

  if (!highlight) {
    paragraph.textContent = text;
    return paragraph;
  }

  paragraph.className = "contract-key-clause";
  paragraph.setAttribute("data-highlight-id", highlight.id);
  paragraph.append(createTextElement("span", "簽署前必讀", "contract-key-clause__label"));
  paragraph.append(createTextElement("strong", text));
  return paragraph;
}

export function resolveContractPartIndex(
  heading,
  fallbackIndex = 0,
  contractType = CONTRACT_TYPES.ENGINEERING,
) {
  const safeFallback = Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < 4
    ? fallbackIndex
    : 0;
  if (typeof heading !== "string") return safeFallback;

  const sectionId = resolveContractSectionId(heading, -1);
  if (sectionId.slice(0, 6) === "annex-") return 3;
  const articleMatch = /^article-(\d+)/.exec(sectionId);
  if (!articleMatch) return safeFallback;

  const articleNumber = Number.parseInt(articleMatch[1], 10);
  if (contractType === CONTRACT_TYPES.DESIGN) {
    if (articleNumber >= 26) return 3;
    if (articleNumber >= 18) return 2;
    if (articleNumber >= 9) return 1;
    return 0;
  }
  if (articleNumber >= 21) return 3;
  if (articleNumber >= 11) return 2;
  if (articleNumber >= 7) return 1;
  return 0;
}

export function resolveContractPageDirection(currentIndex, nextIndex) {
  if (nextIndex === currentIndex) return "current";
  return nextIndex > currentIndex ? "next" : "previous";
}

function renderKeyClauses(
  pages,
  keyClauses = KEY_CLAUSES,
  contractType = CONTRACT_TYPES.ENGINEERING,
) {
  if (!pages || pages.length !== 4) return;
  for (let index = 0; index < keyClauses.length; index += 1) {
    const clause = keyClauses[index];
    const pageIndex = resolveContractPartIndex(clause.anchor, 0, contractType);
    const container = pages[pageIndex].highlights;
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

function renderContract(
  contractSource = CONTRACT_SOURCE,
  contractType = CONTRACT_TYPES.ENGINEERING,
  parts = CONTRACT_PARTS,
  highlightRules = BEGINNER_HIGHLIGHT_RULES,
) {
  const contract = document.querySelector("[data-contract]");
  if (!contract) return [];
  if (typeof contract.replaceChildren === "function") contract.replaceChildren();
  else if (Array.isArray(contract.children)) contract.children.length = 0;

  const pages = [];
  for (let pageIndex = 0; pageIndex < parts.length; pageIndex += 1) {
    const part = parts[pageIndex];
    const panel = document.createElement("article");
    panel.className = pageIndex === 0
      ? "contract-paper contract-page-panel is-active"
      : "contract-paper contract-page-panel";
    panel.id = `contract-page-${part.number}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `contract-tab-${part.number}`);
    panel.setAttribute("data-contract-page", String(pageIndex));
    panel.hidden = pageIndex !== 0;

    const summary = document.createElement("header");
    summary.className = "contract-part__summary";
    const partLabel = createTextElement("p", `PART ${part.number}`, "contract-part__number");
    const partTitle = createTextElement("p", part.title, "contract-part__title");
    const partSummary = createTextElement("p", part.summary, "contract-part__description");
    summary.append(partLabel, partTitle, partSummary);

    const highlights = document.createElement("section");
    highlights.className = "contract-part__highlights";
    highlights.setAttribute("aria-label", `${part.title}條款重點`);
    highlights.append(createTextElement("p", "本頁條款重點", "contract-part__highlights-label"));

    const body = document.createElement("div");
    body.className = "contract-part__body";
    panel.append(summary, highlights, body);
    contract.append(panel);
    pages.push({ panel, highlights, body });
  }

  const lines = contractSource.split("\n");
  let headingIndex = 0;
  let currentPartIndex = 0;
  let currentParagraph = [];

  function appendParagraph() {
    if (currentParagraph.length === 0) return;
    pages[currentPartIndex].body.append(
      createContractParagraph(currentParagraph.join("\n"), highlightRules),
    );
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
      currentPartIndex = resolveContractPartIndex(headingText, currentPartIndex, contractType);
      const heading = createTextElement(`h${renderedLevel}`, headingText);
      const id = resolveContractSectionId(headingText, headingIndex);
      heading.id = id;
      pages[currentPartIndex].body.append(heading);
      continue;
    }

    if (line === "---") {
      appendParagraph();
      pages[currentPartIndex].body.append(document.createElement("hr"));
      continue;
    }
    if (line.trim() === "") {
      appendParagraph();
      continue;
    }
    currentParagraph.push(line);
  }
  appendParagraph();
  return pages;
}

function initialiseContractPager(pages, parts = CONTRACT_PARTS) {
  if (
    !pages ||
    pages.length !== parts.length ||
    typeof document.querySelectorAll !== "function"
  ) {
    return;
  }

  const tabs = Array.from(document.querySelectorAll("[data-contract-tab]"));
  if (tabs.length !== parts.length) return;

  const previousButton = document.querySelector("[data-contract-previous]");
  const nextButton = document.querySelector("[data-contract-next]");
  const currentNumber = document.querySelector("[data-contract-current]");
  const currentTitle = document.querySelector("[data-contract-current-title]");
  const progress = document.querySelector("[data-contract-progress]");
  const scrollOwner = document.querySelector("[data-contract]");
  const scrollPositions = new Array(parts.length).fill(0);
  let currentIndex = 0;
  let cleanupTimer = null;

  function clearMotionClasses() {
    for (let index = 0; index < pages.length; index += 1) {
      pages[index].panel.classList.remove(
        "is-entering-next",
        "is-leaving-next",
        "is-entering-previous",
        "is-leaving-previous",
      );
      if (index !== currentIndex) pages[index].panel.hidden = true;
    }
  }

  function updateControls() {
    const part = parts[currentIndex];
    for (let index = 0; index < tabs.length; index += 1) {
      const selected = index === currentIndex;
      tabs[index].setAttribute("aria-selected", selected ? "true" : "false");
      tabs[index].tabIndex = selected ? 0 : -1;
    }
    if (previousButton) previousButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex === parts.length - 1;
    if (currentNumber) currentNumber.textContent = part.number;
    if (currentTitle) currentTitle.textContent = part.title;
    if (progress) progress.textContent = part.number;
  }

  function activatePage(nextIndex, focusTab = false) {
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= pages.length) return;
    const direction = resolveContractPageDirection(currentIndex, nextIndex);
    if (direction === "current") {
      if (focusTab) tabs[nextIndex].focus();
      return;
    }

    if (cleanupTimer !== null && typeof window.clearTimeout === "function") {
      window.clearTimeout(cleanupTimer);
    }
    clearMotionClasses();

    const outgoing = pages[currentIndex].panel;
    const incoming = pages[nextIndex].panel;
    if (scrollOwner) scrollPositions[currentIndex] = scrollOwner.scrollTop;
    outgoing.classList.remove("is-active");
    outgoing.classList.add(`is-leaving-${direction}`);
    incoming.hidden = false;
    if (scrollOwner) scrollOwner.scrollTop = scrollPositions[nextIndex];
    incoming.classList.add("is-active", `is-entering-${direction}`);
    currentIndex = nextIndex;
    updateControls();
    if (focusTab) tabs[nextIndex].focus();

    if (typeof window.setTimeout === "function") {
      cleanupTimer = window.setTimeout(() => {
        clearMotionClasses();
        cleanupTimer = null;
      }, 360);
    }
  }

  for (let index = 0; index < tabs.length; index += 1) {
    tabs[index].addEventListener("click", () => activatePage(index));
    tabs[index].addEventListener("keydown", (event) => {
      let targetIndex = currentIndex;
      if (event.key === "ArrowDown") targetIndex = Math.min(currentIndex + 1, tabs.length - 1);
      else if (event.key === "ArrowUp") targetIndex = Math.max(currentIndex - 1, 0);
      else if (event.key === "Home") targetIndex = 0;
      else if (event.key === "End") targetIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      activatePage(targetIndex, true);
    });
  }

  if (previousButton) {
    previousButton.addEventListener("click", () => activatePage(currentIndex - 1));
  }
  if (nextButton) {
    nextButton.addEventListener("click", () => activatePage(currentIndex + 1));
  }
  updateControls();
}

function applyContractView(config) {
  document.body?.setAttribute("data-contract-type", config.type);

  const title = document.querySelector("[data-contract-view-title]");
  const versionLabel = document.querySelector("[data-contract-version-label]");
  const version = document.querySelector("[data-contract-version]");
  const legalLabel = document.querySelector("[data-contract-legal-label]");
  const boundaryNotice = document.querySelector("[data-contract-boundary]");
  const availability = document.querySelector("[data-contract-availability]");
  const reader = document.querySelector("[data-contract-reader]");
  const flowLink = document.querySelector("[data-contract-flow-link]");

  if (title) title.textContent = config.title;
  if (versionLabel) versionLabel.textContent = config.versionLabel;
  if (version) version.textContent = config.version;
  if (legalLabel) legalLabel.textContent = config.legalLabel;
  if (boundaryNotice) boundaryNotice.textContent = config.boundaryNotice;
  if (availability) availability.textContent = config.availability;
  if (reader) reader.setAttribute("aria-label", `${config.title}完整條文`);

  if (flowLink) {
    flowLink.textContent = config.showEngineeringSections ? "確認流程" : "簽署前提";
    flowLink.href = config.showEngineeringSections ? "#contract-flow" : "#signing-readiness";
  }

  const links = typeof document.querySelectorAll === "function"
    ? Array.from(document.querySelectorAll("[data-contract-type-link]"))
    : [];
  for (let index = 0; index < links.length; index += 1) {
    const selected = links[index].getAttribute("data-contract-type-link") === config.type;
    links[index].setAttribute("aria-current", selected ? "page" : "false");
    links[index].classList.toggle("is-active", selected);
  }

  const tabs = typeof document.querySelectorAll === "function"
    ? Array.from(document.querySelectorAll("[data-contract-tab]"))
    : [];
  for (let index = 0; index < tabs.length && index < config.parts.length; index += 1) {
    const label = tabs[index].querySelector?.(".contract-page-tab__label");
    if (label) label.textContent = config.parts[index].title;
  }

  const engineeringOnly = typeof document.querySelectorAll === "function"
    ? Array.from(document.querySelectorAll("[data-engineering-only]"))
    : [];
  for (let index = 0; index < engineeringOnly.length; index += 1) {
    engineeringOnly[index].hidden = !config.showEngineeringSections;
  }

  if (typeof document.title === "string") {
    document.title = `${config.title}｜${config.versionLabel}`;
  }
  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute(
      "content",
      `${config.title}：完整閱讀服務範圍、責任邊界、費用、版本與案件紀錄規則。`,
    );
  }
}

function renderContractLoadFailure(config) {
  const contract = document.querySelector("[data-contract]");
  if (!contract) return;
  if (typeof contract.replaceChildren === "function") contract.replaceChildren();
  else if (Array.isArray(contract.children)) contract.children.length = 0;
  const panel = document.createElement("article");
  panel.className = "contract-paper contract-source-error";
  panel.setAttribute("role", "alert");
  panel.append(
    createTextElement("p", "契約內容目前無法驗證", "contract-source-error__title"),
    createTextElement(
      "p",
      `${config.title}的來源完整性尚未通過確認。請重新整理後再試；目前不提供接受或簽署。`,
    ),
  );
  contract.append(panel);
}

function renderReadiness(readiness, config = CONTRACT_VIEW_CONFIGS.engineering) {
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
    : config.readinessSummary;
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

  caseStatus.textContent = "同版確認與 DRS 意見處理已完成";
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

async function initialisePage() {
  const locationLike = globalThis.location ?? globalThis.window?.location ?? {};
  const contractType = resolveContractTypeFromLocation(locationLike);
  const config = CONTRACT_VIEW_CONFIGS[contractType];
  applyContractView(config);

  let contractSource = CONTRACT_SOURCE;
  if (contractType === CONTRACT_TYPES.DESIGN) {
    try {
      contractSource = await loadDesignContractSource();
    } catch {
      renderContractLoadFailure(config);
      const failedReadiness = evaluateSigningReadiness(INITIAL_SIGNING_ENVELOPE);
      renderReadiness(failedReadiness, config);
      return;
    }
  }

  const contractPages = renderContract(
    contractSource,
    contractType,
    config.parts,
    config.highlightRules,
  );
  renderKeyClauses(contractPages, config.keyClauses, contractType);
  initialiseContractPager(contractPages, config.parts);
  renderFailureStates();
  renderContractContext(resolveContractContext(INITIAL_CONTRACT_CONTEXT));
  const readiness = evaluateSigningReadiness(INITIAL_SIGNING_ENVELOPE);
  renderReadiness(readiness, config);

  const printButton = document.querySelector("[data-print-button]");
  if (printButton) {
    printButton.addEventListener("click", () => window.print());
  }

  const lifecycle = document.querySelector("[data-lifecycle]");
  if (lifecycle) {
    lifecycle.textContent = contractType === CONTRACT_TYPES.DESIGN
      ? "候選草案 · 法務與政策待確認"
      : LIFECYCLE[0] === "DRAFT"
        ? "v0.4 法務審閱稿 · 尚未進入簽署"
        : "尚未開始";
  }
}

if (typeof document !== "undefined") initialisePage();
