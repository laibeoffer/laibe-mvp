import {
  BASIC_REPORT_SECTIONS,
  createBasicReport,
} from "../public/basic-report-contract.js";

const SECTION_LABELS = new Map(
  BASIC_REPORT_SECTIONS.map(({ id, label }) => [id, label]),
);

function setText(root, selector, value) {
  const target = root.querySelector(selector);
  if (target) {
    target.textContent = value;
  }
}

function createCitationNode(documentRef, citation) {
  const item = documentRef.createElement("li");
  item.className = "citation-chip";
  item.dataset.documentId = citation.documentId;
  item.dataset.documentVersion = citation.version;

  const label = documentRef.createElement("span");
  label.textContent = citation.documentLabel;

  const version = documentRef.createElement("strong");
  version.textContent = citation.version;

  item.append(label, version);
  return item;
}

function createFindingNode(documentRef, finding) {
  const item = documentRef.createElement("article");
  item.className = "report-result";
  item.dataset.reportSection = finding.section;

  const section = documentRef.createElement("p");
  section.className = "report-result__section";
  section.textContent = SECTION_LABELS.get(finding.section);

  const title = documentRef.createElement("h3");
  title.textContent = finding.title;

  const detail = documentRef.createElement("p");
  detail.className = "report-result__detail";
  detail.textContent = finding.detail;

  const citationLabel = documentRef.createElement("p");
  citationLabel.className = "report-result__citation-label";
  citationLabel.textContent = "引用文件與版次";

  const citations = documentRef.createElement("ul");
  citations.className = "citation-list";
  finding.citations.forEach((citation) => {
    citations.append(createCitationNode(documentRef, citation));
  });

  item.append(section, title, detail, citationLabel, citations);
  return item;
}

export function applyBasicReport(
  root,
  reportData = globalThis.PCM_BASIC_REPORT_DATA,
) {
  if (!root) {
    return null;
  }

  const results = root.querySelector("[data-report-results]");
  const empty = root.querySelector("[data-report-empty]");

  if (!reportData) {
    root.documentElement?.setAttribute("data-report-state", "empty");
    return null;
  }

  let report;
  try {
    report = createBasicReport(reportData);
  } catch {
    root.documentElement?.setAttribute("data-report-state", "unavailable");
    setText(
      root,
      "[data-report-empty-title]",
      "這份報告目前無法顯示",
    );
    setText(
      root,
      "[data-report-empty-copy]",
      "請回到文件準備頁確認文件版本，萊比會在資料確認後重新整理。",
    );
    return null;
  }

  setText(root, "[data-report-status]", "基本報告已發布");
  setText(root, "[data-report-actor]", report.actor);
  setText(root, "[data-report-next-action]", report.nextAction);

  if (results) {
    results.replaceChildren();
    report.findings.forEach((finding) => {
      results.append(createFindingNode(root, finding));
    });
    results.hidden = report.findings.length === 0;
  }

  if (empty) {
    empty.hidden = report.findings.length > 0;
  }

  root.documentElement?.setAttribute(
    "data-report-state",
    report.findings.length > 0 ? "published" : "empty",
  );
  return report;
}

if (typeof document !== "undefined") {
  applyBasicReport(document);
  document.body.classList.add("is-ready");
}
