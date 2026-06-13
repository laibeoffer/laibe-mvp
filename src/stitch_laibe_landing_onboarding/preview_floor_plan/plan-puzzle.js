(function () {
  const GRID_PIXEL_SIZE = 40;
  const DEFAULT_UNDERLAY_OPACITY = 0.55;
  const MIN_UNDERLAY_OPACITY = 0.15;
  const MAX_UNDERLAY_OPACITY = 1;
  const MIN_WALL_LENGTH = 200;
  const MIN_WALL_THICKNESS = 50;
  const MAX_WALL_THICKNESS = 500;
  const DEFAULT_WALL_THICKNESS = 120;
  const DEFAULT_WALL_TYPE = "solid_partition";
  const WALL_TYPE_OPTIONS = [
    { value: "existing_wall", label: "既有牆", detail: "現況保留牆體", color: "#3C3C3C" },
    { value: "bearing_wall", label: "承重牆 / 分戶牆", detail: "深灰實牆，常見 240mm 以上", color: "#3C3C3C" },
    { value: "light_partition", label: "輕隔間", detail: "灰色雙斜線剖線，常見 100mm", color: "#8E8E8E" },
    { value: "wood_partition", label: "木隔間", detail: "灰色斜線剖線，常見 100mm", color: "#8E8E8E" },
    { value: "solid_partition", label: "分間實牆", detail: "磚牆或石膏磚牆，常見 150mm", color: "#5B5B5B" }
  ];
  const WALL_THICKNESS_OPTIONS = [
    { value: 80, label: "80mm　薄牆、待現場確認" },
    { value: 100, label: "100mm　木隔間、輕隔間" },
    { value: 120, label: "120mm　一般室內隔間" },
    { value: 150, label: "150mm　磚牆、石膏磚牆" },
    { value: 200, label: "200mm　管道牆、厚隔間" },
    { value: 240, label: "240mm　分間牆、承重牆" }
  ];
  const WALL_THICKNESS_HELP_TEXT = "承重牆常見 240mm；木隔間與輕隔間常見 100mm；磚牆與石膏磚牆常見 150mm，仍以現場確認為準。";
  const ENDPOINT_SNAP_DISTANCE_PX = 12;
  const ORTHOGONAL_TOLERANCE_DEG = 10;
  const NEARBY_ENDPOINT_MIN_DISTANCE = 30;
  const NEARBY_ENDPOINT_MAX_DISTANCE = 150;
  const CLEANUP_MERGE_DISTANCE = 30;
  const GEOMETRY_EPSILON = 0.5;
  const PARAMETER_EPSILON = 1e-6;
  const MIN_OPENING_WIDTH = 300;
  const HISTORY_LIMIT = 50;
  const DEFAULT_OPENING_WIDTHS = {
    door: 900,
    window: 1200,
    opening: 1000
  };
  const OPENING_WIDTH_RANGES = {
    door: { min: 700, max: 1200 },
    window: { min: 400, max: 3000 },
    opening: { min: 300, max: 3000 }
  };
  const DEFAULT_ZONE_TYPE = "living";
  const MIN_FURNITURE_WIDTH_MM = 200;
  const MIN_FURNITURE_DEPTH_MM = 200;
  const FURNITURE_TEMPLATES = {
    wardrobe: {
      type: "wardrobe",
      category: "cabinet",
      name: "衣櫃",
      widthMm: 1800,
      depthMm: 600,
      heightMm: 2400,
      materialTags: ["wood"]
    },
    tall_cabinet: {
      type: "tall_cabinet",
      category: "cabinet",
      name: "高櫃",
      widthMm: 900,
      depthMm: 600,
      heightMm: 2400,
      materialTags: ["system_panel"]
    },
    low_wall_cabinet: {
      type: "low_wall_cabinet",
      category: "cabinet",
      name: "矮櫃 / 吊櫃",
      widthMm: 1200,
      depthMm: 450,
      heightMm: 900,
      materialTags: ["system_panel"]
    },
    tv_cabinet: {
      type: "tv_cabinet",
      category: "cabinet",
      name: "電視櫃",
      widthMm: 1800,
      depthMm: 450,
      heightMm: 500,
      materialTags: ["wood"]
    },
    kitchen_cabinet: {
      type: "kitchen_cabinet",
      category: "cabinet",
      name: "廚具",
      widthMm: 1800,
      depthMm: 600,
      heightMm: 900,
      materialTags: ["stone", "system_panel"]
    },
    bed: {
      type: "bed",
      category: "furniture",
      name: "床",
      widthMm: 1500,
      depthMm: 2000,
      heightMm: 500,
      materialTags: ["fabric"]
    },
    sofa: {
      type: "sofa",
      category: "furniture",
      name: "沙發",
      widthMm: 2100,
      depthMm: 900,
      heightMm: 850,
      materialTags: ["fabric"]
    },
    dining_table: {
      type: "dining_table",
      category: "furniture",
      name: "餐桌",
      widthMm: 1600,
      depthMm: 900,
      heightMm: 760,
      materialTags: ["wood"]
    },
    toilet: {
      type: "toilet",
      category: "fixture",
      name: "馬桶",
      widthMm: 420,
      depthMm: 700,
      heightMm: 750,
      materialTags: ["ceramic"]
    },
    washbasin: {
      type: "washbasin",
      category: "fixture",
      name: "洗手台",
      widthMm: 600,
      depthMm: 500,
      heightMm: 850,
      materialTags: ["ceramic"]
    }
  };
  const FURNITURE_MATERIAL_TAGS = ["wood", "system_panel", "stone", "fabric", "ceramic", "metal", "unspecified"];
  const FURNITURE_CATEGORY_LABELS = {
    cabinet: "櫃體",
    furniture: "家具",
    fixture: "設備"
  };
  const FURNITURE_MATERIAL_LABELS = {
    wood: "木質",
    system_panel: "系統板材",
    stone: "石材",
    fabric: "布料",
    ceramic: "陶瓷",
    metal: "金屬",
    unspecified: "未指定"
  };
  const OPENING_KIND_LABELS = {
    door: "門",
    window: "窗",
    opening: "開口"
  };
  const OPENING_SWING_LABELS = {
    left: "左開",
    right: "右開",
    sliding: "橫拉",
    none: "無門片"
  };
  const BLANK_DRAFT_WIDTH_MM = 6000;
  const BLANK_DRAFT_HEIGHT_MM = 4000;
  const BLANK_DRAFT_PX_PER_MM = 0.1;
  const AUTO_SCALE_MIN_MM = 300;
  const AUTO_SCALE_MAX_MM = 50000;
  const AUTO_SCALE_CONFIDENCE_LABELS = {
    high: "高",
    medium: "中",
    low: "低"
  };
  const ZONE_BOUNDARY_MIN_EDGES = 3;
  const ZONE_TYPE_LABELS = {
    living: "客廳",
    bedroom: "臥室",
    kitchen: "廚房",
    bathroom: "浴室",
    dining: "餐廳",
    balcony: "陽台",
    entry: "玄關",
    storage: "儲藏室",
    closet: "更衣室",
    other: "空間"
  };
  const DRAFT_FILE_NAME = "laibe-plancraft-plus-draft.json";
  const PC_SPIKE_FILE_NAME = "laibe-plancraft-plus-spike.pc";
  const PC_SPIKE_NOTICE = "此為 .pc 候選測試檔，尚未完成正式格式與圖面預覽驗證。";
  const PC_VALIDATION_STATUSES = new Set(["not_run", "passed", "failed"]);
  const PC_PREVIEW_STATUSES = new Set(["not_run", "passed", "failed"]);
  const PC_RENDERER_PREVIEW_COMMAND = "cd C:\\laibe_project\r\nnode C:\\laibe_project\\plancraft\\packages\\cli\\dist\\index.js compile C:\\path\\to\\laibe-plancraft-plus-spike.pc --structure-only -o C:\\path\\to\\laibe-plancraft-plus-spike.svg";
  const PC_RENDERER_LAYERS_COMMAND = "node C:\\laibe_project\\plancraft\\packages\\cli\\dist\\index.js compile C:\\path\\to\\laibe-plancraft-plus-spike.pc --layers walls,openings,labels -o C:\\path\\to\\laibe-plancraft-plus-layers.svg";
  const PDF_NOT_SUPPORTED_MESSAGE = "此版本已建立 PDF 匯入接口，但尚未支援 PDF 直接預覽與校正。請先將丈量圖轉成 JPG 或 PNG 上傳；PDF 轉圖會在後續版本接入 Plancraft+ 匯入流程。";
  const STYLE_VISUAL_DISCLAIMER = "本圖僅為風格示意，用於案件上架與溝通參考，不代表最終設計、施工圖、實際尺寸、工法、材料品牌或正式報價內容。";
  const STYLE_VISUAL_PROXY_ENABLED = false;
  const STYLE_VISUAL_PROXY_ENDPOINT = "";
  const STYLE_VISUAL_PROXY_ALLOWED_ENDPOINT = "/api/style-visual-image-spike";
  const STYLE_VISUAL_PROXY_DISABLED_MESSAGE = "圖片示意服務尚未啟用";
  const STYLE_VISUAL_REFERENCE_IMAGE_NOTICE = "風格參考圖上傳尚未開放，需先完成隱私審查。";
  const STYLE_VISUAL_AVOID = "施工圖、正式設計圖、真實案例、正式報價依據、完工保證、材料品牌承諾、法規符合宣稱、過度豪宅化";
  const STYLE_VISUAL_FIELD_LIMITS = {
    roomType: 20,
    primaryStyle: 20,
    secondaryStyle: 20,
    colorTone: 30,
    materialTone: 40,
    budgetLevel: 20
  };
  const STYLE_VISUAL_BLOCKED_PROMPT_PATTERNS = [
    /忽略(前文|所有)?規則/gi,
    /忽略(前文|所有)?限制/gi,
    /ignore\s+(previous|all)\s+(rules|instructions|limits)/gi,
    /system\s*prompt/gi,
    /developer\s*prompt/gi,
    /移除.{0,8}disclaimer/gi,
    /不要.{0,8}(標示|顯示).{0,8}(示意圖|AI|disclaimer)/gi,
    /真實案例|實績照片|完工照|施工成果|施工圖|竣工圖|正式設計圖|正式報價|報價依據|完工保證|法規符合|消防符合|結構安全/gi,
    /real\s*case|completed\s*project|construction\s*drawing|blueprint|official\s*quotation|final\s*design/gi
  ];
  const SVG_NS = "http://www.w3.org/2000/svg";

  const canvas = document.getElementById("planCanvas");
  const underlayLayer = document.getElementById("underlayLayer");
  const wallLayer = document.getElementById("wallLayer");
  const openingLayer = document.getElementById("openingLayer");
  const zonePolygonLayer = document.getElementById("zonePolygonLayer");
  const zoneLayer = document.getElementById("zoneLayer");
  const wallGraphLayer = document.getElementById("wallGraphLayer");
  const calibrationLayer = document.getElementById("calibrationLayer");
  const canvasHelper = document.getElementById("canvasHelper");
  const inspectorBody = document.getElementById("inspectorBody");
  const fileInput = document.getElementById("planImportInput");
  const underlayStatusText = document.getElementById("underlayStatusText");
  const scaleStatusText = document.getElementById("scaleStatusText");
  const wallCountStatusText = document.getElementById("wallCountStatusText");
  const nodeCountStatusText = document.getElementById("nodeCountStatusText");
  const issueCountStatusText = document.getElementById("issueCountStatusText");

  if (!canvas || !underlayLayer || !wallLayer || !openingLayer || !zonePolygonLayer || !zoneLayer || !wallGraphLayer || !calibrationLayer || !canvasHelper || !inspectorBody || !fileInput) {
    return;
  }

  let project = createInitialProject();
  let uiState = createInitialUIState();
  let styleVisualRequest = createInitialStyleVisualRequest();
  let styleVisualTask = createInitialStyleVisualTask();
  let styleVisualTimer = null;
  let importSequence = 0;
  let furniturePointerState = null;
  let undoStack = [];
  let redoStack = [];
  let historySequence = 0;

  Object.defineProperty(window, "laibePlancraftPlusProject", {
    get() {
      return project;
    }
  });

  Object.defineProperty(window, "laibePlanPuzzleProject", {
    get() {
      return project;
    }
  });

  Object.defineProperty(window, "laibePlancraftPlusUiState", {
    get() {
      return uiState;
    }
  });

  Object.defineProperty(window, "styleVisualRequest", {
    get() {
      return styleVisualRequest;
    }
  });

  Object.defineProperty(window, "styleVisualTask", {
    get() {
      return styleVisualTask;
    }
  });

  canvas.style.setProperty("--grid-px", `${GRID_PIXEL_SIZE}px`);

  document.addEventListener("click", handleActionClick);
  document.addEventListener("input", handleDocumentInput);
  document.addEventListener("change", handleDocumentChange);
  document.addEventListener("keydown", handleDocumentKeydown);
  fileInput.addEventListener("change", handleFileSelection);
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("pointermove", handleCanvasPointerMove);
  canvas.addEventListener("pointerleave", handleCanvasPointerLeave);
  window.addEventListener("resize", render);

  render();

  function createInitialProject() {
    return {
      name: "LaiBE Plancraft+ 草稿",
      product: "Plancraft+",
      version: "0.10.0-renderer-preview-spike",
      unit: "mm",
      importSource: null,
      scale: {
        pxPerMm: null,
        calibrated: false,
        autoScaleSuggestion: null,
        autoScaleApplied: false
      },
      underlay: null,
      walls: [],
      wallGraph: createInitialWallGraph(),
      nodeGraph: createInitialNodeGraph(),
      openings: [],
      zones: [],
      furniture: [],
      plancraftBridge: getPlancraftBridgeStatus()
    };
  }

  function createInitialWallGraph() {
    return {
      nodes: [],
      issues: [],
      lastBuiltAt: null
    };
  }

  function createInitialNodeGraph() {
    return {
      nodes: [],
      edges: [],
      issues: [],
      lastBuiltAt: null
    };
  }

  function createInitialUIState() {
    return {
      mode: "select",
      selectedWallId: null,
      selectedEdgeId: null,
      selectedOpeningId: null,
      selectedZoneId: null,
      selectedFurnitureId: null,
      selectedIssueId: null,
      selectedNodeId: null,
      calibrationPoints: [],
      knownLengthInput: "",
      wallDraftStart: null,
      wallDraftStartSnapPoint: null,
      wallPreviewEnd: null,
      snapPoint: null,
      snapEnabled: true,
      orthogonalEnabled: true,
      layerVisibility: createInitialLayerVisibility(),
      currentWallStatus: "existing",
      currentWallType: DEFAULT_WALL_TYPE,
      currentWallThickness: DEFAULT_WALL_THICKNESS,
      currentOpeningKind: "door",
      currentOpeningWidth: DEFAULT_OPENING_WIDTHS.door,
      currentOpeningSwing: "left",
      currentZoneType: DEFAULT_ZONE_TYPE,
      currentZoneName: ZONE_TYPE_LABELS[DEFAULT_ZONE_TYPE],
      currentFurnitureTemplateId: "wardrobe",
      currentFurnitureMaterialTag: "wood",
      inspectorTab: "properties",
      zoneBoundaryState: createInitialZoneBoundaryState(),
      pcConverterReport: createInitialPcConverterReport(),
      lastDraftExportPreview: null,
      message: "",
      error: ""
    };
  }

  function createInitialLayerVisibility() {
    return {
      underlay: true,
      walls: true,
      openings: true,
      zones: true,
      furniture: true,
      diagnostics: true
    };
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createHistorySnapshot(label) {
    return {
      id: `history-${++historySequence}`,
      label,
      createdAt: new Date().toISOString(),
      project: cloneJson(project),
      uiState: cloneJson(uiState),
      styleVisualRequest: cloneJson(styleVisualRequest),
      styleVisualTask: cloneJson(styleVisualTask)
    };
  }

  function pushHistory(label) {
    undoStack.push(createHistorySnapshot(label));
    if (undoStack.length > HISTORY_LIMIT) {
      undoStack.shift();
    }
    redoStack = [];
  }

  function restoreHistorySnapshot(snapshot, message) {
    project = cloneJson(snapshot.project);
    uiState = cloneJson(snapshot.uiState);
    styleVisualRequest = cloneJson(snapshot.styleVisualRequest);
    styleVisualTask = cloneJson(snapshot.styleVisualTask);
    furniturePointerState = null;
    importSequence += 1;
    fileInput.value = "";
    uiState.message = message;
    uiState.error = "";
    clearWallDraft();
    render();
  }

  function undoLastAction() {
    if (!undoStack.length) {
      uiState.error = "";
      uiState.message = "目前沒有可復原的繪圖動作。";
      render();
      return;
    }
    const currentSnapshot = createHistorySnapshot("重做前狀態");
    const previousSnapshot = undoStack.pop();
    redoStack.push(currentSnapshot);
    restoreHistorySnapshot(previousSnapshot, `已復原：${previousSnapshot.label}`);
  }

  function redoLastAction() {
    if (!redoStack.length) {
      uiState.error = "";
      uiState.message = "目前沒有可重做的繪圖動作。";
      render();
      return;
    }
    const currentSnapshot = createHistorySnapshot("復原前狀態");
    const nextSnapshot = redoStack.pop();
    undoStack.push(currentSnapshot);
    if (undoStack.length > HISTORY_LIMIT) {
      undoStack.shift();
    }
    restoreHistorySnapshot(nextSnapshot, `已重做：${nextSnapshot.label}`);
  }

  function createInitialZoneBoundaryState() {
    return {
      activeZoneId: null,
      selectedBoundaryEdgeIds: [],
      previewPolygon: [],
      issues: []
    };
  }

  function createInitialPcConverterReport() {
    return {
      status: "idle",
      fileName: PC_SPIKE_FILE_NAME,
      notice: PC_SPIKE_NOTICE,
      exportedAt: null,
      summary: {
        roomCount: 0,
        wallCount: 0,
        openingCount: 0,
        skippedZoneCount: 0,
        skippedOpeningCount: 0
      },
      warnings: [],
      errors: [],
      validation: createInitialPcValidationResult(),
      preview: createInitialRendererPreviewResult()
    };
  }

  function createInitialPcValidationResult() {
    return {
      status: "not_run",
      checkedAt: null,
      reason: "靜態頁尚未直接載入正式檔案檢查器；請使用本機驗證流程確認 .pc 候選測試檔。",
      errors: [],
      warnings: []
    };
  }

  function normalizePcValidationResult(validation) {
    const fallback = createInitialPcValidationResult();
    if (!validation || typeof validation !== "object") {
      return fallback;
    }
    const status = PC_VALIDATION_STATUSES.has(validation.status) ? validation.status : fallback.status;
    return {
      status,
      checkedAt: validation.checkedAt || null,
      reason: validation.reason || fallback.reason,
      errors: Array.isArray(validation.errors) ? [...validation.errors] : [],
      warnings: Array.isArray(validation.warnings) ? [...validation.warnings] : []
    };
  }

  function getPcValidationNextAction(validation) {
    const normalized = normalizePcValidationResult(validation);
    if (normalized.status === "passed") {
      return "格式檢查已通過；下一步可評估圖面預覽或共用牆整理。";
    }
    if (normalized.status === "failed") {
      return "請依驗證錯誤修正轉換格式後重新匯出 .pc。";
    }
    return "靜態頁尚未直接載入正式檔案檢查器；請使用本機驗證流程確認匯出的 .pc 候選檔。";
  }

  function createInitialRendererPreviewResult() {
    return {
      status: "not_run",
      checkedAt: null,
      svgOutputPath: null,
      command: PC_RENDERER_PREVIEW_COMMAND,
      errors: [],
      warnings: [
        "靜態頁尚未直接載入正式圖面預覽器；請使用本機驗證流程產生 SVG 預覽。"
      ]
    };
  }

  function normalizeRendererPreviewResult(preview) {
    const fallback = createInitialRendererPreviewResult();
    if (!preview || typeof preview !== "object") {
      return fallback;
    }
    const status = PC_PREVIEW_STATUSES.has(preview.status) ? preview.status : fallback.status;
    return {
      status,
      checkedAt: preview.checkedAt || null,
      svgOutputPath: preview.svgOutputPath || null,
      command: preview.command || fallback.command,
      errors: Array.isArray(preview.errors) ? [...preview.errors] : [],
      warnings: Array.isArray(preview.warnings) ? [...preview.warnings] : fallback.warnings
    };
  }

  function getRendererPreviewNextAction(preview) {
    const normalized = normalizeRendererPreviewResult(preview);
    if (normalized.status === "passed") {
      return "圖面預覽已通過代表性檢查；下一步可評估共用牆整理。";
    }
    if (normalized.status === "failed") {
      return "請依圖面預覽錯誤修正轉換格式或空間邊界，再重新產生預覽。";
    }
    return "先匯出 .pc 候選測試檔，再用本機驗證流程產生 SVG 預覽。";
  }

  function createInitialStyleVisualRequest() {
    return {
      roomType: "客廳",
      primaryStyle: "奶油風",
      secondaryStyle: "古典風",
      colorTone: "米白暖色",
      materialTone: "大理石 + 溫潤木質",
      budgetLevel: "中高階",
      purpose: "bid-listing-style-reference"
    };
  }

  function createInitialStyleVisualTask() {
    return {
      id: createId("style-visual-task"),
      status: "idle",
      createdAt: null,
      visualBrief: "",
      promptPreview: "",
      sanitizedPrompt: "",
      styleVisualApiRequest: null,
      styleVisualApiResponse: null,
      proxyStatus: "disabled",
      referenceImagePolicy: getStyleVisualReferenceImagePolicy(),
      generatedPreview: null,
      disclaimer: STYLE_VISUAL_DISCLAIMER
    };
  }

  function getPlancraftBridgeStatus(currentProject) {
    const previousBridge = currentProject?.plancraftBridge || {};
    return {
      status: "spike",
      targetFormat: ".pc",
      converterVersion: "0.1.0-spike",
      message: "已建立 .pc 候選檔與圖面預覽驗證流程",
      reason: "圖面預覽仍是測試流程，尚未進入正式整合",
      requiredNextStep: "確認 SVG 預覽品質後，評估共用牆整理或瀏覽器預覽整合",
      lastExportedAt: previousBridge.lastExportedAt || null,
      lastExportSummary: previousBridge.lastExportSummary || null,
      warnings: Array.isArray(previousBridge.warnings) ? [...previousBridge.warnings] : [],
      validation: normalizePcValidationResult(previousBridge.validation),
      preview: normalizeRendererPreviewResult(previousBridge.preview)
    };
  }

  function handleActionClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.action;
    if (action === "focus-canvas") {
      focusCanvasForHumanAction();
      return;
    }
    if (action === "set-inspector-tab") {
      setInspectorTab(actionButton.dataset.inspectorTab);
      return;
    }
    if (action === "undo-action") {
      undoLastAction();
      return;
    }
    if (action === "redo-action") {
      redoLastAction();
      return;
    }
    if (action === "choose-file") {
      chooseFile();
    }
    if (action === "start-blank-mm-draft") {
      startBlankMmDraft();
    }
    if (action === "start-calibration") {
      startCalibration();
    }
    if (action === "apply-calibration") {
      applyCalibration();
    }
    if (action === "apply-auto-scale-suggestion") {
      applyAutoScaleSuggestion();
    }
    if (action === "set-select-mode") {
      enterSelectMode("已切換為選取模式。");
    }
    if (action === "delete-current-selection") {
      deleteCurrentSelection();
    }
    if (action === "start-draw-wall") {
      startDrawWall();
    }
    if (action === "start-place-zone") {
      startPlaceZone();
    }
    if (action === "select-furniture-template") {
      selectFurnitureTemplate(actionButton.dataset.furnitureTemplate);
    }
    if (action === "start-place-furniture") {
      startPlaceFurniture();
    }
    if (action === "start-zone-boundary") {
      startZoneBoundaryEdit();
    }
    if (action === "apply-zone-boundary") {
      applyZoneBoundary();
    }
    if (action === "clear-zone-boundary") {
      clearSelectedZoneBoundary();
    }
    if (action === "clean-wall-endpoints") {
      cleanWallEndpoints();
    }
    if (action === "select-issue") {
      selectIssue(actionButton.dataset.issueId);
    }
    if (action === "split-wall-intersection") {
      splitSelectedIntersectionIssue();
    }
    if (action === "add-opening") {
      addOpening(actionButton.dataset.openingKind);
    }
    if (action === "delete-opening") {
      deleteSelectedOpening();
    }
    if (action === "select-opening-wall") {
      selectWallForSelectedOpening();
    }
    if (action === "delete-zone") {
      deleteSelectedZone();
    }
    if (action === "delete-wall") {
      deleteSelectedWall();
    }
    if (action === "delete-furniture") {
      deleteSelectedFurniture();
    }
    if (action === "apply-furniture-material") {
      applySelectedFurnitureMaterial(actionButton.dataset.materialTag);
    }
    if (action === "apply-current-furniture-material") {
      applySelectedFurnitureMaterial(uiState.currentFurnitureMaterialTag);
    }
    if (action === "reset-project") {
      resetProject();
    }
    if (action === "export-draft") {
      exportDraft();
    }
    if (action === "export-pc-spike") {
      exportPcSpike();
    }
    if (action === "generate-style-visual") {
      startStyleVisualDraft();
    }
    if (shouldFocusCanvasAfterAction(action)) {
      focusCanvasForHumanAction();
    }
  }

  function shouldFocusCanvasAfterAction(action) {
    return [
      "start-blank-mm-draft",
      "start-calibration",
      "apply-auto-scale-suggestion",
      "set-select-mode",
      "start-draw-wall",
      "start-place-zone",
      "add-opening",
      "select-furniture-template",
      "start-place-furniture"
    ].includes(action);
  }

  function setInspectorTab(tabName) {
    const allowedTabs = ["properties", "layers", "reminders", "materials", "overview"];
    uiState.inspectorTab = allowedTabs.includes(tabName) ? tabName : "properties";
    render();
  }

  function focusCanvasForHumanAction() {
    window.requestAnimationFrame(() => {
      const shell = canvas.closest(".tool-shell") || canvas.closest(".canvas-shell") || canvas;
      shell.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
    });
  }

  function handleDocumentInput(event) {
    const input = event.target.closest("[data-field]");
    if (!input) {
      return;
    }

    const field = input.dataset.field;
    if (field === "underlay-opacity") {
      updateUnderlayOpacity(input);
    }
    if (field === "known-length") {
      uiState.knownLengthInput = input.value;
    }
    if (field.startsWith("layer-visibility-")) {
      updateLayerVisibility(input);
      return;
    }
    if (field === "current-opening-width") {
      uiState.currentOpeningWidth = readPositiveNumber(input.value, DEFAULT_OPENING_WIDTHS.door);
    }
    if (field === "current-zone-name") {
      uiState.currentZoneName = input.value;
    }
    if (field === "selected-zone-name") {
      updateSelectedZoneFromField(input);
    }
    if (field === "selected-zone-x" || field === "selected-zone-y") {
      updateSelectedZoneFromField(input);
    }
    if (
      field === "selected-opening-offset" ||
      field === "selected-opening-width" ||
      field === "selected-opening-sill-height" ||
      field === "selected-opening-height"
    ) {
      previewSelectedOpeningDimensionFromField(input);
      return;
    }
    if (
      field === "selected-furniture-width" ||
      field === "selected-furniture-depth" ||
      field === "selected-furniture-height" ||
      field === "selected-furniture-rotation"
    ) {
      previewSelectedFurnitureDimensionFromField(input);
      return;
    }
    if (field.startsWith("selected-furniture-")) {
      // Text fields still commit on change so typing notes is not interrupted by re-rendering mid-typing.
      return;
    }
    if (field.startsWith("style-visual-")) {
      updateStyleVisualRequestFromField(input);
    }
  }

  function handleDocumentChange(event) {
    const input = event.target.closest("[data-field]");
    if (!input) {
      return;
    }

    const field = input.dataset.field;
    if (field === "current-wall-status") {
      uiState.currentWallStatus = normalizeWallStatus(input.value);
      uiState.message = `下一段牆將標記為：${getWallStatusLabel(uiState.currentWallStatus)}。`;
      uiState.error = "";
      render();
      return;
    }
    if (field === "current-wall-type") {
      uiState.currentWallType = normalizeWallType(input.value);
      uiState.message = `下一段牆分類：${getWallTypeLabel(uiState.currentWallType)}。`;
      uiState.error = "";
      render();
      return;
    }
    if (field === "current-wall-thickness") {
      uiState.currentWallThickness = normalizeThickness(input.value);
      uiState.message = `下一段牆厚：${uiState.currentWallThickness} mm。`;
      uiState.error = "";
      render();
      return;
    }
    if (field === "snap-enabled") {
      uiState.snapEnabled = input.checked;
      uiState.message = uiState.snapEnabled ? "端點吸附已開啟。" : "端點吸附已關閉。";
      uiState.error = "";
      render();
      return;
    }
    if (field === "orthogonal-enabled") {
      uiState.orthogonalEnabled = input.checked;
      uiState.message = uiState.orthogonalEnabled ? "水平 / 垂直輔助已開啟。" : "水平 / 垂直輔助已關閉。";
      uiState.error = "";
      render();
      return;
    }
    if (field === "current-opening-width") {
      uiState.currentOpeningWidth = normalizeOpeningWidthInput(input.value, uiState.currentOpeningWidth);
      uiState.error = "";
      render();
      return;
    }
    if (field === "current-opening-swing") {
      uiState.currentOpeningSwing = normalizeOpeningSwing(input.value);
      uiState.error = "";
      render();
      return;
    }
    if (field === "current-zone-type") {
      updateCurrentZoneType(input.value);
      render();
      return;
    }
    if (field === "current-zone-name") {
      uiState.currentZoneName = input.value.trim() || ZONE_TYPE_LABELS[uiState.currentZoneType];
      uiState.error = "";
      render();
      return;
    }
    if (field === "current-furniture-template") {
      selectFurnitureTemplate(input.value);
      focusCanvasForHumanAction();
      return;
    }
    if (field === "current-furniture-material") {
      uiState.currentFurnitureMaterialTag = normalizeFurnitureMaterialTag(input.value);
      uiState.error = "";
      render();
      return;
    }
    if (field.startsWith("style-visual-")) {
      updateStyleVisualRequestFromField(input);
      render();
      return;
    }
    if (field.startsWith("selected-furniture-")) {
      updateSelectedFurnitureFromField(input);
      return;
    }
    if (field.startsWith("selected-zone-")) {
      updateSelectedZoneFromField(input);
      return;
    }
    if (field.startsWith("selected-opening-")) {
      updateSelectedOpeningFromField(input);
      return;
    }
    if (field.startsWith("selected-wall-")) {
      updateSelectedWallFromField(input);
    }
  }

  function handleDocumentKeydown(event) {
    const target = event.target;
    const isEditingText = target instanceof HTMLElement && (
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    );
    if (isEditingText) {
      return;
    }

    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
      event.preventDefault();
      undoLastAction();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && (key === "y" || (key === "z" && event.shiftKey))) {
      event.preventDefault();
      redoLastAction();
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteCurrentSelection();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      enterSelectMode("已取消目前操作。");
    }
  }

  function deleteCurrentSelection() {
    if (uiState.selectedFurnitureId) {
      deleteSelectedFurniture();
      return;
    }
    if (uiState.selectedZoneId) {
      deleteSelectedZone();
      return;
    }
    if (uiState.selectedOpeningId) {
      deleteSelectedOpening();
      return;
    }
    if (uiState.selectedWallId) {
      deleteSelectedWall();
      return;
    }
    uiState.error = "";
    uiState.message = "請先選取牆、門窗、空間或家具候選項目，再按 Delete 刪除。";
    render();
  }

  function chooseFile() {
    fileInput.value = "";
    fileInput.click();
  }

  function startBlankMmDraft() {
    const createdAt = new Date().toISOString();
    pushHistory("建立空白毫米草稿");
    importSequence += 1;
    clearGeometryDraft();
    fileInput.value = "";
    project.importSource = createImportSource(
      { name: "blank-mm-draft.svg", type: "image/svg+xml" },
      "svg",
      true,
      "blank-mm-draft",
      createdAt
    );
    project.underlay = {
      id: createId("underlay"),
      fileName: "blank-mm-draft.svg",
      fileType: "svg",
      dataUrl: createBlankDraftDataUrl(),
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 0.32,
      calibratedBy: {
        from: { x: 0, y: 0 },
        to: { x: BLANK_DRAFT_WIDTH_MM * BLANK_DRAFT_PX_PER_MM, y: 0 },
        knownLength: BLANK_DRAFT_WIDTH_MM,
        calibratedAt: createdAt,
        method: "blank-mm-draft"
      }
    };
    project.scale = {
      pxPerMm: BLANK_DRAFT_PX_PER_MM,
      calibrated: true
    };
    uiState.mode = "select";
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.calibrationPoints = [];
    uiState.knownLengthInput = String(BLANK_DRAFT_WIDTH_MM);
    uiState.error = "";
    uiState.message = "空白毫米草稿已建立。這是候選草稿工作區，不呼叫預算引擎，也不產生正式估價。";
    syncBridge();
    render();
  }

  function createBlankDraftDataUrl() {
    const widthPx = BLANK_DRAFT_WIDTH_MM * BLANK_DRAFT_PX_PER_MM;
    const heightPx = BLANK_DRAFT_HEIGHT_MM * BLANK_DRAFT_PX_PER_MM;
    const gridPx = 1000 * BLANK_DRAFT_PX_PER_MM;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <defs>
        <pattern id="small-grid" width="${gridPx}" height="${gridPx}" patternUnits="userSpaceOnUse">
          <path d="M ${gridPx} 0 L 0 0 0 ${gridPx}" fill="none" stroke="#d5dce4" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#small-grid)"/>
      <text x="16" y="28" fill="#475569" font-family="Arial, sans-serif" font-size="16">空白毫米草稿 - 僅候選資料</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function handleFileSelection(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const fileType = getNormalizedFileType(file);
    const importedAt = new Date().toISOString();
    const sequence = ++importSequence;
    pushHistory("匯入圖面");
    clearGeometryDraft();

    if (fileType === "pdf") {
      project.importSource = createImportSource(file, fileType, false, "unsupported-pdf-placeholder", importedAt);
      project.underlay = null;
      resetScaleAndInteraction(PDF_NOT_SUPPORTED_MESSAGE);
      render();
      return;
    }

    if (!isPreviewableImageType(fileType)) {
      project.importSource = createImportSource(file, fileType || "unknown", false, "unsupported-pdf-placeholder", importedAt);
      project.underlay = null;
      resetScaleAndInteraction("此檔案類型尚未支援預覽。請匯入 JPG、JPEG、PNG，或先將 PDF 轉為圖片。");
      render();
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (sequence !== importSequence) {
        return;
      }
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      project.importSource = createImportSource(file, fileType, true, "underlay-image", importedAt);
      project.underlay = {
        id: createId("underlay"),
        fileName: file.name,
        fileType,
        dataUrl,
        naturalWidth: null,
        naturalHeight: null,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: DEFAULT_UNDERLAY_OPACITY,
        calibratedBy: null
      };
      resetScaleAndInteraction("系統會先檢查檔名是否含寬度、高度或 mm 線索；沒有線索時，請用圖面上的已知尺寸兩點校正。");
      probeImportedImageForAutoScale(file, dataUrl, sequence);
      render();
    });
    reader.addEventListener("error", () => {
      if (sequence !== importSequence) {
        return;
      }
      uiState.error = "圖面讀取失敗，請重新選擇 JPG、JPEG 或 PNG 檔案。";
      render();
    });
    reader.readAsDataURL(file);
  }

  function createImportSource(file, fileType, previewSupported, normalizedAs, importedAt) {
    return {
      id: createId("import"),
      originalFileName: file.name,
      originalFileType: fileType,
      accepted: true,
      previewSupported,
      normalizedAs,
      importedAt
    };
  }

  function probeImportedImageForAutoScale(file, dataUrl, sequence) {
    const image = new Image();
    image.addEventListener("load", () => {
      if (sequence !== importSequence || !project.underlay) {
        return;
      }
      const naturalWidth = Number(image.naturalWidth || image.width || 0);
      const naturalHeight = Number(image.naturalHeight || image.height || 0);
      project.underlay.naturalWidth = naturalWidth || null;
      project.underlay.naturalHeight = naturalHeight || null;
      project.scale.autoScaleSuggestion = createAutoScaleSuggestion(file, naturalWidth, naturalHeight);
      project.scale.autoScaleApplied = false;
      if (project.scale.autoScaleSuggestion?.canApply) {
        uiState.inspectorTab = "overview";
        uiState.knownLengthInput = String(project.scale.autoScaleSuggestion.knownLengthMm);
        uiState.message = "系統找到檔名尺寸線索，可先套用建議比例；仍可用兩點校正覆核。";
      } else if (!project.scale.calibrated) {
        uiState.message = "檔名未找到可自動套用的尺寸線索，請用兩點校正確認比例。";
      }
      syncBridge();
      render();
    });
    image.addEventListener("error", () => {
      if (sequence !== importSequence || !project.scale) {
        return;
      }
      project.scale.autoScaleSuggestion = createAutoScaleSuggestion(file, 0, 0);
      render();
    });
    image.src = dataUrl;
  }

  function createAutoScaleSuggestion(file, imageWidthPx, imageHeightPx) {
    const widthPx = Number.isFinite(imageWidthPx) && imageWidthPx > 0 ? imageWidthPx : null;
    const heightPx = Number.isFinite(imageHeightPx) && imageHeightPx > 0 ? imageHeightPx : null;
    const dimensionClue = extractScaleDimensionFromFileName(file?.name || "");
    const fallbackAxis = widthPx && heightPx && heightPx > widthPx ? "height" : "width";
    const axis = dimensionClue?.axis || fallbackAxis;
    const pixelDistance = axis === "height" ? heightPx : widthPx;
    const knownLengthMm = dimensionClue?.lengthMm || null;
    const canApply = Boolean(pixelDistance && knownLengthMm);
    const confidence = dimensionClue?.confidence || "low";
    const from = axis === "height" ? { x: 0, y: 0 } : { x: 0, y: 0 };
    const to = axis === "height" ? { x: 0, y: Number(pixelDistance || 0) } : { x: Number(pixelDistance || 0), y: 0 };
    return {
      status: canApply ? "suggested" : "needs-manual-confirmation",
      source: dimensionClue ? "file-name-dimension-clue" : "image-size-without-dimension-clue",
      sourceLabel: dimensionClue ? dimensionClue.sourceLabel : "圖片尺寸已讀取，但沒有可套用的 mm / cm / m 線索",
      axis: dimensionClue?.axis || axis,
      imageWidthPx: widthPx,
      imageHeightPx: heightPx,
      pixelDistance: pixelDistance ? Number(pixelDistance.toFixed(2)) : null,
      knownLengthMm,
      pxPerMm: canApply ? Number((pixelDistance / knownLengthMm).toFixed(6)) : null,
      confidence,
      confidenceLabel: AUTO_SCALE_CONFIDENCE_LABELS[confidence] || AUTO_SCALE_CONFIDENCE_LABELS.low,
      canApply,
      from,
      to,
      createdAt: new Date().toISOString(),
      note: canApply
        ? "系統依匯入檔名中的尺寸線索建立建議比例；仍保留人工校正覆核。"
        : "檔名未找到可靠尺寸線索，不自動套用比例。"
    };
  }

  function extractScaleDimensionFromFileName(fileName) {
    const normalized = String(fileName || "")
      .toLowerCase()
      .replace(/[_]+/g, "-")
      .replace(/\s+/g, "-");
    const explicitPatterns = [
      { regex: /(?:width|wide|w|寬|寬度|長邊|long)-?(\d+(?:\.\d+)?)-?(mm|毫米|cm|公分|m|米)?/, axis: "width" },
      { regex: /(?:height|high|h|高|高度|短邊)-?(\d+(?:\.\d+)?)-?(mm|毫米|cm|公分|m|米)?/, axis: "height" }
    ];
    for (const pattern of explicitPatterns) {
      const match = normalized.match(pattern.regex);
      const lengthMm = match ? normalizeLengthToMm(match[1], match[2]) : null;
      if (lengthMm) {
        return {
          axis: pattern.axis,
          lengthMm,
          confidence: "high",
          sourceLabel: `檔名明確標示 ${pattern.axis === "height" ? "高度" : "寬度"} ${formatNumber(lengthMm)} mm`
        };
      }
    }

    const looseMatch = normalized.match(/(?:^|[-(])(\d{3,5}(?:\.\d+)?)-?(mm|毫米|cm|公分|m|米)(?:[-).]|$)/);
    const looseLengthMm = looseMatch ? normalizeLengthToMm(looseMatch[1], looseMatch[2]) : null;
    if (looseLengthMm) {
      return {
        axis: null,
        lengthMm: looseLengthMm,
        confidence: "medium",
        sourceLabel: `檔名包含 ${formatNumber(looseLengthMm)} mm 尺寸線索，預設對應圖片長邊`
      };
    }

    return null;
  }

  function normalizeLengthToMm(rawValue, rawUnit) {
    const value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    const unit = String(rawUnit || "mm").toLowerCase();
    let lengthMm = value;
    if (unit === "cm" || unit === "公分") {
      lengthMm = value * 10;
    }
    if (unit === "m" || unit === "米") {
      lengthMm = value * 1000;
    }
    if (lengthMm < AUTO_SCALE_MIN_MM || lengthMm > AUTO_SCALE_MAX_MM) {
      return null;
    }
    return Number(lengthMm.toFixed(2));
  }

  function clearGeometryDraft() {
    project.walls = [];
    project.wallGraph = createInitialWallGraph();
    project.nodeGraph = createInitialNodeGraph();
    project.openings = [];
    project.zones = [];
    project.furniture = [];
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.wallDraftStart = null;
    uiState.wallDraftStartSnapPoint = null;
    uiState.wallPreviewEnd = null;
    uiState.snapPoint = null;
    uiState.zoneBoundaryState = createInitialZoneBoundaryState();
    uiState.pcConverterReport = createInitialPcConverterReport();
  }

  function resetScaleAndInteraction(message) {
    project.scale = {
      pxPerMm: null,
      calibrated: false,
      autoScaleSuggestion: null,
      autoScaleApplied: false
    };
    if (project.underlay) {
      project.underlay.calibratedBy = null;
    }
    uiState.mode = "select";
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.calibrationPoints = [];
    uiState.knownLengthInput = "";
    uiState.wallDraftStart = null;
    uiState.wallDraftStartSnapPoint = null;
    uiState.wallPreviewEnd = null;
    uiState.snapPoint = null;
    uiState.zoneBoundaryState = createInitialZoneBoundaryState();
    uiState.pcConverterReport = createInitialPcConverterReport();
    uiState.message = message || "";
    uiState.error = "";
    syncBridge();
  }

  function startCalibration() {
    if (!project.underlay || !project.importSource?.previewSupported) {
      uiState.error = "請先匯入可預覽的 JPG、JPEG 或 PNG 丈量圖，才能檢查檔名比例線索或進行兩點校正。";
      uiState.message = "";
      render();
      return;
    }

    uiState.mode = "calibrate";
    uiState.inspectorTab = "overview";
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.wallDraftStart = null;
    uiState.wallDraftStartSnapPoint = null;
    uiState.wallPreviewEnd = null;
    uiState.snapPoint = null;
    clearZoneBoundaryDraft();
    const suggestion = project.scale?.autoScaleSuggestion;
    if (suggestion?.canApply) {
      uiState.calibrationPoints = [{ ...suggestion.from }, { ...suggestion.to }];
      uiState.knownLengthInput = String(suggestion.knownLengthMm);
    } else {
      uiState.calibrationPoints = [];
      uiState.knownLengthInput = "";
    }
    uiState.error = "";
    uiState.message = "請在底圖上依序點選已知尺寸的兩端。";
    if (suggestion?.canApply) {
      uiState.message = "系統已帶入檔名比例線索；可直接套用，或重新點兩端覆核。";
    }
    render();
  }

  function startDrawWall() {
    if (!canDrawWalls()) {
      uiState.error = "請先匯入底圖並完成比例校正，再開始描牆。";
      uiState.message = "";
      uiState.mode = "select";
      clearWallDraft();
      render();
      return;
    }

    uiState.mode = "draw-wall";
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.wallDraftStart = null;
    uiState.wallDraftStartSnapPoint = null;
    uiState.wallPreviewEnd = null;
    uiState.snapPoint = null;
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = "畫牆模式：請在底圖上點第一個牆端點。";
    render();
  }

  function startPlaceZone() {
    if (!canPlaceZones()) {
      uiState.error = "請先匯入底圖並完成比例校正，再新增空間標籤。";
      uiState.message = "";
      uiState.mode = "select";
      clearWallDraft();
      render();
      return;
    }

    uiState.mode = "place-zone";
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = "空間標籤模式：請在畫布上點一下放置標籤。";
    render();
  }

  function selectFurnitureTemplate(templateId) {
    uiState.currentFurnitureTemplateId = getFurnitureTemplate(templateId).type;
    startPlaceFurniture();
  }

  function startPlaceFurniture() {
    if (!canPlaceFurniture()) {
      uiState.error = "請先匯入底圖並完成比例校正，再放置家具或櫃體。";
      uiState.message = "";
      uiState.mode = "select";
      clearWallDraft();
      render();
      return;
    }

    const template = getFurnitureTemplate(uiState.currentFurnitureTemplateId);
    uiState.mode = "place-furniture";
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = `請在畫布上點一下放置「${template.name}」。這只是候選草稿，不是正式估價。`;
    render();
  }

  function startZoneBoundaryEdit() {
    rebuildNodeGraph();
    const zone = getSelectedZone();
    if (!zone) {
      uiState.error = "請先選取一個空間標籤，再編輯邊界。";
      uiState.message = "";
      uiState.mode = "select";
      render();
      return;
    }
    if (!hasValidScale() || !project.nodeGraph?.edges?.length) {
      uiState.error = "請先完成比例校正並建立牆端 / 交點，再編輯空間邊界。";
      uiState.message = "";
      uiState.mode = "select";
      render();
      return;
    }

    syncZoneBoundaryMetadata();
    uiState.mode = "edit-zone-boundary";
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    clearWallDraft();
    const draft = createZoneBoundaryDraft(zone.boundaryEdgeIds || []);
    uiState.zoneBoundaryState = {
      activeZoneId: zone.id,
      selectedBoundaryEdgeIds: [...(zone.boundaryEdgeIds || [])],
      previewPolygon: draft.polygon,
      issues: draft.issues
    };
    uiState.error = "";
    uiState.message = "邊界編輯中：依序點選牆段加入或移除邊界，完成後按「套用邊界」。";
    render();
  }

  function enterSelectMode(message) {
    uiState.mode = "select";
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = message || "";
    render();
  }

  function clearWallDraft() {
    uiState.wallDraftStart = null;
    uiState.wallDraftStartSnapPoint = null;
    uiState.wallPreviewEnd = null;
    uiState.snapPoint = null;
  }

  function clearZoneBoundaryDraft() {
    if (!uiState.zoneBoundaryState) {
      uiState.zoneBoundaryState = createInitialZoneBoundaryState();
      return;
    }
    uiState.zoneBoundaryState = createInitialZoneBoundaryState();
  }

  function handleCanvasClick(event) {
    if (uiState.mode === "calibrate") {
      addCalibrationPoint(event);
      return;
    }

    if (uiState.mode === "draw-wall") {
      handleDrawWallClick(event);
      return;
    }

    if (uiState.mode === "place-zone") {
      handlePlaceZoneClick(event);
      return;
    }

    if (uiState.mode === "place-furniture") {
      handlePlaceFurnitureClick(event);
      return;
    }

    if (uiState.mode === "edit-zone-boundary") {
      return;
    }

    if (event.target === canvas || event.target === wallLayer || event.target === openingLayer || event.target === zonePolygonLayer || event.target === zoneLayer) {
      uiState.selectedWallId = null;
      uiState.selectedEdgeId = null;
      uiState.selectedOpeningId = null;
      uiState.selectedZoneId = null;
      uiState.selectedFurnitureId = null;
      uiState.selectedIssueId = null;
      uiState.selectedNodeId = null;
      uiState.error = "";
      render();
    }
  }

  function addCalibrationPoint(event) {
    event.preventDefault();
    const point = getCanvasPoint(event);

    if (uiState.calibrationPoints.length >= 2) {
      uiState.calibrationPoints = [];
    }

    uiState.calibrationPoints.push(point);
    uiState.error = "";
    uiState.message = uiState.calibrationPoints.length === 1
      ? "已設定第一點，請再點第二點。"
      : "已設定兩個校正點，請輸入圖面標示的實際長度。";
    render();
  }

  function handlePlaceZoneClick(event) {
    event.preventDefault();
    if (!canPlaceZones()) {
      uiState.error = "請先匯入底圖並完成比例校正，再新增空間標籤。";
      uiState.message = "";
      uiState.mode = "select";
      render();
      return;
    }

    const point = roundPoint(pxToMmPoint(getCanvasPoint(event)));
    pushHistory("新增空間標籤");
    const zone = createZone(point);
    project.zones.push(zone);
    uiState.selectedZoneId = zone.id;
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.mode = "select";
    uiState.error = "";
    uiState.message = `已新增空間標籤：${zone.name}。`;
    syncBridge();
    render();
  }

  function handlePlaceFurnitureClick(event) {
    event.preventDefault();
    if (!canPlaceFurniture()) {
      uiState.error = "請先匯入底圖並完成比例校正，再放置家具或櫃體。";
      uiState.message = "";
      uiState.mode = "select";
      render();
      return;
    }

    const point = roundPoint(pxToMmPoint(getCanvasPoint(event)));
    pushHistory("加入家具 / 櫃體");
    const item = createFurnitureItem(point);
    project.furniture.push(item);
    selectFurniture(item.id, `已放置「${item.name}」。這只是候選草稿，不呼叫預算引擎。`);
  }

  function handleDrawWallClick(event) {
    event.preventDefault();

    if (!canDrawWalls()) {
      uiState.error = "請先匯入底圖並完成比例校正，再開始描牆。";
      render();
      return;
    }

    const resolved = resolveWallPoint(event, uiState.wallDraftStart);

    if (!uiState.wallDraftStart) {
      uiState.wallDraftStart = resolved.mm;
      uiState.wallDraftStartSnapPoint = resolved.snapPoint;
      uiState.wallPreviewEnd = null;
      uiState.snapPoint = resolved.snapPoint;
      uiState.error = "";
      uiState.message = "已設定牆起點，移動滑鼠預覽，點第二點建立牆。";
      render();
      return;
    }

    const from = uiState.wallDraftStart;
    const to = resolved.mm;
    const length = getDistance(from, to);

    if (length < MIN_WALL_LENGTH) {
      uiState.error = `牆長不可小於 ${MIN_WALL_LENGTH} mm，請點選更遠的第二點。`;
      uiState.wallPreviewEnd = to;
      uiState.snapPoint = resolved.snapPoint;
      render();
      return;
    }

    const wall = createWall(from, to);
    pushHistory("畫牆");
    project.walls.push(wall);
    uiState.selectedWallId = wall.id;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedIssueId = null;
    uiState.selectedEdgeId = createEdgeId(wall);
    uiState.inspectorTab = "properties";
    clearWallDraft();
    uiState.error = "";
    uiState.message = `已建立 ${formatNumber(length)} mm 牆段。`;
    syncBridge();
    render();
  }

  function handleCanvasPointerMove(event) {
    if (uiState.mode !== "draw-wall" || !uiState.wallDraftStart || !canDrawWalls()) {
      return;
    }

    const resolved = resolveWallPoint(event, uiState.wallDraftStart);
    uiState.wallPreviewEnd = resolved.mm;
    uiState.snapPoint = resolved.snapPoint;
    renderWalls();
  }

  function handleCanvasPointerLeave() {
    if (uiState.mode === "draw-wall" && uiState.wallDraftStart) {
      uiState.wallPreviewEnd = null;
      uiState.snapPoint = null;
      renderWalls();
    }
  }

  function resolveWallPoint(event, startMm) {
    const pointPx = getCanvasPoint(event);
    let pointMm = pxToMmPoint(pointPx);

    if (startMm && uiState.orthogonalEnabled) {
      pointMm = applyOrthogonalSnap(startMm, pointMm);
    }

    const endpointSnap = uiState.snapEnabled ? findEndpointSnap(pointMm) : null;
    if (endpointSnap) {
      pointMm = endpointSnap.mm;
    }

    return {
      mm: roundPoint(pointMm),
      snapPoint: endpointSnap ? mmToPxPoint(endpointSnap.mm) : null
    };
  }

  function createWall(from, to) {
    const now = new Date().toISOString();
    const wallType = normalizeWallType(uiState.currentWallType);
    return {
      id: createId("wall"),
      sourceWallId: null,
      from: roundPoint(from),
      to: roundPoint(to),
      thickness: normalizeThickness(uiState.currentWallThickness),
      status: normalizeWallStatus(uiState.currentWallStatus),
      wallType,
      structural: wallType === "bearing_wall",
      layer: "walls",
      createdAt: now,
      updatedAt: now
    };
  }

  function applyCalibration() {
    if (!project.underlay || !project.importSource?.previewSupported) {
      uiState.error = "請先匯入可預覽的 JPG、JPEG 或 PNG 丈量圖。";
      render();
      return;
    }

    if (uiState.calibrationPoints.length < 2) {
      uiState.error = "請先在畫布上點選兩個校正點。";
      render();
      return;
    }

    const [from, to] = uiState.calibrationPoints;
    const pixelDistance = getDistance(from, to);
    if (pixelDistance <= 0) {
      uiState.error = "兩個校正點距離不可為 0，請重新點選。";
      render();
      return;
    }

    const knownLength = Number.parseFloat(uiState.knownLengthInput);
    if (!Number.isFinite(knownLength) || knownLength <= 0) {
      uiState.error = "請輸入大於 0 的已知長度，單位為 mm。";
      render();
      return;
    }

    const pxPerMm = pixelDistance / knownLength;
    pushHistory("套用比例校正");
    project.scale = {
      pxPerMm: Number(pxPerMm.toFixed(6)),
      calibrated: true
    };
    project.underlay.calibratedBy = {
      from: { ...from },
      to: { ...to },
      pixelDistance: Number(pixelDistance.toFixed(2)),
      knownLength: Number(knownLength.toFixed(2)),
      unit: "mm"
    };
    uiState.mode = "select";
    uiState.error = "";
    uiState.message = `比例已校正：${formatNumber(knownLength)} mm = ${formatNumber(pixelDistance)} px`;
    syncBridge();
    render();
  }

  function applyAutoScaleSuggestion() {
    const suggestion = project.scale?.autoScaleSuggestion;
    if (!project.underlay || !project.importSource?.previewSupported) {
      uiState.error = "請先匯入 JPG 或 PNG 圖面，再使用檔名比例建議。";
      render();
      return;
    }
    if (!suggestion?.canApply || !suggestion.knownLengthMm || !suggestion.pixelDistance) {
      uiState.error = "檔名沒有足夠的尺寸線索可自動套用，請用兩點校正確認比例。";
      uiState.inspectorTab = "overview";
      render();
      return;
    }

    const pxPerMm = suggestion.pixelDistance / suggestion.knownLengthMm;
    if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) {
      uiState.error = "檔名比例建議無法計算，請改用兩點校正。";
      render();
      return;
    }

    pushHistory("套用檔名比例建議");
    project.scale = {
      ...project.scale,
      pxPerMm: Number(pxPerMm.toFixed(6)),
      calibrated: true,
      autoScaleSuggestion: { ...suggestion, appliedAt: new Date().toISOString() },
      autoScaleApplied: true
    };
    project.underlay.calibratedBy = {
      from: { ...suggestion.from },
      to: { ...suggestion.to },
      pixelDistance: Number(suggestion.pixelDistance.toFixed(2)),
      knownLength: Number(suggestion.knownLengthMm.toFixed(2)),
      unit: "mm",
      method: "auto-scale-suggestion",
      confidence: suggestion.confidence,
      source: suggestion.source,
      sourceLabel: suggestion.sourceLabel
    };
    uiState.mode = "select";
    uiState.inspectorTab = "overview";
    uiState.calibrationPoints = [{ ...suggestion.from }, { ...suggestion.to }];
    uiState.knownLengthInput = String(suggestion.knownLengthMm);
    uiState.error = "";
    uiState.message = `已套用檔名比例建議：${formatNumber(suggestion.knownLengthMm)} mm = ${formatNumber(suggestion.pixelDistance)} px。`;
    syncBridge();
    render();
  }

  function updateUnderlayOpacity(input) {
    if (!project.underlay) {
      return;
    }

    const nextOpacity = clamp(Number.parseFloat(input.value), MIN_UNDERLAY_OPACITY, MAX_UNDERLAY_OPACITY);
    project.underlay.opacity = Number(nextOpacity.toFixed(2));
    renderUnderlay();

    const opacityValue = document.getElementById("opacityValue");
    if (opacityValue) {
      opacityValue.textContent = `${Math.round(project.underlay.opacity * 100)}%`;
    }
  }

  function updateSelectedWallFromField(input) {
    const wall = getSelectedWall();
    if (!wall) {
      return;
    }

    const field = input.dataset.field;
    const nextWall = cloneWall(wall);

    if (field === "selected-wall-status") {
      nextWall.status = normalizeWallStatus(input.value);
    }
    if (field === "selected-wall-type") {
      nextWall.wallType = normalizeWallType(input.value);
      if (nextWall.wallType === "bearing_wall") {
        nextWall.structural = true;
      }
    }
    if (field === "selected-wall-thickness") {
      nextWall.thickness = normalizeThickness(input.value);
      if (String(nextWall.thickness) !== String(input.value)) {
        uiState.error = `牆厚已限制在 ${MIN_WALL_THICKNESS} 到 ${MAX_WALL_THICKNESS} mm。`;
      } else {
        uiState.error = "";
      }
    }
    if (field === "selected-wall-structural") {
      nextWall.structural = input.checked;
    }
    if (field === "selected-wall-from-x") {
      nextWall.from.x = readCoordinateInput(input, wall.from.x);
    }
    if (field === "selected-wall-from-y") {
      nextWall.from.y = readCoordinateInput(input, wall.from.y);
    }
    if (field === "selected-wall-to-x") {
      nextWall.to.x = readCoordinateInput(input, wall.to.x);
    }
    if (field === "selected-wall-to-y") {
      nextWall.to.y = readCoordinateInput(input, wall.to.y);
    }

    if (getDistance(nextWall.from, nextWall.to) < MIN_WALL_LENGTH) {
      uiState.error = `牆長不可小於 ${MIN_WALL_LENGTH} mm，座標未更新。`;
      render();
      return;
    }

    pushHistory("更新牆體屬性");
    Object.assign(wall, nextWall, { updatedAt: new Date().toISOString() });
    if (!uiState.error) {
      uiState.message = "牆體資料已更新。";
    }
    syncBridge();
    render();
  }

  function deleteSelectedWall() {
    if (!uiState.selectedWallId) {
      return;
    }

    pushHistory("刪除牆體");
    project.walls = project.walls.filter((wall) => wall.id !== uiState.selectedWallId);
    project.openings = project.openings.filter((opening) => opening.edgeId !== createEdgeId({ id: uiState.selectedWallId }));
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = "已刪除選取牆體。";
    syncBridge();
    render();
  }

  function resetProject() {
    pushHistory("重設草稿");
    importSequence += 1;
    project = createInitialProject();
    uiState = createInitialUIState();
    fileInput.value = "";
    render();
  }

  function startStyleVisualDraft() {
    if (styleVisualTimer) {
      window.clearTimeout(styleVisualTimer);
      styleVisualTimer = null;
    }

    const createdAt = new Date().toISOString();
    const styleVisualApiRequest = buildStyleVisualApiRequest(styleVisualRequest);
    const sanitizedPrompt = buildSanitizedVisualPrompt(styleVisualRequest);
    styleVisualTask = {
      id: createId("style-visual-task"),
      status: "drafting",
      createdAt,
      visualBrief: "AI 正在整理風格方向，尚未建立正式示意資料。",
      promptPreview: buildStylePromptPreview(styleVisualRequest),
      sanitizedPrompt,
      styleVisualApiRequest,
      styleVisualApiResponse: null,
      proxyStatus: "drafting",
      referenceImagePolicy: getStyleVisualReferenceImagePolicy(),
      generatedPreview: null,
      disclaimer: STYLE_VISUAL_DISCLAIMER
    };
    render();

    styleVisualTimer = window.setTimeout(async () => {
      const readyStyleVisualApiRequest = buildStyleVisualApiRequest(styleVisualRequest);
      const readySanitizedPrompt = buildSanitizedVisualPrompt(styleVisualRequest);
      const styleVisualApiResponse = await callStyleVisualImageProxy(readyStyleVisualApiRequest);
      const generatedPreview = generateSandboxVisualPreview(readyStyleVisualApiRequest, readySanitizedPrompt, createdAt, styleVisualApiResponse);
      styleVisualTask = {
        id: styleVisualTask.id,
        status: "ready",
        createdAt,
        visualBrief: buildStyleVisualBrief(styleVisualRequest),
        promptPreview: buildStylePromptPreview(styleVisualRequest),
        sanitizedPrompt: readySanitizedPrompt,
        styleVisualApiRequest: readyStyleVisualApiRequest,
        styleVisualApiResponse,
        proxyStatus: styleVisualApiResponse.status,
        referenceImagePolicy: getStyleVisualReferenceImagePolicy(),
        generatedPreview,
        disclaimer: STYLE_VISUAL_DISCLAIMER
      };
      styleVisualTimer = null;
      render();
    }, 1000);
  }

  function updateStyleVisualRequestFromField(input) {
    const field = input.dataset.field;
    const value = input.value.trim();
    const defaults = createInitialStyleVisualRequest();
    const fieldMap = {
      "style-visual-room-type": "roomType",
      "style-visual-primary-style": "primaryStyle",
      "style-visual-secondary-style": "secondaryStyle",
      "style-visual-color-tone": "colorTone",
      "style-visual-material-tone": "materialTone",
      "style-visual-budget-level": "budgetLevel"
    };
    const key = fieldMap[field];
    if (!key) {
      return;
    }
    const nextValue = sanitizeStyleVisualField(value, key, defaults[key]);
    styleVisualRequest = {
      ...styleVisualRequest,
      [key]: nextValue
    };
  }

  function buildStylePromptPreview(request) {
    const sanitized = buildSanitizedStyleVisualRequest(request);
    return `${sanitized.roomType}，${sanitized.primaryStyle} + ${sanitized.secondaryStyle}，${sanitized.colorTone}調，柔和自然光，${sanitized.materialTone}，作為裝修競標案件的風格示意圖。`;
  }

  function buildStyleVisualBrief(request) {
    const sanitized = buildSanitizedStyleVisualRequest(request);
    return `${sanitized.roomType}以${sanitized.primaryStyle}為主軸，加入${sanitized.secondaryStyle}的線條與比例感；整體維持${sanitized.colorTone}，搭配${sanitized.materialTone}，呈現${sanitized.budgetLevel}但克制的案件上架風格參考。`;
  }

  function buildSanitizedVisualPrompt(request) {
    const sanitized = buildSanitizedStyleVisualRequest(request);
    return [
      `${sanitized.roomType}，${sanitized.primaryStyle} + ${sanitized.secondaryStyle}，${sanitized.colorTone}調，柔和自然光，${sanitized.materialTone}。`,
      "作為裝修競標案件的 AI 風格示意圖、案件上架參考與空間氛圍溝通輔助。",
      "本圖僅供案件上架與溝通參考，不代表正式設計、施工圖、實際尺寸、工法、材料品牌或正式報價。",
      `避免：${STYLE_VISUAL_AVOID}。`
    ].join(" ");
  }

  function buildSanitizedStylePrompt(request) {
    return buildSanitizedVisualPrompt(request);
  }

  function buildStyleVisualApiRequest(request) {
    const sanitized = buildSanitizedStyleVisualRequest(request);
    return {
      roomType: sanitized.roomType,
      primaryStyle: sanitized.primaryStyle,
      secondaryStyle: sanitized.secondaryStyle,
      colorTone: sanitized.colorTone,
      materialTone: sanitized.materialTone,
      budgetLevel: sanitized.budgetLevel,
      purpose: "bid-listing-style-reference",
      disclaimerRequired: true,
      referenceImage: {
        allowed: false,
        reason: "reference image upload requires separate privacy review"
      }
    };
  }

  function buildSanitizedStyleVisualRequest(request) {
    const defaults = createInitialStyleVisualRequest();
    return {
      roomType: sanitizeStyleVisualField(request.roomType, "roomType", defaults.roomType),
      primaryStyle: sanitizeStyleVisualField(request.primaryStyle, "primaryStyle", defaults.primaryStyle),
      secondaryStyle: sanitizeStyleVisualField(request.secondaryStyle, "secondaryStyle", defaults.secondaryStyle),
      colorTone: sanitizeStyleVisualField(request.colorTone, "colorTone", defaults.colorTone),
      materialTone: sanitizeStyleVisualField(request.materialTone, "materialTone", defaults.materialTone),
      budgetLevel: sanitizeStyleVisualField(request.budgetLevel, "budgetLevel", defaults.budgetLevel),
      purpose: "bid-listing-style-reference"
    };
  }

  function getStyleVisualReferenceImagePolicy() {
    return {
      allowed: false,
      reason: "reference image upload requires separate privacy review",
      notice: STYLE_VISUAL_REFERENCE_IMAGE_NOTICE
    };
  }

  function sanitizeStyleVisualField(value, key, fallback) {
    const limit = STYLE_VISUAL_FIELD_LIMITS[key] || 40;
    let nextValue = String(value || "")
      .replace(/\s+/g, " ")
      .trim();

    STYLE_VISUAL_BLOCKED_PROMPT_PATTERNS.forEach((pattern) => {
      nextValue = nextValue.replace(pattern, "");
    });

    nextValue = nextValue
      .replace(/[{}\[\]<>]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    nextValue = normalizeStyleVisualTerm(nextValue, key);
    if (!nextValue) {
      return fallback;
    }
    return nextValue.slice(0, limit);
  }

  function normalizeStyleVisualTerm(value, key) {
    const lowerValue = value.toLowerCase();
    if (key === "primaryStyle" || key === "secondaryStyle") {
      const styleMap = {
        "奶油": "奶油風",
        "cream": "奶油風",
        "cream style": "奶油風",
        "古典": "古典風",
        "classic": "古典風",
        "classical": "古典風",
        "現代": "現代風",
        "modern": "現代風",
        "日式": "日式 / Japandi",
        "japandi": "日式 / Japandi",
        "japanese": "日式 / Japandi"
      };
      return styleMap[lowerValue] || value;
    }
    if (key === "materialTone") {
      return value
        .replace(/\bwooden\b/gi, "溫潤木質")
        .replace(/\bwood\b/gi, "溫潤木質");
    }
    return value;
  }

  async function callStyleVisualImageProxy(styleVisualApiRequest) {
    const safeRequest = buildStyleVisualApiRequest(styleVisualApiRequest);

    // 伺服端圖片代理測試契約：前端絕不可直接呼叫模型。
    // provider directly or carry API keys. Future work may enable the
    // same-origin path below from a real server runtime after Reviewer gate.
    if (!STYLE_VISUAL_PROXY_ENABLED || STYLE_VISUAL_PROXY_ENDPOINT !== STYLE_VISUAL_PROXY_ALLOWED_ENDPOINT) {
      return buildStyleVisualApiResponse("disabled", STYLE_VISUAL_PROXY_DISABLED_MESSAGE, safeRequest);
    }

    return buildStyleVisualApiResponse("disabled", STYLE_VISUAL_PROXY_DISABLED_MESSAGE, safeRequest);
  }

  function buildStyleVisualApiResponse(status, message, styleVisualApiRequest) {
    const safeStatus = ["disabled", "mock_ready", "error"].includes(status) ? status : "disabled";
    return {
      status: safeStatus,
      imageUrl: null,
      previewDataUrl: null,
      message,
      metadata: {
        generatedBy: "LAIBE_VISUAL_SIM",
        usage: "bid-listing-style-reference",
        sandbox: true,
        isOfficialDesign: false,
        isConstructionDrawing: false,
        isQuotationBasis: false,
        isRealCase: false,
        savedToOfficialCase: false,
        isProductionAsset: false,
        disclaimerRequired: true,
        referenceImageAllowed: false,
        source: "server-side-image-api-proxy-spike",
        storage: "local-task-state-only",
        reviewStatus: "pending-laibe-reviewer",
        proxyEndpoint: STYLE_VISUAL_PROXY_ALLOWED_ENDPOINT,
        requestPurpose: styleVisualApiRequest.purpose
      }
    };
  }

  function generateSandboxVisualPreview(styleVisualApiRequest, sanitizedPrompt, createdAt, styleVisualApiResponse) {
    const safeRequest = buildStyleVisualApiRequest(styleVisualApiRequest);
    const safeResponse = styleVisualApiResponse || buildStyleVisualApiResponse("disabled", STYLE_VISUAL_PROXY_DISABLED_MESSAGE, safeRequest);
    return {
      id: createId("style-visual-preview"),
      status: safeResponse.status,
      label: "沙盒預覽",
      imageLabel: "風格示意圖",
      imageUrl: safeResponse.imageUrl,
      previewDataUrl: safeResponse.previewDataUrl,
      temporaryImageUrl: safeResponse.imageUrl || safeResponse.previewDataUrl,
      message: safeResponse.message,
      altText: `${safeRequest.roomType} AI 風格示意 sandbox preview`,
      styleVisualApiRequest: safeRequest,
      styleVisualApiResponse: safeResponse,
      sanitizedPrompt,
      createdAt: new Date().toISOString(),
      requestedAt: createdAt,
      metadata: safeResponse.metadata
    };
  }

  function exportDraft() {
    const payload = buildDraftPayload();
    const jsonText = JSON.stringify(payload, null, 2);
    uiState.lastDraftExportPreview = createDraftExportPreview(payload, jsonText);
    uiState.message = "候選草稿 JSON 預覽已建立。下載仍只供草稿使用，不呼叫預算引擎，也不產生正式估價。";
    uiState.error = "";
    const blob = new Blob([jsonText], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = DRAFT_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    render();
  }

  function buildDraftPayload() {
    rebuildWallGraph();
    rebuildNodeGraph();
    syncZoneBoundaryMetadata();
    syncBridge();
    const payload = JSON.parse(JSON.stringify(project));
    payload.walls = project.walls.map((wall) => ({
      ...wall,
      status: normalizeWallStatus(wall.status),
      wallType: normalizeWallType(wall.wallType),
      structural: Boolean(wall.structural || normalizeWallType(wall.wallType) === "bearing_wall")
    }));
    payload.furniture = project.furniture.map(normalizeFurnitureForExport);
    payload.toolCatalogItems = createToolCatalogFurnitureItems();
    payload.layoutObjects = project.furniture.map(createFurnitureLayoutObject);
    payload.candidateExportBoundary = {
      formalEstimate: false,
      budgetEngineCalled: false,
      productionReady: false,
      note: "家具 / 櫃體物件僅為草稿候選資料。"
    };
    return payload;
  }

  function createDraftExportPreview(payload, jsonText) {
    const previewPayload = {
      walls: payload.walls || [],
      openings: payload.openings || [],
      zones: payload.zones || [],
      furniture: payload.furniture || [],
      toolCatalogItems: payload.toolCatalogItems || [],
      layoutObjects: payload.layoutObjects || [],
      candidateExportBoundary: payload.candidateExportBoundary || {}
    };
    return {
      generatedAt: new Date().toISOString(),
      fileName: DRAFT_FILE_NAME,
      wallCount: previewPayload.walls.length,
      openingCount: previewPayload.openings.length,
      zoneCount: previewPayload.zones.length,
      openZoneBoundaryCount: previewPayload.zones.filter((zone) => zone.boundaryStatus && zone.boundaryStatus !== "closed").length,
      furnitureCount: previewPayload.furniture.length,
      toolCatalogItemCount: previewPayload.toolCatalogItems.length,
      layoutObjectCount: previewPayload.layoutObjects.length,
      formalEstimate: Boolean(previewPayload.candidateExportBoundary.formalEstimate),
      budgetEngineCalled: Boolean(previewPayload.candidateExportBoundary.budgetEngineCalled),
      productionReady: Boolean(previewPayload.candidateExportBoundary.productionReady),
      hasMaterialTags: previewPayload.furniture.some((item) => Array.isArray(item.materialTags) && item.materialTags.length > 0),
      jsonPreview: JSON.stringify(previewPayload, null, 2),
      stateSignature: createDraftStateSignature(),
      fullJsonLength: jsonText.length
    };
  }

  function createDraftStateSignature() {
    return JSON.stringify({
      walls: project.walls.map((wall) => ({
        id: wall.id,
        from: wall.from,
        to: wall.to,
        thickness: wall.thickness,
        status: wall.status,
        wallType: normalizeWallType(wall.wallType),
        structural: Boolean(wall.structural || normalizeWallType(wall.wallType) === "bearing_wall"),
        updatedAt: wall.updatedAt || null
      })),
      openings: project.openings.map((opening) => ({
        id: opening.id,
        edgeId: opening.edgeId,
        kind: opening.kind,
        offset: opening.offset,
        width: opening.width,
        swing: opening.swing,
        sillHeight: opening.sillHeight,
        height: opening.height,
        updatedAt: opening.updatedAt || null
      })),
      zones: project.zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        type: zone.type,
        labelPosition: zone.labelPosition,
        boundaryEdgeIds: zone.boundaryEdgeIds || [],
        boundaryStatus: zone.boundaryStatus || null,
        updatedAt: zone.updatedAt || null
      })),
      furniture: project.furniture.map((item) => ({
        id: item.id,
        type: item.type,
        category: item.category,
        name: item.name,
        x: item.x,
        y: item.y,
        widthMm: item.widthMm,
        depthMm: item.depthMm,
        heightMm: item.heightMm,
        rotation: item.rotation,
        materialTags: item.materialTags || [],
        note: item.note || "",
        updatedAt: item.updatedAt || null
      }))
    });
  }

  function exportPcSpike() {
    rebuildWallGraph();
    rebuildNodeGraph();
    syncZoneBoundaryMetadata();

    const result = convertPlancraftPlusToPc(project);
    const validation = validateGeneratedPcSpike(result.pcText);
    const preview = createInitialRendererPreviewResult();
    const exportedAt = result.ok ? new Date().toISOString() : null;
    uiState.pcConverterReport = {
      status: result.ok ? "ready" : "blocked",
      fileName: PC_SPIKE_FILE_NAME,
      notice: PC_SPIKE_NOTICE,
      exportedAt,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
      validation,
      preview
    };

    project.plancraftBridge = {
      ...getPlancraftBridgeStatus(project),
      lastExportedAt: exportedAt,
      lastExportSummary: result.summary,
      warnings: result.warnings,
      validation,
      preview
    };

    if (!result.ok) {
      uiState.error = result.errors[0] || "目前沒有可轉換的封閉空間邊界，無法匯出 .pc 候選測試檔。";
      uiState.message = PC_SPIKE_NOTICE;
      render();
      return;
    }

    downloadTextFile(result.pcText, PC_SPIKE_FILE_NAME, "application/json;charset=utf-8");
    uiState.error = "";
    uiState.message = `已匯出 ${PC_SPIKE_FILE_NAME}。${PC_SPIKE_NOTICE}`;
    render();
  }

  function convertPlancraftPlusToPc(sourceProject) {
    const warnings = [PC_SPIKE_NOTICE];
    const errors = [];
    const summary = {
      roomCount: 0,
      wallCount: 0,
      openingCount: 0,
      skippedZoneCount: 0,
      skippedOpeningCount: 0
    };
    const edgeMap = new Map((sourceProject.nodeGraph?.edges || []).map((edge) => [edge.id, edge]));
    const edgeRoomRefs = new Map();
    const rooms = [];
    const labels = [];

    warnings.push("目前以畫布左上角為原點；正式圖面預覽可能使用不同座標慣例，本測試版先原樣輸出 mm 座標，尚未做座標翻轉驗證。");

    (sourceProject.zones || []).forEach((zone) => {
      const conversion = convertZoneToPcRoom(zone, edgeMap, warnings);
      if (!conversion.ok) {
        summary.skippedZoneCount += 1;
        warnings.push(conversion.warning);
        return;
      }

      rooms.push(conversion.room);
      labels.push(conversion.label);
      summary.roomCount += 1;
      summary.wallCount += conversion.room.walls.length;
      conversion.edgeRefs.forEach((ref) => {
        const refs = edgeRoomRefs.get(ref.edgeId) || [];
        refs.push({
          room: conversion.room,
          roomName: conversion.room.name,
          direction: ref.direction,
          reversed: ref.reversed
        });
        edgeRoomRefs.set(ref.edgeId, refs);
      });
    });

    if (rooms.length > 0) {
      warnings.push("sharedWalls 尚未 canonicalize，本輪可能重複輸出共用牆。");
    }

    (sourceProject.openings || []).forEach((opening) => {
      const conversion = convertOpeningToPc(opening, edgeMap, edgeRoomRefs, warnings);
      if (!conversion.ok) {
        summary.skippedOpeningCount += 1;
        warnings.push(conversion.warning);
        return;
      }
      const bucket = getPcOpeningBucket(conversion.kind);
      if (!Array.isArray(conversion.room[bucket])) {
        conversion.room[bucket] = [];
      }
      conversion.room[bucket].push(conversion.opening);
      summary.openingCount += 1;
    });

    rooms.forEach((room) => {
      if (!room.doors?.length) {
        delete room.doors;
      }
      if (!room.windows?.length) {
        delete room.windows;
      }
      if (!room.openings?.length) {
        delete room.openings;
      }
    });

    if (rooms.length === 0) {
      errors.push("沒有可轉換的封閉空間邊界。請先建立空間標籤，指定至少 3 段牆體邊界，並套用可封閉的邊界。");
    }

    const floor = {
      name: "Ground Floor",
      rooms
    };
    if (labels.length > 0) {
      floor.labels = labels;
    }

    const pcObject = {
      name: `${sourceProject.name || "LaiBE Plancraft+ 草稿"} .pc spike`,
      scale: 100,
      unit: sourceProject.unit || "mm",
      floors: [floor]
    };

    return {
      ok: errors.length === 0,
      pcText: JSON.stringify(pcObject, null, 2),
      pcObject,
      warnings,
      errors,
      summary
    };
  }

  function validateGeneratedPcSpike(pcText) {
    const warnings = [
      "靜態頁尚未直接載入正式檔案檢查器；請使用本機驗證流程確認 .pc 候選測試檔。",
      "本測試檔不在瀏覽器頁面載入正式檢查器，以維持靜態頁可用並避免新增打包流程。"
    ];
    if (typeof pcText !== "string" || pcText.trim().length === 0) {
      warnings.push("目前沒有可驗證的 .pc 候選測試檔內容。");
    }
    return {
      status: "not_run",
      checkedAt: null,
      reason: "靜態頁未直接載入正式檔案檢查器，需用本機驗證流程確認",
      errors: [],
      warnings
    };
  }

  function convertZoneToPcRoom(zone, edgeMap, warnings) {
    const boundaryEdgeIds = uniqueIdsPreserveOrder(zone.boundaryEdgeIds || []);
    if (boundaryEdgeIds.length < ZONE_BOUNDARY_MIN_EDGES) {
      return {
        ok: false,
        warning: `空間「${zone.name || zone.id}」缺少可轉換邊界：邊界牆段少於 3 段。`
      };
    }

    const boundary = createPcBoundaryDraft(boundaryEdgeIds, edgeMap);
    if (boundary.missingEdgeIds.length > 0) {
      return {
        ok: false,
        warning: `空間「${zone.name || zone.id}」有邊界牆段找不到：${boundary.missingEdgeIds.join(", ")}。`
      };
    }
    if (!boundary.closed || boundary.orientedEdges.length < ZONE_BOUNDARY_MIN_EDGES) {
      return {
        ok: false,
        warning: `空間「${zone.name || zone.id}」邊界尚未封閉，已略過 .pc 空間轉換。`
      };
    }
    if (boundary.orientedEdges.some((record) => record.edge.status === "demolished")) {
      return {
        ok: false,
        warning: `空間「${zone.name || zone.id}」包含拆除牆；拆除牆不轉成正式空間牆線，該空間已略過。`
      };
    }

    if (zone.type) {
      warnings.push(`空間「${zone.name || zone.id}」類型「${zone.type}」目前不寫入 .pc 候選測試檔。`);
    }

    const edgeRefs = [];
    const walls = boundary.orientedEdges.map((record, index) => {
      const direction = createPcWallDirection(index);
      edgeRefs.push({
        edgeId: record.edge.id,
        direction,
        reversed: !isSamePoint(record.from, record.edge.from)
      });
      if (record.edge.status && record.edge.status !== "existing") {
        warnings.push(`Edge ${record.edge.id} status=${record.edge.status} 轉為一般 Plancraft wall，status 會遺失。`);
      }
      if (record.edge.structural) {
        warnings.push(`Edge ${record.edge.id} structural=true 目前未寫入 Plancraft .pc，structural metadata 會遺失。`);
      }
      return {
        direction,
        from: roundPoint(record.from),
        to: roundPoint(record.to),
        thickness: record.edge.thickness
      };
    });

    const room = {
      name: zone.name || zone.id,
      walls,
      doors: [],
      windows: [],
      openings: []
    };
    const labelPosition = isPointLike(zone.labelPosition) ? roundPoint(zone.labelPosition) : "center";
    return {
      ok: true,
      room,
      label: {
        text: room.name,
        position: labelPosition
      },
      edgeRefs
    };
  }

  function createPcBoundaryDraft(edgeIds, edgeMap) {
    const normalizedEdgeIds = uniqueIdsPreserveOrder(edgeIds || []);
    const edgeRecords = normalizedEdgeIds.map((edgeId) => ({
      edgeId,
      edge: edgeMap.get(edgeId) || null
    }));
    const missingEdgeIds = edgeRecords.filter((record) => !record.edge).map((record) => record.edgeId);
    const edges = edgeRecords.filter((record) => record.edge).map((record) => record.edge);
    if (missingEdgeIds.length > 0 || edges.length === 0) {
      return {
        closed: false,
        orientedEdges: [],
        polygon: [],
        missingEdgeIds
      };
    }

    const orientedEdges = [];
    const firstEdge = edges[0];
    orientedEdges.push({
      edge: firstEdge,
      from: roundPoint(firstEdge.from),
      to: roundPoint(firstEdge.to)
    });
    const points = [roundPoint(firstEdge.from), roundPoint(firstEdge.to)];

    for (let index = 1; index < edges.length; index += 1) {
      const edge = edges[index];
      const lastPoint = points[points.length - 1];
      if (isSamePoint(lastPoint, edge.from)) {
        orientedEdges.push({
          edge,
          from: roundPoint(edge.from),
          to: roundPoint(edge.to)
        });
        points.push(roundPoint(edge.to));
        continue;
      }
      if (isSamePoint(lastPoint, edge.to)) {
        orientedEdges.push({
          edge,
          from: roundPoint(edge.to),
          to: roundPoint(edge.from)
        });
        points.push(roundPoint(edge.from));
        continue;
      }
      return {
        closed: false,
        orientedEdges,
        polygon: [],
        missingEdgeIds
      };
    }

    const closed = points.length >= 4 && isSamePoint(points[0], points[points.length - 1]);
    return {
      closed,
      orientedEdges,
      polygon: closed ? points.slice(0, -1).map(roundPoint) : [],
      missingEdgeIds
    };
  }

  function convertOpeningToPc(opening, edgeMap, edgeRoomRefs, warnings) {
    const edge = edgeMap.get(opening.edgeId);
    if (!edge) {
      return {
        ok: false,
        warning: `門窗「${getOpeningDisplayName(opening.id)}」找不到依附牆段，已略過。`
      };
    }
    const roomRefs = edgeRoomRefs.get(opening.edgeId) || [];
    if (roomRefs.length === 0) {
      return {
        ok: false,
        warning: `門窗「${getOpeningDisplayName(opening.id)}」不屬於任何已轉換空間邊界，已略過。`
      };
    }
    if (opening.offset < 0 || opening.width <= 0 || opening.offset + opening.width > edge.length + GEOMETRY_EPSILON) {
      return {
        ok: false,
        warning: `門窗「${getOpeningDisplayName(opening.id)}」的位置或寬度超出牆段長度，已略過。`
      };
    }
    if (roomRefs.length > 1) {
      warnings.push(`門窗「${getOpeningDisplayName(opening.id)}」位於共用牆段，本測試檔先掛到第一個匹配空間；共用門窗仍待整理。`);
    }

    const target = roomRefs[0];
    const kind = normalizeOpeningKind(opening.kind);
    const pcOffset = target.reversed
      ? edge.length - Number(opening.offset) - Number(opening.width)
      : Number(opening.offset);
    if (!Number.isFinite(pcOffset) || pcOffset < -GEOMETRY_EPSILON) {
      return {
        ok: false,
        warning: `門窗「${getOpeningDisplayName(opening.id)}」轉換到空間牆段時位置超出範圍，已略過。`
      };
    }

    const base = {
      wall: target.direction,
      offset: Math.round(Math.max(0, pcOffset)),
      width: Math.round(opening.width)
    };

    if (kind === "window") {
      const windowOpening = {
        ...base,
        height: Number.isFinite(Number(opening.height)) && Number(opening.height) > 0 ? Math.round(Number(opening.height)) : 1200,
        sill: Number.isFinite(Number(opening.sillHeight)) && Number(opening.sillHeight) >= 0 ? Math.round(Number(opening.sillHeight)) : 900
      };
      if (!Number.isFinite(Number(opening.height)) || Number(opening.height) <= 0) {
        warnings.push(`Window ${opening.id} 缺少 height，本 Spike 暫用 1200mm。`);
      }
      if (!Number.isFinite(Number(opening.sillHeight)) || Number(opening.sillHeight) < 0) {
        warnings.push(`Window ${opening.id} 缺少 sillHeight，本 Spike 暫用 sill=900mm。`);
      }
      return {
        ok: true,
        kind,
        room: target.room,
        opening: windowOpening
      };
    }

    if (kind === "opening") {
      return {
        ok: true,
        kind,
        room: target.room,
        opening: base
      };
    }

    const swing = opening.swing === "right" || opening.swing === "sliding" || opening.swing === "left"
      ? opening.swing
      : "left";
    if (swing !== opening.swing) {
      warnings.push(`Door ${opening.id} swing=${opening.swing || "none"} 不符合 Plancraft door swing，本 Spike 暫用 left。`);
    }
    return {
      ok: true,
      kind: "door",
      room: target.room,
      opening: {
        ...base,
        swing
      }
    };
  }

  function getPcOpeningBucket(kind) {
    if (kind === "window") {
      return "windows";
    }
    if (kind === "opening") {
      return "openings";
    }
    return "doors";
  }

  function createPcWallDirection(index) {
    return `wall-${index + 1}`;
  }

  function isPointLike(point) {
    return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
  }

  function downloadTextFile(text, fileName, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function render() {
    rebuildWallGraph();
    rebuildNodeGraph();
    syncZoneBoundaryMetadata();
    syncBridge();
    renderUnderlay();
    renderZonePolygons();
    renderWalls();
    renderOpenings();
    renderZones();
    renderFurniture();
    renderWallGraph();
    renderCalibration();
    applyLayerVisibility();
    renderCanvasHelper();
    renderInspector();
    renderStatusLabels();
    syncStaticControls();
  }

  function updateLayerVisibility(input) {
    const layerKey = input.dataset.field.replace("layer-visibility-", "");
    if (!Object.prototype.hasOwnProperty.call(uiState.layerVisibility, layerKey)) {
      return;
    }
    pushHistory("切換圖層顯示");
    uiState.layerVisibility[layerKey] = Boolean(input.checked);
    uiState.message = `${getLayerVisibilityLabel(layerKey)}圖層已${input.checked ? "顯示" : "隱藏"}。`;
    uiState.error = "";
    render();
  }

  function applyLayerVisibility() {
    const visibility = { ...createInitialLayerVisibility(), ...uiState.layerVisibility };
    setLayerElementVisibility(underlayLayer, visibility.underlay);
    setLayerElementVisibility(wallLayer, visibility.walls);
    setLayerElementVisibility(openingLayer, visibility.openings);
    setLayerElementVisibility(zonePolygonLayer, visibility.zones);
    setLayerElementVisibility(wallGraphLayer, visibility.diagnostics);
    zoneLayer.querySelectorAll(".zone-label").forEach((element) => {
      setLayerElementVisibility(element, visibility.zones);
    });
    zoneLayer.querySelectorAll(".furniture-item").forEach((element) => {
      setLayerElementVisibility(element, visibility.furniture);
    });
  }

  function setLayerElementVisibility(element, isVisible) {
    if (!element) {
      return;
    }
    element.hidden = !isVisible;
    element.style.display = isVisible ? "" : "none";
    element.setAttribute("aria-hidden", isVisible ? "false" : "true");
  }

  function getLayerVisibilityLabel(layerKey) {
    const labels = {
      underlay: "底圖",
      walls: "牆體",
      openings: "門窗開口",
      zones: "空間",
      furniture: "家具 / 櫃體",
      diagnostics: "診斷"
    };
    return labels[layerKey] || layerKey;
  }

  function renderUnderlay() {
    underlayLayer.replaceChildren();
    canvas.classList.toggle("has-underlay", Boolean(project.underlay));

    if (!project.underlay) {
      return;
    }

    const image = document.createElement("img");
    image.className = "underlay-image";
    image.src = project.underlay.dataUrl;
    image.alt = "";
    image.draggable = false;
    image.style.left = `${project.underlay.x}px`;
    image.style.top = `${project.underlay.y}px`;
    image.style.maxWidth = "100%";
    image.style.maxHeight = "100%";
    image.style.opacity = String(project.underlay.opacity);
    image.style.transform = `scale(${project.underlay.scale}) rotate(${project.underlay.rotation}deg)`;
    underlayLayer.appendChild(image);
  }

  function renderZonePolygons() {
    zonePolygonLayer.replaceChildren();
    setSvgViewport(zonePolygonLayer);

    if (!hasValidScale()) {
      return;
    }

    project.zones.forEach((zone) => {
      ensureZoneBoundaryFields(zone);
      const isActiveBoundaryZone = uiState.mode === "edit-zone-boundary" && getZoneBoundaryState().activeZoneId === zone.id;
      if (!isActiveBoundaryZone && Array.isArray(zone.polygon) && zone.polygon.length >= 3) {
        renderZonePolygon(zone.polygon, {
          selected: zone.id === uiState.selectedZoneId,
          open: zone.boundaryStatus !== "closed"
        });
      }

      if (zone.id === uiState.selectedZoneId && uiState.mode !== "edit-zone-boundary") {
        renderBoundaryEdgeHighlights(zone.boundaryEdgeIds || [], "zone-boundary-edge");
      }
    });

    if (uiState.mode === "edit-zone-boundary") {
      const draft = getZoneBoundaryState();
      renderBoundaryEdgeHighlights(
        draft.selectedBoundaryEdgeIds,
        `zone-boundary-edge is-editing${hasBoundaryIssueType(draft.issues, "zone-boundary-open") ? " is-open" : ""}`
      );
      if (draft.previewPolygon.length >= 3) {
        renderZonePolygon(draft.previewPolygon, {
          selected: true,
          preview: true,
          open: hasBoundaryIssueType(draft.issues, "zone-boundary-open")
        });
      }
    }
  }

  function renderZonePolygon(points, options = {}) {
    const polygon = document.createElementNS(SVG_NS, "polygon");
    polygon.setAttribute(
      "class",
      `zone-boundary-polygon${options.selected ? " is-selected" : ""}${options.open ? " is-open" : ""}${options.preview ? " is-preview" : ""}`
    );
    polygon.setAttribute("points", points.map((point) => {
      const px = mmToPxPoint(point);
      return `${px.x},${px.y}`;
    }).join(" "));
    zonePolygonLayer.appendChild(polygon);
  }

  function renderBoundaryEdgeHighlights(edgeIds, className) {
    edgeIds.forEach((edgeId) => {
      const edge = getEdgeById(edgeId);
      if (!edge) {
        return;
      }
      const line = createSvgLine(className, mmToPxPoint(edge.from), mmToPxPoint(edge.to));
      zonePolygonLayer.appendChild(line);
    });
  }

  function renderWalls() {
    wallLayer.replaceChildren();
    setSvgViewport(wallLayer);
    ensureWallPatternDefs();
    canvas.classList.toggle("is-drawing-wall", uiState.mode === "draw-wall");

    if (!hasValidScale()) {
      return;
    }

    project.walls.forEach((wall) => {
      renderWall(wall);
    });

    if (uiState.wallDraftStart) {
      renderDraftStart(uiState.wallDraftStart);
    }
    if (uiState.wallDraftStartSnapPoint) {
      renderSnapPoint(uiState.wallDraftStartSnapPoint);
    }
    if (uiState.wallDraftStart && uiState.wallPreviewEnd) {
      renderWallPreview(uiState.wallDraftStart, uiState.wallPreviewEnd);
    }
    if (uiState.snapPoint) {
      renderSnapPoint(uiState.snapPoint);
    }
  }

  function renderOpenings() {
    openingLayer.replaceChildren();
    setSvgViewport(openingLayer);

    if (!hasValidScale()) {
      return;
    }

    project.openings.forEach((opening) => {
      renderOpening(opening);
    });
  }

  function renderOpening(opening) {
    const edge = getEdgeById(opening.edgeId);
    if (!edge) {
      return;
    }

    const geometry = getOpeningGeometry(opening, edge);
    if (!geometry) {
      return;
    }

    const wallStrokeWidth = Math.max(8, (edge.thickness || DEFAULT_WALL_THICKNESS) * project.scale.pxPerMm + 6);
    const gap = createSvgLine("opening-gap", geometry.startPx, geometry.endPx);
    gap.setAttribute("stroke-width", String(wallStrokeWidth));
    openingLayer.appendChild(gap);

    if (opening.kind === "window") {
      renderWindowSymbol(opening, geometry);
    } else if (opening.kind === "opening") {
      renderOpeningSymbol(opening, geometry);
    } else {
      renderDoorSymbol(opening, geometry);
    }

    const hitTarget = createSvgLine("opening-hit-target", geometry.startPx, geometry.endPx);
    hitTarget.setAttribute("stroke-width", String(Math.max(wallStrokeWidth + 14, 24)));
    hitTarget.dataset.openingId = opening.id;
    hitTarget.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectOpening(opening.id);
    });
    openingLayer.appendChild(hitTarget);
  }

  function renderDoorSymbol(opening, geometry) {
    const selectedClass = opening.id === uiState.selectedOpeningId ? " is-selected" : "";
    const line = createSvgLine(`opening-symbol opening-door${selectedClass}`, geometry.startPx, geometry.endPx);
    openingLayer.appendChild(line);

    if (opening.swing === "left" || opening.swing === "right") {
      const swingSign = opening.swing === "right" ? -1 : 1;
      const swingEnd = {
        x: geometry.startMm.x + geometry.normal.x * opening.width * swingSign,
        y: geometry.startMm.y + geometry.normal.y * opening.width * swingSign
      };
      const swingPath = document.createElementNS(SVG_NS, "path");
      swingPath.setAttribute("class", "opening-swing");
      swingPath.setAttribute("d", `M ${geometry.startPx.x} ${geometry.startPx.y} Q ${geometry.endPx.x} ${geometry.endPx.y} ${mmToPxPoint(swingEnd).x} ${mmToPxPoint(swingEnd).y}`);
      openingLayer.appendChild(swingPath);
    }
  }

  function renderWindowSymbol(opening, geometry) {
    const selectedClass = opening.id === uiState.selectedOpeningId ? " is-selected" : "";
    const offsetMm = Math.max(45, (opening.height || 1200) / 40);
    [-offsetMm, offsetMm].forEach((distance) => {
      const start = {
        x: geometry.startMm.x + geometry.normal.x * distance,
        y: geometry.startMm.y + geometry.normal.y * distance
      };
      const end = {
        x: geometry.endMm.x + geometry.normal.x * distance,
        y: geometry.endMm.y + geometry.normal.y * distance
      };
      openingLayer.appendChild(createSvgLine(`opening-symbol opening-window${selectedClass}`, mmToPxPoint(start), mmToPxPoint(end)));
    });
  }

  function renderOpeningSymbol(opening, geometry) {
    const selectedClass = opening.id === uiState.selectedOpeningId ? " is-selected" : "";
    const line = createSvgLine(`opening-symbol opening-opening${selectedClass}`, geometry.startPx, geometry.endPx);
    openingLayer.appendChild(line);
  }

  function renderZones() {
    zoneLayer.replaceChildren();
    canvas.classList.toggle("is-placing-zone", uiState.mode === "place-zone");
    canvas.classList.toggle("is-placing-furniture", uiState.mode === "place-furniture");
    canvas.classList.toggle("is-editing-zone-boundary", uiState.mode === "edit-zone-boundary");

    if (!hasValidScale()) {
      return;
    }

    project.zones.forEach((zone) => {
      const point = mmToPxPoint(zone.labelPosition);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `zone-label${zone.id === uiState.selectedZoneId ? " is-selected" : ""}`;
      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
      button.dataset.zoneId = zone.id;
      button.title = `${zone.name} (${getZoneTypeLabel(zone.type)})`;
      button.textContent = zone.name;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectZone(zone.id);
      });
      zoneLayer.appendChild(button);
    });
  }

  function startFurniturePointerInteraction(event, furnitureId) {
    const item = project.furniture.find((entry) => entry.id === furnitureId);
    if (!item || !hasValidScale()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    pushHistory(event.target.closest(".furniture-resize-handle") ? "調整家具 / 櫃體尺寸" : "移動家具 / 櫃體");
    const startPoint = roundPoint(pxToMmPoint(getCanvasPoint(event)));
    furniturePointerState = {
      id: item.id,
      mode: event.target.closest(".furniture-resize-handle") ? "resize" : "drag",
      startPoint,
      startX: item.x,
      startY: item.y,
      startWidth: item.widthMm,
      startDepth: item.depthMm
    };
    uiState.selectedFurnitureId = item.id;
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    window.addEventListener("pointermove", handleFurniturePointerMove);
    window.addEventListener("pointerup", endFurniturePointerInteraction, { once: true });
    render();
  }

  function handleFurniturePointerMove(event) {
    if (!furniturePointerState || !hasValidScale()) {
      return;
    }
    const item = project.furniture.find((entry) => entry.id === furniturePointerState.id);
    if (!item) {
      return;
    }
    event.preventDefault();
    const currentPoint = roundPoint(pxToMmPoint(getCanvasPoint(event)));
    const dx = currentPoint.x - furniturePointerState.startPoint.x;
    const dy = currentPoint.y - furniturePointerState.startPoint.y;
    if (furniturePointerState.mode === "resize") {
      item.widthMm = Math.max(MIN_FURNITURE_WIDTH_MM, Math.round(furniturePointerState.startWidth + dx));
      item.depthMm = Math.max(MIN_FURNITURE_DEPTH_MM, Math.round(furniturePointerState.startDepth + dy));
    } else {
      item.x = Math.max(0, Math.round(furniturePointerState.startX + dx));
      item.y = Math.max(0, Math.round(furniturePointerState.startY + dy));
    }
    item.budgetCandidate = true;
    item.productionReady = false;
    item.notFormalEstimate = true;
    item.updatedAt = new Date().toISOString();
    render();
  }

  function endFurniturePointerInteraction() {
    if (furniturePointerState) {
      const item = project.furniture.find((entry) => entry.id === furniturePointerState.id);
      uiState.message = item
        ? `已${furniturePointerState.mode === "resize" ? "調整尺寸" : "移動"}「${item.name}」。仍為候選草稿。`
        : "";
    }
    furniturePointerState = null;
    window.removeEventListener("pointermove", handleFurniturePointerMove);
    syncBridge();
    render();
  }

  function renderFurniture() {
    if (!hasValidScale()) {
      return;
    }

    project.furniture.forEach((item) => {
      const center = mmToPxPoint({ x: item.x, y: item.y });
      const widthPx = Math.max(24, Number(item.widthMm) * project.scale.pxPerMm);
      const depthPx = Math.max(18, Number(item.depthMm) * project.scale.pxPerMm);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `furniture-item${item.id === uiState.selectedFurnitureId ? " is-selected" : ""}`;
      button.style.left = `${center.x - widthPx / 2}px`;
      button.style.top = `${center.y - depthPx / 2}px`;
      button.style.width = `${widthPx}px`;
      button.style.height = `${depthPx}px`;
      button.style.transform = `rotate(${Number(item.rotation) || 0}deg)`;
      button.dataset.furnitureId = item.id;
      button.title = `${item.name} / ${item.widthMm} x ${item.depthMm} mm`;
      button.innerHTML = `
        <span class="furniture-label">
          <strong>${escapeHTML(item.name)}</strong>
          <span>${escapeHTML(getFurnitureTypeLabel(item.type))} / ${formatNumber(item.widthMm)} x ${formatNumber(item.depthMm)} mm</span>
        </span>
        <span class="furniture-resize-handle furniture-resize-handle--inside" title="拖曳調整尺寸" aria-label="拖曳調整尺寸"></span>
        <span class="furniture-resize-handle furniture-resize-handle--corner" title="拖曳角落調整尺寸" aria-label="拖曳角落調整尺寸"></span>
      `;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectFurniture(item.id);
      });
      button.addEventListener("pointerdown", (event) => {
        startFurniturePointerInteraction(event, item.id);
      });
      zoneLayer.appendChild(button);
    });
  }

  function renderWallGraph() {
    wallGraphLayer.replaceChildren();
    setSvgViewport(wallGraphLayer);

    if (!hasValidScale()) {
      return;
    }

    const selectedIssue = getSelectedIssue();
    if (selectedIssue) {
      selectedIssue.wallIds.forEach((wallId) => {
        const wall = project.walls.find((item) => item.id === wallId);
        if (!wall) {
          return;
        }
        const line = createSvgLine("graph-highlight-line", mmToPxPoint(wall.from), mmToPxPoint(wall.to));
        line.setAttribute("stroke-width", String(getWallStrokeWidth(wall) + 18));
        wallGraphLayer.appendChild(line);
      });
    }

    project.wallGraph.issues.forEach((issue) => {
      renderGraphIssue(issue);
    });

    const graphNodes = project.nodeGraph?.nodes?.length ? project.nodeGraph.nodes : project.wallGraph.nodes;
    graphNodes.forEach((node) => {
      const point = mmToPxPoint(node);
      const marker = document.createElementNS(SVG_NS, "circle");
      const highlighted = selectedIssue?.nodeIds?.includes(node.id) || uiState.selectedNodeId === node.id;
      marker.setAttribute("class", `graph-node ${node.kind}${highlighted ? " is-highlighted" : ""}`);
      marker.setAttribute("cx", String(point.x));
      marker.setAttribute("cy", String(point.y));
      marker.setAttribute("r", node.kind === "intersection" ? "6" : "3.5");
      wallGraphLayer.appendChild(marker);
    });
  }

  function renderGraphIssue(issue) {
    const isHighlighted = issue.id === uiState.selectedIssueId;
    if (issue.type === "nearby-endpoints" && issue.points.length >= 2) {
      const from = mmToPxPoint(issue.points[0]);
      const to = mmToPxPoint(issue.points[1]);
      wallGraphLayer.appendChild(createSvgLine("graph-nearby-line", from, to));
      renderIssueMarker(issue, issue.points[0], isHighlighted);
      renderIssueMarker(issue, issue.points[1], isHighlighted);
      return;
    }

    if (issue.type === "wall-intersection" && issue.points[0]) {
      renderIssueMarker(issue, issue.points[0], isHighlighted);
      return;
    }

    if (issue.type === "overlapping-walls" && issue.points.length >= 2) {
      const line = createSvgLine("graph-nearby-line", mmToPxPoint(issue.points[0]), mmToPxPoint(issue.points[1]));
      line.setAttribute("stroke-width", "5");
      wallGraphLayer.appendChild(line);
      renderIssueMarker(issue, getMidpoint(issue.points[0], issue.points[1]), isHighlighted);
      return;
    }

    if ((issue.type === "wall-too-short" || issue.type === "zero-length-wall") && issue.points[0]) {
      renderIssueMarker(issue, issue.points[0], isHighlighted);
    }
  }

  function renderIssueMarker(issue, pointMm, isHighlighted) {
    const point = mmToPxPoint(pointMm);
    const marker = document.createElementNS(SVG_NS, "circle");
    marker.setAttribute("class", `graph-issue-marker${isHighlighted ? " is-highlighted" : ""}`);
    marker.setAttribute("cx", String(point.x));
    marker.setAttribute("cy", String(point.y));
    marker.setAttribute("r", "7");
    marker.dataset.issueId = issue.id;
    wallGraphLayer.appendChild(marker);
  }

  function ensureWallPatternDefs() {
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.innerHTML = `
      <pattern id="wall-hatch-single" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
        <rect width="14" height="14" fill="#8E8E8E"></rect>
        <path d="M 0 0 L 0 14" stroke="#F5F5F5" stroke-width="3" opacity="0.72"></path>
      </pattern>
      <pattern id="wall-hatch-double" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
        <rect width="16" height="16" fill="#8E8E8E"></rect>
        <path d="M 0 0 L 0 16 M 7 0 L 7 16" stroke="#F5F5F5" stroke-width="2.5" opacity="0.74"></path>
      </pattern>
    `;
    wallLayer.appendChild(defs);
  }

  function renderWall(wall) {
    const from = mmToPxPoint(wall.from);
    const to = mmToPxPoint(wall.to);
    const strokeWidth = getWallStrokeWidth(wall);
    const wallType = normalizeWallType(wall.wallType);
    const isSelected = wall.id === uiState.selectedWallId;
    const isIssueHighlighted = isWallInSelectedIssue(wall.id);
    const isBoundaryHighlighted = isWallInActiveBoundary(wall.id);

    if (isSelected || isIssueHighlighted || isBoundaryHighlighted) {
      const outline = createSvgLine("wall-selected-outline", from, to);
      outline.setAttribute("stroke-width", String(strokeWidth + (isIssueHighlighted || isBoundaryHighlighted ? 16 : 10)));
      wallLayer.appendChild(outline);
    }

    const visibleLine = createSvgLine(`wall-line wall-${wall.status} wall-type-${wallType}${isSelected || isIssueHighlighted ? " is-selected" : ""}${isBoundaryHighlighted ? " is-boundary" : ""}`, from, to);
    visibleLine.setAttribute("stroke-width", String(strokeWidth));
    visibleLine.dataset.wallType = wallType;
    visibleLine.dataset.wallStatus = normalizeWallStatus(wall.status);
    wallLayer.appendChild(visibleLine);

    const hitTarget = createSvgLine("wall-hit-target", from, to);
    hitTarget.setAttribute("stroke-width", String(Math.max(strokeWidth + 14, 20)));
    hitTarget.dataset.wallId = wall.id;
    hitTarget.addEventListener("click", (event) => {
      if (uiState.mode === "draw-wall" && uiState.wallDraftStart) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (uiState.mode === "edit-zone-boundary") {
        toggleBoundaryEdgeForWall(wall.id);
        return;
      }
      selectWall(wall.id);
    });
    wallLayer.appendChild(hitTarget);

    if (isSelected) {
      renderEndpointMarker(from);
      renderEndpointMarker(to);
      renderWallLengthLabel(wall, from, to);
    }
  }

  function renderWallPreview(fromMm, toMm) {
    const from = mmToPxPoint(fromMm);
    const to = mmToPxPoint(toMm);
    const line = createSvgLine("wall-preview-line", from, to);
    wallLayer.appendChild(line);
    renderWallLengthLabel({ from: fromMm, to: toMm }, from, to, "preview");
  }

  function renderDraftStart(pointMm) {
    renderEndpointMarker(mmToPxPoint(pointMm));
  }

  function renderEndpointMarker(pointPx) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("class", "wall-endpoint");
    circle.setAttribute("cx", String(pointPx.x));
    circle.setAttribute("cy", String(pointPx.y));
    circle.setAttribute("r", "5");
    wallLayer.appendChild(circle);
  }

  function renderSnapPoint(pointPx) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("class", "wall-snap-point");
    circle.setAttribute("cx", String(pointPx.x));
    circle.setAttribute("cy", String(pointPx.y));
    circle.setAttribute("r", "8");
    wallLayer.appendChild(circle);
  }

  function renderWallLengthLabel(wall, fromPx, toPx) {
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "wall-length-label");
    label.setAttribute("x", String((fromPx.x + toPx.x) / 2 + 12));
    label.setAttribute("y", String((fromPx.y + toPx.y) / 2 - 12));
    label.textContent = `${formatNumber(getDistance(wall.from, wall.to))} mm`;
    wallLayer.appendChild(label);
  }

  function createSvgLine(className, from, to) {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("class", className);
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y));
    return line;
  }

  function renderCalibration() {
    calibrationLayer.replaceChildren();
    setSvgViewport(calibrationLayer);
    canvas.classList.toggle("is-calibrating", uiState.mode === "calibrate");

    const points = getCalibrationPointsForRender();
    if (points.length === 0) {
      return;
    }

    if (points.length >= 2) {
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("class", "calibration-line");
      line.setAttribute("x1", String(points[0].x));
      line.setAttribute("y1", String(points[0].y));
      line.setAttribute("x2", String(points[1].x));
      line.setAttribute("y2", String(points[1].y));
      calibrationLayer.appendChild(line);

      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("class", "calibration-label");
      label.setAttribute("x", String((points[0].x + points[1].x) / 2 + 12));
      label.setAttribute("y", String((points[0].y + points[1].y) / 2 - 12));
      label.textContent = getCalibrationLineLabel(points);
      calibrationLayer.appendChild(label);
    }

    points.forEach((point, index) => {
      const marker = document.createElementNS(SVG_NS, "circle");
      marker.setAttribute("class", "calibration-point");
      marker.setAttribute("cx", String(point.x));
      marker.setAttribute("cy", String(point.y));
      marker.setAttribute("r", "7");
      calibrationLayer.appendChild(marker);

      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("class", "calibration-label");
      label.setAttribute("x", String(point.x + 11));
      label.setAttribute("y", String(point.y - 11));
      label.textContent = `點 ${index + 1}`;
      calibrationLayer.appendChild(label);
    });
  }

  function renderCanvasHelper() {
    if (!project.importSource) {
      canvasHelper.innerHTML = `
        <div class="canvas-helper-card">
          <b>請先匯入業主提供的丈量圖</b>
          JPG / PNG 可預覽；PDF 請先轉成圖片。檔名若含寬度、高度或 mm 線索，系統會提出比例建議，否則用兩點校正。
        </div>
      `;
      return;
    }

    if (!project.importSource.previewSupported) {
      canvasHelper.innerHTML = `
        <div class="canvas-helper-card">
          <b>PDF 匯入接口已建立</b>
          ${escapeHTML(PDF_NOT_SUPPORTED_MESSAGE)}
        </div>
      `;
      return;
    }

    if (uiState.mode === "draw-wall") {
      canvasHelper.innerHTML = `
        <div class="canvas-helper-card">
          <b>畫牆模式</b>
          ${escapeHTML(uiState.message || "點兩個端點建立牆體；靠近既有端點會自動吸附。")}
        </div>
      `;
      return;
    }

    if (uiState.mode === "place-zone") {
      canvasHelper.innerHTML = `
        <div class="canvas-helper-card">
          <b>空間標籤模式</b>
          ${escapeHTML(uiState.message || "點擊畫布放置空間標籤；標籤座標會以 mm 儲存。")}
        </div>
      `;
      return;
    }

    if (uiState.mode === "place-furniture") {
      const template = getFurnitureTemplate(uiState.currentFurnitureTemplateId);
      canvasHelper.innerHTML = `
        <div class="canvas-helper-card">
          <b>加入家具 / 櫃體</b>
          請在畫布上點一下放置「${escapeHTML(template.name)}」。放好後可拖曳移動、拉控制點調尺寸，右側屬性面板可改寬度、深度、材料與備註。
        </div>
      `;
      return;
    }

    if (uiState.mode === "edit-zone-boundary") {
      const draft = getZoneBoundaryState();
      const openMessage = hasBoundaryIssueType(draft.issues, "zone-boundary-open")
        ? "目前邊界尚未形成封閉空間"
        : "邊界已可能封閉，可套用到目前空間";
      canvasHelper.innerHTML = `
        <div class="canvas-helper-card">
          <b>空間邊界</b>
          ${escapeHTML(uiState.message || openMessage)}
        </div>
      `;
      return;
    }

    const helperTitle = project.scale.calibrated ? "比例已確認" : "等待比例確認";
    const helperText = uiState.message || (project.scale.calibrated
      ? `${getScaleReadout()}。可描牆、自動接牆、標示門窗，或放置空間標籤。`
      : "匯入圖面後，系統會先檢查檔名尺寸線索；線索不足時，請用「校正比例」兩點確認。");

    canvasHelper.innerHTML = `
      <div class="canvas-helper-card">
        <b>${escapeHTML(helperTitle)}</b>
        ${escapeHTML(helperText)}
      </div>
    `;
  }

  function renderInspector() {
    const selectedFurniture = getSelectedFurniture();
    const selectedZone = getSelectedZone();
    const selectedOpening = getSelectedOpening();
    const selectedWall = getSelectedWall();
    const styleVisualPanel = renderStyleVisualPanel();
    const bridgePanel = `${renderBridgeCard()}${renderPcConverterReportCard()}${renderRendererPreviewReportCard()}`;
    const exportPreviewPanel = renderCandidateExportPreviewCard();
    const layerVisibilityPanel = renderLayerVisibilityCard();
    const diagnosticsPanel = renderInspectorDiagnosticsPanel(bridgePanel, styleVisualPanel);
    const selectedPropertyCard =
      selectedFurniture ? renderSelectedFurnitureCard(selectedFurniture) :
      selectedZone ? renderSelectedZoneCard(selectedZone) :
      selectedOpening ? renderSelectedOpeningCard(selectedOpening) :
      selectedWall ? renderSelectedWallCard(selectedWall) :
      renderNoSelectionPropertyCard();
    const tabs = renderInspectorTabStrip();
    const messageBlocks = renderMessageBlocks(!project.importSource?.previewSupported && project.importSource ? PDF_NOT_SUPPORTED_MESSAGE : "");

    if (uiState.inspectorTab === "layers") {
      inspectorBody.innerHTML = `
        ${tabs}
        ${layerVisibilityPanel}
        ${renderImportSourceCardIfAvailable()}
        ${messageBlocks}
      `;
      return;
    }

    if (uiState.inspectorTab === "reminders") {
      inspectorBody.innerHTML = `
        ${tabs}
        ${renderReminderTodoCard()}
        ${renderWallWorkflowCard()}
        ${renderZoneWorkflowCard()}
        ${messageBlocks}
      `;
      return;
    }

    if (uiState.inspectorTab === "materials") {
      inspectorBody.innerHTML = `
        ${tabs}
        ${renderMaterialInspectorPanel(selectedFurniture)}
        ${selectedFurniture ? renderSelectedFurnitureCard(selectedFurniture) : ""}
        ${messageBlocks}
      `;
      return;
    }

    if (uiState.inspectorTab === "overview") {
      inspectorBody.innerHTML = `
        ${tabs}
        ${renderOverviewInspectorPanel()}
        ${renderImportSourceCardIfAvailable()}
        ${project.underlay ? renderUnderlayControls() : ""}
        ${renderAutoScaleSuggestionCard()}
        ${renderScaleCard()}
        ${renderFurnitureWorkflowCard()}
        ${exportPreviewPanel}
        ${messageBlocks}
        ${diagnosticsPanel}
      `;
      return;
    }

    inspectorBody.innerHTML = `
      ${tabs}
      ${selectedPropertyCard}
      ${messageBlocks}
    `;
  }

  function renderInspectorTabStrip() {
    const tabs = [
      ["properties", "屬性"],
      ["layers", "圖層"],
      ["reminders", "提醒"],
      ["materials", "材料"],
      ["overview", "總覽"]
    ];
    const current = uiState.inspectorTab || "properties";
    return `
      <nav class="inspector-tab-strip" aria-label="右側屬性面板分頁">
        ${tabs.map(([key, label]) => (
          `<button class="inspector-tab${current === key ? " is-active" : ""}" type="button" data-action="set-inspector-tab" data-inspector-tab="${key}">${label}</button>`
        )).join("")}
      </nav>
    `;
  }

  function renderNoSelectionPropertyCard() {
    if (!project.importSource) {
      return `
        <section class="empty-state">
          <h2>尚未選取物件</h2>
          <p>請先匯入 JPG 或 PNG 丈量圖。匯入後系統會先檢查檔名尺寸線索；沒有線索時用兩點校正，再開始畫牆與加入物件。</p>
        </section>
      `;
    }

    if (!project.importSource.previewSupported) {
      return `
        <section class="empty-state">
          <h2>尚未選取物件</h2>
          <p>目前檔案只能保留為候選來源，請改匯入 JPG 或 PNG 後再進行畫布操作。</p>
        </section>
      `;
    }

    return `
      <section class="empty-state">
        <h2>尚未選取物件</h2>
        <p>請點選牆、門窗、空間標籤、家具或櫃體，這裡只顯示該物件的尺寸、材料、備註與刪除操作。</p>
      </section>
      <div class="inspector-compact-note">像 PPT 一樣操作：選取物件後，畫布會高亮，右側會顯示可修改欄位。</div>
    `;
  }

  function renderImportSourceCardIfAvailable() {
    return project.importSource ? renderImportSourceCard() : "";
  }

  function renderReminderTodoCard() {
    const reminders = [];
    if (!project.importSource) {
      reminders.push("匯入 JPG 或 PNG 丈量圖");
    }
    if (project.importSource && !project.scale.calibrated) {
      reminders.push("確認檔名比例線索，必要時用兩點校正");
    }
    if (!project.walls.length) {
      reminders.push("畫出主要外牆與內牆");
    }
    if (!project.openings.length) {
      reminders.push("在選取牆段上新增門、窗或開口");
    }
    if (!project.zones.length) {
      reminders.push("加入客廳、臥室、浴室等空間標籤");
    }
    if (!project.furniture.length) {
      reminders.push("放置櫃體、廚具、衛浴或活動家具");
    }
    if (project.furniture.some((item) => !item.materialTags?.length || item.materialTags.includes("unspecified"))) {
      reminders.push("確認家具 / 櫃體材料");
    }
    if (!reminders.length) {
      reminders.push("目前沒有明顯缺漏，請用總覽確認候選草稿邊界。");
    }

    return `
      <section class="status-card" aria-label="平面拼圖提醒待辦">
        <b>提醒待辦</b>
        <div class="draft-list">
          ${reminders.map((item) => `<div class="draft-item">□ ${escapeHTML(item)}</div>`).join("")}
        </div>
      </section>
    `;
  }

  function renderMaterialInspectorPanel(selectedFurniture) {
    const currentMaterial = selectedFurniture?.materialTags?.[0] || uiState.currentFurnitureMaterialTag;
    return `
      <section class="status-card" aria-label="材料設定">
        <b>材料</b>
        <div class="field-grid">
          <div class="field-row full">
            <label for="inspector-current-material">材料</label>
            <select id="inspector-current-material" data-field="current-furniture-material">
              ${renderFurnitureMaterialOptions(currentMaterial)}
            </select>
          </div>
        </div>
        <div class="inspector-actions" style="margin-top: 12px;">
          <button class="secondary-btn" type="button" data-action="apply-current-furniture-material" ${selectedFurniture ? "" : "disabled"}>套用到選取物件</button>
        </div>
        <div class="inspector-compact-note">
          ${selectedFurniture
            ? `目前選取「${escapeHTML(selectedFurniture.name)}」。材料只會寫入候選草稿，不會進正式估價。`
            : "請先選取家具、櫃體、廚具或衛浴設備，再套用材料。"}
        </div>
      </section>
    `;
  }

  function renderOverviewInspectorPanel() {
    const calibrated = project.scale.calibrated;
    const canDraft = project.importSource && project.importSource.previewSupported && calibrated;
    const budgetCandidateCount = project.furniture.filter((item) => item.budgetCandidate).length;
    return `
      <section class="status-card" aria-label="平面拼圖總覽">
        <b>總覽</b>
        <div class="status-grid">
          <div class="status-row"><span>底圖</span><span>${project.importSource ? "已匯入" : "尚未匯入"}</span></div>
          <div class="status-row"><span>比例</span><span>${calibrated ? "已確認" : "待比例確認"}</span></div>
          <div class="status-row"><span>牆段</span><span>${project.walls.length}</span></div>
          <div class="status-row"><span>門窗 / 開口</span><span>${project.openings.length}</span></div>
          <div class="status-row"><span>空間標籤</span><span>${project.zones.length}</span></div>
          <div class="status-row"><span>預算候選物件</span><span>${budgetCandidateCount}</span></div>
          <div class="status-row"><span>下一步</span><span>${canDraft ? "可繼續畫牆、放物件或匯出候選 JSON" : "先完成匯入與比例確認"}</span></div>
        </div>
        <div class="inspector-compact-note">所有輸出仍是候選草稿；不是施工圖、不是正式估價，也不會呼叫預算引擎。</div>
      </section>
    `;
  }

  function renderInspectorDiagnosticsPanel(bridgePanel, styleVisualPanel) {
    return `
      <details class="status-card" data-testid="geometry-diagnostics-panel">
        <summary>進階檢查：接牆與斷點</summary>
        ${renderWallGraphCard()}
        ${renderNodeGraphCard()}
      </details>
      <details class="status-card" data-testid="plancraft-diagnostics-panel">
        <summary>進階輸出檢查：候選檔案 / 圖面預覽</summary>
        ${bridgePanel}
      </details>
      <details class="status-card" data-testid="style-visual-diagnostics-panel">
        <summary>風格示意診斷</summary>
        ${styleVisualPanel}
      </details>
    `;
  }

  function renderCandidateExportPreviewCard() {
    const preview = uiState.lastDraftExportPreview;
    if (!preview) {
      return "";
    }
    const isStale = preview.stateSignature !== createDraftStateSignature();
    const previewStatus = isStale ? "stale_after_edits" : "current";
    const previewMessage = isStale
      ? "預覽已不是最新。交接前請再按一次「匯出候選 JSON」。"
      : "目前預覽為最新草稿。下載仍為候選草稿用途，不產生正式估價，也不呼叫預算引擎。";
    return `
      <section class="status-card" data-testid="candidate-export-preview">
        <b>候選 JSON 預覽</b>
        <div class="status-grid">
          <div class="status-row"><span>檔名</span><span>${escapeHTML(preview.fileName)}</span></div>
          <div class="status-row"><span>預覽狀態</span><span>${isStale ? "需重新匯出" : "最新"}</span></div>
          <div class="status-row"><span>建立時間</span><span>${escapeHTML(preview.generatedAt)}</span></div>
          <div class="status-row"><span>牆段</span><span>${preview.wallCount}</span></div>
          <div class="status-row"><span>門窗開口</span><span>${preview.openingCount}</span></div>
          <div class="status-row"><span>空間標籤</span><span>${preview.zoneCount}</span></div>
          <div class="status-row"><span>未封閉邊界</span><span>${preview.openZoneBoundaryCount}</span></div>
          <div class="status-row"><span>家具 / 櫃體</span><span>${preview.furnitureCount}</span></div>
          <div class="status-row"><span>工具目錄項目</span><span>${preview.toolCatalogItemCount}</span></div>
          <div class="status-row"><span>版面物件</span><span>${preview.layoutObjectCount}</span></div>
          <div class="status-row"><span>材料</span><span>${preview.hasMaterialTags ? "已填" : "未填"}</span></div>
          <div class="status-row"><span>正式估價</span><span>${preview.formalEstimate ? "是" : "否"}</span></div>
          <div class="status-row"><span>呼叫預算引擎</span><span>${preview.budgetEngineCalled ? "是" : "否"}</span></div>
          <div class="status-row"><span>可作正式成果</span><span>${preview.productionReady ? "是" : "否"}</span></div>
        </div>
        <pre class="project-readout" data-testid="candidate-export-json-preview">${escapeHTML(preview.jsonPreview)}</pre>
        <div class="inline-message">${escapeHTML(previewMessage)}</div>
      </section>
    `;
  }

  function renderSelectedWallCard(wall) {
    const edge = getEdgeForWall(wall.id);
    const wallType = normalizeWallType(wall.wallType);
    const wallDisplayName = getWallDisplayName(wall.id);
    return `
      <form class="inspector-form" aria-label="牆體屬性表單">
        <div class="status-card">
          <b>選取牆體</b>
          <div class="status-grid">
            <div class="status-row"><span>編號</span><span>${escapeHTML(wallDisplayName)}</span></div>
            <div class="status-row"><span>長度</span><span>${formatNumber(getDistance(wall.from, wall.to))} mm</span></div>
            <div class="status-row"><span>狀態</span><span>${escapeHTML(getWallStatusLabel(wall.status))}</span></div>
            <div class="status-row"><span>分類</span><span>${escapeHTML(getWallTypeLabel(wallType))}</span></div>
            <div class="status-row"><span>分類說明</span><span>${escapeHTML(getWallTypeDetail(wallType))}</span></div>
            <div class="status-row"><span>依附牆線</span><span>${edge ? "已連結" : "-"}</span></div>
            <div class="status-row"><span>牆段長度</span><span>${edge ? `${formatNumber(edge.length)} mm` : "-"}</span></div>
            <div class="status-row"><span>更新時間</span><span>${escapeHTML(wall.updatedAt)}</span></div>
          </div>
          <div class="inspector-actions" style="margin-top: 12px;">
            <button class="danger-btn" type="button" data-action="delete-wall">刪除牆體</button>
            <button class="secondary-btn" type="button" data-action="add-opening" data-opening-kind="door">新增門</button>
            <button class="secondary-btn" type="button" data-action="add-opening" data-opening-kind="window">新增窗</button>
          </div>
        </div>
        <div class="field-grid">
          <div class="field-row full">
            <label for="selected-wall-status">牆體狀態</label>
            <select id="selected-wall-status" data-field="selected-wall-status">
              ${renderStatusOption("existing", wall.status)}
              ${renderStatusOption("new", wall.status)}
              ${renderStatusOption("demolished", wall.status)}
            </select>
          </div>
          <div class="field-row full">
            <label for="selected-wall-type">牆體分類</label>
            <select id="selected-wall-type" data-field="selected-wall-type">
              ${renderWallTypeOptions(wallType)}
            </select>
          </div>
          <div class="field-row">
            <label for="selected-wall-thickness">牆厚</label>
            <select id="selected-wall-thickness" data-field="selected-wall-thickness">
              ${renderWallThicknessOptions(wall.thickness)}
            </select>
          </div>
          <div class="inline-message full">${escapeHTML(WALL_THICKNESS_HELP_TEXT)}</div>
          <label class="toggle-row" for="selected-wall-structural" style="align-self:end; min-height:42px;">
            <span>結構牆</span>
            <input id="selected-wall-structural" data-field="selected-wall-structural" type="checkbox" ${wall.structural ? "checked" : ""}>
          </label>
          <div class="field-row">
            <label for="selected-wall-from-x">起點 X</label>
            <input id="selected-wall-from-x" data-field="selected-wall-from-x" type="number" step="1" value="${wall.from.x}">
          </div>
          <div class="field-row">
            <label for="selected-wall-from-y">起點 Y</label>
            <input id="selected-wall-from-y" data-field="selected-wall-from-y" type="number" step="1" value="${wall.from.y}">
          </div>
          <div class="field-row">
            <label for="selected-wall-to-x">終點 X</label>
            <input id="selected-wall-to-x" data-field="selected-wall-to-x" type="number" step="1" value="${wall.to.x}">
          </div>
          <div class="field-row">
            <label for="selected-wall-to-y">終點 Y</label>
            <input id="selected-wall-to-y" data-field="selected-wall-to-y" type="number" step="1" value="${wall.to.y}">
          </div>
        </div>
        <div class="project-readout">
          牆體座標以毫米儲存；畫面會依目前比例顯示，不需要使用者理解工程係數。
        </div>
        <div class="inspector-actions">
          <button class="danger-btn" type="button" data-action="delete-wall">刪除牆體</button>
          <button class="secondary-btn" type="button" data-action="add-opening" data-opening-kind="door">新增門</button>
          <button class="secondary-btn" type="button" data-action="add-opening" data-opening-kind="window">新增窗</button>
          <button class="secondary-btn" type="button" data-action="clean-wall-endpoints">自動接牆</button>
          <button class="secondary-btn" type="button" data-action="set-select-mode">取消選取</button>
        </div>
      </form>
    `;
  }

  function renderSelectedZoneCard(zone) {
    ensureZoneBoundaryFields(zone);
    const zoneDisplayName = getZoneDisplayName(zone.id);
    const boundaryDraft = getZoneBoundaryState();
    const isEditingBoundary = uiState.mode === "edit-zone-boundary" && boundaryDraft.activeZoneId === zone.id;
    const displayEdgeIds = isEditingBoundary ? boundaryDraft.selectedBoundaryEdgeIds : zone.boundaryEdgeIds;
    const displayDraft = isEditingBoundary
      ? boundaryDraft
      : createZoneBoundaryDraft(zone.boundaryEdgeIds || []);
    const boundaryStatus = isEditingBoundary ? "editing" : getZoneBoundaryStatus(zone, displayDraft);
    const boundaryStatusText = getZoneBoundaryStatusLabel(boundaryStatus);
    const boundaryIssues = isEditingBoundary ? displayDraft.issues : zone.boundaryIssues || displayDraft.issues;
    const boundaryIssueText = boundaryIssues.length
      ? `<div class="issue-list">${boundaryIssues.map(renderZoneBoundaryIssue).join("")}</div>`
      : `<div class="inline-message">目前沒有空間邊界問題。</div>`;
    return `
      <form class="inspector-form" aria-label="空間標籤屬性表單">
        <div class="status-card">
          <b>選取空間標籤</b>
          <div class="status-grid">
            <div class="status-row"><span>編號</span><span>${escapeHTML(zoneDisplayName)}</span></div>
            <div class="status-row"><span>空間類型</span><span>${escapeHTML(getZoneTypeLabel(zone.type))}</span></div>
            <div class="status-row"><span>邊界線段</span><span>${displayEdgeIds.length}</span></div>
            <div class="status-row"><span>邊界牆段</span><span>${zone.boundaryWallIds.length}</span></div>
            <div class="status-row"><span>邊界點數</span><span>${(isEditingBoundary ? displayDraft.previewPolygon : zone.polygon).length}</span></div>
            <div class="status-row"><span>邊界狀態</span><span>${escapeHTML(boundaryStatusText)}</span></div>
            <div class="status-row"><span>面積</span><span>${zone.area === null ? "尚未計算" : `${formatNumber(zone.area)} mm²`}</span></div>
            <div class="status-row"><span>更新時間</span><span>${escapeHTML(zone.updatedAt)}</span></div>
          </div>
        </div>
        <div class="field-grid">
          <div class="field-row full">
            <label for="selected-zone-name">名稱</label>
            <input id="selected-zone-name" data-field="selected-zone-name" type="text" value="${escapeAttribute(zone.name)}">
          </div>
          <div class="field-row full">
            <label for="selected-zone-type">類型</label>
            <select id="selected-zone-type" data-field="selected-zone-type">
              ${renderZoneTypeOptions(zone.type)}
            </select>
          </div>
          <div class="field-row">
            <label for="selected-zone-x">標籤 X</label>
            <input id="selected-zone-x" data-field="selected-zone-x" type="number" min="0" step="1" value="${zone.labelPosition.x}">
          </div>
          <div class="field-row">
            <label for="selected-zone-y">標籤 Y</label>
            <input id="selected-zone-y" data-field="selected-zone-y" type="number" min="0" step="1" value="${zone.labelPosition.y}">
          </div>
        </div>
        <div class="project-readout">
          空間標籤與邊界都使用 mm 座標；面積若尚未封閉會維持未計算。
        </div>
        <div class="status-card">
          <b>空間邊界</b>
          <div class="status-grid">
            <div class="status-row"><span>編輯模式</span><span>${isEditingBoundary ? "編輯中" : "未啟動"}</span></div>
            <div class="status-row"><span>目前選取邊界</span><span>${displayEdgeIds.length}</span></div>
            <div class="status-row"><span>邊界牆段</span><span>${zone.boundaryWallIds.length}</span></div>
            <div class="status-row"><span>邊界點數</span><span>${(isEditingBoundary ? displayDraft.previewPolygon : zone.polygon).length}</span></div>
          </div>
          <div class="inspector-actions" style="margin-top: 12px;">
            <button class="secondary-btn" type="button" data-action="start-zone-boundary">編輯邊界</button>
            <button class="toolbar-btn primary" type="button" data-action="apply-zone-boundary" ${isEditingBoundary ? "" : "disabled"}>套用邊界</button>
            <button class="secondary-btn" type="button" data-action="clear-zone-boundary">清除邊界</button>
          </div>
          ${boundaryIssueText}
        </div>
        <div class="inspector-actions">
          <button class="danger-btn" type="button" data-action="delete-zone">刪除空間標籤</button>
          <button class="secondary-btn" type="button" data-action="set-select-mode">取消選取</button>
        </div>
      </form>
    `;
  }

  function renderSelectedOpeningCard(opening) {
    const edge = getEdgeById(opening.edgeId);
    const validation = edge ? validateOpening(opening, edge) : { valid: false, error: "找不到這個門窗依附的牆線，請重新選取牆體。" };
    const sourceWallName = opening.sourceWallId ? getWallDisplayName(opening.sourceWallId) : "-";
    return `
      <form class="inspector-form" aria-label="開口屬性表單">
        <div class="status-card">
          <b>選取門窗 / 開口</b>
          <div class="status-grid">
            <div class="status-row"><span>編號</span><span>${escapeHTML(getOpeningDisplayName(opening.id))}</span></div>
            <div class="status-row"><span>類型</span><span>${escapeHTML(getOpeningKindLabel(opening.kind))}</span></div>
            <div class="status-row"><span>依附牆線</span><span>已連結</span></div>
            <div class="status-row"><span>依附牆體</span><span>${escapeHTML(sourceWallName)}</span></div>
            <div class="status-row"><span>牆段長度</span><span>${edge ? `${formatNumber(edge.length)} mm` : "-"}</span></div>
            <div class="status-row"><span>更新時間</span><span>${escapeHTML(opening.updatedAt)}</span></div>
          </div>
          <div class="inspector-actions" style="margin-top: 12px;">
            <button class="danger-btn" type="button" data-action="delete-opening">刪除開口</button>
            <button class="secondary-btn" type="button" data-action="select-opening-wall">選取依附牆體</button>
          </div>
        </div>
        <div class="field-grid">
          <div class="field-row full">
            <label for="selected-opening-kind">類型</label>
            <select id="selected-opening-kind" data-field="selected-opening-kind">
              ${renderOpeningKindOption("door", opening.kind)}
              ${renderOpeningKindOption("window", opening.kind)}
              ${renderOpeningKindOption("opening", opening.kind)}
            </select>
          </div>
          <div class="field-row">
            <label for="selected-opening-offset">牆上位置 mm</label>
            <input id="selected-opening-offset" data-field="selected-opening-offset" type="number" min="0" step="1" value="${opening.offset}">
          </div>
          <div class="field-row">
            <label for="selected-opening-width">寬度 mm</label>
            <input id="selected-opening-width" data-field="selected-opening-width" type="number" min="${MIN_OPENING_WIDTH}" step="1" value="${opening.width}">
          </div>
          <div class="field-row full">
            <label for="selected-opening-swing">門片方向</label>
            <select id="selected-opening-swing" data-field="selected-opening-swing">
              ${renderSwingOption("left", opening.swing)}
              ${renderSwingOption("right", opening.swing)}
              ${renderSwingOption("sliding", opening.swing)}
              ${renderSwingOption("none", opening.swing)}
            </select>
          </div>
          <div class="field-row">
            <label for="selected-opening-sill-height">窗台高度 mm</label>
            <input id="selected-opening-sill-height" data-field="selected-opening-sill-height" type="number" min="0" step="1" value="${opening.sillHeight ?? ""}">
          </div>
          <div class="field-row">
            <label for="selected-opening-height">高度 mm</label>
            <input id="selected-opening-height" data-field="selected-opening-height" type="number" min="0" step="1" value="${opening.height ?? ""}">
          </div>
        </div>
        ${validation.warning ? `<div class="inline-message">${escapeHTML(validation.warning)}</div>` : ""}
        <div class="project-readout">
          開口會依附在選取牆段上，牆上位置與寬度都以 mm 儲存，後續只作為候選草稿。
        </div>
        <div class="inspector-actions">
          <button class="danger-btn" type="button" data-action="delete-opening">刪除開口</button>
          <button class="secondary-btn" type="button" data-action="set-select-mode">取消選取</button>
        </div>
      </form>
    `;
  }

  function renderSelectedFurnitureCard(item) {
    return `
      <form class="inspector-form" aria-label="家具 / 櫃體候選物件屬性">
        <div class="status-card">
          <b>選取家具 / 櫃體</b>
          <div class="status-grid">
            <div class="status-row"><span>編號</span><span>${escapeHTML(getFurnitureDisplayName(item.id))}</span></div>
            <div class="status-row"><span>項目類型</span><span>${escapeHTML(getFurnitureTypeLabel(item.type))}</span></div>
            <div class="status-row"><span>分類</span><span>${escapeHTML(getFurnitureCategoryLabel(item.category))}</span></div>
            <div class="status-row"><span>圖層</span><span>${escapeHTML(getLayerLabel(item.layer))}</span></div>
            <div class="status-row"><span>預算候選</span><span>${item.budgetCandidate ? "是" : "否"}</span></div>
            <div class="status-row"><span>正式成果</span><span>${item.productionReady ? "是" : "否"}</span></div>
            <div class="status-row"><span>正式估價</span><span>${item.notFormalEstimate ? "否" : "是"}</span></div>
          </div>
          <div class="inspector-actions" style="margin-top: 12px;">
            <button class="danger-btn" type="button" data-action="delete-furniture">刪除家具 / 櫃體</button>
            <button class="secondary-btn" type="button" data-action="apply-current-furniture-material">套用目前材料</button>
          </div>
        </div>
        <div class="field-grid">
          <div class="field-row full">
            <label for="selected-furniture-name">項目名稱</label>
            <input id="selected-furniture-name" data-field="selected-furniture-name" type="text" value="${escapeAttribute(item.name)}">
          </div>
          <div class="field-row">
            <label for="selected-furniture-width">寬度 mm</label>
            <input id="selected-furniture-width" data-field="selected-furniture-width" type="number" min="${MIN_FURNITURE_WIDTH_MM}" step="10" value="${item.widthMm}">
          </div>
          <div class="field-row">
            <label for="selected-furniture-depth">深度 mm</label>
            <input id="selected-furniture-depth" data-field="selected-furniture-depth" type="number" min="${MIN_FURNITURE_DEPTH_MM}" step="10" value="${item.depthMm}">
          </div>
          <div class="field-row">
            <label for="selected-furniture-height">高度 mm</label>
            <input id="selected-furniture-height" data-field="selected-furniture-height" type="number" min="0" step="10" value="${item.heightMm}">
          </div>
          <div class="field-row">
            <label for="selected-furniture-rotation">旋轉角度</label>
            <input id="selected-furniture-rotation" data-field="selected-furniture-rotation" type="number" step="15" value="${item.rotation}">
          </div>
          <div class="field-row full">
            <label for="selected-furniture-material">材料</label>
            <select id="selected-furniture-material" data-field="selected-furniture-material">
              ${renderFurnitureMaterialOptions(item.materialTags?.[0])}
            </select>
          </div>
          <div class="field-row full">
            <label for="selected-furniture-note">備註</label>
            <input id="selected-furniture-note" data-field="selected-furniture-note" type="text" value="${escapeAttribute(item.note || "")}" placeholder="例如：靠牆、需收納、待設計師確認">
          </div>
        </div>
        <div class="project-readout">
          此物件只會作為配置草稿。它不是正式數量、不是報價，也不會送出正式預算。
        </div>
        <div class="inspector-actions">
          ${FURNITURE_MATERIAL_TAGS.map((tag) => `<button class="secondary-btn" type="button" data-action="apply-furniture-material" data-material-tag="${escapeAttribute(tag)}">${escapeHTML(getFurnitureMaterialLabel(tag))}</button>`).join("")}
          <button class="danger-btn" type="button" data-action="delete-furniture">刪除家具 / 櫃體</button>
        </div>
      </form>
    `;
  }

  function renderOpeningKindOption(value, currentValue) {
    return `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHTML(getOpeningKindLabel(value))}</option>`;
  }

  function renderSwingOption(value, currentValue) {
    return `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHTML(getOpeningSwingLabel(value))}</option>`;
  }

  function renderZoneTypeOptions(currentValue) {
    return Object.entries(ZONE_TYPE_LABELS).map(([value, label]) => (
      `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHTML(label)} ${escapeHTML(value)}</option>`
    )).join("");
  }

  function renderStatusOption(value, currentValue) {
    return `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHTML(getWallStatusLabel(value))}</option>`;
  }

  function renderLayerVisibilityCard() {
    const rows = [
      ["underlay", "底圖", "匯入的丈量圖或空白毫米底圖"],
      ["walls", "牆體", "牆段與可點選範圍"],
      ["openings", "門窗開口", "門、窗與通行開口"],
      ["zones", "空間", "空間標籤與邊界"],
      ["furniture", "家具 / 櫃體", "可拖曳與調尺寸的候選物件"],
      ["diagnostics", "診斷圖層", "牆體圖形與問題提示"]
    ];
    return `
      <section class="status-card" data-testid="layer-visibility-card" aria-label="圖層顯示控制">
        <b>圖層顯示</b>
        <div class="draft-list">
          ${rows.map(([key, label, hint]) => {
            const checked = uiState.layerVisibility[key] !== false;
            return `
              <label class="toggle-row" for="layer-visibility-${key}">
                <span><b>${escapeHTML(label)}</b><br><small>${escapeHTML(hint)}</small></span>
                <input id="layer-visibility-${key}" data-field="layer-visibility-${key}" type="checkbox"${checked ? " checked" : ""}>
              </label>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderImportSourceCard() {
    const source = project.importSource;
    const previewText = source.previewSupported ? "可預覽" : "尚未支援";
    return `
      <div class="status-card">
        <b>匯入圖面</b>
        <div class="status-grid">
          <div class="status-row"><span>檔名</span><span>${escapeHTML(source.originalFileName)}</span></div>
          <div class="status-row"><span>檔案類型</span><span>${escapeHTML(source.originalFileType.toUpperCase())}</span></div>
          <div class="status-row"><span>預覽狀態</span><span>${previewText}</span></div>
          <div class="status-row"><span>匯入模式</span><span>${escapeHTML(source.normalizedAs)}</span></div>
        </div>
      </div>
    `;
  }

  function renderUnderlayControls() {
    if (!project.underlay) {
      return "";
    }

    return `
      <div class="status-card">
        <b>底圖控制</b>
        <div class="range-row">
          <label for="underlay-opacity">透明度 <span id="opacityValue">${Math.round(project.underlay.opacity * 100)}%</span></label>
          <input id="underlay-opacity" data-field="underlay-opacity" type="range" min="${MIN_UNDERLAY_OPACITY}" max="${MAX_UNDERLAY_OPACITY}" step="0.01" value="${project.underlay.opacity}">
        </div>
        <div class="inspector-actions" style="margin-top: 12px;">
          <button class="danger-btn" type="button" data-action="reset-project">重設底圖</button>
        </div>
      </div>
    `;
  }

  function renderAutoScaleSuggestionCard() {
    if (!project.underlay || !project.importSource?.previewSupported) {
      return "";
    }
    const suggestion = project.scale?.autoScaleSuggestion;
    if (!suggestion) {
      return `<div class="inline-message">系統正在檢查檔名尺寸線索與圖片尺寸。</div>`;
    }
    const statusText = suggestion.canApply
      ? `可套用，信心 ${escapeHTML(suggestion.confidenceLabel)}`
      : "檔名未找到可自動套用的尺寸線索";
    const applyButton = suggestion.canApply
      ? `<button class="toolbar-btn primary" type="button" data-action="apply-auto-scale-suggestion">套用檔名建議</button>`
      : `<button class="secondary-btn" type="button" disabled>需手動兩點校正</button>`;
    return `
      <div class="inline-message">
        <strong>檔名比例建議</strong>
        <div class="status-grid" style="margin-top: 8px;">
          <div class="status-row"><span>狀態</span><span>${statusText}</span></div>
          <div class="status-row"><span>來源</span><span>${escapeHTML(suggestion.sourceLabel)}</span></div>
          <div class="status-row"><span>圖片尺寸</span><span>${suggestion.imageWidthPx || "-"} x ${suggestion.imageHeightPx || "-"} px</span></div>
          <div class="status-row"><span>建議長度</span><span>${suggestion.knownLengthMm ? `${formatNumber(suggestion.knownLengthMm)} mm` : "-"}</span></div>
          <div class="status-row"><span>建議比例</span><span>${suggestion.pxPerMm ? `${formatNumber(suggestion.pxPerMm)} px / mm` : "-"}</span></div>
        </div>
        <div class="inspector-actions" style="margin-top: 10px;">${applyButton}</div>
      </div>
    `;
  }

  function renderScaleCard() {
    const calibratedBy = project.underlay?.calibratedBy;
    const pointCount = uiState.mode === "calibrate" ? uiState.calibrationPoints.length : getCalibrationPointsForRender().length;
    const scaleReadout = project.scale.calibrated ? getScaleReadout() : "待比例確認";
    const pointReadout = pointCount === 0 ? "尚未選點" : `${Math.min(pointCount, 2)} / 2`;

    return `
      <div class="status-card">
          <b>比例確認</b>
          <div class="status-grid">
          <div class="status-row"><span>比例狀態</span><span>${project.scale.calibrated ? "已確認" : "待比例確認"}</span></div>
          <div class="status-row"><span>比例係數</span><span>${project.scale.pxPerMm ?? "-"}</span></div>
          <div class="status-row"><span>校正點</span><span>${pointReadout}</span></div>
          <div class="status-row"><span>目前比例</span><span>${escapeHTML(scaleReadout)}</span></div>
          ${calibratedBy ? `<div class="status-row"><span>校正資訊</span><span>${formatNumber(calibratedBy.knownLength)} mm = ${formatNumber(calibratedBy.pixelDistance)} px</span></div>` : ""}
        </div>
        <div class="field-row full" style="margin-top: 14px;">
          <label for="known-length">已知長度 mm</label>
          <input id="known-length" data-field="known-length" type="number" min="1" step="1" value="${escapeAttribute(uiState.knownLengthInput)}" placeholder="例如 3000">
        </div>
        <div class="inspector-actions" style="margin-top: 12px;">
          <button class="secondary-btn" type="button" data-action="start-calibration">重新點選</button>
          <button class="toolbar-btn primary" type="button" data-action="apply-calibration">套用比例</button>
        </div>
      </div>
    `;
  }

  function renderWallWorkflowCard() {
    return `
      <div class="status-card">
        <b>牆體操作</b>
        <div class="status-grid">
          <div class="status-row"><span>目前工具</span><span>${escapeHTML(getModeLabel(uiState.mode))}</span></div>
          <div class="status-row"><span>已畫牆段</span><span>${project.walls.length}</span></div>
          <div class="status-row"><span>下一段狀態</span><span>${escapeHTML(getWallStatusLabel(uiState.currentWallStatus))}</span></div>
          <div class="status-row"><span>下一段分類</span><span>${escapeHTML(getWallTypeLabel(uiState.currentWallType))}</span></div>
          <div class="status-row"><span>下一段牆厚</span><span>${uiState.currentWallThickness} mm</span></div>
          <div class="status-row"><span>端點吸附</span><span>${uiState.snapEnabled ? "開啟" : "關閉"}</span></div>
          <div class="status-row"><span>水平 / 垂直輔助</span><span>${uiState.orthogonalEnabled ? "開啟" : "關閉"}</span></div>
        </div>
      </div>
    `;
  }

  function renderZoneWorkflowCard() {
    return `
      <div class="status-card">
        <b>空間標籤</b>
        <div class="status-grid">
          <div class="status-row"><span>目前模式</span><span>${escapeHTML(getModeLabel(uiState.mode))}</span></div>
          <div class="status-row"><span>標籤數</span><span>${project.zones.length}</span></div>
          <div class="status-row"><span>預設類型</span><span>${escapeHTML(getZoneTypeLabel(uiState.currentZoneType))}</span></div>
          <div class="status-row"><span>預設名稱</span><span>${escapeHTML(uiState.currentZoneName || ZONE_TYPE_LABELS[uiState.currentZoneType])}</span></div>
          <div class="status-row"><span>區域邊界</span><span>下一階段</span></div>
        </div>
        <div class="inspector-actions" style="margin-top: 12px;">
          <button class="secondary-btn" type="button" data-action="start-place-zone">新增空間標籤</button>
        </div>
      </div>
    `;
  }

  function renderFurnitureWorkflowCard() {
    const template = getFurnitureTemplate(uiState.currentFurnitureTemplateId);
    return `
      <div class="status-card">
        <b>家具 / 櫃體放置</b>
        <div class="status-grid">
          <div class="status-row"><span>目前模式</span><span>${escapeHTML(getModeLabel(uiState.mode))}</span></div>
          <div class="status-row"><span>目前項目</span><span>${escapeHTML(template.name)}</span></div>
          <div class="status-row"><span>候選數量</span><span>${project.furniture.length}</span></div>
          <div class="status-row"><span>家具來源</span><span>參數化草稿</span></div>
          <div class="status-row"><span>正式成果</span><span>否</span></div>
        </div>
        <div class="inspector-actions" style="margin-top: 12px;">
          <button class="secondary-btn" type="button" data-action="start-place-furniture">放到畫布</button>
        </div>
      </div>
    `;
  }

  function renderWallGraphCard() {
    const graph = project.wallGraph || createInitialWallGraph();
    const issues = graph.issues || [];
    const issueList = issues.length
      ? `<div class="issue-list">${issues.map(renderIssueButton).join("")}</div>`
      : `<div class="inline-message">目前沒有明顯的牆端接合問題。若兩段牆很接近但沒有接上，可用「自動接牆」。</div>`;

    return `
      <div class="status-card">
        <b>接牆檢查</b>
        <div class="status-grid">
          <div class="status-row"><span>牆段數量</span><span>${project.walls.length}</span></div>
          <div class="status-row"><span>接點數量</span><span>${graph.nodes.length}</span></div>
          <div class="status-row"><span>需處理項目</span><span>${issues.length}</span></div>
          <div class="status-row"><span>最後檢查</span><span>${graph.lastBuiltAt ? escapeHTML(graph.lastBuiltAt) : "-"}</span></div>
        </div>
        <div class="inspector-actions" style="margin-top: 12px;">
          <button class="secondary-btn" type="button" data-action="clean-wall-endpoints">自動接牆</button>
        </div>
        ${issueList}
      </div>
    `;
  }

  function renderNodeGraphCard() {
    const graph = project.nodeGraph || createInitialNodeGraph();
    const intersectionCount = graph.nodes.filter((node) => node.kind === "intersection").length;
    const unsplitIntersectionCount = (project.wallGraph?.issues || []).filter((issue) => issue.type === "wall-intersection").length;
    const selectedIssue = getSelectedIssue();
    const canSplitSelectedIssue = selectedIssue?.type === "wall-intersection";
    const selectedNode = uiState.selectedNodeId
      ? graph.nodes.find((node) => node.id === uiState.selectedNodeId)
      : null;

    return `
      <div class="status-card">
        <b>牆線交會檢查</b>
        <div class="status-grid">
          <div class="status-row"><span>接點數量</span><span>${graph.nodes.length}</span></div>
          <div class="status-row"><span>牆線段數量</span><span>${graph.edges.length}</span></div>
          <div class="status-row"><span>交會點</span><span>${intersectionCount}</span></div>
          <div class="status-row"><span>需切分交會</span><span>${unsplitIntersectionCount}</span></div>
          ${selectedNode ? `<div class="status-row"><span>選取接點</span><span>${escapeHTML(selectedNode.id)}</span></div>` : ""}
        </div>
        ${canSplitSelectedIssue ? `
          <div class="inspector-actions" style="margin-top: 12px;">
            <button class="toolbar-btn primary" type="button" data-action="split-wall-intersection">把交會牆段切開</button>
          </div>
        ` : `<div class="inline-message" style="margin-top: 12px;">這是進階檢查。一般畫圖時可先忽略；只有牆線交叉卻沒有接上時，才需要切開交會牆段。</div>`}
      </div>
    `;
  }

  function renderStyleVisualPanel() {
    const statusClass = `is-${styleVisualTask.status}`;
    const statusText = getStyleVisualStatusText(styleVisualTask.status);
    const statusBadgeText = getStyleVisualStatusBadgeText(styleVisualTask.status);
    const promptPreview = styleVisualTask.status === "ready"
      ? styleVisualTask.promptPreview
      : buildStylePromptPreview(styleVisualRequest);
    const sanitizedPrompt = styleVisualTask.sanitizedPrompt || buildSanitizedVisualPrompt(styleVisualRequest);
    const briefText = styleVisualTask.status === "ready"
      ? styleVisualTask.visualBrief
      : getStyleVisualPlaceholderBrief(styleVisualTask.status);
    const isDrafting = styleVisualTask.status === "drafting";
    const referenceImagePolicy = styleVisualTask.referenceImagePolicy || getStyleVisualReferenceImagePolicy();

    return `
      <section class="status-card visual-sim-panel" aria-label="AI 風格示意">
        <div class="visual-sim-heading">
          <div>
            <b>AI 風格示意</b>
            <p>沙盒預覽：僅展示案件上架與風格溝通方向，不接正式產線，不保存正式案件。</p>
          </div>
          <span class="visual-sim-status ${statusClass}">${escapeHTML(statusBadgeText)}</span>
        </div>

        <div class="sandbox-label-row" aria-label="沙盒標籤">
          <span class="sandbox-label">沙盒預覽</span>
          <span class="sandbox-label">風格示意圖</span>
          <span class="sandbox-label is-warning">非正式圖片</span>
          <span class="sandbox-label">不會保存到正式案件</span>
          <span class="sandbox-label">非真實案例</span>
          <span class="sandbox-label">非正式成果</span>
        </div>

        <div class="visual-field-grid" aria-label="風格需求欄位">
          ${renderStyleVisualField("空間類型", "style-visual-room-type", styleVisualRequest.roomType)}
          ${renderStyleVisualField("主要風格", "style-visual-primary-style", styleVisualRequest.primaryStyle)}
          ${renderStyleVisualField("次要風格", "style-visual-secondary-style", styleVisualRequest.secondaryStyle)}
          ${renderStyleVisualField("色調", "style-visual-color-tone", styleVisualRequest.colorTone)}
          ${renderStyleVisualField("材質語彙", "style-visual-material-tone", styleVisualRequest.materialTone, true)}
          ${renderStyleVisualField("預算感", "style-visual-budget-level", styleVisualRequest.budgetLevel)}
        </div>

        <div class="status-grid" style="margin-top: 12px;">
          <div class="status-row"><span>任務狀態</span><span>${escapeHTML(statusText)}</span></div>
          <div class="status-row"><span>任務 ID</span><span>${escapeHTML(styleVisualTask.id)}</span></div>
          <div class="status-row"><span>代理狀態</span><span>${escapeHTML(getStyleVisualProxyStatusText(styleVisualTask.proxyStatus))}</span></div>
          <div class="status-row"><span>用途</span><span>${escapeHTML(styleVisualRequest.purpose)}</span></div>
          <div class="status-row"><span>參考圖上傳</span><span>${referenceImagePolicy.allowed ? "已開放" : "未開放"}</span></div>
        </div>

        <div class="reference-image-notice">${escapeHTML(referenceImagePolicy.notice)}</div>

        ${renderStyleTags()}

        <div class="prompt-preview">
          <strong>AI 提示詞預覽</strong>
          ${escapeHTML(promptPreview)}
        </div>

        <div class="prompt-preview sandbox-prompt-preview">
          <strong>安全處理後提示詞</strong>
          ${escapeHTML(sanitizedPrompt)}
        </div>

        <div class="visual-action-row">
          <span class="visual-brief">${escapeHTML(isDrafting ? "AI 正在整理風格方向..." : briefText)}</span>
          <button class="secondary-btn" type="button" data-action="generate-style-visual" ${isDrafting ? "disabled" : ""}>
            ${isDrafting ? "整理中..." : "生成風格示意"}
          </button>
        </div>

        ${renderStyleVisualPreviewCard(briefText, promptPreview, styleVisualTask.generatedPreview)}

        <div class="visual-disclaimer">${escapeHTML(styleVisualTask.disclaimer)}</div>
      </section>
    `;
  }

  function renderStyleVisualField(label, id, value, isFullWidth) {
    return `
      <div class="field-row${isFullWidth ? " full" : ""}">
        <label for="${escapeAttribute(id)}">${escapeHTML(label)}</label>
        <input id="${escapeAttribute(id)}" data-field="${escapeAttribute(id)}" type="text" value="${escapeAttribute(value)}">
      </div>
    `;
  }

  function renderStyleTags(request = styleVisualRequest) {
    const sanitized = buildSanitizedStyleVisualRequest(request);
    const tags = [
      sanitized.roomType,
      sanitized.primaryStyle,
      sanitized.secondaryStyle,
      sanitized.colorTone,
      sanitized.materialTone,
      sanitized.budgetLevel
    ].filter(Boolean);

    return `<div class="tag-row" aria-label="風格標籤">${tags.map((tag) => `<span class="style-tag">${escapeHTML(tag)}</span>`).join("")}</div>`;
  }

  function renderStyleVisualPreviewCard(briefText, promptPreview, generatedPreview) {
    const isReady = styleVisualTask.status === "ready";
    const isDrafting = styleVisualTask.status === "drafting";
    const moodLabel = isReady ? "沙盒預覽" : isDrafting ? "整理中" : "待生成";
    const previewState = generatedPreview?.status || styleVisualTask.proxyStatus || "disabled";
    const previewMessage = generatedPreview?.message || STYLE_VISUAL_PROXY_DISABLED_MESSAGE;
    const storageLabel = generatedPreview ? "本機暫存預覽狀態" : "本機狀態尚未建立";
    const temporaryImageUrl = generatedPreview?.temporaryImageUrl || "尚未建立，圖片代理未啟用";
    const cardBrief = isReady ? briefText : isDrafting
      ? "正在將空間、風格、色調與材質語彙整理成示意方向。"
      : "按下生成後，這裡會顯示案件風格示意預覽卡。";

    return `
      <article class="visual-preview-card" aria-label="風格示意圖預覽卡">
        <div class="visual-mock-image sandbox-generated-frame${previewState === "disabled" ? " is-disabled" : ""}" aria-label="臨時沙盒圖片預覽">
          <div class="visual-mock-overlay">
            <span class="mood-label">${escapeHTML(moodLabel)}</span>
            <span class="disclaimer-badge">風格示意圖</span>
          </div>
          <div class="sandbox-fallback-message">${escapeHTML(previewMessage)}</div>
        </div>
        <div class="visual-preview-body">
          <div class="sandbox-label-row" aria-label="預覽沙盒標籤">
            <span class="sandbox-label">沙盒預覽</span>
            <span class="sandbox-label">風格示意圖</span>
            <span class="sandbox-label is-warning">非正式圖片</span>
            <span class="sandbox-label">不會保存到正式案件</span>
            <span class="sandbox-label">非真實案例</span>
            <span class="sandbox-label">非正式成果</span>
          </div>
          <div class="status-row"><span>空間類型</span><span>${escapeHTML(styleVisualRequest.roomType)}</span></div>
          <div class="status-row"><span>預覽狀態</span><span>${escapeHTML(getStyleVisualProxyStatusText(previewState))}</span></div>
          <div class="status-row"><span>儲存範圍</span><span>${escapeHTML(storageLabel)}</span></div>
          <div class="status-row"><span>臨時網址</span><span>${escapeHTML(temporaryImageUrl)}</span></div>
          ${renderStyleTags()}
          <p class="visual-brief">${escapeHTML(cardBrief)}</p>
          <div class="prompt-preview">
            <strong>提示詞範例</strong>
            ${escapeHTML(promptPreview)}
          </div>
          <span class="disclaimer-badge" style="width: fit-content;">非正式成果</span>
        </div>
      </article>
    `;
  }

  function getStyleVisualPlaceholderBrief(status) {
    if (status === "drafting") {
      return "AI 正在整理風格方向，稍後會建立可供案件上架參考的風格摘要。";
    }
    return "尚未生成風格示意。輸入風格需求後，可建立風格摘要、標籤與提示詞預覽。";
  }

  function getStyleVisualStatusText(status) {
    if (status === "drafting") {
      return "AI 正在整理風格方向…";
    }
    if (status === "ready") {
      return "沙盒預覽已建立";
    }
    return "尚未生成風格示意";
  }

  function getStyleVisualStatusBadgeText(status) {
    if (status === "ready") {
      return "沙盒預覽已建立";
    }
    return status;
  }

  function getStyleVisualProxyStatusText(status) {
    if (status === "drafting") {
      return "正在建立風格示意請求...";
    }
    if (status === "mock_ready") {
      return "沙盒預覽已建立";
    }
    if (status === "error") {
      return "伺服端圖片代理發生錯誤";
    }
    return STYLE_VISUAL_PROXY_DISABLED_MESSAGE;
  }

  function renderIssueButton(issue) {
    const active = issue.id === uiState.selectedIssueId;
    return `
      <button class="issue-button${active ? " is-active" : ""}" type="button" data-action="select-issue" data-issue-id="${escapeAttribute(issue.id)}">
        <strong>${escapeHTML(getIssueTypeLabel(issue.type))}</strong>
        ${escapeHTML(issue.message)}
      </button>
    `;
  }

  function renderZoneBoundaryIssue(issue) {
    return `
      <div class="issue-button" role="status">
        <strong>${escapeHTML(getZoneBoundaryIssueLabel(issue.type))}</strong>
        ${escapeHTML(issue.message)}
      </div>
    `;
  }

  function renderMessageBlocks(forcedMessage) {
    const blocks = [];
    const message = forcedMessage || uiState.message;
    if (message) {
      blocks.push(`<div class="inline-message">${escapeHTML(message)}</div>`);
    }
    if (uiState.error) {
      blocks.push(`<div class="error-message">${escapeHTML(uiState.error)}</div>`);
    }
    return blocks.join("");
  }

  function renderBridgeCard() {
    const bridge = getPlancraftBridgeStatus(project);
    const validation = normalizePcValidationResult(bridge.validation);
    const preview = normalizeRendererPreviewResult(bridge.preview);
    return `
      <div class="bridge-card">
        <b>進階轉換狀態</b>
        <div class="status-grid">
          <div class="status-row"><span>狀態</span><span>${escapeHTML(bridge.status)}</span></div>
          <div class="status-row"><span>目標格式</span><span>${escapeHTML(bridge.targetFormat)}</span></div>
          <div class="status-row"><span>格式檢查</span><span>${escapeHTML(validation.status)}</span></div>
          <div class="status-row"><span>圖面預覽</span><span>${escapeHTML(preview.status)}</span></div>
          <div class="status-row"><span>說明</span><span>${escapeHTML(bridge.reason)}</span></div>
        </div>
      </div>
    `;
  }

  function renderPcConverterReportCard() {
    const report = uiState.pcConverterReport || createInitialPcConverterReport();
    const summary = report.summary || createInitialPcConverterReport().summary;
    const validation = normalizePcValidationResult(report.validation);
    const validationNotice = validation.status === "not_run"
      ? `<div class="inline-message">靜態頁尚未直接載入正式檔案檢查器；請使用本機驗證流程確認 .pc 候選測試檔。</div>`
      : "";
    const validationWarningList = validation.warnings.length
      ? `<div class="issue-list">${validation.warnings.map((warning) => `<div class="issue-button" role="status"><strong>驗證警告</strong>${escapeHTML(warning)}</div>`).join("")}</div>`
      : "";
    const validationErrorList = validation.errors.length
      ? `<div class="issue-list">${validation.errors.map((error) => `<div class="issue-button" role="status"><strong>驗證錯誤</strong>${escapeHTML(error)}</div>`).join("")}</div>`
      : "";
    const warningList = report.warnings?.length
      ? `<div class="issue-list">${report.warnings.map((warning) => `<div class="issue-button" role="status"><strong>警告</strong>${escapeHTML(warning)}</div>`).join("")}</div>`
      : `<div class="inline-message">尚未產生轉換警告。</div>`;
    const errorList = report.errors?.length
      ? `<div class="issue-list">${report.errors.map((error) => `<div class="issue-button" role="status"><strong>錯誤</strong>${escapeHTML(error)}</div>`).join("")}</div>`
      : "";

    return `
      <div class="status-card">
        <b>轉換報告</b>
        <div class="status-grid">
          <div class="status-row"><span>轉換狀態</span><span>${escapeHTML(report.status)}</span></div>
          <div class="status-row"><span>空間數</span><span>${summary.roomCount}</span></div>
          <div class="status-row"><span>牆段數</span><span>${summary.wallCount}</span></div>
          <div class="status-row"><span>門窗數</span><span>${summary.openingCount}</span></div>
          <div class="status-row"><span>略過空間</span><span>${summary.skippedZoneCount}</span></div>
          <div class="status-row"><span>略過門窗</span><span>${summary.skippedOpeningCount}</span></div>
          <div class="status-row"><span>匯出時間</span><span>${report.exportedAt ? escapeHTML(report.exportedAt) : "-"}</span></div>
          <div class="status-row"><span>驗證狀態</span><span>${escapeHTML(validation.status)}</span></div>
          <div class="status-row"><span>驗證時間</span><span>${validation.checkedAt ? escapeHTML(validation.checkedAt) : "-"}</span></div>
          <div class="status-row"><span>下一步</span><span>${escapeHTML(getPcValidationNextAction(validation))}</span></div>
        </div>
        <div class="project-readout">${escapeHTML(PC_SPIKE_NOTICE)}</div>
        <div class="project-readout">${escapeHTML(validation.reason)}</div>
        ${validationNotice}
        <div class="inspector-actions" style="margin-top: 12px;">
          <button class="toolbar-btn primary" type="button" disabled data-mock-only="true" data-action="export-pc-spike" title="候選 .pc 預覽停用；不執行正式產出">.pc 正式匯出停用</button>
        </div>
        ${validationErrorList}
        ${validationWarningList}
        ${errorList}
        ${warningList}
      </div>
    `;
  }

  function renderRendererPreviewReportCard() {
    const report = uiState.pcConverterReport || createInitialPcConverterReport();
    const bridge = getPlancraftBridgeStatus(project);
    const preview = normalizeRendererPreviewResult(report.preview || bridge.preview);
    const previewNotice = preview.status === "not_run"
      ? `<div class="inline-message">靜態頁尚未直接載入正式圖面預覽器；請使用本機驗證流程產生 SVG 預覽。</div>`
      : "";
    const previewWarningList = preview.warnings.length
      ? `<div class="issue-list">${preview.warnings.map((warning) => `<div class="issue-button" role="status"><strong>預覽警告</strong>${escapeHTML(warning)}</div>`).join("")}</div>`
      : "";
    const previewErrorList = preview.errors.length
      ? `<div class="issue-list">${preview.errors.map((error) => `<div class="issue-button" role="status"><strong>預覽錯誤</strong>${escapeHTML(error)}</div>`).join("")}</div>`
      : "";

    return `
      <div class="status-card">
        <b>圖面預覽報告</b>
        <div class="status-grid">
          <div class="status-row"><span>預覽狀態</span><span>${escapeHTML(preview.status)}</span></div>
          <div class="status-row"><span>檢查時間</span><span>${preview.checkedAt ? escapeHTML(preview.checkedAt) : "-"}</span></div>
          <div class="status-row"><span>SVG 輸出路徑</span><span>${preview.svgOutputPath ? escapeHTML(preview.svgOutputPath) : "-"}</span></div>
          <div class="status-row"><span>下一步</span><span>${escapeHTML(getRendererPreviewNextAction(preview))}</span></div>
        </div>
        ${previewNotice}
        <div class="project-readout">${escapeHTML(preview.command)}</div>
        <div class="project-readout">${escapeHTML(PC_RENDERER_LAYERS_COMMAND)}</div>
        ${previewErrorList}
        ${previewWarningList}
      </div>
    `;
  }

  function renderStatusLabels() {
    if (underlayStatusText) {
      underlayStatusText.textContent = project.underlay ? "已匯入" : "尚未匯入";
    }
    if (scaleStatusText) {
      scaleStatusText.textContent = project.scale.calibrated ? "已確認" : (project.underlay ? "待兩點校正" : "待比例確認");
    }
    if (scaleStatusText && !project.scale.calibrated && project.scale.autoScaleSuggestion?.canApply) {
      scaleStatusText.textContent = "有檔名建議";
    }
    if (wallCountStatusText) {
      wallCountStatusText.textContent = String(project.walls.length);
    }
    if (nodeCountStatusText) {
      nodeCountStatusText.textContent = String(project.nodeGraph?.nodes?.length || project.wallGraph?.nodes?.length || 0);
    }
    if (issueCountStatusText) {
      issueCountStatusText.textContent = String(project.wallGraph?.issues?.length || 0);
    }
  }

  function syncStaticControls() {
    const currentStatus = document.getElementById("current-wall-status");
    if (currentStatus) {
      currentStatus.value = uiState.currentWallStatus;
    }
    const currentWallType = document.getElementById("current-wall-type");
    if (currentWallType) {
      currentWallType.value = normalizeWallType(uiState.currentWallType);
    }
    const currentThickness = document.getElementById("current-wall-thickness");
    if (currentThickness) {
      const optionValues = Array.from(currentThickness.options).map((option) => option.value);
      if (optionValues.includes(String(uiState.currentWallThickness))) {
        currentThickness.value = String(uiState.currentWallThickness);
      }
    }
    const snapEnabled = document.getElementById("snap-enabled");
    if (snapEnabled) {
      snapEnabled.checked = uiState.snapEnabled;
    }
    const orthogonalEnabled = document.getElementById("orthogonal-enabled");
    if (orthogonalEnabled) {
      orthogonalEnabled.checked = uiState.orthogonalEnabled;
    }
    const currentOpeningWidth = document.getElementById("current-opening-width");
    if (currentOpeningWidth) {
      currentOpeningWidth.value = String(uiState.currentOpeningWidth);
    }
    const currentOpeningSwing = document.getElementById("current-opening-swing");
    if (currentOpeningSwing) {
      currentOpeningSwing.value = uiState.currentOpeningSwing;
    }
    const currentZoneType = document.getElementById("current-zone-type");
    if (currentZoneType) {
      currentZoneType.value = uiState.currentZoneType;
    }
    const currentZoneName = document.getElementById("current-zone-name");
    if (currentZoneName) {
      currentZoneName.value = uiState.currentZoneName || ZONE_TYPE_LABELS[uiState.currentZoneType];
    }
    document.querySelectorAll('[data-field="current-furniture-template"]').forEach((currentFurnitureTemplate) => {
      currentFurnitureTemplate.value = uiState.currentFurnitureTemplateId;
    });
    document.querySelectorAll('[data-field="current-furniture-material"]').forEach((currentFurnitureMaterial) => {
      currentFurnitureMaterial.value = uiState.currentFurnitureMaterialTag;
    });
    document.querySelectorAll("[data-mode-button]").forEach((button) => {
      button.classList.toggle("is-mode-active", button.dataset.modeButton === uiState.mode);
    });
    document.querySelectorAll('[data-action="undo-action"]').forEach((button) => {
      button.disabled = undoStack.length === 0;
      button.title = undoStack.length
        ? `復原上一個繪圖動作：${undoStack[undoStack.length - 1].label}（Ctrl+Z）`
        : "目前沒有可復原的繪圖動作";
    });
    document.querySelectorAll('[data-action="redo-action"]').forEach((button) => {
      button.disabled = redoStack.length === 0;
      button.title = redoStack.length
        ? `重做下一個繪圖動作：${redoStack[redoStack.length - 1].label}（Ctrl+Y）`
        : "目前沒有可重做的繪圖動作";
    });
  }

  function selectWall(wallId) {
    rebuildNodeGraph();
    uiState.selectedWallId = wallId;
    uiState.selectedEdgeId = getEdgeForWall(wallId)?.id || null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.mode = "select";
    uiState.inspectorTab = "properties";
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = "已選取牆體，可在右側編輯座標、牆厚與狀態。";
    render();
  }

  function syncBridge() {
    project.plancraftBridge = getPlancraftBridgeStatus(project);
  }

  function selectOpening(openingId) {
    const opening = project.openings.find((item) => item.id === openingId);
    if (!opening) {
      return;
    }
    uiState.selectedOpeningId = opening.id;
    uiState.selectedEdgeId = opening.edgeId;
    uiState.selectedWallId = getWallIdFromEdgeId(opening.edgeId);
    uiState.selectedZoneId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.mode = "select";
    uiState.inspectorTab = "properties";
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = "已選取開口，可在右側調整 offset、width 與 swing。";
    render();
  }

  function selectWallForSelectedOpening() {
    const opening = getSelectedOpening();
    if (!opening) {
      uiState.error = "請先選取門窗或開口。";
      uiState.message = "";
      render();
      return;
    }

    const wallId = opening.sourceWallId || getWallIdFromEdgeId(opening.edgeId);
    const wall = project.walls.find((item) => item.id === wallId);
    if (!wall) {
      uiState.error = "找不到此開口依附的牆體。";
      uiState.message = "";
      render();
      return;
    }

    selectWall(wall.id);
  }

  function selectZone(zoneId) {
    const zone = project.zones.find((item) => item.id === zoneId);
    if (!zone) {
      return;
    }
    uiState.selectedZoneId = zone.id;
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedFurnitureId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.mode = "select";
    uiState.inspectorTab = "properties";
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = "已選取空間標籤，可在右側編輯名稱、類型與位置。";
    render();
  }

  function rebuildWallGraph() {
    const builtAt = new Date().toISOString();
    const endpointRecords = getEndpointRecords();
    const nodes = buildEndpointNodes(endpointRecords, builtAt);
    const issues = [];
    const intersectionNodes = new Map();

    project.walls.forEach((wall) => {
      const length = getDistance(wall.from, wall.to);
      const midpoint = getMidpoint(wall.from, wall.to);
      if (length <= GEOMETRY_EPSILON) {
        issues.push(createIssue({
          type: "zero-length-wall",
          wallIds: [wall.id],
          points: [midpoint],
          message: "有牆段長度為 0，請確認是否需要刪除或重畫。"
        }));
        return;
      }
      if (length < MIN_WALL_LENGTH) {
        issues.push(createIssue({
          type: "wall-too-short",
          wallIds: [wall.id],
          points: [midpoint],
          message: `有牆段短於 ${MIN_WALL_LENGTH}mm，請確認是否為有效牆段。`
        }));
      }
    });

    for (let i = 0; i < endpointRecords.length; i += 1) {
      for (let j = i + 1; j < endpointRecords.length; j += 1) {
        const first = endpointRecords[i];
        const second = endpointRecords[j];
        if (first.wallId === second.wallId) {
          continue;
        }
        const distance = getDistance(first.point, second.point);
        if (distance >= NEARBY_ENDPOINT_MIN_DISTANCE && distance <= NEARBY_ENDPOINT_MAX_DISTANCE && !isSamePoint(first.point, second.point)) {
          issues.push(createIssue({
            type: "nearby-endpoints",
            wallIds: uniqueIds([first.wallId, second.wallId]),
            points: [first.point, second.point],
            endpointRefs: [first.id, second.id],
            distance: Number(distance.toFixed(2)),
            message: "有牆端點接近但未接上，建議使用「自動接牆」。"
          }));
        }
      }
    }

    for (let i = 0; i < project.walls.length; i += 1) {
      for (let j = i + 1; j < project.walls.length; j += 1) {
        const firstWall = project.walls[i];
        const secondWall = project.walls[j];
        const overlap = detectAxisAlignedOverlap(firstWall, secondWall);
        if (overlap) {
          issues.push(createIssue({
            type: "overlapping-walls",
            wallIds: [firstWall.id, secondWall.id],
            points: overlap.points,
            overlapLength: Number(overlap.length.toFixed(2)),
            message: "有水平或垂直牆段互相重疊，請確認是否需要合併或重畫。"
          }));
          continue;
        }

        const intersection = getSegmentIntersection(firstWall, secondWall);
        if (!intersection) {
          continue;
        }

        const sharedEndpoint = isPointAtWallEndpoint(firstWall, intersection) && isPointAtWallEndpoint(secondWall, intersection);
        if (sharedEndpoint) {
          continue;
        }

        const nodeId = createGraphNodeId("intersection", intersection);
        intersectionNodes.set(nodeId, {
          id: nodeId,
          x: intersection.x,
          y: intersection.y,
          wallIds: [firstWall.id, secondWall.id],
          kind: "intersection",
          createdAt: builtAt
        });
        issues.push(createIssue({
          type: "wall-intersection",
          wallIds: [firstWall.id, secondWall.id],
          nodeIds: [nodeId],
          points: [intersection],
          message: "偵測到 T 字或十字牆段交會，目前僅標示問題，不會自動切牆。"
        }));
      }
    }

    project.wallGraph = {
      nodes: [...nodes, ...intersectionNodes.values()],
      issues,
      lastBuiltAt: builtAt
    };

    if (uiState.selectedIssueId && !issues.some((issue) => issue.id === uiState.selectedIssueId)) {
      uiState.selectedIssueId = null;
    }
  }

  function rebuildNodeGraph() {
    const builtAt = new Date().toISOString();
    const endpointRecords = getEndpointRecords();
    const nodeMap = new Map();
    const edges = [];

    endpointRecords.forEach((record) => {
      const key = pointKey(record.point);
      const existing = nodeMap.get(key);
      const wallIds = uniqueIds([...(existing?.wallIds || []), record.wallId]);
      nodeMap.set(key, {
        id: "",
        x: record.point.x,
        y: record.point.y,
        wallIds,
        edgeIds: [],
        kind: wallIds.length >= 3 ? "intersection" : "endpoint",
        createdAt: existing?.createdAt || builtAt
      });
    });

    nodeMap.forEach((node, key) => {
      const point = pointFromKey(key);
      node.id = createGraphNodeId(node.kind, point);
    });

    project.walls.forEach((wall) => {
      const fromNode = nodeMap.get(pointKey(wall.from));
      const toNode = nodeMap.get(pointKey(wall.to));
      if (!fromNode || !toNode) {
        return;
      }

      const length = Number(getDistance(wall.from, wall.to).toFixed(2));
      const edge = {
        id: createEdgeId(wall),
        sourceWallId: wall.sourceWallId || wall.id,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        from: roundPoint(wall.from),
        to: roundPoint(wall.to),
        thickness: wall.thickness,
        status: normalizeWallStatus(wall.status),
        wallType: normalizeWallType(wall.wallType),
        structural: Boolean(wall.structural || normalizeWallType(wall.wallType) === "bearing_wall"),
        layer: wall.layer || "walls",
        length,
        createdAt: wall.createdAt || builtAt,
        updatedAt: wall.updatedAt || builtAt
      };
      edges.push(edge);
      fromNode.edgeIds = uniqueIds([...fromNode.edgeIds, edge.id]);
      toNode.edgeIds = uniqueIds([...toNode.edgeIds, edge.id]);
    });

    project.nodeGraph = {
      nodes: [...nodeMap.values()],
      edges,
      issues: JSON.parse(JSON.stringify(project.wallGraph?.issues || [])),
      lastBuiltAt: builtAt
    };

    if (uiState.selectedNodeId && !project.nodeGraph.nodes.some((node) => node.id === uiState.selectedNodeId)) {
      uiState.selectedNodeId = null;
    }
  }

  function splitSelectedIntersectionIssue() {
    const issue = getSelectedIssue();
    if (!issue || issue.type !== "wall-intersection" || !issue.points[0]) {
      uiState.error = "請先在「接牆檢查」選取一個斷點或交會問題，再執行切分。";
      uiState.message = "";
      render();
      return;
    }

    const splitPoint = roundPoint(issue.points[0]);
    const relatedWallIds = new Set(issue.wallIds || []);
    const nextWalls = [];
    const newWallIds = [];
    const now = new Date().toISOString();

    for (const wall of project.walls) {
      if (!relatedWallIds.has(wall.id)) {
        nextWalls.push(wall);
        continue;
      }

      if (isPointAtWallEndpoint(wall, splitPoint)) {
        nextWalls.push(wall);
        continue;
      }

      if (!isPointOnSegment(wall, splitPoint)) {
        nextWalls.push(wall);
        continue;
      }

      const firstLength = getDistance(wall.from, splitPoint);
      const secondLength = getDistance(splitPoint, wall.to);
      if (firstLength < MIN_WALL_LENGTH || secondLength < MIN_WALL_LENGTH) {
        uiState.error = "切分後會產生過短牆段，請先調整牆體。";
        uiState.message = "";
        render();
        return;
      }

      const splitWalls = [
        createSplitWall(wall, wall.from, splitPoint, "a", now),
        createSplitWall(wall, splitPoint, wall.to, "b", now)
      ];
      splitWalls.forEach((splitWall) => {
        nextWalls.push(splitWall);
        newWallIds.push(splitWall.id);
      });
    }

    if (newWallIds.length === 0) {
      uiState.error = "此交會點已位於牆端點，沒有需要切分的牆段。";
      uiState.message = "";
      render();
      return;
    }

    pushHistory("切分交會牆段");
    project.walls = nextWalls.filter((wall) => getDistance(wall.from, wall.to) >= MIN_WALL_LENGTH);
    rebuildWallGraph();
    rebuildNodeGraph();
    uiState.selectedWallId = newWallIds[0] || null;
    uiState.selectedEdgeId = uiState.selectedWallId ? createEdgeId({ id: uiState.selectedWallId }) : null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = createGraphNodeId("intersection", splitPoint);
    uiState.error = "";
    uiState.message = `已在交會點切分 ${newWallIds.length} 段牆，並重新整理牆端圖。`;
    syncBridge();
    render();
  }

  function createSplitWall(sourceWall, from, to, suffix, timestamp) {
    const sourceWallId = sourceWall.sourceWallId || sourceWall.id;
    return {
      ...sourceWall,
      id: `${sourceWall.id}-${suffix}-${createId("split").split("-").pop()}`,
      sourceWallId,
      from: roundPoint(from),
      to: roundPoint(to),
      thickness: sourceWall.thickness,
      status: normalizeWallStatus(sourceWall.status),
      wallType: normalizeWallType(sourceWall.wallType),
      structural: Boolean(sourceWall.structural || normalizeWallType(sourceWall.wallType) === "bearing_wall"),
      layer: sourceWall.layer || "walls",
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  function addOpening(kindValue) {
    rebuildNodeGraph();
    const kind = normalizeOpeningKind(kindValue);
    const previousKind = uiState.currentOpeningKind || "door";
    const usingPreviousDefault = uiState.currentOpeningWidth === DEFAULT_OPENING_WIDTHS[previousKind];
    uiState.currentOpeningKind = kind;
    if (usingPreviousDefault) {
      uiState.currentOpeningWidth = DEFAULT_OPENING_WIDTHS[kind];
    }

    const edge = getSelectedEdgeForOpening();
    if (!edge) {
      uiState.error = project.nodeGraph?.edges?.length
        ? "請先選取一段牆，再新增門窗或開口。"
        : "請先建立並整理牆端。";
      uiState.message = "";
      render();
      return;
    }

    if (edge.status === "demolished") {
      uiState.error = "拆除牆上不建議新增門窗。";
      uiState.message = "";
      render();
      return;
    }

    const width = normalizeOpeningWidthInput(uiState.currentOpeningWidth, DEFAULT_OPENING_WIDTHS[kind]);
    if (width > edge.length) {
      uiState.error = "開口寬度不可大於牆段長度。";
      uiState.message = "";
      render();
      return;
    }

    const offset = Math.max(0, Math.round((edge.length - width) / 2));
    const now = new Date().toISOString();
    const opening = {
      id: createId("opening"),
      edgeId: edge.id,
      sourceWallId: edge.sourceWallId,
      kind,
      offset,
      width,
      swing: kind === "door" ? normalizeOpeningSwing(uiState.currentOpeningSwing) : "none",
      sillHeight: kind === "window" ? 900 : null,
      height: getDefaultOpeningHeight(kind),
      createdAt: now,
      updatedAt: now
    };

    const validation = validateOpening(opening, edge);
    if (!validation.valid) {
      uiState.error = validation.error || "開口資料不合法。";
      uiState.message = "";
      render();
      return;
    }

    pushHistory(`新增${getOpeningKindLabel(kind)}`);
    project.openings.push(opening);
    uiState.selectedOpeningId = opening.id;
    uiState.selectedEdgeId = edge.id;
    uiState.selectedWallId = getWallIdFromEdgeId(edge.id);
    uiState.selectedZoneId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.inspectorTab = "properties";
    uiState.error = "";
    uiState.message = validation.warning || `已新增 ${kind}。`;
    syncBridge();
    render();
  }

  function updateSelectedOpeningFromField(input) {
    const opening = getSelectedOpening();
    if (!opening) {
      return;
    }

    const edge = getEdgeById(opening.edgeId);
    if (!edge) {
      uiState.error = "找不到這個門窗依附的牆線，請重新選取牆段。";
      render();
      return;
    }

    const nextOpening = { ...opening };
    const field = input.dataset.field;
    if (field === "selected-opening-kind") {
      nextOpening.kind = normalizeOpeningKind(input.value);
      if (nextOpening.kind !== "door") {
        nextOpening.swing = "none";
      }
      if (nextOpening.kind === "window" && nextOpening.sillHeight === null) {
        nextOpening.sillHeight = 900;
      }
      if (nextOpening.height === null) {
        nextOpening.height = getDefaultOpeningHeight(nextOpening.kind);
      }
    }
    if (field === "selected-opening-offset") {
      nextOpening.offset = readCoordinateInput(input, opening.offset);
    }
    if (field === "selected-opening-width") {
      nextOpening.width = readCoordinateInput(input, opening.width);
    }
    if (field === "selected-opening-swing") {
      nextOpening.swing = normalizeOpeningSwing(input.value);
    }
    if (field === "selected-opening-sill-height") {
      nextOpening.sillHeight = readOptionalNumber(input.value);
    }
    if (field === "selected-opening-height") {
      nextOpening.height = readOptionalNumber(input.value);
    }

    const validation = validateOpening(nextOpening, edge);
    if (!validation.valid) {
      uiState.error = validation.error || "開口資料不合法。";
      render();
      return;
    }

    const changed = (
      nextOpening.kind !== opening.kind ||
      nextOpening.offset !== opening.offset ||
      nextOpening.width !== opening.width ||
      nextOpening.swing !== opening.swing ||
      (nextOpening.sillHeight ?? null) !== (opening.sillHeight ?? null) ||
      (nextOpening.height ?? null) !== (opening.height ?? null)
    );
    if (!changed) {
      uiState.error = "";
      render();
      return;
    }

    pushHistory("更新開口屬性");
    Object.assign(opening, nextOpening, { updatedAt: new Date().toISOString() });
    uiState.error = "";
    uiState.message = validation.warning || "開口資料已更新。";
    syncBridge();
    render();
  }

  function deleteSelectedOpening() {
    if (!uiState.selectedOpeningId) {
      return;
    }
    pushHistory("刪除開口");
    project.openings = project.openings.filter((opening) => opening.id !== uiState.selectedOpeningId);
    uiState.selectedOpeningId = null;
    uiState.error = "";
    uiState.message = "已刪除開口。";
    syncBridge();
    render();
  }

  function previewSelectedOpeningDimensionFromField(input) {
    const opening = getSelectedOpening();
    if (!opening) {
      return;
    }

    const edge = getEdgeById(opening.edgeId);
    if (!edge) {
      uiState.error = "找不到這個門窗依附的牆線，請重新選取牆段。";
      renderCanvasHelper();
      return;
    }

    const nextOpening = { ...opening };
    const field = input.dataset.field;
    if (field === "selected-opening-offset") {
      nextOpening.offset = readCoordinateInput(input, opening.offset);
    }
    if (field === "selected-opening-width") {
      nextOpening.width = readCoordinateInput(input, opening.width);
    }
    if (field === "selected-opening-sill-height") {
      nextOpening.sillHeight = readOptionalNumber(input.value);
    }
    if (field === "selected-opening-height") {
      nextOpening.height = readOptionalNumber(input.value);
    }

    const validation = validateOpening(nextOpening, edge);
    if (!validation.valid) {
      uiState.error = validation.error || "開口資料不合法。";
      renderCanvasHelper();
      return;
    }

    Object.assign(opening, nextOpening, { updatedAt: new Date().toISOString() });
    uiState.error = "";
    uiState.message = validation.warning || "門窗 / 開口尺寸已同步到候選草稿。";
    syncBridge();
    renderOpenings();
    applyLayerVisibility();
    renderCanvasHelper();
    renderStatusLabels();
    syncStaticControls();
  }

  function createZone(point) {
    const now = new Date().toISOString();
    const type = normalizeZoneType(uiState.currentZoneType);
    const defaultName = ZONE_TYPE_LABELS[type] || ZONE_TYPE_LABELS.other;
    const boundaryDraft = createZoneBoundaryDraft([]);
    return {
      id: createId("zone"),
      name: (uiState.currentZoneName || defaultName).trim() || defaultName,
      type,
      labelPosition: roundPoint(point),
      boundaryEdgeIds: [],
      boundaryWallIds: [],
      polygon: [],
      area: null,
      boundaryStatus: boundaryDraft.status,
      boundaryIssues: boundaryDraft.issues,
      createdAt: now,
      updatedAt: now
    };
  }

  function createFurnitureItem(point) {
    const now = new Date().toISOString();
    const template = getFurnitureTemplate(uiState.currentFurnitureTemplateId);
    return {
      id: createId("furniture"),
      type: template.type,
      category: template.category,
      name: template.name,
      layer: "furniture",
      x: point.x,
      y: point.y,
      widthMm: template.widthMm,
      depthMm: template.depthMm,
      heightMm: template.heightMm,
      rotation: 0,
      status: "candidate",
      materialTags: [...template.materialTags],
      note: "",
      budgetCandidate: true,
      productionReady: false,
      notFormalEstimate: true,
      createdAt: now,
      updatedAt: now
    };
  }

  function selectFurniture(furnitureId, message) {
    const item = project.furniture.find((entry) => entry.id === furnitureId);
    if (!item) {
      return;
    }
    uiState.selectedFurnitureId = item.id;
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.mode = "select";
    uiState.inspectorTab = "properties";
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = message || `已選取「${item.name}」。可在右側改尺寸、材料、備註，也可拖曳、調尺寸或刪除。`;
    syncBridge();
    render();
  }

  function updateSelectedFurnitureFromField(input) {
    const item = getSelectedFurniture();
    if (!item) {
      return;
    }

    pushHistory("更新家具 / 櫃體屬性");
    const field = input.dataset.field;
    if (field === "selected-furniture-name") {
      item.name = input.value.trim() || getFurnitureTemplate(item.type).name;
    }
    if (field === "selected-furniture-width") {
      item.widthMm = normalizeFurnitureDimension(input.value, item.widthMm, MIN_FURNITURE_WIDTH_MM);
    }
    if (field === "selected-furniture-depth") {
      item.depthMm = normalizeFurnitureDimension(input.value, item.depthMm, MIN_FURNITURE_DEPTH_MM);
    }
    if (field === "selected-furniture-height") {
      item.heightMm = normalizeFurnitureDimension(input.value, item.heightMm, 0);
    }
    if (field === "selected-furniture-rotation") {
      item.rotation = normalizeFurnitureRotation(input.value, item.rotation);
    }
    if (field === "selected-furniture-material") {
      item.materialTags = [normalizeFurnitureMaterialTag(input.value)];
    }
    if (field === "selected-furniture-note") {
      item.note = input.value;
    }

    item.budgetCandidate = true;
    item.productionReady = false;
    item.notFormalEstimate = true;
    item.updatedAt = new Date().toISOString();
    uiState.error = "";
    uiState.message = "家具 / 櫃體候選資料已更新；仍不是正式估價。";
    syncBridge();
    render();
  }

  function previewSelectedFurnitureDimensionFromField(input) {
    const item = getSelectedFurniture();
    if (!item) {
      return;
    }

    const field = input.dataset.field;
    if (field === "selected-furniture-width") {
      item.widthMm = normalizeFurnitureDimension(input.value, item.widthMm, MIN_FURNITURE_WIDTH_MM);
    }
    if (field === "selected-furniture-depth") {
      item.depthMm = normalizeFurnitureDimension(input.value, item.depthMm, MIN_FURNITURE_DEPTH_MM);
    }
    if (field === "selected-furniture-height") {
      item.heightMm = normalizeFurnitureDimension(input.value, item.heightMm, 0);
    }
    if (field === "selected-furniture-rotation") {
      item.rotation = normalizeFurnitureRotation(input.value, item.rotation);
    }

    item.budgetCandidate = true;
    item.productionReady = false;
    item.notFormalEstimate = true;
    item.updatedAt = new Date().toISOString();
    uiState.error = "";
    uiState.message = "家具 / 櫃體尺寸已同步到候選草稿；仍不是正式估價。";
    syncBridge();
    renderFurnitureCanvasPreview();
  }

  function renderFurnitureCanvasPreview() {
    renderZones();
    renderFurniture();
    applyLayerVisibility();
    renderStatusLabels();
    syncStaticControls();
  }

  function applySelectedFurnitureMaterial(materialTag) {
    const item = getSelectedFurniture();
    if (!item) {
      uiState.error = "請先選取家具或櫃體，再套用材料。";
      render();
      return;
    }
    pushHistory("套用家具 / 櫃體材料");
    item.materialTags = [normalizeFurnitureMaterialTag(materialTag || uiState.currentFurnitureMaterialTag)];
    item.updatedAt = new Date().toISOString();
    uiState.error = "";
    uiState.message = `已將「${getFurnitureMaterialLabel(item.materialTags[0])}」套用到「${item.name}」。仍為候選草稿。`;
    syncBridge();
    render();
  }

  function deleteSelectedFurniture() {
    if (!uiState.selectedFurnitureId) {
      uiState.error = "請先選取家具或櫃體，再刪除。";
      render();
      return;
    }
    pushHistory("刪除家具 / 櫃體");
    project.furniture = project.furniture.filter((item) => item.id !== uiState.selectedFurnitureId);
    uiState.selectedFurnitureId = null;
    uiState.error = "";
    uiState.message = "已刪除家具 / 櫃體候選物件。";
    syncBridge();
    render();
  }

  function updateCurrentZoneType(value) {
    const previousType = normalizeZoneType(uiState.currentZoneType);
    const previousDefaultName = ZONE_TYPE_LABELS[previousType];
    const nextType = normalizeZoneType(value);
    const currentName = (uiState.currentZoneName || "").trim();
    uiState.currentZoneType = nextType;
    if (!currentName || currentName === previousDefaultName) {
      uiState.currentZoneName = ZONE_TYPE_LABELS[nextType];
    }
    uiState.message = `下一個空間標籤：${ZONE_TYPE_LABELS[nextType]}。`;
    uiState.error = "";
  }

  function updateSelectedZoneFromField(input) {
    const zone = getSelectedZone();
    if (!zone) {
      return;
    }
    ensureZoneBoundaryFields(zone);

    const field = input.dataset.field;
    const nextZone = {
      ...zone,
      labelPosition: { ...zone.labelPosition },
      boundaryEdgeIds: [...zone.boundaryEdgeIds],
      boundaryWallIds: [...zone.boundaryWallIds],
      polygon: zone.polygon.map((point) => ({ ...point })),
      boundaryStatus: zone.boundaryStatus,
      boundaryIssues: [...zone.boundaryIssues]
    };

    if (field === "selected-zone-name") {
      nextZone.name = input.value.trim() || getZoneTypeLabel(nextZone.type);
    }
    if (field === "selected-zone-type") {
      const previousDefaultName = getZoneTypeLabel(nextZone.type);
      nextZone.type = normalizeZoneType(input.value);
      if (!nextZone.name || nextZone.name === previousDefaultName) {
        nextZone.name = getZoneTypeLabel(nextZone.type);
      }
    }
    if (field === "selected-zone-x") {
      nextZone.labelPosition.x = Math.max(0, readCoordinateInput(input, zone.labelPosition.x));
    }
    if (field === "selected-zone-y") {
      nextZone.labelPosition.y = Math.max(0, readCoordinateInput(input, zone.labelPosition.y));
    }

    pushHistory("更新空間標籤");
    Object.assign(zone, nextZone, { updatedAt: new Date().toISOString() });
    uiState.error = "";
    uiState.message = "空間標籤資料已更新。";
    syncBridge();
    render();
  }

  function deleteSelectedZone() {
    if (!uiState.selectedZoneId) {
      return;
    }
    pushHistory("刪除空間標籤");
    project.zones = project.zones.filter((zone) => zone.id !== uiState.selectedZoneId);
    if (uiState.zoneBoundaryState?.activeZoneId === uiState.selectedZoneId) {
      clearZoneBoundaryDraft();
    }
    uiState.selectedZoneId = null;
    uiState.error = "";
    uiState.message = "已刪除空間標籤。";
    syncBridge();
    render();
  }

  function toggleBoundaryEdgeForWall(wallId) {
    const zone = getSelectedZone();
    const boundaryState = getZoneBoundaryState();
    if (!zone || uiState.mode !== "edit-zone-boundary" || boundaryState.activeZoneId !== zone.id) {
      uiState.error = "請先選取空間標籤，並進入編輯邊界模式。";
      render();
      return;
    }

    const edge = getEdgeForWall(wallId);
    if (!edge) {
      uiState.error = "找不到此牆段對應的牆段連線。";
      render();
      return;
    }

    const nextEdgeIds = boundaryState.selectedBoundaryEdgeIds.includes(edge.id)
      ? boundaryState.selectedBoundaryEdgeIds.filter((edgeId) => edgeId !== edge.id)
      : [...boundaryState.selectedBoundaryEdgeIds, edge.id];
    const draft = createZoneBoundaryDraft(nextEdgeIds);
    uiState.zoneBoundaryState = {
      activeZoneId: zone.id,
      selectedBoundaryEdgeIds: nextEdgeIds,
      previewPolygon: draft.polygon,
      issues: draft.issues
    };
    uiState.selectedEdgeId = edge.id;
    uiState.selectedWallId = wallId;
    uiState.selectedOpeningId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.error = "";
    uiState.message = draft.status === "closed"
      ? "邊界已可能封閉，可按「套用邊界」。"
      : "目前邊界尚未形成封閉空間。";
    render();
  }

  function applyZoneBoundary() {
    const zone = getSelectedZone();
    const boundaryState = getZoneBoundaryState();
    if (!zone || boundaryState.activeZoneId !== zone.id) {
      uiState.error = "請先進入此空間的邊界編輯模式。";
      render();
      return;
    }

    const draft = createZoneBoundaryDraft(boundaryState.selectedBoundaryEdgeIds);
    pushHistory("套用空間邊界");
    applyBoundaryDraftToZone(zone, draft, true);
    uiState.mode = "select";
    clearZoneBoundaryDraft();
    uiState.selectedZoneId = zone.id;
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.error = "";
    uiState.message = draft.status === "closed"
      ? "已套用空間邊界，邊界點使用 mm 座標保存。"
      : "已套用空間邊界，但目前邊界尚未形成封閉空間。";
    syncBridge();
    render();
  }

  function clearSelectedZoneBoundary() {
    const zone = getSelectedZone();
    if (!zone) {
      uiState.error = "請先選取一個空間標籤。";
      render();
      return;
    }

    const draft = createZoneBoundaryDraft([]);
    pushHistory("清除空間邊界");
    applyBoundaryDraftToZone(zone, draft, true);
    clearZoneBoundaryDraft();
    uiState.mode = "select";
    uiState.selectedZoneId = zone.id;
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.error = "";
    uiState.message = "已清除空間邊界。";
    syncBridge();
    render();
  }

  function syncZoneBoundaryMetadata() {
    project.zones.forEach((zone) => {
      ensureZoneBoundaryFields(zone);
      const draft = createZoneBoundaryDraft(zone.boundaryEdgeIds || []);
      applyBoundaryDraftToZone(zone, draft, false);
    });
  }

  function ensureZoneBoundaryFields(zone) {
    if (!Array.isArray(zone.boundaryEdgeIds)) {
      zone.boundaryEdgeIds = [];
    }
    if (!Array.isArray(zone.boundaryWallIds)) {
      zone.boundaryWallIds = [];
    }
    if (!Array.isArray(zone.polygon)) {
      zone.polygon = [];
    }
    if (!Array.isArray(zone.boundaryIssues)) {
      zone.boundaryIssues = [];
    }
    if (!zone.boundaryStatus) {
      zone.boundaryStatus = zone.boundaryEdgeIds.length ? "open" : "none";
    }
    if (!Object.prototype.hasOwnProperty.call(zone, "area")) {
      zone.area = null;
    }
  }

  function applyBoundaryDraftToZone(zone, draft, updateTimestamp) {
    zone.boundaryEdgeIds = [...draft.edgeIds];
    zone.boundaryWallIds = [...draft.boundaryWallIds];
    zone.polygon = draft.polygon.map((point) => ({ ...point }));
    zone.boundaryStatus = draft.status;
    zone.boundaryIssues = draft.issues.map((issue) => ({ ...issue }));
    zone.area = null;
    if (updateTimestamp) {
      zone.updatedAt = new Date().toISOString();
    }
  }

  function createZoneBoundaryDraft(edgeIds) {
    const normalizedEdgeIds = uniqueIdsPreserveOrder(edgeIds || []);
    const edgeRecords = normalizedEdgeIds.map((edgeId) => ({
      edgeId,
      edge: findNodeGraphEdge(edgeId)
    }));
    const missingEdgeIds = edgeRecords.filter((record) => !record.edge).map((record) => record.edgeId);
    const validEdges = edgeRecords.filter((record) => record.edge).map((record) => record.edge);
    const polygonResult = buildBoundaryPolygonFromOrderedEdges(validEdges);
    const boundaryWallIds = uniqueIds(validEdges.map((edge) => edge.sourceWallId));
    const issues = [];

    if (normalizedEdgeIds.length === 0) {
      issues.push(createZoneBoundaryIssue("zone-boundary-empty", normalizedEdgeIds, "此空間尚未指定邊界牆段。"));
    }
    if (normalizedEdgeIds.length > 0 && normalizedEdgeIds.length < ZONE_BOUNDARY_MIN_EDGES) {
      issues.push(createZoneBoundaryIssue("zone-boundary-too-few-edges", normalizedEdgeIds, "邊界牆段少於 3 段，無法形成空間邊界。"));
    }
    missingEdgeIds.forEach((edgeId) => {
      issues.push(createZoneBoundaryIssue("zone-boundary-edge-missing", [edgeId], `找不到邊界牆段：${edgeId}`));
    });
    if (normalizedEdgeIds.length >= ZONE_BOUNDARY_MIN_EDGES && missingEdgeIds.length === 0 && !polygonResult.closed) {
      issues.push(createZoneBoundaryIssue("zone-boundary-open", normalizedEdgeIds, "目前邊界尚未形成封閉空間。"));
    }

    const status = getBoundaryStatusFromIssues(normalizedEdgeIds, issues, polygonResult.closed);
    return {
      edgeIds: normalizedEdgeIds,
      edges: validEdges,
      boundaryWallIds,
      polygon: polygonResult.closed ? polygonResult.polygon : [],
      issues,
      status
    };
  }

  function buildBoundaryPolygonFromOrderedEdges(edges) {
    if (!edges.length) {
      return { closed: false, polygon: [] };
    }

    const points = [roundPoint(edges[0].from), roundPoint(edges[0].to)];
    for (let index = 1; index < edges.length; index += 1) {
      const edge = edges[index];
      const lastPoint = points[points.length - 1];
      if (isSamePoint(lastPoint, edge.from)) {
        points.push(roundPoint(edge.to));
        continue;
      }
      if (isSamePoint(lastPoint, edge.to)) {
        points.push(roundPoint(edge.from));
        continue;
      }
      return { closed: false, polygon: [] };
    }

    const closed = points.length >= 4 && isSamePoint(points[0], points[points.length - 1]);
    return {
      closed,
      polygon: closed ? points.slice(0, -1).map(roundPoint) : []
    };
  }

  function createZoneBoundaryIssue(type, edgeIds, message) {
    return {
      id: `${type}:${uniqueIdsPreserveOrder(edgeIds).join("|") || "none"}`,
      type,
      severity: "warning",
      message,
      edgeIds: uniqueIdsPreserveOrder(edgeIds),
      createdAt: new Date().toISOString()
    };
  }

  function getBoundaryStatusFromIssues(edgeIds, issues, isClosed) {
    if (!edgeIds.length) {
      return "none";
    }
    if (hasBoundaryIssueType(issues, "zone-boundary-edge-missing")) {
      return "invalid";
    }
    if (hasBoundaryIssueType(issues, "zone-boundary-too-few-edges") || hasBoundaryIssueType(issues, "zone-boundary-open")) {
      return "open";
    }
    return isClosed ? "closed" : "open";
  }

  function getZoneBoundaryState() {
    if (!uiState.zoneBoundaryState) {
      uiState.zoneBoundaryState = createInitialZoneBoundaryState();
    }
    return uiState.zoneBoundaryState;
  }

  function findNodeGraphEdge(edgeId) {
    return project.nodeGraph?.edges?.find((edge) => edge.id === edgeId) || null;
  }

  function hasBoundaryIssueType(issues, type) {
    return (issues || []).some((issue) => issue.type === type);
  }

  function getZoneBoundaryStatus(zone, draft) {
    if (uiState.mode === "edit-zone-boundary" && getZoneBoundaryState().activeZoneId === zone.id) {
      return "editing";
    }
    return zone.boundaryStatus || draft.status || "none";
  }

  function getZoneBoundaryStatusLabel(status) {
    if (status === "editing") {
      return "編輯中";
    }
    if (status === "closed") {
      return "已指定且可能封閉";
    }
    if (status === "open") {
      return "已指定但未封閉";
    }
    if (status === "invalid") {
      return "邊界資料有問題";
    }
    return "尚未指定";
  }

  function getZoneBoundaryIssueLabel(type) {
    if (type === "zone-boundary-empty") {
      return "尚未指定";
    }
    if (type === "zone-boundary-open") {
      return "未封閉";
    }
    if (type === "zone-boundary-too-few-edges") {
      return "邊數不足";
    }
    if (type === "zone-boundary-edge-missing") {
      return "邊界遺失";
    }
    return "邊界問題";
  }

  function isWallInActiveBoundary(wallId) {
    const edge = findNodeGraphEdge(createEdgeId({ id: wallId }));
    const edgeId = edge?.id || createEdgeId({ id: wallId });
    const boundaryState = getZoneBoundaryState();
    if (uiState.mode === "edit-zone-boundary" && boundaryState.selectedBoundaryEdgeIds.includes(edgeId)) {
      return true;
    }
    const zone = getSelectedZone();
    if (!zone || uiState.mode === "edit-zone-boundary") {
      return false;
    }
    return (zone.boundaryEdgeIds || []).includes(edgeId);
  }

  function getEndpointRecords() {
    return project.walls.flatMap((wall) => ([
      {
        id: `${wall.id}:from`,
        wallId: wall.id,
        endpoint: "from",
        point: roundPoint(wall.from)
      },
      {
        id: `${wall.id}:to`,
        wallId: wall.id,
        endpoint: "to",
        point: roundPoint(wall.to)
      }
    ]));
  }

  function buildEndpointNodes(endpointRecords, builtAt) {
    const map = new Map();
    endpointRecords.forEach((record) => {
      const key = pointKey(record.point);
      const node = map.get(key) || {
        id: createGraphNodeId("endpoint", record.point),
        x: record.point.x,
        y: record.point.y,
        wallIds: [],
        kind: "endpoint",
        createdAt: builtAt
      };
      node.wallIds = uniqueIds([...node.wallIds, record.wallId]);
      map.set(key, node);
    });
    return [...map.values()];
  }

  function createIssue(details) {
    const pointPart = (details.points || []).map((point) => pointKey(point)).join("|");
    const wallPart = uniqueIds(details.wallIds || []).join("|");
    return {
      id: `${details.type}:${wallPart}:${pointPart}`,
      type: details.type,
      severity: "warning",
      message: details.message,
      wallIds: uniqueIds(details.wallIds || []),
      nodeIds: details.nodeIds || [],
      endpointRefs: details.endpointRefs || [],
      points: (details.points || []).map(roundPoint),
      distance: details.distance ?? null,
      overlapLength: details.overlapLength ?? null,
      createdAt: project.wallGraph?.lastBuiltAt || new Date().toISOString()
    };
  }

  function selectIssue(issueId) {
    if (!issueId) {
      return;
    }
    const issue = project.wallGraph?.issues?.find((item) => item.id === issueId);
    if (!issue) {
      uiState.selectedIssueId = null;
      render();
      return;
    }
    uiState.selectedIssueId = issue.id;
    uiState.selectedWallId = issue.wallIds[0] || null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedNodeId = issue.type === "wall-intersection" && issue.points[0]
      ? createGraphNodeId("intersection", issue.points[0])
      : null;
    uiState.mode = "select";
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = getIssueTypeLabel(issue.type);
    render();
  }

  function getSelectedIssue() {
    if (!uiState.selectedIssueId) {
      return null;
    }
    return project.wallGraph?.issues?.find((issue) => issue.id === uiState.selectedIssueId) || null;
  }

  function isWallInSelectedIssue(wallId) {
    const issue = getSelectedIssue();
    return Boolean(issue?.wallIds?.includes(wallId));
  }

  function cleanWallEndpoints() {
    if (!project.walls.length) {
      uiState.error = "";
      uiState.message = "目前沒有牆段可整理。";
      render();
      return;
    }

    const endpointRecords = getEndpointRecords();
    const parent = endpointRecords.map((_, index) => index);
    const find = (index) => {
      while (parent[index] !== index) {
        parent[index] = parent[parent[index]];
        index = parent[index];
      }
      return index;
    };
    const union = (a, b) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) {
        parent[rootB] = rootA;
      }
    };

    for (let i = 0; i < endpointRecords.length; i += 1) {
      for (let j = i + 1; j < endpointRecords.length; j += 1) {
        if (endpointRecords[i].wallId === endpointRecords[j].wallId) {
          continue;
        }
        const distance = getDistance(endpointRecords[i].point, endpointRecords[j].point);
        if (distance > GEOMETRY_EPSILON && distance <= CLEANUP_MERGE_DISTANCE) {
          union(i, j);
        }
      }
    }

    const groups = new Map();
    endpointRecords.forEach((record, index) => {
      const root = find(index);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root).push(record);
    });

    let movedCount = 0;
    let historyRecorded = false;
    groups.forEach((group) => {
      if (group.length < 2) {
        return;
      }
      const target = roundPoint({
        x: group.reduce((sum, record) => sum + record.point.x, 0) / group.length,
        y: group.reduce((sum, record) => sum + record.point.y, 0) / group.length
      });
      group.forEach((record) => {
        const wall = project.walls.find((item) => item.id === record.wallId);
        if (!wall) {
          return;
        }
        const otherPoint = record.endpoint === "from" ? wall.to : wall.from;
        if (getDistance(target, otherPoint) <= GEOMETRY_EPSILON) {
          return;
        }
        if (!isSamePoint(wall[record.endpoint], target)) {
          if (!historyRecorded) {
            pushHistory("自動接牆");
            historyRecorded = true;
          }
          wall[record.endpoint] = { ...target };
          wall.updatedAt = new Date().toISOString();
          movedCount += 1;
        }
      });
    });

    rebuildWallGraph();
    uiState.selectedIssueId = null;
    uiState.error = "";
    uiState.message = movedCount > 0
      ? `已接好 ${movedCount} 個牆端點。`
      : "沒有找到 30mm 內需要合併的牆端點。";
    syncBridge();
    render();
  }

  function canDrawWalls() {
    return Boolean(project.underlay && project.importSource?.previewSupported && hasValidScale());
  }

  function canPlaceZones() {
    return Boolean(project.underlay && project.importSource?.previewSupported && hasValidScale());
  }

  function canPlaceFurniture() {
    return Boolean(project.underlay && project.importSource?.previewSupported && hasValidScale());
  }

  function hasValidScale() {
    return project.scale.calibrated && Number.isFinite(project.scale.pxPerMm) && project.scale.pxPerMm > 0;
  }

  function getSelectedWall() {
    return project.walls.find((wall) => wall.id === uiState.selectedWallId) || null;
  }

  function getSelectedOpening() {
    return project.openings.find((opening) => opening.id === uiState.selectedOpeningId) || null;
  }

  function getSelectedZone() {
    return project.zones.find((zone) => zone.id === uiState.selectedZoneId) || null;
  }

  function getSelectedFurniture() {
    return project.furniture.find((item) => item.id === uiState.selectedFurnitureId) || null;
  }

  function getWallDisplayName(wallId) {
    const index = project.walls.findIndex((wall) => wall.id === wallId);
    return index >= 0 ? `牆體 ${index + 1}` : "牆體";
  }

  function getOpeningDisplayName(openingId) {
    const index = project.openings.findIndex((opening) => opening.id === openingId);
    return index >= 0 ? `門窗 / 開口 ${index + 1}` : "門窗 / 開口";
  }

  function getZoneDisplayName(zoneId) {
    const index = project.zones.findIndex((zone) => zone.id === zoneId);
    return index >= 0 ? `空間 ${index + 1}` : "空間";
  }

  function getFurnitureDisplayName(furnitureId) {
    const index = project.furniture.findIndex((item) => item.id === furnitureId);
    return index >= 0 ? `家具 / 櫃體 ${index + 1}` : "家具 / 櫃體";
  }

  function cloneWall(wall) {
    return {
      ...wall,
      from: { ...wall.from },
      to: { ...wall.to }
    };
  }

  function getEdgeById(edgeId) {
    rebuildNodeGraph();
    return project.nodeGraph.edges.find((edge) => edge.id === edgeId) || null;
  }

  function getEdgeForWall(wallId) {
    rebuildNodeGraph();
    return project.nodeGraph.edges.find((edge) => edge.id === createEdgeId({ id: wallId })) || null;
  }

  function getSelectedEdgeForOpening() {
    if (uiState.selectedEdgeId) {
      const edge = getEdgeById(uiState.selectedEdgeId);
      if (edge) {
        return edge;
      }
    }
    if (uiState.selectedWallId) {
      return getEdgeForWall(uiState.selectedWallId);
    }
    if (uiState.selectedOpeningId) {
      const opening = getSelectedOpening();
      if (opening) {
        return getEdgeById(opening.edgeId);
      }
    }
    return null;
  }

  function getWallIdFromEdgeId(edgeId) {
    const wallId = String(edgeId || "").replace(/^edge-/, "");
    return project.walls.some((wall) => wall.id === wallId) ? wallId : null;
  }

  function findEndpointSnap(pointMm) {
    if (!hasValidScale()) {
      return null;
    }

    const pointPx = mmToPxPoint(pointMm);
    let nearest = null;

    project.walls.forEach((wall) => {
      [wall.from, wall.to].forEach((endpoint) => {
        const endpointPx = mmToPxPoint(endpoint);
        const distancePx = getDistance(pointPx, endpointPx);
        if (distancePx <= ENDPOINT_SNAP_DISTANCE_PX && (!nearest || distancePx < nearest.distancePx)) {
          nearest = {
            mm: { ...endpoint },
            distancePx
          };
        }
      });
    });

    return nearest;
  }

  function applyOrthogonalSnap(start, point) {
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    if (dx === 0 && dy === 0) {
      return point;
    }

    const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
    const folded = angle > 90 ? 180 - angle : angle;

    if (folded <= ORTHOGONAL_TOLERANCE_DEG) {
      return { x: point.x, y: start.y };
    }
    if (Math.abs(folded - 90) <= ORTHOGONAL_TOLERANCE_DEG) {
      return { x: start.x, y: point.y };
    }
    return point;
  }

  function getSegmentIntersection(firstWall, secondWall) {
    const p = firstWall.from;
    const r = {
      x: firstWall.to.x - firstWall.from.x,
      y: firstWall.to.y - firstWall.from.y
    };
    const q = secondWall.from;
    const s = {
      x: secondWall.to.x - secondWall.from.x,
      y: secondWall.to.y - secondWall.from.y
    };
    const denominator = cross(r, s);
    if (Math.abs(denominator) <= GEOMETRY_EPSILON) {
      return null;
    }
    const qMinusP = {
      x: q.x - p.x,
      y: q.y - p.y
    };
    const t = cross(qMinusP, s) / denominator;
    const u = cross(qMinusP, r) / denominator;
    if (t < -PARAMETER_EPSILON || t > 1 + PARAMETER_EPSILON || u < -PARAMETER_EPSILON || u > 1 + PARAMETER_EPSILON) {
      return null;
    }
    return roundPoint({
      x: p.x + t * r.x,
      y: p.y + t * r.y
    });
  }

  function detectAxisAlignedOverlap(firstWall, secondWall) {
    if (isHorizontalWall(firstWall) && isHorizontalWall(secondWall) && Math.abs(firstWall.from.y - secondWall.from.y) <= GEOMETRY_EPSILON) {
      const first = sortedPair(firstWall.from.x, firstWall.to.x);
      const second = sortedPair(secondWall.from.x, secondWall.to.x);
      const start = Math.max(first[0], second[0]);
      const end = Math.min(first[1], second[1]);
      if (end - start > GEOMETRY_EPSILON) {
        return {
          length: end - start,
          points: [
            { x: Math.round(start), y: Math.round((firstWall.from.y + secondWall.from.y) / 2) },
            { x: Math.round(end), y: Math.round((firstWall.from.y + secondWall.from.y) / 2) }
          ]
        };
      }
    }

    if (isVerticalWall(firstWall) && isVerticalWall(secondWall) && Math.abs(firstWall.from.x - secondWall.from.x) <= GEOMETRY_EPSILON) {
      const first = sortedPair(firstWall.from.y, firstWall.to.y);
      const second = sortedPair(secondWall.from.y, secondWall.to.y);
      const start = Math.max(first[0], second[0]);
      const end = Math.min(first[1], second[1]);
      if (end - start > GEOMETRY_EPSILON) {
        return {
          length: end - start,
          points: [
            { x: Math.round((firstWall.from.x + secondWall.from.x) / 2), y: Math.round(start) },
            { x: Math.round((firstWall.from.x + secondWall.from.x) / 2), y: Math.round(end) }
          ]
        };
      }
    }

    return null;
  }

  function isHorizontalWall(wall) {
    return Math.abs(wall.from.y - wall.to.y) <= GEOMETRY_EPSILON;
  }

  function isVerticalWall(wall) {
    return Math.abs(wall.from.x - wall.to.x) <= GEOMETRY_EPSILON;
  }

  function isPointAtWallEndpoint(wall, point) {
    return isSamePoint(wall.from, point) || isSamePoint(wall.to, point);
  }

  function isPointOnSegment(wall, point) {
    const segmentLength = getDistance(wall.from, wall.to);
    if (segmentLength <= GEOMETRY_EPSILON) {
      return false;
    }
    const distanceSum = getDistance(wall.from, point) + getDistance(point, wall.to);
    return Math.abs(distanceSum - segmentLength) <= GEOMETRY_EPSILON;
  }

  function isSamePoint(first, second) {
    return Math.abs(first.x - second.x) <= GEOMETRY_EPSILON && Math.abs(first.y - second.y) <= GEOMETRY_EPSILON;
  }

  function getMidpoint(first, second) {
    return roundPoint({
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2
    });
  }

  function cross(first, second) {
    return first.x * second.y - first.y * second.x;
  }

  function sortedPair(first, second) {
    return first <= second ? [first, second] : [second, first];
  }

  function pointKey(point) {
    const rounded = roundPoint(point);
    return `${rounded.x},${rounded.y}`;
  }

  function pointFromKey(key) {
    const [x, y] = String(key).split(",").map((value) => Number.parseFloat(value));
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0
    };
  }

  function createGraphNodeId(kind, point) {
    return `node-${kind}-${pointKey(point)}`;
  }

  function createEdgeId(wall) {
    return `edge-${wall.id}`;
  }

  function uniqueIds(ids) {
    return [...new Set(ids.filter(Boolean))].sort();
  }

  function uniqueIdsPreserveOrder(ids) {
    const seen = new Set();
    return (ids || []).filter((id) => {
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }

  function getIssueTypeLabel(type) {
    if (type === "nearby-endpoints") {
      return "端點接近未對齊";
    }
    if (type === "wall-intersection") {
      return "牆段交會";
    }
    if (type === "overlapping-walls") {
      return "牆段重疊";
    }
    if (type === "wall-too-short") {
      return "牆段過短";
    }
    if (type === "zero-length-wall") {
      return "零長度牆";
    }
    return "牆體檢查";
  }

  function getOpeningGeometry(opening, edge) {
    if (!edge || !Number.isFinite(edge.length) || edge.length <= 0) {
      return null;
    }
    const startDistance = Number(opening.offset);
    const endDistance = startDistance + Number(opening.width);
    if (!Number.isFinite(startDistance) || !Number.isFinite(endDistance) || startDistance < 0 || endDistance > edge.length + GEOMETRY_EPSILON) {
      return null;
    }

    const vector = {
      x: edge.to.x - edge.from.x,
      y: edge.to.y - edge.from.y
    };
    const unit = {
      x: vector.x / edge.length,
      y: vector.y / edge.length
    };
    const normal = {
      x: -unit.y,
      y: unit.x
    };
    const startMm = {
      x: edge.from.x + unit.x * startDistance,
      y: edge.from.y + unit.y * startDistance
    };
    const endMm = {
      x: edge.from.x + unit.x * endDistance,
      y: edge.from.y + unit.y * endDistance
    };
    return {
      startMm: roundPoint(startMm),
      endMm: roundPoint(endMm),
      startPx: mmToPxPoint(startMm),
      endPx: mmToPxPoint(endMm),
      unit,
      normal
    };
  }

  function validateOpening(opening, edge) {
    const width = Number(opening.width);
    const offset = Number(opening.offset);
    if (!edge) {
      return { valid: false, error: "找不到這個門窗依附的牆線，請重新選取牆體。" };
    }
    if (!Number.isFinite(offset) || offset < 0) {
      return { valid: false, error: "牆上位置必須大於或等於 0。" };
    }
    if (!Number.isFinite(width) || width <= 0) {
      return { valid: false, error: "開口寬度必須大於 0。" };
    }
    if (width < MIN_OPENING_WIDTH) {
      return { valid: false, error: `開口寬度不可小於 ${MIN_OPENING_WIDTH}mm。` };
    }
    if (offset + width > edge.length + GEOMETRY_EPSILON) {
      return { valid: false, error: "開口位置加寬度不可超過牆段長度。" };
    }

    const range = OPENING_WIDTH_RANGES[normalizeOpeningKind(opening.kind)];
    if (range && (width < range.min || width > range.max)) {
      return {
        valid: true,
        warning: `${getOpeningKindLabel(opening.kind)}寬度建議為 ${range.min}mm 到 ${range.max}mm，請確認是否合適。`
      };
    }
    if (edge.length - width < 200) {
      return {
        valid: true,
        warning: "開口接近牆端，請確認是否合適。"
      };
    }
    return { valid: true, warning: "" };
  }

  function normalizeOpeningKind(value) {
    if (value === "window" || value === "opening") {
      return value;
    }
    return "door";
  }

  function normalizeOpeningSwing(value) {
    if (value === "right" || value === "sliding" || value === "none") {
      return value;
    }
    return "left";
  }

  function normalizeOpeningWidthInput(value, fallback) {
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.max(MIN_OPENING_WIDTH, numeric);
  }

  function normalizeZoneType(value) {
    return Object.prototype.hasOwnProperty.call(ZONE_TYPE_LABELS, value) ? value : "other";
  }

  function getZoneTypeLabel(value) {
    return ZONE_TYPE_LABELS[normalizeZoneType(value)];
  }

  function readPositiveNumber(value, fallback) {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
  }

  function readOptionalNumber(value) {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    const numeric = Number.parseInt(value, 10);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  }

  function getDefaultOpeningHeight(kind) {
    if (kind === "door") {
      return 2100;
    }
    if (kind === "window") {
      return 1200;
    }
    return null;
  }

  function getWallStrokeWidth(wall) {
    if (!hasValidScale()) {
      return 2;
    }
    return Math.max(2, wall.thickness * project.scale.pxPerMm);
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top)
    };
  }

  function pxToMmPoint(point) {
    return {
      x: point.x / project.scale.pxPerMm,
      y: point.y / project.scale.pxPerMm
    };
  }

  function mmToPxPoint(point) {
    return {
      x: point.x * project.scale.pxPerMm,
      y: point.y * project.scale.pxPerMm
    };
  }

  function roundPoint(point) {
    return {
      x: Math.round(point.x),
      y: Math.round(point.y)
    };
  }

  function getDistance(from, to) {
    return Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
  }

  function setSvgViewport(svg) {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
  }

  function getCalibrationPointsForRender() {
    if (uiState.calibrationPoints.length > 0) {
      return uiState.calibrationPoints;
    }
    if (project.underlay?.calibratedBy) {
      return [
        project.underlay.calibratedBy.from,
        project.underlay.calibratedBy.to
      ];
    }
    return [];
  }

  function getCalibrationLineLabel(points) {
    const [from, to] = points;
    if (!from || !to) {
      return "";
    }
    const distance = getDistance(from, to);
    if (project.scale.calibrated && project.underlay?.calibratedBy) {
      return `${formatNumber(project.underlay.calibratedBy.knownLength)} mm = ${formatNumber(distance)} px`;
    }
    return `${formatNumber(distance)} px`;
  }

  function getScaleReadout() {
    if (!project.scale.calibrated || project.scale.pxPerMm === null) {
      return "待比例確認";
    }
    const pixelsPerThousandMm = project.scale.pxPerMm * 1000;
    return `1 mm = ${formatNumber(project.scale.pxPerMm)} px；1000 mm = ${formatNumber(pixelsPerThousandMm)} px`;
  }

  function readCoordinateInput(input, fallback) {
    const value = Number.parseFloat(input.value);
    return Number.isFinite(value) ? Math.round(value) : fallback;
  }

  function normalizeThickness(value) {
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric)) {
      return DEFAULT_WALL_THICKNESS;
    }
    return clamp(numeric, MIN_WALL_THICKNESS, MAX_WALL_THICKNESS);
  }

  function normalizeWallStatus(value) {
    if (value === "new" || value === "demolished") {
      return value;
    }
    return "existing";
  }

  function normalizeWallType(value) {
    return WALL_TYPE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_WALL_TYPE;
  }

  function getWallTypeOption(value) {
    return WALL_TYPE_OPTIONS.find((option) => option.value === normalizeWallType(value)) || WALL_TYPE_OPTIONS[0];
  }

  function getWallTypeLabel(value) {
    return getWallTypeOption(value).label;
  }

  function getWallTypeDetail(value) {
    return getWallTypeOption(value).detail;
  }

  function getWallStatusLabel(status) {
    if (status === "new") {
      return "新設牆";
    }
    if (status === "demolished") {
      return "拆除牆";
    }
    return "既有牆";
  }

  function renderWallTypeOptions(currentValue) {
    const normalized = normalizeWallType(currentValue);
    return WALL_TYPE_OPTIONS.map((option) => (
      `<option value="${option.value}" ${option.value === normalized ? "selected" : ""}>${escapeHTML(option.label)}　${escapeHTML(option.detail)}</option>`
    )).join("");
  }

  function renderWallThicknessOptions(currentValue) {
    const normalized = normalizeThickness(currentValue);
    return WALL_THICKNESS_OPTIONS.map((option) => (
      `<option value="${option.value}" ${option.value === normalized ? "selected" : ""}>${escapeHTML(option.label)}</option>`
    )).join("");
  }

  function getModeLabel(mode) {
    if (mode === "calibrate") {
      return "比例校正";
    }
    if (mode === "draw-wall") {
      return "畫牆";
    }
    if (mode === "place-zone") {
      return "新增空間標籤";
    }
    if (mode === "place-furniture") {
      return "加入家具 / 櫃體";
    }
    if (mode === "edit-zone-boundary") {
      return "編輯空間邊界";
    }
    return "選取";
  }

  function getFurnitureTemplate(templateId) {
    return FURNITURE_TEMPLATES[templateId] || FURNITURE_TEMPLATES.wardrobe;
  }

  function getFurnitureTypeLabel(type) {
    return getFurnitureTemplate(type).name || type;
  }

  function getFurnitureCategoryLabel(category) {
    return FURNITURE_CATEGORY_LABELS[category] || category || "未分類";
  }

  function getFurnitureMaterialLabel(tag) {
    return FURNITURE_MATERIAL_LABELS[tag] || tag || "未指定";
  }

  function getOpeningKindLabel(kind) {
    return OPENING_KIND_LABELS[kind] || kind || "開口";
  }

  function getOpeningSwingLabel(swing) {
    return OPENING_SWING_LABELS[swing] || swing || "無門片";
  }

  function getLayerLabel(layer) {
    if (layer === "furniture") {
      return "家具 / 櫃體";
    }
    if (layer === "walls") {
      return "牆體";
    }
    if (layer === "openings") {
      return "門窗開口";
    }
    if (layer === "zones") {
      return "空間";
    }
    return layer || "未指定";
  }

  function normalizeFurnitureDimension(value, fallback, minValue) {
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.max(minValue, numeric);
  }

  function normalizeFurnitureRotation(value, fallback) {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.round(numeric);
  }

  function normalizeFurnitureMaterialTag(value) {
    return FURNITURE_MATERIAL_TAGS.includes(value) ? value : "unspecified";
  }

  function renderFurnitureMaterialOptions(currentValue) {
    const selected = normalizeFurnitureMaterialTag(currentValue);
    return FURNITURE_MATERIAL_TAGS.map((tag) => (
      `<option value="${escapeAttribute(tag)}" ${tag === selected ? "selected" : ""}>${escapeHTML(getFurnitureMaterialLabel(tag))}</option>`
    )).join("");
  }

  function normalizeFurnitureForExport(item) {
    return {
      ...item,
      widthMm: normalizeFurnitureDimension(item.widthMm, getFurnitureTemplate(item.type).widthMm, MIN_FURNITURE_WIDTH_MM),
      depthMm: normalizeFurnitureDimension(item.depthMm, getFurnitureTemplate(item.type).depthMm, MIN_FURNITURE_DEPTH_MM),
      heightMm: normalizeFurnitureDimension(item.heightMm, getFurnitureTemplate(item.type).heightMm, 0),
      budgetCandidate: true,
      productionReady: false,
      notFormalEstimate: true
    };
  }

  function createToolCatalogFurnitureItems() {
    return Object.values(FURNITURE_TEMPLATES).map((template) => ({
      id: `tool-${template.type}`,
      type: template.type,
      category: template.category,
      name: template.name,
      widthMm: template.widthMm,
      depthMm: template.depthMm,
      heightMm: template.heightMm,
      materialTags: [...template.materialTags],
      runtimeSource: "parametric-mvp",
      svgPackageSource: "blocked_until_overlay_qa",
      budgetCandidate: true,
      productionReady: false,
      notFormalEstimate: true
    }));
  }

  function createFurnitureLayoutObject(item) {
    const exported = normalizeFurnitureForExport(item);
    return {
      id: exported.id,
      objectType: "parametric_furniture_candidate",
      type: exported.type,
      category: exported.category,
      name: exported.name,
      layer: exported.layer,
      positionMm: { x: exported.x, y: exported.y },
      sizeMm: {
        width: exported.widthMm,
        depth: exported.depthMm,
        height: exported.heightMm
      },
      rotation: exported.rotation,
      materialTags: [...(exported.materialTags || [])],
      note: exported.note || "",
      budgetCandidate: true,
      productionReady: false,
      notFormalEstimate: true
    };
  }

  function getNormalizedFileType(file) {
    const extension = getFileExtension(file.name);
    if (extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "pdf") {
      return extension;
    }
    if (file.type === "image/jpeg") {
      return "jpeg";
    }
    if (file.type === "image/png") {
      return "png";
    }
    if (file.type === "application/pdf") {
      return "pdf";
    }
    return extension || "unknown";
  }

  function getFileExtension(fileName) {
    const parts = String(fileName).toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  function isPreviewableImageType(fileType) {
    return fileType === "jpg" || fileType === "jpeg" || fileType === "png";
  }

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function formatNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "-";
    }
    return numeric.toLocaleString("zh-Hant", {
      maximumFractionDigits: numeric < 10 ? 4 : 2
    });
  }

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHTML(value).replace(/`/g, "&#096;");
  }
})();
