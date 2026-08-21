import {
  type AdvisoryPort,
  type AdvisoryPortResult,
  buildLinePushRequest,
  finalizeDrsGroupSend,
  type MemoryDrsLineStore,
} from "../w1.ts";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type UnknownRecord = Record<string, unknown>;

export type RuntimeFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface RuntimeLogger {
  warn(message: string): void;
}

export interface RuntimeLineContentClient {
  getMessageContent(messageId: string): Promise<{
    body: Uint8Array;
    mimeType: string;
  }>;
}

export interface RuntimeLinkedInboundContext {
  formalLinkId: string;
  caseId: string;
  linkedGroupId: string;
  lineGroupId: string;
  groupType: "OWNER_DRS_PRIVATE" | "OWNER_VENDOR_DRS_SHARED";
  actorType: "OWNER" | "VENDOR";
}

export interface DrsRuntimeRepository {
  claimLineEventForProcessing(input: {
    provider: "line";
    providerChannelId: string;
    providerEventId: string;
    providerMessageId: string;
    lineGroupId: string;
    lineSenderUserId: string;
    fingerprintSha256: string;
    sentAt: string;
  }): Promise<
    | { status: "claimed"; leaseToken: string; leaseExpiresAt: string }
    | { status: "duplicate" }
    | { status: "collision" }
    | { status: "busy" }
  >;

  commitLineEventClaim(input: {
    provider: "line";
    providerChannelId: string;
    providerEventId: string;
    providerMessageId: string;
    lineGroupId: string;
    lineSenderUserId: string;
    fingerprintSha256: string;
    leaseToken: string;
    receiptId: string;
    committedAt: string;
  }): Promise<void>;

  releaseLineEventClaim(input: {
    provider: "line";
    providerChannelId: string;
    providerEventId: string;
    providerMessageId: string;
    lineGroupId: string;
    lineSenderUserId: string;
    fingerprintSha256: string;
    leaseToken: string;
    reason:
      | "attachment_retryable"
      | "attachment_denied"
      | "record_retryable"
      | "claim_lease_expired"
      | "commit_retryable";
    releasedAt: string;
  }): Promise<void>;

  resolveFormalLinkedGroupForInbound(input: {
    provider: "line";
    providerChannelId: string;
    lineGroupId: string;
    lineSenderUserId: string;
    sentAt: string;
  }): Promise<RuntimeLinkedInboundContext | undefined>;

  recordInboundSentMessage(input: {
    provider: "line";
    providerChannelId: string;
    providerEventId: string;
    providerMessageId: string;
    lineGroupId: string;
    lineSenderUserId: string;
    caseId: string;
    linkedGroupId: string;
    formalLinkId: string;
    groupType: "OWNER_DRS_PRIVATE" | "OWNER_VENDOR_DRS_SHARED";
    actorType: "OWNER" | "VENDOR";
    messageType: "text" | "file" | "image";
    text?: string;
    sentAt: string;
    receivedAt: string;
    fingerprintSha256: string;
    claimLeaseToken: string;
    claimLeaseExpiresAt: string;
    attachmentId?: string;
  }): Promise<{ receiptId: string }>;

  stageInboundAttachment(input: {
    provider: "line";
    providerChannelId: string;
    providerEventId: string;
    providerMessageId: string;
    lineGroupId: string;
    lineSenderUserId: string;
    caseId: string;
    linkedGroupId: string;
    mimeType: "application/pdf" | "image/jpeg" | "image/png";
    byteSize: number;
    sha256: string;
    content: Uint8Array;
  }): Promise<{ attachmentId: string }>;

  revalidateGroupSend(input: {
    provider: "line";
    caseId: string;
    linkedGroupId: string;
    lineGroupId: string;
    finalMessageId: string;
    now: string;
  }): Promise<{ ok: boolean }>;

  recordTransportAttempt(input: {
    provider: "line";
    caseId: string;
    linkedGroupId: string;
    lineGroupId: string;
    finalMessageId: string;
    outboxId: string;
    status:
      | "transport_accepted"
      | "rate_limited"
      | "retryable_failure"
      | "configuration_error";
    httpStatus?: number;
    recipientReadConfirmed: false;
    occurredAt: string;
    safeErrorCode?: string;
  }): Promise<void>;
}

export interface RuntimeWebhookResult {
  status:
    | "ok"
    | "configuration_error"
    | "bad_signature"
    | "wrong_destination"
    | "bad_request";
  acceptedCount: number;
  duplicateCount: number;
  deniedCount: number;
  unsupportedCount: number;
  collisionCount: number;
  retryableCount: number;
}

export async function handleLineWebhookRuntime(input: {
  rawBody: string;
  headers: Record<string, string | undefined>;
  config: {
    channelSecret?: string;
    expectedDestination?: string;
    maxBodyBytes?: number;
  };
  repository: DrsRuntimeRepository;
  contentClient?: RuntimeLineContentClient;
  now: string;
  logger?: RuntimeLogger;
}): Promise<RuntimeWebhookResult> {
  if (
    !isNonBlank(input.config.channelSecret) ||
    !isNonBlank(input.config.expectedDestination)
  ) {
    safeWarn(input.logger, "line_runtime_configuration_missing");
    return emptyWebhookResult("configuration_error");
  }
  const maxBodyBytes = input.config.maxBodyBytes ?? 1024 * 1024;
  if (new TextEncoder().encode(input.rawBody).byteLength > maxBodyBytes) {
    return emptyWebhookResult("bad_request");
  }
  const signature = getHeader(input.headers, "x-line-signature");
  if (
    !signature ||
    !await verifyLineSignature(
      input.config.channelSecret,
      input.rawBody,
      signature,
    )
  ) {
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

  if (body.destination !== input.config.expectedDestination) {
    return emptyWebhookResult("wrong_destination");
  }

  const result = emptyWebhookResult("ok");
  const events = Array.isArray(body.events) ? body.events : [];
  for (const event of events) {
    if (isInvalidGroupMessageTimestamp(event)) {
      result.deniedCount += 1;
      continue;
    }
    if (!isRecord(event) || !isLineSentMessageEvent(event)) {
      result.unsupportedCount += 1;
      continue;
    }
    if (event.source.type !== "group") {
      result.unsupportedCount += 1;
      continue;
    }
    if (!isSafeLineTimestamp(event.timestamp)) {
      result.deniedCount += 1;
      continue;
    }
    const sentAt = new Date(event.timestamp).toISOString();
    const lineSenderUserId = event.source.userId;
    if (!isNonBlank(lineSenderUserId)) {
      result.deniedCount += 1;
      continue;
    }

    const messageType = event.message.type;
    if (
      messageType !== "text" && messageType !== "file" &&
      messageType !== "image"
    ) {
      result.unsupportedCount += 1;
      continue;
    }

    const fingerprintSha256 = await sha256Hex(canonicalJson({
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      message: event.message,
    }));

    const linked = await input.repository.resolveFormalLinkedGroupForInbound({
      provider: "line",
      providerChannelId: input.config.expectedDestination,
      lineGroupId: event.source.groupId,
      lineSenderUserId,
      sentAt,
    });
    if (!linked) {
      result.deniedCount += 1;
      continue;
    }
    if (linked.lineGroupId !== event.source.groupId) {
      result.deniedCount += 1;
      continue;
    }

    const claim = await input.repository.claimLineEventForProcessing({
      provider: "line",
      providerChannelId: input.config.expectedDestination,
      providerEventId: event.webhookEventId,
      providerMessageId: event.message.id,
      lineGroupId: event.source.groupId,
      lineSenderUserId,
      fingerprintSha256,
      sentAt,
    });
    if (claim.status === "duplicate") {
      result.duplicateCount += 1;
      continue;
    }
    if (claim.status === "collision") {
      result.collisionCount += 1;
      result.deniedCount += 1;
      continue;
    }
    if (claim.status === "busy") {
      result.retryableCount += 1;
      continue;
    }
    if (isClaimLeaseExpired(claim.leaseExpiresAt, input.now)) {
      await releaseClaim(input.repository, {
        providerChannelId: input.config.expectedDestination,
        event,
        lineSenderUserId,
        fingerprintSha256,
        leaseToken: claim.leaseToken,
        reason: "claim_lease_expired",
        now: input.now,
      });
      result.retryableCount += 1;
      continue;
    }

    let attachmentId: string | undefined;
    if (messageType === "file" || messageType === "image") {
      const staged = await stageRuntimeAttachment({
        contentClient: input.contentClient,
        repository: input.repository,
        providerChannelId: input.config.expectedDestination,
        event,
        linked,
        lineSenderUserId,
        sentAt,
        fingerprintSha256,
      });
      if (staged.status !== "staged") {
        await releaseClaim(input.repository, {
          providerChannelId: input.config.expectedDestination,
          event,
          lineSenderUserId,
          fingerprintSha256,
          leaseToken: claim.leaseToken,
          reason: staged.status === "retryable"
            ? "attachment_retryable"
            : "attachment_denied",
          now: input.now,
        });
        if (staged.status === "retryable") {
          result.retryableCount += 1;
        } else {
          result.deniedCount += 1;
        }
        continue;
      }
      attachmentId = staged.attachmentId;
    }

    try {
      await input.repository.recordInboundSentMessage({
        provider: "line",
        providerChannelId: input.config.expectedDestination,
        providerEventId: event.webhookEventId,
        providerMessageId: event.message.id,
        lineGroupId: event.source.groupId,
        lineSenderUserId,
        caseId: linked.caseId,
        linkedGroupId: linked.linkedGroupId,
        formalLinkId: linked.formalLinkId,
        groupType: linked.groupType,
        actorType: linked.actorType,
        messageType,
        text: getTextMessageBody(event.message),
        sentAt,
        receivedAt: input.now,
        fingerprintSha256,
        claimLeaseToken: claim.leaseToken,
        claimLeaseExpiresAt: claim.leaseExpiresAt,
        attachmentId,
      });
    } catch {
      await releaseClaim(input.repository, {
        providerChannelId: input.config.expectedDestination,
        event,
        lineSenderUserId,
        fingerprintSha256,
        leaseToken: claim.leaseToken,
        reason: "record_retryable",
        now: input.now,
      });
      result.retryableCount += 1;
      continue;
    }

    result.acceptedCount += 1;
  }
  return result;
}

function isClaimLeaseExpired(leaseExpiresAt: string, now: string): boolean {
  const leaseExpiresMs = Date.parse(leaseExpiresAt);
  const nowMs = Date.parse(now);
  return !Number.isFinite(leaseExpiresMs) || !Number.isFinite(nowMs) ||
    leaseExpiresMs <= nowMs;
}

async function releaseClaim(
  repository: DrsRuntimeRepository,
  input: {
    providerChannelId: string;
    event: LineRuntimeMessageEvent;
    lineSenderUserId: string;
    fingerprintSha256: string;
    leaseToken: string;
    reason: Parameters<DrsRuntimeRepository["releaseLineEventClaim"]>[0][
      "reason"
    ];
    now: string;
  },
): Promise<void> {
  await repository.releaseLineEventClaim({
    provider: "line",
    providerChannelId: input.providerChannelId,
    providerEventId: input.event.webhookEventId,
    providerMessageId: input.event.message.id,
    lineGroupId: input.event.source.type === "group"
      ? input.event.source.groupId
      : "",
    lineSenderUserId: input.lineSenderUserId,
    fingerprintSha256: input.fingerprintSha256,
    leaseToken: input.leaseToken,
    reason: input.reason,
    releasedAt: input.now,
  });
}

export function createOpenAiResponsesAdvisoryPort(input: {
  apiKey?: string;
  model?: string;
  fetch: RuntimeFetch;
  endpoint?: string;
  timeoutMs?: number;
}): AdvisoryPort {
  return {
    async review(request): Promise<AdvisoryPortResult> {
      if (!isNonBlank(input.apiKey) || !isNonBlank(input.model)) {
        return safeUnavailableAdvisoryResult("openai_configuration_missing");
      }
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort("openai_timeout"),
        input.timeoutMs ?? 8000,
      );
      try {
        const response = await input.fetch(
          input.endpoint ?? "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              "authorization": `Bearer ${input.apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: input.model,
              input: [
                {
                  role: "system",
                  content:
                    "Return JSON only. Review DRS outbound Traditional Chinese text. Do not include hidden chain-of-thought.",
                },
                {
                  role: "user",
                  content: request.text,
                },
              ],
              metadata: {
                component: "drs-linebot-w2-advisory",
                submitted_at: request.now,
              },
            }),
            signal: controller.signal,
          },
        );
        const text = await response.text();
        clearTimeout(timeout);
        if (response.status === 429) {
          return safeUnavailableAdvisoryResult("openai_rate_limited");
        }
        if (response.status < 200 || response.status >= 300) {
          return safeUnavailableAdvisoryResult("openai_unavailable");
        }
        return parseOpenAiReviewResponse(text);
      } catch {
        clearTimeout(timeout);
        return safeUnavailableAdvisoryResult("openai_transport_failure");
      }
    },
  };
}

export async function finalizeSpecialistGroupSendRuntime(
  input: Parameters<typeof finalizeDrsGroupSend>[0],
): ReturnType<typeof finalizeDrsGroupSend> {
  return await finalizeDrsGroupSend(input);
}

export async function pushFinalMessageRuntime(input: {
  store: MemoryDrsLineStore;
  outboxId: string;
  endpointBaseUrl: string;
  channelAccessToken?: string;
  repository: DrsRuntimeRepository;
  fetch: RuntimeFetch;
  now: string;
  timeoutMs?: number;
}): Promise<{
  status:
    | "transport_accepted"
    | "rate_limited"
    | "retryable_failure"
    | "configuration_error";
  recipientReadConfirmed: false;
  httpStatus?: number;
}> {
  const outbox = input.store.outbox.find((candidate) =>
    candidate.outboxId === input.outboxId
  );
  if (!outbox) throw new Error("outbox_not_found");
  const finalMessage = input.store.finalMessages.find((candidate) =>
    candidate.finalMessageId === outbox.finalMessageId
  );
  if (!finalMessage) throw new Error("final_message_not_found");
  if (!isNonBlank(input.channelAccessToken)) {
    await recordTransport(input, {
      finalMessage,
      status: "configuration_error",
      safeErrorCode: "line_configuration_missing",
    });
    return { status: "configuration_error", recipientReadConfirmed: false };
  }
  const revalidated = await input.repository.revalidateGroupSend({
    provider: "line",
    caseId: finalMessage.caseId,
    linkedGroupId: finalMessage.linkedGroupId,
    lineGroupId: finalMessage.lineGroupId,
    finalMessageId: finalMessage.finalMessageId,
    now: input.now,
  });
  if (!revalidated.ok) throw new Error("linked_group_not_sendable");

  const request = await buildLinePushRequest({
    endpointBaseUrl: input.endpointBaseUrl,
    store: input.store,
    outboxId: input.outboxId,
  });
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort("line_push_timeout"),
    input.timeoutMs ?? 8000,
  );
  try {
    const response = await input.fetch(request.url, {
      method: request.method,
      headers: {
        ...request.headers,
        authorization: `Bearer ${input.channelAccessToken}`,
      },
      body: request.body,
      signal: controller.signal,
    });
    await response.text();
    clearTimeout(timeout);
    const status = response.status === 429
      ? "rate_limited"
      : response.status >= 200 && response.status < 300
      ? "transport_accepted"
      : "retryable_failure";
    await recordTransport(input, {
      finalMessage,
      status,
      httpStatus: response.status,
      safeErrorCode: status === "retryable_failure"
        ? "line_push_http_failure"
        : undefined,
    });
    return {
      status,
      httpStatus: response.status,
      recipientReadConfirmed: false,
    };
  } catch {
    clearTimeout(timeout);
    await recordTransport(input, {
      finalMessage,
      status: "retryable_failure",
      safeErrorCode: "line_push_transport_failure",
    });
    return { status: "retryable_failure", recipientReadConfirmed: false };
  }
}

async function stageRuntimeAttachment(input: {
  contentClient?: RuntimeLineContentClient;
  repository: DrsRuntimeRepository;
  providerChannelId: string;
  event: LineRuntimeMessageEvent;
  linked: RuntimeLinkedInboundContext;
  lineSenderUserId: string;
  sentAt: string;
  fingerprintSha256: string;
}): Promise<
  | { status: "staged"; attachmentId: string }
  | { status: "denied" | "retryable" }
> {
  if (!input.contentClient) return { status: "retryable" };
  try {
    const content = await input.contentClient.getMessageContent(
      input.event.message.id,
    );
    const mimeType = normalizeInboundMime(
      input.event.message.type as "file" | "image",
      content.mimeType,
    );
    if (!mimeType) return { status: "denied" };
    if (content.body.byteLength > 10 * 1024 * 1024) {
      return { status: "denied" };
    }
    const sha256 = await sha256Bytes(content.body);
    const staged = await input.repository.stageInboundAttachment({
      provider: "line",
      providerChannelId: input.providerChannelId,
      providerEventId: input.event.webhookEventId,
      providerMessageId: input.event.message.id,
      lineGroupId: input.event.source.type === "group"
        ? input.event.source.groupId
        : "",
      lineSenderUserId: input.lineSenderUserId,
      caseId: input.linked.caseId,
      linkedGroupId: input.linked.linkedGroupId,
      mimeType,
      byteSize: content.body.byteLength,
      sha256,
      content: content.body,
    });
    return { status: "staged", attachmentId: staged.attachmentId };
  } catch {
    return { status: "retryable" };
  }
}

async function recordTransport(
  input: {
    repository: DrsRuntimeRepository;
    outboxId: string;
    now: string;
  },
  event: {
    finalMessage: {
      caseId: string;
      linkedGroupId: string;
      lineGroupId: string;
      finalMessageId: string;
    };
    status:
      | "transport_accepted"
      | "rate_limited"
      | "retryable_failure"
      | "configuration_error";
    httpStatus?: number;
    safeErrorCode?: string;
  },
): Promise<void> {
  await input.repository.recordTransportAttempt({
    provider: "line",
    caseId: event.finalMessage.caseId,
    linkedGroupId: event.finalMessage.linkedGroupId,
    lineGroupId: event.finalMessage.lineGroupId,
    finalMessageId: event.finalMessage.finalMessageId,
    outboxId: input.outboxId,
    status: event.status,
    httpStatus: event.httpStatus,
    recipientReadConfirmed: false,
    occurredAt: input.now,
    safeErrorCode: event.safeErrorCode,
  });
}

function parseOpenAiReviewResponse(text: string): AdvisoryPortResult {
  try {
    const parsed: unknown = JSON.parse(text);
    const outputText = extractOutputText(parsed);
    const payload: unknown = outputText ? JSON.parse(outputText) : parsed;
    if (!isRecord(payload)) {
      return safeUnavailableAdvisoryResult("openai_malformed_response");
    }
    const status = payload.status;
    if (
      status !== "REVIEW_COMPLETED_NO_FLAG" &&
      status !== "REVIEW_COMPLETED_ATTENTION"
    ) {
      if (status === "REVIEW_SERVICE_UNAVAILABLE") {
        return safeUnavailableAdvisoryResult("openai_declared_unavailable");
      }
      return safeUnavailableAdvisoryResult("openai_unknown_status");
    }
    return {
      status,
      findings: stringArray(payload.findings),
      evidenceRefs: stringArray(payload.evidenceRefs),
      recommendations: stringArray(payload.recommendations),
      proposedText: typeof payload.proposedText === "string"
        ? payload.proposedText
        : "",
      model: typeof payload.model === "string" ? payload.model : "openai",
      modelVersion: typeof payload.modelVersion === "string"
        ? payload.modelVersion
        : "responses-api",
      ragVersion: typeof payload.ragVersion === "string"
        ? payload.ragVersion
        : "none",
      skillVersion: typeof payload.skillVersion === "string"
        ? payload.skillVersion
        : "none",
    };
  } catch {
    return safeUnavailableAdvisoryResult("openai_malformed_response");
  }
}

function extractOutputText(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.output_text === "string") return value.output_text;
  if (!Array.isArray(value.output)) return undefined;
  const chunks: string[] = [];
  for (const item of value.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (!isRecord(content)) continue;
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.length > 0 ? chunks.join("") : undefined;
}

function safeUnavailableAdvisoryResult(
  serviceErrorCode = "advisory_unavailable",
): AdvisoryPortResult {
  return {
    status: "REVIEW_SERVICE_UNAVAILABLE",
    findings: [],
    evidenceRefs: [],
    recommendations: [],
    proposedText:
      "AI 審查暫時無法完成，請由已指派 DRS 專家依人工例外流程處理。",
    model: "openai",
    modelVersion: "responses-api",
    ragVersion: "none",
    skillVersion: "drs-linebot-w2",
    serviceErrorCode,
  };
}

function emptyWebhookResult(
  status: RuntimeWebhookResult["status"],
): RuntimeWebhookResult {
  return {
    status,
    acceptedCount: 0,
    duplicateCount: 0,
    deniedCount: 0,
    unsupportedCount: 0,
    collisionCount: 0,
    retryableCount: 0,
  };
}

function getHeader(
  headers: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const direct = headers[name] ?? headers[name.toLowerCase()] ??
    headers[name.toUpperCase()];
  if (direct) return direct;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return undefined;
}

async function verifyLineSignature(
  channelSecret: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const expected = await hmacSha256Base64(channelSecret, rawBody);
  return timingSafeEqual(expected, signature);
}

async function hmacSha256Base64(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

function normalizeInboundMime(
  messageType: "file" | "image",
  mimeType: string,
): "application/pdf" | "image/jpeg" | "image/png" | undefined {
  const normalized = mimeType.toLowerCase();
  if (messageType === "image") {
    if (normalized === "image/jpeg" || normalized === "image/png") {
      return normalized;
    }
    return undefined;
  }
  return normalized === "application/pdf" ? "application/pdf" : undefined;
}

function isLineSentMessageEvent(
  value: unknown,
): value is LineRuntimeMessageEvent {
  if (!isRecord(value)) return false;
  if (value.type !== "message") return false;
  if (value.mode !== undefined && value.mode !== "active") return false;
  if (typeof value.timestamp !== "number") return false;
  if (!isNonBlank(value.webhookEventId)) return false;
  if (!isRecord(value.source)) return false;
  if (!isRecord(value.message)) return false;
  if (!isNonBlank(value.message.id)) return false;
  if (value.source.type === "group") {
    if (!isNonBlank(value.source.groupId)) return false;
  } else if (value.source.type === "room") {
    if (!isNonBlank(value.source.roomId)) return false;
  } else if (value.source.type === "user") {
    if (!isNonBlank(value.source.userId)) return false;
  } else {
    return false;
  }
  if (value.message.type === "text") {
    return typeof value.message.text === "string";
  }
  return value.message.type === "file" || value.message.type === "image" ||
    typeof value.message.type === "string";
}

function isInvalidGroupMessageTimestamp(value: unknown): boolean {
  if (!isRecord(value) || value.type !== "message") return false;
  if (!isRecord(value.source) || value.source.type !== "group") return false;
  if (!isRecord(value.message) || !isNonBlank(value.message.id)) return false;
  return !isSafeLineTimestampValue(value.timestamp);
}

interface LineRuntimeMessageEvent {
  type: "message";
  mode?: string;
  timestamp: number;
  webhookEventId: string;
  source:
    | { type: "group"; groupId: string; userId?: string }
    | { type: "room"; roomId: string; userId?: string }
    | { type: "user"; userId: string };
  message:
    | { id: string; type: "text"; text: string }
    | { id: string; type: "file"; fileName?: string; fileSize?: number }
    | { id: string; type: "image" }
    | { id: string; type: string };
}

function isSafeLineTimestamp(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 8_640_000_000_000_000;
}

function isSafeLineTimestampValue(value: unknown): value is number {
  return typeof value === "number" && isSafeLineTimestamp(value);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeWarn(logger: RuntimeLogger | undefined, message: string): void {
  logger?.warn(message);
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

async function sha256Bytes(value: Uint8Array): Promise<string> {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  const hash = await crypto.subtle.digest("SHA-256", copy);
  return hex(new Uint8Array(hash));
}

function getTextMessageBody(
  message: LineRuntimeMessageEvent["message"],
): string | undefined {
  return message.type === "text" && "text" in message
    ? message.text
    : undefined;
}

async function sha256Hex(value: string): Promise<string> {
  return await sha256Bytes(new TextEncoder().encode(value));
}

function hex(value: Uint8Array): string {
  return Array.from(value).map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  return `{${
    entries.map(([key, entry]) =>
      `${JSON.stringify(key)}:${canonicalJson(entry)}`
    ).join(",")
  }}`;
}
