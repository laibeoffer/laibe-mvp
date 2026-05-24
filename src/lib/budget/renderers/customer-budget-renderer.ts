import type { BudgetOutputSnapshot } from "../output/types.ts";
import { assertSnapshotRenderableForRenderer } from "./assert-snapshot-renderable-for-renderer.ts";
import { sanitizeCustomerWarnings } from "./customer-warning-sanitizer.ts";
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
  `budget-render-customer-${sanitizeIdPart(snapshot.snapshot_id)}-${sanitizeIdPart(
    generatedAt,
  )}`;

const unique = (values: string[]): string[] => [...new Set(values)];

const toCustomerRow = (line: {
  trade_category: string;
  line_no: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  customer_note: string;
}): RenderedBudgetRow => ({
  cells: {
    工程類別: line.trade_category,
    項次: line.line_no,
    品名: line.item_name,
    單位: line.unit,
    數量: line.quantity,
    單價: line.unit_price,
    金額: line.amount,
    備註: line.customer_note,
  },
  metadata: {
    mode: "customer",
    trade_category: line.trade_category,
  },
});

export const renderCustomerBudgetFromSnapshot = (
  snapshot: BudgetOutputSnapshot,
  options: BudgetRendererOptions = {},
): RenderedBudgetDocument => {
  const gate = assertSnapshotRenderableForRenderer(snapshot, {
    requireCustomerView: true,
  });
  if (!gate.allowed) {
    throw new Error(
      `Snapshot is not renderable for customer budget: ${gate.errors.join("; ")}`,
    );
  }

  const format = assertValidRenderFormat(options.format ?? "structured_rows");
  const generatedAt = options.generated_at ?? new Date().toISOString();
  const rows = snapshot.customer_view.flatMap((group) =>
    group.lines.map(toCustomerRow),
  );

  return {
    renderer_contract: "snapshot_gated_renderer",
    render_id: options.render_id ?? makeRenderId(snapshot, generatedAt),
    snapshot_id: snapshot.snapshot_id,
    project_id: snapshot.project_id,
    estimate_id: snapshot.estimate_id,
    estimate_stage: snapshot.estimate_stage,
    mode: "customer",
    format,
    generated_at: generatedAt,
    title: options.title ?? "客戶預算表",
    rows,
    totals: snapshot.totals,
    warnings: sanitizeCustomerWarnings(
      unique([...snapshot.warnings, ...gate.warnings]),
    ),
  };
};
