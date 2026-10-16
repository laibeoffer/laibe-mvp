export const VENDOR_CALENDAR_CALLBACK_URI =
  "https://zdwuyomhswjcbbpbhpcq.supabase.co/functions/v1/vendor-google-calendar-connect-callback";
export const VENDOR_CALENDAR_TIME_ZONE = "Asia/Taipei";
export const VENDOR_CALENDAR_SITE_ORIGIN =
  "https://laibe-drs-owner-vendor-20260908.blueleft120.chatgpt.site";
export const VENDOR_CALENDAR_MAX_WINDOW_DAYS = 31;
export const VENDOR_CALENDAR_GOOGLE_SCOPES = Object.freeze([
  "openid",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.owned.readonly",
]);

export type ClosedJsonResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: number; message: string };

export const VENDOR_CALENDAR_SHARING_SCHEMA =
  "laibe.vendor-calendar-sharing.v2";
export type CalendarShareMode = "full_detail";
type SharingFlowInput = Readonly<{
  schemaVersion: typeof VENDOR_CALENDAR_SHARING_SCHEMA;
  flowRef: string;
  initiationProof: string;
  flowRevision: number;
}>;
export type VendorCalendarSharingRequest =
  | (
    & SharingFlowInput
    & Readonly<{ action: "finish"; returnCapability: string }>
  )
  | (SharingFlowInput & Readonly<{ action: "list" | "cancel_pending" }>)
  | (
    & SharingFlowInput
    & Readonly<{
      action: "save";
      expectedSharingRevision: number;
      choices: readonly Readonly<
        { choiceRef: string; shareMode: CalendarShareMode }
      >[];
    }>
  )
  | Readonly<{
    schemaVersion: typeof VENDOR_CALENDAR_SHARING_SCHEMA;
    action: "unlink";
    bindingRef: string;
    expectedSharingRevision: number;
  }>;

const OPAQUE_REF =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const PROOF = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function revision(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) &&
    value >= minimum;
}

export function parseVendorCalendarSharingRequest(
  value: unknown,
): VendorCalendarSharingRequest | null {
  if (
    !isRecord(value) || value.schemaVersion !== VENDOR_CALENDAR_SHARING_SCHEMA
  ) return null;
  const schemaVersion = VENDOR_CALENDAR_SHARING_SCHEMA;
  if (value.action === "unlink") {
    if (
      !exactKeys(value, [
        "schemaVersion",
        "action",
        "bindingRef",
        "expectedSharingRevision",
      ]) ||
      typeof value.bindingRef !== "string" ||
      !OPAQUE_REF.test(value.bindingRef) ||
      !revision(value.expectedSharingRevision, 0)
    ) return null;
    return Object.freeze({
      schemaVersion,
      action: "unlink",
      bindingRef: value.bindingRef,
      expectedSharingRevision: value.expectedSharingRevision,
    });
  }
  if (
    typeof value.flowRef !== "string" || !OPAQUE_REF.test(value.flowRef) ||
    typeof value.initiationProof !== "string" ||
    !PROOF.test(value.initiationProof) ||
    !revision(value.flowRevision, 1)
  ) return null;
  const keys = [
    "schemaVersion",
    "action",
    "flowRef",
    "initiationProof",
    "flowRevision",
  ];
  const flow: SharingFlowInput = {
    schemaVersion,
    flowRef: value.flowRef,
    initiationProof: value.initiationProof,
    flowRevision: value.flowRevision,
  };
  if (value.action === "finish") {
    if (
      !exactKeys(value, [...keys, "returnCapability"]) ||
      typeof value.returnCapability !== "string" ||
      !PROOF.test(value.returnCapability)
    ) return null;
    return Object.freeze({
      ...flow,
      action: "finish",
      returnCapability: value.returnCapability,
    });
  }
  if (value.action === "list" || value.action === "cancel_pending") {
    return exactKeys(value, keys)
      ? Object.freeze({ ...flow, action: value.action })
      : null;
  }
  if (
    value.action !== "save" ||
    !exactKeys(value, [...keys, "expectedSharingRevision", "choices"]) ||
    !revision(value.expectedSharingRevision, 0) ||
    !Array.isArray(value.choices) ||
    value.choices.length !== 1
  ) return null;
  const choices: Readonly<
    { choiceRef: string; shareMode: CalendarShareMode }
  >[] = [];
  const seen = new Set<string>();
  for (const choice of value.choices) {
    if (
      !isRecord(choice) || !exactKeys(choice, ["choiceRef", "shareMode"]) ||
      typeof choice.choiceRef !== "string" ||
      !OPAQUE_REF.test(choice.choiceRef) ||
      seen.has(choice.choiceRef) ||
      choice.shareMode !== "full_detail"
    ) return null;
    seen.add(choice.choiceRef);
    choices.push(
      Object.freeze({
        choiceRef: choice.choiceRef,
        shareMode: choice.shareMode,
      }),
    );
  }
  return Object.freeze({
    ...flow,
    action: "save",
    expectedSharingRevision: value.expectedSharingRevision,
    choices: Object.freeze(choices),
  });
}

export type CalendarMutationInput = Readonly<{
  schemaVersion: string;
  bindingRef: string;
  expectedSharingRevision: number;
  selectionRef: string;
  requestRef: string;
  action?: "share";
  accessLevel?: "busy_only" | "calendar_details";
  eventKind?: "water_electrical" | "masonry";
  start?: string;
  end?: string;
  eventRef?: string;
  expectedEventRevision?: number;
}>;

export function parseVendorCalendarMutationRequest(
  value: unknown,
  kind: "share" | "create" | "update",
): CalendarMutationInput | null {
  if (
    !isRecord(value) || value.schemaVersion !== VENDOR_CALENDAR_SHARING_SCHEMA
  ) return null;
  const keys = [
    "schemaVersion",
    "bindingRef",
    "expectedSharingRevision",
    "selectionRef",
    "requestRef",
  ];
  for (const key of ["bindingRef", "selectionRef", "requestRef"]) {
    if (
      typeof value[key] !== "string" || !OPAQUE_REF.test(value[key] as string)
    ) return null;
  }
  if (!revision(value.expectedSharingRevision, 1)) return null;
  if (kind === "share") {
    if (
      !exactKeys(value, [...keys, "action", "accessLevel"]) ||
      value.action !== "share" ||
      (value.accessLevel !== "busy_only" &&
        value.accessLevel !== "calendar_details")
    ) return null;
  } else {
    const extras = kind === "update"
      ? ["eventRef", "expectedEventRevision"]
      : [];
    if (
      !exactKeys(value, [...keys, "eventKind", "start", "end", ...extras]) ||
      (value.eventKind !== "water_electrical" && value.eventKind !== "masonry")
    ) return null;
    for (const key of ["start", "end"]) {
      const v = value[key];
      if (
        typeof v !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u
          .test(v) ||
        !Number.isFinite(Date.parse(v)) ||
        new Date(v.slice(0, 10)).toISOString().slice(0, 10) !==
          v.slice(0, 10) ||
        Number(v.slice(11, 13)) > 23 || Number(v.slice(14, 16)) > 59 ||
        Number(v.slice(17, 19)) > 59
      ) return null;
    }
    const duration = Date.parse(value.end as string) -
      Date.parse(value.start as string);
    if (duration <= 0 || duration > 86400000) return null;
    if (
      kind === "update" &&
      (typeof value.eventRef !== "string" || !OPAQUE_REF.test(value.eventRef) ||
        !revision(value.expectedEventRevision, 1))
    ) return null;
  }
  return Object.freeze({ ...value }) as CalendarMutationInput;
}

export async function readClosedJsonRequest(
  request: Request,
  options: {
    allowedKeys: readonly string[];
    requiredKeys: readonly string[];
    maximumBytes: number;
  },
): Promise<ClosedJsonResult> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/iu.test(contentType)) {
    return { ok: false, status: 415, message: "請使用正確的資料格式。" };
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(declaredLength) && declaredLength > options.maximumBytes
  ) {
    return { ok: false, status: 413, message: "送出的內容過長。" };
  }
  let raw = "";
  try {
    if (request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          total += next.value.byteLength;
          if (total > options.maximumBytes) {
            await reader.cancel();
            return { ok: false, status: 413, message: "送出的內容過長。" };
          }
          chunks.push(next.value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
  } catch {
    return { ok: false, status: 400, message: "無法讀取送出的內容。" };
  }
  if (new TextEncoder().encode(raw).byteLength > options.maximumBytes) {
    return { ok: false, status: 413, message: "送出的內容過長。" };
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, message: "送出的內容格式不正確。" };
  }
  if (!isRecord(value)) {
    return { ok: false, status: 400, message: "送出的內容格式不正確。" };
  }
  const allowed = new Set(options.allowedKeys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return { ok: false, status: 400, message: "送出的內容包含未允許的欄位。" };
  }
  if (options.requiredKeys.some((key) => !Object.hasOwn(value, key))) {
    return { ok: false, status: 400, message: "請補齊必要內容。" };
  }
  return { ok: true, value };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(
  input: Record<string, unknown>,
  key: string,
  options: { minimum?: number; maximum?: number; optional?: boolean } = {},
): string | null {
  const value = input[key];
  if (options.optional && (value === undefined || value === null)) return "";
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (options.optional && trimmed.length === 0) return "";
  const minimum = options.minimum ?? 1;
  const maximum = options.maximum ?? 2000;
  if (trimmed.length < minimum || trimmed.length > maximum) return null;
  for (const character of trimmed) {
    const code = character.charCodeAt(0);
    if (
      code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) ||
      code === 127
    ) {
      return null;
    }
  }
  return trimmed;
}

export function jsonResponse(
  status: number,
  payload: unknown,
  origin?: string | null,
): Response {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "Origin";
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

export function productErrorResponse(
  status: number,
  state: string,
  message: string,
  origin?: string | null,
): Response {
  return jsonResponse(status, { state, message }, origin);
}

export function callbackHtmlResponse(
  status: number,
  title: string,
  message: string,
): Response {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const html =
    `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>body{font-family:system-ui,sans-serif;margin:0;background:#171512;color:#f4efe7;display:grid;min-height:100vh;place-items:center}.panel{max-width:32rem;padding:2rem}h1{font-size:1.5rem}p{line-height:1.7;color:#cfc5b8}</style></head><body><main class="panel"><h1>${safeTitle}</h1><p>${safeMessage}</p></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character] ?? character);
}
