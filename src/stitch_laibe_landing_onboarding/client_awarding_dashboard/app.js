export const OWNER_WORKSPACE_STATES = Object.freeze([
  "ACCESS_CHECKING",
  "ACCESS_DENIED",
  "CONTRACT_CONTEXT_UNAVAILABLE",
  "AUTHORIZED_EMPTY",
  "AUTHORIZED_READY",
  "PCM_SERVICE_ENDED_READ_ONLY",
  "LOAD_FAILED_RETRYABLE",
]);

export const OWNER_WORKSPACE_ACCESS = Object.freeze({
  sessionStatus: "active",
  actorRole: "owner",
  membershipStatus: "active",
  activeAgreementStatus: "active",
  endedAgreementStatus: "ended",
  caseBindingStatus: "bound",
  domainStatus: "active",
});

const OWNER_DOCUMENTS_CANONICAL_URL =
  "http://127.0.0.1:4173/pcm/owner/workspace/#documents";
const LINE_SHARE_BASE_URL = "https://social-plugins.line.me/lineit/share";

export const PRECONTRACT_BOUNDARY = "REGISTERED != CONTRACTED";

export const OWNER_CONTRACT_IMPACT_KEYS = Object.freeze([
  "scope",
  "price",
  "time",
  "payment",
  "acceptance",
  "material",
  "warranty",
]);

export const OWNER_CONTRACT_FACT_KEYS = Object.freeze([
  "ownerName",
  "vendorName",
  "projectName",
  "projectAddress",
  "designScope",
  "worksScope",
  "designAmount",
  "worksAmount",
  "startDate",
  "endDate",
  "paymentBasis",
  "acceptanceBasis",
  "warrantyBasis",
]);

const OWNER_CONTRACT_FACT_LABELS = Object.freeze({
  ownerName: "甲方姓名／名稱",
  vendorName: "乙方姓名／公司",
  projectName: "專案名稱",
  projectAddress: "專案地址",
  designScope: "設計服務範圍",
  worksScope: "工程施作範圍",
  designAmount: "設計費總額",
  worksAmount: "工程費總額",
  startDate: "預定開始日",
  endDate: "預定完成日",
  paymentBasis: "付款依據",
  acceptanceBasis: "驗收依據",
  warrantyBasis: "保固依據",
});

export const OWNER_CONTRACT_VIEW_KEYS = Object.freeze([
  "overview",
  "facts",
  "changes",
  "records",
]);

export const OWNER_DASHBOARD_HASHES = Object.freeze({
  design: "#design-review",
  construction: "#construction-records",
  contract: "#owner-dashboard-panel-contract",
});

export const OWNER_CONTRACT_VIEW_HASHES = Object.freeze({
  overview: "#owner-contract-view-panel-overview",
  facts: "#owner-contract-view-panel-facts",
  changes: "#owner-contract-view-panel-changes",
  records: "#owner-contract-view-panel-records",
});

const OWNER_CONTRACT_IMPACT_LABELS = Object.freeze({
  scope: "工作範圍",
  price: "價格",
  time: "工期",
  payment: "付款條件",
  acceptance: "驗收",
  material: "材料",
  warranty: "保固",
});

function ownerContractText(value, maximumLength) {
  return typeof value === "string"
    ? value.trim().replace(/\r\n?/g, "\n").slice(0, maximumLength)
    : "";
}

function frozenOwnerContractDraft(source = {}) {
  const requestedImpacts = Array.isArray(source.impactKeys)
    ? new Set(source.impactKeys)
    : new Set();
  const impactKeys = Object.freeze(
    OWNER_CONTRACT_IMPACT_KEYS.filter((key) => requestedImpacts.has(key)),
  );
  const attachments = Object.freeze(
    (Array.isArray(source.attachments) ? source.attachments : [])
      .slice(0, 8)
      .map((attachment) => Object.freeze({
        name: ownerContractText(attachment?.name, 180),
        note: ownerContractText(attachment?.note, 300),
      }))
      .filter((attachment) => attachment.name !== ""),
  );
  return Object.freeze({
    title: ownerContractText(source.title, 120),
    detail: ownerContractText(source.detail, 2000),
    impactKeys,
    classification: classifyOwnerContractEntry(impactKeys),
    attachments,
    ownerConfirmationIntent: source.ownerConfirmationIntent === true,
    partyAgreement: false,
    formallyPersisted: false,
  });
}

export function classifyOwnerContractEntry(impactKeys) {
  const keys = Array.isArray(impactKeys) ? impactKeys : [];
  return keys.some((key) => OWNER_CONTRACT_IMPACT_KEYS.includes(key))
    ? "CHANGE_PROPOSAL"
    : "SUPPLEMENT";
}

export function createOwnerContractDraftState() {
  return frozenOwnerContractDraft();
}

export function reduceOwnerContractDraft(state, event) {
  const current = frozenOwnerContractDraft(state);
  const action = event && typeof event === "object" ? event : {};
  switch (action.type) {
    case "SET_TITLE":
      return frozenOwnerContractDraft({ ...current, title: action.value });
    case "SET_DETAIL":
      return frozenOwnerContractDraft({ ...current, detail: action.value });
    case "TOGGLE_IMPACT": {
      if (!OWNER_CONTRACT_IMPACT_KEYS.includes(action.key)) {
        return current;
      }
      const selected = new Set(current.impactKeys);
      if (selected.has(action.key)) {
        selected.delete(action.key);
      } else {
        selected.add(action.key);
      }
      return frozenOwnerContractDraft({
        ...current,
        impactKeys: [...selected],
      });
    }
    case "ADD_ATTACHMENT_METADATA": {
      const name = ownerContractText(action.name, 180);
      if (!name) {
        return current;
      }
      return frozenOwnerContractDraft({
        ...current,
        attachments: [
          ...current.attachments,
          { name, note: ownerContractText(action.note, 300) },
        ],
      });
    }
    case "SET_OWNER_CONFIRMATION_INTENT":
      return frozenOwnerContractDraft({
        ...current,
        ownerConfirmationIntent: action.value === true,
      });
    case "CLEAR":
      return createOwnerContractDraftState();
    default:
      return current;
  }
}

function frozenOwnerContractFactsDraft(source = {}) {
  const values = {};
  for (const key of OWNER_CONTRACT_FACT_KEYS) {
    const maximumLength = [
      "designScope",
      "worksScope",
      "paymentBasis",
      "acceptanceBasis",
      "warrantyBasis",
    ].includes(key) ? 1000 : 240;
    values[key] = ownerContractText(source[key], maximumLength);
  }
  return Object.freeze({
    ...values,
    formallyPersisted: false,
    sharedWithVendor: false,
  });
}

export function createOwnerContractFactsDraftState() {
  return frozenOwnerContractFactsDraft();
}

export function reduceOwnerContractFactsDraft(state, event) {
  const current = frozenOwnerContractFactsDraft(state);
  const action = event && typeof event === "object" ? event : {};
  if (
    action.type === "SET_FIELD" &&
    OWNER_CONTRACT_FACT_KEYS.includes(action.field)
  ) {
    return frozenOwnerContractFactsDraft({
      ...current,
      [action.field]: action.value,
    });
  }
  if (action.type === "CLEAR") {
    return createOwnerContractFactsDraftState();
  }
  return current;
}

export function summarizeOwnerContractFactsDraft(state) {
  const current = frozenOwnerContractFactsDraft(state);
  const completed = OWNER_CONTRACT_FACT_KEYS.filter(
    (key) => current[key] !== "",
  ).length;
  return Object.freeze({
    completed,
    total: OWNER_CONTRACT_FACT_KEYS.length,
    nextField: OWNER_CONTRACT_FACT_KEYS.find((key) => current[key] === "") ?? null,
    formallyPersisted: false,
    sharedWithVendor: false,
  });
}

export function resolveOwnerContractViewKey(currentKey, key) {
  const currentIndex = OWNER_CONTRACT_VIEW_KEYS.indexOf(currentKey);
  if (currentIndex < 0) return OWNER_CONTRACT_VIEW_KEYS[0];
  if (key === "ArrowRight" || key === "ArrowDown") {
    return OWNER_CONTRACT_VIEW_KEYS[(currentIndex + 1) % OWNER_CONTRACT_VIEW_KEYS.length];
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return OWNER_CONTRACT_VIEW_KEYS[
      (currentIndex - 1 + OWNER_CONTRACT_VIEW_KEYS.length) % OWNER_CONTRACT_VIEW_KEYS.length
    ];
  }
  if (key === "Home") return OWNER_CONTRACT_VIEW_KEYS[0];
  if (key === "End") return OWNER_CONTRACT_VIEW_KEYS.at(-1);
  return currentKey;
}

const STATE_COPY = Object.freeze({
  ACCESS_CHECKING: Object.freeze({
    label: "正在確認案件權限",
    title: "正在取得你的案件資料",
    message: "完成身分、DRS 服務契約與案件權限確認後，才會顯示案件內容。",
  }),
  ACCESS_DENIED: Object.freeze({
    label: "無法開啟案件",
    title: "目前無法開啟此甲方工作台",
    message: "請由 DRS 首頁的甲方入口重新登入；此頁不會透露未授權案件內容。",
  }),
  CONTRACT_CONTEXT_UNAVAILABLE: Object.freeze({
    label: "尚未連結正式案件",
    title: "尚未連結正式案件",
    message: "甲方身分、DRS 服務契約與案件權限尚未完成確認。",
  }),
  AUTHORIZED_EMPTY: Object.freeze({
    label: "案件權限已確認",
    title: "目前沒有可供你查看的案件內容",
    message: "你的甲方身分已確認；案件資料完成整理後會顯示在這裡。",
  }),
  AUTHORIZED_READY: Object.freeze({
    label: "案件資料已確認",
    title: "你正在查看已授權的甲方案件",
    message: "所有文件、訊息與決策狀態都依正式案件的最新紀錄顯示。",
  }),
  PCM_SERVICE_ENDED_READ_ONLY: Object.freeze({
    label: "專業協作已結束",
    title: "既有案件內容維持可讀",
    message: "既有文件與紀錄仍可讀取；甲乙雙方後續可直接協議，專業協作不再介入。",
  }),
  LOAD_FAILED_RETRYABLE: Object.freeze({
    label: "案件資料暫時無法載入",
    title: "這次未能取得案件資料",
    message: "你可以稍後重新載入；尚未完成的操作不會被顯示為已記錄。",
  }),
});

const EMPTY_LIST_COPY = Object.freeze({
  documents: Object.freeze({
    title: "尚未取得可供顯示的文件",
    body: "確認案件權限後，才會列出可讀取的報價單與施工圖版本。",
  }),
  submissions: Object.freeze({
    title: "尚未取得乙方提交資料",
    body: "未有正式紀錄前，不顯示廠商名稱、金額、排序或回覆狀態。",
  }),
  calendarSubmissions: Object.freeze({
    title: "尚未取得已排程的設計事項",
    body: "只有具備正式排程時間的設計事項，才會列入本週議程。",
  }),
  messages: Object.freeze({
    title: "尚未取得案件訊息",
    body: "只有收到可信留痕憑證後，訊息才會顯示為「已記錄」。",
  }),
  designReviews: Object.freeze({
    title: "尚未取得設計送審紀錄",
    body: "專業檢討可提出書面提醒，但不代替甲方接受設計或宣告現場品質。",
  }),
  designDecisionTrail: Object.freeze({
    title: "尚未取得設計決策紀錄",
    body: "正式案件連結後，會依序顯示提出者、文件版次、書面意見、結果與下一位處理者。",
  }),
  constructionRecords: Object.freeze({
    title: "尚未取得施工或驗收事件",
    body: "施工任務、照片、追加減項與驗收缺失，必須來自正式案件紀錄。",
  }),
  events: Object.freeze({
    title: "尚未取得可供顯示的案件留痕",
    body: "歷史版本不會自動漂移到最新版，再次開啟時仍依案件紀錄顯示。",
  }),
});

const PROCESS_KEYS = Object.freeze([
  "documents",
  "review",
  "governance",
  "execution",
]);

const SHA256_INITIAL_STATE = Object.freeze([
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
]);

const SHA256_ROUND_CONSTANTS = Object.freeze([
  0x428a2f98,
  0x71374491,
  0xb5c0fbcf,
  0xe9b5dba5,
  0x3956c25b,
  0x59f111f1,
  0x923f82a4,
  0xab1c5ed5,
  0xd807aa98,
  0x12835b01,
  0x243185be,
  0x550c7dc3,
  0x72be5d74,
  0x80deb1fe,
  0x9bdc06a7,
  0xc19bf174,
  0xe49b69c1,
  0xefbe4786,
  0x0fc19dc6,
  0x240ca1cc,
  0x2de92c6f,
  0x4a7484aa,
  0x5cb0a9dc,
  0x76f988da,
  0x983e5152,
  0xa831c66d,
  0xb00327c8,
  0xbf597fc7,
  0xc6e00bf3,
  0xd5a79147,
  0x06ca6351,
  0x14292967,
  0x27b70a85,
  0x2e1b2138,
  0x4d2c6dfc,
  0x53380d13,
  0x650a7354,
  0x766a0abb,
  0x81c2c92e,
  0x92722c85,
  0xa2bfe8a1,
  0xa81a664b,
  0xc24b8b70,
  0xc76c51a3,
  0xd192e819,
  0xd6990624,
  0xf40e3585,
  0x106aa070,
  0x19a4c116,
  0x1e376c08,
  0x2748774c,
  0x34b0bcb5,
  0x391c0cb3,
  0x4ed8aa4a,
  0x5b9cca4f,
  0x682e6ff3,
  0x748f82ee,
  0x78a5636f,
  0x84c87814,
  0x8cc70208,
  0x90befffa,
  0xa4506ceb,
  0xbef9a3f7,
  0xc67178f2,
]);

function asText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 500) : fallback;
}

export function createOwnerDocumentLineShareUrl(record) {
  const title = asText(record?.title);
  const versionLabel = asText(record?.versionLabel);
  if (!title || !versionLabel) return null;

  const shareUrl = new URL(LINE_SHARE_BASE_URL);
  shareUrl.searchParams.set("url", OWNER_DOCUMENTS_CANONICAL_URL);
  shareUrl.searchParams.set(
    "text",
    `萊比案件文件｜${title}｜${versionLabel}。接收者需登入並具有本案權限。`,
  );
  return shareUrl.href;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function rotateRight(value, places) {
  return (value >>> places) | (value << (32 - places));
}

export function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(
    paddedLength - 8,
    Math.floor(bitLength / 0x100000000),
    false,
  );
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const state = [...SHA256_INITIAL_STATE];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const lower = words[index - 15];
      const upper = words[index - 2];
      const sigma0 = rotateRight(lower, 7) ^ rotateRight(lower, 18) ^
        (lower >>> 3);
      const sigma1 = rotateRight(upper, 17) ^ rotateRight(upper, 19) ^
        (upper >>> 10);
      words[index] =
        (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^
        rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 =
        (h + sum1 + choice + SHA256_ROUND_CONSTANTS[index] + words[index]) >>>
        0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^
        rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  return state.map((word) => word.toString(16).padStart(8, "0")).join("");
}

function canonicalRecordedAt(value) {
  const source = asText(value);
  const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  if (!timestampPattern.test(source)) {
    return "";
  }
  const milliseconds = Date.parse(source);
  if (!Number.isFinite(milliseconds)) {
    return "";
  }
  const expected = source.includes(".")
    ? source
    : source.replace(/Z$/, ".000Z");
  const canonical = new Date(milliseconds).toISOString();
  return canonical === expected ? canonical : "";
}

function taipeiTimeLabel(value) {
  const canonical = canonicalRecordedAt(value);
  if (!canonical) {
    return "";
  }
  const taipei = new Date(Date.parse(canonical) + 8 * 60 * 60 * 1000);
  const pad = (part) => String(part).padStart(2, "0");
  return `${taipei.getUTCFullYear()}/${pad(taipei.getUTCMonth() + 1)}/${
    pad(taipei.getUTCDate())
  } ${pad(taipei.getUTCHours())}:${pad(taipei.getUTCMinutes())}`;
}

function normalizeRecord(record, fields) {
  const source = record && typeof record === "object" ? record : {};
  return Object.fromEntries(
    fields.map((field) => [field, asText(source[field])]),
  );
}

function normalizeRecords(value, fields) {
  return asArray(value)
    .slice(0, 100)
    .map((record) => normalizeRecord(record, fields));
}

function normalizePublicMessages(value) {
  return asArray(value).map((record) => {
    const source = record && typeof record === "object" ? record : {};
    const receipt =
      source.recordReceipt && typeof source.recordReceipt === "object"
        ? source.recordReceipt
        : {};
    return {
      ...normalizeRecord(source, [
        "caseId",
        "messageId",
        "bodySha256",
        "actorLabel",
        "messageTypeLabel",
        "documentVersionLabel",
        "recordedAtLabel",
        "nextActionLabel",
      ]),
      body: typeof source.body === "string" ? source.body : "",
      recordReceipt: normalizeRecord(receipt, [
        "receiptId",
        "status",
        "recordedAt",
        "caseId",
        "messageId",
        "bodySha256",
      ]),
    };
  });
}

export function normalizeOwnerWorkspaceContext(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const actor = source.actor && typeof source.actor === "object"
    ? source.actor
    : {};
  const membership = source.membership && typeof source.membership === "object"
    ? source.membership
    : {};
  const serviceAgreement =
    source.serviceAgreement && typeof source.serviceAgreement === "object"
      ? source.serviceAgreement
      : {};
  const caseBinding =
    source.caseBinding && typeof source.caseBinding === "object"
      ? source.caseBinding
      : {};
  const domain = source.domain && typeof source.domain === "object"
    ? source.domain
    : {};
  const caseSummary =
    source.caseSummary && typeof source.caseSummary === "object"
      ? source.caseSummary
      : null;

  return {
    authorityMode: asText(source.authorityMode),
    sessionStatus: asText(source.sessionStatus),
    actor: {
      actorId: asText(actor.actorId),
      role: asText(actor.role),
      displayLabel: asText(actor.displayLabel),
    },
    membership: {
      status: asText(membership.status),
      caseId: asText(membership.caseId),
    },
    serviceAgreement: {
      agreementId: asText(serviceAgreement.agreementId),
      version: asText(serviceAgreement.version),
      status: asText(serviceAgreement.status),
      caseId: asText(serviceAgreement.caseId),
    },
    caseBinding: {
      status: asText(caseBinding.status),
      caseId: asText(caseBinding.caseId),
    },
    domain: {
      status: asText(domain.status),
      name: asText(domain.name),
    },
    caseSummary: caseSummary
      ? {
        caseId: asText(caseSummary.caseId),
        displayName: asText(caseSummary.displayName),
        statusLabel: asText(caseSummary.statusLabel),
        currentActorLabel: asText(caseSummary.currentActorLabel),
        nextActionLabel: asText(caseSummary.nextActionLabel),
        nextDueLabel: asText(caseSummary.nextDueLabel),
        lastRecordedAtLabel: asText(caseSummary.lastRecordedAtLabel),
        waitingRelationshipLabel: asText(caseSummary.waitingRelationshipLabel),
        documentSummaryLabel: asText(caseSummary.documentSummaryLabel),
        reviewSummaryLabel: asText(caseSummary.reviewSummaryLabel),
        issueSummaryLabel: asText(caseSummary.issueSummaryLabel),
        todayFocusLabel: asText(caseSummary.todayFocusLabel),
        constructionIssueLabel: asText(caseSummary.constructionIssueLabel),
      }
      : null,
    documents: normalizeRecords(source.documents, [
      "title",
      "kindLabel",
      "versionLabel",
      "submittedByLabel",
      "submittedAtLabel",
      "statusLabel",
      "sourceLabel",
    ]),
    submissions: normalizeRecords(source.submissions, [
      "partyLabel",
      "statusLabel",
      "versionLabel",
      "submittedAtLabel",
      "nextActionLabel",
    ]),
    scheduledDesignItems: normalizeRecords(source.scheduledDesignItems, [
      "scope",
      "title",
      "statusLabel",
      "versionLabel",
      "scheduledAt",
      "nextActionLabel",
    ])
      .filter(
        (record) =>
          record.scope === "design" &&
          record.title !== "" &&
          canonicalRecordedAt(record.scheduledAt),
      )
      .map((record) => ({
        ...record,
        scheduledAt: canonicalRecordedAt(record.scheduledAt),
        scheduledAtLabel: taipeiTimeLabel(record.scheduledAt),
      })),
    publicMessages: normalizePublicMessages(source.publicMessages),
    designReviews: normalizeRecords(source.designReviews, [
      "title",
      "versionLabel",
      "statusLabel",
      "reasonLabel",
      "nextActorLabel",
    ]),
    designDecisionTrail: normalizeRecords(source.designDecisionTrail, [
      "scope",
      "title",
      "actorLabel",
      "recordedAtLabel",
      "documentVersionLabel",
      "resultLabel",
      "nextActionLabel",
    ]).filter(
      (record) => record.scope === "design" && record.title !== "",
    ),
    constructionRecords: normalizeRecords(source.constructionRecords, [
      "title",
      "statusLabel",
      "actorLabel",
      "recordedAtLabel",
      "nextActionLabel",
    ]),
    events: normalizeRecords(source.events, [
      "title",
      "actorLabel",
      "recordedAtLabel",
      "documentVersionLabel",
      "resultLabel",
      "nextActionLabel",
    ]),
    processSteps: normalizeRecords(source.processSteps, ["key", "statusLabel"]),
    permittedActions: asArray(source.permittedActions)
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 30),
  };
}

export function resolveOwnerWorkspaceState(input) {
  if (!input || typeof input !== "object") {
    return {
      state: "CONTRACT_CONTEXT_UNAVAILABLE",
      reasonCode: "TRUSTED_CONTEXT_NOT_AVAILABLE",
    };
  }

  const context = normalizeOwnerWorkspaceContext(input);
  const accessConfirmed =
    context.sessionStatus === OWNER_WORKSPACE_ACCESS.sessionStatus &&
    context.actor.actorId !== "" &&
    context.actor.role === OWNER_WORKSPACE_ACCESS.actorRole &&
    context.membership.status === OWNER_WORKSPACE_ACCESS.membershipStatus &&
    context.caseBinding.status === OWNER_WORKSPACE_ACCESS.caseBindingStatus &&
    context.domain.status === OWNER_WORKSPACE_ACCESS.domainStatus &&
    context.domain.name === "pcm" &&
    context.membership.caseId !== "" &&
    context.membership.caseId === context.caseBinding.caseId;

  if (!accessConfirmed) {
    return { state: "ACCESS_DENIED", reasonCode: "OWNER_ACCESS_NOT_CONFIRMED" };
  }

  const agreementEvidenceComplete =
    context.serviceAgreement.agreementId !== "" &&
    context.serviceAgreement.version !== "" &&
    context.serviceAgreement.caseId !== "" &&
    context.serviceAgreement.caseId === context.caseBinding.caseId;
  const verifiedOwnerReadOnlyGrant =
    context.authorityMode === "server_owner_grant_v1" &&
    context.serviceAgreement.status === "unavailable" &&
    context.serviceAgreement.agreementId === "" &&
    context.serviceAgreement.version === "" &&
    context.serviceAgreement.caseId === context.caseBinding.caseId;
  if (!agreementEvidenceComplete && !verifiedOwnerReadOnlyGrant) {
    return {
      state: "ACCESS_DENIED",
      reasonCode: "AGREEMENT_EVIDENCE_INCOMPLETE",
    };
  }

  if (
    context.caseSummary &&
    (context.caseSummary.caseId === "" ||
      context.caseSummary.caseId !== context.caseBinding.caseId)
  ) {
    return { state: "ACCESS_DENIED", reasonCode: "CASE_BINDING_MISMATCH" };
  }

  const agreementEnded = context.serviceAgreement.status ===
    OWNER_WORKSPACE_ACCESS.endedAgreementStatus;
  if (
    !agreementEnded &&
    !verifiedOwnerReadOnlyGrant &&
    context.serviceAgreement.status !==
      OWNER_WORKSPACE_ACCESS.activeAgreementStatus
  ) {
    return {
      state: "ACCESS_DENIED",
      reasonCode: "ACTIVE_AGREEMENT_NOT_CONFIRMED",
    };
  }

  if (!context.caseSummary) {
    return {
      state: "AUTHORIZED_EMPTY",
      reasonCode: "CASE_CONTENT_NOT_AVAILABLE",
    };
  }

  if (agreementEnded) {
    return {
      state: "PCM_SERVICE_ENDED_READ_ONLY",
      reasonCode: "PCM_SERVICE_ENDED_RECORDS_RETAINED",
    };
  }

  return {
    state: "AUTHORIZED_READY",
    reasonCode: "OWNER_CASE_CONTEXT_CONFIRMED",
  };
}

export function publicMessageRecordLabel(message, expectedCaseId) {
  const source = message && typeof message === "object" ? message : {};
  const receipt = source.recordReceipt &&
      typeof source.recordReceipt === "object"
    ? source.recordReceipt
    : {};
  const caseId = asText(source.caseId);
  const messageId = asText(source.messageId);
  const body = typeof source.body === "string" ? source.body : "";
  const bodySha256 = asText(source.bodySha256);
  const recordedAt = canonicalRecordedAt(receipt.recordedAt);
  const sha256Pattern = /^[0-9a-f]{64}$/;
  if (
    asText(expectedCaseId) &&
    caseId === asText(expectedCaseId) &&
    messageId &&
    body &&
    sha256Pattern.test(bodySha256) &&
    sha256Hex(body) === bodySha256 &&
    asText(receipt.receiptId) &&
    receipt.status === "recorded" &&
    receipt.caseId === caseId &&
    receipt.messageId === messageId &&
    receipt.bodySha256 === bodySha256 &&
    recordedAt
  ) {
    return "已記錄於萊比後台";
  }
  return "尚未記錄";
}

export function buildOwnerWorkspaceViewModel(input) {
  const context = normalizeOwnerWorkspaceContext(input);
  const resolution = resolveOwnerWorkspaceState(input);
  const copy = STATE_COPY[resolution.state] ??
    STATE_COPY.CONTRACT_CONTEXT_UNAVAILABLE;
  const ended = resolution.state === "PCM_SERVICE_ENDED_READ_ONLY";
  const ready = resolution.state === "AUTHORIZED_READY";
  const unavailable = resolution.state === "CONTRACT_CONTEXT_UNAVAILABLE";
  const identityVisible = ready || ended ||
    resolution.state === "AUTHORIZED_EMPTY";
  const payloadVisible = ready || ended;
  const summary = payloadVisible ? context.caseSummary : null;
  const messages = payloadVisible
    ? context.publicMessages
      .filter(
        (record) =>
          publicMessageRecordLabel(record, context.caseBinding.caseId) ===
            "已記錄於萊比後台",
      )
      .map((record) => ({
        ...record,
        recordedAtLabel: taipeiTimeLabel(record.recordReceipt.recordedAt),
        recordStatusLabel: publicMessageRecordLabel(
          record,
          context.caseBinding.caseId,
        ),
      }))
    : [];

  return {
    state: resolution.state,
    reasonCode: resolution.reasonCode,
    stateLabel: copy.label,
    accessTitle: copy.title,
    statusMessage: copy.message,
    readOnly:
      ended || !ready || context.serviceAgreement.status !== "active",
    ownerContractEditable:
      ready && context.serviceAgreement.status === "active",
    pcmInvolved: ready && context.serviceAgreement.status === "active",
    retryVisible: resolution.state === "LOAD_FAILED_RETRYABLE",
    caseName: summary?.displayName ||
      (unavailable ? "尚未連結正式案件" : "尚待案件資料"),
    actorLabel: (identityVisible && context.actor.displayLabel) || "尚待驗證",
    agreementLabel: !identityVisible
      ? "DRS 服務契約：尚待確認"
      : context.serviceAgreement.status === "active"
      ? "DRS 服務契約：有效"
      : context.serviceAgreement.status === "ended"
      ? "DRS 服務契約：已結束"
      : "DRS 服務契約：尚待確認",
    agreementState: !identityVisible
      ? "尚待確認"
      : context.serviceAgreement.status === "active"
      ? "有效"
      : context.serviceAgreement.status === "ended"
      ? "已結束"
      : "尚待確認",
    agreementVersion: (identityVisible && context.serviceAgreement.version) ||
      "尚未確認服務版本",
    caseStatus: summary?.statusLabel ||
      (unavailable ? "尚未連結正式案件" : "尚待案件資料"),
    currentActor: summary?.currentActorLabel ||
      (unavailable
        ? "由甲方先確認 DRS 服務與案件入口"
        : "尚待案件資料"),
    nextAction: summary?.nextActionLabel ||
      (unavailable ? "了解並確認 DRS 服務契約" : "依案件狀態確認下一步"),
    nextDue: summary?.nextDueLabel ||
      (unavailable
        ? "完成後才會開放本案契約、文件分享與案件留痕"
        : "依案件通知"),
    lastRecorded: summary?.lastRecordedAtLabel ||
      (unavailable ? "尚未建立正式案件紀錄" : "尚無案件留痕"),
    waitingRelationship: summary?.waitingRelationshipLabel ||
      (unavailable
        ? "甲方身分、DRS 服務契約與案件權限尚未完成確認"
        : "尚待案件確認"),
    documentSummary: summary?.documentSummaryLabel || "尚未連結正式案件",
    reviewSummary: summary?.reviewSummaryLabel || "尚未連結正式案件",
    issueSummary: summary?.issueSummaryLabel || "尚未連結正式案件",
    nextSummary: summary?.nextActionLabel ||
      (unavailable ? "了解並確認 DRS 服務契約" : "依案件狀態確認下一步"),
    nextOwnerSummary: `責任人：${summary?.currentActorLabel ||
      (unavailable ? "甲方" : "尚待案件確認")}`,
    todayFocus: summary?.todayFocusLabel || "尚待案件資料",
    constructionIssues: summary?.constructionIssueLabel || "尚待案件資料",
    constructionActor: summary?.currentActorLabel || "尚待案件資料",
    documents: payloadVisible ? context.documents : [],
    submissions: payloadVisible ? context.submissions : [],
    scheduledDesignItems: payloadVisible ? context.scheduledDesignItems : [],
    messages,
    designReviews: payloadVisible ? context.designReviews : [],
    designDecisionTrail: payloadVisible ? context.designDecisionTrail : [],
    constructionRecords: payloadVisible ? context.constructionRecords : [],
    events: payloadVisible ? context.events : [],
    processSteps: payloadVisible ? context.processSteps : [],
    permittedActions: ready ? context.permittedActions : [],
  };
}

function createTextElement(documentRef, tagName, text, className) {
  const element = documentRef.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
}

function appendEmptyState(documentRef, list, copy) {
  const item = createTextElement(documentRef, "li", "", "empty-state");
  item.append(
    createTextElement(documentRef, "strong", copy.title),
    createTextElement(documentRef, "span", copy.body),
  );
  list.append(item);
}

function appendRecord(documentRef, list, title, body, metaLines = []) {
  const item = createTextElement(documentRef, "li", "", "record-item");
  const content = documentRef.createElement("div");
  content.append(
    createTextElement(documentRef, "strong", title || "未命名紀錄"),
    createTextElement(documentRef, "p", body || "尚待補充內容"),
  );
  const meta = createTextElement(documentRef, "div", "", "record-item__meta");
  for (const line of metaLines.filter(Boolean)) {
    meta.append(createTextElement(documentRef, "small", line));
  }
  item.append(content, meta);
  list.append(item);
  return item;
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function resolveOwnerContractViewFromHash(hash) {
  return Object.entries(OWNER_CONTRACT_VIEW_HASHES).find(
    ([, canonicalHash]) => canonicalHash === hash,
  )?.[0] ?? null;
}

function replaceOwnerWorkspaceHash(view, hash) {
  if (
    !hash ||
    view?.location?.hash === hash ||
    typeof view?.history?.replaceState !== "function"
  ) {
    return false;
  }
  view.history.replaceState(view.history.state ?? null, "", hash);
  return true;
}

export function initializeOwnerContractViewTabs(workspace, view = null) {
  if (!workspace || typeof workspace.querySelectorAll !== "function") {
    return null;
  }
  const tabs = Array.from(
    workspace.querySelectorAll("[data-owner-contract-view]"),
  );
  const panels = Array.from(
    workspace.querySelectorAll("[data-owner-contract-view-panel]"),
  );
  if (
    tabs.length !== OWNER_CONTRACT_VIEW_KEYS.length ||
    panels.length !== OWNER_CONTRACT_VIEW_KEYS.length
  ) {
    return null;
  }

  function selectView(key, { focus = false, syncHash = true } = {}) {
    if (!OWNER_CONTRACT_VIEW_KEYS.includes(key)) return false;
    workspace.dataset.activeOwnerContractView = key;
    for (const tab of tabs) {
      const selected = tab.dataset.ownerContractView === key;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.ownerContractViewPanel !== key;
    }
    if (syncHash) {
      replaceOwnerWorkspaceHash(view, OWNER_CONTRACT_VIEW_HASHES[key]);
    }
    return true;
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      selectView(tab.dataset.ownerContractView);
    });
    tab.addEventListener("keydown", (event) => {
      const nextKey = resolveOwnerContractViewKey(
        tab.dataset.ownerContractView,
        event.key,
      );
      if (nextKey === tab.dataset.ownerContractView) return;
      event.preventDefault();
      selectView(nextKey, { focus: true });
    });
  }

  const selectFromHash = () => {
    const requestedView = resolveOwnerContractViewFromHash(view?.location?.hash);
    if (requestedView) selectView(requestedView, { syncHash: false });
  };

  selectView(
    resolveOwnerContractViewFromHash(view?.location?.hash) ||
      OWNER_CONTRACT_VIEW_KEYS[0],
    { syncHash: false },
  );
  view?.addEventListener?.("hashchange", selectFromHash);
  return Object.freeze({ selectView });
}

function initializeOwnerContractWorkspace(root) {
  if (!root || typeof root.querySelector !== "function") {
    return null;
  }
  const workspace = root.querySelector("#owner-dashboard-panel-contract");
  if (!workspace) {
    return null;
  }

  const view = root.defaultView ??
    (typeof window === "undefined" ? null : window);
  const contractViews = initializeOwnerContractViewTabs(workspace, view);

  const controls = Array.from(
    workspace.querySelectorAll("[data-owner-contract-control]"),
  );
  const titleInput = workspace.querySelector("[data-owner-contract-title]");
  const detailInput = workspace.querySelector("[data-owner-contract-detail]");
  const confirmationInput = workspace.querySelector(
    "[data-owner-contract-confirmation]",
  );
  const attachmentNameInput = workspace.querySelector(
    "[data-owner-contract-attachment-name]",
  );
  const attachmentNoteInput = workspace.querySelector(
    "[data-owner-contract-attachment-note]",
  );
  const impactInputs = Array.from(
    workspace.querySelectorAll("[data-owner-contract-impact]"),
  );
  const editor = workspace.querySelector("[data-owner-contract-editor]");
  const sessionStatus = workspace.querySelector(
    "[data-owner-contract-session-status]",
  );
  const factInputs = Array.from(
    workspace.querySelectorAll("[data-owner-contract-fact]"),
  );
  const factsProgress = workspace.querySelector(
    "[data-owner-contract-facts-progress]",
  );
  const factsSummary = workspace.querySelector(
    "[data-owner-contract-facts-summary]",
  );
  let draft = createOwnerContractDraftState();
  let factsDraft = createOwnerContractFactsDraftState();
  let enabled = false;

  function preview(name, value) {
    const node = workspace.querySelector(
      `[data-owner-contract-preview="${name}"]`,
    );
    if (node) {
      node.textContent = value;
    }
  }

  function renderDraft() {
    const classificationLabel = draft.classification === "CHANGE_PROPOSAL"
      ? "變更提案"
      : "補充說明";
    const classification = workspace.querySelector(
      "[data-owner-contract-classification]",
    );
    if (classification) {
      classification.textContent = classificationLabel;
    }
    preview("classification", classificationLabel);
    preview("title", draft.title || "尚未填寫");
    preview("detail", draft.detail || "尚未填寫");
    preview(
      "impacts",
      draft.impactKeys.length
        ? draft.impactKeys.map((key) => OWNER_CONTRACT_IMPACT_LABELS[key]).join("、")
        : "尚未選擇",
    );
    preview(
      "attachments",
      draft.attachments.length
        ? draft.attachments.map((attachment) => attachment.name).join("、")
        : "尚未加入",
    );
    preview(
      "intent",
      draft.ownerConfirmationIntent ? "已標記本次檢查意向" : "尚未標記",
    );
  }

  function renderFactsDraft() {
    const summary = summarizeOwnerContractFactsDraft(factsDraft);
    if (factsProgress) {
      factsProgress.textContent = `已填 ${summary.completed} / ${summary.total}`;
    }
    if (factsSummary) {
      factsSummary.textContent = summary.nextField
        ? `下一項：${OWNER_CONTRACT_FACT_LABELS[summary.nextField]}`
        : "本頁 13 項資料已填齊；仍須完成案件授權後才能建立正式版本。";
    }
  }

  function syncInputs() {
    if (titleInput) titleInput.value = draft.title;
    if (detailInput) detailInput.value = draft.detail;
    if (confirmationInput) {
      confirmationInput.checked = draft.ownerConfirmationIntent;
    }
    for (const input of impactInputs) {
      input.checked = draft.impactKeys.includes(input.value);
    }
    if (attachmentNameInput) attachmentNameInput.value = "";
    if (attachmentNoteInput) attachmentNoteInput.value = "";
    for (const input of factInputs) {
      input.value = factsDraft[input.dataset.ownerContractFact] ?? "";
    }
  }

  function dispatch(event) {
    if (!enabled) {
      return draft;
    }
    draft = reduceOwnerContractDraft(draft, event);
    renderDraft();
    return draft;
  }

  function dispatchFact(event) {
    if (!enabled) return factsDraft;
    factsDraft = reduceOwnerContractFactsDraft(factsDraft, event);
    renderFactsDraft();
    return factsDraft;
  }

  function setEnabled(nextEnabled) {
    const allowEditing = nextEnabled === true;
    if (!allowEditing) {
      draft = createOwnerContractDraftState();
      factsDraft = createOwnerContractFactsDraftState();
      syncInputs();
      renderDraft();
      renderFactsDraft();
    }
    enabled = allowEditing;
    for (const control of controls) {
      control.disabled = !allowEditing;
      control.setAttribute("aria-disabled", String(!allowEditing));
    }
    if (sessionStatus) {
      sessionStatus.textContent = allowEditing
        ? "本次草稿尚未正式儲存或送出，重新整理後不會保留；目前也不會建立簽署、付款或雙方合意紀錄。"
        : "完成甲方身分、有效契約與案件綁定確認後才可整理；本次草稿尚未正式儲存或送出，重新整理後不會保留。";
    }
  }

  workspace.querySelector('[data-action="start-owner-contract-draft"]')
    ?.addEventListener("click", () => {
      if (!enabled) return;
      contractViews?.selectView("facts");
      factInputs[0]?.focus();
    });
  for (const input of factInputs) {
    input.addEventListener("input", () => {
      dispatchFact({
        type: "SET_FIELD",
        field: input.dataset.ownerContractFact,
        value: input.value,
      });
    });
  }
  titleInput?.addEventListener("input", () => {
    dispatch({ type: "SET_TITLE", value: titleInput.value });
  });
  detailInput?.addEventListener("input", () => {
    dispatch({ type: "SET_DETAIL", value: detailInput.value });
  });
  for (const input of impactInputs) {
    input.addEventListener("change", () => {
      dispatch({ type: "TOGGLE_IMPACT", key: input.value });
    });
  }
  confirmationInput?.addEventListener("change", () => {
    dispatch({
      type: "SET_OWNER_CONFIRMATION_INTENT",
      value: confirmationInput.checked,
    });
  });
  workspace.querySelector('[data-action="add-owner-contract-attachment"]')
    ?.addEventListener("click", () => {
      dispatch({
        type: "ADD_ATTACHMENT_METADATA",
        name: attachmentNameInput?.value,
        note: attachmentNoteInput?.value,
      });
      if (attachmentNameInput) attachmentNameInput.value = "";
      if (attachmentNoteInput) attachmentNoteInput.value = "";
    });
  workspace.querySelector('[data-action="clear-owner-contract-draft"]')
    ?.addEventListener("click", () => {
      dispatch({ type: "CLEAR" });
      syncInputs();
    });
  workspace.querySelector('[data-action="clear-owner-contract-facts"]')
    ?.addEventListener("click", () => {
      dispatchFact({ type: "CLEAR" });
      syncInputs();
      factInputs[0]?.focus();
    });

  setEnabled(false);
  return Object.freeze({
    setEnabled,
    selectView: contractViews?.selectView,
  });
}

function renderList(root, name, records, renderer) {
  const list = root.querySelector(`[data-list="${name}"]`);
  if (!list) {
    return;
  }
  clearNode(list);
  if (!records.length) {
    appendEmptyState(root, list, EMPTY_LIST_COPY[name]);
    return;
  }
  for (const record of records) {
    renderer(root, list, record);
  }
}

function renderProcessSteps(root, records) {
  const statusByKey = new Map(
    records
      .filter((record) => PROCESS_KEYS.includes(record.key))
      .map((record) => [record.key, record.statusLabel]),
  );
  for (const key of PROCESS_KEYS) {
    const label = root.querySelector(
      `[data-step="${key}"] .process-step__state`,
    );
    if (label) {
      label.textContent = statusByKey.get(key) || "尚待案件資料";
    }
  }
}

const OWNER_HEADER_ROUTE_BINDINGS = Object.freeze([
  Object.freeze({
    selector: "[data-owner-brand-link]",
    routeId: "ownerWorkspaceBrandToHome",
    expectedHref: "../public_home/code.html#top",
  }),
  Object.freeze({
    selector: "[data-owner-service-contract-link]",
    routeId: "ownerWorkspaceContractManagementToServiceContract",
    expectedHref: "../pcm_standalone/service_contract/code.html?returnTo=owner-contract#full-contract",
  }),
]);

function closeOwnerHeaderLink(node) {
  node?.removeAttribute?.("href");
  node?.setAttribute?.("aria-disabled", "true");
  node?.setAttribute?.("tabindex", "-1");
}

function openOwnerHeaderLink(node, href) {
  node.setAttribute("href", href);
  node.removeAttribute("aria-disabled");
  node.removeAttribute("tabindex");
}

export function bindOwnerWorkspaceCanonicalLinks(root, getCanonicalHref) {
  if (!root || typeof root.querySelector !== "function") return false;
  const bindings = OWNER_HEADER_ROUTE_BINDINGS.map((binding) => ({
    ...binding,
    node: root.querySelector(binding.selector),
  }));
  for (const binding of bindings) closeOwnerHeaderLink(binding.node);
  if (
    bindings.some(({ node }) => !node) ||
    typeof getCanonicalHref !== "function"
  ) {
    return false;
  }

  let resolved;
  try {
    resolved = bindings.map((binding) => ({
      ...binding,
      href: getCanonicalHref(binding.routeId),
    }));
  } catch {
    return false;
  }
  if (resolved.some(({ href, expectedHref }) => href !== expectedHref)) {
    return false;
  }
  for (const binding of resolved) openOwnerHeaderLink(binding.node, binding.href);
  return true;
}

export function renderOwnerHeaderContext(root, model = {}) {
  if (!root || typeof root.querySelector !== "function") return false;
  const caseValue = root.querySelector('[data-header-context-value="case"]');
  const agreementValue = root.querySelector('[data-header-context-value="agreement"]');
  if (!caseValue || !agreementValue) return false;

  if (typeof model.caseName === "string" && model.caseName.trim()) {
    caseValue.textContent = model.caseName;
  }
  if (typeof model.agreementLabel === "string" && model.agreementLabel.trim()) {
    agreementValue.textContent = model.agreementLabel
      .replace(/^DRS 服務契約：/u, "")
      .trim();
  }
  return true;
}

function renderModel(root, model) {
  const body = root.body;
  if (body) {
    body.dataset.workspaceState = model.state;
    body.dataset.ownerContractEditable = model.ownerContractEditable
      ? "true"
      : "false";
  }

  const slots = {
    "case-name": model.caseName,
    "header-state": model.stateLabel,
    "state-label": model.stateLabel,
    "agreement-label": model.agreementLabel,
    "current-actor": model.currentActor,
    "next-action": model.nextAction,
    "waiting-relationship": model.waitingRelationship,
    "next-due": model.nextDue,
    "last-recorded": model.lastRecorded,
    "access-title": model.accessTitle,
    "access-message": model.statusMessage,
    "document-summary": model.documentSummary,
    "review-summary": model.reviewSummary,
    "issue-summary": model.issueSummary,
    "next-summary": model.nextSummary,
    "next-owner-summary": model.nextOwnerSummary,
    "today-focus": model.todayFocus,
    "construction-issues": model.constructionIssues,
    "construction-actor": model.constructionActor,
    "agreement-state": model.agreementState,
    "agreement-version": model.agreementVersion,
    "case-status": model.caseStatus,
    "actor-label": model.actorLabel,
  };

  renderOwnerHeaderContext(root, model);

  for (const [name, value] of Object.entries(slots)) {
    for (const node of root.querySelectorAll(`[data-slot="${name}"]`)) {
      if (node.hasAttribute?.("data-header-context-value")) continue;
      node.textContent = value;
    }
  }

  const retry = root.querySelector('[data-action="retry"]');
  if (retry) {
    retry.hidden = !model.retryVisible;
  }

  renderProcessSteps(root, model.processSteps);
  const designScheduleEmpty = root.querySelector(
    '[data-calendar-empty="design-schedule"]',
  );
  if (designScheduleEmpty) {
    designScheduleEmpty.hidden = model.scheduledDesignItems.length > 0;
  }
  renderList(
    root,
    "documents",
    model.documents,
    (documentRef, list, record) => {
      const item = appendRecord(
        documentRef,
        list,
        record.title,
        [record.kindLabel, record.versionLabel, record.statusLabel]
          .filter(Boolean)
          .join(" · "),
        [record.submittedByLabel, record.submittedAtLabel, record.sourceLabel],
      );
      const shareUrl = createOwnerDocumentLineShareUrl(record);
      if (!shareUrl) return;
      const action = createTextElement(
        documentRef,
        "a",
        "分享至 LINE",
        "owner-document-line-share",
      );
      action.setAttribute("href", shareUrl);
      action.setAttribute("target", "_blank");
      action.setAttribute("rel", "noopener noreferrer");
      action.setAttribute("data-owner-document-line-share", "true");
      action.setAttribute(
        "aria-label",
        `分享${asText(record.title, "本文件")}的受權限保護連結至 LINE`,
      );
      item.append(action);
    },
  );
  renderList(
    root,
    "submissions",
    model.submissions,
    (documentRef, list, record) => {
      appendRecord(
        documentRef,
        list,
        record.partyLabel,
        [record.versionLabel, record.statusLabel].filter(Boolean).join(" · "),
        [record.submittedAtLabel, record.nextActionLabel],
      );
    },
  );
  renderList(
    root,
    "calendarSubmissions",
    model.scheduledDesignItems,
    (documentRef, list, record) => {
      appendRecord(
        documentRef,
        list,
        record.title,
        [record.versionLabel, record.statusLabel].filter(Boolean).join(" · "),
        [record.scheduledAtLabel, record.nextActionLabel],
      );
    },
  );
  renderList(root, "messages", model.messages, (documentRef, list, record) => {
    appendRecord(
      documentRef,
      list,
      record.actorLabel,
      record.body,
      [
        record.messageTypeLabel,
        record.documentVersionLabel,
        record.recordedAtLabel,
        record.recordStatusLabel,
        record.nextActionLabel,
      ],
    );
  });
  renderList(
    root,
    "designReviews",
    model.designReviews,
    (documentRef, list, record) => {
      appendRecord(
        documentRef,
        list,
        record.title,
        [record.versionLabel, record.statusLabel, record.reasonLabel]
          .filter(Boolean)
          .join(" · "),
        [record.nextActorLabel],
      );
    },
  );
  renderList(
    root,
    "designDecisionTrail",
    model.designDecisionTrail,
    (documentRef, list, record) => {
      appendRecord(
        documentRef,
        list,
        record.title,
        [record.resultLabel, record.documentVersionLabel]
          .filter(Boolean)
          .join(" · "),
        [record.actorLabel, record.recordedAtLabel, record.nextActionLabel],
      );
    },
  );
  renderList(
    root,
    "constructionRecords",
    model.constructionRecords,
    (documentRef, list, record) => {
      appendRecord(
        documentRef,
        list,
        record.title,
        record.statusLabel,
        [record.actorLabel, record.recordedAtLabel, record.nextActionLabel],
      );
    },
  );
  renderList(root, "events", model.events, (documentRef, list, record) => {
    appendRecord(
      documentRef,
      list,
      record.title,
      [record.resultLabel, record.documentVersionLabel].filter(Boolean).join(
        " · ",
      ),
      [record.actorLabel, record.recordedAtLabel, record.nextActionLabel],
    );
  });
}

export function resolveOwnerDashboardTabFromHash(hash) {
  if (
    hash === "#owner-dashboard-panel-contract" ||
    hash === "#governance" ||
    resolveOwnerContractViewFromHash(hash)
  ) {
    return "contract";
  }
  if (hash === "#construction-records") return "construction";
  if (hash === "#design-review") return "design";
  return null;
}

export function stabilizeOwnerDashboardDirectEntry(root, view) {
  const documentElement = root?.documentElement;
  const entryHash = view?.location?.hash;
  const isContractDirectEntry =
    entryHash === OWNER_DASHBOARD_HASHES.contract ||
    Boolean(resolveOwnerContractViewFromHash(entryHash));
  if (
    !documentElement?.dataset ||
    documentElement.dataset.ownerDirectEntryStabilized === "true" ||
    !isContractDirectEntry ||
    typeof view?.scrollTo !== "function"
  ) {
    return false;
  }

  documentElement.dataset.ownerDirectEntryStabilized = "true";
  const cancellationEvents = Object.freeze([
    "pointerdown",
    "keydown",
    "wheel",
    "touchstart",
    "hashchange",
  ]);
  let cancelled = false;
  let settled = false;
  let firstFrameId = null;
  let secondFrameId = null;

  const resetDirectEntryScroll = () => {
    view.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };
  const entryIsCurrent = () =>
    !cancelled && !settled && view.location?.hash === entryHash;
  const cancelPendingFrames = () => {
    if (typeof view.cancelAnimationFrame === "function") {
      if (firstFrameId !== null) view.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) view.cancelAnimationFrame(secondFrameId);
    }
    firstFrameId = null;
    secondFrameId = null;
  };
  const cleanup = () => {
    cancelPendingFrames();
    for (const eventName of cancellationEvents) {
      view.removeEventListener?.(eventName, cancelPendingSettle, {
        capture: true,
      });
    }
    view.removeEventListener?.("load", schedulePostLoadSettle);
  };
  const cancelPendingSettle = () => {
    cancelled = true;
    cleanup();
  };
  const finishSettle = () => {
    if (!entryIsCurrent()) {
      cleanup();
      return;
    }
    resetDirectEntryScroll();
    settled = true;
    cleanup();
  };
  const schedulePostLoadSettle = () => {
    if (!entryIsCurrent()) {
      cleanup();
      return;
    }
    if (typeof view.requestAnimationFrame !== "function") {
      finishSettle();
      return;
    }
    firstFrameId = view.requestAnimationFrame(() => {
      firstFrameId = null;
      if (!entryIsCurrent()) {
        cleanup();
        return;
      }
      secondFrameId = view.requestAnimationFrame(() => {
        secondFrameId = null;
        if (!entryIsCurrent()) {
          cleanup();
          return;
        }
        finishSettle();
      });
    });
  };

  for (const eventName of cancellationEvents) {
    view.addEventListener?.(eventName, cancelPendingSettle, {
      capture: true,
      passive: true,
    });
  }
  resetDirectEntryScroll();
  if (root.readyState === "complete") {
    schedulePostLoadSettle();
  } else {
    view.addEventListener?.("load", schedulePostLoadSettle, { once: true });
  }
  return true;
}

export function initializeOwnerDashboardTabs(
  root = typeof document === "undefined" ? null : document,
  view = typeof window === "undefined" ? null : window,
  { onContractMainSelected = null } = {},
) {
  if (!root || typeof root.querySelector !== "function") {
    return null;
  }

  const dashboard = root.querySelector('[data-layout="owner-hero-dashboard"]');
  if (!dashboard || dashboard.dataset.ownerTabsReady === "true") {
    return null;
  }

  const tabs = Array.from(dashboard.querySelectorAll("[data-owner-tab]"));
  const panels = Array.from(dashboard.querySelectorAll("[data-owner-panel]"));
  if (tabs.length !== 3 || panels.length !== 3) {
    return null;
  }

  const tabKeys = tabs.map((tab) => tab.dataset.ownerTab);

  function selectTab(
    key,
    {
      focus = false,
      syncHash = true,
      resetContractView = syncHash,
    } = {},
  ) {
    if (!tabKeys.includes(key)) {
      return false;
    }

    dashboard.dataset.activeOwnerTab = key;
    for (const tab of tabs) {
      const selected = tab.dataset.ownerTab === key;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) {
        tab.focus();
      }
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.ownerPanel !== key;
    }
    if (
      key === "contract" &&
      resetContractView &&
      typeof onContractMainSelected === "function"
    ) {
      onContractMainSelected();
    }
    if (syncHash) {
      replaceOwnerWorkspaceHash(view, OWNER_DASHBOARD_HASHES[key]);
    }
    return true;
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      selectTab(tab.dataset.ownerTab);
    });
    tab.addEventListener("keydown", (event) => {
      const currentIndex = tabs.indexOf(tab);
      let nextIndex = currentIndex;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      selectTab(tabs[nextIndex].dataset.ownerTab, { focus: true });
    });
  }

  const hashTab = resolveOwnerDashboardTabFromHash(view?.location?.hash);
  dashboard.dataset.ownerTabsReady = "true";
  selectTab(hashTab || dashboard.dataset.activeOwnerTab || tabKeys[0], {
    syncHash: false,
    resetContractView:
      view?.location?.hash === OWNER_DASHBOARD_HASHES.contract,
  });
  stabilizeOwnerDashboardDirectEntry(root, view);
  view?.addEventListener?.("hashchange", () => {
    const nextTab = resolveOwnerDashboardTabFromHash(view.location?.hash);
    if (nextTab) {
      selectTab(nextTab, {
        syncHash: false,
        resetContractView:
          view.location?.hash === OWNER_DASHBOARD_HASHES.contract,
      });
    }
  });
  return Object.freeze({ selectTab });
}

export function initializeOwnerManagementInteractions(
  root = typeof document === "undefined" ? null : document,
) {
  if (!root || typeof root.querySelector !== "function") {
    return null;
  }

  const construction = root.querySelector(
    '[data-owner-management-layout="construction"]',
  );
  const navigation = construction?.querySelector(
    '[data-layout="owner-construction-navigation"]',
  );
  const viewButtons = Array.from(
    navigation?.querySelectorAll?.("[data-owner-construction-view]") ?? [],
  );
  const viewPanels = Array.from(
    construction?.querySelectorAll?.("[data-owner-construction-view-panel]") ?? [],
  );
  const viewKeys = viewButtons.map(
    (button) => button.dataset.ownerConstructionView,
  );

  function selectConstructionView(key, { focus = false } = {}) {
    if (!viewKeys.includes(key)) return false;
    construction.dataset.activeOwnerConstructionView = key;
    for (const button of viewButtons) {
      const selected = button.dataset.ownerConstructionView === key;
      button.setAttribute("aria-pressed", String(selected));
      if (selected && focus) button.focus();
    }
    for (const panel of viewPanels) {
      panel.hidden = panel.dataset.ownerConstructionViewPanel !== key;
    }
    return true;
  }

  for (const button of viewButtons) {
    button.addEventListener("click", () => {
      selectConstructionView(button.dataset.ownerConstructionView);
    });
    button.addEventListener("keydown", (event) => {
      const currentIndex = viewButtons.indexOf(button);
      let nextIndex = currentIndex;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % viewButtons.length;
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + viewButtons.length) % viewButtons.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = viewButtons.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      selectConstructionView(
        viewButtons[nextIndex].dataset.ownerConstructionView,
        { focus: true },
      );
    });
  }

  if (viewKeys.length && viewPanels.length === viewKeys.length) {
    selectConstructionView(viewKeys[0]);
  }

  const revisionButton = root.querySelector(
    '[data-action="open-owner-design-revision"]',
  );
  const revisionPanel = root.querySelector("[data-owner-design-revision-panel]");
  const closeRevisionButton = root.querySelector(
    '[data-action="close-owner-design-revision"]',
  );

  function setRevisionOpen(open, { focus = false } = {}) {
    if (!revisionButton || !revisionPanel) return false;
    const nextOpen = open === true;
    revisionButton.setAttribute("aria-expanded", String(nextOpen));
    revisionPanel.hidden = !nextOpen;
    if (nextOpen && focus) {
      revisionPanel.querySelector?.("textarea")?.focus?.();
    }
    return true;
  }

  revisionButton?.addEventListener("click", () => {
    setRevisionOpen(revisionButton.getAttribute("aria-expanded") !== "true", {
      focus: true,
    });
  });
  closeRevisionButton?.addEventListener("click", () => {
    setRevisionOpen(false);
    revisionButton?.focus?.();
  });

  function setEnabled(enabled) {
    const allowDraft = enabled === true;
    if (revisionButton) {
      revisionButton.disabled = !allowDraft;
      revisionButton.setAttribute("aria-disabled", String(!allowDraft));
    }
    if (!allowDraft) setRevisionOpen(false);
  }

  setEnabled(false);
  return Object.freeze({ selectConstructionView, setEnabled });
}

const OWNER_CALENDAR_VIEW_KEYS = Object.freeze(["week", "month", "agenda"]);

export function initializeOwnerCalendarWorkspaces(
  root = typeof document === "undefined" ? null : document,
) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return Object.freeze([]);
  }

  const workspaces = Array.from(
    root.querySelectorAll("[data-calendar-workspace]"),
  );
  const controllers = [];

  for (const workspace of workspaces) {
    if (workspace.dataset.calendarReady === "true") {
      continue;
    }

    const buttons = Array.from(
      workspace.querySelectorAll("[data-calendar-view-option]"),
    );
    const availableViews = buttons
      .map((button) => button.dataset.calendarViewOption)
      .filter((key) => OWNER_CALENDAR_VIEW_KEYS.includes(key));

    if (!availableViews.length) {
      continue;
    }

    function selectView(key, { focus = false } = {}) {
      if (!availableViews.includes(key)) {
        return false;
      }
      workspace.dataset.calendarView = key;
      for (const button of buttons) {
        const selected = button.dataset.calendarViewOption === key;
        button.setAttribute("aria-pressed", String(selected));
        if (selected && focus) {
          button.focus();
        }
      }
      return true;
    }

    for (const button of buttons) {
      button.addEventListener("click", () => {
        selectView(button.dataset.calendarViewOption);
      });
      button.addEventListener("keydown", (event) => {
        const currentIndex = buttons.indexOf(button);
        let nextIndex = currentIndex;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          nextIndex = (currentIndex + 1) % buttons.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = buttons.length - 1;
        } else {
          return;
        }
        event.preventDefault();
        selectView(buttons[nextIndex].dataset.calendarViewOption, {
          focus: true,
        });
      });
    }

    const initialView = availableViews.includes(workspace.dataset.calendarView)
      ? workspace.dataset.calendarView
      : availableViews[0];
    workspace.dataset.calendarReady = "true";
    selectView(initialView);
    controllers.push(Object.freeze({ selectView }));
  }

  return Object.freeze(controllers);
}

export function createOwnerWorkspaceController({ root, adapter } = {}) {
  const documentRef = root ??
    (typeof document === "undefined" ? null : document);
  let currentAdapter = adapter;
  let loadGeneration = 0;
  let currentModel = null;

  const contractWorkspace = initializeOwnerContractWorkspace(documentRef);
  const managementWorkspace = initializeOwnerManagementInteractions(documentRef);
  const view = documentRef?.defaultView ??
    (typeof window === "undefined" ? null : window);
  initializeOwnerCalendarWorkspaces(documentRef);
  initializeOwnerDashboardTabs(documentRef, view, {
    onContractMainSelected() {
      contractWorkspace?.selectView?.("overview", { syncHash: false });
    },
  });

  function commitModel(model) {
    currentModel = model;
    if (documentRef) {
      renderModel(documentRef, model);
    }
    contractWorkspace?.setEnabled(model.state === "AUTHORIZED_READY");
    if (!model.ownerContractEditable) contractWorkspace?.setEnabled(false);
    managementWorkspace?.setEnabled(
      model.state === "AUTHORIZED_READY" && model.ownerContractEditable,
    );
    return model;
  }

  function renderInput(input) {
    const model = buildOwnerWorkspaceViewModel(input);
    return commitModel(model);
  }

  function renderNamedState(state, reasonCode) {
    const model = {
      ...buildOwnerWorkspaceViewModel(),
      state,
      reasonCode,
      stateLabel: STATE_COPY[state].label,
      accessTitle: STATE_COPY[state].title,
      statusMessage: STATE_COPY[state].message,
      retryVisible: state === "LOAD_FAILED_RETRYABLE",
    };
    return commitModel(model);
  }

  async function initialize() {
    const generation = loadGeneration + 1;
    loadGeneration = generation;
    const adapterSnapshot = currentAdapter;
    renderNamedState("ACCESS_CHECKING", "ACCESS_CHECK_IN_PROGRESS");
    if (
      !adapterSnapshot ||
      typeof adapterSnapshot.loadOwnerWorkspace !== "function"
    ) {
      return renderNamedState(
        "CONTRACT_CONTEXT_UNAVAILABLE",
        "TRUSTED_CONTEXT_NOT_AVAILABLE",
      );
    }

    try {
      const context = await adapterSnapshot.loadOwnerWorkspace();
      if (
        generation !== loadGeneration ||
        adapterSnapshot !== currentAdapter
      ) {
        return currentModel;
      }
      return renderInput(context);
    } catch (error) {
      if (
        generation !== loadGeneration ||
        adapterSnapshot !== currentAdapter
      ) {
        return currentModel;
      }
      const status = Number(error?.status);
      if (status === 401 || status === 403) {
        return renderNamedState("ACCESS_DENIED", "OWNER_ACCESS_NOT_CONFIRMED");
      }
      if (status === 404) {
        return renderNamedState(
          "CONTRACT_CONTEXT_UNAVAILABLE",
          "CASE_CONTEXT_NOT_AVAILABLE",
        );
      }
      return renderNamedState("LOAD_FAILED_RETRYABLE", "CASE_LOAD_FAILED");
    }
  }

  function setAdapter(nextAdapter) {
    loadGeneration += 1;
    currentAdapter = nextAdapter;
  }

  const retry = documentRef?.querySelector('[data-action="retry"]');
  if (retry) {
    retry.addEventListener("click", () => {
      void initialize();
    });
  }

  return Object.freeze({ initialize, renderInput, setAdapter });
}
