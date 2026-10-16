import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const moduleRoot = new URL("../functions/_shared/vendor-google-calendar-support/", import.meta.url);
const contracts = () => import(new URL("contracts.ts", moduleRoot));
const projection = () => import(new URL("owner-projection.ts", moduleRoot));
const providerModule = () => import(new URL("google-provider.ts", moduleRoot));
const migrationUrl = new URL("../migrations/20261016090000_vendor_calendar_laibe_only.sql", import.meta.url);

const flow = {
  schemaVersion: "laibe.vendor-calendar-sharing.v2",
  action: "save",
  flowRef: "8a3ae5d5-0e99-4587-bc81-b53d449d7f8b",
  initiationProof: "A".repeat(43),
  flowRevision: 2,
  expectedSharingRevision: 0,
  choices: [{ choiceRef: "e4a38cae-0c2d-4b93-8e3c-01f31bc6bc92", shareMode: "full_detail" }],
};

test("Vendor requests only owned-calendar read scopes", async () => {
  const { VENDOR_CALENDAR_GOOGLE_SCOPES } = await contracts();
  assert.deepEqual([...VENDOR_CALENDAR_GOOGLE_SCOPES], [
    "openid",
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    "https://www.googleapis.com/auth/calendar.events.owned.readonly",
  ]);
});

test("one full-detail calendar can be selected, and broader or legacy selection fails", async () => {
  const { parseVendorCalendarSharingRequest } = await contracts();
  assert.deepEqual(parseVendorCalendarSharingRequest(flow)?.choices, flow.choices);
  assert.equal(parseVendorCalendarSharingRequest({
    ...flow,
    choices: [...flow.choices, { choiceRef: "a4a38cae-0c2d-4b93-8e3c-01f31bc6bc92", shareMode: "full_detail" }],
  }), null);
  assert.equal(parseVendorCalendarSharingRequest({
    ...flow,
    choices: [{ ...flow.choices[0], shareMode: "title_time" }],
  }), null);
});

test("case event projection preserves bounded content and excludes Provider internals", async () => {
  const { projectOwnerCalendarEvent } = await projection();
  const event = {
    eventRef: "8a3ae5d5-0e99-4587-bc81-b53d449d7f8b",
    selectionRef: "e4a38cae-0c2d-4b93-8e3c-01f31bc6bc92",
    allDay: false,
    start: "2026-10-16T10:00:00+08:00",
    end: "2026-10-16T11:00:00+08:00",
    title: "丈量",
    description: "一樓\n確認尺寸",
    location: "專案工地",
    providerEventId: "private-google-id",
    attendees: ["private@example.com"],
    htmlLink: "https://calendar.google.com/private",
  };
  assert.deepEqual(projectOwnerCalendarEvent(event, "full_detail"), {
    eventRef: event.eventRef,
    selectionRef: event.selectionRef,
    allDay: false,
    start: event.start,
    end: event.end,
    title: event.title,
    description: event.description,
    location: event.location,
  });
  assert.deepEqual(projectOwnerCalendarEvent({ ...event, title: undefined, description: undefined, location: undefined }, "full_detail"), {
    eventRef: event.eventRef,
    selectionRef: event.selectionRef,
    allDay: false,
    start: event.start,
    end: event.end,
    title: "",
    description: "",
    location: "",
  });
  assert.throws(
    () => projectOwnerCalendarEvent({ ...event, description: "x".repeat(16_385) }, "full_detail"),
    (error) => error?.state === "temporarily_unavailable",
  );
});

test("Provider reads every page of one calendar with title, description and location", async () => {
  const { createGoogleCalendarProvider } = await providerModule();
  const calls = [];
  const provider = createGoogleCalendarProvider({
    fetch: async (url, init) => {
      const requested = new URL(url);
      calls.push({ requested, method: init?.method ?? "GET" });
      assert.equal(requested.pathname.endsWith("/events"), true);
      assert.match(requested.searchParams.get("fields"), /summary,description,location/);
      const secondPage = requested.searchParams.get("pageToken") === "next";
      return Response.json({
        items: [{
          id: secondPage ? "event-two" : "event-one",
          status: "confirmed",
          start: { dateTime: secondPage ? "2026-10-16T12:00:00+08:00" : "2026-10-16T10:00:00+08:00" },
          end: { dateTime: secondPage ? "2026-10-16T13:00:00+08:00" : "2026-10-16T11:00:00+08:00" },
          summary: secondPage ? "會議" : "丈量",
          description: secondPage ? "討論\n材料" : "確認尺寸",
          location: "專案工地",
          attendees: [{ email: "private@example.com" }],
        }],
        ...(secondPage ? {} : { nextPageToken: "next" }),
      });
    },
  });
  const result = await provider.readSelectedEvents({
    accessToken: "test-token",
    selections: [{
      calendarId: "project-calendar-id",
      selectionRef: flow.choices[0].choiceRef,
      shareMode: "full_detail",
    }],
    timeMin: "2026-10-16T00:00:00+08:00",
    timeMax: "2026-10-17T00:00:00+08:00",
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.method), ["GET", "GET"]);
  assert.deepEqual(result.events?.map(({ providerEventId, title, description, location }) => ({
    providerEventId, title, description, location,
  })), [
    { providerEventId: "event-one", title: "丈量", description: "確認尺寸", location: "專案工地" },
    { providerEventId: "event-two", title: "會議", description: "討論\n材料", location: "專案工地" },
  ]);
  assert.equal("shareCalendarWithRecipients" in provider, false);
});

test("migration seals a single read-only in-app calendar and disables Google mutation paths", async () => {
  const sql = await readFile(migrationUrl, "utf8").catch(() => "");
  assert.match(sql, /vendor_google_calendar_dispatch_v2\s*\(/i);
  assert.match(sql, /calendar\.events\.owned\.readonly/i);
  assert.doesNotMatch(sql, /calendar\.acls|calendar\.events\.owned['"]|recipient_policy_v2|mutation_v2\s*\(/i);
  assert.match(sql, /jsonb_array_length\s*\(\s*p_input->'choices'\s*\)\s*<>\s*1/i);
  assert.match(sql, /share_mode[^\n]+full_detail/i);
  assert.match(sql, /owner_vendor_google_calendar_projection_v1\s*\(/i);
  assert.match(sql, /count\s*\(\s*\*\s*\)[^;]*share_mode\s*=\s*'full_detail'/is);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vendor_google_calendar_dispatch_v2/i);
});

test("PCM projection derives its case from live authority and grants no browser SQL access", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /function\s+public\.pcm_vendor_google_calendar_projection_v1\s*\(\s*p_authenticated_user_id\s+uuid\s*\)/i);
  assert.match(sql, /drs_identity_authority_resolve_locked_v1\s*\(\s*p_authenticated_user_id\s*,\s*null\s*,\s*null\s*\)/i);
  assert.match(sql, /drs_workspace_grant_v2\s*\(\s*p_authenticated_user_id\s*,\s*v_current_case_id\s*,\s*v_authority->>'authorization_subject'\s*\)/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.pcm_vendor_google_calendar_projection_v1\s*\(\s*uuid\s*\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i);
});
