import type {
  BudgetAdapterUnsupported,
  BudgetAdapterWarning,
  BudgetInputFromFloorPlan,
  FormalEstimateGuard,
  PlancraftPlusDraft,
  PlancraftPlusNodeGraphEdge,
  PlancraftPlusOpening,
  PlancraftPlusZone,
  QuantityFactCandidate,
  SpaceCandidate,
} from "../types.ts";

const FORMAL_ESTIMATE_BLOCKED_CODE = "plancraft_plus_formal_estimate_blocked";
const SPIKE_AUTHORITY = "plancraft_plus_draft_spike";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isArrayField(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function createFormalEstimateGuard(): FormalEstimateGuard {
  return {
    blocked: true,
    status: "blocked",
    reason: "plancraft_plus_adapter_spike",
    code: FORMAL_ESTIMATE_BLOCKED_CODE,
    message:
      "Plancraft+ adapter output is candidate-only and cannot enter formal estimate generation.",
    productionReady: false,
    formalEstimateAllowed: false,
    requiredNextStep:
      "Production adapter review and quantity contract approval required.",
  };
}

function warning(
  code: string,
  message: string,
  sourceId?: string,
  severity: BudgetAdapterWarning["severity"] = "warning",
): BudgetAdapterWarning {
  return { code, message, sourceId, severity };
}

function unsupported(
  code: string,
  message: string,
  sourceId?: string,
): BudgetAdapterUnsupported {
  return { code, message, sourceId };
}

export function isPlancraftPlusDraft(input: unknown): input is PlancraftPlusDraft {
  if (!isRecord(input)) return false;
  if (input.product !== "Plancraft+") return false;
  if (input.unit !== "mm") return false;
  if (typeof input.version !== "string") return false;
  if (!isRecord(input.plancraftBridge)) return false;
  if (input.plancraftBridge.targetFormat !== ".pc") return false;

  const nodeGraph = input.nodeGraph;
  const hasEdges = isRecord(nodeGraph) && isArrayField(nodeGraph.edges);
  const hasZones = isArrayField(input.zones);
  const hasOpenings = isArrayField(input.openings);
  const hasKnownPlancraftPlusShape = hasEdges || hasZones || hasOpenings;

  if (!hasKnownPlancraftPlusShape) return false;
  if (input.walls !== undefined && !isArrayField(input.walls)) return false;
  if (input.furniture !== undefined && !isArrayField(input.furniture)) return false;

  return true;
}

export function normalizeFloorPlanToBudgetInput(
  floorPlanDraft: unknown,
): BudgetInputFromFloorPlan {
  if (!isPlancraftPlusDraft(floorPlanDraft)) {
    return normalizeUnsupportedFloorPlan(floorPlanDraft);
  }

  return normalizePlancraftPlusDraft(floorPlanDraft);
}

function normalizeUnsupportedFloorPlan(input: unknown): BudgetInputFromFloorPlan {
  const inputKind = Array.isArray(input) ? "array" : input === null ? "null" : typeof input;

  return {
    source: "unsupported_floor_plan_draft",
    adapterMode: "unsupported",
    productionReady: false,
    formalEstimateAllowed: false,
    formalEstimateGuard: createFormalEstimateGuard(),
    project: {
      source_type: "unsupported_floor_plan_draft",
      source_id: "unsupported-floor-plan-draft",
      title: "Unsupported floor plan draft",
      user_requirements: {
        inputKind,
        productionReady: false,
        formalEstimateAllowed: false,
      },
    },
    spaces: [],
    quantityFacts: [],
    layoutObjects: [],
    warnings: [
      warning(
        "floor_plan_draft_unsupported",
        "Input is not a valid Plancraft+ draft or supported legacy preview-floor-plan contract.",
        undefined,
        "blocked",
      ),
    ],
    unsupported: [
      unsupported(
        "unknown_floor_plan_draft",
        "Malformed, null, primitive, array, or unknown floor plan draft is rejected as candidate-only.",
      ),
    ],
    provenance: { inputKind },
  };
}

function normalizePlancraftPlusDraft(
  draft: PlancraftPlusDraft,
): BudgetInputFromFloorPlan {
  const warnings: BudgetAdapterWarning[] = [
    warning(
      "plancraft_plus_adapter_spike",
      "Plancraft+ budget adapter is spike only.",
      undefined,
      "blocked",
    ),
    warning(
      "plancraft_plus_formal_estimate_blocked",
      "Formal estimate generation is blocked for Plancraft+ candidate output.",
      undefined,
      "blocked",
    ),
    warning(
      "plancraft_plus_pc_not_budget_input",
      ".pc converter output is not used as budget input.",
    ),
    warning(
      "plancraft_plus_svg_not_budget_input",
      "SVG or renderer preview output is not used as budget input.",
    ),
  ];
  const unsupportedItems: BudgetAdapterUnsupported[] = [
    unsupported(
      "plancraft_plus_furniture_not_supported",
      "Furniture and object placement are not supported for Plancraft+ budget adapter output yet.",
    ),
  ];

  const edges = draft.nodeGraph?.edges ?? [];
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const spaces = mapZonesToSpaceCandidates(draft.zones ?? [], warnings);
  const wallFacts = mapEdgesToWallFacts(edges, warnings);
  const openingFacts = mapOpeningsToQuantityFacts(draft.openings ?? [], edgeById, warnings);

  return {
    source: "plancraft_plus_draft",
    version: draft.version,
    adapterMode: "plancraft_plus_spike",
    productionReady: false,
    formalEstimateAllowed: false,
    formalEstimateGuard: createFormalEstimateGuard(),
    project: {
      source_type: "plancraft_plus_draft",
      source_id: "plancraft-plus-draft",
      title: "Plancraft+ candidate budget input",
      description:
        "Candidate-only budget input derived from Plancraft+ draft JSON. It is not formal estimate input.",
      user_requirements: {
        product: draft.product,
        version: draft.version,
        unit: draft.unit,
        adapterMode: "plancraft_plus_spike",
        authority: SPIKE_AUTHORITY,
        productionReady: false,
        formalEstimateAllowed: false,
        formal_estimate_generation: createFormalEstimateGuard(),
        pcConverterUsedAsBudgetInput: false,
        svgRendererUsedAsBudgetInput: false,
      },
    },
    spaces,
    quantityFacts: [...wallFacts, ...openingFacts],
    layoutObjects: [],
    warnings,
    unsupported: unsupportedItems,
    provenance: {
      product: draft.product,
      version: draft.version,
      source: "plancraft_plus_draft_json",
      wallEdgeCount: edges.length,
      openingCount: draft.openings?.length ?? 0,
      zoneCount: draft.zones?.length ?? 0,
    },
  };
}

function mapZonesToSpaceCandidates(
  zones: PlancraftPlusZone[],
  warnings: BudgetAdapterWarning[],
): SpaceCandidate[] {
  return zones.map((zone, index) => {
    const boundaryEdgeIds = zone.boundaryEdgeIds ?? [];
    const boundaryWallIds = zone.boundaryWallIds ?? [];
    const polygon = zone.polygon ?? [];
    const areaStatus =
      finiteNumber(zone.area) && zone.area > 0
        ? "provided_but_unverified"
        : "not_calculated";

    if (zone.boundaryStatus !== "closed") {
      warnings.push(
        warning(
          "plancraft_plus_zone_boundary_not_closed",
          "Zone is mapped as a candidate only because its boundary is not confirmed closed.",
          zone.id,
        ),
      );
    }

    if (areaStatus === "not_calculated") {
      warnings.push(
        warning(
          "plancraft_plus_area_not_calculated",
          "Zone area is not production-calculated.",
          zone.id,
        ),
      );
    }

    return {
      id: `space-candidate-${zone.id || index + 1}`,
      name: zone.name || `未命名空間 ${index + 1}`,
      space_type: zone.type || "other",
      sourceId: zone.id,
      productionReady: false,
      candidate: true,
      params: {
        source: "plancraft_plus_zone",
        boundaryStatus: zone.boundaryStatus,
        boundaryEdgeIds,
        boundaryWallIds,
        polygonPointCount: polygon.length,
        areaStatus,
        area: finiteNumber(zone.area) ? zone.area : null,
      },
    };
  });
}

function mapEdgesToWallFacts(
  edges: PlancraftPlusNodeGraphEdge[],
  warnings: BudgetAdapterWarning[],
): QuantityFactCandidate[] {
  return edges.map((edge, index) => {
    const status = edge.status || "existing";
    const length = resolveEdgeLength(edge);

    if (!finiteNumber(length) || length <= 0) {
      warnings.push(
        warning(
          "plancraft_plus_edge_length_invalid",
          "Wall edge length is missing or invalid; candidate fact value is set to 0.",
          edge.id,
        ),
      );
    }

    return {
      id: `wall-fact-candidate-${edge.id || index + 1}`,
      kind: `${status}_wall_length_candidate`,
      value: finiteNumber(length) && length > 0 ? length : 0,
      unit: "mm",
      sourceId: edge.id,
      sourceKind: "node_graph_edge",
      productionReady: false,
      candidate: true,
      authority: SPIKE_AUTHORITY,
      attributes: {
        edgeId: edge.id,
        sourceWallId: edge.sourceWallId,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        from: edge.from,
        to: edge.to,
        thickness: edge.thickness,
        status,
        structural: edge.structural === true,
        layer: edge.layer,
      },
    };
  });
}

function mapOpeningsToQuantityFacts(
  openings: PlancraftPlusOpening[],
  edgeById: Map<string, PlancraftPlusNodeGraphEdge>,
  warnings: BudgetAdapterWarning[],
): QuantityFactCandidate[] {
  return openings.map((opening, index) => {
    const kind = opening.kind || "opening";
    const edge = opening.edgeId ? edgeById.get(opening.edgeId) : undefined;
    const edgeLength = edge ? resolveEdgeLength(edge) : undefined;

    warnings.push(
      warning(
        "plancraft_plus_openings_candidate_only",
        "Opening is mapped as candidate fact only and does not create a formal door or window line.",
        opening.id,
      ),
    );

    if (!edge) {
      warnings.push(
        warning(
          "plancraft_plus_opening_edge_missing",
          "Opening references an edge that is not available in nodeGraph.edges.",
          opening.id,
        ),
      );
    } else if (
      finiteNumber(opening.offset) &&
      finiteNumber(opening.width) &&
      finiteNumber(edgeLength) &&
      opening.offset + opening.width > edgeLength
    ) {
      warnings.push(
        warning(
          "plancraft_plus_opening_outside_edge",
          "Opening offset and width exceed the referenced edge length.",
          opening.id,
        ),
      );
    }

    return {
      id: `opening-fact-candidate-${opening.id || index + 1}`,
      kind: `${kind}_opening_count_candidate`,
      value: 1,
      unit: "count",
      sourceId: opening.id,
      sourceKind: "opening",
      productionReady: false,
      candidate: true,
      authority: SPIKE_AUTHORITY,
      attributes: {
        openingId: opening.id,
        edgeId: opening.edgeId,
        sourceWallId: opening.sourceWallId,
        kind,
        offset: opening.offset,
        width: opening.width,
        swing: opening.swing,
        sillHeight: opening.sillHeight,
        height: opening.height,
      },
    };
  });
}

function resolveEdgeLength(edge: PlancraftPlusNodeGraphEdge): number | undefined {
  if (finiteNumber(edge.length)) return edge.length;
  if (!edge.from || !edge.to) return undefined;
  if (!finiteNumber(edge.from.x) || !finiteNumber(edge.from.y)) return undefined;
  if (!finiteNumber(edge.to.x) || !finiteNumber(edge.to.y)) return undefined;

  return Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y);
}
