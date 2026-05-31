import type {
  BudgetRenderFormat,
  BudgetRenderMode,
  RenderSnapshotOptions,
} from "./types.ts";

export interface RenderOptionValidationReport {
  valid: boolean;
  errors: string[];
  options: RenderSnapshotOptions | null;
}

const allowedModes: BudgetRenderMode[] = ["customer", "internal_trace"];

const allowedFormats: BudgetRenderFormat[] = [
  "structured_rows",
  "html_skeleton",
  "csv_skeleton",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const assertValidRenderFormat = (
  value: unknown,
): BudgetRenderFormat => {
  if (allowedFormats.includes(value as BudgetRenderFormat)) {
    return value as BudgetRenderFormat;
  }

  throw new Error(
    `Unknown render format: ${String(
      value,
    )}. Allowed formats: ${allowedFormats.join(", ")}.`,
  );
};

export const validateRenderOptions = (
  options: unknown,
): RenderOptionValidationReport => {
  if (!isRecord(options)) {
    return {
      valid: false,
      errors: ["Render options must be an object."],
      options: null,
    };
  }

  const errors: string[] = [];
  const mode = allowedModes.includes(options.mode as BudgetRenderMode)
    ? (options.mode as BudgetRenderMode)
    : null;
  const format = allowedFormats.includes(options.format as BudgetRenderFormat)
    ? (options.format as BudgetRenderFormat)
    : null;

  if (!mode) {
    errors.push(
      `Unknown render mode: ${String(
        options.mode,
      )}. Allowed modes: ${allowedModes.join(", ")}.`,
    );
  }

  if (!format) {
    errors.push(
      `Unknown render format: ${String(
        options.format,
      )}. Allowed formats: ${allowedFormats.join(", ")}.`,
    );
  }

  if (errors.length > 0 || !mode || !format) {
    return { valid: false, errors, options: null };
  }

  return {
    valid: true,
    errors: [],
    options: {
      mode,
      format,
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

export const assertValidRenderOptions = (
  options: unknown,
): RenderSnapshotOptions => {
  const report = validateRenderOptions(options);

  if (!report.valid || !report.options) {
    throw new Error(`Invalid render options: ${report.errors.join("; ")}`);
  }

  return report.options;
};
