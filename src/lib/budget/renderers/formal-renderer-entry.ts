import type { BudgetOutputSnapshot } from "../output/types.ts";
import { assertSnapshotRenderableForRenderer } from "./assert-snapshot-renderable-for-renderer.ts";
import { renderFormalExcelSkeleton } from "./formal-excel-renderer-skeleton.ts";
import {
  getFormalLayoutContract,
  type FormalSkeletonInput,
} from "./formal-layout-contract.ts";
import { createFormalRendererToken } from "./formal-renderer-token.ts";
import {
  renderFormalPdfSkeleton,
  type FormalPdfSkeletonOutput,
} from "./formal-pdf-renderer-skeleton.ts";
import { renderSnapshot } from "./render-snapshot.ts";
import type {
  FormalLayoutProfile,
  FormalRendererAudience,
  FormalRendererFormat,
  FormalRendererOptions,
  RenderedBudgetDocument,
} from "./types.ts";
import type { FormalExcelSkeletonOutput } from "./formal-excel-renderer-skeleton.ts";

export type FormalRendererOutput =
  | FormalExcelSkeletonOutput
  | FormalPdfSkeletonOutput;

interface FormalRendererOptionValidationReport {
  valid: boolean;
  errors: string[];
  options: FormalRendererOptions | null;
}

const allowedAudiences: FormalRendererAudience[] = [
  "customer",
  "internal_trace",
];
const allowedFormats: FormalRendererFormat[] = [
  "excel_skeleton",
  "pdf_skeleton",
];
const allowedLayoutProfiles: FormalLayoutProfile[] = [
  "standard_a4",
  "compact_a4",
  "internal_trace_a4",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const sanitizeIdPart = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");

const makeRenderId = (
  snapshot: BudgetOutputSnapshot,
  options: FormalRendererOptions,
  generatedAt: string,
): string =>
  `formal-render-${options.format}-${options.audience}-${sanitizeIdPart(
    snapshot.snapshot_id,
  )}-${sanitizeIdPart(generatedAt)}`;

const validateFormalRendererOptions = (
  options: unknown,
): FormalRendererOptionValidationReport => {
  const errors: string[] = [];

  if (!isRecord(options)) {
    return {
      valid: false,
      errors: ["Formal renderer options must be an object."],
      options: null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(options, "methodSpecCatalog")) {
    errors.push(
      "Formal renderer options do not accept methodSpecCatalog. Use a prebuilt BudgetOutputSnapshot.",
    );
  }

  const audience = allowedAudiences.includes(
    options.audience as FormalRendererAudience,
  )
    ? (options.audience as FormalRendererAudience)
    : null;
  const format = allowedFormats.includes(options.format as FormalRendererFormat)
    ? (options.format as FormalRendererFormat)
    : null;
  const layoutProfile = allowedLayoutProfiles.includes(
    options.layout_profile as FormalLayoutProfile,
  )
    ? (options.layout_profile as FormalLayoutProfile)
    : null;

  if (!audience) {
    errors.push(
      `Unknown formal renderer audience: ${String(
        options.audience,
      )}. Allowed audiences: ${allowedAudiences.join(", ")}.`,
    );
  }

  if (!format) {
    errors.push(
      `Unknown formal renderer format: ${String(
        options.format,
      )}. Allowed formats: ${allowedFormats.join(", ")}.`,
    );
  }

  if (!layoutProfile) {
    errors.push(
      `Unknown formal layout profile: ${String(
        options.layout_profile,
      )}. Allowed layout profiles: ${allowedLayoutProfiles.join(", ")}.`,
    );
  }

  if (audience === "customer" && layoutProfile === "internal_trace_a4") {
    errors.push("Customer renderer cannot use internal_trace_a4 layout.");
  }

  if (
    audience === "internal_trace" &&
    layoutProfile &&
    layoutProfile !== "internal_trace_a4"
  ) {
    errors.push("Internal trace renderer must use internal_trace_a4 layout.");
  }

  if (errors.length > 0 || !audience || !format || !layoutProfile) {
    return {
      valid: false,
      errors,
      options: null,
    };
  }

  return {
    valid: true,
    errors: [],
    options: {
      audience,
      format,
      layout_profile: layoutProfile,
      generated_at:
        typeof options.generated_at === "string"
          ? options.generated_at
          : undefined,
      render_id:
        typeof options.render_id === "string" ? options.render_id : undefined,
      title: typeof options.title === "string" ? options.title : undefined,
    },
  };
};

const assertValidFormalRendererOptions = (
  options: unknown,
): FormalRendererOptions => {
  const report = validateFormalRendererOptions(options);

  if (!report.valid || !report.options) {
    throw new Error(`Invalid formal renderer options: ${report.errors.join("; ")}`);
  }

  return report.options;
};

export const renderFormalBudgetDocument = (
  snapshot: BudgetOutputSnapshot,
  options: FormalRendererOptions,
): FormalRendererOutput => {
  const gate = assertSnapshotRenderableForRenderer(snapshot);
  if (!gate.allowed) {
    throw new Error(
      `Snapshot is not renderable for formal renderer: ${gate.errors.join("; ")}`,
    );
  }

  const formalOptions = assertValidFormalRendererOptions(options);
  if (formalOptions.audience === "internal_trace") {
    const traceGate = assertSnapshotRenderableForRenderer(snapshot, {
      requireCustomerView: true,
      requireInternalView: true,
    });
    if (!traceGate.allowed) {
      throw new Error(
        `Snapshot is not renderable for formal internal trace renderer: ${traceGate.errors.join("; ")}`,
      );
    }
  }

  const generatedAt = formalOptions.generated_at ?? new Date().toISOString();
  const renderId =
    formalOptions.render_id ?? makeRenderId(snapshot, formalOptions, generatedAt);
  const layoutContract = getFormalLayoutContract(
    formalOptions.audience,
    formalOptions.layout_profile,
  );
  const document = renderSnapshot(snapshot, {
    mode: formalOptions.audience,
    format: "structured_rows",
    generated_at: generatedAt,
    render_id: renderId,
    title: formalOptions.title,
  }) as RenderedBudgetDocument;
  const input: FormalSkeletonInput = {
    renderer_entry_token: createFormalRendererToken(),
    snapshot,
    document,
    layout_contract: layoutContract,
    generated_at: generatedAt,
    render_id: renderId,
    title: formalOptions.title ?? document.title,
  };

  return formalOptions.format === "excel_skeleton"
    ? renderFormalExcelSkeleton(input)
    : renderFormalPdfSkeleton(input);
};
