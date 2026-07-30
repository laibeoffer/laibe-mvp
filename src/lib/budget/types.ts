export type BudgetAdapterWarning = {
  code: string;
  message: string;
  sourceId?: string;
  severity?: "info" | "warning" | "blocked";
};

export type BudgetAdapterUnsupported = {
  code: string;
  message: string;
  sourceId?: string;
};

export type FormalEstimateGuard = {
  blocked: true;
  status: "blocked";
  reason: string;
  code: "plancraft_plus_formal_estimate_blocked";
  message: string;
  productionReady: false;
  formalEstimateAllowed: false;
  requiredNextStep: string;
};

export type BudgetProject = {
  source_type: "plancraft_plus_draft" | "unsupported_floor_plan_draft";
  source_id: string;
  title: string;
  description?: string;
  user_requirements?: Record<string, unknown>;
};

export type PriceSource = {
  type: string;
  id: string;
  label: string;
};

export type TradeCode = string;

export interface QuoteItemTemplate {
  id: string;
  item_code: string;
  trade_code: TradeCode;
  engineering_category: string;
  item_name: string;
  unit: string;
  default_notes: string;
  is_active?: boolean;
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
  recipe_code: string;
  recipe_name: string;
  version: string;
  trigger_type: string;
  object_type?: string;
  space_type?: string;
  engineering_category?: string;
  required_quantity_facts: string[];
  required_params: string[];
  outputs: MethodRecipeOutput[];
  default_assumptions: string[];
  review_triggers: string[];
}

export interface PricingRule {
  price_rule_id: string;
  quote_item_template_id: string;
  item_code?: string;
  pricing_type: string;
  unit: string;
  unit_price?: number;
  percentage_rate?: number;
  price_source: PriceSource;
  confidence: number;
  requires_review: boolean;
  review_reason?: string;
}

export interface BudgetEstimateLine {
  quote_item_template_id: string;
  item_name: string;
  engineering_category: string;
  recipe_id: string;
  assumptions: string[];
  notes: string;
  review_reason?: string;
  requires_review: boolean;
  item_no: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  source_type: string;
  source_id: string;
  quantity_formula: string;
  price_source: PriceSource;
  confidence: number;
}

export interface BudgetEstimate {
  estimate_id: string;
  project_id: string;
  estimate_stage: string;
  generated_at: string;
  lines: BudgetEstimateLine[];
}

export interface Material {
  material_id: string;
  material_name: string;
  category: string;
  unit: string;
  spec: {
    brand: string | null;
    grade: string;
    customer_note: string;
    internal_note: string;
    source: string;
  };
  grade: string;
  applicable_object_types: string[];
  compatible_recipe_ids: string[];
  default_waste_factor: number;
  price_reference_ids: string[];
  description_source: {
    type: string;
    id: string;
    label?: string;
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

export interface BudgetCatalog {
  catalog_id: string;
  version: string;
  quote_item_templates: QuoteItemTemplate[];
  method_recipes: MethodRecipe[];
  materials: Material[];
  pricing_rules: PricingRule[];
  labor_rates: LaborRate[];
  historical_quote_lines: unknown[];
}

export type SpaceCandidate = {
  id: string;
  name: string;
  space_type?: string;
  sourceId: string;
  productionReady: false;
  candidate: true;
  params: {
    source: "plancraft_plus_zone";
    boundaryStatus?: string;
    boundaryEdgeIds: string[];
    boundaryWallIds: string[];
    polygonPointCount: number;
    areaStatus: "not_calculated" | "provided_but_unverified";
    area?: number | null;
  };
};

export type QuantityFactCandidate = {
  id: string;
  kind: string;
  value: number;
  unit: "count" | "mm";
  sourceId: string;
  sourceKind: "node_graph_edge" | "opening";
  productionReady: false;
  candidate: true;
  authority: "plancraft_plus_draft_spike";
  attributes: Record<string, unknown>;
};

export type LayoutObjectCandidate = {
  id: string;
  sourceId: string;
  productionReady: false;
  candidate: true;
  unsupportedReason: string;
};

export type BudgetInputFromFloorPlan = {
  source: "plancraft_plus_draft" | "unsupported_floor_plan_draft";
  version?: string;
  adapterMode: "plancraft_plus_spike" | "unsupported";
  productionReady: false;
  formalEstimateAllowed: false;
  formalEstimateGuard: FormalEstimateGuard;
  project: BudgetProject;
  spaces: SpaceCandidate[];
  quantityFacts: QuantityFactCandidate[];
  layoutObjects: LayoutObjectCandidate[];
  warnings: BudgetAdapterWarning[];
  unsupported: BudgetAdapterUnsupported[];
  provenance: Record<string, unknown>;
};

export type PlancraftPlusPoint = {
  x: number;
  y: number;
};

export type PlancraftPlusWallStatus = "existing" | "new" | "demolished";

export type PlancraftPlusNodeGraphEdge = {
  id: string;
  sourceWallId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  from?: PlancraftPlusPoint;
  to?: PlancraftPlusPoint;
  thickness?: number;
  status?: PlancraftPlusWallStatus;
  structural?: boolean;
  layer?: string;
  length?: number;
};

export type PlancraftPlusOpeningKind = "door" | "window" | "opening";

export type PlancraftPlusOpening = {
  id: string;
  edgeId?: string;
  sourceWallId?: string;
  kind?: PlancraftPlusOpeningKind;
  offset?: number;
  width?: number;
  swing?: string | null;
  sillHeight?: number | null;
  height?: number | null;
};

export type PlancraftPlusZone = {
  id: string;
  name?: string;
  type?: string;
  labelPosition?: PlancraftPlusPoint;
  boundaryEdgeIds?: string[];
  boundaryWallIds?: string[];
  polygon?: PlancraftPlusPoint[];
  area?: number | null;
  boundaryStatus?: string;
  boundaryIssues?: unknown[];
};

export type PlancraftPlusDraft = {
  product: "Plancraft+";
  version: string;
  unit: "mm";
  scale?: Record<string, unknown>;
  walls?: unknown[];
  wallGraph?: Record<string, unknown>;
  nodeGraph?: {
    edges?: PlancraftPlusNodeGraphEdge[];
    nodes?: unknown[];
    issues?: unknown[];
    lastBuiltAt?: string | null;
  };
  openings?: PlancraftPlusOpening[];
  zones?: PlancraftPlusZone[];
  furniture?: unknown[];
  plancraftBridge: {
    targetFormat: ".pc";
    status?: string;
    [key: string]: unknown;
  };
};
