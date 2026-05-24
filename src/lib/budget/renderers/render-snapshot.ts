import type { BudgetOutputSnapshot } from "../output/types.ts";
import { assertSnapshotRenderableForRenderer } from "./assert-snapshot-renderable-for-renderer.ts";
import { renderBudgetDocumentToCsvSkeleton } from "./csv-renderer-skeleton.ts";
import { renderCustomerBudgetFromSnapshot } from "./customer-budget-renderer.ts";
import { renderBudgetDocumentToHtmlSkeleton } from "./html-renderer-skeleton.ts";
import { renderInternalTraceFromSnapshot } from "./internal-trace-renderer.ts";
import { assertValidRenderOptions } from "./validate-render-options.ts";
import type {
  RenderedBudgetDocument,
  RenderSnapshotOptions,
  RenderSnapshotResult,
} from "./types.ts";

export const renderSnapshot = (
  snapshot: BudgetOutputSnapshot,
  options: RenderSnapshotOptions,
): RenderSnapshotResult => {
  const gate = assertSnapshotRenderableForRenderer(snapshot, {
    requireCustomerView: true,
  });
  if (!gate.allowed) {
    throw new Error(
      `Snapshot is not renderable: ${gate.errors.join("; ")}`,
    );
  }

  const renderOptions = assertValidRenderOptions(options);
  if (renderOptions.mode === "internal_trace") {
    const internalGate = assertSnapshotRenderableForRenderer(snapshot, {
      requireCustomerView: true,
      requireInternalView: true,
    });
    if (!internalGate.allowed) {
      throw new Error(
        `Snapshot is not renderable for internal trace: ${internalGate.errors.join("; ")}`,
      );
    }
  }

  const rendererOptions = {
    format: renderOptions.format,
    generated_at: renderOptions.generated_at,
    render_id: renderOptions.render_id,
    title: renderOptions.title,
  };
  const document: RenderedBudgetDocument =
    renderOptions.mode === "customer"
      ? renderCustomerBudgetFromSnapshot(snapshot, rendererOptions)
      : renderInternalTraceFromSnapshot(snapshot, rendererOptions);

  if (renderOptions.format === "structured_rows") {
    return document;
  }
  if (renderOptions.format === "html_skeleton") {
    return renderBudgetDocumentToHtmlSkeleton(document);
  }
  return renderBudgetDocumentToCsvSkeleton(document);
};
