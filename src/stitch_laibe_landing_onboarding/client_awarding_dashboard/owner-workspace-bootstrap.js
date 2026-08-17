import {
  bindOwnerWorkspaceCanonicalLinks,
  createOwnerWorkspaceController,
  sha256Hex,
} from "./app.js";
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
  if (!UTC_PATTERN.test(text) || !Number.isFinite(Date.parse(text))) {
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

export const canonicalOwnerWorkspacePage =
  typeof document === "undefined"
    ? null
    : createOwnerWorkspaceBootstrap({
      root: document,
      authorizedCaseId: null,
      loadOwnerWorkspace: null,
    });

if (canonicalOwnerWorkspacePage) {
  void canonicalOwnerWorkspacePage.initialize();
}
