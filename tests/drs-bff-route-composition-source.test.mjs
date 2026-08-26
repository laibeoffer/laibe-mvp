import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(relativePath) {
  return await readFile(new URL(relativePath, root), "utf8");
}

async function sha256(relativePath) {
  const bytes = await readFile(new URL(relativePath, root));
  return createHash("sha256").update(bytes).digest("hex");
}

const guardedRoutes = Object.freeze([
  "supabase/functions/drs-workspace-grant/index.ts",
  "supabase/functions/drs-google-calendar-grant/index.ts",
  "supabase/functions/drs-google-calendar-oauth-start/index.ts",
  "supabase/functions/drs-google-calendar-events-read/index.ts",
  "supabase/functions/drs-google-calendar-revoke/index.ts",
]);

test("all five composed routes guard before server authority or provider work", async () => {
  for (const relativePath of guardedRoutes) {
    const text = await source(relativePath);
    assert.match(text, /export const VERIFY_JWT(?:_REQUIRED)? = false;/u);
    const guard = text.indexOf("bffGuard.authorize(request)");
    assert.notEqual(guard, -1, relativePath);
    assert.doesNotMatch(text, /resolveAuthenticatedIdentity\(request\)/u);
    for (
      const backendMarker of [
        "resolveWorkspaceGrant(",
        "port.resolveAuthorization(",
        "authorization.resolveAuthorization({",
        "port.loadGrant(",
        "port.readEvents(",
        "port.revoke(",
        'createOAuthStartHandler("drs"',
      ]
    ) {
      const backend = text.indexOf(backendMarker);
      if (backend !== -1) {
        assert.ok(guard < backend, `${relativePath}: ${backendMarker}`);
      }
    }
  }
});

test("focused RED: P2 shared config map and private buckets are absent", async () => {
  const config = await source("supabase/config.toml");
  const tables = [...`${config}\n[`.matchAll(
    /^\[([^\]]+)\]\n([\s\S]*?)(?=^\[)/gmu,
  )].map((match) => [match[1], match[2].trimEnd()]);
  const tableNames = tables.map(([name]) => name);
  assert.equal(new Set(tableNames).size, tableNames.length);

  const functionEntries = tables
    .filter(([name]) => name.startsWith("functions."))
    .map(([name, body]) => {
      assert.match(body, /^verify_jwt = (?:true|false)$/u, name);
      return [name.slice("functions.".length), body.endsWith("true")];
    });
  const map = Object.fromEntries(functionEntries);
  assert.equal(functionEntries.length, 15);
  assert.equal(Object.keys(map).length, 15);
  assert.deepEqual(map, {
    "drs-session-bootstrap": false,
    "drs-workspace-grant": false,
    "drs-google-calendar-grant": false,
    "drs-google-calendar-oauth-start": false,
    "drs-google-calendar-oauth-callback": false,
    "drs-google-calendar-events-read": false,
    "drs-google-calendar-revoke": false,
    "casework-case-create": true,
    "owner-workspace-grant": true,
    "vendor-workspace-grant": true,
    "highest-reviewer-workspace-grant": true,
    "drs-document-upload-intent": false,
    "drs-document-upload-finalize": false,
    "drs-document-version-download": false,
    "drs-document-snapshot": false,
  });

  const bucketEntries = tables.filter(([name]) =>
    name.startsWith("storage.buckets.")
  );
  assert.deepEqual(
    bucketEntries.map(([name]) => name),
    [
      "storage.buckets.drs-case-intake-private",
      "storage.buckets.drs-case-records-private",
    ],
  );
  const expectedBucketBody = [
    "public = false",
    'file_size_limit = "25MiB"',
    'allowed_mime_types = ["application/pdf", "image/jpeg", "image/png"]',
  ].join("\n");
  for (const [name, body] of bucketEntries) {
    assert.equal(body, expectedBucketBody, name);
  }
  assert.doesNotMatch(config, /objects_path/iu);
  assert.doesNotMatch(
    config,
    /https?:\/\/|service_role|secret|provision|apply|remote/iu,
  );
});

test("P1 JWT handlers close caller authority before service work", async () => {
  for (
    const [relativePath, backendMarker] of [
      ["supabase/functions/casework-case-create/index.ts", "createCase("],
      [
        "supabase/functions/owner-workspace-grant/index.ts",
        "resolveWorkspaceGrant(",
      ],
      [
        "supabase/functions/vendor-workspace-grant/index.ts",
        "resolveWorkspaceGrant(",
      ],
      [
        "supabase/functions/highest-reviewer-workspace-grant/index.ts",
        "resolveWorkspaceGrant(",
      ],
    ]
  ) {
    const route = await source(relativePath);
    assert.match(route, /VERIFY_JWT_REQUIRED = true/u);
    const identity = route.indexOf("resolveAuthenticatedIdentity(request)");
    const backend = route.indexOf(backendMarker);
    assert.notEqual(identity, -1, relativePath);
    assert.notEqual(backend, -1, relativePath);
    assert.ok(identity < backend, relativePath);
    assert.doesNotMatch(
      route,
      /query.*case|body.*caseId|user_metadata|raw_user_meta_data/iu,
    );
  }
});

test("DRS workspace remains POST exact-empty and guarded before resolver", async () => {
  const route = await source("supabase/functions/drs-workspace-grant/index.ts");
  const composition = await source(
    "supabase/functions/_shared/drs-auth/drs-bff-route-composition.ts",
  );
  assert.match(route, /createDrsBffRouteGuard\("workspaceGrant"\)/u);
  const guard = route.indexOf("bffGuard.authorize(request)");
  const resolver = route.indexOf("resolveWorkspaceGrant(");
  assert.ok(guard >= 0 && resolver > guard);
  assert.match(
    composition,
    /workspaceGrant:\s*closedPost\([\s\S]*?"\/functions\/v1\/drs-workspace-grant"[\s\S]*?exactEmptyBody/u,
  );
});

test("accepted BFF contracts and excluded Calendar callback stay byte-identical", async () => {
  assert.equal(
    await sha256("supabase/functions/_shared/drs-auth/contracts.ts"),
    "72fbc081359f8e3db870a32e5614a2229039d8af6e9e03c07f16ac309e133a51",
  );
  assert.equal(
    await sha256(
      "supabase/functions/drs-google-calendar-oauth-callback/index.ts",
    ),
    "69b956125c8168b13cac54049d9ddd27eb4396b6daf47e05845ccbca7878c61f",
  );
  const callbackPath =
    "supabase/functions/drs-google-calendar-oauth-callback/index.ts";
  const callback = await source(callbackPath);
  assert.equal(guardedRoutes.includes(callbackPath), false);
  assert.doesNotMatch(
    callback,
    /createDrsBffRouteGuard|bffGuard\.authorize\(request\)/u,
  );
});

test("focused correction source binds fresh OAuth assignment, A0 ACTIVE, and pre-auth event windows", async () => {
  const oauthStart = await source(
    "supabase/functions/drs-google-calendar-oauth-start/index.ts",
  );
  assert.match(
    oauthStart,
    /authorization\.resolveAuthorization\(\{[\s\S]*?pending:\s*null,/u,
  );
  assert.doesNotMatch(
    oauthStart,
    /pending:\s*drsBffCalendarPending\(guarded\)/u,
  );

  const workspace = await source(
    "supabase/functions/drs-workspace-grant/index.ts",
  );
  assert.match(workspace, /status:\s*"ACTIVE"/u);
  assert.doesNotMatch(workspace, /status:\s*grant\.caseStatus/u);

  const composition = await source(
    "supabase/functions/_shared/drs-auth/drs-bff-route-composition.ts",
  );
  const preAuthorization = composition.indexOf(
    "assertExactCalendarEventsWindow(request, body)",
  );
  const acceptedGuard = composition.indexOf("acceptedGuard.authorize(request)");
  assert.notEqual(preAuthorization, -1);
  assert.notEqual(acceptedGuard, -1);
  assert.ok(preAuthorization < acceptedGuard);
});

test("focused streaming source uses one bounded reader preflight for every route", async () => {
  const composition = await source(
    "supabase/functions/_shared/drs-auth/drs-bff-route-composition.ts",
  );
  assert.match(composition, /request\.clone\(\)\.body/u);
  assert.match(composition, /\.getReader\(\)/u);
  assert.match(composition, /reader\.cancel\(/u);
  assert.match(composition, /request\.body\?\.cancel\(/u);
  assert.doesNotMatch(composition, /request\.clone\(\)\.arrayBuffer\(\)/u);
  const preflight = composition.indexOf("boundedRouteBodyPreflight(request)");
  const accepted = composition.indexOf("acceptedGuard.authorize(request)");
  assert.notEqual(preflight, -1);
  assert.notEqual(accepted, -1);
  assert.ok(preflight < accepted);

  for (const routePath of guardedRoutes) {
    const route = await source(routePath);
    assert.match(route, /createDrsBffRouteGuard\(/u, routePath);
  }
});
