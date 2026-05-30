import { assertSnapshotRenderable } from "../output/renderer-gate.ts";
import type { BudgetOutputSnapshot, RendererGateResult } from "../output/types.ts";

export interface RendererOnlyGateOptions {
  requireCustomerView?: boolean;
  requireInternalView?: boolean;
}

const unsupportedRendererGateOptions = ["methodSpecCatalog"];

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

const getStringArrayElementErrors = (
  snapshot: Partial<BudgetOutputSnapshot> | null | undefined,
  field: keyof BudgetOutputSnapshot,
): string[] => {
  if (!isRecord(snapshot)) {
    return [];
  }

  const value = snapshot[field];
  if (!Array.isArray(value)) {
    return [];
  }

  const invalidIndexes = value
    .map((entry, index) => (typeof entry === "string" ? null : index))
    .filter((index): index is number => index !== null);

  return invalidIndexes.length > 0
    ? [
        `BudgetOutputSnapshot.${String(
          field,
        )} must contain only strings. Invalid indexes: ${invalidIndexes.join(
          ", ",
        )}.`,
      ]
    : [];
};

const makeRejectedGateResult = (
  snapshot: Partial<BudgetOutputSnapshot> | null | undefined,
  errors: string[],
): RendererGateResult => ({
  allowed: false,
  errors,
  warnings: [],
  snapshot_id: getStringField(snapshot, "snapshot_id"),
  estimate_id: getStringField(snapshot, "estimate_id"),
  estimate_stage: getStringField(snapshot, "estimate_stage"),
  output_version: getStringField(snapshot, "output_version"),
});

export const assertSnapshotRenderableForRenderer = (
  snapshot: Partial<BudgetOutputSnapshot> | null | undefined,
  options: RendererOnlyGateOptions = {},
): RendererGateResult => {
  const optionRecord = options as Record<string, unknown>;
  const unsupportedKeys = unsupportedRendererGateOptions.filter((key) =>
    Object.prototype.hasOwnProperty.call(optionRecord, key),
  );

  if (unsupportedKeys.length > 0) {
    return makeRejectedGateResult(
      snapshot,
      unsupportedKeys.map(
        (key) =>
          `Renderer-only gate does not accept option: ${key}. Use prebuilt BudgetOutputSnapshot data only.`,
      ),
    );
  }

  const gate = assertSnapshotRenderable(snapshot, {
    requireCustomerView: options.requireCustomerView ?? true,
    requireInternalView: options.requireInternalView ?? false,
  });

  const rendererOnlyErrors = getStringArrayElementErrors(snapshot, "warnings");
  if (rendererOnlyErrors.length > 0) {
    return {
      ...gate,
      allowed: false,
      errors: [...gate.errors, ...rendererOnlyErrors],
    };
  }

  return gate;
};
