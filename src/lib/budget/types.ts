export type EstimateStage = "mock";

export type SourceType =
  | "layout_object"
  | "layout_object_group"
  | "space_group"
  | "project";

export type TradeCode = "woodwork" | "masonry" | "mep" | "other";

export type PricingType = "fixed_unit_price" | "percentage_of_subtotal";

export interface Project {
  id: string;
  name: string;
  version: string;
  created_at: string;
  spaces: Space[];
  layout_objects: LayoutObject[];
  user_requirements?: Record<string, unknown>;
}

export interface Space {
  id: string;
  project_id: string;
  name: string;
  space_name?: string;
  space_type: string;
  floor_area_m2?: number;
  area_m2?: number;
  area_ping?: number;
  width_cm?: number;
  depth_cm?: number;
  params?: Record<string, unknown>;
}

export interface LayoutObject {
  id: string;
  project_id: string;
  space_id: string;
  object_type: string;
  asset_code: string;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  x: number;
  y: number;
  rotation: number;
  params: Record<string, unknown>;
}

export interface BudgetAdapterWarning {
  code: string;
  message: string;
  sourceId?: string;
  severity?: "warning" | "error";
  details?: Record<string, unknown>;
}

export interface BudgetAdapterUnsupported {
  feature: string;
  reason: string;
  sourceId?: string;
  details?: Record<string, unknown>;
}

export interface FormalEstimateGuard {
  blocked: boolean;
  status: "blocked" | "allowed";
  reason: string;
  code: string;
  message: string;
  requiredNextStep?: string;
  productionReady: boolean;
}

export type PreviewFloorPlanDraftUnit = "mm" | "cm" | "px";

export interface PreviewFloorPlanDraftScale {
  scale_ratio_cm_per_px?: number;
  cm_per_px?: number;
  mm_per_px?: number;
}

export interface PreviewFloorPlanDraftObject {
  id?: string;
  object_id?: string;
  room_id?: string;
  space_id?: string;
  object_type?: string;
  type?: string;
  category?: string;
  asset_code?: string;
  svg_ref?: string;
  width?: number;
  height?: number;
  depth?: number;
  width_cm?: number;
  depth_cm?: number;
  height_cm?: number;
  x?: number;
  y?: number;
  rotation?: number;
  rotation_deg?: number;
  params?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  position?: {
    x?: number;
    y?: number;
    rotation?: number;
    rotation_deg?: number;
  };
  graphics?: {
    plan_svg_ref?: string;
    svg_ref?: string;
  };
  budgetable?: boolean;
}

export interface PreviewFloorPlanDraftRoom {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  params?: Record<string, unknown>;
  objects?: PreviewFloorPlanDraftObject[];
}

export interface PreviewFloorPlanDraft {
  project_id?: string;
  name: string;
  version?: string;
  created_at?: string;
  unit?: PreviewFloorPlanDraftUnit;
  gridSize?: number;
  selectedRoomId?: string | null;
  scale?: PreviewFloorPlanDraftScale;
  rooms?: PreviewFloorPlanDraftRoom[];
  objects?: PreviewFloorPlanDraftObject[];
  layout_objects?: PreviewFloorPlanDraftObject[];
  user_requirements?: Record<string, unknown>;
}

export interface BudgetInputFromFloorPlan {
  source?:
    | "legacy_preview_floor_plan_draft"
    | "plancraft_plus_draft"
    | "unknown_floor_plan_draft";
  version?: string;
  adapterMode?: "legacy" | "plancraft_plus_spike" | "unsupported";
  productionReady?: boolean;
  formalEstimateGuard?: FormalEstimateGuard;
  project: Project;
  spaces: Space[];
  layoutObjects: LayoutObject[];
  quantityFacts?: QuantityFact[];
  warnings?: BudgetAdapterWarning[];
  unsupported?: BudgetAdapterUnsupported[];
  provenance?: Record<string, unknown>;
}

export interface QuantityFact {
  id: string;
  project_id: string;
  fact_type: string;
  source_type: SourceType;
  source_id: string;
  object_type?: string;
  value: number;
  unit: string;
  formula: string;
  formula_inputs: Record<string, unknown>;
  rounding_rule: string;
  confidence: number;
  requires_review: boolean;
  review_reason?: string;
}

export interface QuoteItemTemplate {
  id: string;
  item_code?: string;
  trade_code: TradeCode;
  engineering_category: string;
  item_name: string;
  unit: string;
  default_notes: string;
}

export interface MethodRecipeOutput {
  quote_item_template_id: string;
  item_code?: string;
  quantity_fact_type: string;
  unit: string;
  quantity_formula: string;
  condition?: {
    param: string;
    equals: unknown;
  };
  review_reason?: string;
}

export interface MethodRecipe {
  recipe_id: string;
  recipe_code?: string;
  recipe_name: string;
  version: string;
  trigger_type: SourceType;
  object_type?: string;
  space_type?: string;
  engineering_category: string;
  required_quantity_facts: string[];
  required_params: string[];
  outputs: MethodRecipeOutput[];
  default_assumptions: string[];
  review_triggers: string[];
}

export interface Material {
  material_id: string;
  material_name: string;
  category: string;
  unit: string;
  spec: Record<string, unknown>;
  grade: "basic" | "standard" | "premium";
  applicable_object_types: string[];
  compatible_recipe_ids: string[];
  default_waste_factor: number;
  price_reference_ids: string[];
  description_source: {
    type: string;
    id: string;
  };
  requires_review: boolean;
}

export interface LaborRate {
  labor_rate_id: string;
  labor_name: string;
  trade_code: TradeCode;
  unit: string;
  rate: number;
  price_source: PriceSource;
  applicable_recipe_ids: string[];
  requires_review: boolean;
  review_reason?: string;
}

export interface HistoricalQuoteLine {
  historical_quote_line_id: string;
  source_document_id: string;
  source_line_id: string;
  engineering_category: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  project_context: Record<string, unknown>;
  region?: string;
  quote_date?: string;
  normalized_unit_price?: number;
  match_score?: number;
  retrieval_reason?: string;
  allowed_use:
    | "range_reference"
    | "calibration_candidate"
    | "method_note"
    | "material_note"
    | "budget_note_template";
  requires_review: boolean;
}

export interface PriceSource {
  type: string;
  id: string;
  label: string;
}

export interface PricingRule {
  price_rule_id: string;
  quote_item_template_id: string;
  item_code?: string;
  pricing_type: PricingType;
  unit: string;
  unit_price?: number;
  percentage_rate?: number;
  price_source: PriceSource;
  confidence: number;
  requires_review: boolean;
  review_reason?: string;
}

export interface BudgetCatalog {
  catalog_id: string;
  version: string;
  quote_item_templates: QuoteItemTemplate[];
  method_recipes: MethodRecipe[];
  materials: Material[];
  pricing_rules: PricingRule[];
  labor_rates: LaborRate[];
  historical_quote_lines: HistoricalQuoteLine[];
}

export interface BudgetProjectInput {
  project: Project;
  spaces: Space[];
  layoutObjects: LayoutObject[];
  quantityFacts: QuantityFact[];
}

export interface BudgetCatalogValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  ref?: string;
}

export interface BudgetCatalogValidationReport {
  valid: boolean;
  checked_at: string;
  summary: {
    quote_item_template_count: number;
    method_recipe_count: number;
    pricing_rule_count: number;
    material_count: number;
    labor_rate_count: number;
    historical_quote_line_count: number;
    error_count: number;
    warning_count: number;
  };
  issues: BudgetCatalogValidationIssue[];
}

export interface BudgetEstimateLine {
  line_id: string;
  estimate_id: string;
  project_id: string;
  trade_code: TradeCode;
  engineering_category: string;
  item_no: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  notes: string;
  quote_item_template_id: string;
  source_type: SourceType;
  source_id: string;
  recipe_id: string;
  quantity_formula: string;
  quantity_fact_ids: string[];
  price_source: PriceSource;
  confidence: number;
  requires_review: boolean;
  assumptions: string[];
  review_reason?: string;
}

export interface BudgetTradeGroup {
  trade_code: TradeCode;
  engineering_category: string;
  subtotal_amount: number;
  line_ids: string[];
}

export interface AIGuidanceQuestion {
  question_id: string;
  project_id: string;
  question_type:
    | "missing_dimension"
    | "missing_material_grade"
    | "scope_confirmation"
    | "risk_warning"
    | "budget_explanation"
    | "review_prompt";
  trigger_source_type: SourceType;
  trigger_source_id: string;
  related_recipe_id?: string;
  related_line_id?: string;
  question_text: string;
  answer_options: Array<{
    label: string;
    value: string;
  }>;
  user_answer: string | null;
  structured_assumption: Record<string, unknown> | null;
  risk_level: "low" | "medium" | "high";
  requires_review: boolean;
  status: "open" | "answered" | "dismissed";
}

export interface BudgetEstimate {
  estimate_id: string;
  project_id: string;
  estimate_stage: EstimateStage;
  generated_at: string;
  pipeline: string[];
  total_amount: number;
  trade_groups: BudgetTradeGroup[];
  lines: BudgetEstimateLine[];
  quantity_facts: QuantityFact[];
  assumptions: string[];
  exclusions: string[];
  ai_guidance_questions: AIGuidanceQuestion[];
  review_required_lines: string[];
}

export interface RecipeMatch {
  recipe: MethodRecipe;
  template: QuoteItemTemplate;
  output: MethodRecipeOutput;
  source_type: SourceType;
  source_id: string;
  quantity: number;
  quantity_fact_ids: string[];
  quantity_formula: string;
  confidence: number;
  requires_review: boolean;
  review_reason?: string;
}

export interface FormattedBudgetRow {
  "工程類別": string;
  "項次": string;
  "品名": string;
  "單位": string;
  "數量": number;
  "單價": number;
  "金額": number;
  "備註": string;
  source_type: SourceType;
  source_id: string;
  recipe_id: string;
  quantity_formula: string;
  price_source: PriceSource;
  confidence: number;
  requires_review: boolean;
}

export interface FormattedBudgetOutput {
  estimate_id: string;
  project_id: string;
  estimate_stage: EstimateStage;
  total_amount: number;
  rows: FormattedBudgetRow[];
  trade_groups: BudgetTradeGroup[];
  review_required_lines: string[];
}
