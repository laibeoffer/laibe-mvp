import { verifyAuthSession } from "../_shared/auth-session/verified-auth-session.ts";
import {
  createOwnerCalendarEventsReadHandler,
  createOwnerCalendarRuntimeDependencies,
  type PrivateOwnerCalendarProjection,
} from "../_shared/vendor-google-calendar-support/owner-runtime.ts";

const PCM_ORIGIN =
  "https://laibe-drs-original-a4-20260901.blueleft120.chatgpt.site";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;
const READ_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.owned.readonly",
] as const;

export type PcmReadyProjection = Readonly<{
  state: "ready";
  caseId: string;
  vendorUserId: string;
  bindingRef: string;
  sharingRevision: number;
  credentialGeneration: number;
  credentialDomain: string;
  googleSubject: string;
  encryptedCredential: string;
  tokenExpiresAt: string;
  grantedScopes: readonly string[];
  selections: readonly Readonly<{
    selectionRef: string;
    calendarId: string;
    shareMode: "full_detail";
  }>[];
}>;

export type PcmProjection =
  | PcmReadyProjection
  | Readonly<{
    state:
      | "not_shared"
      | "authority_denied"
      | "case_selection_required"
      | "temporarily_unavailable";
    caseId?: string;
  }>;

type OwnerRead = Readonly<{
  state: string;
  caseId?: string;
  complete?: boolean;
  events?: readonly unknown[];
}>;

type MaybePromise<T> = T | Promise<T>;

export type PcmCalendarDependencies = Readonly<{
  allowedOrigin: string;
  authenticate: (request: Request) => MaybePromise<
    | Readonly<{ userId: string }>
    | Readonly<{ state: "denied" | "unavailable" }>
    | null
  >;
  loadProjection: (userId: string) => MaybePromise<PcmProjection>;
  readOwnerEvents: (
    input: Readonly<{
      request: Request;
      userId: string;
      caseId: string;
      timeMin: string;
      timeMax: string;
    }>,
  ) => MaybePromise<OwnerRead>;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function unsafeText(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (
      (code < 0x20 && code !== 9 && code !== 10 && code !== 13) ||
      code === 0x7f ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    ) return true;
  }
  return false;
}

function response(
  request: Request,
  allowedOrigin: string,
  body: Record<string, unknown>,
  status = 200,
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    vary: "Origin",
  });
  if (request.headers.get("origin") === allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function requestGate(request: Request, allowedOrigin: string): Response | null {
  const origin = request.headers.get("origin");
  if (origin && origin !== allowedOrigin) {
    return response(
      request,
      allowedOrigin,
      { state: "CASE_NOT_AUTHORIZED" },
      403,
    );
  }
  if (request.method === "OPTIONS") {
    if (!origin) {
      return response(
        request,
        allowedOrigin,
        { state: "INVALID_REQUEST" },
        400,
      );
    }
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": allowedOrigin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "authorization, apikey, content-type",
        "access-control-max-age": "600",
        vary: "Origin",
      },
    });
  }
  if (request.method !== "POST" || new URL(request.url).search) {
    return response(request, allowedOrigin, { state: "INVALID_REQUEST" }, 400);
  }
  return null;
}

async function boundedJson(
  input: Request | Response,
  limit: number,
): Promise<unknown> {
  if (!input.body) throw new Error("Missing JSON body");
  const reader = input.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) throw new Error("JSON body too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function validWindow(timeMin: unknown, timeMax: unknown): timeMin is string {
  if (
    typeof timeMin !== "string" || typeof timeMax !== "string" ||
    timeMin.length > 40 || timeMax.length > 40 ||
    !DATE_TIME.test(timeMin) || !DATE_TIME.test(timeMax)
  ) return false;
  const start = Date.parse(timeMin);
  const end = Date.parse(timeMax);
  return Number.isFinite(start) && Number.isFinite(end) &&
    end > start && end - start <= 32 * 86_400_000;
}

function projectionIdentity(value: PcmReadyProjection): string {
  return JSON.stringify([
    value.caseId,
    value.vendorUserId,
    value.bindingRef,
    value.sharingRevision,
    value.credentialGeneration,
    value.credentialDomain,
    value.googleSubject,
    value.grantedScopes,
    value.selections,
  ]);
}

function unavailable(
  request: Request,
  deps: PcmCalendarDependencies,
): Response {
  return response(request, deps.allowedOrigin, {
    state: "TEMPORARILY_UNAVAILABLE",
  }, 503);
}

function nonReady(
  request: Request,
  deps: PcmCalendarDependencies,
  projection: PcmProjection,
): Response {
  if (projection.state === "not_shared") {
    return response(request, deps.allowedOrigin, { state: "DISCONNECTED" });
  }
  if (projection.state === "case_selection_required") {
    return response(request, deps.allowedOrigin, {
      state: "CASE_SELECTION_REQUIRED",
    }, 409);
  }
  if (projection.state === "authority_denied") {
    return response(request, deps.allowedOrigin, {
      state: "CASE_NOT_AUTHORIZED",
    }, 403);
  }
  return unavailable(request, deps);
}

async function authorizedProjection(
  request: Request,
  deps: PcmCalendarDependencies,
): Promise<
  | Readonly<{ userId: string; projection: PcmReadyProjection }>
  | Response
> {
  const authenticated = await deps.authenticate(request);
  if (!authenticated || "state" in authenticated) {
    return authenticated?.state === "unavailable"
      ? unavailable(request, deps)
      : response(
        request,
        deps.allowedOrigin,
        { state: "SIGN_IN_REQUIRED" },
        401,
      );
  }
  if (!UUID.test(authenticated.userId)) {
    return response(
      request,
      deps.allowedOrigin,
      { state: "SIGN_IN_REQUIRED" },
      401,
    );
  }
  const projection = await deps.loadProjection(authenticated.userId);
  if (projection.state !== "ready") return nonReady(request, deps, projection);
  if (
    !UUID.test(projection.caseId) ||
    !UUID.test(projection.vendorUserId) ||
    !UUID.test(projection.bindingRef) ||
    !Number.isSafeInteger(projection.sharingRevision) ||
    projection.sharingRevision < 1 ||
    !Number.isSafeInteger(projection.credentialGeneration) ||
    projection.credentialGeneration < 1 ||
    projection.selections.length !== 1 ||
    projection.selections[0].shareMode !== "full_detail" ||
    !UUID.test(projection.selections[0].selectionRef) ||
    !projection.selections[0].calendarId.trim() ||
    !projection.googleSubject.trim() ||
    !projection.credentialDomain.trim() ||
    !projection.encryptedCredential.trim() ||
    READ_SCOPES.length !== projection.grantedScopes.length ||
    !READ_SCOPES.every((scope) => projection.grantedScopes.includes(scope))
  ) return unavailable(request, deps);
  return { userId: authenticated.userId, projection };
}

function safeText(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.length <= maxLength &&
      !unsafeText(value)
    ? value
    : null;
}

function safeEvent(value: unknown): Record<string, unknown> | null {
  const event = record(value);
  if (!event) return null;
  const title = safeText(event.title, 1_024);
  const description = safeText(event.description, 16_384);
  const location = safeText(event.location, 2_048);
  if (
    title === null || description === null || location === null ||
    typeof event.start !== "string" || typeof event.end !== "string" ||
    event.start.length > 40 || event.end.length > 40 ||
    !(DATE_TIME.test(event.start) || DATE_ONLY.test(event.start)) ||
    !(DATE_TIME.test(event.end) || DATE_ONLY.test(event.end)) ||
    !Number.isFinite(Date.parse(event.start)) ||
    !Number.isFinite(Date.parse(event.end)) ||
    Date.parse(event.end) <= Date.parse(event.start) ||
    typeof event.allDay !== "boolean"
  ) return null;
  return {
    title,
    description,
    location,
    startsAt: event.start,
    endsAt: event.end,
    allDay: event.allDay,
  };
}

export function createPcmCalendarGrantHandler(deps: PcmCalendarDependencies) {
  return async (request: Request): Promise<Response> => {
    const gate = requestGate(request, deps.allowedOrigin);
    if (gate) return gate;
    let body: unknown;
    try {
      body = await boundedJson(request, 1_024);
    } catch {
      return response(
        request,
        deps.allowedOrigin,
        { state: "INVALID_REQUEST" },
        400,
      );
    }
    const parsed = record(body);
    if (!parsed || Object.keys(parsed).length !== 0) {
      return response(
        request,
        deps.allowedOrigin,
        { state: "INVALID_REQUEST" },
        400,
      );
    }
    try {
      const result = await authorizedProjection(request, deps);
      if (result instanceof Response) return result;
      return response(request, deps.allowedOrigin, {
        state: "READY",
        grant: {
          schemaVersion: "laibe.drs-calendar-read.v1",
          caseId: result.projection.caseId,
          accessMode: "read_only",
          connectionStatus: "connected",
          timeZone: "Asia/Taipei",
        },
      });
    } catch {
      return unavailable(request, deps);
    }
  };
}

export function createPcmCalendarEventsReadHandler(
  deps: PcmCalendarDependencies,
) {
  return async (request: Request): Promise<Response> => {
    const gate = requestGate(request, deps.allowedOrigin);
    if (gate) return gate;
    let body: Record<string, unknown> | null;
    try {
      body = record(await boundedJson(request, 2_048));
    } catch {
      return response(
        request,
        deps.allowedOrigin,
        { state: "INVALID_REQUEST" },
        400,
      );
    }
    if (
      !body || Object.keys(body).sort().join(",") !== "timeMax,timeMin" ||
      !validWindow(body.timeMin, body.timeMax)
    ) {
      return response(
        request,
        deps.allowedOrigin,
        { state: "INVALID_REQUEST" },
        400,
      );
    }
    const timeMin = body.timeMin as string;
    const timeMax = body.timeMax as string;
    try {
      const initial = await authorizedProjection(request, deps);
      if (initial instanceof Response) return initial;
      const owner = await deps.readOwnerEvents({
        request,
        userId: initial.userId,
        caseId: initial.projection.caseId,
        timeMin,
        timeMax,
      });
      if (
        owner.state !== "ready" || owner.complete !== true ||
        owner.caseId !== initial.projection.caseId ||
        !Array.isArray(owner.events) || owner.events.length > 500
      ) return unavailable(request, deps);
      const current = await deps.loadProjection(initial.userId);
      if (
        current.state !== "ready" ||
        projectionIdentity(current) !== projectionIdentity(initial.projection)
      ) return unavailable(request, deps);
      const events = owner.events.map(safeEvent);
      if (events.some((event) => event === null)) {
        return unavailable(request, deps);
      }
      return response(request, deps.allowedOrigin, {
        state: "READY",
        caseId: initial.projection.caseId,
        timeZone: "Asia/Taipei",
        window: { timeMin, timeMax },
        events,
      });
    } catch {
      return unavailable(request, deps);
    }
  };
}

function normalizedProjection(value: unknown): PcmProjection {
  const raw = record(value);
  if (!raw || raw.ok !== true) {
    return {
      state: raw?.state === "case_selection_required"
        ? "case_selection_required"
        : raw?.state === "authority_denied"
        ? "authority_denied"
        : "temporarily_unavailable",
    };
  }
  if (raw.state === "not_shared" && typeof raw.case_id === "string") {
    return { state: "not_shared", caseId: raw.case_id };
  }
  if (raw.state !== "ready" || !Array.isArray(raw.selections)) {
    return { state: "temporarily_unavailable" };
  }
  const selection = record(raw.selections[0]);
  if (
    raw.selections.length !== 1 || !selection ||
    typeof selection.selection_ref !== "string" ||
    typeof selection.calendar_id !== "string" ||
    selection.share_mode !== "full_detail" ||
    typeof raw.case_id !== "string" ||
    typeof raw.vendor_user_id !== "string" ||
    typeof raw.binding_ref !== "string" ||
    typeof raw.credential_domain !== "string" ||
    typeof raw.google_subject !== "string" ||
    typeof raw.encrypted_credential !== "string" ||
    typeof raw.token_expires_at !== "string" ||
    !Array.isArray(raw.granted_scopes)
  ) return { state: "temporarily_unavailable" };
  return {
    state: "ready",
    caseId: raw.case_id,
    vendorUserId: raw.vendor_user_id,
    bindingRef: raw.binding_ref,
    sharingRevision: Number(raw.sharing_revision),
    credentialGeneration: Number(raw.credential_generation),
    credentialDomain: raw.credential_domain,
    googleSubject: raw.google_subject,
    encryptedCredential: raw.encrypted_credential,
    tokenExpiresAt: raw.token_expires_at,
    grantedScopes: raw.granted_scopes,
    selections: [{
      selectionRef: selection.selection_ref,
      calendarId: selection.calendar_id,
      shareMode: "full_detail",
    }],
  };
}

type ProductionOptions = Readonly<{
  supabaseUrl: string;
  serviceRoleKey: string;
  fetch?: typeof globalThis.fetch;
  ownerDependencies?: ReturnType<typeof createOwnerCalendarRuntimeDependencies>;
}>;

function runtimeConfig(options?: ProductionOptions) {
  const supabaseUrl = options?.supabaseUrl ?? Deno.env.get("SUPABASE_URL") ??
    "";
  const serviceRoleKey = options?.serviceRoleKey ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  try {
    const url = new URL(supabaseUrl);
    if (
      url.protocol === "https:" && url.origin === supabaseUrl &&
      serviceRoleKey.length > 0
    ) return { supabaseUrl, serviceRoleKey };
  } catch { /* Configuration remains unavailable. */ }
  return null;
}

export function createPcmCalendarProductionDependencies(
  options?: ProductionOptions,
): PcmCalendarDependencies {
  const config = runtimeConfig(options);
  const fetchImplementation = options?.fetch ?? globalThis.fetch;
  const loadProjection = async (userId: string): Promise<PcmProjection> => {
    if (!config) return { state: "temporarily_unavailable" };
    try {
      const result = await fetchImplementation(
        `${config.supabaseUrl}/rest/v1/rpc/pcm_vendor_google_calendar_projection_v1`,
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(5_000),
          headers: {
            apikey: config.serviceRoleKey,
            authorization: `Bearer ${config.serviceRoleKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ p_authenticated_user_id: userId }),
        },
      );
      if (!result.ok) {
        await result.body?.cancel();
        return { state: "temporarily_unavailable" };
      }
      return normalizedProjection(await boundedJson(result, 65_536));
    } catch {
      return { state: "temporarily_unavailable" };
    }
  };
  return {
    allowedOrigin: PCM_ORIGIN,
    authenticate: async (request) => {
      if (!config) return { state: "unavailable" };
      const result = await verifyAuthSession(request, {
        ...config,
        fetch: fetchImplementation,
      });
      return result.state === "verified"
        ? { userId: result.session.userId }
        : { state: result.state };
    },
    loadProjection,
    readOwnerEvents: async ({ request, userId, caseId, timeMin, timeMax }) => {
      const ownerDependencies = options?.ownerDependencies ??
        createOwnerCalendarRuntimeDependencies();
      const loadOwnerProjection = async (): Promise<
        PrivateOwnerCalendarProjection
      > => {
        const value = await loadProjection(userId);
        if (value.state === "ready" && value.caseId === caseId) return value;
        return {
          state: "not_shared",
          caseId,
          sharingRevision: null,
          selections: [],
        };
      };
      const inner = createOwnerCalendarEventsReadHandler({
        ...ownerDependencies,
        allowedOrigins: [PCM_ORIGIN],
        authorize: () => Promise.resolve({ userId, caseId }),
        loadProjection: loadOwnerProjection,
      });
      const headers = new Headers(request.headers);
      headers.set("content-type", "application/json");
      const translated = new Request(request.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          schemaVersion: "laibe.owner-vendor-calendar-read.v1",
          timeMin,
          timeMax,
        }),
      });
      const result = await inner(translated);
      if (!result.ok) {
        await result.body?.cancel();
        return { state: "unavailable" };
      }
      const body = record(await boundedJson(result, 10 * 1024 * 1024));
      return {
        state: typeof body?.state === "string" ? body.state : "unavailable",
        caseId: typeof body?.caseId === "string" ? body.caseId : undefined,
        complete: body?.complete === true,
        events: Array.isArray(body?.events) ? body.events : undefined,
      };
    },
  };
}

export function createHandler() {
  return createPcmCalendarEventsReadHandler(
    createPcmCalendarProductionDependencies(),
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createHandler());
}
