import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const moduleUrl = new URL(
  "../functions/_shared/vendor-google-calendar-support/owner-projection.ts",
  import.meta.url,
);
const migrationUrl = new URL(
  "../migrations/20260925100000_owner_vendor_calendar_projection_v1.sql",
  import.meta.url,
);

async function projectionModule() {
  return import(moduleUrl.href);
}

test("Owner month reads accept only the approved bounded request fields", async () => {
  const { parseOwnerCalendarProjectionRequest } = await projectionModule();
  const request = {
    schemaVersion: "laibe.owner-vendor-calendar-read.v1",
    timeMin: "2026-09-01T00:00:00+08:00",
    timeMax: "2026-10-02T00:00:00+08:00",
  };

  assert.deepEqual(parseOwnerCalendarProjectionRequest(request), request);

  for (const forbidden of [
    "caseId",
    "vendorId",
    "calendarId",
    "credentialId",
    "bindingRef",
    "sharingRevision",
    "credentialGeneration",
  ]) {
    assert.throws(
      () => parseOwnerCalendarProjectionRequest({ ...request, [forbidden]: "caller-value" }),
      (error) => error?.state === "invalid_request" && error?.status === 400,
      `${forbidden} must not become an Owner authority selector`,
    );
  }

  assert.throws(
    () =>
      parseOwnerCalendarProjectionRequest({
        ...request,
        timeMax: "2026-10-02T00:00:00.001+08:00",
      }),
    (error) => error?.state === "invalid_request" && error?.status === 400,
  );
  assert.throws(
    () => parseOwnerCalendarProjectionRequest({ ...request, timeMin: "not-a-time" }),
    (error) => error?.state === "invalid_request" && error?.status === 400,
  );
});

test("Owner event projection strips Provider data and enforces the share mode", async () => {
  const { projectOwnerCalendarEvent } = await projectionModule();
  const internalEvent = {
    eventRef: "8a3ae5d5-0e99-4587-bc81-b53d449d7f8b",
    selectionRef: "e4a38cae-0c2d-4b93-8e3c-01f31bc6bc92",
    allDay: false,
    start: "2026-09-18T10:00:00+08:00",
    end: "2026-09-18T11:30:00+08:00",
    title: "現場丈量",
    providerEventId: "google-event-id",
    calendarId: "vendor@example.com",
    description: "不可出現在甲方投影",
    location: "私人地址",
    attendees: ["private@example.com"],
    conferenceLink: "https://meet.google.com/private",
  };

  assert.deepEqual(projectOwnerCalendarEvent(internalEvent, "availability_only"), {
    eventRef: "8a3ae5d5-0e99-4587-bc81-b53d449d7f8b",
    selectionRef: "e4a38cae-0c2d-4b93-8e3c-01f31bc6bc92",
    allDay: false,
    start: "2026-09-18T10:00:00+08:00",
    end: "2026-09-18T11:30:00+08:00",
  });
  assert.deepEqual(projectOwnerCalendarEvent(internalEvent, "title_time"), {
    eventRef: "8a3ae5d5-0e99-4587-bc81-b53d449d7f8b",
    selectionRef: "e4a38cae-0c2d-4b93-8e3c-01f31bc6bc92",
    allDay: false,
    start: "2026-09-18T10:00:00+08:00",
    end: "2026-09-18T11:30:00+08:00",
    title: "現場丈量",
  });
});

test("Owner status serializes safe state without OAuth or Provider internals", async () => {
  const { buildOwnerCalendarStatus } = await projectionModule();

  assert.deepEqual(
    buildOwnerCalendarStatus({
      state: "ready",
      caseId: "5d87fcb4-1d97-46dd-89b0-a5d52d4dbd5d",
      sharingRevision: 7,
      vendorId: "private-vendor-id",
      calendarId: "private-calendar-id",
      encryptedCredential: "private-credential",
      oauthAuthorizationUrl: "https://accounts.google.com/o/oauth2/auth",
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    }),
    {
      schemaVersion: "laibe.owner-vendor-calendar-status.v1",
      state: "ready",
      caseId: "5d87fcb4-1d97-46dd-89b0-a5d52d4dbd5d",
      sharingRevision: 7,
      timeZone: "Asia/Taipei",
    },
  );
});

test("SQL projection authority is service-only and takes no browser selectors", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+public\.owner_vendor_google_calendar_projection_v1\s*\(\s*p_authenticated_user_id\s+uuid\s*,\s*p_expected_case_id\s+uuid\s*\)/i,
  );
  assert.doesNotMatch(
    sql,
    /p_(?:vendor|calendar|credential|binding|selection|sharing_revision|credential_generation)/i,
  );
  assert.match(sql, /security\s+definer/i);
  assert.match(sql, /set\s+search_path\s*=\s*''/i);
  assert.match(
    sql,
    /current_setting\s*\(\s*'role'\s*,\s*true\s*\)\s+is\s+distinct\s+from\s+'service_role'/i,
  );
  assert.match(
    sql,
    /revoke\s+all\s+on\s+function\s+public\.owner_vendor_google_calendar_projection_v1\s*\(\s*uuid\s*,\s*uuid\s*\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.owner_vendor_google_calendar_projection_v1\s*\(\s*uuid\s*,\s*uuid\s*\)\s+to\s+service_role/i,
  );
  assert.doesNotMatch(
    sql,
    /select\s+binding\s*,\s*credential\s+into\s+v_binding\s*,\s*v_credential/i,
  );
  assert.match(sql, /select\s+binding\.\*\s+into\s+v_binding/i);
  assert.match(sql, /select\s+credential\.\*\s+into\s+v_credential/i);
});

test("SQL projection resolves one same-case active Vendor share and filters stale rows", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  for (const boundary of [
    /casework\.user_current_cases/i,
    /casework\.case_members/i,
    /role\s*=\s*'owner'/i,
    /role\s*=\s*'pro'/i,
    /integration\.vendor_google_calendar_bindings/i,
    /binding_status\s*=\s*'active'/i,
    /sharing_revision\s*>\s*0/i,
    /integration\.vendor_google_calendar_credentials/i,
    /credential_status\s*=\s*'active'/i,
    /credential_generation/i,
    /integration\.vendor_google_calendar_selections/i,
    /active\s+is\s+true/i,
    /count\s*\(\s*distinct\s+[^)]*user_id/i,
    /authority_denied/i,
    /not_shared/i,
    /temporarily_unavailable/i,
  ]) {
    assert.match(sql, boundary);
  }
});
