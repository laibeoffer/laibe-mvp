const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LINE_GROUP_ID = /^C[0-9a-f]{32}$/u;
const LINE_USER_ID = /^U[0-9a-f]{32}$/u;
const WEBHOOK_EVENT_ID = /^[A-Za-z0-9_-]{16,128}$/u;
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/u;

type PlainObject = Record<string, unknown>;

function plainObject(value: unknown): PlainObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ? value as PlainObject
    : null;
}

function exactKeys(
  value: PlainObject,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key));
}

function own(value: PlainObject, key: string): unknown {
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

export type BindingStartInput = Readonly<Record<string, never>>;
export type ReviewEnqueueInput = Readonly<{ reviewEventId: string }>;

export function readBindingStartInput(
  value: unknown,
): BindingStartInput | null {
  const candidate = plainObject(value);
  return candidate && exactKeys(candidate, []) ? Object.freeze({}) : null;
}

export function readReviewEnqueueInput(
  value: unknown,
): ReviewEnqueueInput | null {
  const candidate = plainObject(value);
  if (!candidate || !exactKeys(candidate, ["reviewEventId"])) return null;
  const reviewEventId = own(candidate, "reviewEventId");
  return typeof reviewEventId === "string" && UUID.test(reviewEventId)
    ? Object.freeze({ reviewEventId })
    : null;
}

export type GroupBindingWebhookEvent = Readonly<{
  webhookEventId: string;
  lineGroupId: string;
  lineUserId: string | null;
  challenge: string;
  timestamp: number;
  isRedelivery: boolean;
}>;

export type GroupBindingWebhookEnvelope = Readonly<{
  destination: string;
  events: readonly GroupBindingWebhookEvent[];
}>;

function readGroupBindingEvent(
  value: unknown,
): GroupBindingWebhookEvent | null {
  const event = plainObject(value);
  if (
    !event ||
    !exactKeys(event, [
      "type",
      "mode",
      "timestamp",
      "source",
      "webhookEventId",
      "deliveryContext",
      "replyToken",
      "message",
    ]) ||
    own(event, "type") !== "message" || own(event, "mode") !== "active"
  ) return null;

  const timestamp = own(event, "timestamp");
  const webhookEventId = own(event, "webhookEventId");
  const replyToken = own(event, "replyToken");
  const source = plainObject(own(event, "source"));
  const delivery = plainObject(own(event, "deliveryContext"));
  const message = plainObject(own(event, "message"));
  if (
    !Number.isSafeInteger(timestamp) || (timestamp as number) < 0 ||
    typeof webhookEventId !== "string" ||
    !WEBHOOK_EVENT_ID.test(webhookEventId) ||
    typeof replyToken !== "string" || replyToken.length < 1 ||
    replyToken.length > 512 ||
    !source || !exactKeys(source, ["type", "groupId"], ["userId"]) ||
    own(source, "type") !== "group" ||
    !delivery || !exactKeys(delivery, ["isRedelivery"]) ||
    typeof own(delivery, "isRedelivery") !== "boolean" ||
    !message || !exactKeys(message, ["id", "type", "text"], ["quoteToken"]) ||
    own(message, "type") !== "text"
  ) return null;

  const lineGroupId = own(source, "groupId");
  const lineUserId = Object.hasOwn(source, "userId")
    ? own(source, "userId")
    : null;
  const messageId = own(message, "id");
  const text = own(message, "text");
  const quoteToken = Object.hasOwn(message, "quoteToken")
    ? own(message, "quoteToken")
    : null;
  if (
    typeof lineGroupId !== "string" || !LINE_GROUP_ID.test(lineGroupId) ||
    (lineUserId !== null &&
      (typeof lineUserId !== "string" || !LINE_USER_ID.test(lineUserId))) ||
    typeof messageId !== "string" || !/^[0-9]{1,64}$/u.test(messageId) ||
    (quoteToken !== null &&
      (typeof quoteToken !== "string" || quoteToken.length < 1 ||
        quoteToken.length > 512)) ||
    typeof text !== "string"
  ) return null;
  const match = /^DRS案件綁定 ([A-Za-z0-9_-]{43})$/u.exec(text);
  if (!match || !CHALLENGE.test(match[1])) return null;

  return Object.freeze({
    webhookEventId,
    lineGroupId,
    lineUserId: lineUserId as string | null,
    challenge: match[1],
    timestamp: timestamp as number,
    isRedelivery: own(delivery, "isRedelivery") as boolean,
  });
}

export function readGroupBindingWebhookEnvelope(
  value: unknown,
): GroupBindingWebhookEnvelope | null {
  const envelope = plainObject(value);
  if (!envelope || !exactKeys(envelope, ["destination", "events"])) {
    return null;
  }
  const destination = own(envelope, "destination");
  const events = own(envelope, "events");
  if (
    typeof destination !== "string" || !LINE_USER_ID.test(destination) ||
    !Array.isArray(events) || events.length > 20
  ) return null;
  const parsed = events.map(readGroupBindingEvent).filter(
    (event): event is GroupBindingWebhookEvent => event !== null,
  );
  return Object.freeze({
    destination,
    events: Object.freeze(parsed),
  });
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isProtocolDigest(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/u.test(value);
}

export function isRfc3339(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/u.test(value) &&
    Number.isFinite(Date.parse(value));
}
