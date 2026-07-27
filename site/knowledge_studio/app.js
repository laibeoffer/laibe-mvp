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

function event(action, actor, status, nextOwner, sourceDocument = "") {
  return {
    action,
    actor,
    time: now(),
    status,
    nextOwner,
    nextAction: nextActionFor(action, status),
    sourceDocument,
    formalImpact: "none",
  };
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
  ];
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
      title: input.title || "未命名規則",
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
        ),
      ],
    };
    this.records[index] = updated;
    return clone(updated);
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
    const title = String(input.title || "未命名規則").trim();
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
        ruleKind: "review_guard",
        unifiedItemCode: "",
        conditions: { criteria: input.criteria || "" },
        output: { summary: input.summary || "" },
      };
    } else if (domain === "contract") {
      rule = {
        ruleType: "contract_evidence_rule",
        ruleCode,
        allowedOutputKind: "evidence_comparison",
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
        ruleKind: "document_consistency",
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
      evidence: version.source?.locator || version.evidenceSummary?.[0] || "",
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
        sourceDocument: version.source?.locator || "",
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
    empty: document.querySelector("#empty-state"),
    banner: document.querySelector("#state-banner"),
    count: document.querySelector("#result-count"),
    form: document.querySelector("#detail-form"),
    placeholder: document.querySelector("#detail-placeholder"),
    search: document.querySelector("#search-input"),
    statusFilter: document.querySelector("#status-filter"),
    typeFilter: document.querySelector("#type-filter"),
    ownerFilter: document.querySelector("#owner-filter"),
    newDraft: document.querySelector("#new-draft-button"),
    save: document.querySelector("#save-button"),
    submit: document.querySelector("#submit-button"),
    publish: document.querySelector("#publish-button"),
    return: document.querySelector("#return-button"),
    retire: document.querySelector("#retire-button"),
    revision: document.querySelector("#revision-button"),
    toast: document.querySelector("#toast"),
    navButtons: Array.from(document.querySelectorAll("[data-view]")),
  };
  let records = [];
  let selectedId = null;
  let selectedRecord = null;
  let activeView = "all";

  function showBanner(message, tone = "neutral") {
    elements.banner.textContent = message;
    elements.banner.dataset.tone = tone;
    elements.banner.hidden = !message;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2400);
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
          >
            <span class="record-main">
              <span class="record-title">${escapeText(record.title)}</span>
              <span class="record-meta">
                ${escapeText(record.type)} · 版本 ${escapeText(record.version)}
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
        () => selectRecord(button.dataset.recordId),
      );
    });
    return filtered;
  }

  function clearSelection() {
    selectedId = null;
    selectedRecord = null;
    elements.form.hidden = true;
    elements.placeholder.hidden = false;
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

  async function selectRecord(id) {
    try {
      const record = await store.get(id);
      selectedId = id;
      selectedRecord = record;
      elements.placeholder.hidden = true;
      elements.form.hidden = false;
      document.querySelector("#detail-status").textContent =
        STATUS_LABEL[record.status];
      document.querySelector("#detail-status").dataset.status = record.status;
      document.querySelector("#detail-title-display").textContent =
        record.title;
      document.querySelector("#detail-version").textContent =
        `版本 ${record.version}`;
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
                <strong>${
            escapeText(ACTION_LABEL[item.action] || item.action)
          }</strong>
                <span>${escapeText(item.actor)} · ${
            escapeText(formatTime(item.time))
          }</span>
                <small>下一步：${
            escapeText(item.nextAction || "尚未指定")
          }；處理者：${escapeText(item.nextOwner || "尚未指定")}</small>
              </div>
            </li>
          `,
        )
        .join("");
      const editable = record.status === STATUS.DRAFT;
      Array.from(elements.form.elements).forEach((field) => {
        if (field.matches("input, textarea, select")) {
          field.disabled = !editable;
        }
      });
      elements.save.hidden = !editable;
      elements.submit.hidden = !editable;
      elements.return.hidden = record.status !== STATUS.PENDING_REVIEW;
      elements.publish.hidden = record.status !== STATUS.PENDING_REVIEW;
      elements.retire.hidden = record.status !== STATUS.APPROVED;
      elements.revision.hidden = record.status !== STATUS.APPROVED;
      renderList();
    } catch (error) {
      showBanner(error.message, "error");
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
    showBanner("正在整理規則紀錄。");
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
          await selectRecord(nextSelectedId);
        } else {
          clearSelection();
          renderList();
        }
      }
    } catch (error) {
      showBanner(`${error.message} 請重新整理頁面。`, "error");
    }
  }

  elements.form.addEventListener("submit", async (eventObject) => {
    eventObject.preventDefault();
    try {
      const record = await store.saveDraft(formValue());
      await reload(record.id);
      showToast("草稿已儲存。");
    } catch (error) {
      showBanner(error.message, "error");
    }
  });

  elements.newDraft.addEventListener("click", async () => {
    try {
      const record = await store.createDraft({
        title: "未命名規則",
        type: "圖說檢查規則",
        owner: "PCM",
        nextOwner: "規則整理人",
        actor: "目前使用者",
      });
      await setActiveView("all");
      await reload(record.id);
      elements.form.elements.title.focus();
    } catch (error) {
      showBanner(error.message, "error");
    }
  });

  async function runAction(action, nextOwner, successMessage) {
    if (!selectedId) return;
    try {
      const record = await store.transition(selectedId, action, {
        actor: "目前使用者",
        nextOwner,
      });
      await reload(record.id);
      showToast(successMessage);
    } catch (error) {
      showBanner(error.message, "error");
    }
  }

  elements.submit.addEventListener(
    "click",
    () => runAction("submit_review", "PCM 覆核人", "已送交覆核。"),
  );
  elements.return.addEventListener(
    "click",
    () => runAction("return_revision", "規則整理人", "已退回修正。"),
  );
  elements.publish.addEventListener(
    "click",
    () => runAction("publish", "PCM 維護人", "規則已發布。"),
  );
  elements.retire.addEventListener(
    "click",
    () => runAction("retire", "PCM 維護人", "規則已停用。"),
  );
  elements.revision.addEventListener("click", async () => {
    try {
      const record = await store.createRevision(selectedId, "目前使用者");
      await reload(record.id);
      showToast("新版本草稿已建立。");
    } catch (error) {
      showBanner(error.message, "error");
    }
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

  reload();
}

if (typeof document !== "undefined") {
  initStudio();
}
