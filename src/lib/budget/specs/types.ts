import type {
  MethodRecipe,
  PricingRule,
  QuoteItemTemplate,
  TradeCode,
} from "../types.ts";

export type NoteTemplateType =
  | "customer_note"
  | "internal_note"
  | "exclusion"
  | "assumption"
  | "risk";

export type MaterialSpecGrade = "basic" | "standard" | "premium";

export interface MaterialSpec {
  material_code: string;
  material_name: string;
  category: string;
  brand: string | null;
  grade: MaterialSpecGrade;
  unit: string;
  customer_note: string;
  internal_note: string;
  is_active: boolean;
}

export interface LaborRule {
  labor_code: string;
  labor_name: string;
  trade_category: TradeCode;
  unit: string;
  base_rate: number;
  customer_note: string;
  internal_note: string;
  is_active: boolean;
}

export interface NoteTemplate {
  note_code: string;
  note_type: NoteTemplateType;
  trade_category: TradeCode;
  text: string;
  applies_to_item_codes: string[];
  is_customer_visible: boolean;
  is_active: boolean;
}

export interface UnitConversion {
  from_unit: string;
  to_unit: string;
  factor: number;
  formula_note: string;
}

export interface InclusionExclusionRule {
  rule_code: string;
  item_code: string;
  includes: string[];
  excludes: string[];
  assumption: string;
  requires_review: boolean;
}

export type ItemMaterialBindingRole =
  | "primary"
  | "optional"
  | "accessory"
  | "reference_only";

// ItemMaterialBinding is traceability metadata only; it never authorizes price changes.
export interface ItemMaterialBinding {
  binding_code: string;
  item_code: string;
  material_code: string;
  role: ItemMaterialBindingRole;
  is_default: boolean;
  requires_review: boolean;
  note: string;
}

export interface MethodSpecCatalog {
  catalog_id: string;
  version: string;
  quote_item_templates: QuoteItemTemplate[];
  method_recipes: MethodRecipe[];
  material_specs: MaterialSpec[];
  labor_rules: LaborRule[];
  note_templates: NoteTemplate[];
  unit_conversions: UnitConversion[];
  inclusion_exclusion_rules: InclusionExclusionRule[];
  item_material_bindings: ItemMaterialBinding[];
  pricing_rules: PricingRule[];
}

export interface MethodSpecValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  ref?: string;
}

export interface MethodSpecAllowedCondition {
  code: string;
  message: string;
  ref?: string;
}

export interface MethodSpecGuardResult {
  guard: string;
  passed: boolean;
  severity: "info" | "warning" | "error";
  message: string;
  refs: string[];
}

export interface MethodSpecValidationReport {
  valid: boolean;
  checked_at: string;
  summary: {
    quote_item_template_count: number;
    method_recipe_count: number;
    material_spec_count: number;
    labor_rule_count: number;
    note_template_count: number;
    unit_conversion_count: number;
    inclusion_exclusion_rule_count: number;
    item_material_binding_count: number;
    pricing_rule_count: number;
    error_count: number;
    warning_count: number;
    allowed_condition_count: number;
    guard_result_count: number;
  };
  issues: MethodSpecValidationIssue[];
  allowed_conditions: MethodSpecAllowedCondition[];
  guard_results: MethodSpecGuardResult[];
}
