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

const STATE_COPY = Object.freeze({
  ACCESS_CHECKING: Object.freeze({
    label: "正在確認案件權限",
    title: "正在取得你的案件資料",
    message: "完成身分、PCM 服務契約與案件權限確認後，才會顯示案件內容。",
  }),
  ACCESS_DENIED: Object.freeze({
    label: "無法開啟案件",
    title: "目前無法開啟此甲方工作台",
    message: "請由 PCM 首頁的甲方入口重新登入；此頁不會透露未授權案件內容。",
  }),
  CONTRACT_CONTEXT_UNAVAILABLE: Object.freeze({
    label: "尚待取得案件資料",
    title: "尚未取得可供顯示的案件資料",
    message: "登入、PCM 服務契約與案件權限確認完成後，才會載入你的案件內容。",
  }),
  AUTHORIZED_EMPTY: Object.freeze({
    label: "案件權限已確認",
    title: "目前沒有可供你查看的案件內容",
    message: "你的甲方身分已確認；案件資料完成整理後會顯示在這裡。",
  }),
  AUTHORIZED_READY: Object.freeze({
    label: "案件資料已確認",
    title: "你正在查看已授權的甲方案件",
    message: "所有文件、訊息與決策狀態都依案件後台的最新可信紀錄顯示。",
  }),
  PCM_SERVICE_ENDED_READ_ONLY: Object.freeze({
    label: "PCM 已結束介入",
    title: "既有案件內容維持可讀",
    message: "既有文件與紀錄仍可讀取；甲乙雙方後續可直接協議，PCM 不再介入。",
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
  messages: Object.freeze({
    title: "尚未取得案件訊息",
    body: "只有收到可信留痕憑證後，訊息才會顯示為「已記錄」。",
  }),
  designReviews: Object.freeze({
    title: "尚未取得設計送審紀錄",
    body: "PCM 可提出書面提醒，但不代替甲方接受設計或宣告現場品質。",
  }),
  constructionRecords: Object.freeze({
    title: "尚未取得施工或驗收事件",
    body: "施工任務、照片、追加減項與驗收缺失，必須來自案件後台紀錄。",
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function rotateRight(value, places) {
  return (value >>> places) | (value << (32 - places));
}

function sha256Hex(value) {
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
  return asArray(value)
    .slice(0, 100)
    .map((record) => {
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
          "body",
          "documentVersionLabel",
          "recordedAtLabel",
          "nextActionLabel",
        ]),
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
    publicMessages: normalizePublicMessages(source.publicMessages),
    designReviews: normalizeRecords(source.designReviews, [
      "title",
      "versionLabel",
      "statusLabel",
      "reasonLabel",
      "nextActorLabel",
    ]),
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
  if (!agreementEvidenceComplete) {
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
  const body = asText(source.body);
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
    readOnly: ended || !ready,
    pcmInvolved: ready,
    retryVisible: resolution.state === "LOAD_FAILED_RETRYABLE",
    caseName: summary?.displayName || "尚待案件資料",
    actorLabel: (identityVisible && context.actor.displayLabel) || "尚待驗證",
    agreementLabel: !identityVisible
      ? "PCM 服務契約：尚待確認"
      : context.serviceAgreement.status === "active"
      ? "PCM 服務契約：有效"
      : context.serviceAgreement.status === "ended"
      ? "PCM 服務契約：已結束"
      : "PCM 服務契約：尚待確認",
    agreementState: !identityVisible
      ? "尚待確認"
      : context.serviceAgreement.status === "active"
      ? "有效"
      : context.serviceAgreement.status === "ended"
      ? "已結束"
      : "尚待確認",
    agreementVersion: (identityVisible && context.serviceAgreement.version) ||
      "尚待載入",
    caseStatus: summary?.statusLabel || "尚待載入",
    currentActor: summary?.currentActorLabel || "尚待載入",
    nextAction: summary?.nextActionLabel || "取得可信案件資料後顯示下一步",
    nextDue: summary?.nextDueLabel || "依案件通知",
    lastRecorded: summary?.lastRecordedAtLabel || "尚待載入",
    waitingRelationship: summary?.waitingRelationshipLabel || "尚待載入",
    documentSummary: summary?.documentSummaryLabel || "尚待載入",
    reviewSummary: summary?.reviewSummaryLabel || "尚待載入",
    issueSummary: summary?.issueSummaryLabel || "尚待載入",
    nextSummary: summary?.nextActionLabel || "尚待載入",
    nextOwnerSummary: `責任人：${summary?.currentActorLabel || "尚待載入"}`,
    todayFocus: summary?.todayFocusLabel || "尚待案件資料",
    constructionIssues: summary?.constructionIssueLabel || "尚待案件資料",
    constructionActor: summary?.currentActorLabel || "尚待案件資料",
    documents: payloadVisible ? context.documents : [],
    submissions: payloadVisible ? context.submissions : [],
    messages,
    designReviews: payloadVisible ? context.designReviews : [],
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
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
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

function renderModel(root, model) {
  const body = root.body;
  if (body) {
    body.dataset.workspaceState = model.state;
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

  for (const [name, value] of Object.entries(slots)) {
    for (const node of root.querySelectorAll(`[data-slot="${name}"]`)) {
      node.textContent = value;
    }
  }

  const retry = root.querySelector('[data-action="retry"]');
  if (retry) {
    retry.hidden = !model.retryVisible;
  }

  renderProcessSteps(root, model.processSteps);
  renderList(
    root,
    "documents",
    model.documents,
    (documentRef, list, record) => {
      appendRecord(
        documentRef,
        list,
        record.title,
        [record.kindLabel, record.versionLabel, record.statusLabel]
          .filter(Boolean)
          .join(" · "),
        [record.submittedByLabel, record.submittedAtLabel, record.sourceLabel],
      );
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

export function createOwnerWorkspaceController({ root, adapter } = {}) {
  const documentRef = root ??
    (typeof document === "undefined" ? null : document);
  let currentAdapter = adapter;

  function renderInput(input) {
    if (!documentRef) {
      return buildOwnerWorkspaceViewModel(input);
    }
    const model = buildOwnerWorkspaceViewModel(input);
    renderModel(documentRef, model);
    return model;
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
    if (documentRef) {
      renderModel(documentRef, model);
    }
    return model;
  }

  async function initialize() {
    renderNamedState("ACCESS_CHECKING", "ACCESS_CHECK_IN_PROGRESS");
    if (
      !currentAdapter || typeof currentAdapter.loadOwnerWorkspace !== "function"
    ) {
      return renderNamedState(
        "CONTRACT_CONTEXT_UNAVAILABLE",
        "TRUSTED_CONTEXT_NOT_AVAILABLE",
      );
    }

    try {
      const context = await currentAdapter.loadOwnerWorkspace();
      return renderInput(context);
    } catch (error) {
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

if (typeof document !== "undefined") {
  const controller = createOwnerWorkspaceController({ root: document });
  void controller.initialize();
}
