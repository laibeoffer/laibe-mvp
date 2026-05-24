import type { MethodSpecCatalog } from "../specs/types.ts";
import type {
  BudgetOutputSnapshot,
  BudgetOutputValidationReport,
  BudgetSheetOutput,
  CustomerBudgetLine,
} from "./types.ts";
import { resolveMaterialBindingForItem } from "./material-code-resolver.ts";

const INTERNAL_ONLY_KEYS = [
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
];

const SNAPSHOT_REQUIRED_FIELDS = [
  "snapshot_id",
  "estimate_id",
  "project_id",
  "estimate_stage",
  "output_version",
  "generated_at",
  "catalog_version",
  "customer_view",
  "internal_view",
  "totals",
  "validation_report",
  "warnings",
  "source_summary",
] as const;

const SNAPSHOT_ARRAY_FIELDS = [
  "customer_view",
  "internal_view",
  "warnings",
] as const;

const SNAPSHOT_OBJECT_FIELDS = [
  "totals",
  "validation_report",
  "source_summary",
] as const;

const amountMatches = (
  quantity: number,
  unitPrice: number,
  amount: number,
): boolean => Math.abs(Math.round(quantity * unitPrice) - amount) <= 1;

const hasInternalKey = (line: CustomerBudgetLine): string | undefined =>
  INTERNAL_ONLY_KEYS.find((key) =>
    Object.prototype.hasOwnProperty.call(line, key),
  );

const pushUniqueWarning = (warnings: string[], warning: string): void => {
  if (!warnings.includes(warning)) {
    warnings.push(warning);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isMissingRequiredValue = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim().length === 0);

export const validateBudgetSheetOutput = (
  output: BudgetSheetOutput,
  methodSpecCatalog?: MethodSpecCatalog,
): BudgetOutputValidationReport => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const customerLines = output.customer_view.flatMap((group) => group.lines);
  const internalLines = output.internal_view.flatMap((group) => group.lines);
  const materialCodes = new Set(
    methodSpecCatalog?.material_specs.map((material) => material.material_code) ??
      [],
  );

  internalLines.forEach((line) => {
    const ref = `${line.line_no} ${line.item_name}`;

    if (!line.trade_category) {
      errors.push(`${ref} missing trade_category.`);
    }
    if (!line.item_name) {
      errors.push(`${ref} missing item_name.`);
    }
    if (!line.unit) {
      errors.push(`${ref} missing unit.`);
    }
    if (!Number.isFinite(line.quantity)) {
      errors.push(`${ref} quantity is not a number.`);
    }
    if (!Number.isFinite(line.unit_price)) {
      errors.push(`${ref} unit_price is not a number.`);
    }
    if (!amountMatches(line.quantity, line.unit_price, line.amount)) {
      errors.push(`${ref} amount does not match rounded quantity * unit_price.`);
    }
    if (!line.source_type || !line.source_id || !line.recipe_id) {
      errors.push(`${ref} missing source_type/source_id/recipe_id.`);
    }
    if (
      methodSpecCatalog &&
      line.material_code &&
      !materialCodes.has(line.material_code)
    ) {
      errors.push(`${ref} material_code ${line.material_code} is not in MethodSpecCatalog.material_specs.`);
    }

    if (methodSpecCatalog && line.material_code) {
      const binding = resolveMaterialBindingForItem(
        line.item_code,
        methodSpecCatalog,
      );

      if (
        binding?.material_code === line.material_code &&
        binding.requires_review
      ) {
        pushUniqueWarning(
          warnings,
          `Material binding requires review: ${line.item_code} -> ${line.material_code}`,
        );
      }
    }

    if (line.requires_review) {
      pushUniqueWarning(warnings, `${ref} requires review.`);
      const appearsInOutputWarnings = output.warnings.some(
        (warning) =>
          warning.includes(line.line_no) || warning.includes(line.item_name),
      );
      if (!appearsInOutputWarnings) {
        errors.push(`${ref} requires_review is true but missing from output warnings.`);
      }
    }
  });

  customerLines.forEach((line) => {
    const internalKey = hasInternalKey(line);
    if (internalKey) {
      errors.push(
        `${line.line_no} ${line.item_name} customer_view leaks internal field: ${internalKey}.`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

export const validateBudgetOutputSnapshot = (
  snapshot: Partial<BudgetOutputSnapshot> | null | undefined,
  methodSpecCatalog?: MethodSpecCatalog,
): BudgetOutputValidationReport => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(snapshot)) {
    return {
      valid: false,
      errors: ["BudgetOutputSnapshot must be an object."],
      warnings,
    };
  }

  for (const field of SNAPSHOT_REQUIRED_FIELDS) {
    if (!hasOwn(snapshot, field) || isMissingRequiredValue(snapshot[field])) {
      errors.push(`BudgetOutputSnapshot missing required field: ${field}.`);
    }
  }

  for (const field of SNAPSHOT_ARRAY_FIELDS) {
    if (hasOwn(snapshot, field) && !Array.isArray(snapshot[field])) {
      errors.push(`BudgetOutputSnapshot field must be an array: ${field}.`);
    }
  }

  for (const field of SNAPSHOT_OBJECT_FIELDS) {
    if (hasOwn(snapshot, field) && !isRecord(snapshot[field])) {
      errors.push(`BudgetOutputSnapshot field must be an object: ${field}.`);
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  const completeSnapshot = snapshot as BudgetOutputSnapshot;
  const sheetReport = validateBudgetSheetOutput(
    {
      estimate_id: completeSnapshot.estimate_id,
      project_id: completeSnapshot.project_id,
      stage: completeSnapshot.estimate_stage,
      generated_at: completeSnapshot.generated_at,
      customer_view: completeSnapshot.customer_view,
      internal_view: completeSnapshot.internal_view,
      totals: completeSnapshot.totals,
      warnings: completeSnapshot.warnings,
    },
    methodSpecCatalog,
  );
  errors.push(...sheetReport.errors);
  sheetReport.warnings.forEach((warning) =>
    pushUniqueWarning(warnings, warning),
  );

  const customerLines = completeSnapshot.customer_view.flatMap(
    (group) => group.lines,
  );
  const internalLines = completeSnapshot.internal_view.flatMap(
    (group) => group.lines,
  );
  const reviewRequiredCount = internalLines.filter(
    (line) => line.requires_review,
  ).length;
  const materialLinkedLineCount = internalLines.filter(
    (line) => line.material_code,
  ).length;

  if (customerLines.length !== internalLines.length) {
    errors.push("Snapshot customer_view and internal_view line counts differ.");
  }
  if (completeSnapshot.source_summary.customer_line_count !== customerLines.length) {
    errors.push("Snapshot source_summary.customer_line_count does not match customer_view.");
  }
  if (completeSnapshot.source_summary.internal_line_count !== internalLines.length) {
    errors.push("Snapshot source_summary.internal_line_count does not match internal_view.");
  }
  if (completeSnapshot.source_summary.estimate_line_count !== internalLines.length) {
    errors.push("Snapshot source_summary.estimate_line_count does not match internal_view.");
  }
  if (completeSnapshot.source_summary.review_required_count !== reviewRequiredCount) {
    errors.push("Snapshot source_summary.review_required_count does not match internal_view.");
  }
  if (
    completeSnapshot.source_summary.material_linked_line_count !==
    materialLinkedLineCount
  ) {
    errors.push("Snapshot source_summary.material_linked_line_count does not match internal_view.");
  }
  if (
    completeSnapshot.source_summary.material_unlinked_line_count !==
    internalLines.length - materialLinkedLineCount
  ) {
    errors.push("Snapshot source_summary.material_unlinked_line_count does not match internal_view.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
