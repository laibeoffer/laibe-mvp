import type { BudgetOutputSnapshot, InternalBudgetLine } from "../output/types.ts";
import { assertSnapshotRenderableForRenderer } from "./assert-snapshot-renderable-for-renderer.ts";
import type {
  BudgetRendererOptions,
  RenderedBudgetDocument,
  RenderedBudgetRow,
} from "./types.ts";
import { assertValidRenderFormat } from "./validate-render-options.ts";

const sanitizeIdPart = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");

const makeRenderId = (
  snapshot: BudgetOutputSnapshot,
  generatedAt: string,
): string =>
  `budget-render-internal-trace-${sanitizeIdPart(snapshot.snapshot_id)}-${sanitizeIdPart(
    generatedAt,
  )}`;

const unique = (values: string[]): string[] => [...new Set(values)];

const joinList = (values: string[]): string => values.join("；");

const stringifyPriceSource = (
  value: InternalBudgetLine["price_source"],
): string => JSON.stringify(value);

const toInternalTraceRow = (line: InternalBudgetLine): RenderedBudgetRow => ({
  cells: {
    工程類別: line.trade_category,
    項次: line.line_no,
    item_code: line.item_code,
    品名: line.item_name,
    source_type: line.source_type,
    source_id: line.source_id,
    recipe_id: line.recipe_id,
    material_code: line.material_code,
    quantity_formula: line.quantity_formula,
    price_source: stringifyPriceSource(line.price_source),
    confidence: line.confidence,
    requires_review: line.requires_review,
    internal_note: line.internal_note,
    inclusions: joinList(line.inclusions),
    exclusions: joinList(line.exclusions),
    assumptions: joinList(line.assumptions),
    risks: joinList(line.risks),
  },
  metadata: {
    mode: "internal_trace",
    trade_category: line.trade_category,
  },
});

export const renderInternalTraceFromSnapshot = (
  snapshot: BudgetOutputSnapshot,
  options: BudgetRendererOptions = {},
): RenderedBudgetDocument => {
  const gate = assertSnapshotRenderableForRenderer(snapshot, {
    requireCustomerView: true,
    requireInternalView: true,
  });
  if (!gate.allowed) {
    throw new Error(
      `Snapshot is not renderable for internal trace: ${gate.errors.join("; ")}`,
    );
  }

  const format = assertValidRenderFormat(options.format ?? "structured_rows");
  const generatedAt = options.generated_at ?? new Date().toISOString();
  const rows = snapshot.internal_view.flatMap((group) =>
    group.lines.map(toInternalTraceRow),
  );

  return {
    renderer_contract: "snapshot_gated_renderer",
    render_id: options.render_id ?? makeRenderId(snapshot, generatedAt),
    snapshot_id: snapshot.snapshot_id,
    project_id: snapshot.project_id,
    estimate_id: snapshot.estimate_id,
    estimate_stage: snapshot.estimate_stage,
    mode: "internal_trace",
    format,
    generated_at: generatedAt,
    title: options.title ?? "內部追溯預算表",
    rows,
    totals: snapshot.totals,
    warnings: unique([
      ...snapshot.warnings,
      ...snapshot.validation_report.warnings,
      ...gate.warnings,
    ]),
  };
};
