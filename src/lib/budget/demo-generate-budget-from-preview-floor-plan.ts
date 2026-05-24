import { normalizeFloorPlanToBudgetInput } from "./adapters/preview-floor-plan-adapter.ts";

const plancraftPlusDraft = {
  product: "Plancraft+",
  version: "0.10.0-renderer-preview-spike",
  unit: "mm",
  scale: { calibrated: true, pxPerMm: 0.2 },
  walls: [],
  nodeGraph: {
    edges: [
      {
        id: "edge-1",
        sourceWallId: "wall-1",
        fromNodeId: "node-1",
        toNodeId: "node-2",
        from: { x: 0, y: 0 },
        to: { x: 3000, y: 0 },
        thickness: 120,
        status: "new",
        structural: false,
        layer: "walls",
        length: 3000,
      },
    ],
  },
  openings: [
    {
      id: "opening-1",
      edgeId: "edge-1",
      sourceWallId: "wall-1",
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
      id: "zone-1",
      name: "客廳",
      type: "living",
      labelPosition: { x: 1200, y: 1200 },
      boundaryEdgeIds: ["edge-1"],
      boundaryWallIds: ["wall-1"],
      polygon: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 3000, y: 2400 },
        { x: 0, y: 2400 },
      ],
      area: null,
      boundaryStatus: "closed",
      boundaryIssues: [],
    },
  ],
  furniture: [],
  plancraftBridge: {
    status: "spike",
    targetFormat: ".pc",
  },
};

const smokeInputs = {
  null_input: null,
  undefined_input: undefined,
  string_input: "not a floor plan draft",
  zones_only: { zones: [] },
  pc_only: { plancraftBridge: { targetFormat: ".pc" } },
  valid_plancraft_plus: plancraftPlusDraft,
};

for (const [name, input] of Object.entries(smokeInputs)) {
  const normalized = normalizeFloorPlanToBudgetInput(input);
  console.log(
    JSON.stringify(
      {
        name,
        source: normalized.source,
        adapterMode: normalized.adapterMode,
        productionReady: normalized.productionReady,
        formalEstimateAllowed: normalized.formalEstimateAllowed,
        guard: normalized.formalEstimateGuard.status,
        spaceCount: normalized.spaces.length,
        quantityFactCount: normalized.quantityFacts.length,
        warningCodes: normalized.warnings.map((item) => item.code),
      },
      null,
      2,
    ),
  );
}
