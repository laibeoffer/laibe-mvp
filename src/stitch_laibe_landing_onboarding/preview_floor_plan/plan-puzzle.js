(function () {
  const GRID_PIXEL_SIZE = 40;
  const DEFAULT_UNDERLAY_OPACITY = 0.55;
  const MIN_UNDERLAY_OPACITY = 0.15;
  const MAX_UNDERLAY_OPACITY = 1;
  const MIN_WALL_LENGTH = 200;
  const MIN_WALL_THICKNESS = 50;
  const MAX_WALL_THICKNESS = 500;
  const DEFAULT_WALL_THICKNESS = 120;
  const ENDPOINT_SNAP_DISTANCE_PX = 12;
  const ORTHOGONAL_TOLERANCE_DEG = 10;
  const NEARBY_ENDPOINT_MIN_DISTANCE = 30;
  const NEARBY_ENDPOINT_MAX_DISTANCE = 150;
  const CLEANUP_MERGE_DISTANCE = 30;
  const GEOMETRY_EPSILON = 0.5;
  const PARAMETER_EPSILON = 1e-6;
  const MIN_OPENING_WIDTH = 300;
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
  const PC_SPIKE_NOTICE = "此為 .pc 轉換測試版，尚未經 Plancraft DSL / renderer 驗證。";
  const PC_VALIDATION_STATUSES = new Set(["not_run", "passed", "failed"]);
  const PC_PREVIEW_STATUSES = new Set(["not_run", "passed", "failed"]);
  const PC_RENDERER_PREVIEW_COMMAND = "cd C:\\laibe_project\r\nnode C:\\laibe_project\\plancraft\\packages\\cli\\dist\\index.js compile C:\\path\\to\\laibe-plancraft-plus-spike.pc --structure-only -o C:\\path\\to\\laibe-plancraft-plus-spike.svg";
  const PC_RENDERER_LAYERS_COMMAND = "node C:\\laibe_project\\plancraft\\packages\\cli\\dist\\index.js compile C:\\path\\to\\laibe-plancraft-plus-spike.pc --layers walls,openings,labels -o C:\\path\\to\\laibe-plancraft-plus-layers.svg";
  const PDF_NOT_SUPPORTED_MESSAGE = "此版本已建立 PDF 匯入接口，但尚未支援 PDF 直接預覽與校正。請先將丈量圖轉成 JPG 或 PNG 上傳；PDF 轉圖會在後續版本接入 Plancraft+ Import Pipeline。";
  const STYLE_VISUAL_DISCLAIMER = "本圖僅為風格示意，用於案件上架與溝通參考，不代表最終設計、施工圖、實際尺寸、工法、材料品牌或正式報價內容。";
  const STYLE_VISUAL_PROXY_ENABLED = false;
  const STYLE_VISUAL_PROXY_ENDPOINT = "";
  const STYLE_VISUAL_PROXY_ALLOWED_ENDPOINT = "/api/style-visual-image-spike";
  const STYLE_VISUAL_PROXY_DISABLED_MESSAGE = "Server-side Image API proxy 尚未設定";
  const STYLE_VISUAL_REFERENCE_IMAGE_NOTICE = "Reference image upload 尚未開放，需經 privacy review。";
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
  const GUIDE_MODE = "local_rule_based";
  const GUIDE_DISCLAIMER = "平面拼圖引導官提供需求整理與操作引導，不代表正式設計、施工圖、結構判斷或正式報價。";
  const GUIDE_WELCOME_MESSAGE = "我是平面拼圖引導官，可以協助你整理需求、理解圖層與提醒缺漏。本輪只使用本地規則，不會連接任何 AI API。";
  const GUIDE_FALLBACK_MESSAGE = "我目前可以協助你理解平面拼圖操作、圖層、預算提醒與需求記錄。這個問題我先幫你記錄成備註，後續可請廠商或萊比協助確認。";
  const PLAN_PUZZLE_FACTS_SCHEMA_VERSION = "0.1.0-placeholder";
  const PLAN_PUZZLE_FACTS_DISCLAIMER = "PlanPuzzleQuantityFacts 是平面拼圖引導用 placeholder facts，不是正式數量、施工圖、估價或報價輸入。";
  const GUIDE_LAYER_OPTIONS = [
    { value: "floor_plan", label: "平面配置" },
    { value: "demolition_plan", label: "拆除圖" },
    { value: "flooring_plan", label: "地坪圖" },
    { value: "lighting_plan", label: "燈具圖" },
    { value: "ac_plan", label: "空調圖" }
  ];
  const GUIDE_QUICK_QUESTIONS = [
    "我要怎麼開始？",
    "這張圖不是施工圖是什麼意思？",
    "我該先畫牆還是先放櫃子？",
    "哪些項目會影響預算？",
    "我不確定要不要拆牆怎麼辦？",
    "如何匯入丈量圖？",
    "如何設定比例？",
    "怎麼讓廠商看懂我的需求？",
    "哪些東西只是示意，不會直接進預算？"
  ];
  const GUIDE_FLOW_STEP_OPTIONS = {
    start: ["我要匯入丈量圖", "我要重做格局", "我要拆除舊裝潢", "我要新增櫃體", "我要整理浴室", "我不知道，請引導我"],
    house_condition: ["新成屋", "舊屋", "不確定"],
    old_house_details: ["有現況照片", "有漏水 / 壁癌 / 裂縫 / 海砂屋疑慮", "有舊櫃體或舊裝潢需要拆除", "目前不確定"],
    main_needs: ["格局調整", "拆除", "地坪", "天花", "木作櫃", "系統櫃", "廚具", "浴室", "燈具", "插座 / 弱電", "給排水", "空調", "其他"],
    budget_preference: ["省預算", "標準", "質感優先", "請廠商建議"]
  };
  const GUIDE_KNOWLEDGE = [
    {
      id: "start",
      keywords: ["怎麼開始", "如何開始", "我要怎麼開始", "開始", "第一步"],
      text: "建議先匯入丈量圖或手上的平面底圖，接著校正比例，再建立牆體、門窗、空間名稱與主要需求。你也可以先用備註告訴我想改哪些地方。"
    },
    {
      id: "import-underlay",
      keywords: ["匯入", "丈量圖", "底圖", "上傳", "jpg", "png", "pdf"],
      text: "你可以用左側或上方的匯入按鈕放入 JPG / PNG 底圖。PDF 目前只保留匯入接口，建議先轉成圖片再校正比例。"
    },
    {
      id: "scale",
      keywords: ["比例", "校正", "設定比例", "尺寸比例", "pxpermm"],
      text: "設定比例時，請在底圖上點兩個已知距離的點，再輸入實際長度 mm。比例校正後，牆長、開口位置與後續需求整理才比較有參考性。"
    },
    {
      id: "draw-wall",
      keywords: ["畫牆", "牆", "牆體", "wall"],
      text: "畫牆時先選牆體狀態：既有牆、新設牆或拆除牆，再在畫布上點起點與終點。新設牆的厚度會影響後續需求整理；拆除或開口不確定時要標為需專業確認。"
    },
    {
      id: "wall-status",
      keywords: ["既有牆", "新設牆", "拆除牆", "拆牆", "承重牆", "結構牆"],
      text: "既有牆代表現況保留，新設牆代表想新增，拆除牆代表希望移除。拆除牆體需要確認是否為承重牆或結構牆，不確定時請標記為需專業確認，不要直接當成可拆。"
    },
    {
      id: "dimension",
      keywords: ["標尺寸", "尺寸", "長度", "mm", "量測"],
      text: "目前牆長與開口位置會依比例校正後的 mm 顯示。若你知道實際尺寸，請優先校正比例，再畫牆與開口；正式尺寸仍需現場丈量確認。"
    },
    {
      id: "openings",
      keywords: ["門窗", "門", "窗", "開口", "opening"],
      text: "門、窗與開口需要先選到一段牆或 edge，再新增開口。寬度、offset、門片方向與窗台高度都只是需求整理資料，正式做法仍需廠商現場確認。"
    },
    {
      id: "cabinet",
      keywords: ["櫃", "木作", "系統櫃", "廚具", "櫃體"],
      text: "櫃體需求建議先用備註記錄位置、用途、材質偏好、五金等級與是否納入預算。木作櫃、系統櫃與廚具的計價方式不同，後續需廠商依尺寸與材料確認。"
    },
    {
      id: "layers",
      keywords: ["圖層", "切換圖層", "顯示圖層", "隱藏圖層", "疊加"],
      text: "圖層是把不同需求分開看：平面配置放牆、門窗與空間；拆除圖標要拆的項目；地坪圖標材料範圍；燈具與空調圖則整理偏好與位置。"
    },
    {
      id: "not-construction-drawing",
      keywords: ["施工圖", "不是施工圖", "正式施工圖", "這張圖不是施工圖"],
      text: "平面拼圖是招標需求整理工具，不是正式施工圖。它可以幫你把需求說清楚，正式施工圖需要設計師或專業人員確認。"
    },
    {
      id: "budget-impact",
      keywords: ["影響預算", "預算", "預算準", "估價準", "報價"],
      text: "會影響預算的項目包括拆除、清運、牆體、地坪、天花、櫃體、廚具、浴室防水、燈具、插座弱電、給排水與空調。目前平面拼圖整理的是預算候選資料，不是正式報價。"
    },
    {
      id: "overview",
      keywords: ["總預覽", "預覽", "總覽"],
      text: "總預覽是把目前底圖、牆、門窗、空間標籤、提醒與需求備註一起看，方便你確認廠商是否能讀懂你的意圖。"
    },
    {
      id: "photos",
      keywords: ["照片", "現況照", "補照片"],
      text: "現況照片能幫廠商判斷拆除、漏水、壁癌、管線、設備位置與施工限制。照片不是正式鑑定，但能降低廠商理解落差。"
    },
    {
      id: "hauling",
      keywords: ["清運", "垃圾", "拆除清運", "雜工"],
      text: "只要有拆除項目，通常就會牽涉清運、保護、搬運與雜工。平面拼圖可以先提醒這些預算候選項目，正式金額仍需廠商依現場確認。"
    },
    {
      id: "waterproofing",
      keywords: ["防水", "浴室", "試水"],
      text: "如果你有浴室地坪或給排水變更，系統會提醒防水與試水。是否納入預算仍由你確認，實際做法需要廠商或專業人員現場判斷。"
    },
    {
      id: "kitchen",
      keywords: ["廚具", "廚房", "插座", "給排水", "排水"],
      text: "廚具需求會牽涉插座、弱電、給排水、瓦斯或排風位置。建議先標位置與偏好，並把不確定的管線條件列為請廠商建議。"
    },
    {
      id: "ac",
      keywords: ["空調", "冷氣", "排水條件", "冷房"],
      text: "空調位置可先記錄偏好，例如不要吹床、每房一台、室外機位置或排水限制。冷房能力、管線與排水仍需現場確認。"
    },
    {
      id: "uncertain",
      keywords: ["不確定", "不知道", "需要建議", "請廠商建議"],
      text: "不確定的項目不用硬決定。你可以先記錄為備註，優先標成「請廠商建議」或「需專業確認」，後續招標時讓廠商回覆。"
    },
    {
      id: "professional",
      keywords: ["專業", "法規", "結構", "海砂屋", "漏水", "壁癌", "裂縫"],
      text: "涉及結構、法規、海砂屋、漏水、壁癌或裂縫時，需要專業確認或場勘確認。平面拼圖只負責記錄疑慮，不提供結構或法規判斷。"
    },
    {
      id: "ai-image",
      keywords: ["AI 圖", "AI圖", "風格示意", "模擬圖", "完工效果"],
      text: "AI 風格示意圖只用來幫助表達風格方向，不是正式設計圖、施工圖或完工保證，也不代表實際材料與完工效果。"
    },
    {
      id: "formal-quote",
      keywords: ["正式報價", "正式估價", "報價單", "預算單"],
      text: "預算單或需求摘要不是正式報價。正式報價需要廠商依現場、材料、尺寸、工法與施工條件確認後提出。"
    },
    {
      id: "contractor-readable",
      keywords: ["廠商看懂", "看懂需求", "招標", "溝通"],
      text: "要讓廠商看懂，請補齊空間名稱、保留 / 新增 / 拆除項目、主要材料偏好、不確定事項、需廠商建議的問題，以及哪些項目只是示意。"
    },
    {
      id: "sketch-only",
      keywords: ["示意", "不會直接進預算", "哪些東西只是示意"],
      text: "底圖、AI 風格示意、renderer preview、.pc spike、未校正比例的線段、未封閉的空間、多數備註都只是需求或示意資料，不會直接成為正式預算數量。"
    }
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

  Object.defineProperty(window, "laibePlanPuzzleQuantityFacts", {
    get() {
      syncPlanPuzzleQuantityFacts();
      return project.PlanPuzzleQuantityFacts;
    }
  });

  Object.defineProperty(window, "PlanPuzzleQuantityFacts", {
    get() {
      syncPlanPuzzleQuantityFacts();
      return project.PlanPuzzleQuantityFacts;
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
    const initialProject = {
      name: "LaiBE Plancraft+ 草稿",
      product: "Plancraft+",
      version: "0.10.0-renderer-preview-spike",
      unit: "mm",
      plan_quantity_facts_id: createId("plan-quantity-facts"),
      svg_artifact_id: createId("svg-artifact-placeholder"),
      quantity_context_status: "placeholder",
      importSource: null,
      scale: {
        pxPerMm: null,
        calibrated: false
      },
      underlay: null,
      walls: [],
      wallGraph: createInitialWallGraph(),
      nodeGraph: createInitialNodeGraph(),
      openings: [],
      zones: [],
      furniture: [],
      guide: createInitialGuideState(),
      guideLog: [createGuideWelcomeLog()],
      requirementNotes: [],
      guideSummary: createInitialGuideSummary(),
      PlanPuzzleQuantityFacts: null,
      plancraftBridge: getPlancraftBridgeStatus()
    };
    initialProject.PlanPuzzleQuantityFacts = createPlanPuzzleQuantityFacts(initialProject);
    return initialProject;
  }

  function createInitialGuideState() {
    return {
      enabled: true,
      mode: GUIDE_MODE,
      apiBacked: false,
      disclaimerAccepted: false,
      currentStep: "start",
      completedSteps: [],
      pendingSuggestions: [],
      resolvedSuggestionIds: [],
      lastUpdatedAt: null
    };
  }

  function createGuideWelcomeLog() {
    const createdAt = new Date().toISOString();
    return {
      id: createId("guide-log"),
      role: "guide",
      type: "message",
      text: GUIDE_WELCOME_MESSAGE,
      layer: "floor_plan",
      selectedObjectId: null,
      selectedObjectType: null,
      relatedReminderIds: [],
      createdAt,
      savedToRequirements: false
    };
  }

  function createInitialGuideSummary() {
    return {
      userIntent: [],
      uncertainties: [],
      budgetRelevantNotes: [],
      contractorQuestions: [],
      generatedAt: null
    };
  }

  function ensurePlanPuzzleQuantityFactIds(sourceProject = project) {
    if (!sourceProject.plan_quantity_facts_id) {
      sourceProject.plan_quantity_facts_id = createId("plan-quantity-facts");
    }
    if (!sourceProject.svg_artifact_id) {
      sourceProject.svg_artifact_id = createId("svg-artifact-placeholder");
    }
  }

  function syncPlanPuzzleQuantityFacts(sourceProject = project) {
    ensurePlanPuzzleQuantityFactIds(sourceProject);
    if (sourceProject === project) {
      sourceProject.currentLayer = getCurrentLayer();
    }
    const facts = createPlanPuzzleQuantityFacts(sourceProject);
    sourceProject.quantity_context_status = facts.quantity_context_status;
    sourceProject.PlanPuzzleQuantityFacts = facts;
    return facts;
  }

  function createPlanPuzzleQuantityFacts(sourceProject = project) {
    const walls = Array.isArray(sourceProject.walls) ? sourceProject.walls : [];
    const openings = Array.isArray(sourceProject.openings) ? sourceProject.openings : [];
    const zones = Array.isArray(sourceProject.zones) ? sourceProject.zones : [];
    const scaleLinked = Boolean(sourceProject.scale?.calibrated && Number.isFinite(sourceProject.scale?.pxPerMm));
    const underlayLinked = Boolean(sourceProject.importSource || sourceProject.underlay);
    const hasGeometry = Boolean(walls.length || openings.length || zones.length);
    const quantityStatus = scaleLinked && hasGeometry ? "linked" : "placeholder";
    const totalWallLengthMm = walls.reduce((sum, wall) => {
      if (!wall?.from || !wall?.to) {
        return sum;
      }
      return sum + getDistance(wall.from, wall.to);
    }, 0);
    const zoneRecords = zones.map((zone) => ({
      id: zone.id,
      name: zone.name || "",
      type: zone.type || "other",
      boundary_status: zone.boundaryStatus || "none",
      area_status: Number.isFinite(zone.area) ? "linked" : "placeholder",
      area_mm2: Number.isFinite(zone.area) ? zone.area : null
    }));

    return {
      id: sourceProject.plan_quantity_facts_id,
      schemaVersion: PLAN_PUZZLE_FACTS_SCHEMA_VERSION,
      mode: "local_placeholder_only",
      quantity_context_status: quantityStatus,
      generatedAt: new Date().toISOString(),
      source: "preview_floor_plan",
      disclaimer: PLAN_PUZZLE_FACTS_DISCLAIMER,
      apiBacked: false,
      budgetInputEligible: false,
      formalEstimateAllowed: false,
      productionReady: false,
      receivingWindows: {
        svg: {
          artifactId: sourceProject.svg_artifact_id,
          status: "placeholder",
          previewLinked: false,
          note: "SVG artifact receiving window only; no renderer output is generated here."
        },
        zone: {
          status: zones.length ? "linked" : "placeholder",
          count: zones.length,
          records: zoneRecords
        },
        area: {
          status: zoneRecords.some((zone) => zone.area_status === "linked") ? "linked" : "placeholder",
          unit: "mm2",
          records: zoneRecords.map((zone) => ({
            zoneId: zone.id,
            status: zone.area_status,
            value: zone.area_mm2
          }))
        },
        wallLength: {
          status: scaleLinked && walls.length ? "linked" : "placeholder",
          unit: "mm",
          wallCount: walls.length,
          totalMm: Number(totalWallLengthMm.toFixed(2))
        },
        openingCount: {
          status: openings.length ? "linked" : "placeholder",
          count: openings.length,
          byKind: openings.reduce((acc, opening) => {
            const kind = normalizeOpeningKind(opening.kind);
            acc[kind] = (acc[kind] || 0) + 1;
            return acc;
          }, {})
        }
      },
      context: {
        underlay: underlayLinked ? "linked" : "placeholder",
        scale: scaleLinked ? "linked" : "placeholder",
        wallGraphIssues: sourceProject.wallGraph?.issues?.length || 0,
        selectedLayer: sourceProject.guide?.currentLayer || sourceProject.currentLayer || "floor_plan"
      }
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
      currentWallStatus: "existing",
      currentWallThickness: DEFAULT_WALL_THICKNESS,
      currentOpeningKind: "door",
      currentOpeningWidth: DEFAULT_OPENING_WIDTHS.door,
      currentOpeningSwing: "left",
      currentZoneType: DEFAULT_ZONE_TYPE,
      currentZoneName: ZONE_TYPE_LABELS[DEFAULT_ZONE_TYPE],
      currentLayer: "floor_plan",
      guideInput: "",
      guideClearPending: false,
      zoneBoundaryState: createInitialZoneBoundaryState(),
      pcConverterReport: createInitialPcConverterReport(),
      message: "",
      error: ""
    };
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
      reason: "靜態頁尚未直接載入 Plancraft DSL；請使用本機驗證流程確認 .pc。",
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
      return "DSL validation 已通過；下一步可評估 renderer preview 或 sharedWalls canonicalization。";
    }
    if (normalized.status === "failed") {
      return "請依 validation errors 修正 converter schema 後重新匯出 .pc。";
    }
    return "靜態頁尚未直接載入 Plancraft DSL；請使用本機 validation command 驗證匯出的 .pc。";
  }

  function createInitialRendererPreviewResult() {
    return {
      status: "not_run",
      checkedAt: null,
      svgOutputPath: null,
      command: PC_RENDERER_PREVIEW_COMMAND,
      errors: [],
      warnings: [
        "靜態頁尚未直接載入 Plancraft renderer；請使用本機 CLI compile 產生 SVG 預覽。"
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
      return "Renderer preview 已通過代表性檢查；下一步可評估 sharedWalls canonicalization。";
    }
    if (normalized.status === "failed") {
      return "請依 renderer errors 修正 converter schema 或 zone boundary，再重新 compile。";
    }
    return "先匯出 Plancraft .pc 測試版，再用本機 Plancraft CLI compile 產生 SVG 預覽。";
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
      message: "已建立 .pc 測試轉換與 renderer preview 驗證流程",
      reason: "Renderer preview spike，尚未進入 browser production integration",
      requiredNextStep: "確認 SVG 預覽品質後，評估 sharedWalls canonicalization 或 browser preview integration",
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
    if (action === "choose-file") {
      chooseFile();
    }
    if (action === "start-calibration") {
      startCalibration();
    }
    if (action === "apply-calibration") {
      applyCalibration();
    }
    if (action === "set-select-mode") {
      enterSelectMode("已切換為選取模式。");
    }
    if (action === "start-draw-wall") {
      startDrawWall();
    }
    if (action === "start-place-zone") {
      startPlaceZone();
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
    if (action === "delete-zone") {
      deleteSelectedZone();
    }
    if (action === "delete-wall") {
      deleteSelectedWall();
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
    if (action === "guide-send") {
      sendGuideInput();
    }
    if (action === "guide-quick-question") {
      handleGuideQuickQuestion(actionButton.dataset.guideQuestion);
    }
    if (action === "guide-start-flow") {
      startGuideFlow();
    }
    if (action === "guide-continue-flow") {
      continueGuideFlow();
    }
    if (action === "guide-flow-option") {
      handleGuideFlowOption(actionButton.dataset.guideOption);
    }
    if (action === "guide-capture-question") {
      captureGuideQuestion();
    }
    if (action === "guide-generate-summary") {
      generateGuideSummary(true);
    }
    if (action === "guide-clear-chat") {
      clearGuideChat();
    }
    if (action === "guide-save-log") {
      saveGuideLogToRequirement(actionButton.dataset.guideLogId);
    }
    if (action === "guide-reminder-action") {
      handleGuideReminderAction(actionButton.dataset.reminderId, actionButton.dataset.reminderAction);
    }
    if (action === "guide-set-layer") {
      setGuideLayer(actionButton.dataset.guideLayer);
    }
    if (action === "guide-accept-disclaimer") {
      acceptGuideDisclaimer();
    }
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
    if (field.startsWith("style-visual-")) {
      updateStyleVisualRequestFromField(input);
    }
    if (field === "guide-input") {
      uiState.guideInput = input.value;
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
    if (field.startsWith("style-visual-")) {
      updateStyleVisualRequestFromField(input);
      render();
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
    if (target instanceof HTMLElement && target.matches("[data-field='guide-input']") && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendGuideInput();
      return;
    }
    const isEditingText = target instanceof HTMLElement && (
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    );
    if (isEditingText) {
      return;
    }

    if ((event.key === "Delete" || event.key === "Backspace") && uiState.selectedZoneId) {
      event.preventDefault();
      deleteSelectedZone();
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && uiState.selectedOpeningId) {
      event.preventDefault();
      deleteSelectedOpening();
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && uiState.selectedWallId) {
      event.preventDefault();
      deleteSelectedWall();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      enterSelectMode("已取消目前操作。");
    }
  }

  function chooseFile() {
    fileInput.value = "";
    fileInput.click();
  }

  function handleFileSelection(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const fileType = getNormalizedFileType(file);
    const importedAt = new Date().toISOString();
    const sequence = ++importSequence;
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
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: DEFAULT_UNDERLAY_OPACITY,
        calibratedBy: null
      };
      resetScaleAndInteraction("請用圖面上的已知尺寸校正比例。");
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
      calibrated: false
    };
    if (project.underlay) {
      project.underlay.calibratedBy = null;
    }
    uiState.mode = "select";
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
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
      uiState.error = "請先匯入可預覽的 JPG、JPEG 或 PNG 丈量圖，才能開始校正比例。";
      uiState.message = "";
      render();
      return;
    }

    uiState.mode = "calibrate";
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.wallDraftStart = null;
    uiState.wallDraftStartSnapPoint = null;
    uiState.wallPreviewEnd = null;
    uiState.snapPoint = null;
    clearZoneBoundaryDraft();
    uiState.calibrationPoints = [];
    uiState.knownLengthInput = "";
    uiState.error = "";
    uiState.message = "請在底圖上依序點選已知尺寸的兩端。";
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
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = "空間標籤模式：請在畫布上點一下放置標籤。";
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
      uiState.error = "請先完成比例校正並建立牆體節點，再編輯空間邊界。";
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
    uiState.message = "邊界編輯中：依序點選牆段加入或移除 boundary edges，完成後按「套用邊界」。";
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

    if (uiState.mode === "edit-zone-boundary") {
      return;
    }

    if (event.target === canvas || event.target === wallLayer || event.target === openingLayer || event.target === zonePolygonLayer) {
      uiState.selectedWallId = null;
      uiState.selectedEdgeId = null;
      uiState.selectedOpeningId = null;
      uiState.selectedZoneId = null;
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
    const zone = createZone(point);
    project.zones.push(zone);
    uiState.selectedZoneId = zone.id;
    uiState.selectedWallId = null;
    uiState.selectedEdgeId = null;
    uiState.selectedOpeningId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.mode = "select";
    uiState.error = "";
    uiState.message = `已新增空間標籤：${zone.name}。`;
    syncBridge();
    render();
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
    project.walls.push(wall);
    uiState.selectedWallId = wall.id;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedIssueId = null;
    uiState.selectedEdgeId = createEdgeId(wall);
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
    return {
      id: createId("wall"),
      sourceWallId: null,
      from: roundPoint(from),
      to: roundPoint(to),
      thickness: normalizeThickness(uiState.currentWallThickness),
      status: normalizeWallStatus(uiState.currentWallStatus),
      structural: false,
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

    // Server-side proxy spike contract only: frontend must never call a model
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
      label: "Sandbox Preview",
      imageLabel: "AI 示意圖",
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
    ensureGuideState();
    rebuildWallGraph();
    rebuildNodeGraph();
    syncZoneBoundaryMetadata();
    syncPlanPuzzleQuantityFacts();
    syncBridge();
    syncGuideSuggestions();
    const payload = JSON.parse(JSON.stringify(project));
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
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
      uiState.error = result.errors[0] || "目前沒有可轉換的封閉 zone boundary，無法匯出 .pc 測試版。";
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

    warnings.push("Plancraft+ 目前以畫布左上角為原點；Plancraft renderer 使用建築座標慣例，本 Spike 先原樣輸出 mm 座標，尚未做座標翻轉驗證。");

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
      errors.push("沒有可轉換的封閉 zone boundary。請先建立 zone，指定至少 3 段 boundary edges，並套用可封閉的 polygon。");
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
      "靜態頁尚未直接載入 Plancraft DSL；請使用本機 validation command 驗證 .pc。",
      "本 Spike 不在 browser bundle 載入 Plancraft DSL，以維持 file:/// 靜態頁可用並避免新增打包流程。"
    ];
    if (typeof pcText !== "string" || pcText.trim().length === 0) {
      warnings.push("目前沒有可驗證的 pcText。");
    }
    return {
      status: "not_run",
      checkedAt: null,
      reason: "靜態頁未直接載入 Plancraft DSL，需用本機 validation command 驗證",
      errors: [],
      warnings
    };
  }

  function convertZoneToPcRoom(zone, edgeMap, warnings) {
    const boundaryEdgeIds = uniqueIdsPreserveOrder(zone.boundaryEdgeIds || []);
    if (boundaryEdgeIds.length < ZONE_BOUNDARY_MIN_EDGES) {
      return {
        ok: false,
        warning: `Zone「${zone.name || zone.id}」缺少可轉換 boundary：boundaryEdgeIds 少於 3。`
      };
    }

    const boundary = createPcBoundaryDraft(boundaryEdgeIds, edgeMap);
    if (boundary.missingEdgeIds.length > 0) {
      return {
        ok: false,
        warning: `Zone「${zone.name || zone.id}」有 boundary edge 找不到：${boundary.missingEdgeIds.join(", ")}。`
      };
    }
    if (!boundary.closed || boundary.orientedEdges.length < ZONE_BOUNDARY_MIN_EDGES) {
      return {
        ok: false,
        warning: `Zone「${zone.name || zone.id}」boundary 尚未形成封閉 polygon，已略過 .pc room 轉換。`
      };
    }
    if (boundary.orientedEdges.some((record) => record.edge.status === "demolished")) {
      return {
        ok: false,
        warning: `Zone「${zone.name || zone.id}」包含 demolished edge；拆除牆不轉成正式 room wall，該 zone 已略過。`
      };
    }

    if (zone.type) {
      warnings.push(`Zone「${zone.name || zone.id}」type=${zone.type}：Plancraft .pc room schema 目前沒有 type 欄位，本 Spike 不寫入 type。`);
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
        warning: `Opening ${opening.id} 找不到 edgeId=${opening.edgeId}，已略過。`
      };
    }
    const roomRefs = edgeRoomRefs.get(opening.edgeId) || [];
    if (roomRefs.length === 0) {
      return {
        ok: false,
        warning: `Opening ${opening.id} 的 edge 不屬於任何已轉換 room boundary，已略過。`
      };
    }
    if (opening.offset < 0 || opening.width <= 0 || opening.offset + opening.width > edge.length + GEOMETRY_EPSILON) {
      return {
        ok: false,
        warning: `Opening ${opening.id} offset/width 超出 edge 長度，已略過。`
      };
    }
    if (roomRefs.length > 1) {
      warnings.push(`Opening ${opening.id} 位於共用 edge，本 Spike 先掛到第一個匹配 room，shared opening 尚未 canonicalize。`);
    }

    const target = roomRefs[0];
    const kind = normalizeOpeningKind(opening.kind);
    const pcOffset = target.reversed
      ? edge.length - Number(opening.offset) - Number(opening.width)
      : Number(opening.offset);
    if (!Number.isFinite(pcOffset) || pcOffset < -GEOMETRY_EPSILON) {
      return {
        ok: false,
        warning: `Opening ${opening.id} 轉換到 room wall offset 時超出範圍，已略過。`
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
    ensureGuideState();
    rebuildWallGraph();
    rebuildNodeGraph();
    syncZoneBoundaryMetadata();
    syncPlanPuzzleQuantityFacts();
    syncBridge();
    syncGuideSuggestions();
    renderUnderlay();
    renderZonePolygons();
    renderWalls();
    renderOpenings();
    renderZones();
    renderWallGraph();
    renderCalibration();
    renderCanvasHelper();
    renderInspector();
    renderStatusLabels();
    syncStaticControls();
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

  function renderWall(wall) {
    const from = mmToPxPoint(wall.from);
    const to = mmToPxPoint(wall.to);
    const strokeWidth = getWallStrokeWidth(wall);
    const isSelected = wall.id === uiState.selectedWallId;
    const isIssueHighlighted = isWallInSelectedIssue(wall.id);
    const isBoundaryHighlighted = isWallInActiveBoundary(wall.id);

    if (isSelected || isIssueHighlighted || isBoundaryHighlighted) {
      const outline = createSvgLine("wall-selected-outline", from, to);
      outline.setAttribute("stroke-width", String(strokeWidth + (isIssueHighlighted || isBoundaryHighlighted ? 16 : 10)));
      wallLayer.appendChild(outline);
    }

    const visibleLine = createSvgLine(`wall-line wall-${wall.status}${isSelected || isIssueHighlighted ? " is-selected" : ""}${isBoundaryHighlighted ? " is-boundary" : ""}`, from, to);
    visibleLine.setAttribute("stroke-width", String(strokeWidth));
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
          建立 Plancraft+ 底圖基準後，再進行比例校正與牆體描繪。
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

    if (uiState.mode === "edit-zone-boundary") {
      const draft = getZoneBoundaryState();
      const openMessage = hasBoundaryIssueType(draft.issues, "zone-boundary-open")
        ? "目前邊界尚未形成封閉空間"
        : "邊界已可能封閉，可套用到目前 zone";
      canvasHelper.innerHTML = `
        <div class="canvas-helper-card">
          <b>Zone Boundary</b>
          ${escapeHTML(uiState.message || openMessage)}
        </div>
      `;
      return;
    }

    const helperTitle = project.scale.calibrated ? "比例已校正" : "請用圖面上的已知尺寸校正比例";
    const helperText = uiState.message || (project.scale.calibrated
      ? `${getScaleReadout()}。可描牆、整理節點、標示門窗，或放置空間標籤。`
      : "點選「校正比例」，再於圖面上點兩個已知尺寸端點。");

    canvasHelper.innerHTML = `
      <div class="canvas-helper-card">
        <b>${escapeHTML(helperTitle)}</b>
        ${escapeHTML(helperText)}
      </div>
    `;
  }

  function renderInspector() {
    const selectedZone = getSelectedZone();
    const selectedOpening = getSelectedOpening();
    const selectedWall = getSelectedWall();
    const styleVisualPanel = renderStyleVisualPanel();
    const guidePanel = renderGuidePanel();
    const bridgePanel = `${renderBridgeCard()}${renderPcConverterReportCard()}${renderRendererPreviewReportCard()}`;
    if (selectedZone) {
      inspectorBody.innerHTML = `
        ${renderSelectedZoneCard(selectedZone)}
        ${guidePanel}
        ${renderWallGraphCard()}
        ${renderNodeGraphCard()}
        ${renderMessageBlocks()}
        ${bridgePanel}
        ${styleVisualPanel}
      `;
      return;
    }

    if (selectedOpening) {
      inspectorBody.innerHTML = `
        ${renderSelectedOpeningCard(selectedOpening)}
        ${guidePanel}
        ${renderWallGraphCard()}
        ${renderNodeGraphCard()}
        ${renderMessageBlocks()}
        ${bridgePanel}
        ${styleVisualPanel}
      `;
      return;
    }

    if (selectedWall) {
      inspectorBody.innerHTML = `
        ${renderSelectedWallCard(selectedWall)}
        ${guidePanel}
        ${renderWallGraphCard()}
        ${renderNodeGraphCard()}
        ${renderMessageBlocks()}
        ${bridgePanel}
        ${styleVisualPanel}
      `;
      return;
    }

    if (!project.importSource) {
      inspectorBody.innerHTML = `
        <section class="empty-state">
          <h2>Plancraft+ 匯入狀態：尚未匯入</h2>
          <p>比例狀態：尚未校正。下一步請先匯入 JPG 或 PNG 丈量圖。</p>
        </section>
        ${guidePanel}
        ${renderWallWorkflowCard()}
        ${renderZoneWorkflowCard()}
        ${renderWallGraphCard()}
        ${renderNodeGraphCard()}
        ${renderMessageBlocks()}
        ${bridgePanel}
        ${styleVisualPanel}
      `;
      return;
    }

    if (!project.importSource.previewSupported) {
      inspectorBody.innerHTML = `
        ${renderImportSourceCard()}
        ${guidePanel}
        ${renderWallGraphCard()}
        ${renderNodeGraphCard()}
        ${renderMessageBlocks(PDF_NOT_SUPPORTED_MESSAGE)}
        ${bridgePanel}
        ${styleVisualPanel}
      `;
      return;
    }

    inspectorBody.innerHTML = `
      ${renderImportSourceCard()}
      ${renderUnderlayControls()}
      ${renderScaleCard()}
      ${guidePanel}
      ${renderWallWorkflowCard()}
      ${renderZoneWorkflowCard()}
      ${renderWallGraphCard()}
      ${renderNodeGraphCard()}
      ${renderMessageBlocks()}
      ${bridgePanel}
      ${styleVisualPanel}
      <div class="inline-message">草稿包含底圖資料，檔案可能較大。</div>
    `;
  }

  function renderSelectedWallCard(wall) {
    const edge = getEdgeForWall(wall.id);
    return `
      <form class="inspector-form" aria-label="牆體屬性表單">
        <div class="status-card">
          <b>選取牆體</b>
          <div class="status-grid">
            <div class="status-row"><span>ID</span><span>${escapeHTML(wall.id)}</span></div>
            <div class="status-row"><span>長度</span><span>${formatNumber(getDistance(wall.from, wall.to))} mm</span></div>
            <div class="status-row"><span>edgeId</span><span>${edge ? escapeHTML(edge.id) : "-"}</span></div>
            <div class="status-row"><span>edge length</span><span>${edge ? `${formatNumber(edge.length)} mm` : "-"}</span></div>
            <div class="status-row"><span>updatedAt</span><span>${escapeHTML(wall.updatedAt)}</span></div>
          </div>
        </div>
        <div class="field-grid">
          <div class="field-row full">
            <label for="selected-wall-status">Status</label>
            <select id="selected-wall-status" data-field="selected-wall-status">
              ${renderStatusOption("existing", wall.status)}
              ${renderStatusOption("new", wall.status)}
              ${renderStatusOption("demolished", wall.status)}
            </select>
          </div>
          <div class="field-row">
            <label for="selected-wall-thickness">Thickness</label>
            <input id="selected-wall-thickness" data-field="selected-wall-thickness" type="number" min="${MIN_WALL_THICKNESS}" max="${MAX_WALL_THICKNESS}" step="1" value="${wall.thickness}">
          </div>
          <label class="toggle-row" for="selected-wall-structural" style="align-self:end; min-height:42px;">
            <span>Structural</span>
            <input id="selected-wall-structural" data-field="selected-wall-structural" type="checkbox" ${wall.structural ? "checked" : ""}>
          </label>
          <div class="field-row">
            <label for="selected-wall-from-x">From X</label>
            <input id="selected-wall-from-x" data-field="selected-wall-from-x" type="number" step="1" value="${wall.from.x}">
          </div>
          <div class="field-row">
            <label for="selected-wall-from-y">From Y</label>
            <input id="selected-wall-from-y" data-field="selected-wall-from-y" type="number" step="1" value="${wall.from.y}">
          </div>
          <div class="field-row">
            <label for="selected-wall-to-x">To X</label>
            <input id="selected-wall-to-x" data-field="selected-wall-to-x" type="number" step="1" value="${wall.to.x}">
          </div>
          <div class="field-row">
            <label for="selected-wall-to-y">To Y</label>
            <input id="selected-wall-to-y" data-field="selected-wall-to-y" type="number" step="1" value="${wall.to.y}">
          </div>
        </div>
        <div class="project-readout">
          牆體座標以 mm 儲存，畫面顯示時才依 pxPerMm 轉換成 SVG 座標。
        </div>
        <div class="inspector-actions">
          <button class="danger-btn" type="button" data-action="delete-wall">刪除牆體</button>
          <button class="secondary-btn" type="button" data-action="add-opening" data-opening-kind="door">新增門</button>
          <button class="secondary-btn" type="button" data-action="add-opening" data-opening-kind="window">新增窗</button>
          <button class="secondary-btn" type="button" data-action="clean-wall-endpoints">整理端點</button>
          <button class="secondary-btn" type="button" data-action="set-select-mode">取消選取</button>
        </div>
      </form>
    `;
  }

  function renderSelectedZoneCard(zone) {
    ensureZoneBoundaryFields(zone);
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
      : `<div class="inline-message">目前沒有 zone boundary issue。</div>`;
    return `
      <form class="inspector-form" aria-label="空間標籤屬性表單">
        <div class="status-card">
          <b>選取空間標籤</b>
          <div class="status-grid">
            <div class="status-row"><span>ID</span><span>${escapeHTML(zone.id)}</span></div>
            <div class="status-row"><span>type</span><span>${escapeHTML(zone.type)}</span></div>
            <div class="status-row"><span>boundaryEdgeIds</span><span>${displayEdgeIds.length}</span></div>
            <div class="status-row"><span>boundaryWallIds</span><span>${zone.boundaryWallIds.length}</span></div>
            <div class="status-row"><span>polygon 點數</span><span>${(isEditingBoundary ? displayDraft.previewPolygon : zone.polygon).length}</span></div>
            <div class="status-row"><span>boundary 狀態</span><span>${escapeHTML(boundaryStatusText)}</span></div>
            <div class="status-row"><span>area</span><span>${zone.area === null ? "尚未計算" : `${formatNumber(zone.area)} mm²`}</span></div>
            <div class="status-row"><span>updatedAt</span><span>${escapeHTML(zone.updatedAt)}</span></div>
          </div>
        </div>
        <div class="field-grid">
          <div class="field-row full">
            <label for="selected-zone-name">Name</label>
            <input id="selected-zone-name" data-field="selected-zone-name" type="text" value="${escapeAttribute(zone.name)}">
          </div>
          <div class="field-row full">
            <label for="selected-zone-type">Type</label>
            <select id="selected-zone-type" data-field="selected-zone-type">
              ${renderZoneTypeOptions(zone.type)}
            </select>
          </div>
          <div class="field-row">
            <label for="selected-zone-x">Label X</label>
            <input id="selected-zone-x" data-field="selected-zone-x" type="number" min="0" step="1" value="${zone.labelPosition.x}">
          </div>
          <div class="field-row">
            <label for="selected-zone-y">Label Y</label>
            <input id="selected-zone-y" data-field="selected-zone-y" type="number" min="0" step="1" value="${zone.labelPosition.y}">
          </div>
        </div>
        <div class="project-readout">
          Zone labelPosition 與 boundary polygon 都使用 mm 座標；area 本輪仍維持 null。
        </div>
        <div class="status-card">
          <b>Zone Boundary</b>
          <div class="status-grid">
            <div class="status-row"><span>編輯模式</span><span>${isEditingBoundary ? "編輯中" : "未啟動"}</span></div>
            <div class="status-row"><span>目前選取 edge</span><span>${displayEdgeIds.length}</span></div>
            <div class="status-row"><span>boundaryWallIds</span><span>${zone.boundaryWallIds.length}</span></div>
            <div class="status-row"><span>polygon 點數</span><span>${(isEditingBoundary ? displayDraft.previewPolygon : zone.polygon).length}</span></div>
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
    const validation = edge ? validateOpening(opening, edge) : { valid: false, error: "找不到 opening 依附的 edge。" };
    return `
      <form class="inspector-form" aria-label="開口屬性表單">
        <div class="status-card">
          <b>選取開口</b>
          <div class="status-grid">
            <div class="status-row"><span>ID</span><span>${escapeHTML(opening.id)}</span></div>
            <div class="status-row"><span>kind</span><span>${escapeHTML(opening.kind)}</span></div>
            <div class="status-row"><span>edgeId</span><span>${escapeHTML(opening.edgeId)}</span></div>
            <div class="status-row"><span>sourceWallId</span><span>${escapeHTML(opening.sourceWallId || "-")}</span></div>
            <div class="status-row"><span>edge length</span><span>${edge ? `${formatNumber(edge.length)} mm` : "-"}</span></div>
            <div class="status-row"><span>updatedAt</span><span>${escapeHTML(opening.updatedAt)}</span></div>
          </div>
        </div>
        <div class="field-grid">
          <div class="field-row full">
            <label for="selected-opening-kind">Kind</label>
            <select id="selected-opening-kind" data-field="selected-opening-kind">
              ${renderOpeningKindOption("door", opening.kind)}
              ${renderOpeningKindOption("window", opening.kind)}
              ${renderOpeningKindOption("opening", opening.kind)}
            </select>
          </div>
          <div class="field-row">
            <label for="selected-opening-offset">Offset</label>
            <input id="selected-opening-offset" data-field="selected-opening-offset" type="number" min="0" step="1" value="${opening.offset}">
          </div>
          <div class="field-row">
            <label for="selected-opening-width">Width</label>
            <input id="selected-opening-width" data-field="selected-opening-width" type="number" min="${MIN_OPENING_WIDTH}" step="1" value="${opening.width}">
          </div>
          <div class="field-row full">
            <label for="selected-opening-swing">Swing</label>
            <select id="selected-opening-swing" data-field="selected-opening-swing">
              ${renderSwingOption("left", opening.swing)}
              ${renderSwingOption("right", opening.swing)}
              ${renderSwingOption("sliding", opening.swing)}
              ${renderSwingOption("none", opening.swing)}
            </select>
          </div>
          <div class="field-row">
            <label for="selected-opening-sill-height">Sill Height</label>
            <input id="selected-opening-sill-height" data-field="selected-opening-sill-height" type="number" min="0" step="1" value="${opening.sillHeight ?? ""}">
          </div>
          <div class="field-row">
            <label for="selected-opening-height">Height</label>
            <input id="selected-opening-height" data-field="selected-opening-height" type="number" min="0" step="1" value="${opening.height ?? ""}">
          </div>
        </div>
        ${validation.warning ? `<div class="inline-message">${escapeHTML(validation.warning)}</div>` : ""}
        <div class="project-readout">
          開口依附 nodeGraph edge，offset / width 都以 mm 儲存，後續可供 Plancraft Bridge 轉換。
        </div>
        <div class="inspector-actions">
          <button class="danger-btn" type="button" data-action="delete-opening">刪除開口</button>
          <button class="secondary-btn" type="button" data-action="set-select-mode">取消選取</button>
        </div>
      </form>
    `;
  }

  function renderOpeningKindOption(value, currentValue) {
    return `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHTML(value)}</option>`;
  }

  function renderSwingOption(value, currentValue) {
    return `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHTML(value)}</option>`;
  }

  function renderZoneTypeOptions(currentValue) {
    return Object.entries(ZONE_TYPE_LABELS).map(([value, label]) => (
      `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHTML(label)} ${escapeHTML(value)}</option>`
    )).join("");
  }

  function renderStatusOption(value, currentValue) {
    return `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHTML(getWallStatusLabel(value))}</option>`;
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

  function renderScaleCard() {
    const calibratedBy = project.underlay?.calibratedBy;
    const pointCount = uiState.mode === "calibrate" ? uiState.calibrationPoints.length : getCalibrationPointsForRender().length;
    const scaleReadout = project.scale.calibrated ? getScaleReadout() : "尚未校正";
    const pointReadout = pointCount === 0 ? "尚未選點" : `${Math.min(pointCount, 2)} / 2`;

    return `
      <div class="status-card">
        <b>比例校正</b>
        <div class="status-grid">
          <div class="status-row"><span>比例狀態</span><span>${project.scale.calibrated ? "已校正" : "尚未校正"}</span></div>
          <div class="status-row"><span>pxPerMm</span><span>${project.scale.pxPerMm ?? "-"}</span></div>
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
        <b>牆體草稿</b>
        <div class="status-grid">
          <div class="status-row"><span>目前模式</span><span>${escapeHTML(getModeLabel(uiState.mode))}</span></div>
          <div class="status-row"><span>牆段數</span><span>${project.walls.length}</span></div>
          <div class="status-row"><span>下一段狀態</span><span>${escapeHTML(getWallStatusLabel(uiState.currentWallStatus))}</span></div>
          <div class="status-row"><span>下一段牆厚</span><span>${uiState.currentWallThickness} mm</span></div>
          <div class="status-row"><span>端點吸附</span><span>${uiState.snapEnabled ? "開啟" : "關閉"}</span></div>
          <div class="status-row"><span>正交輔助</span><span>${uiState.orthogonalEnabled ? "開啟" : "關閉"}</span></div>
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

  function renderWallGraphCard() {
    const graph = project.wallGraph || createInitialWallGraph();
    const issues = graph.issues || [];
    const issueList = issues.length
      ? `<div class="issue-list">${issues.map(renderIssueButton).join("")}</div>`
      : `<div class="inline-message">目前沒有牆體圖形問題。端點、交會與重疊檢查會在新增或編輯牆段後自動更新。</div>`;

    return `
      <div class="status-card">
        <b>Wall Graph Cleanup</b>
        <div class="status-grid">
          <div class="status-row"><span>牆段數量</span><span>${project.walls.length}</span></div>
          <div class="status-row"><span>節點數量</span><span>${graph.nodes.length}</span></div>
          <div class="status-row"><span>問題數量</span><span>${issues.length}</span></div>
          <div class="status-row"><span>最後檢查</span><span>${graph.lastBuiltAt ? escapeHTML(graph.lastBuiltAt) : "-"}</span></div>
        </div>
        <div class="inspector-actions" style="margin-top: 12px;">
          <button class="secondary-btn" type="button" data-action="clean-wall-endpoints">整理端點</button>
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
        <b>Node Graph</b>
        <div class="status-grid">
          <div class="status-row"><span>node 數量</span><span>${graph.nodes.length}</span></div>
          <div class="status-row"><span>edge 數量</span><span>${graph.edges.length}</span></div>
          <div class="status-row"><span>intersection node</span><span>${intersectionCount}</span></div>
          <div class="status-row"><span>尚未切分交會</span><span>${unsplitIntersectionCount}</span></div>
          ${selectedNode ? `<div class="status-row"><span>選取 node</span><span>${escapeHTML(selectedNode.id)}</span></div>` : ""}
        </div>
        ${canSplitSelectedIssue ? `
          <div class="inspector-actions" style="margin-top: 12px;">
            <button class="toolbar-btn primary" type="button" data-action="split-wall-intersection">切分交會牆段</button>
          </div>
        ` : `<div class="inline-message" style="margin-top: 12px;">選取 wall-intersection issue 後，可以手動切分相關牆段。</div>`}
      </div>
    `;
  }

  function ensureGuideState() {
    if (!project.guide || typeof project.guide !== "object") {
      project.guide = createInitialGuideState();
    }
    project.guide.enabled = true;
    project.guide.mode = GUIDE_MODE;
    project.guide.apiBacked = false;
    project.guide.disclaimerAccepted = Boolean(project.guide.disclaimerAccepted);
    project.guide.currentStep = project.guide.currentStep || "start";
    project.guide.completedSteps = Array.isArray(project.guide.completedSteps) ? project.guide.completedSteps : [];
    project.guide.pendingSuggestions = Array.isArray(project.guide.pendingSuggestions) ? project.guide.pendingSuggestions : [];
    project.guide.resolvedSuggestionIds = Array.isArray(project.guide.resolvedSuggestionIds) ? project.guide.resolvedSuggestionIds : [];
    project.guide.lastUpdatedAt = project.guide.lastUpdatedAt || null;

    if (!Array.isArray(project.guideLog)) {
      project.guideLog = [];
    }
    if (!project.guideLog.length) {
      project.guideLog.push(createGuideWelcomeLog());
    }
    if (!Array.isArray(project.requirementNotes)) {
      project.requirementNotes = [];
    }
    if (!project.guideSummary || typeof project.guideSummary !== "object") {
      project.guideSummary = createInitialGuideSummary();
    }
    project.guideSummary.userIntent = Array.isArray(project.guideSummary.userIntent) ? project.guideSummary.userIntent : [];
    project.guideSummary.uncertainties = Array.isArray(project.guideSummary.uncertainties) ? project.guideSummary.uncertainties : [];
    project.guideSummary.budgetRelevantNotes = Array.isArray(project.guideSummary.budgetRelevantNotes) ? project.guideSummary.budgetRelevantNotes : [];
    project.guideSummary.contractorQuestions = Array.isArray(project.guideSummary.contractorQuestions) ? project.guideSummary.contractorQuestions : [];
    project.guideSummary.generatedAt = project.guideSummary.generatedAt || null;
  }

  function renderGuidePanel() {
    ensureGuideState();
    const pendingSuggestions = project.guide.pendingSuggestions || [];
    const selectedContext = getSelectedObjectGuideContext();
    const currentLayer = getCurrentLayer();
    const requirementCount = project.requirementNotes.filter((note) => note.source === "guide").length;
    const selectedLabel = selectedContext ? `${selectedContext.label} ${selectedContext.id}` : "未選取";

    return `
      <section class="status-card guide-panel" aria-label="平面拼圖引導官">
        <div class="guide-heading">
          <div>
            <b>平面拼圖引導官</b>
            <p>${escapeHTML(GUIDE_DISCLAIMER)}</p>
          </div>
          <span class="guide-mode">Local</span>
        </div>

        <div class="guide-disclaimer ${project.guide.disclaimerAccepted ? "is-accepted" : ""}">
          <span>${project.guide.disclaimerAccepted ? "已確認限制" : "請先確認：本工具只整理需求與操作引導，不提供正式設計或報價。"}</span>
          ${project.guide.disclaimerAccepted ? "" : `<button class="secondary-btn compact" type="button" data-action="guide-accept-disclaimer">我了解</button>`}
        </div>

        <div class="guide-status-grid" aria-label="對話狀態">
          <div><span>已記錄需求</span><strong>${requirementCount}</strong></div>
          <div><span>待確認建議</span><strong>${pendingSuggestions.length}</strong></div>
          <div><span>目前圖層</span><strong>${escapeHTML(getGuideLayerLabel(currentLayer))}</strong></div>
          <div><span>選取物件</span><strong>${escapeHTML(selectedLabel)}</strong></div>
        </div>

        <div class="guide-layer-row" aria-label="圖層建議切換">
          ${GUIDE_LAYER_OPTIONS.map((layer) => `
            <button class="guide-chip ${layer.value === currentLayer ? "is-active" : ""}" type="button" data-action="guide-set-layer" data-guide-layer="${escapeAttribute(layer.value)}">${escapeHTML(layer.label)}</button>
          `).join("")}
        </div>

        <div class="guide-thread" aria-live="polite">
          ${project.guideLog.map(renderGuideMessage).join("")}
        </div>

        <div class="guide-input-row">
          <textarea class="guide-input" data-field="guide-input" rows="3" placeholder="可以問我怎麼畫牆、怎麼標尺寸、哪些項目會影響預算……">${escapeHTML(uiState.guideInput)}</textarea>
          <button class="toolbar-btn primary" type="button" data-action="guide-send">送出</button>
        </div>

        <div class="guide-section-label">快速問題</div>
        <div class="guide-quick-grid">
          ${GUIDE_QUICK_QUESTIONS.map((question) => `
            <button class="guide-chip" type="button" data-action="guide-quick-question" data-guide-question="${escapeAttribute(question)}">${escapeHTML(question)}</button>
          `).join("")}
        </div>

        <div class="guide-section-label">引導流程</div>
        <div class="guide-action-grid">
          <button class="secondary-btn" type="button" data-action="guide-start-flow">開始引導</button>
          <button class="secondary-btn" type="button" data-action="guide-continue-flow">繼續下一步</button>
          <button class="secondary-btn" type="button" data-action="guide-capture-question">記錄目前疑問</button>
          <button class="secondary-btn" type="button" data-action="guide-generate-summary">產生需求摘要</button>
          <button class="danger-btn" type="button" data-action="guide-clear-chat">${uiState.guideClearPending ? "再按一次清除" : "清除本輪對話"}</button>
        </div>

        ${renderGuideFlowOptions()}
        ${renderGuideSuggestions()}
        <div class="guide-section-label">平面拼圖引導官操作</div>
        <div class="guide-action-grid">
          <button class="secondary-btn" type="button" data-action="guide-start-flow">開始引導</button>
          <button class="secondary-btn" type="button" data-action="guide-continue-flow">繼續下一步</button>
          <button class="secondary-btn" type="button" data-action="guide-capture-question">記錄目前疑問</button>
          <button class="secondary-btn" type="button" data-action="guide-generate-summary">產生需求摘要</button>
          <button class="danger-btn" type="button" data-action="guide-clear-chat">${uiState.guideClearPending ? "再按一次清除" : "清除本輪對話"}</button>
        </div>
        ${renderPlanPuzzleQuantityFactsCard()}
      </section>
    `;
  }

  function renderPlanPuzzleQuantityFactsCard() {
    const facts = syncPlanPuzzleQuantityFacts();
    const windows = facts.receivingWindows;
    return `
      <div class="status-card guide-facts-card">
        <b>平面拼圖引導官 / PlanPuzzleQuantityFacts</b>
        <div class="status-grid">
          <div class="status-row"><span>quantity_context_status</span><span>${escapeHTML(facts.quantity_context_status)}</span></div>
          <div class="status-row"><span>plan_quantity_facts_id</span><span>${escapeHTML(facts.id)}</span></div>
          <div class="status-row"><span>svg_artifact_id</span><span>${escapeHTML(windows.svg.artifactId)}</span></div>
          <div class="status-row"><span>zone window</span><span>${windows.zone.count} / ${escapeHTML(windows.zone.status)}</span></div>
          <div class="status-row"><span>wall length window</span><span>${windows.wallLength.wallCount} / ${escapeHTML(windows.wallLength.status)}</span></div>
          <div class="status-row"><span>opening window</span><span>${windows.openingCount.count} / ${escapeHTML(windows.openingCount.status)}</span></div>
        </div>
        <div class="project-readout">${escapeHTML(facts.disclaimer)}</div>
      </div>
    `;
  }

  function renderGuideMessage(entry) {
    const roleLabel = entry.role === "user" ? "你" : entry.role === "system" ? "系統" : "引導官";
    const typeLabel = getGuideLogTypeLabel(entry.type);
    const savedLabel = entry.savedToRequirements ? `<span class="guide-saved-label">已記錄</span>` : "";
    const canSave = entry.type !== "warning" && entry.type !== "summary";
    const saveButton = canSave && !entry.savedToRequirements
      ? `<button class="guide-save-button" type="button" data-action="guide-save-log" data-guide-log-id="${escapeAttribute(entry.id)}">記錄為需求</button>`
      : "";
    return `
      <article class="guide-message is-${escapeAttribute(entry.role)}">
        <div class="guide-message-meta">
          <span>${escapeHTML(roleLabel)} · ${escapeHTML(typeLabel)}</span>
          <time>${escapeHTML(formatGuideTime(entry.createdAt))}</time>
        </div>
        <div class="guide-message-text">${formatGuideText(entry.text)}</div>
        <div class="guide-message-foot">
          <span>${escapeHTML(getGuideLayerLabel(entry.layer || "floor_plan"))}${entry.selectedObjectType ? ` · ${escapeHTML(entry.selectedObjectType)}` : ""}</span>
          <span>${savedLabel}${saveButton}</span>
        </div>
      </article>
    `;
  }

  function renderGuideFlowOptions() {
    const currentStep = project.guide?.currentStep || "start";
    const options = GUIDE_FLOW_STEP_OPTIONS[currentStep] || [];
    if (!options.length) {
      return "";
    }
    return `
      <div class="guide-flow-options" aria-label="引導流程選項">
        ${options.map((option) => `
          <button class="guide-chip" type="button" data-action="guide-flow-option" data-guide-option="${escapeAttribute(option)}">${escapeHTML(option)}</button>
        `).join("")}
      </div>
    `;
  }

  function renderGuideSuggestions() {
    const pendingSuggestions = project.guide?.pendingSuggestions || [];
    if (!pendingSuggestions.length) {
      return `<div class="guide-reminder-empty">目前沒有待確認提醒。平面拼圖仍是需求整理，不會因提醒完成而變成正式施工圖或正式報價。</div>`;
    }
    return `
      <div class="guide-section-label">系統提醒 / 缺失清單</div>
      <div class="guide-reminder-list">
        ${pendingSuggestions.map((reminder) => `
          <div class="guide-reminder-card">
            <strong>${escapeHTML(reminder.text)}</strong>
            <span>${escapeHTML(getRequirementCategoryLabel(reminder.category))} · ${escapeHTML(getRequirementPriorityLabel(reminder.priority))}</span>
            <div class="guide-reminder-actions">
              <button type="button" data-action="guide-reminder-action" data-reminder-id="${escapeAttribute(reminder.id)}" data-reminder-action="budget">加入預算</button>
              <button type="button" data-action="guide-reminder-action" data-reminder-id="${escapeAttribute(reminder.id)}" data-reminder-action="ignore">忽略</button>
              <button type="button" data-action="guide-reminder-action" data-reminder-id="${escapeAttribute(reminder.id)}" data-reminder-action="ask_contractor">請廠商建議</button>
              <button type="button" data-action="guide-reminder-action" data-reminder-id="${escapeAttribute(reminder.id)}" data-reminder-action="note">記錄為備註</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function sendGuideInput() {
    ensureGuideState();
    const text = String(uiState.guideInput || "").trim();
    if (!text) {
      uiState.error = "";
      uiState.message = "請先輸入問題或需求。";
      render();
      return;
    }
    appendGuideLogEntry("user", inferUserGuideType(text), text);
    const response = resolveGuideResponse(text);
    appendGuideLogEntry("guide", response.type, response.text, {
      relatedReminderIds: response.relatedReminderIds
    });
    if (response.saveFallbackNote) {
      addRequirementNote(text, response.category || "uncertainty", "ask_contractor", {
        textPrefix: "待確認問題："
      });
    }
    uiState.guideInput = "";
    uiState.guideClearPending = false;
    render();
  }

  function handleGuideQuickQuestion(question) {
    const text = String(question || "").trim();
    if (!text) {
      return;
    }
    appendGuideLogEntry("user", "question", text);
    const response = resolveGuideResponse(text);
    appendGuideLogEntry("guide", response.type, response.text, {
      relatedReminderIds: response.relatedReminderIds
    });
    uiState.guideClearPending = false;
    render();
  }

  function startGuideFlow() {
    ensureGuideState();
    project.guide.currentStep = "start";
    project.guide.lastUpdatedAt = new Date().toISOString();
    appendGuideLogEntry("guide", "question", getGuideStepPrompt("start"));
    render();
  }

  function continueGuideFlow() {
    ensureGuideState();
    const currentStep = project.guide.currentStep || "start";
    if (currentStep === "plan_reminders") {
      appendGuideLogEntry("guide", "suggestion", buildReminderResponseText());
      markGuideStepCompleted("plan_reminders");
      project.guide.currentStep = "summary";
      appendGuideLogEntry("guide", "question", "提醒已列出。下一步可以產生需求摘要，整理給後續廠商閱讀。");
      render();
      return;
    }
    if (currentStep === "summary" || currentStep === "done") {
      generateGuideSummary(true);
      project.guide.currentStep = "done";
      render();
      return;
    }
    const nextStep = getNextGuideStep(currentStep);
    markGuideStepCompleted(currentStep);
    project.guide.currentStep = nextStep;
    project.guide.lastUpdatedAt = new Date().toISOString();
    appendGuideLogEntry("guide", nextStep === "plan_reminders" ? "suggestion" : "question", nextStep === "plan_reminders" ? buildReminderResponseText() : getGuideStepPrompt(nextStep));
    render();
  }

  function handleGuideFlowOption(option) {
    ensureGuideState();
    const text = String(option || "").trim();
    if (!text) {
      return;
    }
    const currentStep = project.guide.currentStep || "start";
    appendGuideLogEntry("user", "answer", text);
    addRequirementNote(text, getGuideStepCategory(currentStep, text), getGuideStepPriority(currentStep, text));
    markGuideStepCompleted(currentStep);

    let nextStep = getNextGuideStep(currentStep, text);
    let reply = `已記錄：「${text}」。`;
    if (nextStep === "plan_reminders") {
      reply = `${reply}\n\n${buildReminderResponseText()}`;
    } else if (nextStep === "summary" || nextStep === "done") {
      reply = `${reply}\n\n我可以幫你產生需求摘要，整理屋況、主要需求、不確定事項、需廠商建議與可能影響預算的項目。`;
    } else {
      reply = `${reply}\n\n${getGuideStepPrompt(nextStep)}`;
    }

    project.guide.currentStep = nextStep;
    project.guide.lastUpdatedAt = new Date().toISOString();
    appendGuideLogEntry("guide", nextStep === "plan_reminders" ? "suggestion" : "question", reply);
    render();
  }

  function captureGuideQuestion() {
    ensureGuideState();
    const typedText = String(uiState.guideInput || "").trim();
    const lastUserLog = [...project.guideLog].reverse().find((entry) => entry.role === "user");
    const text = typedText || lastUserLog?.text || "使用者目前有疑問，需請廠商或萊比協助確認。";
    if (typedText) {
      appendGuideLogEntry("user", "question", typedText);
    }
    addRequirementNote(text, "uncertainty", "ask_contractor", {
      textPrefix: "目前疑問："
    });
    appendGuideLogEntry("system", "message", "已將目前疑問記錄到 requirementNotes，後續可請廠商或萊比協助確認。");
    uiState.guideInput = "";
    render();
  }

  function generateGuideSummary(shouldLog) {
    ensureGuideState();
    const notes = project.requirementNotes.filter((note) => note.source === "guide" && note.includeInSummary !== false);
    const userLogs = project.guideLog.filter((entry) => entry.role === "user");
    const sourceItems = notes.length ? notes : userLogs.map((entry) => ({
      text: entry.text,
      category: inferRequirementCategory(entry.text, entry.layer),
      priority: inferRequirementPriority(entry.text)
    }));

    const userIntent = uniqueText(sourceItems
      .filter((item) => !["uncertainty", "professional_review", "budget"].includes(item.category))
      .map((item) => item.text))
      .slice(0, 8);
    const uncertainties = uniqueText(sourceItems
      .filter((item) => item.category === "uncertainty" || item.category === "professional_review" || item.priority === "ask_contractor" || containsAny(item.text, ["不確定", "疑問", "拆牆", "漏水", "壁癌", "裂縫", "海砂屋", "專業"]))
      .map((item) => item.text))
      .slice(0, 8);
    const budgetRelevantNotes = uniqueText(sourceItems
      .filter((item) => isBudgetRelevantCategory(item.category) || containsAny(item.text, ["預算", "拆除", "清運", "防水", "給排水", "插座", "櫃", "廚具", "空調", "材料", "五金"]))
      .map((item) => item.text))
      .slice(0, 10);
    const contractorQuestions = uniqueText(sourceItems
      .filter((item) => item.priority === "ask_contractor" || item.category === "professional_review" || containsAny(item.text, ["請廠商", "需專業", "場勘", "確認"]))
      .map((item) => item.text))
      .slice(0, 8);

    project.guideSummary = {
      userIntent,
      uncertainties,
      budgetRelevantNotes,
      contractorQuestions,
      generatedAt: new Date().toISOString()
    };

    const summaryText = [
      "目前已記錄：",
      `1. 屋況：${summarizeByKeywords(sourceItems, ["新成屋", "舊屋", "屋況", "漏水", "壁癌", "裂縫", "海砂屋"])}`,
      `2. 主要需求：${userIntent.length ? userIntent.join("；") : "尚未明確記錄"}`,
      `3. 不確定事項：${uncertainties.length ? uncertainties.join("；") : "尚未記錄"}`,
      `4. 需廠商建議：${contractorQuestions.length ? contractorQuestions.join("；") : "尚未記錄"}`,
      `5. 可能影響預算的項目：${budgetRelevantNotes.length ? budgetRelevantNotes.join("；") : "尚未記錄"}`
    ].join("\n");

    if (shouldLog) {
      appendGuideLogEntry("guide", "summary", summaryText);
    }
    return project.guideSummary;
  }

  function clearGuideChat() {
    ensureGuideState();
    if (!uiState.guideClearPending) {
      uiState.guideClearPending = true;
      appendGuideLogEntry("system", "warning", "清除本輪對話需要二次確認。再按一次「再按一次清除」才會清除 guideLog；已記錄的 requirementNotes 與 guideSummary 不會被刪除。");
      render();
      return;
    }
    project.guideLog = [createGuideWelcomeLog()];
    uiState.guideClearPending = false;
    project.guide.lastUpdatedAt = new Date().toISOString();
    appendGuideLogEntry("system", "message", "已清除本輪對話。需求備註與摘要仍保留在 draft JSON。");
    render();
  }

  function saveGuideLogToRequirement(logId) {
    ensureGuideState();
    const entry = project.guideLog.find((item) => item.id === logId);
    if (!entry) {
      return;
    }
    const note = addRequirementNote(entry.text, inferRequirementCategory(entry.text, entry.layer), inferRequirementPriority(entry.text), {
      relatedObjectId: entry.selectedObjectId
    });
    entry.savedToRequirements = true;
    appendGuideLogEntry("system", "message", `已將訊息記錄為需求備註：${note.id}`);
    render();
  }

  function handleGuideReminderAction(reminderId, reminderAction) {
    ensureGuideState();
    const reminder = getGuideSystemReminders({ includeResolved: true }).find((item) => item.id === reminderId)
      || (project.guide.pendingSuggestions || []).find((item) => item.id === reminderId);
    if (!reminder) {
      return;
    }
    const action = String(reminderAction || "");
    if (action === "ignore") {
      markGuideSuggestionResolved(reminder.id);
      appendGuideLogEntry("system", "message", `已忽略提醒：「${reminder.text}」。`);
    } else if (action === "ask_contractor") {
      addRequirementNote(reminder.text, reminder.category || "other", "ask_contractor", {
        textPrefix: "請廠商建議：",
        relatedReminderIds: [reminder.id]
      });
      markGuideSuggestionResolved(reminder.id);
      appendGuideLogEntry("system", "suggestion", `已記錄為需廠商建議：「${reminder.text}」。`);
    } else if (action === "budget") {
      addRequirementNote(reminder.text, reminder.category || "budget", "must", {
        textPrefix: "預算候選提醒：",
        relatedReminderIds: [reminder.id]
      });
      markGuideSuggestionResolved(reminder.id);
      appendGuideLogEntry("system", "warning", "已記錄為預算候選提醒，但不會直接送進 budget runtime，也不是正式報價依據。");
    } else {
      addRequirementNote(reminder.text, reminder.category || "other", reminder.priority || "optional", {
        textPrefix: "備註：",
        relatedReminderIds: [reminder.id]
      });
      markGuideSuggestionResolved(reminder.id);
      appendGuideLogEntry("system", "message", `已記錄為備註：「${reminder.text}」。`);
    }
    syncGuideSuggestions();
    render();
  }

  function setGuideLayer(layer) {
    const nextLayer = GUIDE_LAYER_OPTIONS.some((item) => item.value === layer) ? layer : "floor_plan";
    uiState.currentLayer = nextLayer;
    appendGuideLogEntry("guide", "suggestion", getGuideLayerAdvice(nextLayer));
    render();
  }

  function acceptGuideDisclaimer() {
    ensureGuideState();
    project.guide.disclaimerAccepted = true;
    project.guide.lastUpdatedAt = new Date().toISOString();
    appendGuideLogEntry("system", "message", "已確認：平面拼圖引導官只提供需求整理與操作引導，不代表正式設計、施工圖、結構判斷或正式報價。");
    render();
  }

  function resolveGuideResponse(text) {
    const normalized = normalizeGuideText(text);
    const selectedContext = getSelectedObjectGuideContext();
    if (containsAnyNormalized(normalized, ["還缺什麼", "缺什麼", "漏掉", "提醒", "待確認", "缺失"])) {
      const reminders = getGuideSystemReminders();
      return {
        type: "suggestion",
        text: buildReminderResponseText(reminders),
        relatedReminderIds: reminders.map((item) => item.id)
      };
    }
    if (selectedContext && containsAnyNormalized(normalized, ["這個物件", "選取物件", "會不會進預算", "還缺", "需要專業", "可以怎麼修改", "這是什麼"])) {
      return {
        type: "answer",
        text: `${getSelectedObjectGuideAdvice(selectedContext)}\n\n${getGuideLayerAdvice(getCurrentLayer())}`,
        relatedReminderIds: []
      };
    }
    if (containsAnyNormalized(normalized, ["目前圖層", "這個圖層", "圖層建議"])) {
      return {
        type: "answer",
        text: getGuideLayerAdvice(getCurrentLayer()),
        relatedReminderIds: []
      };
    }

    const knowledge = matchGuideKnowledge(text);
    if (knowledge) {
      const reminders = project.guide?.pendingSuggestions || [];
      const contextLine = selectedContext && containsAnyNormalized(normalized, ["預算", "缺", "專業", "修改", "選取", "物件"])
        ? `\n\n選取物件建議：${getSelectedObjectGuideAdvice(selectedContext)}`
        : "";
      const reminderLine = reminders.length ? `\n\n目前有 ${reminders.length} 項提醒待確認，可以在下方選擇加入預算、忽略、請廠商建議或記錄為備註。` : "";
      return {
        type: "answer",
        text: `${knowledge.text}\n\n目前圖層建議：${getGuideLayerAdvice(getCurrentLayer())}${contextLine}${reminderLine}`,
        relatedReminderIds: reminders.map((item) => item.id)
      };
    }

    return {
      type: "warning",
      text: GUIDE_FALLBACK_MESSAGE,
      relatedReminderIds: [],
      saveFallbackNote: true,
      category: "uncertainty"
    };
  }

  function matchGuideKnowledge(text) {
    const normalized = normalizeGuideText(text);
    let bestMatch = null;
    let bestScore = 0;
    GUIDE_KNOWLEDGE.forEach((entry) => {
      const score = (entry.keywords || []).reduce((sum, keyword) => {
        const normalizedKeyword = normalizeGuideText(keyword);
        return normalizedKeyword && normalized.includes(normalizedKeyword) ? sum + 1 : sum;
      }, 0);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    });
    return bestMatch;
  }

  function appendGuideLogEntry(role, type, text, options = {}) {
    ensureGuideState();
    const entry = createGuideLogEntry(role, type, text, options);
    project.guideLog.push(entry);
    project.guide.lastUpdatedAt = entry.createdAt;
    return entry;
  }

  function createGuideLogEntry(role, type, text, options = {}) {
    const selectedContext = getSelectedObjectGuideContext();
    return {
      id: createId("guide-log"),
      role,
      type,
      text: String(text || ""),
      layer: options.layer || getCurrentLayer(),
      selectedObjectId: options.selectedObjectId ?? selectedContext?.id ?? null,
      selectedObjectType: options.selectedObjectType ?? selectedContext?.type ?? null,
      relatedReminderIds: Array.isArray(options.relatedReminderIds) ? options.relatedReminderIds : [],
      createdAt: options.createdAt || new Date().toISOString(),
      savedToRequirements: Boolean(options.savedToRequirements)
    };
  }

  function addRequirementNote(text, category, priority, options = {}) {
    ensureGuideState();
    const selectedContext = getSelectedObjectGuideContext();
    const note = {
      id: createId("guide-note"),
      source: "guide",
      text: `${options.textPrefix || ""}${String(text || "").trim()}`,
      category: normalizeRequirementCategory(category || inferRequirementCategory(text, getCurrentLayer())),
      layer: options.layer || getCurrentLayer(),
      relatedObjectId: options.relatedObjectId ?? selectedContext?.id ?? null,
      priority: normalizeRequirementPriority(priority || inferRequirementPriority(text)),
      includeInSummary: true,
      createdAt: new Date().toISOString()
    };
    if (Array.isArray(options.relatedReminderIds) && options.relatedReminderIds.length) {
      note.relatedReminderIds = options.relatedReminderIds;
    }
    project.requirementNotes.push(note);
    project.guide.lastUpdatedAt = note.createdAt;
    return note;
  }

  function syncGuideSuggestions() {
    if (!project.guide) {
      return;
    }
    const nextSuggestions = getGuideSystemReminders();
    const currentSerialized = JSON.stringify(project.guide.pendingSuggestions || []);
    const nextSerialized = JSON.stringify(nextSuggestions);
    if (currentSerialized !== nextSerialized) {
      project.guide.pendingSuggestions = nextSuggestions;
      project.guide.lastUpdatedAt = new Date().toISOString();
    }
  }

  function getGuideSystemReminders(options = {}) {
    const includeResolved = Boolean(options.includeResolved);
    const resolvedIds = new Set(project.guide?.resolvedSuggestionIds || []);
    const reminders = [];
    const addReminder = (id, text, category = "other", priority = "ask_contractor", extra = {}) => {
      if (!id || reminders.some((item) => item.id === id)) {
        return;
      }
      reminders.push({
        id,
        text,
        category,
        priority,
        layer: extra.layer || getCurrentLayer(),
        relatedObjectId: extra.relatedObjectId || null,
        relatedReminderIds: extra.relatedReminderIds || []
      });
    };

    (project.systemReminders || []).forEach((reminder, index) => {
      const id = reminder.id || `system-reminder-${index + 1}`;
      addReminder(
        id,
        reminder.text || reminder.message || "有一項系統提醒待確認。",
        reminder.category || "other",
        reminder.priority || "ask_contractor",
        { relatedObjectId: reminder.relatedObjectId || null }
      );
    });

    if (!project.underlay || !project.importSource) {
      addReminder("missing-underlay", "你還沒有匯入底圖。建議先匯入丈量圖或平面草圖，再校正比例。", "layout", "must", { layer: "floor_plan" });
    }
    if (!project.scale?.calibrated) {
      addReminder("missing-scale", "你還沒有校正比例。比例會影響尺寸判讀與後續需求整理。", "layout", "must", { layer: "floor_plan" });
    }
    if (!project.zones?.length) {
      addReminder("missing-zone-labels", "你還沒有標空間名稱。建議先標客廳、房間、廚房、浴室等空間，讓廠商更容易理解需求。", "layout", "must", { layer: "floor_plan" });
    }
    if (!hasMaterialRequirementNote()) {
      addReminder("missing-material-level", "你還沒有選材料或設備等級。可先記錄省預算、標準、質感優先或請廠商建議。", "material", "ask_contractor");
    }
    if (hasDemolitionSignal()) {
      addReminder("demolition-hauling", "你有拆除項目，預算候選提醒會涉及清運與雜工；仍需廠商依現場確認。", "demolition", "must", { layer: "demolition_plan" });
    }
    if (hasBathroomSignal()) {
      addReminder("bathroom-waterproofing", "你有浴室或浴室地坪相關需求，建議確認防水與試水項目。", "bathroom", "must", { layer: "flooring_plan" });
    }
    if (hasKitchenSignal()) {
      addReminder("kitchen-outlet-plumbing", "你有廚具或廚房需求，建議確認插座、弱電、給排水與設備位置。", "kitchen", "ask_contractor", { layer: "floor_plan" });
    }
    if (hasAcSignal()) {
      addReminder("ac-condition", "你有空調需求，建議確認新舊屋條件、排水路徑與不要直吹床等偏好。", "ac", "ask_contractor", { layer: "ac_plan" });
    }
    if ((project.wallGraph?.issues || []).length) {
      addReminder("wall-graph-issues", `目前有 ${(project.wallGraph?.issues || []).length} 項牆線提醒待確認，建議先處理端點、重疊或交會問題。`, "layout", "ask_contractor", { layer: "floor_plan" });
    }
    if (hasProfessionalReviewSignal()) {
      addReminder("professional-review", "有拆牆、結構、漏水、壁癌、裂縫或海砂屋疑慮時，請標記為需專業或場勘確認，不要直接當成可施工。", "professional_review", "ask_contractor");
    }

    if (includeResolved) {
      return reminders;
    }
    return reminders.filter((reminder) => !resolvedIds.has(reminder.id));
  }

  function buildReminderResponseText(reminders = getGuideSystemReminders()) {
    if (!reminders.length) {
      return "目前沒有待確認提醒。仍建議確認比例、空間名稱、材料偏好與需廠商判斷的項目。";
    }
    return [
      `目前有 ${reminders.length} 項提醒待確認：`,
      ...reminders.map((reminder, index) => `${index + 1}. ${reminder.text}`),
      "每一項都可以在下方選擇：加入預算、忽略、請廠商建議，或記錄為備註。加入預算只會寫成需求紀錄，不會進正式估價。"
    ].join("\n");
  }

  function getCurrentLayer() {
    const currentLayer = uiState.currentLayer || "floor_plan";
    return GUIDE_LAYER_OPTIONS.some((layer) => layer.value === currentLayer) ? currentLayer : "floor_plan";
  }

  function getGuideLayerLabel(layer) {
    return GUIDE_LAYER_OPTIONS.find((item) => item.value === layer)?.label || "平面配置圖";
  }

  function getGuideLayerAdvice(layer = getCurrentLayer()) {
    if (layer === "demolition_plan") {
      return "拆除圖只需標示要拆除的項目。清運與垃圾車數量會在預算候選提醒中處理，不需要你自己畫成正式估價。";
    }
    if (layer === "flooring_plan") {
      return "地坪圖用來標示地坪材料與範圍。若是浴室地坪，系統會提醒防水與試水需要確認。";
    }
    if (layer === "lighting_plan") {
      return "燈具配置以需求整理為主，你可以補充想要明亮、溫暖或情境燈；實際迴路仍需專業確認。";
    }
    if (layer === "ac_plan") {
      return "空調位置由系統依空間與冷房需求做本地提醒，你只需要補充例如不要吹床、每房一台、排水路徑等偏好。";
    }
    return "平面配置圖主要用來放牆、門窗、櫃體、廚具與空間標籤。它是需求整理，不是正式施工圖。";
  }

  function getSelectedObjectGuideContext() {
    const wall = getSelectedWall();
    if (wall) {
      return { id: wall.id, type: "wall", label: "牆體", object: wall };
    }
    const opening = getSelectedOpening();
    if (opening) {
      return { id: opening.id, type: "opening", label: getOpeningKindLabel(opening.kind), object: opening };
    }
    const zone = getSelectedZone();
    if (zone) {
      return { id: zone.id, type: "zone", label: "空間標籤", object: zone };
    }
    const issue = getSelectedIssue();
    if (issue) {
      return { id: issue.id, type: "issue", label: "系統提醒", object: issue };
    }
    return null;
  }

  function getSelectedObjectGuideAdvice(context = getSelectedObjectGuideContext()) {
    if (!context) {
      return "目前沒有選取物件。你可以先點選牆、門窗或空間標籤，我會依選取物件提醒還缺哪些資料。";
    }
    if (context.type === "wall") {
      const wall = context.object;
      const statusText = getWallStatusLabel(wall.status);
      return `這是一段牆體，目前標示為「${statusText}」。若它是新設牆，厚度會影響需求整理；若是既有牆、承重牆或要拆除，開口與拆除都需要專業確認。`;
    }
    if (context.type === "opening") {
      const opening = context.object;
      return `這是${getOpeningKindLabel(opening.kind)}。寬度、位置、開啟方向與窗台高度會影響廠商理解需求，但仍不是正式施工尺寸。`;
    }
    if (context.type === "zone") {
      const zone = context.object;
      return `這是空間標籤「${zone.name || getZoneTypeLabel(zone.type)}」。若已有 boundary 與 area metadata，可以作為需求整理參考，但仍不是正式面積報價。`;
    }
    if (context.type === "issue") {
      return `這是系統提醒：「${context.object.message || context.object.type}」。建議先確認牆端點、重疊或交會狀態，必要時請廠商協助判讀。`;
    }
    return "這個物件可作需求整理參考，但仍不是正式施工圖或正式報價依據。";
  }

  function getOpeningKindLabel(kind) {
    if (kind === "door") {
      return "門";
    }
    if (kind === "window") {
      return "窗";
    }
    return "開口";
  }

  function getGuideStepPrompt(step) {
    if (step === "house_condition") {
      return "這是新成屋還是舊屋？";
    }
    if (step === "old_house_details") {
      return "舊屋我會先幫你記錄需求，不做專業判斷。是否有現況照片、漏水 / 壁癌 / 裂縫 / 海砂屋疑慮，或舊櫃體與舊裝潢需要拆除？";
    }
    if (step === "main_needs") {
      return "這次主要想處理哪些項目？";
    }
    if (step === "budget_preference") {
      return "你的預算方向比較偏哪一種？";
    }
    if (step === "plan_reminders") {
      return buildReminderResponseText();
    }
    if (step === "summary") {
      return "我可以產生需求摘要，整理屋況、主要需求、不確定事項、需廠商建議與可能影響預算的項目。";
    }
    return "你想先從哪裡開始？可以先匯入丈量圖，或先告訴我你想改哪些地方。";
  }

  function getNextGuideStep(step, answerText = "") {
    if (step === "start") {
      return "house_condition";
    }
    if (step === "house_condition") {
      return String(answerText).includes("舊屋") ? "old_house_details" : "main_needs";
    }
    if (step === "old_house_details") {
      return "main_needs";
    }
    if (step === "main_needs") {
      return "budget_preference";
    }
    if (step === "budget_preference") {
      return "plan_reminders";
    }
    if (step === "plan_reminders") {
      return "summary";
    }
    if (step === "summary") {
      return "done";
    }
    return "start";
  }

  function markGuideStepCompleted(step) {
    ensureGuideState();
    if (!step || project.guide.completedSteps.includes(step)) {
      return;
    }
    project.guide.completedSteps.push(step);
  }

  function markGuideSuggestionResolved(reminderId) {
    ensureGuideState();
    if (!project.guide.resolvedSuggestionIds.includes(reminderId)) {
      project.guide.resolvedSuggestionIds.push(reminderId);
    }
    project.guide.pendingSuggestions = (project.guide.pendingSuggestions || []).filter((item) => item.id !== reminderId);
    project.guide.lastUpdatedAt = new Date().toISOString();
  }

  function getGuideStepCategory(step, text) {
    if (step === "budget_preference") {
      return "budget";
    }
    if (step === "old_house_details") {
      return containsAny(text, ["漏水", "壁癌", "裂縫", "海砂屋"]) ? "professional_review" : "demolition";
    }
    if (step === "house_condition") {
      return "other";
    }
    return inferRequirementCategory(text, getCurrentLayer());
  }

  function getGuideStepPriority(step, text) {
    if (step === "budget_preference") {
      return text.includes("請廠商") ? "ask_contractor" : "nice_to_have";
    }
    if (containsAny(text, ["不確定", "請廠商", "漏水", "壁癌", "裂縫", "海砂屋"])) {
      return "ask_contractor";
    }
    return "must";
  }

  function inferUserGuideType(text) {
    return /[?？]|怎麼|如何|什麼|為什麼/.test(String(text)) ? "question" : "answer";
  }

  function inferRequirementCategory(text, layer = getCurrentLayer()) {
    const value = String(text || "");
    if (containsAny(value, ["格局", "牆", "門", "窗", "空間", "比例", "尺寸", "施工圖", "平面"])) {
      return "layout";
    }
    if (containsAny(value, ["拆除", "拆牆", "清運", "垃圾"])) {
      return "demolition";
    }
    if (containsAny(value, ["木作", "櫃體", "系統櫃", "五金"])) {
      return "cabinet";
    }
    if (containsAny(value, ["廚具", "廚房"])) {
      return "kitchen";
    }
    if (containsAny(value, ["浴室", "防水", "試水"])) {
      return "bathroom";
    }
    if (containsAny(value, ["地坪", "地板", "磁磚"])) {
      return "flooring";
    }
    if (containsAny(value, ["天花"])) {
      return "ceiling";
    }
    if (containsAny(value, ["燈具", "照明", "情境燈"])) {
      return "lighting";
    }
    if (containsAny(value, ["插座", "弱電", "網路"])) {
      return "outlet_low_voltage";
    }
    if (containsAny(value, ["給排水", "排水", "水管"])) {
      return "plumbing";
    }
    if (containsAny(value, ["空調", "冷氣"])) {
      return "ac";
    }
    if (containsAny(value, ["材料", "材質", "設備", "五金"])) {
      return "material";
    }
    if (containsAny(value, ["預算", "報價", "估價", "價格"])) {
      return "budget";
    }
    if (containsAny(value, ["不確定", "疑問", "不知道"])) {
      return "uncertainty";
    }
    if (containsAny(value, ["專業", "結構", "法規", "海砂屋", "漏水", "壁癌", "裂縫", "承重"])) {
      return "professional_review";
    }
    if (layer === "demolition_plan") {
      return "demolition";
    }
    if (layer === "flooring_plan") {
      return "flooring";
    }
    if (layer === "lighting_plan") {
      return "lighting";
    }
    if (layer === "ac_plan") {
      return "ac";
    }
    return "other";
  }

  function inferRequirementPriority(text) {
    const value = String(text || "");
    if (containsAny(value, ["必須", "一定", "要做", "加入預算", "防水", "拆除"])) {
      return "must";
    }
    if (containsAny(value, ["希望", "偏好", "質感", "標準"])) {
      return "nice_to_have";
    }
    if (containsAny(value, ["不確定", "請廠商", "專業", "場勘", "漏水", "壁癌", "裂縫", "海砂屋", "承重"])) {
      return "ask_contractor";
    }
    return "optional";
  }

  function normalizeRequirementCategory(category) {
    const allowed = new Set(["layout", "demolition", "cabinet", "kitchen", "bathroom", "flooring", "ceiling", "lighting", "outlet_low_voltage", "plumbing", "ac", "material", "budget", "uncertainty", "professional_review", "other"]);
    return allowed.has(category) ? category : "other";
  }

  function normalizeRequirementPriority(priority) {
    const allowed = new Set(["must", "nice_to_have", "optional", "ask_contractor"]);
    return allowed.has(priority) ? priority : "optional";
  }

  function getRequirementCategoryLabel(category) {
    const labels = {
      layout: "格局",
      demolition: "拆除",
      cabinet: "櫃體",
      kitchen: "廚房",
      bathroom: "浴室",
      flooring: "地坪",
      ceiling: "天花",
      lighting: "燈具",
      outlet_low_voltage: "插座 / 弱電",
      plumbing: "給排水",
      ac: "空調",
      material: "材料",
      budget: "預算候選",
      uncertainty: "不確定",
      professional_review: "專業確認",
      other: "其他"
    };
    return labels[category] || labels.other;
  }

  function getRequirementPriorityLabel(priority) {
    const labels = {
      must: "必須確認",
      nice_to_have: "偏好",
      optional: "備註",
      ask_contractor: "請廠商建議"
    };
    return labels[priority] || labels.optional;
  }

  function isBudgetRelevantCategory(category) {
    return ["budget", "demolition", "cabinet", "kitchen", "bathroom", "flooring", "ceiling", "lighting", "outlet_low_voltage", "plumbing", "ac", "material"].includes(category);
  }

  function hasMaterialRequirementNote() {
    return (project.requirementNotes || []).some((note) => note.category === "material" || note.category === "budget" || containsAny(note.text, ["材料", "材質", "設備", "省預算", "標準", "質感"]));
  }

  function hasDemolitionSignal() {
    return (project.walls || []).some((wall) => wall.status === "demolished")
      || (project.requirementNotes || []).some((note) => note.category === "demolition" || containsAny(note.text, ["拆除", "拆牆", "清運"]));
  }

  function hasBathroomSignal() {
    return (project.zones || []).some((zone) => zone.type === "bathroom" || containsAny(zone.name, ["浴室", "廁所"]))
      || (project.requirementNotes || []).some((note) => note.category === "bathroom" || containsAny(note.text, ["浴室", "防水", "試水"]));
  }

  function hasKitchenSignal() {
    return (project.zones || []).some((zone) => zone.type === "kitchen" || containsAny(zone.name, ["廚房", "廚具"]))
      || (project.requirementNotes || []).some((note) => note.category === "kitchen" || containsAny(note.text, ["廚房", "廚具", "給排水", "插座"]));
  }

  function hasAcSignal() {
    return getCurrentLayer() === "ac_plan"
      || (project.requirementNotes || []).some((note) => note.category === "ac" || containsAny(note.text, ["空調", "冷氣", "排水"]));
  }

  function hasProfessionalReviewSignal() {
    return (project.walls || []).some((wall) => wall.structural || wall.status === "demolished")
      || (project.requirementNotes || []).some((note) => note.category === "professional_review" || containsAny(note.text, ["拆牆", "承重", "結構", "法規", "漏水", "壁癌", "裂縫", "海砂屋"]));
  }

  function formatGuideText(text) {
    return escapeHTML(text).replace(/\n/g, "<br>");
  }

  function formatGuideTime(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleTimeString("zh-Hant", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getGuideLogTypeLabel(type) {
    const labels = {
      message: "訊息",
      question: "問題",
      answer: "回答",
      suggestion: "建議",
      warning: "提醒",
      summary: "摘要"
    };
    return labels[type] || "訊息";
  }

  function summarizeByKeywords(items, keywords) {
    const matches = uniqueText(items.filter((item) => containsAny(item.text, keywords)).map((item) => item.text));
    return matches.length ? matches.slice(0, 4).join("；") : "尚未明確記錄";
  }

  function uniqueText(items) {
    return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
  }

  function containsAny(value, keywords) {
    const normalized = normalizeGuideText(value);
    return keywords.some((keyword) => normalized.includes(normalizeGuideText(keyword)));
  }

  function containsAnyNormalized(normalizedValue, keywords) {
    return keywords.some((keyword) => normalizedValue.includes(normalizeGuideText(keyword)));
  }

  function normalizeGuideText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, "");
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
            <p>Sandbox Preview。僅展示案件上架與風格溝通方向，不接 production，不保存正式案件。</p>
          </div>
          <span class="visual-sim-status ${statusClass}">${escapeHTML(statusBadgeText)}</span>
        </div>

        <div class="sandbox-label-row" aria-label="sandbox labels">
          <span class="sandbox-label">Sandbox Preview</span>
          <span class="sandbox-label">AI 示意圖</span>
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
          <div class="status-row"><span>Proxy</span><span>${escapeHTML(getStyleVisualProxyStatusText(styleVisualTask.proxyStatus))}</span></div>
          <div class="status-row"><span>用途</span><span>${escapeHTML(styleVisualRequest.purpose)}</span></div>
          <div class="status-row"><span>Reference image</span><span>${referenceImagePolicy.allowed ? "enabled" : "disabled"}</span></div>
        </div>

        <div class="reference-image-notice">${escapeHTML(referenceImagePolicy.notice)}</div>

        ${renderStyleTags()}

        <div class="prompt-preview">
          <strong>AI Prompt Preview</strong>
          ${escapeHTML(promptPreview)}
        </div>

        <div class="prompt-preview sandbox-prompt-preview">
          <strong>Sanitized Prompt</strong>
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

    return `<div class="tag-row" aria-label="style tags">${tags.map((tag) => `<span class="style-tag">${escapeHTML(tag)}</span>`).join("")}</div>`;
  }

  function renderStyleVisualPreviewCard(briefText, promptPreview, generatedPreview) {
    const isReady = styleVisualTask.status === "ready";
    const isDrafting = styleVisualTask.status === "drafting";
    const moodLabel = isReady ? "SANDBOX PREVIEW" : isDrafting ? "DRAFTING" : "WAITING";
    const previewState = generatedPreview?.status || styleVisualTask.proxyStatus || "disabled";
    const previewMessage = generatedPreview?.message || STYLE_VISUAL_PROXY_DISABLED_MESSAGE;
    const storageLabel = generatedPreview ? "styleVisualTask.generatedPreview" : "local task state pending";
    const temporaryImageUrl = generatedPreview?.temporaryImageUrl || "not-created-proxy-disabled";
    const cardBrief = isReady ? briefText : isDrafting
      ? "正在將空間、風格、色調與材質語彙整理成示意方向。"
      : "按下生成後，這裡會顯示案件風格示意預覽卡。";

    return `
      <article class="visual-preview-card" aria-label="AI 示意圖預覽卡">
        <div class="visual-mock-image sandbox-generated-frame${previewState === "disabled" ? " is-disabled" : ""}" aria-label="temporary sandbox image preview">
          <div class="visual-mock-overlay">
            <span class="mood-label">${escapeHTML(moodLabel)}</span>
            <span class="disclaimer-badge">AI 示意圖</span>
          </div>
          <div class="sandbox-fallback-message">${escapeHTML(previewMessage)}</div>
        </div>
        <div class="visual-preview-body">
          <div class="sandbox-label-row" aria-label="preview sandbox labels">
            <span class="sandbox-label">Sandbox Preview</span>
            <span class="sandbox-label">AI 示意圖</span>
            <span class="sandbox-label is-warning">非正式圖片</span>
            <span class="sandbox-label">不會保存到正式案件</span>
            <span class="sandbox-label">非真實案例</span>
            <span class="sandbox-label">非正式成果</span>
          </div>
          <div class="status-row"><span>空間類型</span><span>${escapeHTML(styleVisualRequest.roomType)}</span></div>
          <div class="status-row"><span>Preview 狀態</span><span>${escapeHTML(getStyleVisualProxyStatusText(previewState))}</span></div>
          <div class="status-row"><span>儲存範圍</span><span>${escapeHTML(storageLabel)}</span></div>
          <div class="status-row"><span>Temporary URL</span><span>${escapeHTML(temporaryImageUrl)}</span></div>
          ${renderStyleTags()}
          <p class="visual-brief">${escapeHTML(cardBrief)}</p>
          <div class="prompt-preview">
            <strong>Sample prompt text</strong>
            ${escapeHTML(promptPreview)}
          </div>
          <span class="disclaimer-badge" style="width: fit-content;">非正式成果</span>
        </div>
      </article>
    `;
  }

  function getStyleVisualPlaceholderBrief(status) {
    if (status === "drafting") {
      return "AI 正在整理風格方向，稍後會建立可供案件上架參考的 visual brief。";
    }
    return "尚未生成風格示意。輸入風格需求後，可建立 visual brief、style tags 與 prompt preview。";
  }

  function getStyleVisualStatusText(status) {
    if (status === "drafting") {
      return "AI 正在整理風格方向…";
    }
    if (status === "ready") {
      return "Sandbox 預覽已建立";
    }
    return "尚未生成風格示意";
  }

  function getStyleVisualStatusBadgeText(status) {
    if (status === "ready") {
      return "Sandbox 預覽已建立";
    }
    return status;
  }

  function getStyleVisualProxyStatusText(status) {
    if (status === "drafting") {
      return "正在建立 styleVisualApiRequest…";
    }
    if (status === "mock_ready") {
      return "Sandbox 預覽已建立";
    }
    if (status === "error") {
      return "Server-side Image API proxy 發生錯誤";
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
        <b>Plancraft Bridge</b>
        <div class="status-grid">
          <div class="status-row"><span>狀態</span><span>${escapeHTML(bridge.status)}</span></div>
          <div class="status-row"><span>目標格式</span><span>${escapeHTML(bridge.targetFormat)}</span></div>
          <div class="status-row"><span>DSL validation</span><span>${escapeHTML(validation.status)}</span></div>
          <div class="status-row"><span>renderer preview</span><span>${escapeHTML(preview.status)}</span></div>
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
      ? `<div class="inline-message">靜態頁尚未直接載入 Plancraft DSL；請使用本機驗證流程確認 .pc。</div>`
      : "";
    const validationWarningList = validation.warnings.length
      ? `<div class="issue-list">${validation.warnings.map((warning) => `<div class="issue-button" role="status"><strong>validation warning</strong>${escapeHTML(warning)}</div>`).join("")}</div>`
      : "";
    const validationErrorList = validation.errors.length
      ? `<div class="issue-list">${validation.errors.map((error) => `<div class="issue-button" role="status"><strong>validation error</strong>${escapeHTML(error)}</div>`).join("")}</div>`
      : "";
    const warningList = report.warnings?.length
      ? `<div class="issue-list">${report.warnings.map((warning) => `<div class="issue-button" role="status"><strong>warning</strong>${escapeHTML(warning)}</div>`).join("")}</div>`
      : `<div class="inline-message">尚未產生 converter warnings。</div>`;
    const errorList = report.errors?.length
      ? `<div class="issue-list">${report.errors.map((error) => `<div class="issue-button" role="status"><strong>error</strong>${escapeHTML(error)}</div>`).join("")}</div>`
      : "";

    return `
      <div class="status-card">
        <b>Converter Report</b>
        <div class="status-grid">
          <div class="status-row"><span>converter status</span><span>${escapeHTML(report.status)}</span></div>
          <div class="status-row"><span>roomCount</span><span>${summary.roomCount}</span></div>
          <div class="status-row"><span>wallCount</span><span>${summary.wallCount}</span></div>
          <div class="status-row"><span>openingCount</span><span>${summary.openingCount}</span></div>
          <div class="status-row"><span>skippedZoneCount</span><span>${summary.skippedZoneCount}</span></div>
          <div class="status-row"><span>skippedOpeningCount</span><span>${summary.skippedOpeningCount}</span></div>
          <div class="status-row"><span>exportedAt</span><span>${report.exportedAt ? escapeHTML(report.exportedAt) : "-"}</span></div>
          <div class="status-row"><span>validation status</span><span>${escapeHTML(validation.status)}</span></div>
          <div class="status-row"><span>validation checkedAt</span><span>${validation.checkedAt ? escapeHTML(validation.checkedAt) : "-"}</span></div>
          <div class="status-row"><span>next action</span><span>${escapeHTML(getPcValidationNextAction(validation))}</span></div>
        </div>
        <div class="project-readout">${escapeHTML(PC_SPIKE_NOTICE)}</div>
        <div class="project-readout">${escapeHTML(validation.reason)}</div>
        ${validationNotice}
        <div class="inspector-actions" style="margin-top: 12px;">
          <button class="toolbar-btn primary" type="button" data-action="export-pc-spike">匯出 Plancraft .pc 測試版</button>
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
      ? `<div class="inline-message">靜態頁尚未直接載入 Plancraft renderer；請使用本機 CLI compile 產生 SVG 預覽。</div>`
      : "";
    const previewWarningList = preview.warnings.length
      ? `<div class="issue-list">${preview.warnings.map((warning) => `<div class="issue-button" role="status"><strong>preview warning</strong>${escapeHTML(warning)}</div>`).join("")}</div>`
      : "";
    const previewErrorList = preview.errors.length
      ? `<div class="issue-list">${preview.errors.map((error) => `<div class="issue-button" role="status"><strong>preview error</strong>${escapeHTML(error)}</div>`).join("")}</div>`
      : "";

    return `
      <div class="status-card">
        <b>Renderer Preview Report</b>
        <div class="status-grid">
          <div class="status-row"><span>preview status</span><span>${escapeHTML(preview.status)}</span></div>
          <div class="status-row"><span>checkedAt</span><span>${preview.checkedAt ? escapeHTML(preview.checkedAt) : "-"}</span></div>
          <div class="status-row"><span>SVG output path</span><span>${preview.svgOutputPath ? escapeHTML(preview.svgOutputPath) : "-"}</span></div>
          <div class="status-row"><span>next action</span><span>${escapeHTML(getRendererPreviewNextAction(preview))}</span></div>
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
      scaleStatusText.textContent = project.scale.calibrated ? "已校正" : "尚未校正";
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
    const guideInput = document.querySelector('[data-field="guide-input"]');
    if (guideInput) {
      guideInput.placeholder = "可以問我怎麼畫牆、怎麼標尺寸、哪些項目會影響預算……";
    }
    document.querySelectorAll('[data-action="guide-send"]').forEach((button) => {
      button.textContent = "送出";
    });
    document.querySelectorAll("[data-mode-button]").forEach((button) => {
      button.classList.toggle("is-mode-active", button.dataset.modeButton === uiState.mode);
    });
  }

  function selectWall(wallId) {
    rebuildNodeGraph();
    uiState.selectedWallId = wallId;
    uiState.selectedEdgeId = getEdgeForWall(wallId)?.id || null;
    uiState.selectedOpeningId = null;
    uiState.selectedZoneId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.mode = "select";
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
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.mode = "select";
    clearWallDraft();
    clearZoneBoundaryDraft();
    uiState.error = "";
    uiState.message = "已選取開口，可在右側調整 offset、width 與 swing。";
    render();
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
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
    uiState.mode = "select";
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
            message: "有牆端點接近但未對齊，建議整理端點。"
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
        structural: Boolean(wall.structural),
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
      uiState.error = "請先選取一個 wall-intersection issue，再執行切分。";
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
    uiState.message = `已在交會點切分 ${newWallIds.length} 段牆，並重新建立 Node Graph。`;
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
      structural: Boolean(sourceWall.structural),
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
        : "請先建立並整理牆體節點。";
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

    project.openings.push(opening);
    uiState.selectedOpeningId = opening.id;
    uiState.selectedEdgeId = edge.id;
    uiState.selectedWallId = getWallIdFromEdgeId(edge.id);
    uiState.selectedZoneId = null;
    uiState.selectedIssueId = null;
    uiState.selectedNodeId = null;
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
      uiState.error = "找不到 opening 依附的 edge，請重新選取牆段。";
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
    project.openings = project.openings.filter((opening) => opening.id !== uiState.selectedOpeningId);
    uiState.selectedOpeningId = null;
    uiState.error = "";
    uiState.message = "已刪除開口。";
    syncBridge();
    render();
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
      uiState.error = "請先選取 zone 並進入編輯邊界模式。";
      render();
      return;
    }

    const edge = getEdgeForWall(wallId);
    if (!edge) {
      uiState.error = "找不到此牆段對應的 nodeGraph edge。";
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
      uiState.error = "請先進入此 zone 的邊界編輯模式。";
      render();
      return;
    }

    const draft = createZoneBoundaryDraft(boundaryState.selectedBoundaryEdgeIds);
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
      ? "已套用 zone boundary，polygon 使用 mm 座標保存。"
      : "已套用 zone boundary，但目前邊界尚未形成封閉空間。";
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
      issues.push(createZoneBoundaryIssue("zone-boundary-empty", normalizedEdgeIds, "此 zone 尚未指定 boundary edges。"));
    }
    if (normalizedEdgeIds.length > 0 && normalizedEdgeIds.length < ZONE_BOUNDARY_MIN_EDGES) {
      issues.push(createZoneBoundaryIssue("zone-boundary-too-few-edges", normalizedEdgeIds, "boundaryEdgeIds 少於 3，無法形成空間邊界。"));
    }
    missingEdgeIds.forEach((edgeId) => {
      issues.push(createZoneBoundaryIssue("zone-boundary-edge-missing", [edgeId], `找不到 boundary edge：${edgeId}`));
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
      return "edge 遺失";
    }
    return "Boundary issue";
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
      ? `已整理 ${movedCount} 個牆端點，並重新建立 wallGraph。`
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
      return { valid: false, error: "找不到 opening 依附的 edge。" };
    }
    if (!Number.isFinite(offset) || offset < 0) {
      return { valid: false, error: "offset 必須大於或等於 0。" };
    }
    if (!Number.isFinite(width) || width <= 0) {
      return { valid: false, error: "width 必須大於 0。" };
    }
    if (width < MIN_OPENING_WIDTH) {
      return { valid: false, error: `開口寬度不可小於 ${MIN_OPENING_WIDTH}mm。` };
    }
    if (offset + width > edge.length + GEOMETRY_EPSILON) {
      return { valid: false, error: "offset + width 不可超過牆段長度。" };
    }

    const range = OPENING_WIDTH_RANGES[normalizeOpeningKind(opening.kind)];
    if (range && (width < range.min || width > range.max)) {
      return {
        valid: true,
        warning: `${opening.kind} 寬度建議為 ${range.min}mm 到 ${range.max}mm，請確認是否合適。`
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
      return "尚未校正";
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

  function getWallStatusLabel(status) {
    if (status === "new") {
      return "新牆 new";
    }
    if (status === "demolished") {
      return "拆除牆 demolished";
    }
    return "既有牆 existing";
  }

  function getModeLabel(mode) {
    if (mode === "calibrate") {
      return "校正比例";
    }
    if (mode === "draw-wall") {
      return "畫牆";
    }
    if (mode === "place-zone") {
      return "新增空間標籤";
    }
    if (mode === "edit-zone-boundary") {
      return "編輯空間邊界";
    }
    return "選取";
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
