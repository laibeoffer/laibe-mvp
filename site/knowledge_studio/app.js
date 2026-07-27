export const STATUS = Object.freeze({
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  RETIRED: "retired",
});

const STATUS_LABEL = Object.freeze({
  [STATUS.DRAFT]: "待修正",
  [STATUS.PENDING_REVIEW]: "待覆核",
  [STATUS.APPROVED]: "已發布",
  [STATUS.RETIRED]: "已停用",
});

const ACTION_LABEL = Object.freeze({
  create: "建立草稿",
  draft_created: "建立草稿",
  update: "更新草稿",
  draft_updated: "更新草稿",
  submit_review: "送交覆核",
  submitted_for_review: "送交覆核",
  return_revision: "退回修正",
  returned_to_draft: "退回修正",
  publish: "核准發布",
  published: "核准發布",
  retire: "停用規則",
  retired: "停用規則",
  create_revision: "建立新版本",
  revision_created: "建立新版本",
});

const NEXT_ACTION_LABEL = Object.freeze({
  create: "補充內容與依據後送出覆核",
  draft_created: "補充內容與依據後送出覆核",
  update: "確認修改內容後送出覆核",
  draft_updated: "確認修改內容後送出覆核",
  create_revision: "完成新版內容後送出覆核",
  revision_created: "完成新版內容後送出覆核",
  submit_review: "由 PCM 覆核內容與依據",
  submitted_for_review: "由 PCM 覆核內容與依據",
  return_revision: "依退回意見修正後重新送審",
  returned_to_draft: "依退回意見修正後重新送審",
  publish: "依核准版本提供受控檢索",
  published: "依核准版本提供受控檢索",
  retire: "停止召回並保留版本紀錄",
  retired: "停止召回並保留版本紀錄",
});

const REQUIRED_DRAFT_FIELDS = Object.freeze([
  ["title", "請填寫規則名稱。"],
  ["type", "請選擇規則類型。"],
  ["owner", "請填寫負責人。"],
  ["summary", "請填寫規則摘要。"],
  ["criteria", "請填寫判斷條件。"],
  ["nextOwner", "請指定下一位處理者。"],
  ["evidence", "請填寫來源依據。"],
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function now() {
  return new Date().toISOString();
}

function nextActionFor(action, status) {
  if (NEXT_ACTION_LABEL[action]) return NEXT_ACTION_LABEL[action];
  if (status === STATUS.DRAFT) return "補充內容與依據後送出覆核";
  if (status === STATUS.PENDING_REVIEW) return "由 PCM 覆核內容與依據";
  if (status === STATUS.APPROVED) return "建立新版或停用";
  if (status === STATUS.RETIRED) return "停止召回並保留版本紀錄";
  return "由下一位處理者確認後續事項";
}

function nextOwnerForStatus(status) {
  if (status === STATUS.DRAFT) return "規則整理人";
  if (status === STATUS.PENDING_REVIEW) return "PCM 覆核人";
  return "PCM 維護人";
}

function event(
  action,
  actor,
  status,
  nextOwner,
  sourceDocument = "",
  note = "",
) {
  return {
    action,
    actor,
    time: now(),
    status,
    nextOwner,
    nextAction: nextActionFor(action, status),
    sourceDocument,
    note,
    formalImpact: "none",
  };
}

export function createDraftBuffer(initial = {}) {
  return {
    id: null,
    entryId: null,
    versionId: null,
    persisted: false,
    transient: true,
    dirty: false,
    title: "",
    type: "圖說檢查規則",
    status: STATUS.DRAFT,
    version: 0,
    owner: "PCM",
    nextOwner: "規則整理人",
    nextAction: "填寫內容後儲存草稿",
    summary: "",
    criteria: "",
    evidence: "",
    sourceDate: "",
    updatedAt: "",
    events: [],
    ...clone(initial),
  };
}

export function discardDraftBuffer() {
  return null;
}

export function decideMobileBack({
  editorMode,
  dirty,
  discardConfirmed,
}) {
  const hasUnsavedChanges = editorMode === "new" || dirty;
  if (hasUnsavedChanges && !discardConfirmed) {
    return { action: "stay", discard: false };
  }
  return {
    action: "list",
    discard: hasUnsavedChanges,
  };
}

export function validateDraft(input = {}) {
  const errors = {};
  for (const [field, message] of REQUIRED_DRAFT_FIELDS) {
    if (!String(input[field] ?? "").trim()) {
      errors[field] = message;
    }
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstInvalid: Object.keys(errors)[0] || null,
  };
}

function assertCompleteDraft(input) {
  const result = validateDraft(input);
  if (!result.valid) {
    throw new Error(Object.values(result.errors)[0]);
  }
}

export function createDemoRecords() {
  return [
    {
      id: "KN-DR-001",
      title: "電視櫃插座與弱電出口完整性",
      type: "圖說檢查規則",
      status: STATUS.APPROVED,
      version: 3,
      owner: "PCM 圖說組",
      nextOwner: "PCM 維護人",
      nextAction: nextActionFor("publish", STATUS.APPROVED),
      summary: "比對家具配置、插座及弱電圖的電視櫃位置與必要出口。",
      criteria:
        "同一位置應能對回電源插座、網路出口與電視出線；缺少任一項時列為待確認。",
      evidence: "住宅圖說檢查基準／弱電章",
      sourceDate: "2026-07-18",
      updatedAt: "2026-07-25T09:20:00.000Z",
      events: [
        event(
          "publish",
          "陳主任",
          STATUS.APPROVED,
          "PCM 維護人",
          "住宅圖說檢查基準／弱電章",
        ),
      ],
    },
    {
      id: "KN-AC-014",
      title: "浴室防水施工照片與試水紀錄",
      type: "驗收依據",
      status: STATUS.PENDING_REVIEW,
      version: 1,
      owner: "驗收資料組",
      nextOwner: "PCM 覆核人",
      nextAction: nextActionFor("submit_review", STATUS.PENDING_REVIEW),
      summary: "整理防水施工階段應留存的材料、照片與試水紀錄。",
      criteria:
        "確認材料名稱、施工範圍、各階段照片及試水時間都有來源定位；不足時提出補件提醒。",
      evidence: "裝潢驗收清單／防水項",
      sourceDate: "2026-07-24",
      updatedAt: "2026-07-26T02:10:00.000Z",
      events: [
        event(
          "submit_review",
          "林專員",
          STATUS.PENDING_REVIEW,
          "PCM 覆核人",
          "裝潢驗收清單／防水項",
        ),
      ],
    },
    {
      id: "KN-BG-021",
      title: "既有圖面物件不得形成預算候選",
      type: "預算守門規則",
      status: STATUS.DRAFT,
      version: 2,
      owner: "預算規則組",
      nextOwner: "規則整理人",
      nextAction: nextActionFor("return_revision", STATUS.DRAFT),
      summary: "圖面上原有物件只作案件依據，不直接形成新增工程範圍。",
      criteria: "僅使用者新增、範圍已確認且完成人工覆核的物件可進入候選清單。",
      evidence: "預算守門規則／新增項目",
      sourceDate: "2026-07-10",
      updatedAt: "2026-07-25T11:30:00.000Z",
      events: [
        event(
          "return_revision",
          "王經理",
          STATUS.DRAFT,
          "規則整理人",
          "預算守門規則／新增項目",
        ),
      ],
    },
    {
      id: "KN-MT-009",
      title: "舊版木作櫃分類對照",
      type: "材料規格",
      status: STATUS.RETIRED,
      version: 1,
      owner: "材料資料組",
      nextOwner: "PCM 維護人",
      nextAction: nextActionFor("retire", STATUS.RETIRED),
      summary: "已由新版固定收納櫃分類取代。",
      criteria: "僅供歷史紀錄追溯。",
      evidence: "木作分類表／舊版",
      sourceDate: "2026-06-17",
      updatedAt: "2026-07-22T07:40:00.000Z",
      events: [
        event(
          "retire",
          "陳主任",
          STATUS.RETIRED,
          "PCM 維護人",
          "木作分類表／舊版",
        ),
      ],
    },
  ].map((record) => ({
    ...record,
    persisted: false,
    sample: true,
  }));
}

export function filterRecords(records, filters = {}) {
  const query = String(filters.query || "").trim().toLocaleLowerCase("zh-Hant");
  return records.filter((record) => {
    const searchable = [
      record.title,
      record.type,
      record.summary,
      record.criteria,
      record.evidence,
      record.owner,
      record.nextOwner,
      record.nextAction,
    ]
      .join(" ")
      .toLocaleLowerCase("zh-Hant");
    return (
      (!query || searchable.includes(query)) &&
      (!filters.status || record.status === filters.status) &&
      (!filters.type || record.type === filters.type) &&
      (!filters.nextOwner || record.nextOwner === filters.nextOwner) &&
      (!filters.evidenceOnly || Boolean(String(record.evidence || "").trim()))
    );
  });
}

export function resolveVisibleSelectionId(records, selectedId) {
  if (!selectedId) return null;
  return records.some((record) => record.id === selectedId)
    ? selectedId
    : records[0]?.id || null;
}

export class LocalKnowledgeStore {
  constructor(records = []) {
    this.records = clone(records);
    this.sequence = this.records.length + 1;
    this.mode = "sample";
  }

  async list() {
    return clone(
      [...this.records].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      ),
    );
  }

  async get(id) {
    const record = this.records.find((item) => item.id === id);
    if (!record) throw new Error("找不到這筆規則。");
    return clone(record);
  }

  async createDraft(input) {
    const timestamp = now();
    const record = {
      id: `KN-NEW-${String(this.sequence++).padStart(3, "0")}`,
      title: input.title || "",
      type: input.type || "圖說檢查規則",
      status: STATUS.DRAFT,
      version: 0,
      owner: input.owner || "PCM",
      nextOwner: input.nextOwner || "規則整理人",
      nextAction: nextActionFor("create", STATUS.DRAFT),
      summary: input.summary || "",
      criteria: input.criteria || "",
      evidence: input.evidence || "",
      sourceDate: input.sourceDate || "",
      updatedAt: timestamp,
      persisted: true,
      sample: true,
      events: [
        event(
          "create",
          input.actor || "目前使用者",
          STATUS.DRAFT,
          input.nextOwner || "規則整理人",
          input.evidence,
        ),
      ],
    };
    this.records.unshift(record);
    return clone(record);
  }

  async saveDraft(input) {
    const index = this.records.findIndex((record) => record.id === input.id);
    if (index < 0) throw new Error("找不到這筆規則。");
    if (this.records[index].status !== STATUS.DRAFT) {
      throw new Error("已發布或覆核中的內容請先建立新版本。");
    }
    const current = this.records[index];
    const updated = {
      ...current,
      ...clone(input),
      status: STATUS.DRAFT,
      nextAction: nextActionFor("update", STATUS.DRAFT),
      updatedAt: now(),
      events: [
        ...current.events,
        event(
          "update",
          input.actor || "目前使用者",
          STATUS.DRAFT,
          input.nextOwner,
          input.evidence,
          input.note || "",
        ),
      ],
    };
    this.records[index] = updated;
    return clone(updated);
  }

  async saveAndSubmitReview(input) {
    assertCompleteDraft(input);
    const recordsBefore = clone(this.records);
    const sequenceBefore = this.sequence;
    try {
      const saved = await this.saveDraft(input);
      return await this.transition(saved.id, "submit_review", {
        actor: input.actor || "目前使用者",
        nextOwner: input.nextOwner || "PCM 覆核人",
        note: input.note || "",
      });
    } catch (error) {
      this.records = recordsBefore;
      this.sequence = sequenceBefore;
      throw error;
    }
  }

  async createRevision(id, actor) {
    const source = await this.get(id);
    if (source.status !== STATUS.APPROVED) {
      throw new Error("只有已發布規則能建立新版本。");
    }
    const revision = {
      ...source,
      id: `${source.id}-R${source.version + 1}`,
      parentId: source.id,
      status: STATUS.DRAFT,
      version: source.version + 1,
      nextOwner: "規則整理人",
      nextAction: nextActionFor("create_revision", STATUS.DRAFT),
      updatedAt: now(),
      events: [
        ...source.events,
        event(
          "create_revision",
          actor || "目前使用者",
          STATUS.DRAFT,
          "規則整理人",
          source.evidence,
        ),
      ],
    };
    this.records.unshift(revision);
    return clone(revision);
  }

  async transition(id, action, context = {}) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error("找不到這筆規則。");
    const current = this.records[index];
    const allowed = {
      submit_review: {
        from: [STATUS.DRAFT],
        to: STATUS.PENDING_REVIEW,
      },
      return_revision: {
        from: [STATUS.PENDING_REVIEW],
        to: STATUS.DRAFT,
      },
      publish: {
        from: [STATUS.PENDING_REVIEW],
        to: STATUS.APPROVED,
      },
      retire: {
        from: [STATUS.APPROVED],
        to: STATUS.RETIRED,
      },
    };
    const transition = allowed[action];
    if (!transition || !transition.from.includes(current.status)) {
      throw new Error("目前狀態不能執行這個動作。");
    }
    if (action === "submit_review" || action === "publish") {
      assertCompleteDraft(current);
    }
    const updated = {
      ...current,
      status: transition.to,
      version: action === "publish"
        ? Math.max(1, current.version)
        : current.version,
      nextOwner: context.nextOwner || current.nextOwner,
      nextAction: nextActionFor(action, transition.to),
      updatedAt: now(),
      events: [
        ...current.events,
        event(
          action,
          context.actor || "目前使用者",
          transition.to,
          context.nextOwner || current.nextOwner,
          current.evidence,
          context.note || "",
        ),
      ],
    };
    this.records[index] = updated;
    return clone(updated);
  }
}

export class GatewayAdapter {
  constructor({ endpoint, projectKey, tokenProvider, fetcher = fetch }) {
    this.endpoint = endpoint.replace(/\/$/, "");
    this.projectKey = String(projectKey || "").trim();
    this.tokenProvider = tokenProvider;
    this.fetcher = fetcher;
    this.mode = "connected";
  }

  async request(body) {
    const token = await this.tokenProvider();
    if (!token) throw new Error("登入狀態已失效，請重新登入。");
    if (!this.projectKey) {
      throw new Error("知識服務正在整理中，請稍後再試。");
    }
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: this.projectKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error("資料處理失敗，請稍後再試。");
    }
    const result = await response.json();
    return result.data ?? result;
  }

  async digest(value) {
    const bytes = new TextEncoder().encode(String(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  domainForType(type) {
    if (String(type).includes("預算")) return "budget";
    if (String(type).includes("契約")) return "contract";
    return "drawing_review";
  }

  typeForDomain(domain, rule = null, displayType = "") {
    if (
      [
        "圖說檢查規則",
        "預算守門規則",
        "驗收依據",
        "契約邊界",
        "材料規格",
      ].includes(displayType)
    ) {
      return displayType;
    }
    if (rule?.ruleType === "acceptance_rule") return "驗收依據";
    if (domain === "budget") return "預算守門規則";
    if (domain === "contract") return "契約邊界";
    return "圖說檢查規則";
  }

  async studioPayload(input) {
    if (input.payload?.schema_version === "knowledge_studio.v1") {
      return input.payload;
    }
    const title = String(input.title || "").trim();
    const domain = input.domain || this.domainForType(input.type);
    const sourceLocator = input.source?.source_locator ||
      input.evidence ||
      `knowledge-studio:${title}`;
    const sourceSha = input.source?.source_sha256 ||
      (await this.digest(sourceLocator));
    const identity = (await this.digest(`${domain}:${title}`)).slice(0, 16);
    const ruleCode = `${domain.replace("_review", "")}-${identity}`;
    let rule;
    if (domain === "budget") {
      rule = {
        ruleType: "budget_rule",
        ruleCode,
        ruleKind: "scope_difference",
        unifiedItemCode: "",
        conditions: { criteria: input.criteria || "" },
        output: { summary: input.summary || "" },
      };
    } else if (domain === "contract") {
      rule = {
        ruleType: "contract_evidence_rule",
        ruleCode,
        allowedOutputKind: "comparison",
        clauseTopic: title,
        evidenceRequirements: input.evidence ? [input.evidence] : [],
        comparisonFields: [],
      };
    } else if (String(input.type).includes("驗收")) {
      rule = {
        ruleType: "acceptance_rule",
        ruleCode,
        constructionStage: "待確認",
        checkDefinition: { criteria: input.criteria || "" },
        requiredEvidence: input.evidence ? [input.evidence] : [],
        findingTemplate: "列為待確認並保留來源定位。",
      };
    } else {
      rule = {
        ruleType: "drawing_rule",
        ruleCode,
        ruleKind: "cross_sheet_consistency",
        pageTypes: ["pdf"],
        conditions: { criteria: input.criteria || "" },
        findingTemplate: "列為待確認並指出圖頁位置。",
        supplementTemplate: "請補充可核對的圖頁或說明。",
      };
    }
    return {
      schema_version: "knowledge_studio.v1",
      domain,
      slug: `rule-${identity}`,
      title,
      summary: input.summary || "",
      content: {
        displayType: input.type || this.typeForDomain(domain),
        criteria: input.criteria || "",
        owner: input.owner || "PCM",
        nextOwner: input.nextOwner || "PCM 覆核人",
        sourceDate: input.sourceDate || "",
      },
      evidence_summary: input.evidence ? [input.evidence] : [],
      source: {
        source_type: input.source?.source_type || "manual_reference",
        title: input.source?.title || input.evidence || title,
        source_locator: sourceLocator,
        source_sha256: sourceSha,
        provenance: input.source?.provenance || {
          enteredFrom: "knowledge_studio",
        },
      },
      rule,
      change_note: input.changeNote || "",
    };
  }

  normalizeSummary(record) {
    return {
      id: record.entryId,
      entryId: record.entryId,
      versionId: record.versionId,
      title: record.title,
      type: this.typeForDomain(
        record.domain,
        record.rule,
        record.displayType,
      ),
      domain: record.domain,
      status: record.lifecycleState,
      version: record.version,
      owner: "PCM",
      nextOwner: record.nextOwnerRole ||
        nextOwnerForStatus(record.lifecycleState),
      nextAction: record.nextAction ||
        nextActionFor("", record.lifecycleState),
      summary: record.summary || "",
      criteria: record.rule?.conditions?.criteria || "",
      evidence: record.source?.locator || "",
      sourceDate: "",
      updatedAt: new Date().toISOString(),
      events: [],
    };
  }

  normalizeDetail(record) {
    const version = record.versions?.[0] || {};
    const latestEvent = record.events?.at(-1);
    const lifecycleState = version.lifecycleState || record.entryState;
    return {
      id: record.entryId,
      entryId: record.entryId,
      versionId: version.versionId,
      title: version.title || record.slug,
      type: this.typeForDomain(
        record.domain,
        version.rule,
        version.content?.displayType,
      ),
      domain: record.domain,
      status: lifecycleState,
      version: version.version || 0,
      owner: version.content?.owner || "PCM",
      nextOwner: version.content?.nextOwner ||
        latestEvent?.nextOwnerRole ||
        nextOwnerForStatus(lifecycleState),
      nextAction: latestEvent?.nextAction ||
        nextActionFor(latestEvent?.eventType, lifecycleState),
      summary: version.summary || "",
      criteria: version.content?.criteria ||
        version.rule?.conditions?.criteria ||
        "",
      evidence: version.evidenceSummary?.[0] || version.source?.locator || "",
      sourceDate: version.content?.sourceDate || "",
      updatedAt: version.createdAt || new Date().toISOString(),
      events: (record.events || []).map((item) => ({
        action: item.eventType,
        actor: item.actorRole || "PCM",
        time: item.occurredAt,
        status: item.afterState,
        nextOwner: item.nextOwnerRole,
        nextAction: item.nextAction ||
          nextActionFor(item.eventType, item.afterState),
        sourceDocument: version.evidenceSummary?.[0] ||
          version.source?.locator ||
          "",
        note: item.note || "",
        formalImpact: "none",
      })),
    };
  }

  async list(filters = {}) {
    const result = await this.request({
      operation: "listRecords",
      lifecycle: filters.status || null,
      domain: filters.domain || null,
      limit: filters.limit || 100,
    });
    return Array.isArray(result)
      ? result.map((record) => this.normalizeSummary(record))
      : [];
  }

  async get(id) {
    const result = await this.request({
      operation: "getRecord",
      entryId: id,
    });
    return this.normalizeDetail(result);
  }

  async createDraft(input) {
    const result = await this.request({
      operation: "createDraft",
      payload: await this.studioPayload(input),
    });
    return {
      id: result.entryId,
      entryId: result.entryId,
      versionId: result.versionId,
      status: result.lifecycleState,
    };
  }

  async saveDraft(input) {
    const entryId = input.entryId || input.id;
    const result = await this.request({
      operation: "updateDraft",
      entryId,
      versionId: input.versionId,
      payload: await this.studioPayload(input),
    });
    return {
      id: result.entryId || entryId,
      entryId: result.entryId || entryId,
      versionId: result.versionId || input.versionId,
      status: result.lifecycleState,
    };
  }

  async saveAndSubmitReview(input) {
    assertCompleteDraft(input);
    const entryId = input.entryId || input.id;
    const result = await this.request({
      operation: "saveAndSubmitReview",
      entryId,
      versionId: input.versionId,
      payload: await this.studioPayload(input),
      note: input.note || "",
    });
    return {
      id: result.entryId || entryId,
      entryId: result.entryId || entryId,
      versionId: result.versionId || input.versionId,
      status: result.lifecycleState || STATUS.PENDING_REVIEW,
    };
  }

  async createRevision(id, actorOrSource) {
    const actor = typeof actorOrSource === "string"
      ? actorOrSource
      : "目前使用者";
    const sourceLocator = `knowledge-studio-revision:${id}`;
    const source = typeof actorOrSource === "object" ? actorOrSource : {
      source_type: "manual_reference",
      title: "知識規則版本更新",
      source_locator: sourceLocator,
      source_sha256: await this.digest(sourceLocator),
      provenance: { actor },
    };
    const result = await this.request({
      operation: "createRevision",
      entryId: id,
      source,
      note: "",
    });
    return {
      id: result.entryId || id,
      entryId: result.entryId || id,
      versionId: result.versionId,
      status: result.lifecycleState,
    };
  }

  async transition(id, action, context = {}) {
    const operation = {
      submit_review: "submitReview",
      return_revision: "returnToDraft",
      publish: "publish",
      retire: "retire",
    }[action];
    if (!operation) throw new Error("目前狀態不能執行這個動作。");
    const body = {
      operation,
      entryId: id,
      note: context.note || "",
    };
    if (operation !== "retire") {
      body.versionId = context.versionId;
    }
    const result = await this.request(body);
    return {
      id: result.entryId || id,
      entryId: result.entryId || id,
      versionId: result.versionId || context.versionId,
      status: result.lifecycleState,
    };
  }
}

function createStore() {
  const endpoint = document
    .querySelector('meta[name="knowledge-endpoint"]')
    ?.getAttribute("content")
    ?.trim() || "";
  const projectKey = document
    .querySelector('meta[name="knowledge-project-key"]')
    ?.getAttribute("content")
    ?.trim() ||
    window.__LAIBE_SUPABASE_PUBLISHABLE_KEY__ ||
    "";
  if (!endpoint) return new LocalKnowledgeStore(createDemoRecords());
  return new GatewayAdapter({
    endpoint,
    projectKey,
    tokenProvider: async () => window.__LAIBE_KNOWLEDGE_TOKEN__ || "",
  });
}

function formatTime(value) {
  if (!value) return "時間未記錄";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeText(value) {
  const span = document.createElement("span");
  span.textContent = String(value ?? "");
  return span.innerHTML;
}

function initStudio() {
  const store = createStore();
  const elements = {
    list: document.querySelector("#record-list"),
    recordPane: document.querySelector(".record-pane"),
    detailPane: document.querySelector(".detail-pane"),
    workbench: document.querySelector(".workbench"),
    empty: document.querySelector("#empty-state"),
    banner: document.querySelector("#state-banner"),
    stateMessage: document.querySelector("#state-message"),
    retry: document.querySelector("#retry-button"),
    count: document.querySelector("#result-count"),
    form: document.querySelector("#detail-form"),
    placeholder: document.querySelector("#detail-placeholder"),
    search: document.querySelector("#search-input"),
    statusFilter: document.querySelector("#status-filter"),
    typeFilter: document.querySelector("#type-filter"),
    ownerFilter: document.querySelector("#owner-filter"),
    newDraft: document.querySelector("#new-draft-button"),
    back: document.querySelector("#back-to-list-button"),
    cancel: document.querySelector("#cancel-button"),
    unsaved: document.querySelector("#unsaved-indicator"),
    save: document.querySelector("#save-button"),
    submit: document.querySelector("#submit-button"),
    publish: document.querySelector("#publish-button"),
    return: document.querySelector("#return-button"),
    retire: document.querySelector("#retire-button"),
    revision: document.querySelector("#revision-button"),
    toast: document.querySelector("#toast"),
    detailHeading: document.querySelector("#detail-title-display"),
    modeNote: document.querySelector("#mode-note"),
    confirmation: document.querySelector("#confirmation-dialog"),
    confirmationTitle: document.querySelector("#confirmation-title"),
    confirmationImpact: document.querySelector("#confirmation-impact"),
    confirmationNote: document.querySelector("#confirmation-note"),
    confirmationError: document.querySelector("#confirmation-error"),
    confirmationCancel: document.querySelector("#confirmation-cancel"),
    confirmationConfirm: document.querySelector("#confirmation-confirm"),
    navButtons: Array.from(document.querySelectorAll("[data-view]")),
  };
  let records = [];
  let selectedId = null;
  let selectedRecord = null;
  let activeView = "all";
  let editorMode = "none";
  let baseEditorValues = null;
  let dirty = false;
  let busy = false;
  let pendingConfirmation = null;

  const confirmationCopy = {
    return_revision: {
      title: "退回修正",
      impact: "此版本會回到待修正，退回原因與處理者會保留在規則紀錄中。",
      confirm: "確認退回",
      nextOwner: "規則整理人",
      success: "已退回修正並保留原因。",
    },
    publish: {
      title: "發布規則",
      impact:
        "此版本會提供給受控工作流程檢索；這不是法律核准、工程保證或正式判定。",
      confirm: "確認發布",
      nextOwner: "PCM 維護人",
      success: "規則已發布並保留核准紀錄。",
    },
    retire: {
      title: "停用規則",
      impact: "此規則將停止提供給新流程，既有版本與處理紀錄仍會保留。",
      confirm: "確認停用",
      nextOwner: "PCM 維護人",
      success: "規則已停用，既有紀錄仍保留。",
    },
  };

  function showBanner(message, tone = "neutral", retry = false) {
    elements.stateMessage.textContent = message;
    elements.banner.dataset.tone = tone;
    elements.banner.hidden = !message;
    elements.retry.hidden = !retry;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2400);
  }

  function isMobile() {
    return window.matchMedia?.("(max-width: 720px)").matches ?? false;
  }

  function setMobilePane(pane) {
    elements.workbench.dataset.mobilePane = pane;
  }

  function updateUnsavedState() {
    const transient = editorMode === "new";
    elements.unsaved.hidden = !transient && !dirty;
    elements.unsaved.textContent = transient
      ? "尚未建立草稿"
      : dirty
      ? "有未儲存修改"
      : "";
    elements.form.dataset.dirty = String(transient || dirty);
  }

  function currentRecordEditable() {
    return editorMode === "new" ||
      selectedRecord?.status === STATUS.DRAFT;
  }

  function updateControls() {
    const editable = currentRecordEditable();
    const persistedDraft = editorMode === "edit" &&
      selectedRecord?.status === STATUS.DRAFT;
    const pending = selectedRecord?.status === STATUS.PENDING_REVIEW;
    const approved = selectedRecord?.status === STATUS.APPROVED;

    Array.from(elements.form.elements).forEach((field) => {
      if (field.matches("input, textarea, select")) {
        field.disabled = busy || !editable;
      }
    });
    elements.newDraft.disabled = busy;
    elements.save.hidden = !editable;
    elements.save.disabled = busy;
    elements.cancel.hidden = !editable;
    elements.cancel.disabled = busy;
    elements.submit.hidden = !persistedDraft;
    elements.submit.disabled = busy;
    elements.return.hidden = !pending;
    elements.return.disabled = busy;
    elements.publish.hidden = !pending;
    elements.publish.disabled = busy;
    elements.retire.hidden = !approved;
    elements.retire.disabled = busy;
    elements.revision.hidden = !approved;
    elements.revision.disabled = busy;
  }

  function setBusy(value, message = "") {
    busy = value;
    elements.form.setAttribute("aria-busy", String(value));
    elements.list.setAttribute("aria-busy", String(value));
    elements.workbench.setAttribute("aria-busy", String(value));
    if (value && message) showBanner(message);
    updateControls();
  }

  function safeErrorMessage(error, fallback) {
    const message = error instanceof Error ? error.message : "";
    return /^(請|目前|找不到|只有|已發布|知識)/.test(message)
      ? message
      : fallback;
  }

  function populateSelect(select, values, label) {
    const current = select.value;
    select.innerHTML = `<option value="">${label}</option>${
      values
        .sort((left, right) => left.localeCompare(right, "zh-Hant"))
        .map(
          (value) =>
            `<option value="${escapeText(value)}">${
              escapeText(value)
            }</option>`,
        )
        .join("")
    }`;
    select.value = values.includes(current) ? current : "";
  }

  function updateCounts() {
    const counts = records.reduce(
      (result, record) => {
        result[record.status] = (result[record.status] || 0) + 1;
        return result;
      },
      {},
    );
    document.querySelector("#count-pending").textContent =
      counts[STATUS.PENDING_REVIEW] || 0;
    document.querySelector("#count-approved").textContent =
      counts[STATUS.APPROVED] || 0;
    document.querySelector("#count-draft").textContent = counts[STATUS.DRAFT] ||
      0;
    document.querySelector("#count-retired").textContent =
      counts[STATUS.RETIRED] || 0;
  }

  function currentFilters() {
    return {
      query: elements.search.value,
      status: elements.statusFilter.value,
      type: elements.typeFilter.value,
      nextOwner: elements.ownerFilter.value,
      evidenceOnly: activeView === "source",
    };
  }

  async function setActiveView(view, { moveFocus = false } = {}) {
    activeView = view;
    elements.navButtons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      if (active) {
        button.setAttribute("aria-current", "page");
        if (moveFocus) button.focus();
      } else {
        button.removeAttribute("aria-current");
      }
    });
    if (view === "review") {
      elements.statusFilter.value = STATUS.PENDING_REVIEW;
    } else {
      elements.statusFilter.value = "";
    }
    await reconcileFilteredSelection();
  }

  function renderList() {
    const filtered = filterRecords(records, currentFilters());
    elements.count.textContent = `${filtered.length} 筆`;
    elements.empty.hidden = filtered.length !== 0;
    elements.list.innerHTML = filtered
      .map(
        (record) => `
          <button
            type="button"
            class="record-row status-${record.status} ${
          record.id === selectedId ? "is-selected" : ""
        }"
            data-record-id="${escapeText(record.id)}"
            role="option"
            aria-selected="${record.id === selectedId}"
          >
            <span class="record-main">
              <span class="record-title">${escapeText(record.title)}</span>
              <span class="record-meta">
                ${escapeText(record.type)} · 版本 ${escapeText(record.version)}
                ${record.sample ? '<em class="sample-badge">示範</em>' : ""}
              </span>
            </span>
            <span class="record-owner">
              <small>下一位處理者</small>
              <strong>${escapeText(record.nextOwner || "尚未指定")}</strong>
            </span>
            <span class="row-status">${
          escapeText(STATUS_LABEL[record.status])
        }</span>
          </button>
        `,
      )
      .join("");
    elements.list.querySelectorAll("[data-record-id]").forEach((button) => {
      button.addEventListener(
        "click",
        () => void selectRecord(button.dataset.recordId),
      );
    });
    return filtered;
  }

  function clearSelection() {
    selectedId = null;
    selectedRecord = null;
    editorMode = "none";
    baseEditorValues = null;
    dirty = false;
    elements.form.hidden = true;
    elements.placeholder.hidden = false;
    clearFieldErrors();
    updateUnsavedState();
    updateSelectedRows();
  }

  async function reconcileFilteredSelection() {
    const filtered = renderList();
    const nextSelectedId = resolveVisibleSelectionId(filtered, selectedId);
    if (nextSelectedId === selectedId) return;
    if (nextSelectedId) {
      await selectRecord(nextSelectedId);
      return;
    }
    clearSelection();
    renderList();
  }

  function setField(name, value) {
    const field = elements.form.elements.namedItem(name);
    if (field) field.value = value || "";
  }

  function updateSelectedRows() {
    elements.list.querySelectorAll("[data-record-id]").forEach((row) => {
      const selected = row.dataset.recordId === selectedId;
      row.classList.toggle("is-selected", selected);
      row.setAttribute("aria-selected", String(selected));
    });
  }

  function editorSnapshot(input = formValue()) {
    return JSON.stringify({
      title: input.title,
      type: input.type,
      owner: input.owner,
      summary: input.summary,
      criteria: input.criteria,
      nextOwner: input.nextOwner,
      sourceDate: input.sourceDate,
      evidence: input.evidence,
    });
  }

  function hasUnsavedChanges() {
    return editorMode === "new" || dirty;
  }

  function canLeaveEditor() {
    if (!hasUnsavedChanges()) return true;
    return window.confirm(
      "尚有未儲存的內容，離開後不會保留。確定要離開嗎？",
    );
  }

  function clearFieldErrors() {
    elements.form.querySelectorAll(".field-error").forEach((error) => {
      error.textContent = "";
      error.hidden = true;
    });
    elements.form.querySelectorAll("[aria-invalid]").forEach((field) => {
      field.removeAttribute("aria-invalid");
    });
  }

  function fieldErrorId(name) {
    return `error-${name === "nextOwner" ? "next-owner" : name}`;
  }

  function showFieldErrors(errors) {
    clearFieldErrors();
    for (const [name, message] of Object.entries(errors)) {
      const field = elements.form.elements.namedItem(name);
      const error = document.querySelector(`#${fieldErrorId(name)}`);
      if (!field || !error) continue;
      field.setAttribute("aria-invalid", "true");
      error.textContent = message;
      error.hidden = false;
    }
    const firstName = Object.keys(errors)[0];
    elements.form.elements.namedItem(firstName)?.focus();
  }

  function renderDetail(record, mode = "view") {
    editorMode = mode;
    selectedRecord = record;
    elements.placeholder.hidden = true;
    elements.form.hidden = false;
    const transient = mode === "new";
    document.querySelector("#detail-status").textContent = transient
      ? "尚未儲存"
      : STATUS_LABEL[record.status];
    document.querySelector("#detail-status").dataset.status = transient
      ? "transient"
      : record.status;
    elements.detailHeading.textContent = record.title || "新規則草稿";
    document.querySelector("#detail-version").textContent = transient
      ? "草稿尚未建立"
      : `版本 ${record.version}`;
    [
      "title",
      "type",
      "owner",
      "summary",
      "criteria",
      "nextOwner",
      "sourceDate",
      "evidence",
    ].forEach((name) => setField(name, record[name]));
    document.querySelector("#evidence-source").textContent =
      record.evidence || "尚未填寫";
    document.querySelector("#evidence-next-step").textContent =
      record.nextAction
        ? `${record.nextAction}${
          record.nextOwner ? `，由 ${record.nextOwner} 處理` : ""
        }`
        : "尚未指定";
    document.querySelector("#event-history").innerHTML = [
      ...(record.events || []),
    ]
      .reverse()
      .map(
        (item) => `
          <li>
            <span class="event-marker" aria-hidden="true"></span>
            <div>
              <strong>${escapeText(ACTION_LABEL[item.action] || item.action)}</strong>
              <span>${escapeText(item.actor)} · ${
          escapeText(formatTime(item.time))
        }</span>
              ${
          item.note
            ? `<small>說明：${escapeText(item.note)}</small>`
            : ""
        }
              <small>下一步：${
          escapeText(item.nextAction || "尚未指定")
        }；處理者：${escapeText(item.nextOwner || "尚未指定")}</small>
            </div>
          </li>
        `,
      )
      .join("");
    clearFieldErrors();
    baseEditorValues = editorSnapshot();
    dirty = false;
    updateUnsavedState();
    updateControls();
  }

  async function selectRecord(
    id,
    { skipUnsavedCheck = false, focusDetail = true } = {},
  ) {
    if (!skipUnsavedCheck && !canLeaveEditor()) return;
    try {
      setBusy(true, "正在開啟規則內容。");
      const record = await store.get(id);
      selectedId = id;
      renderDetail(record, record.status === STATUS.DRAFT ? "edit" : "view");
      updateSelectedRows();
      setMobilePane("detail");
      showBanner("");
      if (isMobile() && focusDetail) {
        elements.detailHeading.focus({ preventScroll: true });
      }
    } catch (error) {
      showBanner(
        safeErrorMessage(error, "目前無法開啟這筆規則，請稍後再試。"),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function formValue() {
    return {
      id: selectedId,
      entryId: selectedRecord?.entryId || selectedId,
      versionId: selectedRecord?.versionId,
      domain: selectedRecord?.domain,
      title: elements.form.elements.title.value.trim(),
      type: elements.form.elements.type.value,
      owner: elements.form.elements.owner.value.trim(),
      summary: elements.form.elements.summary.value.trim(),
      criteria: elements.form.elements.criteria.value.trim(),
      nextOwner: elements.form.elements.nextOwner.value.trim(),
      sourceDate: elements.form.elements.sourceDate.value,
      evidence: elements.form.elements.evidence.value.trim(),
      actor: "目前使用者",
    };
  }

  async function reload(selectId = selectedId) {
    setBusy(true, "正在整理規則紀錄。");
    try {
      records = await store.list();
      populateSelect(
        elements.typeFilter,
        [...new Set(records.map((record) => record.type))],
        "全部類型",
      );
      populateSelect(
        elements.ownerFilter,
        [...new Set(records.map((record) => record.nextOwner).filter(Boolean))],
        "全部處理者",
      );
      updateCounts();
      const filtered = renderList();
      showBanner("");
      if (selectId) {
        const nextSelectedId = resolveVisibleSelectionId(filtered, selectId);
        if (nextSelectedId) {
          await selectRecord(nextSelectedId, {
            skipUnsavedCheck: true,
            focusDetail: false,
          });
        } else {
          clearSelection();
          renderList();
        }
      }
    } catch (error) {
      showBanner(
        safeErrorMessage(
          error,
          "目前無法整理規則紀錄，請重新整理後再試。",
        ),
        "error",
        true,
      );
    } finally {
      setBusy(false);
    }
  }

  elements.form.addEventListener("submit", async (eventObject) => {
    eventObject.preventDefault();
    const input = formValue();
    const fullValidation = validateDraft(input);
    const saveErrors = Object.fromEntries(
      Object.entries(fullValidation.errors).filter(([name]) =>
        ["title", "type", "owner"].includes(name)
      ),
    );
    if (Object.keys(saveErrors).length > 0) {
      showFieldErrors(saveErrors);
      showBanner("請先完成草稿名稱、類型與負責人。", "error");
      return;
    }
    try {
      setBusy(true, "正在儲存草稿。");
      const record = editorMode === "new"
        ? await store.createDraft(input)
        : await store.saveDraft(input);
      dirty = false;
      await reload(record.id);
      showToast(
        store.mode === "sample"
          ? "範例草稿已加入本頁；重新整理後不會保留。"
          : "草稿已儲存。",
      );
    } catch (error) {
      showBanner(
        safeErrorMessage(error, "目前無法儲存草稿，內容仍保留在畫面中。"),
        "error",
      );
    } finally {
      setBusy(false);
    }
  });

  elements.newDraft.addEventListener("click", () => {
    if (!canLeaveEditor()) return;
    activeView = "all";
    elements.statusFilter.value = "";
    elements.navButtons.forEach((button) => {
      const active = button.dataset.view === "all";
      button.classList.toggle("is-active", active);
      button.toggleAttribute("aria-current", active);
      if (active) button.setAttribute("aria-current", "page");
    });
    selectedId = null;
    const buffer = createDraftBuffer();
    renderDetail(buffer, "new");
    updateSelectedRows();
    setMobilePane("detail");
    showBanner(
      "先填寫草稿內容；按下「儲存草稿」後才會建立規則紀錄。",
    );
    elements.form.elements.title.focus();
  });

  elements.cancel.addEventListener("click", () => {
    if (!canLeaveEditor()) return;
    if (editorMode === "new") {
      discardDraftBuffer(selectedRecord);
      clearSelection();
      setMobilePane("list");
      showBanner("");
      elements.newDraft.focus();
      return;
    }
    if (selectedRecord) {
      renderDetail(selectedRecord, "edit");
      showBanner("未儲存的修改已取消。");
    }
  });

  elements.submit.addEventListener("click", async () => {
    if (!selectedId || editorMode !== "edit") return;
    const input = formValue();
    const validation = validateDraft(input);
    if (!validation.valid) {
      showFieldErrors(validation.errors);
      showBanner("請完成標示欄位後再送交覆核。", "error");
      return;
    }
    try {
      setBusy(true, "正在儲存最新內容並送交覆核。");
      const record = await store.saveAndSubmitReview({
        ...input,
        note: "送交 PCM 覆核",
      });
      dirty = false;
      await reload(record.id);
      showToast("最新內容已儲存並送交覆核。");
    } catch (error) {
      dirty = true;
      updateUnsavedState();
      showBanner(
        safeErrorMessage(
          error,
          "送交覆核未完成；畫面中的修改仍保留，請稍後再試。",
        ),
        "error",
      );
    } finally {
      setBusy(false);
    }
  });

  function requestConfirmation(action) {
    const copy = confirmationCopy[action];
    if (!copy || !selectedId) return;
    pendingConfirmation = action;
    elements.confirmationTitle.textContent = copy.title;
    elements.confirmationImpact.textContent = copy.impact;
    elements.confirmationConfirm.textContent = copy.confirm;
    elements.confirmationNote.value = "";
    elements.confirmationError.hidden = true;
    if (typeof elements.confirmation.showModal === "function") {
      elements.confirmation.showModal();
    } else {
      elements.confirmation.setAttribute("open", "");
    }
    elements.confirmationNote.focus();
  }

  function closeConfirmation() {
    pendingConfirmation = null;
    if (typeof elements.confirmation.close === "function") {
      elements.confirmation.close();
    } else {
      elements.confirmation.removeAttribute("open");
    }
  }

  async function runConfirmedAction(action, note) {
    const copy = confirmationCopy[action];
    if (!copy || !selectedId) return;
    try {
      setBusy(true, `正在${copy.title}。`);
      const record = await store.transition(selectedId, action, {
        versionId: selectedRecord?.versionId,
        actor: "目前使用者",
        nextOwner: copy.nextOwner,
        note,
      });
      await reload(record.id);
      showToast(copy.success);
    } catch (error) {
      showBanner(
        safeErrorMessage(error, `${copy.title}未完成，請稍後再試。`),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  elements.return.addEventListener(
    "click",
    () => requestConfirmation("return_revision"),
  );
  elements.publish.addEventListener(
    "click",
    () => requestConfirmation("publish"),
  );
  elements.retire.addEventListener(
    "click",
    () => requestConfirmation("retire"),
  );
  elements.confirmationCancel.addEventListener("click", closeConfirmation);
  elements.confirmation.addEventListener("cancel", (eventObject) => {
    eventObject.preventDefault();
    closeConfirmation();
  });
  elements.confirmationConfirm.addEventListener("click", () => {
    const note = elements.confirmationNote.value.trim();
    if (!note) {
      elements.confirmationError.textContent = "請填寫此次處理說明。";
      elements.confirmationError.hidden = false;
      elements.confirmationNote.focus();
      return;
    }
    const action = pendingConfirmation;
    closeConfirmation();
    void runConfirmedAction(action, note);
  });

  elements.revision.addEventListener("click", async () => {
    try {
      setBusy(true, "正在建立新版本草稿。");
      const record = await store.createRevision(selectedId, "目前使用者");
      await reload(record.id);
      showToast("新版本草稿已建立。");
    } catch (error) {
      showBanner(
        safeErrorMessage(error, "目前無法建立新版本，請稍後再試。"),
        "error",
      );
    } finally {
      setBusy(false);
    }
  });

  elements.back.addEventListener("click", () => {
    const decision = decideMobileBack({
      editorMode,
      dirty,
      discardConfirmed: !hasUnsavedChanges() || canLeaveEditor(),
    });
    if (decision.action === "stay") return;
    if (decision.discard && editorMode === "new") {
      discardDraftBuffer(selectedRecord);
      clearSelection();
      showBanner("");
    } else if (decision.discard && selectedRecord) {
      renderDetail(selectedRecord, "edit");
      showBanner("未儲存的修改已取消。");
    }
    setMobilePane("list");
    const selectedRow = elements.list.querySelector(
      `[data-record-id="${CSS.escape(selectedId || "")}"]`,
    );
    (selectedRow || elements.newDraft).focus();
  });

  elements.retry.addEventListener("click", () => void reload());

  elements.form.addEventListener("input", (eventObject) => {
    if (!currentRecordEditable()) return;
    const field = eventObject.target;
    if (field?.name) {
      const error = document.querySelector(`#${fieldErrorId(field.name)}`);
      field.removeAttribute("aria-invalid");
      if (error) {
        error.textContent = "";
        error.hidden = true;
      }
    }
    dirty = editorMode === "new" ||
      editorSnapshot() !== baseEditorValues;
    updateUnsavedState();
  });

  window.addEventListener("beforeunload", (eventObject) => {
    if (!hasUnsavedChanges()) return;
    eventObject.preventDefault();
    eventObject.returnValue = "";
  });

  [
    elements.search,
    elements.statusFilter,
    elements.typeFilter,
    elements.ownerFilter,
  ]
    .forEach((control) =>
      control.addEventListener("input", () => {
        void reconcileFilteredSelection();
      })
    );
  document.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      activeView = "all";
      elements.navButtons.forEach((navButton) => {
        const active = navButton.dataset.view === "all";
        navButton.classList.toggle("is-active", active);
        if (active) {
          navButton.setAttribute("aria-current", "page");
        } else {
          navButton.removeAttribute("aria-current");
        }
      });
      elements.statusFilter.value =
        elements.statusFilter.value === button.dataset.status
          ? ""
          : button.dataset.status;
      void reconcileFilteredSelection();
    });
  });
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!canLeaveEditor()) return;
      void setActiveView(button.dataset.view);
    });
  });
  document.querySelector(".nav-list").addEventListener(
    "keydown",
    (eventObject) => {
      if (
        !["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(
          eventObject.key,
        )
      ) {
        return;
      }
      eventObject.preventDefault();
      const currentIndex = elements.navButtons.indexOf(document.activeElement);
      const direction =
        eventObject.key === "ArrowDown" || eventObject.key === "ArrowRight"
          ? 1
          : -1;
      const nextIndex =
        (Math.max(currentIndex, 0) + direction + elements.navButtons.length) %
        elements.navButtons.length;
      const nextButton = elements.navButtons[nextIndex];
      void setActiveView(nextButton.dataset.view, { moveFocus: true });
    },
  );

  elements.modeNote.textContent = store.mode === "sample"
    ? "目前顯示的規則僅供流程操作示範，不是案件事實；本頁新增內容重新整理後不會保留。"
    : "只有完成覆核並發布的規則，才會提供給受控工作流程。";
  setMobilePane("list");
  reload();
}

if (typeof document !== "undefined") {
  initStudio();
}
