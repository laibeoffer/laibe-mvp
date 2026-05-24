import type { RenderedBudgetDocument } from "./types.ts";

export const HTML_SERIALIZER_NOTICE =
  "DOCUMENT_SERIALIZER_ONLY_USE_RENDER_SNAPSHOT_FOR_SNAPSHOT_INPUT";

const CUSTOMER_FORBIDDEN_KEYS = new Set([
  "item_code",
  "source_type",
  "source_id",
  "recipe_id",
  "material_code",
  "quantity_formula",
  "price_source",
  "confidence",
  "requires_review",
  "internal_note",
  "inclusions",
  "exclusions",
  "assumptions",
  "risks",
]);

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getHeaders = (document: RenderedBudgetDocument): string[] => [
  ...new Set(document.rows.flatMap((row) => Object.keys(row.cells))),
];

const assertCustomerDocumentSafe = (
  document: RenderedBudgetDocument,
): void => {
  if (document.mode !== "customer") {
    return;
  }

  const leakedKey = document.rows
    .flatMap((row) => Object.keys(row.cells))
    .find((key) => CUSTOMER_FORBIDDEN_KEYS.has(key));

  if (leakedKey) {
    throw new Error(`Customer HTML skeleton contains internal field: ${leakedKey}`);
  }
};

const assertSerializerDocument = (document: RenderedBudgetDocument): void => {
  if (document.renderer_contract !== "snapshot_gated_renderer") {
    throw new Error("HTML skeleton requires a snapshot-gated render document.");
  }
  if (!document.snapshot_id || !document.estimate_id || !document.project_id) {
    throw new Error("HTML skeleton document is missing required identifiers.");
  }
};

export const renderBudgetDocumentToHtmlSkeleton = (
  document: RenderedBudgetDocument,
): string => {
  assertSerializerDocument(document);
  assertCustomerDocumentSafe(document);

  const headers = getHeaders(document);
  const headerHtml = headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");
  const rowHtml = document.rows
    .map((row) => {
      const cells = headers
        .map((header) => `<td>${escapeHtml(row.cells[header])}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const warningsHtml = document.warnings.length
    ? `<ul>${document.warnings
        .map((warning) => `<li>${escapeHtml(warning)}</li>`)
        .join("")}</ul>`
    : "";

  return [
    "<!doctype html>",
    '<html lang="zh-Hant">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${escapeHtml(document.title)}</title>`,
    "</head>",
    "<body>",
    `<h1>${escapeHtml(document.title)}</h1>`,
    `<p>Estimate: ${escapeHtml(document.estimate_id)} / Stage: ${escapeHtml(
      document.estimate_stage,
    )}</p>`,
    `<p>Total: ${escapeHtml(document.totals.total_amount)}</p>`,
    warningsHtml,
    "<table>",
    `<thead><tr>${headerHtml}</tr></thead>`,
    `<tbody>${rowHtml}</tbody>`,
    "</table>",
    "</body>",
    "</html>",
  ].join("");
};
