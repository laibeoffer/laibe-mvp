import {
  CONTRACT_META,
  CONTRACT_SOURCE,
  KEY_CLAUSES,
  LIFECYCLE,
} from "./contract-content.js";

const SHA256 = /^[a-f0-9]{64}$/;

const SECTION_ID_MAP = Object.freeze([
  ["萊比 LaiBE AI PCM 案件治理資訊服務契約", "contract-title"],
  ["第一條", "article-01"], ["第二條", "article-02"], ["第三條", "article-03"],
  ["第四條", "article-04"], ["第五條", "article-05"], ["第六條", "article-06"],
  ["第七條", "article-07"], ["第八條", "article-08"], ["第九條", "article-09"],
  ["第十條", "article-10"], ["第十一條", "article-11"], ["第十二條", "article-12"],
  ["第十三條", "article-13"], ["第十四條", "article-14"], ["第十五條", "article-15"],
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

export function evaluateSigningReadiness(input = {}) {
  const reasons = [];

  if (!SHA256.test(input.contractVersionHash ?? "")) {
    reasons.push("正式契約版本尚未固定");
  }
  if (input.ownerIdentityVerified !== true || !input.ownerPartyId?.trim()) {
    reasons.push("甲方身分尚未完成確認");
  }

  const provider = input.serviceProviderPartySnapshot;
  if (
    provider?.partyType !== "natural_person" ||
    !provider.partyId?.trim() ||
    !provider.signatoryActorId?.trim()
  ) {
    reasons.push("自然人服務方資料尚未完成確認");
  }
  if (input.writerReady !== true) {
    reasons.push("正式簽署紀錄功能尚未就緒");
  }
  if (input.legalReviewStatus !== "LEGAL_FINAL") {
    reasons.push("契約仍在法務審閱中");
  }

  return Object.freeze({
    ready: reasons.length === 0,
    reasons: Object.freeze(reasons),
  });
}

function createTextElement(tagName, text, className) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function sectionIdFor(heading, fallbackIndex) {
  for (let index = 0; index < SECTION_ID_MAP.length; index += 1) {
    const [label, id] = SECTION_ID_MAP[index];
    if (heading.startsWith(label)) return id;
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
    anchor.href = `#${sectionIdFor(clause.anchor, index + 1)}`;
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
      const headingText = headingMatch[2];
      const heading = createTextElement(`h${level}`, headingText);
      const id = sectionIdFor(headingText, headingIndex);
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

  signButton.disabled = !readiness.ready;
  signButton.setAttribute("aria-disabled", String(!readiness.ready));
  summary.textContent = readiness.ready
    ? "簽署前提已確認，可進入下一步。"
    : "目前仍有簽署前提待確認，請先閱讀並列印留存本份草稿。";
}

function initialisePage() {
  renderKeyClauses();
  renderContract();
  const readiness = evaluateSigningReadiness(INITIAL_SIGNING_ENVELOPE);
  renderReadiness(readiness);

  const printButton = document.querySelector("[data-print-button]");
  if (printButton) {
    printButton.addEventListener("click", () => window.print());
  }

  const lifecycle = document.querySelector("[data-lifecycle]");
  if (lifecycle) lifecycle.textContent = LIFECYCLE[0] === "DRAFT" ? "草稿" : "尚未開始";
}

if (typeof document !== "undefined") initialisePage();
