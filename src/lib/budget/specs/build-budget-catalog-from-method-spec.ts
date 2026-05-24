import type {
  BudgetCatalog,
  LaborRate,
  Material,
} from "../types.ts";
import type {
  LaborRule,
  MaterialSpec,
  MethodSpecCatalog,
} from "./types.ts";

const materialSpecToMaterial = (materialSpec: MaterialSpec): Material => ({
  material_id: materialSpec.material_code,
  material_name: materialSpec.material_name,
  category: materialSpec.category,
  unit: materialSpec.unit,
  spec: {
    brand: materialSpec.brand,
    grade: materialSpec.grade,
    customer_note: materialSpec.customer_note,
    internal_note: materialSpec.internal_note,
    source: "method_spec_catalog",
  },
  grade: materialSpec.grade,
  applicable_object_types: [],
  compatible_recipe_ids: [],
  default_waste_factor: 0,
  price_reference_ids: [],
  description_source: {
    type: "method_spec_material",
    id: materialSpec.material_code,
  },
  requires_review: !materialSpec.is_active,
});

const laborRuleToLaborRate = (laborRule: LaborRule): LaborRate => ({
  labor_rate_id: laborRule.labor_code,
  labor_name: laborRule.labor_name,
  trade_code: laborRule.trade_category,
  unit: laborRule.unit,
  rate: laborRule.base_rate,
  price_source: {
    type: "method_spec_labor_rule",
    id: laborRule.labor_code,
    label: `${laborRule.base_rate} / ${laborRule.unit}`,
  },
  applicable_recipe_ids: [],
  requires_review: !laborRule.is_active,
  review_reason: laborRule.is_active ? undefined : "LaborRule is inactive.",
});

export const buildBudgetCatalogFromMethodSpec = (
  methodSpecCatalog: MethodSpecCatalog,
): BudgetCatalog => ({
  catalog_id: `${methodSpecCatalog.catalog_id}-budget-catalog`,
  version: methodSpecCatalog.version,
  quote_item_templates: methodSpecCatalog.quote_item_templates,
  method_recipes: methodSpecCatalog.method_recipes,
  materials: methodSpecCatalog.material_specs
    .filter((materialSpec) => materialSpec.is_active)
    .map(materialSpecToMaterial),
  pricing_rules: methodSpecCatalog.pricing_rules,
  labor_rates: methodSpecCatalog.labor_rules
    .filter((laborRule) => laborRule.is_active)
    .map(laborRuleToLaborRate),
  historical_quote_lines: [],
});
