const PRODUCT_STATES = Object.freeze({
  loading: "正在整理案件狀態，請稍候。",
  empty: "目前沒有可整理的案件內容；有授權文件或共用對話後，這裡會顯示下一步。",
  "retryable-error": "暫時無法取得案件狀態，請稍後重新整理本頁。",
  "permission-denied": "你目前沒有此案件的共用檢視權限；請回到原邀請或請案件負責人確認授權。",
  ready: "案件狀態已整理完成，請依下一步責任人處理。",
});

const OWNER_PRIVATE_GROUP = "OWNER_DRS_PRIVATE";
const OWNER_VENDOR_SHARED_GROUP = "OWNER_VENDOR_DRS_SHARED";
const HUMAN_DECISION_LABELS = Object.freeze({
  EDIT_AND_SEND: "編修後建立送出前紀錄",
  OVERRIDE_AND_SEND: "覆寫提醒後建立送出前紀錄",
  MANUAL_EXCEPTION_SEND: "人工例外建立送出前紀錄",
});

const SOURCE_CASES = Object.freeze({
  "CASE-A7": Object.freeze({
    case: Object.freeze({
      caseId: "CASE-A7",
      caseName: "青埔 A7 新成屋",
      currentStatus: "等待乙方補充尺寸說明",
      currentResponsibleRole: "乙方設計團隊",
      waitingFor: "屋主等待乙方補充尺寸說明",
      nextAction: "乙方補充尺寸後，屋主再決定是否確認平面配置 v2。",
    }),
    messages: Object.freeze([
      Object.freeze({
        id: "private-1",
        group: OWNER_PRIVATE_GROUP,
        actor: "屋主",
        body: "我的疑問草稿：冰箱與中島之間是否保留 90cm？依據平面配置 v2。",
        status: "尚未公開",
      }),
      Object.freeze({
        id: "shared-1",
        group: OWNER_VENDOR_SHARED_GROUP,
        actor: "屋主",
        body: "請乙方確認冰箱與中島距離是否可達 90cm。",
        status: "待乙方",
      }),
      Object.freeze({
        id: "shared-2",
        group: OWNER_VENDOR_SHARED_GROUP,
        actor: "DRS 專員",
        body: "此問題需引用平面配置 v2 與廚具尺寸表，避免後續討論各說各話。",
        status: "已留痕",
      }),
    ]),
    reviewQueue: Object.freeze([
      Object.freeze({
        id: "plan-v2",
        kind: "document",
        label: "平面配置 v2",
        summary: "需補中島與冰箱距離尺寸說明",
        status: "等待乙方補充",
        nextOwner: "乙方設計團隊",
      }),
      Object.freeze({
        id: "drawing-ceiling-v2",
        kind: "drawing",
        label: "天花圖 v2",
        summary: "批次圖面檢視需確認燈具位置與平面一致",
        status: "等待 DRS 專員判斷",
        nextOwner: "DRS 專員",
      }),
      Object.freeze({
        id: "kitchen-size-sheet",
        kind: "document",
        label: "廚具尺寸表",
        summary: "補件後才能和圖面一起比對",
        status: "待補件",
        nextOwner: "乙方設計團隊",
      }),
    ]),
    traceEntries: Object.freeze([
      Object.freeze({
        id: "trace-1",
        time: "07/10 14:07",
        actor: "乙方設計團隊",
        summary: "送出平面配置 v2",
        detail: "狀態改為等待屋主確認，DRS 專員已標示需補尺寸說明。",
      }),
      Object.freeze({
        id: "trace-2",
        time: "07/11 09:20",
        actor: "屋主",
        summary: "提出中島距離疑問",
        detail: "引用平面配置 v2，下一步責任人為乙方設計團隊。",
      }),
    ]),
    submittedSnapshot: Object.freeze({
      title: "送出前快照",
      caseName: "青埔 A7 新成屋",
      referencedDocuments: "平面配置 v2、廚具尺寸表",
      currentState: "等待乙方補尺寸說明",
      nextAction: "乙方回覆後由屋主確認",
    }),
    aiAdvisory: Object.freeze({
      status: "需人工確認",
      findings: Object.freeze([
        Object.freeze({ label: "尺寸疑點", summary: "中島通道可能不足", status: "需確認" }),
        Object.freeze({ label: "文件缺口", summary: "廚具尺寸表缺少版次", status: "需確認" }),
      ]),
    }),
  }),
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultStore(sourceCases = SOURCE_CASES) {
  const cases = new Map(Object.entries(sourceCases).map(([caseId, value]) => [caseId, clone(value)]));
  return { cases, transitions: [] };
}

function authorizedGroupsFor(role) {
  if (role === "owner") return [OWNER_PRIVATE_GROUP, OWNER_VENDOR_SHARED_GROUP];
  if (role === "vendor") return [OWNER_VENDOR_SHARED_GROUP];
  if (role === "specialist") return [OWNER_PRIVATE_GROUP, OWNER_VENDOR_SHARED_GROUP];
  return [];
}

function scopeSnapshotForRole(snapshot, role) {
  const scoped = clone(snapshot);
  const groups = authorizedGroupsFor(role);
  if (!groups.length) return scoped;
  scoped.messages = scoped.messages.filter((message) => groups.includes(message.group));
  return scoped;
}

function createLocalDrsTransport(options = {}) {
  const store = options.store ?? createDefaultStore(options.cases);
  const role = options.role ?? "specialist";

  return {
    async loadCaseSnapshot({ caseId }) {
      const snapshot = store.cases.get(caseId);
      return snapshot ? scopeSnapshotForRole(snapshot, role) : null;
    },

    async recordLocalTransition({ caseId, transition }) {
      const snapshot = store.cases.get(caseId);
      if (!snapshot) return null;

      const receipt = {
        transport: "local",
        caseId,
        transitionId: `local-${String(store.transitions.length + 1).padStart(3, "0")}`,
        label: transition.label ?? "本頁已記錄，正式開放後才會寫入案件紀錄。",
        decision: transition.decision ?? "",
        ...(transition.receiptFields ?? {}),
      };

      if (transition.itemId) {
        const item = snapshot.reviewQueue.find((candidate) => candidate.id === transition.itemId);
        if (item) item.status = transition.nextStatus;
      }

      if (transition.traceEntry) snapshot.traceEntries.push(transition.traceEntry);
      if (transition.finalTransportReceipt) snapshot.finalTransportReceipt = { ...receipt, ...transition.finalTransportReceipt };
      store.transitions.push({ caseId, transition: clone(transition), receipt });
      return { receipt };
    },
  };
}

function stateModel(state, role, caseId, productMessage = PRODUCT_STATES[state]) {
  return {
    state,
    role,
    case: { caseId, caseName: "尚未載入案件" },
    status: {
      currentResponsibleRole: "尚未確認",
      waitingFor: "等待案件狀態整理",
      nextAction: "請稍後重新整理本頁。",
    },
    authorizedGroups: [],
    messages: [],
    reviewQueue: [],
    traceEntries: [],
    submittedSnapshot: null,
    aiAdvisory: { status: "尚未整理", findings: [] },
    finalTransportReceipt: null,
    productMessage,
  };
}

function hasCaseAccess(role, caseId, snapshot) {
  if (!snapshot) return false;
  if (caseId !== "CASE-A7") return false;
  return ["owner", "vendor", "specialist"].includes(role);
}

function productLabelForHumanDecision(decision) {
  return HUMAN_DECISION_LABELS[decision] ?? "人工判斷建立送出前紀錄";
}

function buildRoleView({ role, caseId, snapshot }) {
  const authorizedGroups = authorizedGroupsFor(role);
  const messages = snapshot.messages.filter((message) => authorizedGroups.includes(message.group));
  return {
    state: "ready",
    role,
    case: snapshot.case,
    status: {
      currentResponsibleRole: snapshot.case.currentResponsibleRole,
      waitingFor: snapshot.case.waitingFor,
      nextAction: snapshot.case.nextAction,
    },
    authorizedGroups,
    messages,
    reviewQueue: snapshot.reviewQueue,
    traceEntries: snapshot.traceEntries,
    submittedSnapshot: snapshot.submittedSnapshot,
    aiAdvisory: snapshot.aiAdvisory,
    finalTransportReceipt: snapshot.finalTransportReceipt ?? null,
    productMessage: PRODUCT_STATES.ready,
  };
}

function createDrsDataClient({ role, caseId, transport }) {
  if (!transport) throw new Error("DRS data client requires an injected transport");

  return {
    async loadWorkspace({ state = "ready" } = {}) {
      if (state === "loading" || state === "empty" || state === "retryable-error") return stateModel(state, role, caseId);
      const snapshot = await transport.loadCaseSnapshot({ caseId });
      if (state === "permission-denied" || !hasCaseAccess(role, caseId, snapshot)) return stateModel("permission-denied", role, caseId);
      return buildRoleView({ role, caseId, snapshot });
    },

    async transitionReviewItem({ itemId, action }) {
      const nextStatus = action === "mark-reviewed" ? "已標記可供人工判斷" : "等待 DRS 專員判斷";
      const transition = {
        itemId,
        action,
        nextStatus,
        label: "本頁已記錄文件與圖面檢視狀態；正式開放後才會寫入案件紀錄。",
        traceEntry: {
          id: `trace-review-${itemId}`,
          time: "本頁操作",
          actor: role === "specialist" ? "DRS 專員" : role === "vendor" ? "乙方設計團隊" : "屋主",
          summary: "批次圖面檢視狀態已更新",
          detail: "本頁會保留引用文件、處理人、狀態與下一步責任人。",
        },
      };
      return transport.recordLocalTransition({ caseId, transition });
    },

    async recordHumanDecision({ decision, reason, referencedDocumentBasis, currentState, nextActor, urgency, serviceIncidentId }) {
      if (role !== "specialist") throw new Error("只有 DRS 專員可以建立送出前決策紀錄。");
      if (!reason || !referencedDocumentBasis || !currentState || !nextActor) throw new Error("請填寫人工判斷原因、引用文件、目前狀態與下一步責任人。");
      if (decision === "MANUAL_EXCEPTION_SEND" && (!urgency || !serviceIncidentId)) throw new Error("請填寫急迫程度與服務事件編號。");

      const decisionLabel = productLabelForHumanDecision(decision);
      const receiptFields = {
        reason,
        referencedDocumentBasis,
        currentState,
        nextActor,
        urgency: urgency ?? "",
        serviceIncidentId: serviceIncidentId ?? "",
      };
      const transition = {
        decision,
        label: "已建立本頁送出前收據，等待專員確認正式送出。",
        receiptFields,
        traceEntry: {
          id: `trace-decision-${decision}`,
          time: "本頁操作",
          actor: "DRS 專員",
          summary: decisionLabel,
          detail: `AI 不會自行送出，也不是核准者；專員確認前只保留本頁收據。原因：${reason}。依據文件：${referencedDocumentBasis}。目前狀態：${currentState}。下一步責任人：${nextActor}。`,
        },
        finalTransportReceipt: {
          decision,
          label: "已建立本頁送出前收據，等待專員確認正式送出。",
          ...receiptFields,
        },
      };
      return transport.recordLocalTransition({ caseId, transition });
    },
  };
}

export { PRODUCT_STATES, createDrsDataClient, createLocalDrsTransport };
