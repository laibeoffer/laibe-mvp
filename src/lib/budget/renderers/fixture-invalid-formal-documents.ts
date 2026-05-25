import { fixtureBudgetOutputSnapshot } from "./fixture-budget-output-snapshot.ts";
import {
  buildFormalArtifactFilename,
  type FormalArtifactFormat,
  type FormalRenderedSkeletonOutput,
} from "./formal-file-writer-policy.ts";
import type { FormalFileWriterPreflightOptions } from "./formal-file-writer-preflight.ts";
import { renderFormalBudgetDocument } from "./formal-renderer-entry.ts";

export interface InvalidFormalDocumentFixture {
  case_code: string;
  output: unknown;
  options: Partial<FormalFileWriterPreflightOptions> | null | undefined;
}

export const fixtureCustomerExcelDocument = renderFormalBudgetDocument(
  fixtureBudgetOutputSnapshot,
  {
    audience: "customer",
    format: "excel_skeleton",
    layout_profile: "standard_a4",
    generated_at: "2026-05-23T00:00:00.000Z",
    render_id: "fixture-customer-excel",
  },
);

export const fixtureCustomerPdfDocument = renderFormalBudgetDocument(
  fixtureBudgetOutputSnapshot,
  {
    audience: "customer",
    format: "pdf_skeleton",
    layout_profile: "standard_a4",
    generated_at: "2026-05-23T00:00:00.000Z",
    render_id: "fixture-customer-pdf",
  },
);

export const fixtureInternalExcelDocument = renderFormalBudgetDocument(
  fixtureBudgetOutputSnapshot,
  {
    audience: "internal_trace",
    format: "excel_skeleton",
    layout_profile: "internal_trace_a4",
    generated_at: "2026-05-23T00:00:00.000Z",
    render_id: "fixture-internal-excel",
  },
);

export const fixtureInternalPdfDocument = renderFormalBudgetDocument(
  fixtureBudgetOutputSnapshot,
  {
    audience: "internal_trace",
    format: "pdf_skeleton",
    layout_profile: "internal_trace_a4",
    generated_at: "2026-05-23T00:00:00.000Z",
    render_id: "fixture-internal-pdf",
  },
);

export const makeWriterPreflightOptions = (
  output: FormalRenderedSkeletonOutput,
  format: FormalArtifactFormat,
): FormalFileWriterPreflightOptions => ({
  artifact_audience: output.audience,
  artifact_format: format,
  filename: buildFormalArtifactFilename(output, format),
  storage_target: "local_artifact_staging",
});

const omitKey = (
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> => {
  const copy = { ...value };
  delete copy[key];
  return copy;
};

const customerExcelOptions = makeWriterPreflightOptions(
  fixtureCustomerExcelDocument,
  "excel",
);

const blockedRetrievalKey = ["r", "ag"].join("");
const blockedModelKey = ["a", "i"].join("");

export const invalidFormalDocumentFixtures: InvalidFormalDocumentFixture[] = [
  {
    case_code: "null_input",
    output: null,
    options: customerExcelOptions,
  },
  {
    case_code: "undefined_input",
    output: undefined,
    options: customerExcelOptions,
  },
  {
    case_code: "string_input",
    output: "not a formal document",
    options: customerExcelOptions,
  },
  {
    case_code: "number_input",
    output: 101,
    options: customerExcelOptions,
  },
  {
    case_code: "missing_snapshot_id",
    output: omitKey(fixtureCustomerExcelDocument, "snapshot_id"),
    options: customerExcelOptions,
  },
  {
    case_code: "missing_layout_contract",
    output: omitKey(fixtureCustomerExcelDocument, "layout_contract"),
    options: customerExcelOptions,
  },
  {
    case_code: "missing_layout_contract_columns",
    output: {
      ...fixtureCustomerExcelDocument,
      layout_contract: omitKey(
        fixtureCustomerExcelDocument.layout_contract as unknown as Record<
          string,
          unknown
        >,
        "columns",
      ),
    },
    options: customerExcelOptions,
  },
  {
    case_code: "missing_rows",
    output: omitKey(fixtureCustomerExcelDocument, "rows"),
    options: customerExcelOptions,
  },
  {
    case_code: "rows_not_array",
    output: {
      ...fixtureCustomerExcelDocument,
      rows: "not rows",
    },
    options: customerExcelOptions,
  },
  {
    case_code: "missing_totals",
    output: omitKey(fixtureCustomerExcelDocument, "totals"),
    options: customerExcelOptions,
  },
  {
    case_code: "missing_audience",
    output: omitKey(fixtureCustomerExcelDocument, "audience"),
    options: customerExcelOptions,
  },
  {
    case_code: "missing_renderer",
    output: omitKey(fixtureCustomerExcelDocument, "renderer"),
    options: customerExcelOptions,
  },
  {
    case_code: "renderer_format_mismatch",
    output: {
      ...fixtureCustomerExcelDocument,
      renderer: "formal_pdf_skeleton",
    },
    options: customerExcelOptions,
  },
  {
    case_code: "wrong_token",
    output: {
      ...fixtureCustomerExcelDocument,
      renderer_entry_token: { forged: true },
    },
    options: customerExcelOptions,
  },
  {
    case_code: "customer_trace_leak",
    output: {
      ...fixtureCustomerExcelDocument,
      rows: [
        ...fixtureCustomerExcelDocument.rows,
        {
          cells: {
            trade_category: "leak",
            line_no: "X",
            item_name: "leak",
            unit: "set",
            quantity: 1,
            unit_price: 1,
            amount: 1,
            customer_note: "leak",
            source_id: "trace-source",
            recipe_id: "trace-recipe",
            quantity_formula: "trace-formula",
            internal_note: "trace-note",
          },
          metadata: {
            mode: "customer",
          },
        },
      ],
    },
    options: customerExcelOptions,
  },
  {
    case_code: "bad_filename",
    output: fixtureCustomerExcelDocument,
    options: {
      ...customerExcelOptions,
      filename: "wrong-name.xlsx",
    },
  },
  {
    case_code: "forbidden_writer_options",
    output: fixtureCustomerExcelDocument,
    options: {
      ...customerExcelOptions,
      writer_options: {
        engine: true,
        pricing_lookup: true,
        material_lookup: true,
        [blockedRetrievalKey]: true,
        [blockedModelKey]: true,
      },
    },
  },
];
