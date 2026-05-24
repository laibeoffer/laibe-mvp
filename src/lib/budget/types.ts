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
