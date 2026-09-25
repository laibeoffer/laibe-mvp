import {
  callbackHtmlResponse,
  isRecord,
  jsonResponse,
  parseVendorCalendarMutationRequest,
  parseVendorCalendarSharingRequest,
  readClosedJsonRequest,
  VENDOR_CALENDAR_CALLBACK_URI,
  VENDOR_CALENDAR_GOOGLE_SCOPES,
  VENDOR_CALENDAR_SHARING_SCHEMA as SCHEMA,
  VENDOR_CALENDAR_SITE_ORIGIN,
  type VendorCalendarSharingRequest,
} from "./contracts.ts";
import {
  createVendorCalendarAuthorizer,
  sameCalendarContext,
  type VendorCalendarAuthorization,
  type VendorCalendarContext,
} from "./authorization.ts";
import {
  type CalendarCredential,
  calendarEventReference,
  createGoogleCalendarProvider,
  digestVendorCalendarOAuthState,
  issueVendorCalendarOAuthMaterial,
  sealCalendarV2,
  unsealCalendarV2,
} from "./google-provider.ts";

type Principal = Pick<
  VendorCalendarContext,
  "userId" | "authSessionId" | "caseId"
>;
type Flow = Record<string, unknown> & {
  id: string;
  user_id: string;
  auth_session_id: string;
  case_id: string;
  client_domain: string;
  flow_revision: number;
  expected_credential_generation: number;
  expires_at: string;
  google_subject: string | null;
  expected_google_subject: string | null;
  sealed_verifier: string | null;
  quarantined_credential: string | null;
};
type RuntimeOptions = {
  env?: { get(name: string): string | undefined };
  fetch?: typeof fetch;
  now?: () => number;
};
export type RuntimeDependencies = {
  allowedOrigins: readonly string[];
  callbackUri: string;
  now: () => number;
  configured: boolean;
  domain: Promise<string>;
  authorizeRequest(request: Request): Promise<VendorCalendarAuthorization>;
  dispatch(
    action: string,
    context: Principal | null,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  provider: ReturnType<typeof createGoogleCalendarProvider>;
  seal(value: unknown, binding: Record<string, unknown>): Promise<string>;
  unseal<T>(value: string, binding: Record<string, unknown>): Promise<T>;
  eventReference(
    bindingRef: string,
    selectionRef: string,
    providerId: string,
    start: string,
  ): Promise<string>;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const GOOGLE_SCOPES = VENDOR_CALENDAR_GOOGLE_SCOPES;
class CalendarFailure extends Error {
  readonly state: string;
  readonly status: number;
  constructor(state: string, status = 409) {
    super(state);
    this.state = state;
    this.status = status;
  }
}
function fail(state: string, status = 409): never {
  throw new CalendarFailure(state, status);
}
function ref(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
function number(value: unknown, min = 0): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) &&
    value >= min;
}
function string(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length <= maximum && !/\p{C}/u.test(value);
}
function origin(request: Request, d: RuntimeDependencies) {
  const value = request.headers.get("origin");
  return value && d.allowedOrigins.includes(value) ? value : null;
}
function failureResponse(
  request: Request,
  d: RuntimeDependencies,
  error: unknown,
): Response {
  const state = error instanceof CalendarFailure
    ? error.state
    : "setup_unavailable";
  const messages: Record<string, string> = {
    sign_in_required: "請重新登入後再連結日曆。",
    session_changed: "登入狀態已變更，請重新開始連線。",
    case_not_authorized: "目前帳號無法使用本案件的日曆。",
    CASE_SELECTION_REQUIRED: "請先確認目前要使用的案件。",
    context_changed: "目前案件已變更，請回到案件工作台重新確認。",
    flow_invalid: "這次連線已失效，請重新開始。",
    flow_expired: "這次連線已逾時，請重新開始。",
    revision_conflict: "分享設定已變更，請重新確認。",
    reconsent_required: "請重新授權 Google 日曆，並選擇願意分享的內容。",
    reconnect_required: "請重新連結 Google 日曆，並確認分享設定。",
    scope_not_supported: "目前的日曆授權不符所需範圍，請重新確認授權。",
    provider_unavailable: "目前無法讀取 Google 日曆，請稍後再試。",
    incomplete: "目前無法完整取得日曆內容，請稍後再試。",
    protocol_upgrade_required: "日曆連線方式已更新，請從案件工作台重新開始。",
    read_only_sharing: "此處僅供檢視日曆；如需調整行程，請前往 Google 日曆。",
    recipient_not_authorized:
      "本案件的日曆分享對象尚未確認，請聯繫案件負責人。",
    operation_pending: "上次日曆操作尚待確認，請重試原操作，避免重複建立行程。",
    origin_not_allowed: "此來源無法使用案件日曆。",
    invalid_request: "請重新確認送出的日曆設定。",
    setup_unavailable: "目前無法完成日曆連線，請稍後再試。",
  };
  const safeState = Object.hasOwn(messages, state)
    ? state
    : "setup_unavailable";
  const retryable = [
    "setup_unavailable",
    "provider_unavailable",
    "incomplete",
    "operation_pending",
  ].includes(safeState);
  return jsonResponse(error instanceof CalendarFailure ? error.status : 503, {
    schemaVersion: SCHEMA,
    state: safeState,
    message: messages[safeState],
    retryable,
  }, origin(request, d));
}
function preflight(request: Request, d: RuntimeDependencies): Response | null {
  if (request.method !== "OPTIONS") return null;
  const accepted = origin(request, d);
  const headers = (request.headers.get("access-control-request-headers") ?? "")
    .split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (
    !accepted ||
    request.headers.get("access-control-request-method") !== "POST" ||
    headers.some((x) =>
      !["authorization", "apikey", "content-type"].includes(x)
    )
  ) {
    const rejected = failureResponse(
      request,
      d,
      new CalendarFailure("origin_not_allowed", 403),
    );
    rejected.headers.delete("access-control-allow-origin");
    return rejected;
  }
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": accepted,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, apikey, content-type",
      "access-control-max-age": "600",
      "cache-control": "no-store",
      vary: "Origin",
    },
  });
}
function handler(
  d: RuntimeDependencies,
  keys: readonly string[],
  required: readonly string[],
  action: (request: Request, body: Record<string, unknown>) => Promise<unknown>,
) {
  return async (request: Request): Promise<Response> => {
    const options = preflight(request, d);
    if (options) return options;
    try {
      if (request.method !== "POST") fail("invalid_request", 405);
      if (!origin(request, d)) fail("origin_not_allowed", 403);
      const parsed = await readClosedJsonRequest(request, {
        allowedKeys: keys,
        requiredKeys: required.filter((key) => key !== "schemaVersion"),
        maximumBytes: 4096,
      });
      if (!parsed.ok) fail("invalid_request", parsed.status);
      if (parsed.value.schemaVersion !== SCHEMA) {
        fail("protocol_upgrade_required", 409);
      }
      const result = await action(request, parsed.value);
      return jsonResponse(200, result, origin(request, d));
    } catch (error) {
      return failureResponse(request, d, error);
    }
  };
}
async function authorize(
  request: Request,
  d: RuntimeDependencies,
  expected?: Principal,
): Promise<VendorCalendarContext> {
  if (!request.headers.get("authorization")) fail("sign_in_required", 401);
  if (!d.configured) fail("setup_unavailable", 503);
  const result = await d.authorizeRequest(request);
  if (!result.ok) fail(result.state, result.status);
  if (
    expected &&
    !sameCalendarContext(result.context, expected as VendorCalendarContext)
  ) fail("session_changed", 401);
  return result.context;
}
function checked(value: Record<string, unknown>): Record<string, unknown> {
  if (value.ok !== true) {
    const state = typeof value.state === "string"
      ? value.state
      : "setup_unavailable";
    const status = value.rate_limited === true
      ? 429
      : state === "CASE_SELECTION_REQUIRED"
      ? 409
      : ["session_changed", "sign_in_required"].includes(state)
      ? 401
      : ["case_not_authorized", "recipient_not_authorized"].includes(state)
      ? 403
      : ["setup_unavailable", "provider_unavailable"].includes(state)
      ? 503
      : 409;
    fail(state, status);
  }
  return value;
}
async function call(
  request: Request,
  d: RuntimeDependencies,
  action: string,
  input: Record<string, unknown>,
  expected?: Principal,
) {
  const context = await authorize(request, d, expected);
  const value = checked(await d.dispatch(action, context, input));
  return { context, value };
}
function flow(
  value: unknown,
  expected: Principal | undefined,
  domain: string,
  now: number,
): Flow {
  if (
    !isRecord(value) || !ref(value.id) || !ref(value.user_id) ||
    !ref(value.auth_session_id) || !ref(value.case_id) ||
    value.client_domain !== domain || !number(value.flow_revision, 1) ||
    !number(value.expected_credential_generation) ||
    typeof value.expires_at !== "string" ||
    !Number.isFinite(Date.parse(value.expires_at)) ||
    Date.parse(value.expires_at) <= now
  ) fail("flow_invalid");
  if (
    expected &&
    (value.user_id !== expected.userId ||
      value.auth_session_id !== expected.authSessionId ||
      value.case_id !== expected.caseId)
  ) fail("session_changed", 401);
  return value as Flow;
}
function principal(value: Flow): Principal {
  return {
    userId: value.user_id,
    authSessionId: value.auth_session_id,
    caseId: value.case_id,
  };
}
function verifierBinding(owner: Principal, id: string, domain: string) {
  return {
    kind: "verifier",
    owner: owner.userId,
    session: owner.authSessionId,
    case: owner.caseId,
    flow: id,
    domain,
  };
}
function pendingBinding(value: Flow, subject: string) {
  return {
    kind: "pending",
    owner: value.user_id,
    session: value.auth_session_id,
    case: value.case_id,
    flow: value.id,
    subject,
    domain: value.client_domain,
    generation: value.expected_credential_generation + 1,
  };
}
function credentialBinding(
  owner: string,
  subject: string,
  domain: string,
  generation: number,
) {
  return { kind: "credential", owner, subject, domain, generation };
}
function credential(value: unknown): CalendarCredential {
  if (
    !isRecord(value) || !string(value.accessToken, 16384) ||
    typeof value.refreshToken !== "string" ||
    value.refreshToken.length > 16384 ||
    typeof value.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    !Array.isArray(value.scopes) ||
    value.scopes.length !== GOOGLE_SCOPES.length ||
    new Set(value.scopes).size !== GOOGLE_SCOPES.length ||
    value.scopes.some((x) => !GOOGLE_SCOPES.includes(x))
  ) fail("reconsent_required");
  return value as CalendarCredential;
}
function freshProof(): string {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  ).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function flowResult(value: Record<string, unknown>, expectedRef: string) {
  if (
    value.flow_ref !== expectedRef || !number(value.flow_revision, 1) ||
    typeof value.expires_at !== "string"
  ) fail("setup_unavailable", 503);
  return {
    schemaVersion: SCHEMA,
    state: "selection_required",
    flowRef: value.flow_ref,
    flowRevision: value.flow_revision,
    expiresAt: value.expires_at,
  };
}
function bindingResult(value: Record<string, unknown>) {
  if (
    !["unlinked", "connected", "reconnect_required"].includes(
      String(value.state),
    )
  ) fail("setup_unavailable", 503);
  const result: Record<string, unknown> = {
    schemaVersion: SCHEMA,
    state: value.state,
    timeZone: "Asia/Taipei",
  };
  if (value.binding_ref !== undefined) {
    if (!ref(value.binding_ref) || !number(value.sharing_revision)) {
      fail("setup_unavailable", 503);
    }
    result.bindingRef = value.binding_ref;
    result.sharingRevision = value.sharing_revision;
  }
  if (value.state === "connected") {
    if (
      !ref(value.binding_ref) || !number(value.sharing_revision, 1) ||
      !Array.isArray(value.selections) || value.selections.length < 1 ||
      value.selections.length > 8
    ) fail("setup_unavailable", 503);
    result.selections = value.selections.map((s) => {
      if (
        !isRecord(s) || !ref(s.selection_ref) || !string(s.label, 200) ||
        !["busy_only", "title_time"].includes(String(s.share_mode))
      ) fail("setup_unavailable", 503);
      return {
        selectionRef: s.selection_ref,
        label: s.label,
        shareMode: s.share_mode,
      };
    });
    result.capabilities = ["read"];
    if (isRecord(value.recipient_policy)) {
      const recipients = value.recipient_policy.recipients;
      if (
        !Array.isArray(recipients) || recipients.length !== 2 ||
        new Set(recipients).size !== 2 ||
        recipients.some((x) => !string(x, 254))
      ) fail("setup_unavailable", 503);
      result.capabilities = ["read", "share", "create", "update"];
      result.sharingRecipients = [...recipients];
      result.accessLevels = ["busy_only", "calendar_details"];
      if (
        value.pending_operation !== null &&
        value.pending_operation !== undefined
      ) {
        const pending = value.pending_operation;
        if (
          !isRecord(pending) ||
          !["share", "create", "update"].includes(String(pending.kind)) ||
          !isRecord(pending.request_payload)
        ) fail("setup_unavailable", 503);
        const payload = pending.request_payload,
          kind = pending.kind as "share" | "create" | "update";
        const input = {
          schemaVersion: SCHEMA,
          bindingRef: value.binding_ref,
          expectedSharingRevision: pending.sharing_revision,
          selectionRef: pending.selection_ref,
          requestRef: pending.request_ref,
          ...(kind === "share"
            ? { action: "share", accessLevel: payload.access_level }
            : {
              eventKind: payload.event_kind,
              start: payload.start,
              end: payload.end,
              ...(kind === "update"
                ? {
                  eventRef: payload.event_ref,
                  expectedEventRevision: payload.expected_event_revision,
                }
                : {}),
            }),
        };
        const parsed = parseVendorCalendarMutationRequest(input, kind);
        if (!parsed) fail("setup_unavailable", 503);
        result.pendingMutation = { ...parsed, kind };
      }
    }
  }
  return result;
}

export function createVendorCalendarConnectStartHandler(
  d: RuntimeDependencies,
) {
  return handler(
    d,
    ["schemaVersion", "bindingRef", "expectedSharingRevision"],
    ["schemaVersion"],
    async (request, body) => {
      if (
        (body.bindingRef !== undefined && !ref(body.bindingRef)) ||
        (body.expectedSharingRevision !== undefined &&
          !number(body.expectedSharingRevision)) ||
        (body.bindingRef !== undefined) !==
          (body.expectedSharingRevision !== undefined)
      ) fail("invalid_request", 400);
      const context = await authorize(request, d),
        domain = await d.domain,
        flowRef = crypto.randomUUID();
      const material = await issueVendorCalendarOAuthMaterial({
        nowMs: d.now(),
      });
      const initiationProof = freshProof();
      const payload: Record<string, unknown> = {
        flow_ref: flowRef,
        state_digest: material.stateDigest,
        initiation_digest: await digestVendorCalendarOAuthState(
          initiationProof,
        ),
        sealed_verifier: await d.seal(
          { codeVerifier: material.codeVerifier },
          verifierBinding(context, flowRef, domain),
        ),
        expires_at: material.expiresAt,
      };
      if (body.bindingRef !== undefined) {
        payload.binding_ref = body.bindingRef;
        payload.expected_sharing_revision = body.expectedSharingRevision;
      }
      const saved = checked(await d.dispatch("start", context, payload));
      if (
        saved.flow_ref !== flowRef || !number(saved.flow_revision, 1) ||
        typeof saved.expires_at !== "string"
      ) fail("setup_unavailable", 503);
      const authorizationUrl = d.provider.createAuthorizationUrl({
        state: material.state,
        codeChallenge: material.codeChallenge,
      });
      const parsed = new URL(authorizationUrl);
      if (
        parsed.origin !== "https://accounts.google.com" ||
        parsed.pathname !== "/o/oauth2/v2/auth" ||
        parsed.searchParams.get("redirect_uri") !== d.callbackUri
      ) fail("setup_unavailable", 503);
      return {
        schemaVersion: SCHEMA,
        state: "oauth_pending",
        flowRef,
        flowRevision: saved.flow_revision,
        initiationProof,
        expiresAt: saved.expires_at,
        authorizationUrl,
      };
    },
  );
}
export function createVendorCalendarConnectCallbackHandler(
  d: RuntimeDependencies,
) {
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      if (
        request.method !== "GET" ||
        url.origin + url.pathname !== d.callbackUri || !d.configured
      ) fail("flow_invalid");
      const allowed = [
        "state",
        "code",
        "scope",
        "authuser",
        "prompt",
        "error",
        "error_description",
        "error_uri",
      ];
      if (
        [...url.searchParams.keys()].some((key) =>
          !allowed.includes(key) || url.searchParams.getAll(key).length !== 1
        )
      ) fail("flow_invalid");
      if (url.searchParams.has("error")) fail("reconsent_required");
      const state = url.searchParams.get("state"),
        code = url.searchParams.get("code");
      if (
        !state || !/^[A-Za-z0-9_-]{64}$/u.test(state) || !string(code, 8192)
      ) fail("flow_invalid");
      const stateDigest = await digestVendorCalendarOAuthState(state),
        domain = await d.domain;
      const claimed = checked(
        await d.dispatch("callback_claim", null, { state_digest: stateDigest }),
      );
      let pending = flow(claimed.flow, undefined, domain, d.now());
      const opened = await d.unseal<unknown>(
        pending.sealed_verifier ?? "",
        verifierBinding(principal(pending), pending.id, domain),
      );
      if (
        !isRecord(opened) || typeof opened.codeVerifier !== "string" ||
        !/^[A-Za-z0-9_-]{43,128}$/u.test(opened.codeVerifier)
      ) fail("flow_invalid");
      const exchanged = await d.provider.exchangeAuthorizationCode({
        code,
        codeVerifier: opened.codeVerifier,
      });
      if (!exchanged.ok) fail(exchanged.state, 503);
      const proof = {
        flow_ref: pending.id,
        flow_revision: pending.flow_revision,
        state_digest: stateDigest,
      };
      checked(await d.dispatch("callback_check", null, proof));
      const identity = await d.provider.resolveSubject(
        exchanged.credential.accessToken,
      );
      if (!identity.ok) fail(identity.state, 503);
      if (
        pending.expected_google_subject &&
        identity.googleSubject !== pending.expected_google_subject
      ) fail("flow_invalid");
      const baseline = checked(
        await d.dispatch("callback_subject", null, {
          ...proof,
          google_subject: identity.googleSubject,
        }),
      );
      const resolved = flow(baseline.flow, principal(pending), domain, d.now());
      if (
        resolved.id !== pending.id ||
        resolved.flow_revision !== pending.flow_revision ||
        resolved.google_subject !== identity.googleSubject ||
        !((resolved.expected_credential_id === null &&
          resolved.expected_credential_generation === 0) ||
          (ref(resolved.expected_credential_id) &&
            resolved.expected_credential_generation >= 1))
      ) fail("flow_invalid");
      pending = resolved;
      let tokens = credential(exchanged.credential);
      if (!tokens.refreshToken) {
        const reuse = baseline.reuse_credential;
        if (
          !isRecord(reuse) || reuse.id !== pending.expected_credential_id ||
          reuse.user_id !== pending.user_id ||
          reuse.google_subject !== identity.googleSubject ||
          reuse.client_domain !== domain ||
          reuse.credential_generation !==
            pending.expected_credential_generation ||
          reuse.credential_status !== "active" ||
          typeof reuse.encrypted_credential !== "string"
        ) fail("reconsent_required");
        const existing = credential(
          await d.unseal(
            reuse.encrypted_credential,
            credentialBinding(
              pending.user_id,
              identity.googleSubject,
              domain,
              pending.expected_credential_generation,
            ),
          ),
        );
        if (!existing.refreshToken) fail("reconsent_required");
        tokens = { ...tokens, refreshToken: existing.refreshToken };
      }
      const returned = freshProof();
      checked(
        await d.dispatch("callback_complete", null, {
          ...proof,
          google_subject: identity.googleSubject,
          return_digest: await digestVendorCalendarOAuthState(returned),
          quarantined_credential: await d.seal(
            tokens,
            pendingBinding(pending, identity.googleSubject),
          ),
          token_expires_at: tokens.expiresAt,
          granted_scopes: tokens.scopes,
        }),
      );
      return new Response(null, {
        status: 303,
        headers: {
          location: VENDOR_CALENDAR_SITE_ORIGIN +
            "/pcm/vendor/workspace#calendar-return=" + returned,
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
          "content-security-policy":
            "default-src 'none'; frame-ancestors 'none'",
          "x-content-type-options": "nosniff",
        },
      });
    } catch {
      return callbackHtmlResponse(
        400,
        "日曆連線尚未完成",
        "請回到案件工作台重新開始連線，並確認願意分享的日曆與內容。",
      );
    }
  };
}
function sharingInput(
  body: Record<string, unknown>,
): VendorCalendarSharingRequest {
  const parsed = parseVendorCalendarSharingRequest(body);
  if (!parsed) fail("invalid_request", 400);
  return parsed;
}
async function proofInput(
  body: Exclude<VendorCalendarSharingRequest, { action: "unlink" }>,
) {
  return {
    flow_ref: body.flowRef,
    flow_revision: body.flowRevision,
    initiation_digest: await digestVendorCalendarOAuthState(
      body.initiationProof,
    ),
  };
}
export function createVendorCalendarSharingHandler(d: RuntimeDependencies) {
  return handler(
    d,
    [
      "schemaVersion",
      "action",
      "flowRef",
      "flowRevision",
      "initiationProof",
      "returnCapability",
      "choices",
      "expectedSharingRevision",
      "bindingRef",
      "selectionRef",
      "requestRef",
      "accessLevel",
    ],
    ["schemaVersion", "action"],
    async (request, body) => {
      if (body.action === "share") {
        return await performCalendarMutation(
          request,
          body,
          "share",
          d,
        );
      }
      const input = sharingInput(body);
      if (input.action === "unlink") {
        const { value } = await call(request, d, "unlink", {
          binding_ref: input.bindingRef,
          expected_sharing_revision: input.expectedSharingRevision,
        });
        return bindingResult(value);
      }
      const proof = await proofInput(input);
      if (input.action === "finish") {
        const { value } = await call(request, d, "finish", {
          ...proof,
          return_digest: await digestVendorCalendarOAuthState(
            input.returnCapability,
          ),
        });
        return flowResult(value, input.flowRef);
      }
      if (input.action === "cancel_pending") {
        const { value } = await call(request, d, "cancel_pending", proof);
        if (
          value.flow_ref !== input.flowRef || !number(value.flow_revision, 1) ||
          value.state !== "cancelled"
        ) fail("setup_unavailable", 503);
        return {
          schemaVersion: SCHEMA,
          state: "cancelled",
          flowRef: value.flow_ref,
          flowRevision: value.flow_revision,
        };
      }
      const loaded = await call(request, d, "flow_read", proof),
        domain = await d.domain;
      const pending = flow(loaded.value.flow, loaded.context, domain, d.now());
      if (
        pending.id !== input.flowRef ||
        typeof pending.google_subject !== "string" ||
        !Array.isArray(loaded.value.choices)
      ) fail("flow_invalid");
      let current = loaded.value;
      if (input.action === "list" && pending.choices_loaded === true) {
        const checkedAgain = await call(
          request,
          d,
          "flow_read",
          proof,
          loaded.context,
        );
        current = checkedAgain.value;
      } else {
        const tokens = credential(
          await d.unseal(
            pending.quarantined_credential ?? "",
            pendingBinding(pending, pending.google_subject),
          ),
        );
        if (
          Date.parse(tokens.expiresAt) <= d.now() || !tokens.refreshToken
        ) fail("reconsent_required");
        let selected: Record<string, unknown>[] = [];
        if (input.action === "save") {
          selected = input.choices.map((choice) => {
            const cached = (loaded.value.choices as unknown[]).find((c) =>
              isRecord(c) && c.choice_ref === choice.choiceRef
            );
            if (
              !isRecord(cached) || cached.flow_id !== input.flowRef ||
              cached.user_id !== loaded.context.userId ||
              cached.case_id !== loaded.context.caseId ||
              !string(cached.calendar_id, 1024)
            ) fail("flow_invalid");
            return cached;
          });
        }
        const calendars = await d.provider.listOwnedCalendars(
          tokens.accessToken,
        );
        if (!calendars.ok) fail(calendars.state, 503);
        if (input.action === "save") {
          if (
            selected.some((s) =>
              !calendars.calendars.some((c) => c.calendarId === s.calendar_id)
            )
          ) fail("reconsent_required");
          const sealed = await d.seal(
            tokens,
            credentialBinding(
              pending.user_id,
              pending.google_subject,
              domain,
              pending.expected_credential_generation + 1,
            ),
          );
          const saved = await call(request, d, "save", {
            ...proof,
            expected_sharing_revision: input.expectedSharingRevision,
            choices: input.choices.map((c) => ({
              choice_ref: c.choiceRef,
              share_mode: c.shareMode,
            })),
            verified_calendar_ids: calendars.calendars.map((c) => c.calendarId),
            encrypted_credential: sealed,
          }, loaded.context);
          return bindingResult(saved.value);
        }
        current = (await call(request, d, "choices_store", {
          ...proof,
          calendars: calendars.calendars.map((c) => ({
            calendar_id: c.calendarId,
            label: c.label,
            time_zone: c.timeZone,
          })),
        }, loaded.context)).value;
      }
      const currentFlow = flow(current.flow, loaded.context, domain, d.now());
      if (
        !Array.isArray(current.choices) || current.choices.length > 250
      ) fail("setup_unavailable", 503);
      const choices = current.choices.map((c) => {
        if (
          !isRecord(c) || !ref(c.choice_ref) || c.flow_id !== input.flowRef ||
          c.user_id !== loaded.context.userId ||
          c.case_id !== loaded.context.caseId ||
          !string(c.label, 200) || !string(c.time_zone, 100)
        ) fail("flow_invalid");
        return {
          choiceRef: c.choice_ref,
          label: c.label,
          timeZone: c.time_zone,
        };
      });
      return {
        schemaVersion: SCHEMA,
        state: "selection_required",
        flowRef: currentFlow.id,
        flowRevision: currentFlow.flow_revision,
        choices,
        complete: true,
      };
    },
  );
}
export function createVendorCalendarSupportGrantHandler(
  d: RuntimeDependencies,
) {
  return handler(d, ["schemaVersion"], ["schemaVersion"], async (request) => {
    const { value } = await call(request, d, "grant", {});
    return bindingResult(value);
  });
}
export function createVendorCalendarEventsReadHandler(d: RuntimeDependencies) {
  return handler(
    d,
    ["schemaVersion", "bindingRef", "sharingRevision", "timeMin", "timeMax"],
    ["schemaVersion", "bindingRef", "sharingRevision", "timeMin", "timeMax"],
    async (request, body) => {
      if (
        !ref(body.bindingRef) || !number(body.sharingRevision, 1) ||
        typeof body.timeMin !== "string" || typeof body.timeMax !== "string"
      ) {
        fail("invalid_request", 400);
      }
      const started = d.now(),
        expected = {
          binding_ref: body.bindingRef,
          expected_sharing_revision: body.sharingRevision,
        };
      const loaded = await call(request, d, "read_prepare", expected),
        domain = await d.domain;
      let value = loaded.value;
      function validatePrivate() {
        if (
          value.state !== "connected" ||
          value.binding_ref !== body.bindingRef ||
          value.sharing_revision !== body.sharingRevision ||
          value.user_id !== loaded.context.userId ||
          value.case_id !== loaded.context.caseId ||
          value.client_domain !== domain ||
          !number(value.credential_generation, 1) ||
          !string(value.google_subject, 255) ||
          typeof value.encrypted_credential !== "string" ||
          !Array.isArray(value.selections) || value.selections.length < 1 ||
          value.selections.length > 8
        ) {
          fail("reconnect_required");
        }
      }
      validatePrivate();
      let tokens = credential(
        await d.unseal(
          value.encrypted_credential as string,
          credentialBinding(
            loaded.context.userId,
            value.google_subject as string,
            domain,
            value.credential_generation as number,
          ),
        ),
      );
      async function providerFailure(state: string): Promise<never> {
        if (state === "reconnect_required") {
          await call(request, d, "mark_reconnect", {
            ...expected,
            credential_generation: value.credential_generation,
          }, loaded.context);
        }
        return fail(state, 503);
      }
      if (Date.parse(tokens.expiresAt) <= d.now() + 30000) {
        if (!tokens.refreshToken) fail("reconsent_required");
        await call(request, d, "read_check", {
          ...expected,
          credential_generation: value.credential_generation,
        }, loaded.context);
        const refreshed = await d.provider.refreshAccessToken(
          tokens.refreshToken,
          tokens.scopes,
        );
        if (!refreshed.ok) return await providerFailure(refreshed.state);
        const updated = credential(refreshed.credential);
        const sealed = await d.seal(
          updated,
          credentialBinding(
            loaded.context.userId,
            value.google_subject as string,
            domain,
            (value.credential_generation as number) + 1,
          ),
        );
        value = (await call(request, d, "refresh_commit", {
          ...expected,
          credential_generation: value.credential_generation,
          encrypted_credential: sealed,
          token_expires_at: updated.expiresAt,
          granted_scopes: updated.scopes,
        }, loaded.context)).value;
        validatePrivate();
        tokens = updated;
      }
      const selections = (value.selections as unknown[]).map((s) => {
        if (
          !isRecord(s) || !ref(s.selection_ref) ||
          !string(s.calendar_id, 1024) ||
          (s.share_mode !== "busy_only" && s.share_mode !== "title_time")
        ) fail("reconnect_required");
        return {
          selectionRef: s.selection_ref,
          calendarId: s.calendar_id,
          shareMode: s.share_mode,
        } as const;
      });
      await call(request, d, "read_check", {
        ...expected,
        credential_generation: value.credential_generation,
      }, loaded.context);
      const listed = await d.provider.readSelectedEvents({
        accessToken: tokens.accessToken,
        selections,
        timeMin: body.timeMin,
        timeMax: body.timeMax,
      });
      if (!listed.ok) return await providerFailure(listed.state);
      const events = await Promise.all(listed.events.map(async (event) => {
        const selection = selections.find((s) =>
          s.selectionRef === event.selectionRef
        );
        if (!selection) fail("flow_invalid");
        const result: Record<string, unknown> = {
          eventRef: await d.eventReference(
            body.bindingRef as string,
            event.selectionRef,
            event.providerEventId,
            event.start,
          ),
          selectionRef: event.selectionRef,
          allDay: event.allDay,
          start: event.start,
          end: event.end,
        };
        if (selection.shareMode === "title_time") {
          result.title = event.title ?? "";
        }
        return result;
      }));
      await call(request, d, "read_check", {
        ...expected,
        credential_generation: value.credential_generation,
      }, loaded.context);
      if (d.now() - started > 12000) fail("incomplete", 503);
      return {
        schemaVersion: SCHEMA,
        state: "ready",
        bindingRef: body.bindingRef,
        sharingRevision: body.sharingRevision,
        credentialGeneration: value.credential_generation,
        timeZone: "Asia/Taipei",
        events,
        complete: true,
      };
    },
  );
}
function readOnlyMutation(d: RuntimeDependencies) {
  return (request: Request): Response =>
    preflight(request, d) ??
      failureResponse(
        request,
        d,
        new CalendarFailure("read_only_sharing", 403),
      );
}
async function performCalendarMutation(
  request: Request,
  body: Record<string, unknown>,
  kind: "share" | "create" | "update",
  d: RuntimeDependencies,
) {
  const input = parseVendorCalendarMutationRequest(body, kind);
  if (!input) fail("invalid_request", 400);
  const expected = {
    binding_ref: input.bindingRef,
    expected_sharing_revision: input.expectedSharingRevision,
  };
  const loaded = await call(request, d, "read_prepare", expected),
    domain = await d.domain;
  let value = loaded.value;
  function validateCredential() {
    if (
      value.state !== "connected" || value.binding_ref !== input!.bindingRef ||
      value.sharing_revision !== input!.expectedSharingRevision ||
      value.user_id !== loaded.context.userId ||
      value.case_id !== loaded.context.caseId ||
      value.client_domain !== domain ||
      !number(value.credential_generation, 1) ||
      !string(value.google_subject, 255) ||
      typeof value.encrypted_credential !== "string" ||
      !Array.isArray(value.selections)
    ) fail("reconnect_required");
  }
  validateCredential();
  let tokens = credential(
    await d.unseal(
      value.encrypted_credential as string,
      credentialBinding(
        loaded.context.userId,
        value.google_subject as string,
        domain,
        value.credential_generation as number,
      ),
    ),
  );
  async function providerFailure(state: string): Promise<never> {
    if (state === "reconnect_required") {
      await call(request, d, "mark_reconnect", {
        ...expected,
        credential_generation: value.credential_generation,
      }, loaded.context);
    }
    return fail(
      state === "not_found" ? "revision_conflict" : state,
      state === "revision_conflict" ? 409 : 503,
    );
  }
  if (Date.parse(tokens.expiresAt) <= d.now() + 30000) {
    if (!tokens.refreshToken) fail("reconsent_required");
    await call(request, d, "read_check", {
      ...expected,
      credential_generation: value.credential_generation,
    }, loaded.context);
    const refreshed = await d.provider.refreshAccessToken(
      tokens.refreshToken,
      tokens.scopes,
    );
    if (!refreshed.ok) return await providerFailure(refreshed.state);
    tokens = credential(refreshed.credential);
    const sealed = await d.seal(
      tokens,
      credentialBinding(
        loaded.context.userId,
        value.google_subject as string,
        domain,
        (value.credential_generation as number) + 1,
      ),
    );
    value = (await call(request, d, "refresh_commit", {
      ...expected,
      credential_generation: value.credential_generation,
      encrypted_credential: sealed,
      token_expires_at: tokens.expiresAt,
      granted_scopes: tokens.scopes,
    }, loaded.context)).value;
    validateCredential();
  }
  const selection = (value.selections as unknown[]).find((x) =>
    isRecord(x) && x.selection_ref === input.selectionRef
  );
  if (!isRecord(selection) || !string(selection.calendar_id, 1024)) {
    fail("revision_conflict");
  }
  const checkInput = {
    ...expected,
    selection_ref: input.selectionRef,
    credential_generation: value.credential_generation,
  };
  const requestPayload = kind === "share"
    ? { access_level: input.accessLevel }
    : {
      event_kind: input.eventKind,
      start: input.start,
      end: input.end,
      ...(kind === "update"
        ? {
          event_ref: input.eventRef,
          expected_event_revision: input.expectedEventRevision,
        }
        : {}),
    };
  const prepared = await call(request, d, "mutation_prepare", {
    ...checkInput,
    kind,
    request_ref: input.requestRef,
    request_payload: requestPayload,
  }, loaded.context);
  const op = prepared.value.operation;
  if (
    !isRecord(op) || !ref(op.operation_ref) ||
    op.request_ref !== input.requestRef ||
    op.user_id !== loaded.context.userId ||
    op.case_id !== loaded.context.caseId ||
    op.kind !== kind || op.selection_ref !== input.selectionRef ||
    op.sharing_revision !== input.expectedSharingRevision ||
    !isRecord(op.desired) ||
    typeof op.content_digest !== "string" ||
    !/^[a-f0-9]{64}$/u.test(op.content_digest) ||
    prepared.value.calendar_id !== selection.calendar_id
  ) fail("setup_unavailable", 503);
  const operationRef = op.operation_ref;
  function publicResult(operation: Record<string, unknown>) {
    const result = operation.result;
    if (operation.operation_status !== "committed" || !isRecord(result)) {
      fail("operation_pending");
    }
    if (kind === "share") {
      const wanted = input!.accessLevel === "busy_only"
        ? "freeBusyReader"
        : "reader";
      const allowed = wanted === "freeBusyReader"
        ? [
          "freeBusyReader",
          "reader",
          "writerWithoutPrivateAccess",
          "writer",
          "owner",
        ]
        : ["reader", "writerWithoutPrivateAccess", "writer", "owner"];
      if (
        result.state !== "shared" || result.recipientCount !== 2 ||
        result.requestedAccessLevel !== input!.accessLevel ||
        !Array.isArray(result.recipients) || result.recipients.length !== 2 ||
        !isRecord(operation.desired) ||
        !Array.isArray(operation.desired.recipients)
      ) fail("setup_unavailable", 503);
      const expectedRecipients = operation.desired.recipients;
      const recipients = result.recipients.map((x) => {
        if (
          !isRecord(x) || typeof x.email !== "string" ||
          !expectedRecipients.includes(x.email) ||
          typeof x.accessRole !== "string" || !allowed.includes(x.accessRole) ||
          x.preservedHigherAccess !== (x.accessRole !== wanted)
        ) fail("setup_unavailable", 503);
        return {
          email: x.email,
          accessRole: x.accessRole,
          preservedHigherAccess: x.preservedHigherAccess,
        };
      });
      if (new Set(recipients.map((x) => x.email)).size !== 2) {
        fail("setup_unavailable", 503);
      }
      return {
        schemaVersion: SCHEMA,
        state: "shared",
        operationRef,
        selectionRef: input!.selectionRef,
        recipientCount: 2,
        requestedAccessLevel: result.requestedAccessLevel,
        recipients,
      };
    }
    if (
      result.state !== "saved" || !ref(result.eventRef) ||
      !number(result.eventRevision, 1) || !string(result.title, 200) ||
      typeof result.start !== "string" || typeof result.end !== "string"
    ) fail("setup_unavailable", 503);
    return {
      schemaVersion: SCHEMA,
      state: "saved",
      operationRef,
      eventRef: result.eventRef,
      eventRevision: result.eventRevision,
      selectionRef: input!.selectionRef,
      title: result.title,
      start: result.start,
      end: result.end,
      timeZone: "Asia/Taipei",
    };
  }
  if (op.operation_status === "committed") return publicResult(op);
  if (op.operation_status !== "pending") fail("operation_pending");
  const operationInput = { ...checkInput, operation_ref: op.operation_ref };
  const beforeWrite = async () => {
    const current =
      (await call(request, d, "mutation_check", operationInput, loaded.context))
        .value.operation;
    if (
      !isRecord(current) || current.operation_ref !== op.operation_ref ||
      current.operation_status !== "pending" ||
      current.content_digest !== op.content_digest
    ) fail("revision_conflict");
  };
  let receipt: Record<string, unknown>;
  if (kind === "share") {
    if (
      op.desired.access_level !== input.accessLevel ||
      !Array.isArray(op.desired.recipients) ||
      op.desired.recipients.length !== 2 || op.desired.recipients.some((x) =>
        typeof x !== "string"
      )
    ) fail("setup_unavailable", 503);
    const result = await d.provider.shareCalendarWithRecipients({
      accessToken: tokens.accessToken,
      calendarId: selection.calendar_id,
      recipients: op.desired.recipients as string[],
      accessLevel: input.accessLevel!,
      beforeWrite,
    });
    if (!result.ok) return await providerFailure(result.state);
    receipt = { receipts: result.receipts };
  } else {
    if (
      !ref(op.event_ref) || !string(op.desired.title, 200) ||
      !string(op.desired.description, 1000) ||
      op.desired.start !== input.start || op.desired.end !== input.end ||
      op.desired.event_kind !== input.eventKind ||
      (kind === "update" &&
        (op.event_ref !== input.eventRef ||
          op.expected_event_revision !== input.expectedEventRevision ||
          !string(op.expected_etag, 512)))
    ) fail("setup_unavailable", 503);
    const result = await d.provider.upsertAcceptanceEvent({
      accessToken: tokens.accessToken,
      calendarId: selection.calendar_id,
      providerEventId: op.event_ref.replaceAll("-", ""),
      eventRef: op.event_ref,
      operationRef: op.operation_ref,
      contentDigest: op.content_digest,
      title: op.desired.title,
      description: op.desired.description,
      start: input.start!,
      end: input.end!,
      mode: kind,
      expectedEtag: kind === "update" ? op.expected_etag as string : undefined,
      beforeWrite,
    });
    if (!result.ok) return await providerFailure(result.state);
    receipt = result.event;
  }
  const committed = await call(request, d, "mutation_commit", {
    ...operationInput,
    result: receipt,
  }, loaded.context);
  if (
    !isRecord(committed.value.operation) ||
    committed.value.operation.operation_ref !== op.operation_ref
  ) fail("operation_pending");
  return publicResult(committed.value.operation);
}
function mutationHandler(d: RuntimeDependencies, kind: "create" | "update") {
  const keys = [
    "schemaVersion",
    "bindingRef",
    "expectedSharingRevision",
    "selectionRef",
    "requestRef",
    "eventKind",
    "start",
    "end",
    ...(kind === "update" ? ["eventRef", "expectedEventRevision"] : []),
  ];
  return handler(
    d,
    keys,
    keys,
    (request, body) => performCalendarMutation(request, body, kind, d),
  );
}
export const createVendorCalendarEventsCreateHandler = (
  d: RuntimeDependencies,
) => mutationHandler(d, "create");
export const createVendorCalendarEventsUpdateHandler = (
  d: RuntimeDependencies,
) => mutationHandler(d, "update");
export const createVendorCalendarEventsCancelHandler = readOnlyMutation;

export function createVendorCalendarRuntimeDependencies(
  options: RuntimeOptions = {},
): RuntimeDependencies {
  const get = (name: string) => {
    try {
      return options.env
        ? options.env.get(name) ?? ""
        : (globalThis as typeof globalThis & {
          Deno?: { env?: { get(name: string): string | undefined } };
        }).Deno?.env?.get(name) ?? "";
    } catch {
      return "";
    }
  };
  const first = (...names: string[]) => {
    for (const name of names) {
      const value = get(name);
      if (value) return value;
    }
    return "";
  };
  const validCredentialKey = (value: string) => {
    if (!/^[A-Za-z0-9_-]+={0,2}$/u.test(value)) return false;
    try {
      const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
      return atob(normalized + "=".repeat((4 - normalized.length % 4) % 4))
        .length === 32;
    } catch {
      return false;
    }
  };
  const supabaseUrl = get("SUPABASE_URL").replace(/\/+$/u, ""),
    serviceRoleKey = get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = first(
      "GOOGLE_CALENDAR_OAUTH_CLIENT_ID",
      "GOOGLE_CALENDAR_CLIENT_ID",
    ),
    clientSecret = first(
      "GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET",
      "GOOGLE_CALENDAR_CLIENT_SECRET",
    ),
    key = first(
      "VENDOR_GOOGLE_CALENDAR_ENCRYPTION_KEY",
      "GOOGLE_CALENDAR_CREDENTIAL_KEY",
    );
  const now = options.now ?? Date.now,
    request = options.fetch ?? globalThis.fetch;
  const allowedOrigins = get("LAIBE_ALLOWED_ORIGINS").split(",").map((x) =>
    x.trim()
  ).filter((x) => {
    try {
      const url = new URL(x);
      return url.origin === x && url.protocol === "https:";
    } catch {
      return false;
    }
  });
  if (supabaseUrl === "https://zdwuyomhswjcbbpbhpcq.supabase.co") {
    allowedOrigins.push(VENDOR_CALENDAR_SITE_ORIGIN);
  }
  const domain = digestVendorCalendarOAuthState(
    "https://accounts.google.com\n" + clientId,
  );
  async function rpc(
    name: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    if (!supabaseUrl || !serviceRoleKey) return null;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await request(supabaseUrl + "/rest/v1/rpc/" + name, {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          authorization: "Bearer " + serviceRoleKey,
          apikey: serviceRoleKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok || !response.body) return null;
      const reader = response.body.getReader(), chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          total += next.value.byteLength;
          if (total > 1048576) {
            await reader.cancel();
            return null;
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
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  const d: RuntimeDependencies = {
    allowedOrigins: Object.freeze([...new Set(allowedOrigins)]),
    callbackUri: VENDOR_CALENDAR_CALLBACK_URI,
    now,
    domain,
    configured: Boolean(
      supabaseUrl && serviceRoleKey && clientId && clientSecret &&
        validCredentialKey(key),
    ),
    authorizeRequest: createVendorCalendarAuthorizer({
      supabaseUrl,
      serviceRoleKey,
      fetch: request,
      now,
      resolveGrant: (userId) =>
        rpc("vendor_workspace_grant_v1", { p_authenticated_user_id: userId }),
    }),
    dispatch: async (action, context, input) => {
      const value = await rpc("vendor_google_calendar_dispatch_v2", {
        p_action: action,
        p_user_id: context?.userId ?? null,
        p_session_id: context?.authSessionId ?? null,
        p_case_id: context?.caseId ?? null,
        p_input: { ...input, client_domain: await domain },
      });
      return isRecord(value)
        ? value
        : { ok: false, state: "setup_unavailable" };
    },
    provider: createGoogleCalendarProvider({
      clientId,
      clientSecret,
      redirectUri: VENDOR_CALENDAR_CALLBACK_URI,
      fetch: request,
      now,
    }),
    seal: (value, binding) => sealCalendarV2(value, key, binding),
    unseal: (value, binding) => unsealCalendarV2(value, key, binding),
    eventReference: (bindingRef, selectionRef, providerId, start) =>
      calendarEventReference(key, bindingRef, selectionRef, providerId, start),
  };
  return d;
}
