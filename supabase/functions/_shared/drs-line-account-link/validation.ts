import {
  type AccountLinkEvent,
  LINE_LINK_STATES,
  type LineBindingActionEvent,
  type LineLinkNextAction,
  type LineLinkState,
  type LineLinkStatusDto,
  type LineUnlinkActionEvent,
  type LineWebhookEnvelope,
  type LineWebhookEvent,
} from "./contracts.ts";

const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/u;
const PROVIDER_EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/u;
const EXACT_BINDING_TEXT = "綁定 LINE 案件通知";
const EXACT_UNLINK_TEXT = "解除 LINE 案件通知";
const EXACT_BINDING_POSTBACK = "action=drs_line_account_link";
const FALLBACK_STATUS = Object.freeze({
  state: "temporarily_unavailable" as const,
  nextAction: "retry" as const,
});

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(input);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function hasExactOwnKeys(
  input: unknown,
  expected: readonly string[],
): input is Record<string, unknown> {
  if (!isPlainRecord(input)) return false;
  try {
    const keys = Object.keys(input);
    return keys.length === expected.length &&
      expected.every((key) => Object.prototype.hasOwnProperty.call(input, key));
  } catch {
    return false;
  }
}

function hasOneExactKeySet(
  input: unknown,
  expectedSets: readonly (readonly string[])[],
): input is Record<string, unknown> {
  return expectedSets.some((expected) => hasExactOwnKeys(input, expected));
}

function own(input: Record<string, unknown>, key: string): unknown {
  try {
    return Object.getOwnPropertyDescriptor(input, key)?.value;
  } catch {
    return undefined;
  }
}

function isBoundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return typeof value === "string" && value.length >= minimum &&
    value.length <= maximum;
}

function isRfc3339(value: unknown): value is string {
  return typeof value === "string" && RFC3339_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value));
}

function isLineUserId(value: unknown): value is string {
  return typeof value === "string" && LINE_USER_ID_PATTERN.test(value);
}

function isProviderEventId(value: unknown): value is string {
  return typeof value === "string" && PROVIDER_EVENT_ID_PATTERN.test(value);
}

function isReplyToken(value: unknown): value is string {
  return isBoundedString(value, 1, 256) && !hasAsciiControl(value);
}

function hasAsciiControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isLineLinkState(value: unknown): value is LineLinkState {
  return typeof value === "string" &&
    (LINE_LINK_STATES as readonly string[]).includes(value);
}

function isLineLaunchUrl(value: unknown): value is string {
  if (!isBoundedString(value, 1, 512)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" &&
      url.password === "" && url.port === "" &&
      (url.hostname === "line.me" || url.hostname.endsWith(".line.me"));
  } catch {
    return false;
  }
}

function expectedTerminalAction(
  state: LineLinkState,
): LineLinkNextAction | undefined {
  switch (state) {
    case "not_linked":
    case "expired":
    case "cancelled":
    case "conflict_line_already_bound":
    case "conflict_drs_already_bound":
      return "relink";
    case "temporarily_unavailable":
      return "retry";
    case "linked":
      return "unlink";
    case "revoked":
      return "relink";
    default:
      return undefined;
  }
}

export function sanitizeLineLinkStatus(input: unknown): LineLinkStatusDto {
  try {
    if (!isPlainRecord(input)) return FALLBACK_STATUS;
    const state = own(input, "state");
    if (!isLineLinkState(state)) return FALLBACK_STATUS;

    if (state === "awaiting_line_confirmation") {
      if (
        !hasExactOwnKeys(input, [
          "state",
          "expires_at",
          "next_action",
          "bot_launch_url",
        ]) ||
        !isRfc3339(own(input, "expires_at")) ||
        own(input, "next_action") !== "continue_in_line" ||
        !isLineLaunchUrl(own(input, "bot_launch_url"))
      ) return FALLBACK_STATUS;
      return Object.freeze({
        state,
        expiresAt: own(input, "expires_at") as string,
        nextAction: "continue_in_line" as const,
        botLaunchUrl: own(input, "bot_launch_url") as string,
      });
    }

    if (state === "linked") {
      if (
        !hasExactOwnKeys(input, ["state", "linked_at", "next_action"]) ||
        !isRfc3339(own(input, "linked_at")) ||
        own(input, "next_action") !== "unlink"
      ) return FALLBACK_STATUS;
      return Object.freeze({
        state,
        linkedAt: own(input, "linked_at") as string,
        nextAction: "unlink" as const,
      });
    }

    if (state === "revoked") {
      if (
        !hasExactOwnKeys(input, ["state", "revoked_at", "next_action"]) ||
        !isRfc3339(own(input, "revoked_at")) ||
        own(input, "next_action") !== "relink"
      ) return FALLBACK_STATUS;
      return Object.freeze({
        state,
        revokedAt: own(input, "revoked_at") as string,
        nextAction: "relink" as const,
      });
    }

    const expectedAction = expectedTerminalAction(state);
    if (expectedAction !== undefined) {
      if (
        !hasOneExactKeySet(input, [
          ["state"],
          ["state", "next_action"],
        ]) ||
        (Object.keys(input).length === 2 &&
          own(input, "next_action") !== expectedAction)
      ) return FALLBACK_STATUS;
      return Object.freeze({ state, nextAction: expectedAction });
    }

    if (!hasExactOwnKeys(input, ["state"])) return FALLBACK_STATUS;
    return Object.freeze({ state });
  } catch {
    return FALLBACK_STATUS;
  }
}

function readUserSource(input: unknown): string | null {
  if (!hasExactOwnKeys(input, ["type", "userId"])) return null;
  if (own(input, "type") !== "user") return null;
  const lineUserId = own(input, "userId");
  return isLineUserId(lineUserId) ? lineUserId : null;
}

function readDeliveryContext(input: unknown): boolean | null {
  if (!hasExactOwnKeys(input, ["isRedelivery"])) return null;
  const value = own(input, "isRedelivery");
  return typeof value === "boolean" ? value : null;
}

function readCommonEvent(
  input: Record<string, unknown>,
):
  | Readonly<{
    webhookEventId: string;
    replyToken: string;
    lineUserId: string;
    timestamp: number;
    isRedelivery: boolean;
  }>
  | null {
  if (own(input, "mode") !== "active") return null;
  const webhookEventId = own(input, "webhookEventId");
  const replyToken = own(input, "replyToken");
  const lineUserId = readUserSource(own(input, "source"));
  const timestamp = own(input, "timestamp");
  const isRedelivery = readDeliveryContext(own(input, "deliveryContext"));
  if (
    !isProviderEventId(webhookEventId) || !isReplyToken(replyToken) ||
    lineUserId === null || !isTimestamp(timestamp) || isRedelivery === null
  ) return null;
  return { webhookEventId, replyToken, lineUserId, timestamp, isRedelivery };
}

export function readAccountLinkEvent(input: unknown): AccountLinkEvent | null {
  try {
    if (
      !hasExactOwnKeys(input, [
        "type",
        "mode",
        "timestamp",
        "source",
        "webhookEventId",
        "deliveryContext",
        "replyToken",
        "link",
      ]) || own(input, "type") !== "accountLink"
    ) return null;
    const link = own(input, "link");
    if (!hasExactOwnKeys(link, ["result", "nonce"])) return null;
    const result = own(link, "result");
    const nonce = own(link, "nonce");
    if (
      (result !== "ok" && result !== "failed") ||
      !isBoundedString(nonce, 1, 255) ||
      hasAsciiControl(nonce)
    ) return null;
    const common = readCommonEvent(input);
    if (!common) return null;
    return Object.freeze({
      kind: "account_link" as const,
      ...common,
      nonce,
      result,
    });
  } catch {
    return null;
  }
}

function readBindingMessage(
  input: unknown,
): LineBindingActionEvent | LineUnlinkActionEvent | null {
  if (
    !hasExactOwnKeys(input, [
      "type",
      "mode",
      "timestamp",
      "source",
      "webhookEventId",
      "deliveryContext",
      "replyToken",
      "message",
    ]) || own(input, "type") !== "message"
  ) return null;
  const message = own(input, "message");
  if (
    !hasOneExactKeySet(message, [
      ["id", "type", "text"],
      ["id", "type", "quoteToken", "text"],
    ]) || own(message, "type") !== "text" ||
    ![EXACT_BINDING_TEXT, EXACT_UNLINK_TEXT].includes(
      String(own(message, "text")),
    ) ||
    !isBoundedString(own(message, "id"), 1, 128) ||
    (Object.prototype.hasOwnProperty.call(message, "quoteToken") &&
      !isBoundedString(own(message, "quoteToken"), 1, 256))
  ) return null;
  const common = readCommonEvent(input);
  if (!common) return null;
  return own(message, "text") === EXACT_UNLINK_TEXT
    ? Object.freeze({ kind: "unlink_action" as const, ...common })
    : Object.freeze({ kind: "binding_action" as const, ...common });
}

function readBindingPostback(input: unknown): LineBindingActionEvent | null {
  if (
    !hasExactOwnKeys(input, [
      "type",
      "mode",
      "timestamp",
      "source",
      "webhookEventId",
      "deliveryContext",
      "replyToken",
      "postback",
    ]) || own(input, "type") !== "postback"
  ) return null;
  const postback = own(input, "postback");
  if (
    !hasExactOwnKeys(postback, ["data"]) ||
    own(postback, "data") !== EXACT_BINDING_POSTBACK
  ) return null;
  const common = readCommonEvent(input);
  return common
    ? Object.freeze({ kind: "binding_action" as const, ...common })
    : null;
}

function readLineWebhookEvent(input: unknown): LineWebhookEvent | null {
  if (!isPlainRecord(input)) return null;
  const type = own(input, "type");
  if (type === "accountLink") return readAccountLinkEvent(input);
  if (type === "message") return readBindingMessage(input);
  if (type === "postback") return readBindingPostback(input);
  return null;
}

export function readLineWebhookEnvelope(
  input: unknown,
): LineWebhookEnvelope | null {
  try {
    if (!hasExactOwnKeys(input, ["destination", "events"])) return null;
    const destination = own(input, "destination");
    const candidateEvents = own(input, "events");
    if (
      !isLineUserId(destination) || !Array.isArray(candidateEvents) ||
      candidateEvents.length > 20
    ) return null;
    const events: LineWebhookEvent[] = [];
    for (const candidate of candidateEvents) {
      const event = readLineWebhookEvent(candidate);
      if (!event) return null;
      events.push(event);
    }
    return Object.freeze({
      destination,
      events: Object.freeze(events),
    });
  } catch {
    return null;
  }
}
