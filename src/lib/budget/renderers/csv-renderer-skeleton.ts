import type { RenderedBudgetDocument, RenderedBudgetCellValue } from "./types.ts";

export const CSV_SERIALIZER_NOTICE =
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

const getHeaders = (document: RenderedBudgetDocument): string[] => [
  ...new Set(document.rows.flatMap((row) => Object.keys(row.cells))),
];

const escapeCsvCell = (value: RenderedBudgetCellValue): string => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

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
    throw new Error(`Customer CSV skeleton contains internal field: ${leakedKey}`);
  }
};

const assertSerializerDocument = (document: RenderedBudgetDocument): void => {
  if (document.renderer_contract !== "snapshot_gated_renderer") {
    throw new Error("CSV skeleton requires a snapshot-gated render document.");
  }
  if (!document.snapshot_id || !document.estimate_id || !document.project_id) {
    throw new Error("CSV skeleton document is missing required identifiers.");
  }
};

export const renderBudgetDocumentToCsvSkeleton = (
  document: RenderedBudgetDocument,
): string => {
  assertSerializerDocument(document);
  assertCustomerDocumentSafe(document);

  const headers = getHeaders(document);
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...document.rows.map((row) =>
      headers.map((header) => escapeCsvCell(row.cells[header])).join(","),
    ),
  ];

  return lines.join("\n");
};
