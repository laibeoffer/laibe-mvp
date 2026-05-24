import { validateBudgetOutputSnapshot } from "./budget-output-validator.ts";
import type {
  BudgetOutputSnapshot,
  RendererGateOptions,
  RendererGateResult,
} from "./types.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringField = (
  snapshot: Partial<BudgetOutputSnapshot> | null | undefined,
  field: keyof BudgetOutputSnapshot,
): string | null => {
  if (!isRecord(snapshot)) {
    return null;
  }

  const value = snapshot[field];
  return typeof value === "string" ? value : null;
};

const countViewLines = (view: unknown): number => {
  if (!Array.isArray(view)) {
    return 0;
  }

  return view.reduce((count, group) => {
    if (!isRecord(group) || !Array.isArray(group.lines)) {
      return count;
    }

    return count + group.lines.length;
  }, 0);
};

const pushUnique = (values: string[], value: string): void => {
  if (!values.includes(value)) {
    values.push(value);
  }
};

export const assertSnapshotRenderable = (
  snapshot: Partial<BudgetOutputSnapshot> | null | undefined,
  options: RendererGateOptions = {},
): RendererGateResult => {
  const requireCustomerView = options.requireCustomerView ?? true;
  const requireInternalView = options.requireInternalView ?? false;
  const validationReport = validateBudgetOutputSnapshot(
    snapshot,
    options.methodSpecCatalog,
  );
  const errors = [...validationReport.errors];

  if (requireCustomerView && countViewLines(snapshot?.customer_view) === 0) {
    pushUnique(
      errors,
      "Renderer gate requires customer_view with at least one line.",
    );
  }

  if (requireInternalView && countViewLines(snapshot?.internal_view) === 0) {
    pushUnique(
      errors,
      "Renderer gate requires internal_view with at least one line.",
    );
  }

  return {
    allowed: validationReport.valid && errors.length === 0,
    errors,
    warnings: validationReport.warnings,
    snapshot_id: getStringField(snapshot, "snapshot_id"),
    estimate_id: getStringField(snapshot, "estimate_id"),
    estimate_stage: getStringField(snapshot, "estimate_stage"),
    output_version: getStringField(snapshot, "output_version"),
  };
};
