import {
  createPcmCalendarEventsReadHandler,
  createPcmCalendarProductionDependencies,
  type PcmCalendarDependencies,
} from "./index.ts";
import { createPcmCalendarGrantHandler } from "../pcm-google-calendar-grant/index.ts";

const ORIGIN =
  "https://laibe-drs-original-a4-20260901.blueleft120.chatgpt.site";
const USER_ID = "ac8e8a7e-0291-4bc8-80fc-79b29862372e";
const CASE_ID = "5d87fcb4-1d97-46dd-89b0-a5d52d4dbd5d";
const SELECTION_REF = "52867f69-2cc7-4d60-8880-ce38fa52b218";
const window = {
  timeMin: "2026-10-16T00:00:00+08:00",
  timeMax: "2026-10-17T00:00:00+08:00",
};

const projection = {
  state: "ready" as const,
  caseId: CASE_ID,
  vendorUserId: "307ad495-b083-4a80-90f7-08d24c6be89b",
  bindingRef: "034c0633-0578-4215-ae71-05565551d563",
  sharingRevision: 8,
  credentialGeneration: 3,
  credentialDomain: "private-domain",
  googleSubject: "private-subject",
  encryptedCredential: "v2.private.private",
  tokenExpiresAt: "2026-10-17T12:00:00Z",
  grantedScopes: [
    "openid",
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    "https://www.googleapis.com/auth/calendar.events.owned.readonly",
  ],
  selections: [{
    selectionRef: SELECTION_REF,
    calendarId: "project-only@example.com",
    shareMode: "full_detail" as const,
  }],
};

function request(body: unknown, method = "POST") {
  return new Request(
    "https://edge.example.test/functions/v1/pcm-google-calendar-events-read",
    {
      method,
      headers: {
        origin: ORIGIN,
        authorization: "Bearer test-session",
        "content-type": "application/json",
      },
      body: method === "POST" ? JSON.stringify(body) : undefined,
    },
  );
}

function dependencies(
  overrides: Partial<PcmCalendarDependencies> = {},
): PcmCalendarDependencies {
  return {
    allowedOrigin: ORIGIN,
    authenticate: () => ({ userId: USER_ID }),
    loadProjection: () => projection,
    readOwnerEvents: () => ({
      state: "ready",
      caseId: CASE_ID,
      complete: true,
      events: [{
        eventRef: "private-event-ref",
        selectionRef: SELECTION_REF,
        title: "丈量",
        description: "一樓確認尺寸",
        location: "專案工地",
        start: "2026-10-16T10:00:00+08:00",
        end: "2026-10-16T11:00:00+08:00",
        allDay: false,
        providerEventId: "must-not-leak",
      }],
    }),
    ...overrides,
  };
}

Deno.test("PCM grant returns only the selected case read permission", async () => {
  const handler = createPcmCalendarGrantHandler(dependencies());
  const response = await handler(request({}));
  if (response.status !== 200) throw new Error(String(response.status));
  const body = await response.json();
  if (
    JSON.stringify(body) !== JSON.stringify({
      state: "READY",
      grant: {
        schemaVersion: "laibe.drs-calendar-read.v1",
        caseId: CASE_ID,
        accessMode: "read_only",
        connectionStatus: "connected",
        timeZone: "Asia/Taipei",
      },
    })
  ) throw new Error(JSON.stringify(body));
});

Deno.test("PCM events return a complete bounded detail window without provider internals", async () => {
  const handler = createPcmCalendarEventsReadHandler(dependencies());
  const response = await handler(request(window));
  if (response.status !== 200) throw new Error(String(response.status));
  const body = await response.json();
  if (
    JSON.stringify(body) !== JSON.stringify({
      state: "READY",
      caseId: CASE_ID,
      timeZone: "Asia/Taipei",
      window,
      events: [{
        title: "丈量",
        description: "一樓確認尺寸",
        location: "專案工地",
        startsAt: "2026-10-16T10:00:00+08:00",
        endsAt: "2026-10-16T11:00:00+08:00",
        allDay: false,
      }],
    })
  ) throw new Error(JSON.stringify(body));
});

Deno.test("PCM rejects caller case and subject selectors before provider access", async () => {
  let providerReads = 0;
  const deps = dependencies({
    readOwnerEvents: () => {
      providerReads++;
      throw new Error("unexpected provider read");
    },
  });
  const events = createPcmCalendarEventsReadHandler(deps);
  const grant = createPcmCalendarGrantHandler(deps);
  const responses = await Promise.all([
    events(request({ ...window, caseId: CASE_ID })),
    events(
      request({ ...window, authorizationSubject: "drs-specialist:forged" }),
    ),
    grant(request({ caseId: CASE_ID })),
  ]);
  if (
    responses.some((response) => response.status !== 400) || providerReads !== 0
  ) {
    throw new Error("caller selector was accepted");
  }
});

Deno.test("PCM revocation or calendar reselection during read fails closed", async () => {
  let reads = 0;
  const handler = createPcmCalendarEventsReadHandler(dependencies({
    loadProjection: () => {
      reads++;
      return reads === 1 ? projection : { ...projection, sharingRevision: 9 };
    },
  }));
  const response = await handler(request(window));
  if (response.status === 200 || (await response.json()).state === "READY") {
    throw new Error("stale read escaped");
  }
});

Deno.test("PCM rejects incomplete event windows and does not return partial events", async () => {
  const handler = createPcmCalendarEventsReadHandler(dependencies({
    readOwnerEvents: () => ({
      state: "ready",
      caseId: CASE_ID,
      complete: false,
      events: [{ title: "partial" }],
    }),
  }));
  const response = await handler(request(window));
  const body = await response.json();
  if (body.state === "READY" || "events" in body) {
    throw new Error("partial response escaped");
  }
});

Deno.test("PCM grant is non-ready when no calendar is shared", async () => {
  const handler = createPcmCalendarGrantHandler(dependencies({
    loadProjection: () => ({ state: "not_shared", caseId: CASE_ID }),
  }));
  const body = await (await handler(request({}))).json();
  if (JSON.stringify(body) !== JSON.stringify({ state: "DISCONNECTED" })) {
    throw new Error("unshared calendar was granted");
  }
});

Deno.test("PCM multiple active assignments never infer a case or fetch events", async () => {
  let providerReads = 0;
  const deps = dependencies({
    loadProjection: () => ({ state: "case_selection_required" }),
    readOwnerEvents: () => {
      providerReads++;
      throw new Error("unexpected provider read");
    },
  });
  for (
    const response of await Promise.all([
      createPcmCalendarGrantHandler(deps)(request({})),
      createPcmCalendarEventsReadHandler(deps)(request(window)),
    ])
  ) {
    const body = await response.json();
    if (
      response.status === 200 || body.state !== "CASE_SELECTION_REQUIRED" ||
      "caseId" in body || "grant" in body || "events" in body
    ) throw new Error("multiple assignments escaped");
  }
  if (providerReads !== 0) {
    throw new Error("multiple assignments reached Provider");
  }
});

Deno.test("PCM rejects a foreign Origin and URL selectors", async () => {
  let projections = 0;
  const deps = dependencies({
    loadProjection: () => {
      projections++;
      return projection;
    },
  });
  const handler = createPcmCalendarEventsReadHandler(deps);
  const foreignHeaders = new Headers(request(window).headers);
  foreignHeaders.set("origin", "https://other.example.test");
  const foreign = await handler(
    new Request(
      "https://edge.example.test/functions/v1/pcm-google-calendar-events-read",
      { method: "POST", headers: foreignHeaders, body: JSON.stringify(window) },
    ),
  );
  const selected = await handler(
    new Request(
      "https://edge.example.test/functions/v1/pcm-google-calendar-events-read?caseId=" +
        CASE_ID,
      {
        method: "POST",
        headers: request(window).headers,
        body: JSON.stringify(window),
      },
    ),
  );
  if (foreign.status !== 403 || selected.status !== 400 || projections !== 0) {
    throw new Error("Origin or URL selector was accepted");
  }
});

Deno.test("production PCM routes verify Auth and ask SQL for only that user's case", async () => {
  const sessionId = "1bcf98c6-cceb-4bf9-971b-dfbb5cafc7ce";
  const claims = {
    iss: "https://project.supabase.co/auth/v1",
    aud: "authenticated",
    sub: USER_ID,
    session_id: sessionId,
    exp: 2_524_608_000,
  };
  const token = `header.${
    btoa(JSON.stringify(claims)).replaceAll("+", "-").replaceAll("/", "_")
      .replaceAll("=", "")
  }.signature`;
  const calls: string[] = [];
  const fakeFetch: typeof fetch = (input, init) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    if (url.pathname === "/auth/v1/user") {
      return Promise.resolve(Response.json({ id: USER_ID }));
    }
    if (url.pathname === "/rest/v1/rpc/auth_session_validation_v1") {
      return Promise.resolve(Response.json({
        schemaVersion: "laibe.auth-session-validation.v1",
        active: true,
      }));
    }
    if (
      url.pathname === "/rest/v1/rpc/pcm_vendor_google_calendar_projection_v1"
    ) {
      const body = JSON.parse(
        String((init as { body?: BodyInit } | undefined)?.body),
      );
      if (
        JSON.stringify(body) !==
          JSON.stringify({ p_authenticated_user_id: USER_ID })
      ) {
        throw new Error("client case selector reached SQL");
      }
      return Promise.resolve(Response.json({
        ok: true,
        state: "ready",
        case_id: CASE_ID,
        vendor_user_id: projection.vendorUserId,
        binding_ref: projection.bindingRef,
        sharing_revision: projection.sharingRevision,
        credential_generation: projection.credentialGeneration,
        credential_domain: projection.credentialDomain,
        google_subject: projection.googleSubject,
        encrypted_credential: projection.encryptedCredential,
        token_expires_at: projection.tokenExpiresAt,
        granted_scopes: projection.grantedScopes,
        selections: [{
          selection_ref: SELECTION_REF,
          calendar_id: projection.selections[0].calendarId,
          share_mode: "full_detail",
        }],
      }));
    }
    throw new Error(`unexpected route: ${url.pathname}`);
  };
  const deps = createPcmCalendarProductionDependencies({
    supabaseUrl: "https://project.supabase.co",
    serviceRoleKey: "test-service-key",
    fetch: fakeFetch,
    ownerDependencies: {
      allowedOrigins: [ORIGIN],
      backendConfigured: true,
      providerConfigured: true,
      now: () => Date.parse("2026-10-16T08:00:00Z"),
      authorize: () => Promise.resolve({ userId: USER_ID, caseId: CASE_ID }),
      loadProjection: () => Promise.resolve(projection),
      readProviderEvents: () =>
        Promise.resolve({
          ok: true,
          events: [{
            providerEventId: "private-id",
            selectionRef: SELECTION_REF,
            allDay: false,
            start: "2026-10-16T10:00:00+08:00",
            end: "2026-10-16T11:00:00+08:00",
            title: "丈量",
            description: "一樓確認尺寸",
            location: "專案工地",
          }],
        }),
      makeEventRef: () => Promise.resolve("private-reference"),
    },
  });
  const handler = createPcmCalendarGrantHandler(deps);
  const headers = new Headers(request({}).headers);
  headers.set("authorization", `Bearer ${token}`);
  const response = await handler(
    new Request(
      "https://edge.example.test/functions/v1/pcm-google-calendar-grant",
      { method: "POST", headers, body: "{}" },
    ),
  );
  const body = await response.json();
  if (
    response.status !== 200 || body.state !== "READY" ||
    body.grant?.caseId !== CASE_ID
  ) {
    throw new Error("verified same-case grant failed");
  }
  if (
    JSON.stringify(calls) !== JSON.stringify([
      "/auth/v1/user",
      "/rest/v1/rpc/auth_session_validation_v1",
      "/rest/v1/rpc/pcm_vendor_google_calendar_projection_v1",
    ])
  ) throw new Error(JSON.stringify(calls));

  const eventResponse = await createPcmCalendarEventsReadHandler(deps)(
    new Request(
      "https://edge.example.test/functions/v1/pcm-google-calendar-events-read",
      {
        method: "POST",
        headers,
        body: JSON.stringify(window),
      },
    ),
  );
  const eventBody = await eventResponse.json();
  if (eventResponse.status !== 200 || eventBody.state !== "READY") {
    throw new Error(
      JSON.stringify({ status: eventResponse.status, body: eventBody }),
    );
  }
  if (
    eventBody.events?.[0]?.description !== "一樓確認尺寸" ||
    eventBody.events?.[0]?.location !== "專案工地" ||
    "providerEventId" in eventBody.events[0]
  ) {
    throw new Error(
      "production event projection lost detail or leaked provider data",
    );
  }
});
