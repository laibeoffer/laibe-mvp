import type {
  BudgetAdapterUnsupported,
  BudgetAdapterWarning,
  BudgetInputFromFloorPlan,
  FormalEstimateGuard,
  LayoutObject,
  PreviewFloorPlanDraft,
  PreviewFloorPlanDraftObject,
  PreviewFloorPlanDraftRoom,
  PreviewFloorPlanDraftUnit,
  Project,
  QuantityFact,
  Space,
} from "../types.ts";

const DEFAULT_PROJECT_ID = "laibe-preview-floor-plan-adapter-demo";
const PLANCRAFT_PLUS_ADAPTER_AUTHORITY = "plancraft_plus_draft_spike";
const PLANCRAFT_PLUS_FORMAL_ESTIMATE_BLOCKED_CODE =
  "plancraft_plus_formal_estimate_blocked";

const PLANCRAFT_PLUS_FORMAL_ESTIMATE_GUARD: FormalEstimateGuard = {
  blocked: true,
  status: "blocked",
  reason: "plancraft_plus_adapter_spike",
  code: PLANCRAFT_PLUS_FORMAL_ESTIMATE_BLOCKED_CODE,
  message:
    "Plancraft+ adapter output is candidate-only and cannot enter formal estimate generation.",
  requiredNextStep:
    "Production adapter review and quantity contract approval required.",
  productionReady: false,
};

const cloneFormalEstimateGuard = (): FormalEstimateGuard => ({
  ...PLANCRAFT_PLUS_FORMAL_ESTIMATE_GUARD,
});

type PlancraftPlusWallStatus = "existing" | "new" | "demolished";
type PlancraftPlusOpeningKind = "door" | "window" | "opening";

interface PlancraftPlusPoint {
  x: number;
  y: number;
}

interface PlancraftPlusNodeGraphEdge {
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
}

interface PlancraftPlusOpening {
  id: string;
  edgeId?: string;
  sourceWallId?: string;
  kind?: PlancraftPlusOpeningKind;
  offset?: number;
  width?: number;
  swing?: string | null;
  sillHeight?: number | null;
  height?: number | null;
}

interface PlancraftPlusZone {
  id: string;
  name?: string;
  type?: string;
  labelPosition?: PlancraftPlusPoint;
  boundaryEdgeIds?: string[];
  boundaryWallIds?: string[];
  polygon?: PlancraftPlusPoint[];
  area?: number | null;
  boundaryStatus?: string;
  boundaryIssues?: Array<{
    type?: string;
    code?: string;
    message?: string;
  }>;
}

interface PlancraftPlusDraft {
  project_id?: string;
  name?: string;
  product?: string;
  version?: string;
  created_at?: string;
  unit?: "mm" | string;
  scale?: Record<string, unknown>;
  walls?: unknown[];
  wallGraph?: unknown;
  nodeGraph?: {
    edges?: PlancraftPlusNodeGraphEdge[];
  };
  openings?: PlancraftPlusOpening[];
  zones?: PlancraftPlusZone[];
  furniture?: unknown[];
  plancraftBridge?: Record<string, unknown>;
  user_requirements?: Record<string, unknown>;
}

const roomTypeToSpaceType: Record<string, string> = {
  living: "living_room",
  living_room: "living_room",
  kitchen: "kitchen",
  bedroom: "bedroom",
  master_bedroom: "bedroom",
  bathroom: "bathroom",
  bath: "bathroom",
  wet: "bathroom",
  wet_area: "bathroom",
  generic: "generic",
};

const objectTypeAliases: Record<string, string> = {
  KitchenIsland: "kitchen_island",
  kitchenIsland: "kitchen_island",
  kitchen_island: "kitchen_island",
  Wardrobe: "wardrobe",
  wardrobe: "wardrobe",
  ShoeCabinet: "shoe_cabinet",
  shoeCabinet: "shoe_cabinet",
  shoe_cabinet: "shoe_cabinet",
  BathroomFixture: "bathroom_fixture",
  bathroomFixture: "bathroom_fixture",
  bathroom_fixture: "bathroom_fixture",
  LightingPoint: "lighting_point",
  lightingPoint: "lighting_point",
  lighting_point: "lighting_point",
  Socket: "socket_point",
  socket: "socket_point",
  SocketPoint: "socket_point",
  socketPoint: "socket_point",
  socket_point: "socket_point",
};

const roundTo = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const getUnit = (draft: PreviewFloorPlanDraft): PreviewFloorPlanDraftUnit =>
  draft.unit ?? "mm";

const getCmPerDraftUnit = (draft: PreviewFloorPlanDraft): number => {
  const unit = getUnit(draft);

  if (unit === "cm") {
    return 1;
  }

  if (unit === "mm") {
    return 0.1;
  }

  // Temporary px conversion for future browser-canvas drafts:
  // budget_cm = draft_px * scale_ratio_cm_per_px.
  // Existing preview_floor_plan currently stores mm, so this is only a bridge fallback.
  return (
    draft.scale?.scale_ratio_cm_per_px ??
    draft.scale?.cm_per_px ??
    (draft.scale?.mm_per_px ? draft.scale.mm_per_px / 10 : 10)
  );
};

const toCm = (
  value: number | undefined,
  draft: PreviewFloorPlanDraft,
): number => roundTo((value ?? 0) * getCmPerDraftUnit(draft), 2);

const areaM2FromRoom = (
  room: PreviewFloorPlanDraftRoom,
  draft: PreviewFloorPlanDraft,
): number => {
  const widthCm = toCm(room.width, draft);
  const depthCm = toCm(room.height, draft);
  return roundTo((widthCm * depthCm) / 10000, 2);
};

const areaPingFromM2 = (areaM2: number): number => roundTo(areaM2 / 3.305785, 2);

const normalizeSpaceType = (type: string): string =>
  roomTypeToSpaceType[type] ?? roomTypeToSpaceType[type.toLowerCase()] ?? "generic";

const normalizeObjectType = (object: PreviewFloorPlanDraftObject): string => {
  const rawType = object.object_type ?? object.type ?? object.category ?? "unknown";
  return objectTypeAliases[rawType] ?? objectTypeAliases[rawType.toLowerCase()] ?? rawType;
};

const getDraftObjectDimension = (
  object: PreviewFloorPlanDraftObject,
  key: "width" | "depth" | "height",
): number | undefined => {
  if (key === "width") {
    return object.width ?? object.width_cm;
  }

  if (key === "depth") {
    return object.depth ?? object.depth_cm;
  }

  return object.height ?? object.height_cm;
};

const getObjectAssetCode = (object: PreviewFloorPlanDraftObject): string =>
  object.asset_code ??
  object.svg_ref ??
  object.graphics?.plan_svg_ref ??
  `${normalizeObjectType(object)}/unknown-asset`;

const getObjectId = (
  object: PreviewFloorPlanDraftObject,
  index: number,
): string => object.id ?? object.object_id ?? `draft-layout-object-${index + 1}`;

const flattenDraftObjects = (
  draft: PreviewFloorPlanDraft,
): PreviewFloorPlanDraftObject[] => {
  const topLevelObjects = [
    ...(draft.objects ?? []),
    ...(draft.layout_objects ?? []),
  ];
  const nestedObjects = (draft.rooms ?? []).flatMap((room) =>
    (room.objects ?? []).map((object) => ({
      ...object,
      room_id: object.room_id ?? object.space_id ?? room.id,
    })),
  );

  return [...topLevelObjects, ...nestedObjects].filter(
    (object) => object.budgetable !== false,
  );
};

const normalizeSpace = (
  draft: PreviewFloorPlanDraft,
  projectId: string,
  room: PreviewFloorPlanDraftRoom,
): Space => {
  const widthCm = toCm(room.width, draft);
  const depthCm = toCm(room.height, draft);
  const areaM2 = areaM2FromRoom(room, draft);

  return {
    id: room.id,
    project_id: projectId,
    name: room.name,
    space_name: room.name,
    space_type: normalizeSpaceType(room.type),
    floor_area_m2: areaM2,
    area_m2: areaM2,
    area_ping: areaPingFromM2(areaM2),
    width_cm: widthCm,
    depth_cm: depthCm,
    params: {
      ...(room.params ?? {}),
      source_type: "preview_floor_plan_draft",
      source_id: room.id,
      original_type: room.type,
      original_unit: getUnit(draft),
      x_cm: toCm(room.x, draft),
      y_cm: toCm(room.y, draft),
      width_cm_formula: `${room.width} ${getUnit(draft)} * ${getCmPerDraftUnit(draft)} cm_per_unit`,
      depth_cm_formula: `${room.height} ${getUnit(draft)} * ${getCmPerDraftUnit(draft)} cm_per_unit`,
    },
  };
};

const normalizeLayoutObject = (
  draft: PreviewFloorPlanDraft,
  projectId: string,
  object: PreviewFloorPlanDraftObject,
  index: number,
): LayoutObject => {
  const params = {
    ...(object.properties ?? {}),
    ...(object.params ?? {}),
    source_type: "preview_floor_plan_draft",
    source_id: getObjectId(object, index),
    original_unit: getUnit(draft),
    x_cm_formula: `${object.position?.x ?? object.x ?? 0} ${getUnit(draft)} * ${getCmPerDraftUnit(draft)} cm_per_unit`,
    y_cm_formula: `${object.position?.y ?? object.y ?? 0} ${getUnit(draft)} * ${getCmPerDraftUnit(draft)} cm_per_unit`,
  };

  return {
    id: getObjectId(object, index),
    project_id: projectId,
    space_id: object.space_id ?? object.room_id ?? "space-unknown",
    object_type: normalizeObjectType(object),
    asset_code: getObjectAssetCode(object),
    width_cm: object.width_cm ?? toCm(getDraftObjectDimension(object, "width"), draft),
    depth_cm: object.depth_cm ?? toCm(getDraftObjectDimension(object, "depth"), draft),
    height_cm: object.height_cm ?? toCm(getDraftObjectDimension(object, "height"), draft),
    x: toCm(object.position?.x ?? object.x, draft),
    y: toCm(object.position?.y ?? object.y, draft),
    rotation: object.rotation_deg ?? object.rotation ?? object.position?.rotation_deg ?? object.position?.rotation ?? 0,
    params,
  };
};

const adapterWarning = (
  code: string,
  message: string,
  sourceId?: string,
  details?: Record<string, unknown>,
): BudgetAdapterWarning => ({
  code,
  message,
  sourceId,
  severity: "warning",
  details,
});

const adapterUnsupported = (
  feature: string,
  reason: string,
  sourceId?: string,
  details?: Record<string, unknown>,
): BudgetAdapterUnsupported => ({
  feature,
  reason,
  sourceId,
  details,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isValidPreviewFloorPlanRoom = (
  room: unknown,
): room is PreviewFloorPlanDraftRoom =>
  isRecord(room) &&
  typeof room.id === "string" &&
  typeof room.name === "string" &&
  typeof room.type === "string" &&
  typeof room.x === "number" &&
  typeof room.y === "number" &&
  typeof room.width === "number" &&
  typeof room.height === "number";

const isLegacyPreviewFloorPlanDraft = (
  draft: unknown,
): draft is PreviewFloorPlanDraft =>
  isRecord(draft) &&
  typeof draft.name === "string" &&
  Array.isArray(draft.rooms) &&
  draft.rooms.every(isValidPreviewFloorPlanRoom);

const isPlancraftPlusDraft = (
  draft: unknown,
): draft is PlancraftPlusDraft => {
  if (!isRecord(draft)) {
    return false;
  }

  const candidate = draft as PlancraftPlusDraft;
  const hasRequiredIdentity =
    candidate.product === "Plancraft+" &&
    candidate.unit === "mm" &&
    typeof candidate.version === "string" &&
    candidate.version.length > 0;
  const hasBridge =
    Boolean(candidate.plancraftBridge) &&
    candidate.plancraftBridge?.targetFormat === ".pc";
  const hasDraftStructure =
    Array.isArray(candidate.nodeGraph?.edges) ||
    Array.isArray(candidate.zones) ||
    Array.isArray(candidate.openings);
  const hasCompatibleCollections =
    (candidate.walls === undefined || Array.isArray(candidate.walls)) &&
    (candidate.furniture === undefined || Array.isArray(candidate.furniture));

  return (
    hasRequiredIdentity &&
    hasBridge &&
    hasDraftStructure &&
    hasCompatibleCollections &&
    Boolean(candidate.scale)
  );
};

const calculateEdgeLengthMm = (edge: PlancraftPlusNodeGraphEdge): number => {
  if (typeof edge.length === "number" && Number.isFinite(edge.length)) {
    return roundTo(edge.length, 2);
  }

  if (!edge.from || !edge.to) {
    return 0;
  }

  return roundTo(
    Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y),
    2,
  );
};

const buildPlancraftPlusProject = (
  draft: PlancraftPlusDraft,
  projectId: string,
  spaces: Space[],
): Project => ({
  id: projectId,
  name: draft.name ?? "LaiBE Plancraft+ budget adapter spike",
  version: draft.version ?? "plancraft-plus-draft-unknown",
  created_at: draft.created_at ?? new Date().toISOString(),
  spaces,
  layout_objects: [],
  user_requirements: {
    ...(draft.user_requirements ?? {}),
    input_source: "plancraft_plus_draft",
    source_unit: draft.unit ?? "mm",
    adapter_name: "normalizeFloorPlanToBudgetInput",
    adapter_mode: "plancraft_plus_spike",
    authority: PLANCRAFT_PLUS_ADAPTER_AUTHORITY,
    productionReady: false,
    formal_estimate_generation: cloneFormalEstimateGuard(),
    formal_estimate_generation_status: "blocked",
    pc_converter_used_as_budget_input: false,
    svg_renderer_used_as_budget_input: false,
  },
});

const mapPlancraftPlusZonesToSpaces = (
  draft: PlancraftPlusDraft,
  projectId: string,
  warnings: BudgetAdapterWarning[],
): Space[] =>
  (draft.zones ?? []).map((zone) => {
    const boundaryStatus =
      zone.boundaryStatus ??
      (zone.boundaryEdgeIds?.length ? "unknown" : "none");
    const areaStatus =
      typeof zone.area === "number" && Number.isFinite(zone.area)
        ? "provided_unverified"
        : "not_calculated";

    if (boundaryStatus !== "closed") {
      warnings.push(
        adapterWarning(
          "plancraft_plus_zone_boundary_not_closed",
          "Zone boundary is not closed; generated Space is a candidate only.",
          zone.id,
          { boundaryStatus },
        ),
      );
    }

    if (areaStatus === "not_calculated") {
      warnings.push(
        adapterWarning(
          "plancraft_plus_area_not_calculated",
          "Zone area is not production-calculated.",
          zone.id,
        ),
      );
    }

    return {
      id: zone.id,
      project_id: projectId,
      name: zone.name ?? zone.id,
      space_name: zone.name ?? zone.id,
      space_type: normalizeSpaceType(zone.type ?? "generic"),
      params: {
        source_type: "plancraft_plus_zone",
        source_id: zone.id,
        authority: PLANCRAFT_PLUS_ADAPTER_AUTHORITY,
        productionReady: false,
        candidate: true,
        original_type: zone.type ?? "generic",
        boundaryStatus,
        boundaryIssues: zone.boundaryIssues ?? [],
        boundaryEdgeIds: zone.boundaryEdgeIds ?? [],
        boundaryWallIds: zone.boundaryWallIds ?? [],
        polygonPointCount: zone.polygon?.length ?? 0,
        areaStatus,
        areaSource:
          areaStatus === "not_calculated"
            ? null
            : "plancraft_plus_draft_unverified",
        labelPosition: zone.labelPosition ?? null,
      },
    };
  });

const mapPlancraftPlusOpeningsToCandidateFacts = (
  draft: PlancraftPlusDraft,
  projectId: string,
  edgeById: Map<string, PlancraftPlusNodeGraphEdge>,
  warnings: BudgetAdapterWarning[],
): QuantityFact[] => {
  const factTypeByKind: Record<PlancraftPlusOpeningKind, string> = {
    door: "door_opening_count",
    window: "window_opening_count",
    opening: "wall_opening_count",
  };

  return (draft.openings ?? []).map((opening) => {
    const kind = opening.kind ?? "opening";
    const edge = opening.edgeId ? edgeById.get(opening.edgeId) : undefined;

    if (!edge) {
      warnings.push(
        adapterWarning(
          "plancraft_plus_opening_edge_missing",
          "Opening edge was not found; generated fact is candidate-only and requires review.",
          opening.id,
          { edgeId: opening.edgeId ?? null },
        ),
      );
    }

    return {
      id: `qf-plancraft-plus-opening-${opening.id}`,
      project_id: projectId,
      fact_type: factTypeByKind[kind],
      source_type: "project",
      source_id: opening.id,
      object_type: kind,
      value: 1,
      unit: "count",
      formula: "candidate opening count from Plancraft+ draft; not production quantity",
      formula_inputs: {
        authority: PLANCRAFT_PLUS_ADAPTER_AUTHORITY,
        productionReady: false,
        candidate: true,
        source_kind: "opening",
        openingId: opening.id,
        edgeId: opening.edgeId ?? null,
        sourceWallId: opening.sourceWallId ?? edge?.sourceWallId ?? null,
        kind,
        offset_mm: opening.offset ?? null,
        width_mm: opening.width ?? null,
        height_mm: opening.height ?? null,
        sillHeight_mm: opening.sillHeight ?? null,
        swing: opening.swing ?? null,
        edgeFound: Boolean(edge),
      },
      rounding_rule: "integer_count_candidate",
      confidence: 0.35,
      requires_review: true,
      review_reason:
        "Plancraft+ openings are candidate facts only; formal door/window quantity mapping is not approved.",
    };
  });
};

const mapPlancraftPlusEdgesToCandidateFacts = (
  draft: PlancraftPlusDraft,
  projectId: string,
  warnings: BudgetAdapterWarning[],
): QuantityFact[] =>
  (draft.nodeGraph?.edges ?? []).map((edge) => {
    const status = edge.status ?? "existing";
    const lengthMm = calculateEdgeLengthMm(edge);

    if (lengthMm <= 0) {
      warnings.push(
        adapterWarning(
          "plancraft_plus_edge_length_invalid",
          "NodeGraph edge length is missing or invalid; wall length fact requires review.",
          edge.id,
          { lengthMm },
        ),
      );
    }

    return {
      id: `qf-plancraft-plus-wall-${edge.id}`,
      project_id: projectId,
      fact_type: `${status}_wall_length_candidate`,
      source_type: "project",
      source_id: edge.id,
      object_type: "wall",
      value: lengthMm,
      unit: "mm",
      formula: "nodeGraph.edge.length_mm candidate; not production wall quantity",
      formula_inputs: {
        authority: PLANCRAFT_PLUS_ADAPTER_AUTHORITY,
        productionReady: false,
        candidate: true,
        source_kind: "nodeGraph.edge",
        edgeId: edge.id,
        sourceWallId: edge.sourceWallId ?? null,
        fromNodeId: edge.fromNodeId ?? null,
        toNodeId: edge.toNodeId ?? null,
        from: edge.from ?? null,
        to: edge.to ?? null,
        status,
        thickness_mm: edge.thickness ?? null,
        structural: edge.structural ?? false,
        layer: edge.layer ?? "walls",
      },
      rounding_rule: "round_to_1_mm_candidate",
      confidence: lengthMm > 0 ? 0.4 : 0.1,
      requires_review: true,
      review_reason:
        "Plancraft+ wall length is a candidate fact only; formal demolition/new wall recipe mapping is blocked.",
    };
  });

const normalizePlancraftPlusDraftToBudgetContract = (
  draft: PlancraftPlusDraft,
): BudgetInputFromFloorPlan => {
  const projectId = draft.project_id ?? DEFAULT_PROJECT_ID;
  const warnings: BudgetAdapterWarning[] = [
    adapterWarning(
      "plancraft_plus_adapter_spike",
      "Plancraft+ budget adapter is spike only.",
    ),
    adapterWarning(
      "plancraft_plus_pc_not_budget_input",
      ".pc converter output is not used as budget input.",
    ),
    adapterWarning(
      "plancraft_plus_svg_not_budget_input",
      "SVG / renderer preview is not budget input.",
    ),
    adapterWarning(
      "plancraft_plus_openings_candidate_only",
      "Openings are candidate facts only.",
    ),
    adapterWarning(
      "plancraft_plus_furniture_not_supported",
      "Furniture/object placement is not supported for Plancraft+ draft.",
    ),
    adapterWarning(
      "plancraft_plus_formal_estimate_blocked",
      "Formal estimate generation is blocked.",
    ),
  ];

  const unsupported: BudgetAdapterUnsupported[] = [
    adapterUnsupported(
      "furniture",
      "Plancraft+ furniture is currently empty and unsupported by the budget adapter.",
    ),
    adapterUnsupported(
      "object_placement",
      "Plancraft+ object placement is not available; layout_objects remains legacy-only.",
    ),
    adapterUnsupported(
      "pc_converter_output",
      ".pc converter spike output is explicitly ignored by the budget adapter.",
    ),
    adapterUnsupported(
      "svg_renderer_preview",
      "SVG / renderer preview output is display-only and ignored by the budget adapter.",
    ),
    adapterUnsupported(
      "formal_estimate_generation",
      "This adapter returns candidates only and does not invoke production estimate generation.",
    ),
  ];

  const edgeById = new Map(
    (draft.nodeGraph?.edges ?? []).map((edge) => [edge.id, edge]),
  );
  const spaces = mapPlancraftPlusZonesToSpaces(draft, projectId, warnings);
  const quantityFacts = [
    ...mapPlancraftPlusEdgesToCandidateFacts(draft, projectId, warnings),
    ...mapPlancraftPlusOpeningsToCandidateFacts(
      draft,
      projectId,
      edgeById,
      warnings,
    ),
  ];
  const project = buildPlancraftPlusProject(draft, projectId, spaces);

  return {
    source: "plancraft_plus_draft",
    version: draft.version,
    adapterMode: "plancraft_plus_spike",
    productionReady: false,
    formalEstimateGuard: cloneFormalEstimateGuard(),
    project,
    spaces,
    quantityFacts,
    layoutObjects: [],
    warnings,
    unsupported,
    provenance: {
      source: "plancraft_plus_draft_json",
      product: draft.product ?? null,
      draftVersion: draft.version ?? null,
      authority: PLANCRAFT_PLUS_ADAPTER_AUTHORITY,
      zoneCount: draft.zones?.length ?? 0,
      edgeCount: draft.nodeGraph?.edges?.length ?? 0,
      openingCount: draft.openings?.length ?? 0,
      wallGraphPresent: Boolean(draft.wallGraph),
      nodeGraphPresent: Boolean(draft.nodeGraph),
      pcConverterUsed: false,
      svgRendererUsed: false,
      plancraftBridgeStatus: draft.plancraftBridge?.status ?? null,
      productionReady: false,
    },
  };
};

const normalizeUnsupportedFloorPlanInput = (
  draft: unknown,
): BudgetInputFromFloorPlan => {
  const candidate = isRecord(draft)
    ? (draft as Partial<PreviewFloorPlanDraft & PlancraftPlusDraft>)
    : {};
  const projectId =
    typeof candidate.project_id === "string"
      ? candidate.project_id
      : DEFAULT_PROJECT_ID;
  const name =
    typeof candidate.name === "string"
      ? candidate.name
      : "Unsupported floor plan draft";
  const version =
    typeof candidate.version === "string"
      ? candidate.version
      : "unsupported-floor-plan-draft";
  const createdAt =
    typeof candidate.created_at === "string"
      ? candidate.created_at
      : new Date().toISOString();

  const project: Project = {
    id: projectId,
    name,
    version,
    created_at: createdAt,
    spaces: [],
    layout_objects: [],
    user_requirements: {
      input_source: "unknown_floor_plan_draft",
      adapter_name: "normalizeFloorPlanToBudgetInput",
      productionReady: false,
      formal_estimate_generation: {
        ...cloneFormalEstimateGuard(),
        reason: "unsupported_floor_plan_draft",
        code: "preview_floor_plan_adapter_unknown_input",
        message:
          "Unsupported floor-plan adapter output cannot enter formal estimate generation.",
      },
      formal_estimate_generation_status: "blocked",
    },
  };

  return {
    source: "unknown_floor_plan_draft",
    version,
    adapterMode: "unsupported",
    productionReady: false,
    formalEstimateGuard: {
      ...cloneFormalEstimateGuard(),
      reason: "unsupported_floor_plan_draft",
      code: "preview_floor_plan_adapter_unknown_input",
      message:
        "Unsupported floor-plan adapter output cannot enter formal estimate generation.",
    },
    project,
    spaces: [],
    quantityFacts: [],
    layoutObjects: [],
    warnings: [
      adapterWarning(
        "preview_floor_plan_adapter_unknown_input",
        "Floor-plan draft shape is not recognized; no budget candidates were produced.",
      ),
    ],
    unsupported: [
      adapterUnsupported(
        "unknown_floor_plan_draft",
        "Adapter supports legacy rooms/objects and Plancraft+ draft JSON only.",
      ),
    ],
    provenance: {
      productionReady: false,
    },
  };
};

export const normalizeFloorPlanToBudgetInput = (
  draft: PreviewFloorPlanDraft | PlancraftPlusDraft | unknown,
): BudgetInputFromFloorPlan => {
  if (isPlancraftPlusDraft(draft)) {
    return normalizePlancraftPlusDraftToBudgetContract(draft);
  }

  if (!isLegacyPreviewFloorPlanDraft(draft)) {
    return normalizeUnsupportedFloorPlanInput(draft);
  }

  const projectId = draft.project_id ?? DEFAULT_PROJECT_ID;
  const spaces = draft.rooms.map((room) => normalizeSpace(draft, projectId, room));
  const layoutObjects = flattenDraftObjects(draft).map((object, index) =>
    normalizeLayoutObject(draft, projectId, object, index),
  );

  const project: Project = {
    id: projectId,
    name: draft.name,
    version: draft.version ?? "preview-floor-plan-adapter-v1",
    created_at: draft.created_at ?? new Date().toISOString(),
    spaces,
    layout_objects: layoutObjects,
    user_requirements: {
      ...(draft.user_requirements ?? {}),
      input_source: "preview_floor_plan_draft",
      source_unit: getUnit(draft),
      adapter_name: "normalizeFloorPlanToBudgetInput",
    },
  };

  return {
    project,
    spaces,
    layoutObjects,
  };
};
