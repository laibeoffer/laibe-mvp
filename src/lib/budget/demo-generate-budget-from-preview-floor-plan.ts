import { normalizeFloorPlanToBudgetInput } from "./adapters/preview-floor-plan-adapter.ts";
import {
  BudgetEstimateBlockedError,
  generateBudgetEstimate,
} from "./budget-generator.ts";
import { mockPreviewFloorPlanDraft } from "./mock/mock-preview-floor-plan-draft.ts";

const normalizedInput = normalizeFloorPlanToBudgetInput(mockPreviewFloorPlanDraft);
const budgetEstimate = generateBudgetEstimate(normalizedInput.project);

const plancraftPlusDraft = {
  project_id: "laibe-plancraft-plus-budget-guard-smoke",
  name: "Plancraft+ budget guard smoke",
  product: "Plancraft+",
  version: "0.10.0-renderer-preview-spike",
  unit: "mm",
  scale: {
    pxPerMm: 0.24,
    calibrated: true,
  },
  walls: [],
  nodeGraph: {
    edges: [
      {
        id: "edge-001",
        sourceWallId: "wall-001",
        fromNodeId: "node-001",
        toNodeId: "node-002",
        from: { x: 0, y: 0 },
        to: { x: 3000, y: 0 },
        thickness: 120,
        status: "existing",
        structural: false,
        layer: "walls",
        length: 3000,
      },
    ],
  },
  openings: [
    {
      id: "opening-001",
      edgeId: "edge-001",
      sourceWallId: "wall-001",
      kind: "door",
      offset: 900,
      width: 900,
      swing: "left",
      sillHeight: null,
      height: 2100,
    },
  ],
  zones: [
    {
      id: "zone-001",
      name: "客廳",
      type: "living",
      labelPosition: { x: 1500, y: 1200 },
      boundaryEdgeIds: ["edge-001"],
      boundaryWallIds: ["wall-001"],
      polygon: [],
      area: null,
      boundaryStatus: "open",
      boundaryIssues: [
        {
          code: "zone-boundary-open",
          message: "目前邊界尚未形成封閉空間",
        },
      ],
    },
  ],
  furniture: [],
  plancraftBridge: {
    status: "spike",
    targetFormat: ".pc",
  },
};

const plancraftPlusNormalizedInput =
  normalizeFloorPlanToBudgetInput(plancraftPlusDraft);
let plancraftPlusGuardSmoke:
  | {
      blocked: true;
      reasonCode: string;
      message: string;
    }
  | {
      blocked: false;
      reasonCode: null;
      message: string;
    };

try {
  generateBudgetEstimate(plancraftPlusNormalizedInput.project);
  plancraftPlusGuardSmoke = {
    blocked: false,
    reasonCode: null,
    message: "Unexpected: Plancraft+ spike estimate was not blocked.",
  };
} catch (error) {
  if (!(error instanceof BudgetEstimateBlockedError)) {
    throw error;
  }

  plancraftPlusGuardSmoke = {
    blocked: true,
    reasonCode: error.reasonCode,
    message: error.message,
  };
}

const classifyAdapterSmokeInput = (input: unknown) => {
  const normalized = normalizeFloorPlanToBudgetInput(input);
  let formalEstimateBlocked = false;
  let formalEstimateReasonCode: string | null = null;

  try {
    generateBudgetEstimate(normalized.project);
  } catch (error) {
    if (!(error instanceof BudgetEstimateBlockedError)) {
      throw error;
    }

    formalEstimateBlocked = true;
    formalEstimateReasonCode = error.reasonCode;
  }

  return {
    source: normalized.source ?? "legacy_preview_floor_plan_draft",
    adapterMode: normalized.adapterMode ?? "legacy",
    productionReady: normalized.productionReady ?? true,
    formalEstimateGuardStatus:
      normalized.formalEstimateGuard?.status ?? "not_present",
    formalEstimateBlocked,
    formalEstimateReasonCode,
    spaceCount: normalized.spaces.length,
    quantityFactCount: normalized.quantityFacts?.length ?? 0,
    layoutObjectCount: normalized.layoutObjects.length,
    warningCodes: normalized.warnings?.map((warning) => warning.code) ?? [],
  };
};

const malformedInputSmoke = {
  null_input: classifyAdapterSmokeInput(null),
  undefined_input: classifyAdapterSmokeInput(undefined),
  string_input: classifyAdapterSmokeInput("not a floor plan draft"),
  zones_only: classifyAdapterSmokeInput({
    name: "zones only malformed draft",
    version: "malformed-zones-only",
    zones: [],
  }),
  pc_only: classifyAdapterSmokeInput({
    name: "pc only malformed draft",
    version: "malformed-pc-only",
    plancraftBridge: {
      targetFormat: ".pc",
    },
  }),
  valid_plancraft_plus: classifyAdapterSmokeInput(plancraftPlusDraft),
  legacy_input: classifyAdapterSmokeInput(mockPreviewFloorPlanDraft),
};

const summary = {
  total_amount: budgetEstimate.total_amount,
  trade_groups: budgetEstimate.trade_groups.map((group) => ({
    engineering_category: group.engineering_category,
    subtotal_amount: group.subtotal_amount,
    line_count: group.line_ids.length,
  })),
  estimate_lines: budgetEstimate.lines.length,
  review_required_lines: budgetEstimate.review_required_lines.length,
};

console.log(
  JSON.stringify(
    {
      normalized_input: {
        project_id: normalizedInput.project.id,
        spaces: normalizedInput.spaces,
        layoutObjects: normalizedInput.layoutObjects,
      },
      plancraft_plus_guard_smoke: {
        source: plancraftPlusNormalizedInput.source,
        adapterMode: plancraftPlusNormalizedInput.adapterMode,
        productionReady: plancraftPlusNormalizedInput.productionReady,
        formalEstimateGuard:
          plancraftPlusNormalizedInput.formalEstimateGuard,
        spaces: plancraftPlusNormalizedInput.spaces.length,
        quantityFacts: plancraftPlusNormalizedInput.quantityFacts?.length ?? 0,
        layoutObjects: plancraftPlusNormalizedInput.layoutObjects.length,
        warnings:
          plancraftPlusNormalizedInput.warnings?.map((warning) => warning.code) ??
          [],
        estimateGuard: plancraftPlusGuardSmoke,
      },
      malformed_input_smoke: malformedInputSmoke,
      budget_estimate: budgetEstimate,
      summary,
    },
    null,
    2,
  ),
);
