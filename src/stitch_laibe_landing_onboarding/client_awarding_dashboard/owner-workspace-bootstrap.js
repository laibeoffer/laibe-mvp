import {
  bindOwnerWorkspaceCanonicalLinks,
  createOwnerWorkspaceController,
  sha256Hex,
} from "./app.js";
import { getSupabaseAuthRuntime } from "../pcm_standalone/account_access/app.js";
import { getActiveCanonicalLinkHref } from "../pcm_standalone/public/pcm-flow-route-manifest.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const SNAPSHOT_SCHEMA = "laibe.owner-workspace-read.v1";
const READ_RECEIPT_SCHEMA = "laibe.owner-workspace-read-receipt.v1";
const MESSAGE_RECEIPT_SCHEMA =
  "laibe.owner-workspace-message-record-receipt.v1";
const CANONICALIZATION_ID = "laibe.server-issued-json-text.utf8.v1";

const DEPENDENCY_KEYS = Object.freeze([
  "authorizedCaseId",
  "loadOwnerWorkspace",
  "root",
]);
const CONFIGURATION_KEYS = Object.freeze([
  "authorizedCaseId",
  "loadOwnerWorkspace",
]);
const RESULT_KEYS = Object.freeze([
  "actions",
  "canonicalization",
  "case",
  "caseBinding",
  "pcmDomain",
  "publicMessages",
  "readAt",
  "readReceipt",
  "schemaName",
  "schemaVersion",
  "serviceAgreement",
  "snapshotPreimage",
  "snapshotVersion",
  "status",
  "viewer",
]);
const SNAPSHOT_KEYS = Object.freeze([
  "actions",
  "case",
  "caseBinding",
  "pcmDomain",
  "publicMessages",
  "schemaName",
  "schemaVersion",
  "serviceAgreement",
  "snapshotVersion",
  "status",
  "viewer",
]);
const CANONICALIZATION_KEYS = Object.freeze([
  "encoding",
  "id",
  "version",
]);
const READ_RECEIPT_KEYS = Object.freeze([
  "canonicalizationId",
  "canonicalizationVersion",
  "caseId",
  "issuedAt",
  "receiptId",
  "schemaName",
  "schemaVersion",
  "snapshotByteLength",
  "snapshotSha256",
  "snapshotVersion",
]);
const CASE_KEYS = Object.freeze(["caseId", "status", "title"]);
const VIEWER_KEYS = Object.freeze([
  "identityStatus",
  "identityVerified",
  "role",
  "userId",
]);
const BINDING_KEYS = Object.freeze([
  "assignmentKind",
  "bindingStatus",
  "boundAt",
]);
const DOMAIN_KEYS = Object.freeze(["code"]);
const AGREEMENT_KEYS = Object.freeze([
  "agreementId",
  "agreementVersionId",
  "endedAt",
  "status",
  "versionNumber",
]);
const MESSAGE_KEYS = Object.freeze([
  "actor",
  "body",
  "bodySha256",
  "messageId",
  "recordReceipt",
]);
const ACTOR_KEYS = Object.freeze(["role", "userId"]);
const MESSAGE_RECEIPT_KEYS = Object.freeze([
  "bodySha256",
  "caseId",
  "messageId",
  "receiptId",
  "recordedAt",
  "schemaName",
  "schemaVersion",
]);
const INVALID_RESULT = Object.freeze({ code: "INVALID_RUNTIME_RESULT" });
const OWNER_RUNTIME_SCHEMA = "laibe.owner-workspace-runtime.v1";
const OWNER_RUNTIME_KEYS = Object.freeze([
  "authenticatedUserId",
  "case",
  "currentCaseId",
  "documents",
  "membership",
  "schemaVersion",
  "serviceContext",
  "state",
  "workspaceAccess",
]);
const OWNER_RUNTIME_CASE_KEYS = Object.freeze(["caseId", "status", "title"]);
const OWNER_RUNTIME_MEMBER_KEYS = Object.freeze([
  "caseId",
  "role",
  "status",
  "userId",
]);
const OWNER_RUNTIME_ACCESS_KEYS = Object.freeze([
  "mutationAllowed",
  "payloadPolicy",
  "role",
  "writeActionsEnabled",
]);
const OWNER_RUNTIME_SERVICE_KEYS = Object.freeze([
  "contractStatus",
  "pcmStatus",
]);
const OWNER_RUNTIME_DOCUMENT_KEYS = Object.freeze([
  "caseId",
  "category",
  "fileId",
  "name",
  "recordStatus",
  "uploadedAt",
  "versionLabel",
  "versionNumber",
]);
const OWNER_ACCESS_ENTRY_URL = "http://127.0.0.1:4173/account/access/";

function sortedStringKeys(keys) {
  const result = [];
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (typeof key !== "string") return null;
    result.push(key);
  }
  result.sort();
  return result;
}

function snapshotExactRecord(value, expectedKeys) {
  if (value === null || typeof value !== "object") throw INVALID_RESULT;
  let prototype;
  let keys;
  let descriptors;
  try {
    prototype = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    throw INVALID_RESULT;
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw INVALID_RESULT;
  }
  const actualKeys = sortedStringKeys(keys);
  const expected = [...expectedKeys].sort();
  if (
    !actualKeys ||
    actualKeys.length !== expected.length ||
    actualKeys.some((key, index) => key !== expected[index])
  ) {
    throw INVALID_RESULT;
  }
  const clean = Object.create(null);
  for (let index = 0; index < expected.length; index += 1) {
    const key = expected[index];
    const descriptor = descriptors[key];
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw INVALID_RESULT;
    }
    clean[key] = descriptor.value;
  }
  return Object.freeze(clean);
}

function snapshotDependencies(value, expectedKeys) {
  try {
    const fields = snapshotExactRecord(value, expectedKeys);
    if (
      typeof fields.authorizedCaseId !== "string" ||
      !UUID_PATTERN.test(fields.authorizedCaseId) ||
      typeof fields.loadOwnerWorkspace !== "function"
    ) {
      return null;
    }
    return fields;
  } catch {
    return null;
  }
}

function initialDependencies(value) {
  const fields = snapshotDependencies(value, DEPENDENCY_KEYS);
  if (
    fields &&
    fields.root !== null &&
    typeof fields.root !== "object" &&
    typeof fields.root !== "function"
  ) {
    return null;
  }
  return fields;
}

function safeRoot(value) {
  try {
    if (value === null || typeof value !== "object") return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, "root");
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      return null;
    }
    const root = descriptor.value;
    return root !== null &&
        (typeof root === "object" || typeof root === "function")
      ? root
      : null;
  } catch {
    return null;
  }
}

function primitiveString(value) {
  if (typeof value !== "string") throw INVALID_RESULT;
  return value;
}

function uuid(value) {
  const text = primitiveString(value);
  if (!UUID_PATTERN.test(text)) throw INVALID_RESULT;
  return text;
}

function sha256(value) {
  const text = primitiveString(value);
  if (!SHA256_PATTERN.test(text)) throw INVALID_RESULT;
  return text;
}

function utc(value) {
  const text = primitiveString(value);
  const parsed = Date.parse(text);
  if (
    !UTC_PATTERN.test(text) ||
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== text
  ) {
    throw INVALID_RESULT;
  }
  return text;
}

function denseArray(value) {
  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) ||
    (prototype !== Array.prototype && prototype !== null)
  ) {
    throw INVALID_RESULT;
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1 || keys[keys.length - 1] !== "length") {
    throw INVALID_RESULT;
  }
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw INVALID_RESULT;
    }
    result.push(descriptor.value);
  }
  return Object.freeze(result);
}

function sameData(left, right) {
  if (Object.is(left, right)) return true;
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }
  try {
    if (Array.isArray(left) || Array.isArray(right)) {
      const leftValues = denseArray(left);
      const rightValues = denseArray(right);
      if (leftValues.length !== rightValues.length) return false;
      for (let index = 0; index < leftValues.length; index += 1) {
        if (!sameData(leftValues[index], rightValues[index])) return false;
      }
      return true;
    }
    const leftKeys = sortedStringKeys(Reflect.ownKeys(left));
    const rightKeys = sortedStringKeys(Reflect.ownKeys(right));
    if (
      !leftKeys ||
      !rightKeys ||
      leftKeys.length !== rightKeys.length ||
      leftKeys.some((key, index) => key !== rightKeys[index])
    ) {
      return false;
    }
    const leftFields = snapshotExactRecord(left, leftKeys);
    const rightFields = snapshotExactRecord(right, rightKeys);
    for (let index = 0; index < leftKeys.length; index += 1) {
      const key = leftKeys[index];
      if (!sameData(leftFields[key], rightFields[key])) return false;
    }
    return true;
  } catch {
    return false;
  }
}

const stringCharCodeAt = String.prototype.charCodeAt;

function unicodeScalarLength(value) {
  const text = primitiveString(value);
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const first = Reflect.apply(stringCharCodeAt, text, [index]);
    if (first >= 0xd800 && first <= 0xdbff) {
      if (index + 1 >= text.length) throw INVALID_RESULT;
      const second = Reflect.apply(stringCharCodeAt, text, [index + 1]);
      if (second < 0xdc00 || second > 0xdfff) throw INVALID_RESULT;
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      throw INVALID_RESULT;
    }
    count += 1;
    if (count > 20000) throw INVALID_RESULT;
  }
  return count;
}

function actorRoleLabel(value) {
  const role = primitiveString(value);
  if (role === "owner") return "\u696d\u4e3b";
  if (role === "pro") return "\u8a2d\u8a08\u5e2b\uff0f\u7d71\u5305";
  if (role === "pcm") return "PCM";
  if (role === "admin") return "\u7ba1\u7406\u8005";
  throw INVALID_RESULT;
}

function caseStatusLabel(value) {
  const status = primitiveString(value);
  if (status === "active") return "\u9032\u884c\u4e2d";
  if (status === "on_hold") return "\u66ab\u505c\u4e2d";
  if (status === "closed") return "\u5df2\u7d50\u6848";
  throw INVALID_RESULT;
}

function snapshotActions(value) {
  const values = denseArray(value);
  if (values.length > 3) throw INVALID_RESULT;
  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    const action = primitiveString(values[index]);
    if (
      action !== "view_case" &&
      action !== "view_documents" &&
      action !== "view_public_messages"
    ) {
      throw INVALID_RESULT;
    }
    for (let seen = 0; seen < result.length; seen += 1) {
      if (result[seen] === action) throw INVALID_RESULT;
    }
    result.push(action);
  }
  return Object.freeze(result);
}

function snapshotMessages(value, expectedCaseId) {
  const values = denseArray(value);
  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    const message = snapshotExactRecord(values[index], MESSAGE_KEYS);
    const actor = snapshotExactRecord(message.actor, ACTOR_KEYS);
    const receipt = snapshotExactRecord(
      message.recordReceipt,
      MESSAGE_RECEIPT_KEYS,
    );
    const messageId = uuid(message.messageId);
    const body = primitiveString(message.body);
    const actorLabel = actorRoleLabel(actor.role);
    uuid(actor.userId);
    const bodyLength = unicodeScalarLength(body);
    const bodySha256 = sha256(message.bodySha256);
    if (
      bodyLength === 0 ||
      sha256Hex(body) !== bodySha256 ||
      primitiveString(receipt.schemaName) !== MESSAGE_RECEIPT_SCHEMA ||
      primitiveString(receipt.schemaVersion) !== MESSAGE_RECEIPT_SCHEMA ||
      uuid(receipt.caseId) !== expectedCaseId ||
      uuid(receipt.messageId) !== messageId ||
      sha256(receipt.bodySha256) !== bodySha256
    ) {
      throw INVALID_RESULT;
    }
    result.push(Object.freeze({
      actorLabel,
      body,
      bodySha256,
      caseId: expectedCaseId,
      documentVersionLabel: "",
      messageId,
      messageTypeLabel: "案件公開留言",
      nextActionLabel: "",
      recordReceipt: Object.freeze({
        bodySha256,
        caseId: expectedCaseId,
        messageId,
        receiptId: uuid(receipt.receiptId),
        recordedAt: utc(receipt.recordedAt),
        status: "recorded",
      }),
    }));
  }
  return Object.freeze(result);
}

function validateAndMapRuntimeWorkspace(value, expectedCaseId) {
  const result = snapshotExactRecord(value, RESULT_KEYS);
  if (
    primitiveString(result.schemaName) !== SNAPSHOT_SCHEMA ||
    primitiveString(result.schemaVersion) !== SNAPSHOT_SCHEMA
  ) {
    throw INVALID_RESULT;
  }
  const snapshotVersion = uuid(result.snapshotVersion);
  const readAt = utc(result.readAt);
  const canonicalization = snapshotExactRecord(
    result.canonicalization,
    CANONICALIZATION_KEYS,
  );
  if (
    primitiveString(canonicalization.id) !== CANONICALIZATION_ID ||
    canonicalization.version !== 1 ||
    primitiveString(canonicalization.encoding) !== "UTF-8"
  ) {
    throw INVALID_RESULT;
  }

  const snapshotPreimage = primitiveString(result.snapshotPreimage);
  const receipt = snapshotExactRecord(
    result.readReceipt,
    READ_RECEIPT_KEYS,
  );
  const digest = sha256(receipt.snapshotSha256);
  const byteLength = new TextEncoder().encode(snapshotPreimage).byteLength;
  if (
    primitiveString(receipt.schemaName) !== READ_RECEIPT_SCHEMA ||
    primitiveString(receipt.schemaVersion) !== READ_RECEIPT_SCHEMA ||
    uuid(receipt.receiptId) === "" ||
    uuid(receipt.caseId) !== expectedCaseId ||
    uuid(receipt.snapshotVersion) !== snapshotVersion ||
    digest !== sha256Hex(snapshotPreimage) ||
    !Number.isSafeInteger(receipt.snapshotByteLength) ||
    receipt.snapshotByteLength !== byteLength ||
    primitiveString(receipt.canonicalizationId) !== CANONICALIZATION_ID ||
    receipt.canonicalizationVersion !== 1 ||
    utc(receipt.issuedAt) !== readAt
  ) {
    throw INVALID_RESULT;
  }

  let parsed;
  try {
    parsed = JSON.parse(snapshotPreimage);
  } catch {
    throw INVALID_RESULT;
  }
  const snapshot = snapshotExactRecord(parsed, SNAPSHOT_KEYS);
  if (
    primitiveString(snapshot.schemaName) !== SNAPSHOT_SCHEMA ||
    primitiveString(snapshot.schemaVersion) !== SNAPSHOT_SCHEMA ||
    primitiveString(snapshot.status) !== primitiveString(result.status) ||
    uuid(snapshot.snapshotVersion) !== snapshotVersion
  ) {
    throw INVALID_RESULT;
  }
  for (const key of [
    "actions",
    "case",
    "caseBinding",
    "pcmDomain",
    "publicMessages",
    "serviceAgreement",
    "viewer",
  ]) {
    if (!sameData(result[key], snapshot[key])) throw INVALID_RESULT;
  }

  const caseState = snapshotExactRecord(snapshot.case, CASE_KEYS);
  const viewer = snapshotExactRecord(snapshot.viewer, VIEWER_KEYS);
  const binding = snapshotExactRecord(snapshot.caseBinding, BINDING_KEYS);
  const domain = snapshotExactRecord(snapshot.pcmDomain, DOMAIN_KEYS);
  const agreement = snapshotExactRecord(
    snapshot.serviceAgreement,
    AGREEMENT_KEYS,
  );
  const caseId = uuid(caseState.caseId);
  const status = primitiveString(snapshot.status);
  const statusLabel = caseStatusLabel(caseState.status);
  if (
    caseId !== expectedCaseId ||
    (status !== "CASE_DATA_AVAILABLE" && status !== "ZERO_CASE_DATA") ||
    primitiveString(viewer.identityStatus) !== "line_bound" ||
    viewer.identityVerified !== true ||
    primitiveString(viewer.role) !== "owner" ||
    primitiveString(binding.assignmentKind) !== "participant" ||
    primitiveString(binding.bindingStatus) !== "active" ||
    primitiveString(domain.code) !== "contract"
  ) {
    throw INVALID_RESULT;
  }
  uuid(viewer.userId);
  utc(binding.boundAt);
  uuid(agreement.agreementId);
  uuid(agreement.agreementVersionId);
  if (
    !Number.isSafeInteger(agreement.versionNumber) ||
    agreement.versionNumber < 1
  ) {
    throw INVALID_RESULT;
  }
  const agreementStatus = primitiveString(agreement.status);
  if (
    agreementStatus !== "active" &&
    agreementStatus !== "ended"
  ) {
    throw INVALID_RESULT;
  }
  if (
    (agreementStatus === "active" && agreement.endedAt !== null) ||
    (agreementStatus === "ended" && utc(agreement.endedAt) === "")
  ) {
    throw INVALID_RESULT;
  }

  const actions = snapshotActions(snapshot.actions);
  const messages = snapshotMessages(snapshot.publicMessages, caseId);
  if (
    (status === "ZERO_CASE_DATA" &&
      (actions.length !== 0 || messages.length !== 0)) ||
    (status === "CASE_DATA_AVAILABLE" && messages.length === 0) ||
    (agreementStatus === "ended" && actions.length !== 0)
  ) {
    throw INVALID_RESULT;
  }

  return Object.freeze({
    sessionStatus: "active",
    actor: Object.freeze({
      actorId: primitiveString(viewer.userId),
      displayLabel: "業主",
      role: "owner",
    }),
    membership: Object.freeze({ caseId, status: "active" }),
    serviceAgreement: Object.freeze({
      agreementId: primitiveString(agreement.agreementId),
      caseId,
      status: agreementStatus,
      version: String(agreement.versionNumber),
    }),
    caseBinding: Object.freeze({ caseId, status: "bound" }),
    domain: Object.freeze({ name: "pcm", status: "active" }),
    caseSummary: status === "ZERO_CASE_DATA"
      ? null
      : Object.freeze({
        caseId,
        constructionIssueLabel: "",
        currentActorLabel: "業主",
        displayName: primitiveString(caseState.title),
        documentSummaryLabel: "",
        issueSummaryLabel: "",
        lastRecordedAtLabel: "",
        nextActionLabel: "",
        nextDueLabel: "",
        reviewSummaryLabel: "",
        statusLabel,
        todayFocusLabel: "",
        waitingRelationshipLabel: "",
      }),
    constructionRecords: Object.freeze([]),
    designReviews: Object.freeze([]),
    documents: Object.freeze([]),
    events: Object.freeze([]),
    permittedActions: actions,
    processSteps: Object.freeze([]),
    publicMessages: messages,
    submissions: Object.freeze([]),
  });
}

function safeErrorCode(value) {
  try {
    if (
      value === null ||
      (typeof value !== "object" && typeof value !== "function")
    ) {
      return "";
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, "code");
    return descriptor &&
        Object.prototype.hasOwnProperty.call(descriptor, "value") &&
        typeof descriptor.value === "string"
      ? descriptor.value
      : "";
  } catch {
    return "";
  }
}

function fixedFailure(error) {
  if (error === INVALID_RESULT) return Object.freeze({ status: 403 });
  const code = safeErrorCode(error);
  if (
    code === "OWNER_ACCESS_DENIED" ||
    code === "OWNER_CASE_SELECTOR_INVALID" ||
    code === "INVALID_OWNER_WORKSPACE_RPC_RESULT"
  ) {
    return Object.freeze({ status: 403 });
  }
  return Object.freeze({ status: 503 });
}

function adapterFor(dependencies) {
  return Object.freeze({
    async loadOwnerWorkspace() {
      try {
        const workspace = await Reflect.apply(
          dependencies.loadOwnerWorkspace,
          undefined,
          [Object.freeze({ caseId: dependencies.authorizedCaseId })],
        );
        return validateAndMapRuntimeWorkspace(
          workspace,
          dependencies.authorizedCaseId,
        );
      } catch (error) {
        throw fixedFailure(error);
      }
    },
  });
}

export function createOwnerWorkspaceBootstrap(untrustedDependencies) {
  const dependencies = initialDependencies(untrustedDependencies);
  const root = dependencies?.root ?? safeRoot(untrustedDependencies);
  bindOwnerWorkspaceCanonicalLinks(root, getActiveCanonicalLinkHref);
  const controller = createOwnerWorkspaceController({ root });
  if (dependencies) controller.setAdapter(adapterFor(dependencies));

  async function configureOwnerWorkspace(untrustedConfiguration) {
    const configuration = snapshotDependencies(
      untrustedConfiguration,
      CONFIGURATION_KEYS,
    );
    controller.setAdapter(configuration ? adapterFor(configuration) : undefined);
    return controller.initialize();
  }

  return Object.freeze({
    configureOwnerWorkspace,
    initialize: controller.initialize,
  });
}

function ownerDocumentKind(category) {
  if (category === "drawing") return "圖面";
  if (category === "quote") return "報價";
  if (category === "contract") return "契約";
  throw INVALID_RESULT;
}

function ownerDocumentDate(timestamp) {
  const value = utc(timestamp);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T/u);
  if (!match) throw INVALID_RESULT;
  return `${match[1]}/${match[2]}/${match[3]}`;
}

function mapOwnerWorkspaceGrant(value) {
  const result = snapshotExactRecord(value, OWNER_RUNTIME_KEYS);
  if (
    primitiveString(result.schemaVersion) !== OWNER_RUNTIME_SCHEMA ||
    primitiveString(result.state) !== "AUTHORIZED_OWNER_WORKSPACE"
  ) throw INVALID_RESULT;

  const authenticatedUserId = uuid(result.authenticatedUserId);
  const currentCaseId = uuid(result.currentCaseId);
  const membership = snapshotExactRecord(
    result.membership,
    OWNER_RUNTIME_MEMBER_KEYS,
  );
  const workspaceAccess = snapshotExactRecord(
    result.workspaceAccess,
    OWNER_RUNTIME_ACCESS_KEYS,
  );
  const caseRecord = snapshotExactRecord(
    result.case,
    OWNER_RUNTIME_CASE_KEYS,
  );
  const serviceContext = snapshotExactRecord(
    result.serviceContext,
    OWNER_RUNTIME_SERVICE_KEYS,
  );
  if (
    uuid(membership.userId) !== authenticatedUserId ||
    uuid(membership.caseId) !== currentCaseId ||
    primitiveString(membership.role) !== "owner" ||
    primitiveString(membership.status) !== "active" ||
    primitiveString(workspaceAccess.role) !== "owner" ||
    workspaceAccess.mutationAllowed !== false ||
    workspaceAccess.writeActionsEnabled !== false ||
    primitiveString(workspaceAccess.payloadPolicy) !== "AUTHORIZED_SCOPE_ONLY" ||
    uuid(caseRecord.caseId) !== currentCaseId ||
    primitiveString(caseRecord.status) !== "active" ||
    primitiveString(serviceContext.pcmStatus) !== "UNAVAILABLE" ||
    primitiveString(serviceContext.contractStatus) !== "UNAVAILABLE"
  ) throw INVALID_RESULT;

  const title = primitiveString(caseRecord.title);
  if (title.length === 0 || title.length > 240) throw INVALID_RESULT;
  if (!Array.isArray(result.documents) || result.documents.length > 200) {
    throw INVALID_RESULT;
  }
  let latestUploadedAt = "";
  const documents = result.documents.map((document) => {
    const record = snapshotExactRecord(document, OWNER_RUNTIME_DOCUMENT_KEYS);
    const caseId = uuid(record.caseId);
    const category = primitiveString(record.category);
    const name = primitiveString(record.name);
    const versionLabel = primitiveString(record.versionLabel);
    const recordStatus = primitiveString(record.recordStatus);
    const uploadedAt = utc(record.uploadedAt);
    if (
      uuid(record.fileId) === "" || caseId !== currentCaseId ||
      name.length === 0 || name.length > 512 ||
      versionLabel.length === 0 || versionLabel.length > 120 ||
      !Number.isSafeInteger(record.versionNumber) || record.versionNumber < 1 ||
      recordStatus !== "active"
    ) throw INVALID_RESULT;
    if (
      latestUploadedAt === "" ||
      Date.parse(uploadedAt) > Date.parse(latestUploadedAt)
    ) {
      latestUploadedAt = uploadedAt;
    }
    return Object.freeze({
      title: name,
      kindLabel: ownerDocumentKind(category),
      versionLabel: `第 ${record.versionNumber} 版・${versionLabel}`,
      submittedByLabel: "提供者：案件成員",
      submittedAtLabel: `更新時間：${ownerDocumentDate(uploadedAt)}`,
      statusLabel: "文件可檢視",
      sourceLabel: "依據：案件文件紀錄",
      nextActorLabel: "下一步責任人：甲方確認",
      traceabilityLabel: "已留下正式案件紀錄",
    });
  });

  return Object.freeze({
    state: "AUTHORIZED_READY",
    authorityMode: "server_owner_grant_v1",
    ownerContractEditable: false,
    sessionStatus: "active",
    actor: Object.freeze({
      actorId: authenticatedUserId,
      displayLabel: "業主",
      role: "owner",
    }),
    membership: Object.freeze({ caseId: currentCaseId, status: "active" }),
    serviceAgreement: Object.freeze({
      agreementId: "",
      caseId: currentCaseId,
      status: "unavailable",
      version: "",
    }),
    caseBinding: Object.freeze({ caseId: currentCaseId, status: "bound" }),
    domain: Object.freeze({ name: "pcm", status: "active" }),
    caseSummary: Object.freeze({
      caseId: currentCaseId,
      constructionIssueLabel: "尚待案件紀錄",
      currentActorLabel: "甲方",
      displayName: title,
      documentSummaryLabel: documents.length > 0
        ? `${documents.length} 份可檢視文件`
        : "尚無文件",
      issueSummaryLabel: "依文件與案件紀錄確認",
      lastRecordedAtLabel: latestUploadedAt
        ? ownerDocumentDate(latestUploadedAt)
        : "尚無文件紀錄",
      nextActionLabel: documents.length > 0
        ? "確認目前文件版本與待補資料"
        : "等待案件成員提供正式文件",
      nextDueLabel: "依案件通知",
      reviewSummaryLabel: "尚待書面檢討紀錄",
      statusLabel: caseStatusLabel(caseRecord.status),
      todayFocusLabel: "核對目前文件與待辦",
      waitingRelationshipLabel: "甲方先確認目前資料，必要時請案件成員補充",
    }),
    constructionRecords: Object.freeze([]),
    designReviews: Object.freeze([]),
    documents: Object.freeze(documents),
    events: Object.freeze([]),
    permittedActions: Object.freeze([]),
    processSteps: Object.freeze([]),
    publicMessages: Object.freeze([]),
    submissions: Object.freeze([]),
  });
}

export function validateAndMapOwnerWorkspaceGrant(value) {
  try {
    return mapOwnerWorkspaceGrant(value);
  } catch {
    return null;
  }
}

export function createOwnerSupabaseWorkspaceBootstrap({
  root,
  authRuntime,
  authRuntimeProvider = getSupabaseAuthRuntime,
} = {}) {
  bindOwnerWorkspaceCanonicalLinks(root, getActiveCanonicalLinkHref);
  const controller = createOwnerWorkspaceController({ root });
  let runtime = authRuntime ?? null;
  let activeGeneration = 0;

  function isCurrent(generation) {
    return generation === activeGeneration;
  }

  function redirectToOwnerAccess(generation) {
    if (!isCurrent(generation)) return;
    root?.defaultView?.location?.assign?.(OWNER_ACCESS_ENTRY_URL);
  }

  async function getRuntime() {
    if (!runtime) runtime = await authRuntimeProvider();
    if (
      !runtime || typeof runtime.getSession !== "function" ||
      typeof runtime.authenticatedFetch !== "function"
    ) throw Object.freeze({ status: 503 });
    return runtime;
  }

  async function getAuthorizedResponse(endpoint, generation) {
    const activeRuntime = await getRuntime();
    const session = await activeRuntime.getSession();
    if (!session || typeof session.access_token !== "string" || !session.access_token) {
      redirectToOwnerAccess(generation);
      throw Object.freeze({ status: 401 });
    }
    const response = await activeRuntime.authenticatedFetch(endpoint, {
      method: "GET",
    });
    if (!response?.ok) throw Object.freeze({ status: 403 });
    try {
      return await response.json();
    } catch {
      throw Object.freeze({ status: 403 });
    }
  }

  async function loadOwnerWorkspace(generation) {
    const mapped = validateAndMapOwnerWorkspaceGrant(
      await getAuthorizedResponse("owner-workspace-grant", generation),
    );
    if (!mapped) throw Object.freeze({ status: 403 });
    if (!isCurrent(generation)) throw Object.freeze({ status: 409 });
    return mapped;
  }

  async function initialize() {
    const generation = activeGeneration + 1;
    activeGeneration = generation;
    controller.setAdapter(Object.freeze({
      loadOwnerWorkspace() {
        return loadOwnerWorkspace(generation);
      },
    }));
    const model = await controller.initialize();
    return model;
  }

  return Object.freeze({ initialize });
}

export const canonicalOwnerWorkspacePage =
  typeof document === "undefined"
    ? null
    : createOwnerSupabaseWorkspaceBootstrap({ root: document });

if (canonicalOwnerWorkspacePage) {
  void canonicalOwnerWorkspacePage.initialize();
}
