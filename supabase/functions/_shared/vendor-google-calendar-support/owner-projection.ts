export const OWNER_VENDOR_CALENDAR_READ_SCHEMA =
  "laibe.owner-vendor-calendar-read.v1" as const;
export const OWNER_VENDOR_CALENDAR_STATUS_SCHEMA =
  "laibe.owner-vendor-calendar-status.v1" as const;
export const OWNER_VENDOR_CALENDAR_TIME_ZONE = "Asia/Taipei" as const;

export type OwnerCalendarShareMode = "availability_only" | "title_time";
export type OwnerCalendarProjectionState =
  | "ready"
  | "not_shared"
  | "temporarily_unavailable";

export type OwnerCalendarProjectionRequest = Readonly<{
  schemaVersion: typeof OWNER_VENDOR_CALENDAR_READ_SCHEMA;
  timeMin: string;
  timeMax: string;
}>;

export type OwnerCalendarEvent = Readonly<{
  eventRef: string;
  selectionRef: string;
  allDay: boolean;
  start: string;
  end: string;
  title?: string;
}>;

export type OwnerCalendarProjectionContext = Readonly<{
  expectedCaseId: string;
  ownerCaseId: string;
  vendorCaseId: string;
  ownerActive: boolean;
  vendorActive: boolean;
  sharingEnabled: boolean;
  sharingRevision: number;
  expectedSharingRevision: number;
  credentialGeneration: number;
  expectedCredentialGeneration: number;
  credentialRevokedAt: string | null;
}>;

export class OwnerCalendarProjectionError extends Error {
  readonly state: string;
  readonly status: number;

  constructor(state: string, status: number) {
    super(state);
    this.name = "OwnerCalendarProjectionError";
    this.state = state;
    this.status = status;
  }
}

function fail(state: string, status: number): never {
  throw new OwnerCalendarProjectionError(state, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length <= maxLength && !/\p{C}/u.test(value);
}

function isTimestamp(value: unknown): value is string {
  return isBoundedText(value, 40) && Number.isFinite(Date.parse(value));
}

export function parseOwnerCalendarProjectionRequest(
  value: unknown,
): OwnerCalendarProjectionRequest {
  if (!isRecord(value)) fail("invalid_request", 400);

  const allowed = new Set(["schemaVersion", "timeMin", "timeMax"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    fail("invalid_request", 400);
  }
  if (
    value.schemaVersion !== OWNER_VENDOR_CALENDAR_READ_SCHEMA ||
    !isTimestamp(value.timeMin) ||
    !isTimestamp(value.timeMax)
  ) {
    fail("invalid_request", 400);
  }

  const start = Date.parse(value.timeMin);
  const end = Date.parse(value.timeMax);
  if (end <= start || end - start > 31 * 86_400_000) {
    fail("invalid_request", 400);
  }

  return {
    schemaVersion: OWNER_VENDOR_CALENDAR_READ_SCHEMA,
    timeMin: value.timeMin,
    timeMax: value.timeMax,
  };
}

export function classifyOwnerCalendarProjectionContext(
  context: OwnerCalendarProjectionContext,
): OwnerCalendarProjectionState {
  if (
    !context.ownerActive ||
    !isBoundedText(context.expectedCaseId, 128) ||
    context.ownerCaseId !== context.expectedCaseId ||
    context.vendorCaseId !== context.expectedCaseId
  ) {
    fail("authority_denied", 403);
  }

  if (
    !context.vendorActive || !context.sharingEnabled ||
    context.credentialRevokedAt !== null
  ) {
    return "not_shared";
  }

  if (
    !isPositiveRevision(context.sharingRevision) ||
    !isPositiveRevision(context.expectedSharingRevision) ||
    !isPositiveRevision(context.credentialGeneration) ||
    !isPositiveRevision(context.expectedCredentialGeneration) ||
    context.sharingRevision !== context.expectedSharingRevision ||
    context.credentialGeneration !== context.expectedCredentialGeneration
  ) {
    return "temporarily_unavailable";
  }

  return "ready";
}

export function projectOwnerCalendarEvent(
  value: Record<string, unknown>,
  shareMode: OwnerCalendarShareMode,
): OwnerCalendarEvent {
  if (
    !["availability_only", "title_time"].includes(shareMode) ||
    !isBoundedText(value.eventRef, 128) ||
    !isBoundedText(value.selectionRef, 128) ||
    typeof value.allDay !== "boolean" ||
    !isBoundedText(value.start, 40) ||
    !isBoundedText(value.end, 40)
  ) {
    fail("temporarily_unavailable", 503);
  }

  const event: {
    eventRef: string;
    selectionRef: string;
    allDay: boolean;
    start: string;
    end: string;
    title?: string;
  } = {
    eventRef: value.eventRef,
    selectionRef: value.selectionRef,
    allDay: value.allDay,
    start: value.start,
    end: value.end,
  };

  if (shareMode === "title_time" && isBoundedText(value.title, 300)) {
    event.title = value.title;
  }
  return event;
}

export function buildOwnerCalendarStatus(value: {
  state: OwnerCalendarProjectionState;
  caseId: string;
  sharingRevision: number | null;
  [key: string]: unknown;
}): Readonly<{
  schemaVersion: typeof OWNER_VENDOR_CALENDAR_STATUS_SCHEMA;
  state: OwnerCalendarProjectionState;
  caseId: string;
  sharingRevision: number | null;
  timeZone: typeof OWNER_VENDOR_CALENDAR_TIME_ZONE;
}> {
  if (
    !["ready", "not_shared", "temporarily_unavailable"].includes(value.state) ||
    !isBoundedText(value.caseId, 128) ||
    !(value.sharingRevision === null ||
      isPositiveRevision(value.sharingRevision))
  ) {
    fail("temporarily_unavailable", 503);
  }

  return {
    schemaVersion: OWNER_VENDOR_CALENDAR_STATUS_SCHEMA,
    state: value.state,
    caseId: value.caseId,
    sharingRevision: value.sharingRevision,
    timeZone: OWNER_VENDOR_CALENDAR_TIME_ZONE,
  };
}
