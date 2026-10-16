const SITE_ORIGIN =
  "https://laibe-drs-owner-vendor-20260908.blueleft120.chatgpt.site";
const CASE_ID = "5d87fcb4-1d97-46dd-89b0-a5d52d4dbd5d";
const OWNER_ID = "9bb6c71f-35b1-43f0-8dbe-b839888a7e40";
const VENDOR_ID = "307ad495-b083-4a80-90f7-08d24c6be89b";
const BINDING_REF = "034c0633-0578-4215-ae71-05565551d563";
const SELECTION_REF = "52867f69-2cc7-4d60-8880-ce38fa52b218";

function deepEqual(actual: unknown, expected: unknown): void {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`expected ${right}, received ${left}`);
}

function equal(actual: unknown, expected: unknown): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`expected ${String(expected)}, received ${String(actual)}`);
  }
}

const moduleUrl = new URL("./owner-runtime.ts", import.meta.url);

async function runtimeModule() {
  return import(moduleUrl.href);
}

function privateProjection(overrides: Record<string, unknown> = {}) {
  return {
    state: "ready",
    caseId: CASE_ID,
    vendorUserId: VENDOR_ID,
    bindingRef: BINDING_REF,
    sharingRevision: 8,
    credentialGeneration: 3,
    credentialDomain: "private-domain",
    googleSubject: "private-subject",
    encryptedCredential: "v2.private.private",
    tokenExpiresAt: "2026-09-25T12:00:00Z",
    grantedScopes: [
      "https://www.googleapis.com/auth/calendar.events.owned.readonly",
    ],
    selections: [{
      selectionRef: SELECTION_REF,
      calendarId: "vendor-private-calendar@example.com",
      shareMode: "full_detail",
    }],
    ...overrides,
  };
}

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", SITE_ORIGIN);
  headers.set("authorization", "Bearer browser-session-token");
  if (init.body) headers.set("content-type", "application/json");
  return new Request(`https://example.test/${path}`, { ...init, headers });
}

Deno.test("Owner status returns only safe same-case sharing state", async () => {
  const { createOwnerCalendarStatusHandler } = await runtimeModule();
  const handler = createOwnerCalendarStatusHandler({
    allowedOrigins: [SITE_ORIGIN],
    backendConfigured: true,
    providerConfigured: true,
    now: () => Date.parse("2026-09-25T08:00:00Z"),
    authorize: async () => ({ userId: OWNER_ID, caseId: CASE_ID }),
    loadProjection: async () => privateProjection(),
    readProviderEvents: async () => ({ ok: true, events: [] }),
    makeEventRef: async () => "unused",
  });

  const response = await handler(request("status", { method: "GET" }));
  equal(response.status, 200);
  deepEqual(await response.json(), {
    schemaVersion: "laibe.owner-vendor-calendar-status.v1",
    state: "ready",
    caseId: CASE_ID,
    sharingRevision: 8,
    timeZone: "Asia/Taipei",
  });
});

Deno.test("Owner event read projects full details and strips Provider fields", async () => {
  const { createOwnerCalendarEventsReadHandler } = await runtimeModule();
  let projectionReads = 0;
  const handler = createOwnerCalendarEventsReadHandler({
    allowedOrigins: [SITE_ORIGIN],
    backendConfigured: true,
    providerConfigured: true,
    now: () => Date.parse("2026-09-25T08:00:00Z"),
    authorize: async () => ({ userId: OWNER_ID, caseId: CASE_ID }),
    loadProjection: async () => {
      projectionReads += 1;
      return privateProjection();
    },
    readProviderEvents: async () => ({
      ok: true,
      events: [{
        providerEventId: "private-google-id",
        selectionRef: SELECTION_REF,
        allDay: false,
        start: "2026-09-25T10:00:00+08:00",
        end: "2026-09-25T11:00:00+08:00",
        title: "材料確認",
        description: "private-description",
        attendees: ["private@example.com"],
      }],
    }),
    makeEventRef: async () => "opaque-event-reference",
  });

  const response = await handler(request("events", {
    method: "POST",
    body: JSON.stringify({
      schemaVersion: "laibe.owner-vendor-calendar-read.v1",
      timeMin: "2026-09-01T00:00:00+08:00",
      timeMax: "2026-10-02T00:00:00+08:00",
    }),
  }));

  equal(response.status, 200);
  equal(projectionReads, 2);
  deepEqual(await response.json(), {
    schemaVersion: "laibe.owner-vendor-calendar-read.v1",
    state: "ready",
    caseId: CASE_ID,
    sharingRevision: 8,
    timeZone: "Asia/Taipei",
    complete: true,
    events: [{
      eventRef: "opaque-event-reference",
      selectionRef: SELECTION_REF,
      allDay: false,
      start: "2026-09-25T10:00:00+08:00",
      end: "2026-09-25T11:00:00+08:00",
      title: "材料確認",
      description: "private-description",
      location: "",
    }],
  });
});

Deno.test("Owner event read rejects authority selectors before Provider access", async () => {
  const { createOwnerCalendarEventsReadHandler } = await runtimeModule();
  let providerReads = 0;
  const handler = createOwnerCalendarEventsReadHandler({
    allowedOrigins: [SITE_ORIGIN],
    backendConfigured: true,
    providerConfigured: true,
    now: () => Date.parse("2026-09-25T08:00:00Z"),
    authorize: async () => ({ userId: OWNER_ID, caseId: CASE_ID }),
    loadProjection: async () => privateProjection(),
    readProviderEvents: async () => {
      providerReads += 1;
      return { ok: true, events: [] };
    },
    makeEventRef: async () => "unused",
  });

  const response = await handler(request("events", {
    method: "POST",
    body: JSON.stringify({
      schemaVersion: "laibe.owner-vendor-calendar-read.v1",
      timeMin: "2026-09-01T00:00:00+08:00",
      timeMax: "2026-10-02T00:00:00+08:00",
      caseId: CASE_ID,
    }),
  }));

  equal(response.status, 400);
  equal(providerReads, 0);
  deepEqual(await response.json(), {
    schemaVersion: "laibe.owner-vendor-calendar-error.v1",
    state: "invalid_request",
    message: "日曆查詢條件不正確，請重新選擇月份。",
    retryable: false,
  });
});

Deno.test("Owner event read fails closed when sharing changes during Provider read", async () => {
  const { createOwnerCalendarEventsReadHandler } = await runtimeModule();
  let projectionReads = 0;
  const handler = createOwnerCalendarEventsReadHandler({
    allowedOrigins: [SITE_ORIGIN],
    backendConfigured: true,
    providerConfigured: true,
    now: () => Date.parse("2026-09-25T08:00:00Z"),
    authorize: async () => ({ userId: OWNER_ID, caseId: CASE_ID }),
    loadProjection: async () => {
      projectionReads += 1;
      return privateProjection(
        projectionReads === 1 ? {} : { sharingRevision: 9 },
      );
    },
    readProviderEvents: async () => ({ ok: true, events: [] }),
    makeEventRef: async () => "unused",
  });

  const response = await handler(request("events", {
    method: "POST",
    body: JSON.stringify({
      schemaVersion: "laibe.owner-vendor-calendar-read.v1",
      timeMin: "2026-09-01T00:00:00+08:00",
      timeMax: "2026-10-02T00:00:00+08:00",
    }),
  }));

  equal(response.status, 409);
  const body = await response.json();
  equal(body.state, "temporarily_unavailable");
  equal(Object.hasOwn(body, "events"), false);
});

Deno.test("runtime config adds canonical CORS and honors secret-name fallbacks", async () => {
  const { createOwnerCalendarRuntimeDependencies } = await runtimeModule();
  const values = new Map([
    ["SUPABASE_URL", "https://zdwuyomhswjcbbpbhpcq.supabase.co"],
    ["SUPABASE_SERVICE_ROLE_KEY", "service-role-placeholder"],
    ["GOOGLE_CALENDAR_CLIENT_ID", "client-id-placeholder"],
    ["GOOGLE_CALENDAR_CLIENT_SECRET", "client-secret-placeholder"],
    [
      "GOOGLE_CALENDAR_CREDENTIAL_KEY",
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    ["LAIBE_ALLOWED_ORIGINS", "https://another-approved.example"],
  ]);
  const dependencies = createOwnerCalendarRuntimeDependencies({
    env: { get: (name: string) => values.get(name) },
    fetch: async () => new Response(null, { status: 503 }),
  });

  equal(dependencies.backendConfigured, true);
  equal(dependencies.providerConfigured, true);
  equal(dependencies.allowedOrigins.includes(SITE_ORIGIN), true);
  equal(
    dependencies.allowedOrigins.includes("https://another-approved.example"),
    true,
  );

  values.set("VENDOR_GOOGLE_CALENDAR_ENCRYPTION_KEY", "malformed-key");
  const malformed = createOwnerCalendarRuntimeDependencies({
    env: { get: (name: string) => values.get(name) },
    fetch: async () => new Response(null, { status: 503 }),
  });
  equal(malformed.providerConfigured, false);
});

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(
    /=+$/gu,
    "",
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function sealCredential(
  value: unknown,
  encodedKey: string,
  binding: Record<string, unknown>,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new Uint8Array(32)),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = new Uint8Array(12);
  iv[11] = 1;
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(JSON.stringify(binding)),
    },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  equal(encodedKey, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  return `v2.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

Deno.test("real runtime dependency decrypts Vendor credential and bounds Google event projection", async () => {
  const { createOwnerCalendarRuntimeDependencies } = await runtimeModule();
  const key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const calls: { url: string; authorization: string | null }[] = [];
  const dependencies = createOwnerCalendarRuntimeDependencies({
    env: {
      get(name: string) {
        return new Map([
          ["SUPABASE_URL", "https://zdwuyomhswjcbbpbhpcq.supabase.co"],
          ["SUPABASE_SERVICE_ROLE_KEY", "service-role-placeholder-long-enough"],
          ["GOOGLE_CALENDAR_CLIENT_ID", "client-id-placeholder"],
          ["GOOGLE_CALENDAR_CLIENT_SECRET", "client-secret-placeholder"],
          ["GOOGLE_CALENDAR_CREDENTIAL_KEY", key],
        ]).get(name);
      },
    },
    now: () => Date.parse("2026-09-25T08:00:00Z"),
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return new Response(
        JSON.stringify({
          items: [{
            id: "provider-private-id",
            summary: "工程會議",
            description: "never projected",
            start: { dateTime: "2026-09-25T02:00:00Z" },
            end: { dateTime: "2026-09-25T03:00:00Z" },
          }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    },
  });
  const binding = {
    kind: "credential",
    owner: VENDOR_ID,
    subject: "private-subject",
    domain: "private-domain",
    generation: 3,
  };
  const encryptedCredential = await sealCredential(
    {
      accessToken: "access-token-placeholder",
      refreshToken: "refresh-token-placeholder",
      expiresAt: "2026-09-25T12:00:00Z",
      scopes: [
        "https://www.googleapis.com/auth/calendar.events.owned.readonly",
      ],
    },
    key,
    binding,
  );
  const projection = privateProjection({ encryptedCredential });

  const result = await dependencies.readProviderEvents(projection, {
    timeMin: "2026-09-01T00:00:00+08:00",
    timeMax: "2026-10-02T00:00:00+08:00",
  });

  equal(result.ok, true);
  if (!result.ok) throw new Error("provider read unexpectedly failed");
  deepEqual(result.events, [{
    providerEventId: "provider-private-id",
    selectionRef: SELECTION_REF,
    allDay: false,
    start: "2026-09-25T10:00:00+08:00",
    end: "2026-09-25T11:00:00+08:00",
    title: "工程會議",
  }]);
  equal(calls.length, 1);
  equal(calls[0].authorization, "Bearer access-token-placeholder");
  equal(
    calls[0].url.includes(
      encodeURIComponent("vendor-private-calendar@example.com"),
    ),
    true,
  );
  const eventRef = await dependencies.makeEventRef(
    projection,
    result.events[0],
  );
  equal(eventRef === "provider-private-id", false);
  equal(eventRef.length > 30, true);
});

Deno.test("real runtime resolves user and current case before its service-only projection RPC", async () => {
  const { createOwnerCalendarRuntimeDependencies } = await runtimeModule();
  const rpcBodies: Record<string, unknown>[] = [];
  const dependencies = createOwnerCalendarRuntimeDependencies({
    env: {
      get(name: string) {
        return new Map([
          ["SUPABASE_URL", "https://zdwuyomhswjcbbpbhpcq.supabase.co"],
          ["SUPABASE_SERVICE_ROLE_KEY", "service-role-placeholder-long-enough"],
          ["GOOGLE_CALENDAR_CLIENT_ID", "client-id-placeholder"],
          ["GOOGLE_CALENDAR_CLIENT_SECRET", "client-secret-placeholder"],
          [
            "GOOGLE_CALENDAR_CREDENTIAL_KEY",
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          ],
        ]).get(name);
      },
    },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/user")) {
        return new Response(JSON.stringify({ id: OWNER_ID }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      rpcBodies.push(JSON.parse(String(init?.body)));
      if (url.endsWith("/rpc/case_member_current_case_context_v1")) {
        return new Response(JSON.stringify({ case_id: CASE_ID }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/rpc/owner_vendor_google_calendar_projection_v1")) {
        return new Response(
          JSON.stringify({
            ok: true,
            state: "not_shared",
            case_id: CASE_ID,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      throw new Error(`unexpected URL ${url}`);
    },
  });

  const principal = await dependencies.authorize(
    request("status", { method: "GET" }),
  );
  deepEqual(principal, { userId: OWNER_ID, caseId: CASE_ID });
  const projection = await dependencies.loadProjection(principal);
  deepEqual(projection, {
    state: "not_shared",
    caseId: CASE_ID,
    sharingRevision: null,
    selections: [],
  });
  deepEqual(rpcBodies, [
    { p_user_id: OWNER_ID },
    {
      p_authenticated_user_id: OWNER_ID,
      p_expected_case_id: CASE_ID,
    },
  ]);
});
