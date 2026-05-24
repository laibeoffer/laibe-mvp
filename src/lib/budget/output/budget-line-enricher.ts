import {
  getTemplateItemCode,
} from "../storage/budget-catalog.ts";
import type {
  BudgetEstimateLine,
  QuoteItemTemplate,
} from "../types.ts";
import type { MethodSpecCatalog } from "../specs/types.ts";
import { resolveMaterialBindingForItem } from "./material-code-resolver.ts";
import type { InternalBudgetLine } from "./types.ts";

const unique = (values: string[]): string[] =>
  [...new Set(values.filter((value) => value.trim().length > 0))];

const findTemplate = (
  line: BudgetEstimateLine,
  catalog: MethodSpecCatalog,
): QuoteItemTemplate | undefined =>
  catalog.quote_item_templates.find(
    (template) =>
      template.id === line.quote_item_template_id ||
      template.item_name === line.item_name,
  );

const resolveTradeCategory = (line: BudgetEstimateLine): string => {
  if (line.item_name === "保護工程") {
    return "保護工程";
  }

  return line.engineering_category;
};

const resolveItemCode = (
  line: BudgetEstimateLine,
  catalog: MethodSpecCatalog,
): string => {
  const template = findTemplate(line, catalog);
  return template ? getTemplateItemCode(template) : line.quote_item_template_id;
};


const resolveLineAssumptions = (line: BudgetEstimateLine): string[] => {
  if (line.recipe_id !== "recipe-project-general-costs") {
    return line.assumptions;
  }

  return line.assumptions.filter((assumption) =>
    assumption.includes(line.item_name),
  );
};

export const enrichBudgetLine = (
  line: BudgetEstimateLine,
  catalog: MethodSpecCatalog,
): InternalBudgetLine => {
  const itemCode = resolveItemCode(line, catalog);
  const notes = catalog.note_templates.filter(
    (note) => note.is_active && note.applies_to_item_codes.includes(itemCode),
  );
  const inclusionRules = catalog.inclusion_exclusion_rules.filter(
    (rule) => rule.item_code === itemCode,
  );
  const materialBinding = resolveMaterialBindingForItem(itemCode, catalog);
  const materialCode = materialBinding?.material_code ?? null;
  const materialSpec = materialCode
    ? catalog.material_specs.find(
        (candidate) => candidate.material_code === materialCode,
      )
    : undefined;
  const materialBindingReviewWarning = materialBinding?.requires_review
    ? `Material binding requires review: ${itemCode} -> ${materialBinding.material_code}`
    : "";

  const customerNotes = unique([
    ...notes
      .filter((note) => note.is_customer_visible)
      .map((note) => note.text),
    line.notes,
  ]);
  const internalNotes = unique([
    ...notes
      .filter((note) => !note.is_customer_visible)
      .map((note) => note.text),
    materialBinding?.note ?? "",
    materialBindingReviewWarning,
    materialSpec?.internal_note ?? "",
    line.review_reason ?? "",
  ]);
  const inclusions = unique(
    inclusionRules.flatMap((rule) => rule.includes),
  );
  const exclusions = unique(
    inclusionRules.flatMap((rule) => rule.excludes),
  );
  const ruleAssumptions = inclusionRules.map((rule) => rule.assumption);
  const noteAssumptions = notes
    .filter((note) => note.note_type === "assumption")
    .map((note) => note.text);
  const lineAssumptions = resolveLineAssumptions(line);
  const risks = unique([
    ...notes
      .filter((note) => note.note_type === "risk")
      .map((note) => note.text),
    ...inclusionRules
      .filter((rule) => rule.requires_review)
      .map((rule) => rule.assumption),
    materialBindingReviewWarning,
    materialBinding?.requires_review ? materialBinding.note : "",
    line.requires_review ? line.review_reason ?? "此列需要人工複核。" : "",
  ]);

  return {
    trade_category: resolveTradeCategory(line),
    line_no: line.item_no,
    item_code: itemCode,
    item_name: line.item_name,
    unit: line.unit,
    quantity: line.quantity,
    unit_price: line.unit_price,
    amount: line.amount,
    customer_note: customerNotes.join("；"),
    internal_note: internalNotes.join("；"),
    source_type: line.source_type,
    source_id: line.source_id,
    recipe_id: line.recipe_id,
    material_code: materialCode,
    quantity_formula: line.quantity_formula,
    price_source: line.price_source,
    confidence: line.confidence,
    requires_review: line.requires_review || Boolean(materialBinding?.requires_review),
    inclusions,
    exclusions,
    assumptions: unique([...lineAssumptions, ...ruleAssumptions, ...noteAssumptions]),
    risks,
  };
};

export const enrichBudgetLines = (
  lines: BudgetEstimateLine[],
  catalog: MethodSpecCatalog,
): InternalBudgetLine[] => lines.map((line) => enrichBudgetLine(line, catalog));
