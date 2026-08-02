const REQUIRED_SUPPLEMENT_FIELDS = [
  "reasonCode",
  "details",
  "documentId",
  "recipientActorId",
  "dueAt",
];

const CURRENT_IDENTITY = Object.freeze({
  actorId: "pcm-reviewer-001",
  capability: "pcm_reviewer",
  roleLabel: "PCM 審查員",
  displayName: "試營運書面審查帳號",
});

const CASES = [
  {
    caseId: "case-pcm-001",
    referenceCode: "PCM-2026-001",
    title: "試營運書面審查｜住宅裝修需求釐清",
    ownerActorId: "owner-001",
    status: "IN_REVIEW",
    statusLabel: "待人工審查",
    handoffActorId: "pcm-reviewer-001",
    handoffLabel: "PCM 審查員",
    nextAction: "確認報價範圍與圖面版本",
    documentVersion: "需求彙整 v3",
    riskLevel: "HIGH",
    riskLabel: "高風險",
    dueLabel: "今天 17:00 前",
    summary:
      "業主已補上需求彙整與平面圖，請確認報價項目是否以同一份施工範圍為依據。",
    progress: [
      { stepId: "intake", label: "案件受理", state: "DONE" },
      { stepId: "document_check", label: "文件檢核", state: "DONE" },
      { stepId: "human_review", label: "人工審查", state: "ACTIVE" },
      { stepId: "owner_decision", label: "業主確認", state: "UPCOMING" },
    ],
    parties: [
      {
        actorId: "owner-001",
        roleLabel: "業主",
        displayName: "案件業主",
      },
      {
        actorId: "provider-001",
        roleLabel: "設計／統包",
        displayName: "受邀服務方",
      },
      {
        actorId: "pcm-reviewer-001",
        roleLabel: "PCM",
        displayName: "試營運書面審查帳號",
      },
    ],
    documents: [
      {
        documentId: "document-requirement-v3",
        name: "裝修需求彙整",
        versionLabel: "v3",
        receivedLabel: "07/27 09:12 收到",
        stateLabel: "本次審查依據",
      },
      {
        documentId: "document-plan-v3",
        name: "平面配置圖",
        versionLabel: "v3",
        receivedLabel: "07/27 09:15 收到",
        stateLabel: "待核對頁首版次",
      },
      {
        documentId: "document-quote-v2",
        name: "工程報價範圍",
        versionLabel: "v2",
        receivedLabel: "07/26 16:40 收到",
        stateLabel: "待比對",
      },
    ],
    findings: [
      {
        findingId: "finding-001",
        severity: "HIGH",
        severityLabel: "高風險",
        title: "圖面與報價附件的版次標示不一致",
        detail:
          "平面圖頁首標示 v3，報價附件仍引用 v2；需由文件提供者確認本次施工範圍。",
        status: "OPEN",
        statusLabel: "待確認",
        documentId: "document-plan-v3",
        basisLabel: "平面配置圖 v3",
      },
      {
        findingId: "finding-002",
        severity: "MEDIUM",
        severityLabel: "需留意",
        title: "拆除範圍缺少保留項目說明",
        detail:
          "目前文件有拆除區域，但未列出既有設備保留方式，後續報價可能產生解讀差異。",
        status: "OPEN",
        statusLabel: "待補充",
        documentId: "document-requirement-v3",
        basisLabel: "裝修需求彙整 v3",
      },
      {
        findingId: "finding-003",
        severity: "LOW",
        severityLabel: "已核對",
        title: "主要空間名稱與業主需求一致",
        detail: "客廳、主臥與工作區名稱可互相對照，未發現範圍遺漏。",
        status: "CONFIRMED",
        statusLabel: "已確認",
        documentId: "document-plan-v3",
        basisLabel: "平面配置圖 v3",
      },
    ],
    decisions: [],
    events: [
      {
        eventId: "event-case-intake-001",
        caseId: "case-pcm-001",
        eventType: "case_assigned",
        actorId: "system-case-routing",
        actorLabel: "案件指派",
        actionLabel: "案件已交由 PCM 審查",
        basisLabel: "需求彙整 v3",
        occurredAt: "2026-07-27T09:20:00.000Z",
        occurredAtLabel: "07/27 09:20",
        status: "RECORDED",
        statusLabel: "已記錄",
      },
      {
        eventId: "event-owner-upload-001",
        caseId: "case-pcm-001",
        eventType: "document_received",
        actorId: "owner-001",
        actorLabel: "業主",
        actionLabel: "補上平面配置圖 v3",
        basisLabel: "平面配置圖 v3",
        occurredAt: "2026-07-27T09:15:00.000Z",
        occurredAtLabel: "07/27 09:15",
        status: "RECORDED",
        statusLabel: "已記錄",
      },
    ],
  },
  {
    caseId: "case-pcm-002",
    referenceCode: "PCM-2026-002",
    title: "試營運書面審查｜廚房設備範圍確認",
    ownerActorId: "owner-002",
    status: "WAITING_SUPPLEMENT",
    statusLabel: "等待補件",
    handoffActorId: "provider-002",
    handoffLabel: "設計／統包",
    nextAction: "補上設備規格與安裝界面",
    documentVersion: "報價比較 v2",
    riskLevel: "MEDIUM",
    riskLabel: "需留意",
    dueLabel: "明天 12:00 前",
    summary: "設備規格尚未齊全，待文件提供者補充後續審。",
    progress: [
      { stepId: "intake", label: "案件受理", state: "DONE" },
      { stepId: "document_check", label: "文件檢核", state: "ACTIVE" },
      { stepId: "human_review", label: "人工審查", state: "UPCOMING" },
      { stepId: "owner_decision", label: "業主確認", state: "UPCOMING" },
    ],
    parties: [],
    documents: [],
    findings: [],
    decisions: [],
    events: [],
  },
  {
    caseId: "case-pcm-003",
    referenceCode: "PCM-2026-003",
    title: "試營運書面審查｜浴室追加需求整理",
    ownerActorId: "owner-003",
    status: "WAITING_OWNER_DECISION",
    statusLabel: "等待業主決定",
    handoffActorId: "owner-003",
    handoffLabel: "業主",
    nextAction: "閱讀人工審查紀錄並確認需求版本",
    documentVersion: "需求變更 v1",
    riskLevel: "LOW",
    riskLabel: "低風險",
    dueLabel: "07/31 前",
    summary: "人工審查已完成，等待業主確認是否採用本次需求版本。",
    progress: [
      { stepId: "intake", label: "案件受理", state: "DONE" },
      { stepId: "document_check", label: "文件檢核", state: "DONE" },
      { stepId: "human_review", label: "人工審查", state: "DONE" },
      { stepId: "owner_decision", label: "業主確認", state: "ACTIVE" },
    ],
    parties: [],
    documents: [],
    findings: [],
    decisions: [],
    events: [],
  },
];

function clone(value) {
  if (Array.isArray(value)) {
    return value.map((item) => clone(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    );
  }
  return value;
}

function defaultIdFactory(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

function requiredText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertCase(cases, caseId) {
  const caseRecord = cases.find((item) => item.caseId === caseId);
  if (!caseRecord) {
    const error = new Error("找不到這個案件，請回到案件列表重新選擇。");
    error.code = "CASE_NOT_FOUND";
    throw error;
  }
  return caseRecord;
}

function assertReviewer(actorId) {
  if (actorId !== CURRENT_IDENTITY.actorId) {
    const error = new Error("你目前沒有執行這項審查的權限。");
    error.code = "PERMISSION_DENIED";
    throw error;
  }
}

function assertReviewerTurn(caseRecord, actorId) {
  if (
    caseRecord.handoffActorId !== actorId ||
    caseRecord.status !== "IN_REVIEW"
  ) {
    const error = new Error(
      "這個案件正在等待下一位處理者，收到回覆後才能繼續人工審查。",
    );
    error.code = "CASE_NOT_READY_FOR_PCM_REVIEW";
    throw error;
  }
}

function findPartyLabel(caseRecord, actorId) {
  return (
    caseRecord.parties.find((party) => party.actorId === actorId)?.roleLabel ??
      "指定收件者"
  );
}

function formatOccurredAt(isoTimestamp) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.valueOf())) {
    return "時間待確認";
  }
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(date);
}

export function validateSupplementRequest(input) {
  const errors = {};
  for (const field of REQUIRED_SUPPLEMENT_FIELDS) {
    if (!requiredText(input?.[field])) {
      errors[field] = "此欄位需要填寫";
    }
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function buildSupplementRequestEvent(input, context) {
  const validation = validateSupplementRequest(input);
  if (!validation.valid) {
    const error = new Error("請完整填寫補件原因、說明、文件、收件者與期限。");
    error.code = "INVALID_SUPPLEMENT_REQUEST";
    error.fieldErrors = validation.errors;
    throw error;
  }

  return {
    eventId: context.idFactory("event-supplement"),
    caseId: context.caseId,
    eventType: "supplement_requested",
    actorId: context.actorId,
    documentId: input.documentId,
    recipientActorId: input.recipientActorId,
    reasonCode: input.reasonCode,
    details: input.details.trim(),
    dueAt: input.dueAt,
    occurredAt: context.now(),
    status: "OPEN",
  };
}

function buildHumanReviewEvent(input, context) {
  if (!requiredText(input.summary)) {
    const error = new Error("請先寫下人工審查摘要。");
    error.code = "REVIEW_SUMMARY_REQUIRED";
    throw error;
  }

  return {
    eventId: context.idFactory("event-review"),
    caseId: context.caseId,
    eventType: "human_review_completed",
    actorId: context.actorId,
    summary: input.summary.trim(),
    occurredAt: context.now(),
    status: "RECORDED",
  };
}

export function createDemoPcmAdapter(options = {}) {
  const now = options.now ?? (() => new Date().toISOString());
  const idFactory = options.idFactory ?? defaultIdFactory;
  const cases = clone(options.initialCases ?? CASES);

  return Object.freeze({
    // deno-lint-ignore require-await
    async getCurrentIdentity() {
      return clone(CURRENT_IDENTITY);
    },

    // deno-lint-ignore require-await
    async listCases() {
      return clone(cases);
    },

    // deno-lint-ignore require-await
    async getCase(caseId) {
      return clone(assertCase(cases, caseId));
    },

    // deno-lint-ignore require-await
    async requestSupplement(input) {
      assertReviewer(input.actorId);
      const caseRecord = assertCase(cases, input.caseId);
      assertReviewerTurn(caseRecord, input.actorId);
      const event = buildSupplementRequestEvent(input, {
        caseId: input.caseId,
        actorId: input.actorId,
        now,
        idFactory,
      });
      const documentLabel = caseRecord.documents.find(
        (document) => document.documentId === input.documentId,
      )?.name ?? "指定文件";
      const recipientLabel = findPartyLabel(
        caseRecord,
        input.recipientActorId,
      );

      Object.assign(event, {
        actorLabel: CURRENT_IDENTITY.roleLabel,
        actionLabel: `要求補充：${documentLabel}`,
        basisLabel: documentLabel,
        occurredAtLabel: formatOccurredAt(event.occurredAt),
        statusLabel: "待補件",
      });
      caseRecord.events.push(event);
      caseRecord.status = "WAITING_SUPPLEMENT";
      caseRecord.statusLabel = "等待補件";
      caseRecord.handoffActorId = input.recipientActorId;
      caseRecord.handoffLabel = recipientLabel;
      caseRecord.nextAction =
        `${recipientLabel}補齊「${documentLabel}」後，由 PCM 續審`;
      caseRecord.dueLabel = `${input.dueAt} 前`;

      return {
        event: clone(event),
        caseRecord: clone(caseRecord),
      };
    },

    // deno-lint-ignore require-await
    async completeHumanReview(input) {
      assertReviewer(input.actorId);
      const caseRecord = assertCase(cases, input.caseId);
      assertReviewerTurn(caseRecord, input.actorId);
      const event = buildHumanReviewEvent(input, {
        caseId: input.caseId,
        actorId: input.actorId,
        now,
        idFactory,
      });
      const decision = {
        decisionId: idFactory("decision-human-review"),
        caseId: input.caseId,
        eventId: event.eventId,
        actorId: input.actorId,
        decisionType: "PCM_HUMAN_REVIEW",
        summary: event.summary,
        recordedAt: event.occurredAt,
        status: "RECORDED",
      };

      Object.assign(event, {
        actorLabel: CURRENT_IDENTITY.roleLabel,
        actionLabel: "完成人工審查紀錄",
        basisLabel: caseRecord.documentVersion,
        occurredAtLabel: formatOccurredAt(event.occurredAt),
        statusLabel: "已記錄",
      });
      caseRecord.decisions.push(decision);
      caseRecord.events.push(event);
      caseRecord.status = "WAITING_OWNER_DECISION";
      caseRecord.statusLabel = "等待業主決定";
      caseRecord.handoffActorId = caseRecord.ownerActorId;
      caseRecord.handoffLabel = "業主";
      caseRecord.nextAction = "業主閱讀人工審查紀錄並決定是否採用目前版本";
      caseRecord.progress = caseRecord.progress.map((step) => {
        if (step.stepId === "human_review") {
          return { ...step, state: "DONE" };
        }
        if (step.stepId === "owner_decision") {
          return { ...step, state: "ACTIVE" };
        }
        return step;
      });

      return {
        event: clone(event),
        decision: clone(decision),
        caseRecord: clone(caseRecord),
      };
    },
  });
}
