export type GroupType = "OWNER_DRS_PRIVATE" | "OWNER_VENDOR_DRS_SHARED";
export type LinkedGroupStatus = "active" | "revoked" | "expired";
export type LineSourceType = "user" | "group" | "room";
export type ActorType = "OWNER" | "VENDOR" | "DRS" | "SYSTEM";
export type AccountSubjectType = "OWNER" | "VENDOR" | "SPECIALIST";
export type AiReviewStatus =
  | "REVIEW_COMPLETED_NO_FLAG"
  | "REVIEW_COMPLETED_ATTENTION"
  | "REVIEW_SERVICE_UNAVAILABLE";
export type PreSendReviewState =
  | AiReviewStatus
  | "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS";
export type HumanSendDecisionType = Exclude<HumanDecision["type"], "CANCEL">;
export type SpecialistPostbackAction = HumanDecision["type"];

declare const publicSafeTextBrand: unique symbol;
export type PublicSafeText = string & { readonly [publicSafeTextBrand]: true };

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type UnknownRecord = Record<string, unknown>;
type UuidFactory = () => string;

export interface FinalAttachmentRef {
  attachmentId: string;
  sha256: string;
  mimeType: string;
  byteSize: number;
  storageRef: string;
}

export interface LinkedLineGroup {
  formalLinkId: string;
  caseId: string;
  linkedGroupId: string;
  lineGroupId: string;
  groupType: GroupType;
  status: LinkedGroupStatus;
  validFrom: string;
  validTo: string;
  drsMember: boolean;
  botPresenceUpdatedAt?: string;
  botPresenceEventType?: "join" | "leave";
  botPresenceEventKey?: string;
  ownerLineUserIds: readonly string[];
  vendorLineUserIds: readonly string[];
}

export interface SpecialistAssignment {
  assignmentId: string;
  caseId: string;
  specialistId: string;
  verifiedAuthSubject: string;
  specialistEmailSnapshot: string;
  validFrom: string;
  validTo: string;
  assignedBy: string;
  status: "active" | "revoked" | "expired";
  privateControlLineUserId: string;
}

export interface LineAccountBinding {
  bindingId: string;
  subjectType: AccountSubjectType;
  subjectId: string;
  lineUserId: string;
  status: "active" | "revoked";
  linkedAt: string;
  revokedAt?: string;
}

interface OpaqueTokenRecord {
  token: string;
  tokenType:
    | "account_link_continuation"
    | "complex_action_deep_link"
    | "specialist_postback";
  subjectType?: AccountSubjectType;
  subjectId?: string;
  specialistId?: string;
  authSubject?: string;
  caseId?: string;
  linkedGroupId?: string;
  reviewId?: string;
  action?: SpecialistPostbackAction;
  actionContextId: string;
  expiresAt: string;
  consumedAt?: string;
}

export interface DrsLineMessageEvent {
  type: "message";
  mode?: string;
  timestamp: number;
  webhookEventId: string;
  deliveryContext?: { isRedelivery: boolean };
  source:
    | { type: "group"; groupId: string; userId?: string }
    | { type: "room"; roomId: string; userId?: string }
    | { type: "user"; userId: string };
  message:
    | {
      id: string;
      type: "text";
      text: string;
    }
    | {
      id: string;
      type: "file";
      fileName: string;
      fileSize: number;
      contentProvider?: { type: string };
    }
    | {
      id: string;
      type: "image";
      contentProvider?: { type: string };
    }
    | {
      id: string;
      type: string;
    };
}

export interface ReceiptRecord {
  receiptId: string;
  provider: "line";
  providerChannelId: string;
  providerReceiptKey: string;
  webhookEventId: string;
  lineMessageId: string;
  lineGroupId: string;
  lineSenderUserId: string;
  linkedGroupId: string;
  caseId: string;
  groupType: GroupType;
  messageType: "text" | "file" | "image";
  actorType: "OWNER" | "VENDOR" | "DRS";
  occurredAt: string;
  receivedAt: string;
  fingerprintSha256: string;
  logicalDocumentId?: string;
  processingState: "accepted" | "dead_letter";
}

export interface AttachmentRecord {
  attachmentId: string;
  receiptId: string;
  provider: "line";
  lineMessageId: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  byteSize: number;
  sha256: string;
  storageRef: string;
  status: "private_staged";
  canonicalDocumentId?: string;
  canonicalDocumentVersionId?: string;
}

export interface AuditEventRecord {
  auditEventId: string;
  eventType:
    | "LINE_SENT_EVENT"
    | "AI_REVIEW"
    | "HUMAN_DECISION"
    | "FINAL_MESSAGE"
    | "RECEIPT";
  schemaVersion: "laibe.drs.audit.v1";
  caseId: string;
  linkedGroupId: string;
  correlationId: string;
  occurredAt: string;
  recordedAt: string;
  actorType: ActorType;
  actorId: string;
  specialistId?: string;
  specialistEmailSnapshot?: string;
  visibilityScope: "DRS_INTERNAL" | "LINE_GROUP";
  previousEventId?: string;
  policyVersion: "drs-line-w1";
  payloadSha256: string;
}

export interface AiReviewRecord {
  required: true;
  reviewId: string;
  reviewRequestId?: string;
  caseId: string;
  linkedGroupId: string;
  submittedSnapshotSha256: string;
  producedBy: "advisory_port";
  consumedByDecisionId?: string;
  consumedAt?: string;
  status: AiReviewStatus;
  findings: readonly string[];
  evidenceRefs: readonly string[];
  recommendations: readonly string[];
  proposedText: string;
  proposedTextSha256: string;
  model: string;
  modelVersion: string;
  ragVersion: string;
  skillVersion: string;
  createdAt: string;
  completedAt: string;
  serviceErrorCode?: string;
  isApprover: false;
  canSendByItself: false;
  hiddenChainOfThoughtStored: false;
}

export interface AiReviewSkipped {
  required: false;
  reviewId: undefined;
  status: undefined;
  findings: readonly [];
  evidenceRefs: readonly [];
  recommendations: readonly [];
  proposedText: string;
  proposedTextSha256: string;
  model: undefined;
  modelVersion: undefined;
  ragVersion: undefined;
  skillVersion: undefined;
  createdAt: string;
  completedAt: string;
  serviceErrorCode?: undefined;
  isApprover: false;
  canSendByItself: false;
  hiddenChainOfThoughtStored: false;
}

export type AdvisoryReviewOutcome = AiReviewRecord | AiReviewSkipped;

export interface AiReviewRequestRecord {
  reviewRequestId: string;
  caseId: string;
  linkedGroupId: string;
  submittedSnapshotSha256: string;
  submittedBody?: string | null;
  submittedPreview: PublicSafeText;
  status: "pending" | "completed";
  createdAt: string;
  completedReviewId?: string;
  completedAt?: string;
  submittedBodyClearedAt?: string;
}

export type HumanDecision =
  | { type: "CANCEL"; reason: string }
  | {
    type: "EDIT_AND_SEND";
    finalText: string;
    reason: string;
    finalSnapshotSha256: string;
  }
  | {
    type: "OVERRIDE_AND_SEND";
    finalText: string;
    reason: string;
    finalSnapshotSha256: string;
  }
  | {
    type: "MANUAL_EXCEPTION_SEND";
    finalText: string;
    reason: string;
    urgency: "normal" | "high" | "critical";
    serviceIncidentId: string;
    finalSnapshotSha256: string;
  };

export interface HumanDecisionRecord {
  decisionId: string;
  finalizationKey: string;
  assignmentId: string;
  caseId: string;
  linkedGroupId: string;
  specialistId: string;
  specialistEmailSnapshot: string;
  aiReviewId?: string;
  decisionType: HumanDecision["type"];
  reason: string;
  finalTextSha256?: string;
  finalSnapshotSha256?: string;
  finalAttachmentRefs: readonly FinalAttachmentRef[];
  urgency?: "normal" | "high" | "critical";
  serviceIncidentId?: string;
  decidedAt: string;
  decisionPayloadSha256: string;
}

export interface FinalMessageRecord {
  finalMessageId: string;
  caseId: string;
  linkedGroupId: string;
  lineGroupId: string;
  assignmentId: string;
  specialistId: string;
  finalText: string;
  finalTextSha256: string;
  finalSnapshotSha256: string;
  attachments: readonly FinalAttachmentRef[];
  deliverableMessages: readonly FinalDeliverableMessage[];
  aiReviewId?: string;
  preSendReviewState: PreSendReviewState;
  finalizationKey: string;
  queuedAt: string;
}

export type FinalDeliverableMessage =
  | {
    type: "text";
    purpose: "final_text" | "attachment_payload";
    text: PublicSafeText;
    attachmentRef?: FinalAttachmentRef;
    accessUrl?: string;
    accessUrlKind?: "drs_opaque_attachment_access";
  }
  | {
    type: "image";
    purpose: "attachment_payload";
    originalContentUrl: string;
    previewImageUrl: string;
    attachmentRef: FinalAttachmentRef;
  };

export interface AttachmentTransportResolver {
  resolve(input: {
    attachments: readonly FinalAttachmentRef[];
  }):
    | readonly FinalDeliverableMessage[]
    | Promise<readonly FinalDeliverableMessage[]>;
}

export interface OutboxRecord {
  outboxId: string;
  caseId: string;
  linkedGroupId: string;
  target: { type: "group"; groupId: string };
  retryKey: string;
  finalMessageId: string;
  status: "queued";
}

export interface CanonicalCaseWriteAttempt {
  reason: string;
}

export interface ContentProvider {
  readMessageContent?: (messageId: string) => Uint8Array | Promise<Uint8Array>;
  detectMime?: (messageId: string) => string | Promise<string>;
}

export interface ProcessWebhookInput {
  rawBody: string;
  signature: string;
  channelSecret: string;
  expectedDestination: string;
  store: MemoryDrsLineStore;
  now: string;
  contentProvider?: ContentProvider;
}

export interface ProcessWebhookResult {
  status: "ok" | "bad_signature" | "wrong_destination" | "bad_request";
  acceptedCount: number;
  duplicateCount: number;
  deniedCount: number;
  unsupportedCount: number;
  collisionCount: number;
}

export interface AdvisoryPortResult {
  status: AiReviewStatus;
  findings: readonly string[];
  evidenceRefs: readonly string[];
  recommendations: readonly string[];
  proposedText: string;
  model: string;
  modelVersion: string;
  ragVersion: string;
  skillVersion: string;
  serviceErrorCode?: string;
}

export interface AdvisoryPort {
  review(input: {
    text: string;
    now: string;
  }): Promise<AdvisoryPortResult>;
}

export interface DeterministicAdvisoryPort extends AdvisoryPort {
  readonly calls: { text: string; now: string }[];
}

export class MemoryDrsLineStore {
  readonly uuidFactory: UuidFactory;
  readonly linkedGroups: LinkedLineGroup[] = [];
  readonly assignments: SpecialistAssignment[] = [];
  readonly receipts: ReceiptRecord[] = [];
  readonly attachments: AttachmentRecord[] = [];
  readonly auditEvents: AuditEventRecord[] = [];
  readonly aiReviewRequests: AiReviewRequestRecord[] = [];
  readonly aiReviews: AiReviewRecord[] = [];
  readonly humanDecisions: HumanDecisionRecord[] = [];
  readonly finalMessages: FinalMessageRecord[] = [];
  readonly outbox: OutboxRecord[] = [];
  readonly accountBindings: LineAccountBinding[] = [];
  readonly opaqueTokens: OpaqueTokenRecord[] = [];
  readonly canonicalCaseWrites: CanonicalCaseWriteAttempt[] = [];
  readonly unsentDrafts: never[] = [];

  constructor(input: { uuidFactory?: UuidFactory } = {}) {
    this.uuidFactory = input.uuidFactory ?? (() => crypto.randomUUID());
  }

  nextUuid(): string {
    const uuid = this.uuidFactory();
    if (!isUuid(uuid)) throw new Error("uuid_factory_returned_invalid_uuid");
    return uuid;
  }

  linkGroup(group: LinkedLineGroup): void {
    this.linkedGroups.push({ ...group });
  }

  assignSpecialist(assignment: SpecialistAssignment): void {
    this.assignments.push({ ...assignment });
  }

  getLinkedGroup(linkedGroupId: string): LinkedLineGroup | undefined {
    return this.linkedGroups.find((group) =>
      group.linkedGroupId === linkedGroupId
    );
  }

  updateGroupMembership(
    linkedGroupId: string,
    update: Partial<Pick<LinkedLineGroup, "drsMember" | "status" | "validTo">>,
  ): void {
    const group = this.getLinkedGroup(linkedGroupId);
    if (!group) return;
    Object.assign(group, update);
  }

  findLinkedGroupByLineGroupId(
    lineGroupId: string,
  ): LinkedLineGroup | undefined {
    return this.linkedGroups.find((group) => group.lineGroupId === lineGroupId);
  }

  findSendableLinkedGroup(input: {
    caseId: string;
    linkedGroupId: string;
    lineGroupId: string;
    now: string;
  }): LinkedLineGroup | undefined {
    const group = this.linkedGroups.find((candidate) =>
      candidate.caseId === input.caseId &&
      candidate.linkedGroupId === input.linkedGroupId &&
      candidate.lineGroupId === input.lineGroupId
    );
    if (!group) return undefined;
    return isGroupCurrentAndDrsPresent(group, input.now) ? group : undefined;
  }

  findActiveGroupForInbound(
    lineGroupId: string,
    lineSenderUserId: string,
    sentAt: string,
  ): LinkedLineGroup | undefined {
    const group = this.findLinkedGroupByLineGroupId(lineGroupId);
    if (!group || !isGroupCurrentAndDrsPresent(group, sentAt)) {
      return undefined;
    }
    const isOwner = group.ownerLineUserIds.includes(lineSenderUserId);
    const isVendor = group.vendorLineUserIds.includes(lineSenderUserId);
    return isOwner || isVendor ? group : undefined;
  }

  findReceipt(providerReceiptKey: string): ReceiptRecord | undefined {
    return this.receipts.find((receipt) =>
      receipt.providerReceiptKey === providerReceiptKey
    );
  }

  findAssignment(assignmentId: string): SpecialistAssignment | undefined {
    return this.assignments.find((assignment) =>
      assignment.assignmentId === assignmentId
    );
  }

  unlinkLineAccount(bindingId: string, revokedAt: string): void {
    const binding = this.accountBindings.find((candidate) =>
      candidate.bindingId === bindingId
    );
    if (!binding) throw new Error("binding_not_found");
    binding.status = "revoked";
    binding.revokedAt = revokedAt;
  }
}

export function createMemoryDrsLineStore(
  input: { uuidFactory?: UuidFactory } = {},
): MemoryDrsLineStore {
  return new MemoryDrsLineStore(input);
}

export async function processLineWebhook(
  input: ProcessWebhookInput,
): Promise<ProcessWebhookResult> {
  const verified = await verifyLineSignature(
    input.channelSecret,
    input.rawBody,
    input.signature,
  );
  if (!verified) {
    return emptyWebhookResult("bad_signature");
  }

  let body: UnknownRecord;
  try {
    const parsed: unknown = JSON.parse(input.rawBody);
    if (!isRecord(parsed)) return emptyWebhookResult("bad_request");
    body = parsed;
  } catch {
    return emptyWebhookResult("bad_request");
  }

  if (body.destination !== input.expectedDestination) {
    return emptyWebhookResult("wrong_destination");
  }

  const events = Array.isArray(body.events) ? body.events : [];
  const result: ProcessWebhookResult = emptyWebhookResult("ok");

  for (const event of events) {
    if (!isRecord(event)) {
      result.unsupportedCount += 1;
      continue;
    }
    if (isBotJoinEvent(event)) {
      updateLinkedGroupForBotJoin(input.store, event);
      result.unsupportedCount += 1;
      continue;
    }
    if (isBotLeaveEvent(event)) {
      updateLinkedGroupForBotLeave(input.store, event, input.now);
      result.unsupportedCount += 1;
      continue;
    }
    if (isMemberEvent(event)) {
      result.unsupportedCount += 1;
      continue;
    }
    if (!isLineMessageEvent(event)) {
      result.unsupportedCount += 1;
      continue;
    }
    if (event.source.type !== "group") {
      result.unsupportedCount += 1;
      continue;
    }
    if (!isSupportedMessageType(event.message.type)) {
      result.unsupportedCount += 1;
      continue;
    }
    if (!isSafeLineTimestamp(event.timestamp)) {
      result.deniedCount += 1;
      continue;
    }
    const occurredAt = new Date(event.timestamp).toISOString();
    const sender = event.source.userId;
    if (!sender) {
      result.deniedCount += 1;
      continue;
    }
    const linkedGroup = input.store.findActiveGroupForInbound(
      event.source.groupId,
      sender,
      occurredAt,
    );
    if (!linkedGroup) {
      result.deniedCount += 1;
      continue;
    }

    const fingerprintSha256 = await sha256Hex(canonicalJson({
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      message: event.message,
    }));
    const providerReceiptKey = [
      "line",
      input.expectedDestination,
      event.webhookEventId,
      event.source.groupId,
      event.message.id,
    ].join(":");
    const existing = input.store.findReceipt(providerReceiptKey);
    if (existing) {
      if (existing.fingerprintSha256 === fingerprintSha256) {
        result.duplicateCount += 1;
      } else {
        result.collisionCount += 1;
        result.deniedCount += 1;
      }
      continue;
    }

    const actorType = linkedGroup.ownerLineUserIds.includes(sender)
      ? "OWNER"
      : "VENDOR";
    const receiptId = input.store.nextUuid();
    const receipt: ReceiptRecord = {
      receiptId,
      provider: "line",
      providerChannelId: input.expectedDestination,
      providerReceiptKey,
      webhookEventId: event.webhookEventId,
      lineMessageId: event.message.id,
      lineGroupId: event.source.groupId,
      lineSenderUserId: sender,
      linkedGroupId: linkedGroup.linkedGroupId,
      caseId: linkedGroup.caseId,
      groupType: linkedGroup.groupType,
      messageType: event.message.type,
      actorType,
      occurredAt,
      receivedAt: input.now,
      fingerprintSha256,
      processingState: "accepted",
    };
    let attachment: AttachmentRecord | undefined;
    if (event.message.type === "file" || event.message.type === "image") {
      try {
        attachment = await stageAttachment({
          store: input.store,
          event,
          receipt,
          contentProvider: input.contentProvider,
        });
      } catch {
        result.deniedCount += 1;
        continue;
      }
    }
    input.store.receipts.push(receipt);
    input.store.auditEvents.push(
      await buildAuditEvent(input.store, {
        eventType: "RECEIPT",
        caseId: linkedGroup.caseId,
        linkedGroupId: linkedGroup.linkedGroupId,
        correlationId: receipt.receiptId,
        occurredAt: receipt.occurredAt,
        recordedAt: input.now,
        actorType,
        actorId: sender,
        visibilityScope: "DRS_INTERNAL",
        payload: receipt,
      }),
    );
    input.store.auditEvents.push(
      await buildAuditEvent(input.store, {
        eventType: "LINE_SENT_EVENT",
        caseId: linkedGroup.caseId,
        linkedGroupId: linkedGroup.linkedGroupId,
        correlationId: receipt.receiptId,
        occurredAt: receipt.occurredAt,
        recordedAt: input.now,
        actorType,
        actorId: sender,
        visibilityScope: "DRS_INTERNAL",
        payload: {
          provider: "line",
          lineMessageId: event.message.id,
          messageType: event.message.type,
          lineMessageIdIsProvenanceOnly: true,
        },
      }),
    );

    if (attachment) {
      input.store.attachments.push(attachment);
    }
    result.acceptedCount += 1;
  }
  return result;
}

export function createDeterministicAdvisoryPort(input: {
  mode: "no_flag" | "attention" | "unavailable";
}): DeterministicAdvisoryPort {
  const calls: { text: string; now: string }[] = [];
  return {
    calls,
    review(call) {
      calls.push(call);
      if (input.mode === "unavailable") {
        return Promise.resolve({
          status: "REVIEW_SERVICE_UNAVAILABLE",
          findings: [],
          evidenceRefs: [],
          recommendations: ["請由已指派 DRS 人員以人工例外流程處理。"],
          proposedText: call.text,
          model: "deterministic-local-fake",
          modelVersion: "w1",
          ragVersion: "none",
          skillVersion: "none",
          serviceErrorCode: "LOCAL_FAKE_UNAVAILABLE",
        });
      }
      if (input.mode === "attention") {
        return Promise.resolve({
          status: "REVIEW_COMPLETED_ATTENTION",
          findings: ["需要 DRS 人員確認內容是否足夠清楚。"],
          evidenceRefs: ["local-fixture"],
          recommendations: ["建議由 DRS 人員編輯後再送出。"],
          proposedText: call.text,
          model: "deterministic-local-fake",
          modelVersion: "w1",
          ragVersion: "none",
          skillVersion: "none",
        });
      }
      return Promise.resolve({
        status: "REVIEW_COMPLETED_NO_FLAG",
        findings: [],
        evidenceRefs: ["local-fixture"],
        recommendations: [],
        proposedText: call.text,
        model: "deterministic-local-fake",
        modelVersion: "w1",
        ragVersion: "none",
        skillVersion: "none",
      });
    },
  };
}

function safeUnavailableAdvisoryResult(): AdvisoryPortResult {
  return {
    status: "REVIEW_SERVICE_UNAVAILABLE",
    findings: [],
    evidenceRefs: [],
    recommendations: [
      "審查服務暫時無法完成，需由已指派 DRS 人員走人工例外送出。",
    ],
    proposedText: "審查服務暫時無法完成，請由已指派 DRS 人員走人工例外處理。",
    model: "unavailable",
    modelVersion: "unavailable",
    ragVersion: "unavailable",
    skillVersion: "unavailable",
    serviceErrorCode: "ADVISORY_PORT_UNAVAILABLE",
  };
}

export async function startDrsOutboundReview(input: {
  store: MemoryDrsLineStore;
  caseId: string;
  linkedGroupId: string;
  submittedText: string;
  now: string;
}): Promise<AiReviewRequestRecord> {
  requireNonBlank(input.caseId, "review_context_required");
  requireNonBlank(input.linkedGroupId, "review_context_required");
  const submittedBody = input.submittedText;
  const submittedSnapshotSha256 = await sha256Hex(submittedBody);
  const request: AiReviewRequestRecord = {
    reviewRequestId: input.store.nextUuid(),
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    submittedSnapshotSha256,
    submittedBody,
    submittedPreview: createPublicSafeText(submittedBody),
    status: "pending",
    createdAt: input.now,
  };
  input.store.aiReviewRequests.push(request);
  return request;
}

export async function completeDrsOutboundReview(input: {
  store: MemoryDrsLineStore;
  reviewRequestId: string;
  advisoryPort: AdvisoryPort;
  now: string;
}): Promise<AiReviewRecord> {
  const request = input.store.aiReviewRequests.find((candidate) =>
    candidate.reviewRequestId === input.reviewRequestId
  );
  if (!request) throw new Error("ai_review_request_not_found");
  if (request.status !== "pending") {
    throw new Error("ai_review_request_already_completed");
  }
  if (request.submittedBody === undefined || request.submittedBody === null) {
    throw new Error("ai_review_request_body_unavailable");
  }
  const submittedBody = request.submittedBody;
  let portResult: Awaited<ReturnType<AdvisoryPort["review"]>>;
  try {
    portResult = await input.advisoryPort.review({
      text: submittedBody,
      now: input.now,
    });
  } catch {
    portResult = safeUnavailableAdvisoryResult();
  }
  if (portResult.status === "REVIEW_SERVICE_UNAVAILABLE") {
    portResult = safeUnavailableAdvisoryResult();
  }
  const review: AiReviewRecord = {
    required: true,
    reviewId: input.store.nextUuid(),
    reviewRequestId: request.reviewRequestId,
    caseId: request.caseId,
    linkedGroupId: request.linkedGroupId,
    submittedSnapshotSha256: request.submittedSnapshotSha256,
    producedBy: "advisory_port",
    status: portResult.status,
    findings: portResult.findings,
    evidenceRefs: portResult.evidenceRefs,
    recommendations: portResult.recommendations,
    proposedText: portResult.proposedText,
    proposedTextSha256: await sha256Hex(portResult.proposedText),
    model: portResult.model,
    modelVersion: portResult.modelVersion,
    ragVersion: portResult.ragVersion,
    skillVersion: portResult.skillVersion,
    createdAt: request.createdAt,
    completedAt: input.now,
    serviceErrorCode: portResult.serviceErrorCode,
    isApprover: false,
    canSendByItself: false,
    hiddenChainOfThoughtStored: false,
  };
  request.status = "completed";
  request.completedReviewId = review.reviewId;
  request.completedAt = input.now;
  request.submittedBody = null;
  request.submittedPreview = createPublicSafeText(
    "審查內容已完成處理，原文已清除。",
  );
  request.submittedBodyClearedAt = input.now;
  input.store.aiReviews.push(review);
  return review;
}

export async function reviewDrsOutboundContent(input: {
  actorType: ActorType;
  text: string;
  advisoryPort: AdvisoryPort;
  now: string;
  uuidFactory?: UuidFactory;
  store?: MemoryDrsLineStore;
  caseId?: string;
  linkedGroupId?: string;
  submittedSnapshotSha256?: string;
}): Promise<AdvisoryReviewOutcome> {
  const proposedTextSha256 = await sha256Hex(input.text);
  if (input.actorType !== "DRS") {
    return {
      required: false,
      reviewId: undefined,
      status: undefined,
      findings: [],
      evidenceRefs: [],
      recommendations: [],
      proposedText: input.text,
      proposedTextSha256,
      model: undefined,
      modelVersion: undefined,
      ragVersion: undefined,
      skillVersion: undefined,
      createdAt: input.now,
      completedAt: input.now,
      isApprover: false,
      canSendByItself: false,
      hiddenChainOfThoughtStored: false,
    };
  }
  if (input.store) {
    if (!input.caseId || !input.linkedGroupId) {
      throw new Error("review_context_required");
    }
    const request = await startDrsOutboundReview({
      store: input.store,
      caseId: input.caseId,
      linkedGroupId: input.linkedGroupId,
      submittedText: input.text,
      now: input.now,
    });
    return await completeDrsOutboundReview({
      store: input.store,
      reviewRequestId: request.reviewRequestId,
      advisoryPort: input.advisoryPort,
      now: input.now,
    });
  }
  let portResult: AdvisoryPortResult;
  try {
    portResult = await input.advisoryPort.review({
      text: input.text,
      now: input.now,
    });
  } catch {
    portResult = safeUnavailableAdvisoryResult();
  }
  if (portResult.status === "REVIEW_SERVICE_UNAVAILABLE") {
    portResult = safeUnavailableAdvisoryResult();
  }
  const submittedSnapshotSha256 = await sha256Hex(input.text);
  return {
    required: true,
    reviewId: nextUuid(input.uuidFactory),
    caseId: input.caseId ?? "",
    linkedGroupId: input.linkedGroupId ?? "",
    submittedSnapshotSha256,
    producedBy: "advisory_port",
    status: portResult.status,
    findings: portResult.findings,
    evidenceRefs: portResult.evidenceRefs,
    recommendations: portResult.recommendations,
    proposedText: portResult.proposedText,
    proposedTextSha256: await sha256Hex(portResult.proposedText),
    model: portResult.model,
    modelVersion: portResult.modelVersion,
    ragVersion: portResult.ragVersion,
    skillVersion: portResult.skillVersion,
    createdAt: input.now,
    completedAt: input.now,
    serviceErrorCode: portResult.serviceErrorCode,
    isApprover: false,
    canSendByItself: false,
    hiddenChainOfThoughtStored: false,
  };
}

export async function computeFinalSnapshotSha256(input: {
  finalText: string;
  attachments: readonly FinalAttachmentRef[];
  deliverableMessages?: readonly FinalDeliverableMessage[];
}): Promise<string> {
  const deliverableMessages: readonly FinalDeliverableMessage[] =
    input.deliverableMessages ?? [{
      type: "text" as const,
      purpose: "final_text" as const,
      text: createPublicSafeText(input.finalText),
    }];
  return await sha256Hex(canonicalJson({
    finalText: input.finalText,
    attachments: input.attachments.map(canonicalAttachmentRef).sort((
      left,
      right,
    ) =>
      `${left.attachmentId}:${left.sha256}`.localeCompare(
        `${right.attachmentId}:${right.sha256}`,
      )
    ),
    deliverableMessages: deliverableMessages.map(canonicalDeliverableMessage),
  }));
}

async function buildFinalDeliverableMessages(input: {
  finalText: PublicSafeText;
  attachments: readonly FinalAttachmentRef[];
  attachmentTransportResolver?: AttachmentTransportResolver;
}): Promise<readonly FinalDeliverableMessage[]> {
  const messages: FinalDeliverableMessage[] = [{
    type: "text",
    purpose: "final_text",
    text: input.finalText,
  }];
  if (input.attachments.length > 0) {
    if (!input.attachmentTransportResolver) {
      throw new Error("attachment_transport_unavailable");
    }
    messages.push(
      ...normalizeResolvedAttachmentMessages({
        attachments: input.attachments,
        messages: await input.attachmentTransportResolver.resolve({
          attachments: input.attachments.map((attachment) => ({
            ...attachment,
          })),
        }),
      }),
    );
  }
  return messages;
}

function normalizeResolvedAttachmentMessages(input: {
  attachments: readonly FinalAttachmentRef[];
  messages: readonly FinalDeliverableMessage[];
}): readonly FinalDeliverableMessage[] {
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    throw new Error("attachment_transport_unavailable");
  }
  const matched = new Set<string>();
  const normalized = input.messages.map((message) => {
    if (!isRecord(message) || message.purpose !== "attachment_payload") {
      throw new Error("attachment_transport_unavailable");
    }
    const attachmentRef = message.attachmentRef;
    if (!hasExactFinalAttachmentRefShape(attachmentRef)) {
      throw new Error("attachment_transport_unavailable");
    }
    const attachment = input.attachments.find((candidate) =>
      finalAttachmentRefEquals(candidate, attachmentRef)
    );
    if (!attachment) throw new Error("attachment_transport_unavailable");
    if (matched.has(attachment.attachmentId)) {
      throw new Error("attachment_transport_unavailable");
    }
    matched.add(attachment.attachmentId);
    if (
      attachment.mimeType === "image/jpeg" ||
      attachment.mimeType === "image/png"
    ) {
      if (
        !hasExactKeys(message, [
          "attachmentRef",
          "originalContentUrl",
          "previewImageUrl",
          "purpose",
          "type",
        ]) ||
        message.type !== "image" ||
        typeof message.originalContentUrl !== "string" ||
        typeof message.previewImageUrl !== "string" ||
        !isSafeHttpsLineUrl(message.originalContentUrl) ||
        !isSafeHttpsLineUrl(message.previewImageUrl)
      ) {
        throw new Error("attachment_transport_unavailable");
      }
      return {
        type: "image" as const,
        purpose: "attachment_payload" as const,
        originalContentUrl: message.originalContentUrl,
        previewImageUrl: message.previewImageUrl,
        attachmentRef: { ...attachment },
      };
    }
    const publicPdfText = typeof message.text === "string"
      ? createPublicSafeText(message.text)
      : undefined;
    if (
      !hasExactKeys(message, [
        "accessUrl",
        "accessUrlKind",
        "attachmentRef",
        "purpose",
        "text",
        "type",
      ]) ||
      attachment.mimeType !== "application/pdf" ||
      message.type !== "text" ||
      typeof message.text !== "string" ||
      typeof message.accessUrl !== "string" ||
      message.accessUrlKind !== "drs_opaque_attachment_access" ||
      publicPdfText === undefined ||
      message.text !== publicPdfText ||
      !isSafeOpaquePdfAccessUrl(attachment, message.accessUrl) ||
      message.text !== createPublicSafeText(
          `PDF 附件安全連結：${message.accessUrl}`,
        )
    ) {
      throw new Error("attachment_transport_unavailable");
    }
    return {
      type: "text" as const,
      purpose: "attachment_payload" as const,
      text: publicPdfText,
      accessUrl: message.accessUrl,
      accessUrlKind: "drs_opaque_attachment_access" as const,
      attachmentRef: { ...attachment },
    };
  });
  if (
    normalized.length !== input.attachments.length ||
    matched.size !== input.attachments.length
  ) {
    throw new Error("attachment_transport_unavailable");
  }
  return normalized;
}

function isSafeHttpsLineUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && value.length <= 2000;
  } catch {
    return false;
  }
}

function isSafeOpaquePdfAccessUrl(
  attachment: FinalAttachmentRef,
  value: string,
): boolean {
  if (typeof value !== "string" || value.length > 2000) return false;
  const expected =
    `https://drs.local.invalid/access/${attachment.attachmentId}`;
  if (value !== expected) return false;
  const encodedStorageRef = encodeURIComponent(attachment.storageRef);
  const lowerValue = value.toLowerCase();
  if (
    value.includes(attachment.storageRef) ||
    lowerValue.includes(encodedStorageRef.toLowerCase()) ||
    lowerValue.includes(
      attachment.storageRef.toLowerCase().replaceAll("/", "%2f"),
    )
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "drs.local.invalid" &&
      url.host === "drs.local.invalid" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      url.pathname === `/access/${attachment.attachmentId}` &&
      url.search === "" &&
      url.hash === "";
  } catch {
    return false;
  }
}

function assertDeliverableMessagesMatchFinal(
  finalMessage: FinalMessageRecord,
): void {
  if (
    finalMessage.deliverableMessages.length !==
      1 + finalMessage.attachments.length
  ) {
    throw new Error("final_message_deliverable_mismatch");
  }
  const [firstMessage, ...attachmentMessages] =
    finalMessage.deliverableMessages;
  if (
    !firstMessage ||
    !hasExactKeys(firstMessage, ["purpose", "text", "type"]) ||
    firstMessage.type !== "text" ||
    firstMessage.purpose !== "final_text" ||
    firstMessage.text !== finalMessage.finalText
  ) {
    throw new Error("final_message_deliverable_mismatch");
  }
  if (finalMessage.attachments.length > 0) {
    normalizeResolvedAttachmentMessages({
      attachments: finalMessage.attachments,
      messages: attachmentMessages,
    });
    for (const attachment of finalMessage.attachments) {
      if (
        !attachmentMessages.some((message) =>
          message.purpose === "attachment_payload" &&
          message.attachmentRef !== undefined &&
          finalAttachmentRefEquals(attachment, message.attachmentRef)
        )
      ) {
        throw new Error("final_message_attachment_payload_missing");
      }
    }
  }
}

function finalAttachmentRefEquals(
  left: FinalAttachmentRef,
  right: FinalAttachmentRef,
): boolean {
  return left.attachmentId === right.attachmentId &&
    left.sha256 === right.sha256 &&
    left.mimeType === right.mimeType &&
    left.byteSize === right.byteSize &&
    left.storageRef === right.storageRef;
}

function hasExactFinalAttachmentRefShape(
  value: unknown,
): value is FinalAttachmentRef {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  if (
    keys.join(",") !== "attachmentId,byteSize,mimeType,sha256,storageRef"
  ) {
    return false;
  }
  return typeof value.attachmentId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
      .test(value.attachmentId) &&
    typeof value.byteSize === "number" &&
    Number.isSafeInteger(value.byteSize) &&
    value.byteSize > 0 &&
    typeof value.mimeType === "string" &&
    ["application/pdf", "image/jpeg", "image/png"].includes(value.mimeType) &&
    typeof value.sha256 === "string" &&
    /^[0-9a-f]{64}$/iu.test(value.sha256) &&
    typeof value.storageRef === "string" &&
    value.storageRef.length > 0;
}

function hasExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
): boolean {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.join(",") === [...expectedKeys].sort().join(",");
}

function canonicalAttachmentRef(attachment: FinalAttachmentRef): {
  attachmentId: string;
  byteSize: number;
  mimeType: string;
  sha256: string;
  storageRef: string;
} {
  return {
    attachmentId: attachment.attachmentId,
    byteSize: attachment.byteSize,
    mimeType: attachment.mimeType,
    sha256: attachment.sha256,
    storageRef: attachment.storageRef,
  };
}

function canonicalDeliverableMessage(
  message: FinalDeliverableMessage,
): UnknownRecord {
  const canonical: UnknownRecord = {
    type: message.type,
    purpose: message.purpose,
  };
  if (message.type === "text") {
    canonical.text = message.text;
    if (message.accessUrl !== undefined) {
      canonical.accessUrl = message.accessUrl;
    }
    if (message.accessUrlKind !== undefined) {
      canonical.accessUrlKind = message.accessUrlKind;
    }
  } else {
    canonical.originalContentUrl = message.originalContentUrl;
    canonical.previewImageUrl = message.previewImageUrl;
  }
  if (message.attachmentRef) {
    canonical.attachmentRef = canonicalAttachmentRef(message.attachmentRef);
  }
  return canonical;
}

async function requireCompleteAiReview(
  aiReview: AiReviewRecord,
): Promise<AiReviewRecord> {
  if (aiReview.required !== true) throw new Error("ai_review_required");
  if (!isUuid(aiReview.reviewId)) throw new Error("ai_review_incomplete");
  if (
    !aiReview.caseId ||
    !aiReview.linkedGroupId ||
    !/^[0-9a-f]{64}$/iu.test(aiReview.submittedSnapshotSha256) ||
    aiReview.producedBy !== "advisory_port"
  ) {
    throw new Error("ai_review_incomplete");
  }
  if (!isAiReviewStatus(aiReview.status)) {
    throw new Error("ai_review_incomplete");
  }
  if (
    !aiReview.model?.trim() ||
    !aiReview.modelVersion?.trim() ||
    !aiReview.ragVersion?.trim() ||
    !aiReview.skillVersion?.trim()
  ) {
    throw new Error("ai_review_incomplete");
  }
  if (
    !Number.isFinite(Date.parse(aiReview.createdAt)) ||
    !Number.isFinite(Date.parse(aiReview.completedAt))
  ) {
    throw new Error("ai_review_incomplete");
  }
  if (
    aiReview.isApprover !== false ||
    aiReview.canSendByItself !== false ||
    aiReview.hiddenChainOfThoughtStored !== false
  ) {
    throw new Error("ai_review_incomplete");
  }
  if (aiReview.proposedTextSha256 !== await sha256Hex(aiReview.proposedText)) {
    throw new Error("ai_review_incomplete");
  }
  return aiReview;
}

async function loadPersistedAiReview(input: {
  store: MemoryDrsLineStore;
  aiReview: AdvisoryReviewOutcome;
  caseId: string;
  linkedGroupId: string;
}): Promise<AiReviewRecord> {
  if (input.aiReview.required !== true || !input.aiReview.reviewId) {
    throw new Error("ai_review_required");
  }
  const persisted = input.store.aiReviews.find((review) =>
    review.reviewId === input.aiReview.reviewId
  );
  if (!persisted) throw new Error("ai_review_not_persisted");
  const review = await requireCompleteAiReview(persisted);
  if (
    review.caseId !== input.caseId ||
    review.linkedGroupId !== input.linkedGroupId
  ) {
    throw new Error("ai_review_context_mismatch");
  }
  return review;
}

function assertReviewAllowsDecision(
  review: AiReviewRecord,
  decision: HumanDecision,
): void {
  if (
    review.status === "REVIEW_SERVICE_UNAVAILABLE" &&
    decision.type !== "MANUAL_EXCEPTION_SEND" &&
    decision.type !== "CANCEL"
  ) {
    throw new Error("manual_exception_required");
  }
  if (
    review.status !== "REVIEW_SERVICE_UNAVAILABLE" &&
    decision.type === "MANUAL_EXCEPTION_SEND"
  ) {
    throw new Error("manual_exception_not_allowed");
  }
  if (
    review.status === "REVIEW_COMPLETED_NO_FLAG" &&
    decision.type === "OVERRIDE_AND_SEND"
  ) {
    throw new Error("human_decision_not_allowed_for_review");
  }
}

export async function finalizeDrsGroupSend(input: {
  store: MemoryDrsLineStore;
  caseId: string;
  linkedGroupId: string;
  lineGroupId: string;
  assignmentId: string;
  specialistAuthSubject: string;
  decision: HumanDecision;
  aiReview: AdvisoryReviewOutcome;
  finalizationKey: string;
  expectedFinalSnapshotHash: string;
  finalAttachments?: readonly FinalAttachmentRef[];
  attachmentTransportResolver?: AttachmentTransportResolver;
  now: string;
}): Promise<{ status: "queued" | "cancelled"; finalMessageId?: string }> {
  const group = input.store.findSendableLinkedGroup({
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    lineGroupId: input.lineGroupId,
    now: input.now,
  });
  if (!group) throw new Error("linked_group_not_sendable");

  const assignment = input.store.findAssignment(input.assignmentId);
  if (
    !assignment || !isAssignmentCurrent(assignment, input.caseId, input.now)
  ) {
    throw new Error("assignment_not_active");
  }
  if (assignment.verifiedAuthSubject !== input.specialistAuthSubject) {
    throw new Error("specialist_identity_mismatch");
  }

  requireNonBlank(input.finalizationKey, "finalization_key_required");
  const aiReview = await loadPersistedAiReview({
    store: input.store,
    aiReview: input.aiReview,
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
  });
  assertReviewAllowsDecision(aiReview, input.decision);

  if (aiReview.status === "REVIEW_COMPLETED_ATTENTION") {
    if (input.decision.type === "OVERRIDE_AND_SEND") {
      requireNonBlank(input.decision.reason, "reason_required");
    }
    if (input.decision.type === "EDIT_AND_SEND") {
      requireNonBlank(input.decision.reason, "reason_required");
    }
  }
  if (input.decision.type === "MANUAL_EXCEPTION_SEND") {
    requireNonBlank(input.decision.reason, "reason_required");
    requireNonBlank(
      input.decision.serviceIncidentId,
      "service_incident_required",
    );
  }
  if (input.decision.type === "OVERRIDE_AND_SEND") {
    requireNonBlank(input.decision.reason, "reason_required");
  }
  if (input.decision.type === "EDIT_AND_SEND") {
    requireNonBlank(input.decision.reason, "reason_required");
  }

  const attachments = resolveFinalAttachmentRefs(input.store, {
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    refs: input.finalAttachments ?? [],
  });
  const finalText = extractFinalText(input.decision);
  const finalTextSafe = createPublicSafeText(finalText);
  const finalTextSha256 = input.decision.type === "CANCEL"
    ? undefined
    : await sha256Hex(finalTextSafe);
  const deliverableMessages = input.decision.type === "CANCEL"
    ? []
    : await buildFinalDeliverableMessages({
      finalText: finalTextSafe,
      attachments,
      attachmentTransportResolver: input.attachmentTransportResolver,
    });
  const actualFinalSnapshotSha256 = input.decision.type === "CANCEL"
    ? undefined
    : await computeFinalSnapshotSha256({
      finalText: finalTextSafe,
      attachments,
      deliverableMessages,
    });
  if (input.decision.type !== "CANCEL") {
    if (input.decision.finalSnapshotSha256 !== actualFinalSnapshotSha256) {
      throw new Error("final_snapshot_mismatch");
    }
    if (input.expectedFinalSnapshotHash !== actualFinalSnapshotSha256) {
      throw new Error("snapshot_hash_mismatch");
    }
  }

  const decisionPayloadBase = buildHumanDecisionRecord({
    decisionId: "",
    finalizationKey: input.finalizationKey,
    input,
    assignment,
    aiReview,
    finalTextSha256,
    finalSnapshotSha256: actualFinalSnapshotSha256,
    attachments,
    decidedAt: "",
    decisionPayloadSha256: "",
  });
  const requestedDecisionPayloadSha256 =
    await computeHumanDecisionPayloadSha256(decisionPayloadBase);
  const existingDecision = input.store.humanDecisions.find((decision) =>
    decision.finalizationKey === input.finalizationKey
  );
  if (existingDecision) {
    if (
      existingDecision.decisionPayloadSha256 !== requestedDecisionPayloadSha256
    ) {
      throw new Error("finalization_replay_conflict");
    }
    if (existingDecision.decisionType === "CANCEL") {
      return { status: "cancelled" };
    }
    const existingFinal = input.store.finalMessages.find((message) =>
      message.finalizationKey === input.finalizationKey
    );
    if (!existingFinal) throw new Error("finalization_missing_final_message");
    return { status: "queued", finalMessageId: existingFinal.finalMessageId };
  }
  if (aiReview.consumedByDecisionId) {
    throw new Error("ai_review_already_consumed");
  }

  const decisionId = input.store.nextUuid();
  const decisionRecord = buildHumanDecisionRecord({
    decisionId,
    finalizationKey: input.finalizationKey,
    input,
    assignment,
    aiReview,
    finalTextSha256,
    finalSnapshotSha256: actualFinalSnapshotSha256,
    attachments,
    decidedAt: input.now,
    decisionPayloadSha256: requestedDecisionPayloadSha256,
  });
  input.store.humanDecisions.push(decisionRecord);
  input.store.auditEvents.push({
    auditEventId: input.store.nextUuid(),
    eventType: "HUMAN_DECISION",
    schemaVersion: "laibe.drs.audit.v1",
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    correlationId: decisionRecord.decisionId,
    occurredAt: input.now,
    recordedAt: input.now,
    actorType: "DRS",
    actorId: assignment.verifiedAuthSubject,
    specialistId: assignment.specialistId,
    specialistEmailSnapshot: assignment.specialistEmailSnapshot,
    visibilityScope: "DRS_INTERNAL",
    policyVersion: "drs-line-w1",
    payloadSha256: requestedDecisionPayloadSha256,
  });
  aiReview.consumedByDecisionId = decisionId;
  aiReview.consumedAt = input.now;
  await recordAiReview(input.store, input, aiReview);

  if (input.decision.type === "CANCEL") {
    return { status: "cancelled" };
  }

  const finalMessageId = input.store.nextUuid();
  const finalMessage: FinalMessageRecord = {
    finalMessageId,
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    lineGroupId: input.lineGroupId,
    assignmentId: input.assignmentId,
    specialistId: assignment.specialistId,
    finalText: finalTextSafe,
    finalTextSha256: finalTextSha256 ?? "",
    finalSnapshotSha256: actualFinalSnapshotSha256 ?? "",
    attachments,
    deliverableMessages,
    aiReviewId: aiReview.reviewId,
    preSendReviewState: aiReview.status,
    finalizationKey: input.finalizationKey,
    queuedAt: input.now,
  };
  input.store.finalMessages.push(finalMessage);
  input.store.outbox.push({
    outboxId: input.store.nextUuid(),
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    target: { type: "group", groupId: group.lineGroupId },
    retryKey: input.store.nextUuid(),
    finalMessageId,
    status: "queued",
  });
  input.store.auditEvents.push({
    auditEventId: input.store.nextUuid(),
    eventType: "FINAL_MESSAGE",
    schemaVersion: "laibe.drs.audit.v1",
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    correlationId: finalMessageId,
    occurredAt: input.now,
    recordedAt: input.now,
    actorType: "DRS",
    actorId: assignment.verifiedAuthSubject,
    specialistId: assignment.specialistId,
    specialistEmailSnapshot: assignment.specialistEmailSnapshot,
    visibilityScope: "LINE_GROUP",
    policyVersion: "drs-line-w1",
    payloadSha256: finalMessage.finalSnapshotSha256,
  });
  return { status: "queued", finalMessageId };
}

async function recordAiReview(
  store: MemoryDrsLineStore,
  input: Parameters<typeof finalizeDrsGroupSend>[0],
  aiReview: AiReviewRecord,
): Promise<void> {
  if (
    !store.aiReviews.some((review) => review.reviewId === aiReview.reviewId)
  ) {
    store.aiReviews.push(aiReview);
  }
  if (
    !store.auditEvents.some((event) =>
      event.correlationId === aiReview.reviewId
    )
  ) {
    store.auditEvents.push({
      auditEventId: store.nextUuid(),
      eventType: "AI_REVIEW",
      schemaVersion: "laibe.drs.audit.v1",
      caseId: input.caseId,
      linkedGroupId: input.linkedGroupId,
      correlationId: aiReview.reviewId,
      occurredAt: aiReview.completedAt,
      recordedAt: input.now,
      actorType: "SYSTEM",
      actorId: "drs-advisory-review-port",
      visibilityScope: "DRS_INTERNAL",
      policyVersion: "drs-line-w1",
      payloadSha256: await sha256Hex(canonicalJson(aiReview)),
    });
  }
}

export async function handleDirectEmergencyLineSend(input: {
  store: MemoryDrsLineStore;
  assignmentId: string;
  specialistAuthSubject: string;
  privateControlLineUserId: string;
  caseId: string;
  linkedGroupId: string;
  lineGroupId: string;
  lineMessageId: string;
  reason: string;
  urgency: "normal" | "high" | "critical";
  serviceIncidentId: string;
  finalText?: string;
  finalAttachments?: readonly FinalAttachmentRef[];
  attachmentTransportResolver?: AttachmentTransportResolver;
  occurredAt: string;
}): Promise<FinalMessageRecord> {
  const group = input.store.findSendableLinkedGroup({
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    lineGroupId: input.lineGroupId,
    now: input.occurredAt,
  });
  if (!group) throw new Error("linked_group_not_sendable");
  const assignment = input.store.findAssignment(input.assignmentId);
  if (
    !assignment ||
    !isAssignmentCurrent(assignment, input.caseId, input.occurredAt)
  ) {
    throw new Error("assignment_not_active");
  }
  if (assignment.verifiedAuthSubject !== input.specialistAuthSubject) {
    throw new Error("specialist_identity_mismatch");
  }
  if (assignment.privateControlLineUserId !== input.privateControlLineUserId) {
    throw new Error("private_control_binding_mismatch");
  }
  const activePrivateBinding = input.store.accountBindings.find((binding) =>
    binding.status === "active" &&
    binding.subjectType === "SPECIALIST" &&
    binding.subjectId === assignment.specialistId &&
    binding.lineUserId === input.privateControlLineUserId
  );
  if (!activePrivateBinding) throw new Error("private_control_binding_missing");
  requireNonBlank(input.reason, "reason_required");
  requireNonBlank(input.serviceIncidentId, "service_incident_required");
  const attachments = resolveFinalAttachmentRefs(input.store, {
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    refs: input.finalAttachments ?? [],
  });
  const finalText = createPublicSafeText(
    input.finalText ??
      "已收到 DRS 人員的緊急通知，後續會補上正式整理紀錄。",
  );
  const deliverableMessages = await buildFinalDeliverableMessages({
    finalText,
    attachments,
    attachmentTransportResolver: input.attachmentTransportResolver,
  });
  const finalSnapshotSha256 = await computeFinalSnapshotSha256({
    finalText,
    attachments,
    deliverableMessages,
  });
  const fingerprintSha256 = await sha256Hex(canonicalJson({
    provider: "line",
    lineGroupId: input.lineGroupId,
    lineMessageId: input.lineMessageId,
    finalText,
    attachments,
    reason: input.reason,
    urgency: input.urgency,
    serviceIncidentId: input.serviceIncidentId,
  }));
  const providerReceiptKey = [
    "line",
    "break_glass",
    input.caseId,
    input.linkedGroupId,
    input.lineGroupId,
    input.lineMessageId,
  ].join(":");
  const existingReceipt = input.store.findReceipt(providerReceiptKey);
  if (existingReceipt) {
    if (existingReceipt.fingerprintSha256 !== fingerprintSha256) {
      throw new Error("break_glass_receipt_collision");
    }
    const existingFinal = input.store.finalMessages.find((message) =>
      message.finalizationKey === providerReceiptKey
    );
    if (!existingFinal) throw new Error("break_glass_missing_final_message");
    return existingFinal;
  }
  const receipt: ReceiptRecord = {
    receiptId: input.store.nextUuid(),
    provider: "line",
    providerChannelId: "break_glass",
    providerReceiptKey,
    webhookEventId: providerReceiptKey,
    lineMessageId: input.lineMessageId,
    lineGroupId: input.lineGroupId,
    lineSenderUserId: input.privateControlLineUserId,
    linkedGroupId: input.linkedGroupId,
    caseId: input.caseId,
    groupType: group.groupType,
    messageType: "text",
    actorType: "DRS",
    occurredAt: input.occurredAt,
    receivedAt: input.occurredAt,
    fingerprintSha256,
    processingState: "accepted",
  };
  input.store.receipts.push(receipt);
  const finalMessage: FinalMessageRecord = {
    finalMessageId: input.store.nextUuid(),
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    lineGroupId: input.lineGroupId,
    assignmentId: input.assignmentId,
    specialistId: assignment.specialistId,
    finalText,
    finalTextSha256: await sha256Hex(finalText),
    finalSnapshotSha256,
    attachments,
    deliverableMessages,
    preSendReviewState: "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS",
    finalizationKey: providerReceiptKey,
    queuedAt: input.occurredAt,
  };
  const decisionRecord = buildDirectHumanDecisionRecord({
    decisionId: input.store.nextUuid(),
    finalizationKey: providerReceiptKey,
    input,
    assignment,
    finalTextSha256: finalMessage.finalTextSha256,
    finalSnapshotSha256,
    attachments,
    decidedAt: input.occurredAt,
  });
  decisionRecord.decisionPayloadSha256 =
    await computeHumanDecisionPayloadSha256(decisionRecord);
  input.store.humanDecisions.push(decisionRecord);
  input.store.finalMessages.push(finalMessage);
  input.store.auditEvents.push(
    await buildAuditEvent(input.store, {
      eventType: "LINE_SENT_EVENT",
      caseId: input.caseId,
      linkedGroupId: input.linkedGroupId,
      correlationId: receipt.receiptId,
      occurredAt: input.occurredAt,
      recordedAt: input.occurredAt,
      actorType: "DRS",
      actorId: assignment.verifiedAuthSubject,
      visibilityScope: "DRS_INTERNAL",
      payload: {
        receipt,
        finalSnapshotSha256,
        providerLineMessageId: input.lineMessageId,
      },
    }),
  );
  input.store.auditEvents.push({
    auditEventId: input.store.nextUuid(),
    eventType: "HUMAN_DECISION",
    schemaVersion: "laibe.drs.audit.v1",
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    correlationId: decisionRecord.decisionId,
    occurredAt: input.occurredAt,
    recordedAt: input.occurredAt,
    actorType: "DRS",
    actorId: assignment.verifiedAuthSubject,
    specialistId: assignment.specialistId,
    specialistEmailSnapshot: assignment.specialistEmailSnapshot,
    visibilityScope: "DRS_INTERNAL",
    policyVersion: "drs-line-w1",
    payloadSha256: decisionRecord.decisionPayloadSha256,
  });
  input.store.auditEvents.push({
    auditEventId: input.store.nextUuid(),
    eventType: "FINAL_MESSAGE",
    schemaVersion: "laibe.drs.audit.v1",
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    correlationId: finalMessage.finalMessageId,
    occurredAt: input.occurredAt,
    recordedAt: input.occurredAt,
    actorType: "DRS",
    actorId: assignment.verifiedAuthSubject,
    specialistId: assignment.specialistId,
    specialistEmailSnapshot: assignment.specialistEmailSnapshot,
    visibilityScope: "LINE_GROUP",
    policyVersion: "drs-line-w1",
    payloadSha256: finalSnapshotSha256,
  });
  return finalMessage;
}

function buildDirectHumanDecisionRecord(input: {
  decisionId: string;
  finalizationKey: string;
  input: Parameters<typeof handleDirectEmergencyLineSend>[0];
  assignment: SpecialistAssignment;
  finalTextSha256: string;
  finalSnapshotSha256: string;
  attachments: readonly FinalAttachmentRef[];
  decidedAt: string;
}): HumanDecisionRecord {
  return {
    decisionId: input.decisionId,
    finalizationKey: input.finalizationKey,
    assignmentId: input.input.assignmentId,
    caseId: input.input.caseId,
    linkedGroupId: input.input.linkedGroupId,
    specialistId: input.assignment.specialistId,
    specialistEmailSnapshot: input.assignment.specialistEmailSnapshot,
    decisionType: "MANUAL_EXCEPTION_SEND",
    reason: input.input.reason,
    finalTextSha256: input.finalTextSha256,
    finalSnapshotSha256: input.finalSnapshotSha256,
    finalAttachmentRefs: input.attachments,
    urgency: input.input.urgency,
    serviceIncidentId: input.input.serviceIncidentId,
    decidedAt: input.decidedAt,
    decisionPayloadSha256: "",
  };
}

export function createPublicSafeText(value: string): PublicSafeText {
  const normalized = normalizeVisibleText(value);
  if (!normalized || containsForbiddenPublicCopy(normalized)) {
    return "此項目已收到，會由 DRS 人員整理後再通知。" as PublicSafeText;
  }
  return normalized.slice(0, 300) as PublicSafeText;
}

export function buildCaseStateFlex(input: {
  title: PublicSafeText;
  stateText: PublicSafeText;
}): JsonValue {
  return flexBubble("case_state", input.title, input.stateText);
}

export function buildNextActionFlex(input: {
  title: PublicSafeText;
  nextAction: PublicSafeText;
}): JsonValue {
  return flexBubble("next_action", input.title, input.nextAction);
}

export function buildMissingDocumentsFlex(input: {
  title: PublicSafeText;
  missingItems: readonly PublicSafeText[];
}): JsonValue {
  return {
    type: "flex",
    altText: input.title,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: input.title, weight: "bold" },
          ...input.missingItems.map((item) => ({ type: "text", text: item })),
        ],
      },
    },
  };
}

export function buildReviewResultFlex(input: {
  title: PublicSafeText;
  result: PublicSafeText;
}): JsonValue {
  return flexBubble("review_result", input.title, input.result);
}

export function buildSpecialistDecisionFlex(input: {
  title: PublicSafeText;
  opaqueAction: string;
}): JsonValue {
  return {
    type: "flex",
    altText: input.title,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: input.title, weight: "bold" }],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "postback",
              label: "確認送出",
              data: input.opaqueAction,
            },
          },
        ],
      },
    },
  };
}

export function buildQuickReplyActions(
  actions: readonly { label: PublicSafeText; opaqueAction: string }[],
): JsonValue {
  return {
    quickReply: {
      items: actions.slice(0, 13).map((action) => ({
        type: "action",
        action: {
          type: "postback",
          label: action.label,
          data: action.opaqueAction,
        },
      })),
    },
  };
}

export function buildDrsRichMenuPayload(input: {
  barText: PublicSafeText;
  actions: readonly { label: PublicSafeText; opaqueAction: string }[];
}): JsonValue {
  return {
    size: { width: 2500, height: 843 },
    selected: true,
    name: "drs-line-w1",
    chatBarText: input.barText,
    areas: input.actions.map((action, index) => ({
      bounds: { x: index * 625, y: 0, width: 625, height: 843 },
      action: {
        type: "postback",
        label: action.label,
        data: action.opaqueAction,
      },
    })),
  };
}

export function buildSpecialistPrivateControlDelivery(input: {
  assignment: SpecialistAssignment;
  message: JsonValue;
  retryKey: string;
}): {
  target: { type: "user"; userId: string };
  messages: readonly JsonValue[];
  retryKey: string;
} {
  return {
    target: { type: "user", userId: input.assignment.privateControlLineUserId },
    messages: [input.message],
    retryKey: input.retryKey,
  };
}

export function createLineAccountContinuation(input: {
  store: MemoryDrsLineStore;
  subjectType: AccountSubjectType;
  subjectId: string;
  actionContextId: string;
  expiresAt: string;
  origin: string;
}): { loginUrl: string; token: string } {
  const token = createOpaqueToken(input.store, {
    tokenType: "account_link_continuation",
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    actionContextId: input.actionContextId,
    expiresAt: input.expiresAt,
  });
  return {
    loginUrl: `${
      input.origin.replace(/\/+$/u, "")
    }/drs/line/account-link/continue?t=${token}`,
    token,
  };
}

export function consumeLineAccountContinuation(input: {
  store: MemoryDrsLineStore;
  token: string;
  now: string;
}): {
  subjectType: AccountSubjectType;
  subjectId: string;
  actionContextId: string;
  expiresAt: string;
} {
  const record = consumeOpaqueToken(
    input.store,
    input.token,
    "account_link_continuation",
    input.now,
  );
  if (
    !isAccountSubjectType(record.subjectType) ||
    !record.subjectId
  ) throw new Error("opaque_token_malformed");
  return {
    subjectType: record.subjectType,
    subjectId: record.subjectId,
    actionContextId: record.actionContextId,
    expiresAt: record.expiresAt,
  };
}

export function linkLineAccount(input: {
  store: MemoryDrsLineStore;
  subjectType: AccountSubjectType;
  subjectId: string;
  lineUserId: string;
  linkedAt: string;
}): LineAccountBinding {
  const existing = input.store.accountBindings.find((binding) =>
    binding.status === "active" &&
    binding.subjectType === input.subjectType &&
    binding.subjectId === input.subjectId &&
    binding.lineUserId === input.lineUserId
  );
  if (existing) return existing;
  const conflicting = input.store.accountBindings.find((binding) =>
    binding.status === "active" &&
    binding.lineUserId === input.lineUserId &&
    (binding.subjectType !== input.subjectType ||
      binding.subjectId !== input.subjectId)
  );
  if (conflicting) throw new Error("line_identity_already_bound");
  const binding: LineAccountBinding = {
    bindingId: input.store.nextUuid(),
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    lineUserId: input.lineUserId,
    status: "active",
    linkedAt: input.linkedAt,
  };
  input.store.accountBindings.push(binding);
  return binding;
}

export function buildComplexActionDeepLink(input: {
  store: MemoryDrsLineStore;
  origin: string;
  opaqueActionContext: string;
  expiresAt: string;
}): { href: string; token: string } {
  const token = createOpaqueToken(input.store, {
    tokenType: "complex_action_deep_link",
    actionContextId: input.opaqueActionContext,
    expiresAt: input.expiresAt,
  });
  return {
    href: `${input.origin.replace(/\/+$/u, "")}/drs/line/continue?t=${token}`,
    token,
  };
}

export function createSpecialistPostbackHandle(input: {
  store: MemoryDrsLineStore;
  specialistId: string;
  authSubject: string;
  caseId: string;
  linkedGroupId: string;
  reviewId: string;
  action: SpecialistPostbackAction;
  expiresAt: string;
}): { token: string } {
  const token = createOpaqueToken(input.store, {
    tokenType: "specialist_postback",
    specialistId: input.specialistId,
    authSubject: input.authSubject,
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    reviewId: input.reviewId,
    action: input.action,
    actionContextId: "specialist_postback",
    expiresAt: input.expiresAt,
  });
  return { token };
}

export function consumeSpecialistPostbackHandle(input: {
  store: MemoryDrsLineStore;
  token: string;
  specialistId: string;
  authSubject: string;
  caseId: string;
  linkedGroupId: string;
  now: string;
}): {
  reviewId: string;
  action: SpecialistPostbackAction;
  expiresAt: string;
} {
  const nowMs = parseFiniteInstant(input.now, "opaque_token_invalid_now");
  const record = input.store.opaqueTokens.find((candidate) =>
    candidate.token === input.token &&
    candidate.tokenType === "specialist_postback"
  );
  if (!record) throw new Error("opaque_token_unknown");
  if (record.consumedAt) throw new Error("opaque_token_consumed");
  const expiresAtMs = parseFiniteInstant(
    record.expiresAt,
    "opaque_token_invalid_expiry",
  );
  if (nowMs >= expiresAtMs) {
    throw new Error("opaque_token_expired");
  }
  if (
    record.specialistId !== input.specialistId ||
    record.authSubject !== input.authSubject ||
    record.caseId !== input.caseId ||
    record.linkedGroupId !== input.linkedGroupId
  ) {
    throw new Error("opaque_token_context_mismatch");
  }
  if (!record.reviewId || !record.action) {
    throw new Error("opaque_token_malformed");
  }
  record.consumedAt = input.now;
  return {
    reviewId: record.reviewId,
    action: record.action,
    expiresAt: record.expiresAt,
  };
}

export function consumeComplexActionDeepLink(input: {
  store: MemoryDrsLineStore;
  token: string;
  now: string;
}): { actionContextId: string; expiresAt: string } {
  const record = consumeOpaqueToken(
    input.store,
    input.token,
    "complex_action_deep_link",
    input.now,
  );
  return {
    actionContextId: record.actionContextId,
    expiresAt: record.expiresAt,
  };
}

export async function buildLinePushRequest(input: {
  endpointBaseUrl: string;
  store: MemoryDrsLineStore;
  outboxId: string;
}): Promise<{
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
}> {
  const outbox = input.store.outbox.find((candidate) =>
    candidate.outboxId === input.outboxId
  );
  if (!outbox) throw new Error("outbox_not_found");
  const finalMessage = input.store.finalMessages.find((candidate) =>
    candidate.finalMessageId === outbox.finalMessageId
  );
  if (!finalMessage) throw new Error("final_message_not_found");
  if (
    outbox.caseId !== finalMessage.caseId ||
    outbox.linkedGroupId !== finalMessage.linkedGroupId ||
    outbox.target.type !== "group" ||
    outbox.target.groupId !== finalMessage.lineGroupId
  ) {
    throw new Error("outbox_target_mismatch");
  }
  const actualSnapshotSha256 = await computeFinalSnapshotSha256({
    finalText: finalMessage.finalText,
    attachments: finalMessage.attachments,
    deliverableMessages: finalMessage.deliverableMessages,
  });
  if (actualSnapshotSha256 !== finalMessage.finalSnapshotSha256) {
    throw new Error("final_message_snapshot_mismatch");
  }
  assertDeliverableMessagesMatchFinal(finalMessage);
  return {
    url: `${input.endpointBaseUrl.replace(/\/+$/u, "")}/message/push`,
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-line-retry-key": outbox.retryKey,
    },
    body: JSON.stringify({
      to: outbox.target.groupId,
      messages: finalMessage.deliverableMessages.map(lineMessagePayload),
    }),
  };
}

function lineMessagePayload(
  message: FinalDeliverableMessage,
): { type: "text"; text: string } | {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
} {
  if (message.type === "image") {
    return {
      type: "image",
      originalContentUrl: message.originalContentUrl,
      previewImageUrl: message.previewImageUrl,
    };
  }
  return {
    type: "text",
    text: message.text,
  };
}

export async function signLineBody(
  channelSecret: string,
  rawBody: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );
  return base64Encode(new Uint8Array(signature));
}

export async function assertNoProductionSecrets(
  paths: readonly string[],
): Promise<{
  ok: boolean;
  findings: string[];
}> {
  const findings: string[] = [];
  const forbidden = [
    {
      label: "line_api_host",
      pattern: new RegExp(["api", "line", "me"].join("\\."), "iu"),
    },
    {
      label: "line_account_link_host",
      pattern: new RegExp(["access", "line", "me"].join("\\."), "iu"),
    },
    {
      label: "openai_host",
      pattern: new RegExp(["api", "openai", "com"].join("\\."), "iu"),
    },
    {
      label: "openai_secret_like",
      pattern: new RegExp(`s${"k"}-[A-Za-z0-9]{20,}`, "u"),
    },
    {
      label: "line_token_env",
      pattern: new RegExp(
        ["LINE", "CHANNEL", "ACCESS", "TOKEN"].join("_"),
        "u",
      ),
    },
  ];
  for (const path of paths) {
    const source = await Deno.readTextFile(path);
    for (const rule of forbidden) {
      if (rule.pattern.test(source)) {
        findings.push(`${path}:${rule.label}`);
      }
    }
  }
  return { ok: findings.length === 0, findings };
}

async function verifyLineSignature(
  channelSecret: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const expected = await signLineBody(channelSecret, rawBody);
  return timingSafeEqual(expected, signature);
}

function emptyWebhookResult(
  status: ProcessWebhookResult["status"],
): ProcessWebhookResult {
  return {
    status,
    acceptedCount: 0,
    duplicateCount: 0,
    deniedCount: 0,
    unsupportedCount: 0,
    collisionCount: 0,
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLineMessageEvent(value: unknown): value is DrsLineMessageEvent {
  if (!isRecord(value)) return false;
  if (
    value.type !== "message" || typeof value.timestamp !== "number" ||
    typeof value.webhookEventId !== "string"
  ) {
    return false;
  }
  if (!isRecord(value.source) || !isRecord(value.message)) return false;
  if (
    typeof value.message.id !== "string" ||
    typeof value.message.type !== "string"
  ) return false;
  if (value.source.type === "group") {
    return typeof value.source.groupId === "string" &&
      (value.source.userId === undefined ||
        typeof value.source.userId === "string");
  }
  if (value.source.type === "room") {
    return typeof value.source.roomId === "string" &&
      (value.source.userId === undefined ||
        typeof value.source.userId === "string");
  }
  if (value.source.type === "user") {
    return typeof value.source.userId === "string";
  }
  return false;
}

function isSupportedMessageType(
  type: string,
): type is "text" | "file" | "image" {
  return type === "text" || type === "file" || type === "image";
}

function isSafeLineTimestamp(value: number): boolean {
  return Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 8_640_000_000_000_000;
}

function isAccountSubjectType(value: unknown): value is AccountSubjectType {
  return value === "OWNER" || value === "VENDOR" || value === "SPECIALIST";
}

function isAiReviewStatus(value: unknown): value is AiReviewStatus {
  return value === "REVIEW_COMPLETED_NO_FLAG" ||
    value === "REVIEW_COMPLETED_ATTENTION" ||
    value === "REVIEW_SERVICE_UNAVAILABLE";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
    .test(value);
}

function nextUuid(uuidFactory?: UuidFactory): string {
  const uuid = uuidFactory ? uuidFactory() : crypto.randomUUID();
  if (!isUuid(uuid)) throw new Error("uuid_factory_returned_invalid_uuid");
  return uuid;
}

function parseFiniteInstant(value: string, errorCode: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(errorCode);
  return parsed;
}

function createOpaqueToken(
  store: MemoryDrsLineStore,
  input: Omit<OpaqueTokenRecord, "token" | "consumedAt">,
): string {
  parseFiniteInstant(input.expiresAt, "opaque_token_invalid_expiry");
  const token = store.nextUuid();
  if (store.opaqueTokens.some((record) => record.token === token)) {
    throw new Error("opaque_token_collision");
  }
  store.opaqueTokens.push({ token, ...input });
  return token;
}

function consumeOpaqueToken(
  store: MemoryDrsLineStore,
  token: string,
  tokenType: OpaqueTokenRecord["tokenType"],
  now: string,
): OpaqueTokenRecord {
  const nowMs = parseFiniteInstant(now, "opaque_token_invalid_now");
  const record = store.opaqueTokens.find((candidate) =>
    candidate.token === token && candidate.tokenType === tokenType
  );
  if (!record) throw new Error("opaque_token_unknown");
  if (record.consumedAt) throw new Error("opaque_token_consumed");
  const expiresAtMs = parseFiniteInstant(
    record.expiresAt,
    "opaque_token_invalid_expiry",
  );
  if (nowMs >= expiresAtMs) {
    throw new Error("opaque_token_expired");
  }
  record.consumedAt = now;
  return record;
}

function isBotJoinEvent(value: UnknownRecord): boolean {
  return value.type === "join" && isRecord(value.source) &&
    value.source.type === "group" &&
    typeof value.source.groupId === "string";
}

function isBotLeaveEvent(value: UnknownRecord): boolean {
  return value.type === "leave" && isRecord(value.source) &&
    value.source.type === "group" &&
    typeof value.source.groupId === "string";
}

function isMemberEvent(value: UnknownRecord): boolean {
  return value.type === "memberJoined" || value.type === "memberLeft";
}

function updateLinkedGroupForBotJoin(
  store: MemoryDrsLineStore,
  event: UnknownRecord,
): void {
  const groupId = getGroupId(event);
  if (!groupId) return;
  const group = store.findLinkedGroupByLineGroupId(groupId);
  if (!group) return;
  const occurredAt = getLineEventOccurredAt(event);
  const eventKey = getLineEventIdentity(event);
  if (
    !occurredAt ||
    isStaleBotPresenceEvent(group, occurredAt, "join", eventKey)
  ) return;
  if (group.status !== "active") return;
  group.drsMember = true;
  group.botPresenceUpdatedAt = occurredAt;
  group.botPresenceEventType = "join";
  group.botPresenceEventKey = eventKey;
}

function updateLinkedGroupForBotLeave(
  store: MemoryDrsLineStore,
  event: UnknownRecord,
  now: string,
): void {
  const groupId = getGroupId(event);
  if (!groupId) return;
  const group = store.findLinkedGroupByLineGroupId(groupId);
  if (!group) return;
  const occurredAt = getLineEventOccurredAt(event) ?? now;
  const eventKey = getLineEventIdentity(event);
  if (isStaleBotPresenceEvent(group, occurredAt, "leave", eventKey)) return;
  group.drsMember = false;
  group.botPresenceUpdatedAt = occurredAt;
  group.botPresenceEventType = "leave";
  group.botPresenceEventKey = eventKey;
}

function getLineEventOccurredAt(event: UnknownRecord): string | undefined {
  return typeof event.timestamp === "number" &&
      isSafeLineTimestamp(event.timestamp)
    ? new Date(event.timestamp).toISOString()
    : undefined;
}

function isStaleBotPresenceEvent(
  group: LinkedLineGroup,
  occurredAt: string,
  eventType: "join" | "leave",
  eventKey: string | undefined,
): boolean {
  if (group.botPresenceUpdatedAt === undefined) return false;
  const incomingMs = Date.parse(occurredAt);
  const storedMs = Date.parse(group.botPresenceUpdatedAt);
  if (incomingMs < storedMs) return true;
  if (incomingMs > storedMs) return false;
  if (eventKey && group.botPresenceEventKey === eventKey) return true;
  if (group.botPresenceEventType === "leave" && eventType === "join") {
    return true;
  }
  if (group.botPresenceEventType === eventType) return true;
  return false;
}

function getLineEventIdentity(event: UnknownRecord): string | undefined {
  return typeof event.webhookEventId === "string"
    ? event.webhookEventId
    : undefined;
}

function getGroupId(event: UnknownRecord): string | undefined {
  const source = event.source;
  if (
    !isRecord(source) || source.type !== "group" ||
    typeof source.groupId !== "string"
  ) return undefined;
  return source.groupId;
}

function isGroupCurrentAndDrsPresent(
  group: LinkedLineGroup,
  now: string,
): boolean {
  return group.status === "active" &&
    group.drsMember &&
    Date.parse(group.validFrom) <= Date.parse(now) &&
    Date.parse(now) < Date.parse(group.validTo);
}

function isAssignmentCurrent(
  assignment: SpecialistAssignment,
  caseId: string,
  now: string,
): boolean {
  return assignment.caseId === caseId &&
    assignment.status === "active" &&
    Date.parse(assignment.validFrom) <= Date.parse(now) &&
    Date.parse(now) < Date.parse(assignment.validTo);
}

async function stageAttachment(input: {
  store: MemoryDrsLineStore;
  event: DrsLineMessageEvent;
  receipt: ReceiptRecord;
  contentProvider?: ContentProvider;
}): Promise<AttachmentRecord> {
  if (!input.contentProvider?.readMessageContent) {
    throw new Error("content_provider_required");
  }
  const bytes = await input.contentProvider.readMessageContent(
    input.event.message.id,
  );
  const detectedMime = input.contentProvider.detectMime
    ? await input.contentProvider.detectMime(input.event.message.id)
    : guessMime(input.event.message.type, bytes);
  const mimeType = normalizeSupportedMime(detectedMime);
  if (!mimeType) throw new Error("unsupported_attachment_mime");
  if (bytes.byteLength <= 0 || bytes.byteLength > 10 * 1024 * 1024) {
    throw new Error("attachment_size_out_of_bounds");
  }
  return {
    attachmentId: input.store.nextUuid(),
    receiptId: input.receipt.receiptId,
    provider: "line",
    lineMessageId: input.receipt.lineMessageId,
    mimeType,
    byteSize: bytes.byteLength,
    sha256: await sha256Hex(bytes),
    storageRef:
      `private://line/${input.receipt.providerChannelId}/${input.receipt.receiptId}/${input.receipt.lineMessageId}`,
    status: "private_staged",
  };
}

function resolveFinalAttachmentRefs(
  store: MemoryDrsLineStore,
  input: {
    caseId: string;
    linkedGroupId: string;
    refs: readonly FinalAttachmentRef[];
  },
): readonly FinalAttachmentRef[] {
  return input.refs.map((ref) => {
    const attachment = store.attachments.find((candidate) =>
      candidate.attachmentId === ref.attachmentId
    );
    if (!attachment) throw new Error("final_attachment_not_authorized");
    const receipt = store.receipts.find((candidate) =>
      candidate.receiptId === attachment.receiptId
    );
    if (
      !receipt ||
      receipt.caseId !== input.caseId ||
      receipt.linkedGroupId !== input.linkedGroupId ||
      receipt.processingState !== "accepted" ||
      attachment.status !== "private_staged" ||
      attachment.byteSize <= 0 ||
      attachment.byteSize > 10 * 1024 * 1024 ||
      attachment.sha256 !== ref.sha256 ||
      attachment.mimeType !== ref.mimeType ||
      attachment.byteSize !== ref.byteSize ||
      attachment.storageRef !== ref.storageRef ||
      attachment.lineMessageId !== receipt.lineMessageId
    ) {
      throw new Error("final_attachment_not_authorized");
    }
    return {
      attachmentId: attachment.attachmentId,
      sha256: attachment.sha256,
      mimeType: attachment.mimeType,
      byteSize: attachment.byteSize,
      storageRef: attachment.storageRef,
    };
  });
}

function guessMime(messageType: string, bytes: Uint8Array): string {
  if (messageType === "image" && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return "image/png";
  }
  if (messageType === "image") return "image/jpeg";
  return "application/pdf";
}

function normalizeSupportedMime(
  value: string,
): AttachmentRecord["mimeType"] | undefined {
  const lower = value.toLowerCase();
  if (lower === "application/pdf") return "application/pdf";
  if (lower === "image/jpeg" || lower === "image/jpg") return "image/jpeg";
  if (lower === "image/png") return "image/png";
  return undefined;
}

async function buildAuditEvent(store: MemoryDrsLineStore, input: {
  eventType: AuditEventRecord["eventType"];
  caseId: string;
  linkedGroupId: string;
  correlationId: string;
  occurredAt: string;
  recordedAt: string;
  actorType: ActorType;
  actorId: string;
  visibilityScope: AuditEventRecord["visibilityScope"];
  payload: unknown;
}): Promise<AuditEventRecord> {
  const payloadSha256 = await sha256Hex(canonicalJson(input.payload));
  return {
    auditEventId: store.nextUuid(),
    eventType: input.eventType,
    schemaVersion: "laibe.drs.audit.v1",
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    correlationId: input.correlationId,
    occurredAt: input.occurredAt,
    recordedAt: input.recordedAt,
    actorType: input.actorType,
    actorId: input.actorId,
    visibilityScope: input.visibilityScope,
    policyVersion: "drs-line-w1",
    payloadSha256,
  };
}

function buildHumanDecisionRecord(input: {
  decisionId: string;
  finalizationKey: string;
  input: Parameters<typeof finalizeDrsGroupSend>[0];
  assignment: SpecialistAssignment;
  aiReview?: AiReviewRecord;
  finalTextSha256?: string;
  finalSnapshotSha256?: string;
  attachments: readonly FinalAttachmentRef[];
  decidedAt: string;
  decisionPayloadSha256: string;
}): HumanDecisionRecord {
  const reason = "reason" in input.input.decision
    ? input.input.decision.reason
    : "";
  return {
    decisionId: input.decisionId,
    finalizationKey: input.finalizationKey,
    assignmentId: input.input.assignmentId,
    caseId: input.input.caseId,
    linkedGroupId: input.input.linkedGroupId,
    specialistId: input.assignment.specialistId,
    specialistEmailSnapshot: input.assignment.specialistEmailSnapshot,
    aiReviewId: input.aiReview?.reviewId,
    decisionType: input.input.decision.type,
    reason,
    finalTextSha256: input.finalTextSha256,
    finalSnapshotSha256: input.finalSnapshotSha256,
    finalAttachmentRefs: input.attachments,
    urgency: "urgency" in input.input.decision
      ? input.input.decision.urgency
      : undefined,
    serviceIncidentId: "serviceIncidentId" in input.input.decision
      ? input.input.decision.serviceIncidentId
      : undefined,
    decidedAt: input.decidedAt,
    decisionPayloadSha256: input.decisionPayloadSha256,
  };
}

export async function computeHumanDecisionPayloadSha256(
  decision: HumanDecisionRecord,
): Promise<string> {
  return await sha256Hex(canonicalJson({
    aiReviewId: decision.aiReviewId,
    assignmentId: decision.assignmentId,
    caseId: decision.caseId,
    decisionType: decision.decisionType,
    finalAttachmentRefs: decision.finalAttachmentRefs.map((ref) => ({
      attachmentId: ref.attachmentId,
      byteSize: ref.byteSize,
      mimeType: ref.mimeType,
      sha256: ref.sha256,
      storageRef: ref.storageRef,
    })).sort((left, right) =>
      `${left.attachmentId}:${left.sha256}`.localeCompare(
        `${right.attachmentId}:${right.sha256}`,
      )
    ),
    finalSnapshotSha256: decision.finalSnapshotSha256,
    finalTextSha256: decision.finalTextSha256,
    finalizationKey: decision.finalizationKey,
    linkedGroupId: decision.linkedGroupId,
    reason: decision.reason,
    serviceIncidentId: decision.serviceIncidentId,
    specialistEmailSnapshot: decision.specialistEmailSnapshot,
    specialistId: decision.specialistId,
    urgency: decision.urgency,
  }));
}

function extractFinalText(decision: HumanDecision): string {
  if (decision.type === "CANCEL") return "";
  return decision.finalText;
}

function requireNonBlank(value: string, code: string): void {
  if (!value.trim()) throw new Error(code);
}

function flexBubble(
  kind: string,
  title: PublicSafeText,
  body: PublicSafeText,
): JsonValue {
  return {
    type: "flex",
    altText: title,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: title, weight: "bold" },
          { type: "text", text: body, wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: kind }],
      },
    },
  };
}

function normalizeVisibleText(value: string): string {
  let withoutControl = "";
  for (const character of value.normalize("NFKC")) {
    const codePoint = character.codePointAt(0) ?? 0;
    withoutControl += codePoint <= 31 || codePoint === 127 ? " " : character;
  }
  return withoutControl.replace(/\s+/gu, " ").trim();
}

function normalizeForPolicy(value: string): string {
  return normalizeVisibleText(value)
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}_-]+/gu, "");
}

function containsForbiddenPublicCopy(value: string): boolean {
  const normalized = normalizeForPolicy(value);
  const forbidden = [
    "db",
    "api",
    "n8n",
    "githubtruth",
    "sourceclean",
    "debug",
    "mockonly",
    "rawjson",
    "consoleerror",
    "stacktrace",
    "本機候選",
    "無db寫入",
    "功能停用",
    "api未開",
    "保證消滅詐騙",
    "保證找到最好廠商",
    "保證最低價",
    "零風險",
    "金流託管",
    "支付託管",
    "代收代付",
    "第三方付款保障",
    "老屋煉金術",
    "老屋投資報酬",
    "翻修獲利模型",
    "裝修理財",
  ].map(normalizeForPolicy);
  return forbidden.some((term) => normalized.includes(term));
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${
      keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
        .join(",")
    }}`;
  }
  return JSON.stringify(String(value));
}

async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const data = typeof value === "string"
    ? new TextEncoder().encode(value)
    : value;
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return diff === 0;
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(index, index + 0x8000));
  }
  return btoa(binary);
}
