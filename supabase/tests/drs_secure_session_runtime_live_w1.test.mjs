import assert from "node:assert/strict";

const confirmationValue =
  "A17_S1AR_DISPOSABLE_LOCAL_RUNTIME_CONFIRMED_20260827_V1";
const runtimeConfirmed =
  Deno.env.get("A17_S1AR_RUNTIME_CONFIRMED") === confirmationValue;
Deno.env.delete("A17_S1AR_RUNTIME_CONFIRMED");

let createDrsBffGuard;
let createDrsSecureSessionRuntime;
let createDrsSessionBootstrapEndpoint;
let acceptedBootstrapHandler;
if (runtimeConfirmed) {
  ({ createDrsBffGuard } = await import(
    "../functions/_shared/drs-auth/drs-session-bootstrap-bff.ts"
  ));
  ({ createDrsSecureSessionRuntime } = await import(
    "../functions/_shared/drs-auth/drs-secure-session-runtime.ts"
  ));
  ({ createDrsSessionBootstrapEndpoint, handler: acceptedBootstrapHandler } =
    await import("../functions/drs-session-bootstrap/index.ts"));
}

const supabaseOrigin = "http://127.0.0.1:54321";
const appOrigin = "https://127.0.0.1:44443";
const successUrl = `${appOrigin}/specialist`;
const cookieName = "__Host-laibe-drs-session";
const bootstrapUrl =
  "http://127.0.0.1:58017/functions/v1/drs-session-bootstrap";
const dockerExecutable =
  "C:\\Users\\J\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe";
const databaseContainer = "supabase_db_a17-s1ar-20260827";
const SupabaseEdgeRuntimeContainerAcceptance = false;
const runtimeVerdictRot = "A17_S1AR_RUNTIME_VERDICT=NEEDS_REWORK_ROT";
const runtimeVerdictLock = "A17_S1AR_RUNTIME_VERDICT=NEEDS_REWORK_LOCK";
const hostileAccessTokenCanary = "A17_S1AR_HOSTILE_ACCESS_TOKEN_CANARY_202608";
const authorityVerifyPath = "/rest/v1/rpc/drs_server_session_verify_v1";
const authorityRevokePath = "/rest/v1/rpc/drs_server_session_revoke_v1";

const specialistA = "a1700000-0000-4000-8000-00000000000a";
const specialistB = "a1700000-0000-4000-8000-00000000000b";
const assignmentA = "a1700000-0000-4000-8000-000000000011";
const assignmentB = "a1700000-0000-4000-8000-000000000012";
const drsCaseA = "a1700000-0000-4000-8000-00000000001a";
const drsCaseB = "a1700000-0000-4000-8000-00000000001b";
const caseworkCaseA = "a1700000-0000-4000-8000-000000000021";
const caseworkCaseB = "a1700000-0000-4000-8000-000000000022";
const subjectA = `drs-specialist:${specialistA}`;
const subjectB = `drs-specialist:${specialistB}`;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const base64url43Pattern = /^[A-Za-z0-9_-]{43}$/u;
const emailPattern = /^[a-z0-9._-]+@example\.invalid$/u;

function sanitizedFailure(name) {
  return new Error(`A17_S1AR_${name}`);
}

function causalFailure(marker) {
  const error = sanitizedFailure("CAUSAL_RUNTIME_DEFECT");
  Object.defineProperty(error, "causalMarker", { value: marker });
  return error;
}

function randomBase64Url(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/u,
    "",
  );
}

function exactSevenEnvironment() {
  const values = Object.freeze({
    SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    LAIBE_DRS_APP_ORIGIN: Deno.env.get("LAIBE_DRS_APP_ORIGIN"),
    LAIBE_DRS_SESSION_SUCCESS_URL: Deno.env.get(
      "LAIBE_DRS_SESSION_SUCCESS_URL",
    ),
    LAIBE_DRS_SESSION_COOKIE_NAME: Deno.env.get(
      "LAIBE_DRS_SESSION_COOKIE_NAME",
    ),
    LAIBE_DRS_SESSION_COOKIE_KEY_V1: Deno.env.get(
      "LAIBE_DRS_SESSION_COOKIE_KEY_V1",
    ),
    LAIBE_DRS_BFF_PROOF_KEY_V1: Deno.env.get(
      "LAIBE_DRS_BFF_PROOF_KEY_V1",
    ),
  });
  assert.equal(values.SUPABASE_URL, supabaseOrigin);
  assert.equal(values.LAIBE_DRS_APP_ORIGIN, appOrigin);
  assert.equal(values.LAIBE_DRS_SESSION_SUCCESS_URL, successUrl);
  assert.equal(values.LAIBE_DRS_SESSION_COOKIE_NAME, cookieName);
  assert.equal(
    typeof values.SUPABASE_SERVICE_ROLE_KEY === "string" &&
      values.SUPABASE_SERVICE_ROLE_KEY.length > 0,
    true,
  );
  assert.match(
    values.LAIBE_DRS_SESSION_COOKIE_KEY_V1 ?? "",
    base64url43Pattern,
  );
  assert.match(values.LAIBE_DRS_BFF_PROOF_KEY_V1 ?? "", base64url43Pattern);
  assert.notEqual(
    values.LAIBE_DRS_SESSION_COOKIE_KEY_V1,
    values.LAIBE_DRS_BFF_PROOF_KEY_V1,
  );
  return values;
}

async function readBoundedJson(response, expectedStatus, maxBytes = 32_768) {
  if (
    response.status !== expectedStatus || response.redirected ||
    response.body === null
  ) throw sanitizedFailure("FETCH_STATUS_REJECTED");
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength === null || !/^(?:0|[1-9][0-9]*)$/u.test(declaredLength) ||
    Number(declaredLength) < 1 || Number(declaredLength) > maxBytes
  ) throw sanitizedFailure("FETCH_CONTENT_LENGTH_REJECTED");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      if (!(item.value instanceof Uint8Array)) {
        throw sanitizedFailure("FETCH_CHUNK_REJECTED");
      }
      total += item.value.byteLength;
      if (total < 1 || total > maxBytes) {
        throw sanitizedFailure("FETCH_SIZE_REJECTED");
      }
      chunks.push(item.value);
    }
    if (total !== Number(declaredLength)) {
      throw sanitizedFailure("FETCH_CONTENT_LENGTH_MISMATCH");
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    assertNoDuplicateTopLevelMembers(text);
    return JSON.parse(text);
  } catch {
    await reader.cancel();
    throw sanitizedFailure("FETCH_BODY_REJECTED");
  }
}

function assertNoDuplicateTopLevelMembers(text) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let token = "";
  let pendingKey = null;
  const keys = new Set();
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        token += character;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        token += character;
        continue;
      }
      if (character === '"') {
        inString = false;
        pendingKey = depth === 1 ? token : null;
        continue;
      }
      token += character;
      continue;
    }
    if (character === '"') {
      inString = true;
      token = "";
      continue;
    }
    if (character === "{") {
      depth += 1;
      continue;
    }
    if (character === "}") {
      depth -= 1;
      pendingKey = null;
      continue;
    }
    if (character === ":" && depth === 1 && pendingKey !== null) {
      if (keys.has(pendingKey)) {
        throw sanitizedFailure("FETCH_DUPLICATE_MEMBER_REJECTED");
      }
      keys.add(pendingKey);
      pendingKey = null;
    } else if (!/\s/u.test(character) && character !== ",") pendingKey = null;
  }
}

const authFetchOperations = Object.freeze([
  "AUTH_CREATE",
  "AUTH_TOKEN",
  "AUTH_CURRENT",
]);
const closedFetchCauses = Object.freeze([
  "FETCH_STATUS_REJECTED",
  "FETCH_CONTENT_LENGTH_REJECTED",
  "FETCH_CHUNK_REJECTED",
  "FETCH_SIZE_REJECTED",
  "FETCH_CONTENT_LENGTH_MISMATCH",
  "FETCH_DUPLICATE_MEMBER_REJECTED",
  "FETCH_BODY_REJECTED",
  "FETCH_UNAVAILABLE",
]);

async function fetchJson(operation, path, init, expectedStatus) {
  if (!authFetchOperations.includes(operation)) {
    throw sanitizedFailure("FETCH_OPERATION_REJECTED");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${supabaseOrigin}${path}`, {
      ...init,
      redirect: "error",
      signal: controller.signal,
    });
    return await readBoundedJson(response, expectedStatus);
  } catch (error) {
    const closedCause = error instanceof Error
      ? closedFetchCauses.find(
        (cause) => error.message === `A17_S1AR_${cause}`,
      )
      : undefined;
    throw sanitizedFailure(
      `${operation}_${closedCause ?? "FETCH_UNAVAILABLE"}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function runPsql(sql) {
  const command = new Deno.Command(dockerExecutable, {
    args: [
      "exec",
      databaseContainer,
      "psql",
      "--no-psqlrc",
      "--quiet",
      "--set=ON_ERROR_STOP=1",
      "--username=postgres",
      "--dbname=postgres",
      "--command",
      sql,
    ],
    clearEnv: true,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  if (!output.success || output.code !== 0) {
    throw sanitizedFailure("PSQL_REJECTED");
  }
}

function assertUserId(value) {
  assert.equal(typeof value, "string");
  assert.match(value, uuidPattern);
  return value;
}

async function createRealAuthUser(serviceRoleKey, registerUserId) {
  const nonce = randomBase64Url(12).toLowerCase();
  const email = `a17-s1ar-${nonce}@example.invalid`;
  const password = `${randomBase64Url(32)}aA1!`;
  assert.match(email, emailPattern);
  const adminHeaders = {
    "apikey": serviceRoleKey,
    "authorization": `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
  const created = await fetchJson(
    "AUTH_CREATE",
    "/auth/v1/admin/users",
    {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {},
      }),
    },
    200,
  );
  const userId = assertUserId(created?.id);
  registerUserId(userId);

  const signedIn = await fetchJson(
    "AUTH_TOKEN",
    "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
    200,
  );
  const accessToken = signedIn?.access_token;
  if (typeof accessToken !== "string" || accessToken.length < 32) {
    throw sanitizedFailure("AUTH_TOKEN_REJECTED");
  }
  const current = await fetchJson(
    "AUTH_CURRENT",
    "/auth/v1/user",
    {
      method: "GET",
      headers: {
        "apikey": serviceRoleKey,
        "authorization": `Bearer ${accessToken}`,
      },
    },
    200,
  );
  assert.equal(current?.id, userId);
  return Object.freeze({ userId, email, password: undefined });
}

async function deleteRealAuthUser(serviceRoleKey, userId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(
      `${supabaseOrigin}/auth/v1/admin/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          "apikey": serviceRoleKey,
          "authorization": `Bearer ${serviceRoleKey}`,
        },
        redirect: "error",
        signal: controller.signal,
      },
    );
    if (![200, 204, 404].includes(response.status)) {
      throw sanitizedFailure("AUTH_CLEAN_REJECTED");
    }
    await response.body?.cancel();
  } finally {
    clearTimeout(timer);
  }
}

async function assertAuthAdminAbsence(serviceRoleKey, userId) {
  const response = await fetch(
    `${supabaseOrigin}/auth/v1/admin/users/${userId}`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      redirect: "error",
    },
  );
  assert.equal(response.status, 404);
  await response.body?.cancel();
}

async function attemptCleanup(name, action, cleanupErrors) {
  try {
    await action();
  } catch {
    cleanupErrors.push(
      `A17_S1AR_CLEANUP_${name.toUpperCase().replaceAll("-", "_")}`,
    );
  }
}

async function assertExactCanaryAbsence(userId) {
  assertUserId(userId);
  await runPsql(`do $$ begin
    if exists (select 1 from integration.drs_server_sessions where authenticated_user_id = '${userId}')
      or exists (select 1 from integration.drs_workspace_grants where authenticated_user_id = '${userId}')
      or exists (select 1 from integration.drs_auth_specialist_bindings where authenticated_user_id = '${userId}')
      or exists (select 1 from public.drs_specialists where specialist_id in ('${specialistA}', '${specialistB}'))
      or exists (select 1 from casework.cases where id in ('${caseworkCaseA}', '${caseworkCaseB}'))
    then raise exception 'A17_EXACT_CANARY_REMAINS'; end if;
  end $$;`);
}

function fixtureSql(userId) {
  assertUserId(userId);
  return `
begin;
set local statement_timeout = '15s';
insert into public.drs_specialists (specialist_id, display_name, authority_state)
values
  ('${specialistA}', 'A17 Specialist A', 'ACTIVE'),
  ('${specialistB}', 'A17 Specialist B', 'ACTIVE');
insert into public.drs_cases (case_id, case_number, owner_id, case_state)
values
  ('${drsCaseA}', 'A17-S1AR-CASE-A', '${userId}', 'ACTIVE_REVIEW'),
  ('${drsCaseB}', 'A17-S1AR-CASE-B', '${userId}', 'ACTIVE_REVIEW');
insert into public.drs_case_specialist_assignments (
  assignment_id, case_id, specialist_id, assigned_by, valid_from, valid_until
) values
  ('${assignmentA}', '${drsCaseA}', '${specialistA}', '${userId}', clock_timestamp() - interval '1 minute', clock_timestamp() + interval '30 minutes'),
  ('${assignmentB}', '${drsCaseB}', '${specialistB}', '${userId}', clock_timestamp() - interval '1 minute', clock_timestamp() + interval '30 minutes');
insert into casework.cases (
  id, case_status, title, created_by, creation_idempotency_key,
  creation_payload_sha256
) values
  ('${caseworkCaseA}', 'active', 'A17 S1AR Case A', '${userId}', 'a17-s1ar-case-a-20260827', repeat('a', 64)),
  ('${caseworkCaseB}', 'active', 'A17 S1AR Case B', '${userId}', 'a17-s1ar-case-b-20260827', repeat('b', 64));
insert into integration.drs_case_identity_bindings (
  case_identity_binding_id, drs_case_id, casework_case_id, mapping_status,
  valid_from, valid_until
) values
  ('a1700000-0000-4000-8000-000000000031', '${drsCaseA}', '${caseworkCaseA}', 'active', clock_timestamp() - interval '1 minute', clock_timestamp() + interval '30 minutes'),
  ('a1700000-0000-4000-8000-000000000032', '${drsCaseB}', '${caseworkCaseB}', 'active', clock_timestamp() - interval '1 minute', clock_timestamp() + interval '30 minutes');
insert into integration.drs_auth_specialist_bindings (
  binding_id, authenticated_user_id, specialist_id, selected_assignment_id,
  authorization_subject, binding_status, valid_from, valid_until
) values (
  'a1700000-0000-4000-8000-000000000041', '${userId}', '${specialistA}',
  '${assignmentA}', '${subjectA}', 'active', clock_timestamp() - interval '1 minute',
  clock_timestamp() + interval '30 minutes'
);
commit;`;
}

function rotateBindingSql(userId, toB) {
  assertUserId(userId);
  const specialist = toB ? specialistB : specialistA;
  const assignment = toB ? assignmentB : assignmentA;
  const subject = toB ? subjectB : subjectA;
  return `
begin;
set local statement_timeout = '15s';
do $$ begin
  update integration.drs_auth_specialist_bindings
  set specialist_id = '${specialist}',
      selected_assignment_id = '${assignment}',
      authorization_subject = '${subject}',
      valid_from = clock_timestamp() - interval '1 minute',
      valid_until = clock_timestamp() + interval '30 minutes',
      updated_at = clock_timestamp()
  where authenticated_user_id = '${userId}';
  if not found then raise exception 'A17_ROT_BINDING_MISSING'; end if;
end $$;
commit;`;
}

function cleanupSql(userId) {
  assertUserId(userId);
  return `
begin;
set local statement_timeout = '15s';
set local session_replication_role = replica;
delete from integration.drs_server_sessions where authenticated_user_id = '${userId}';
delete from integration.drs_workspace_grants
where authenticated_user_id = '${userId}'
  and casework_case_id in ('${caseworkCaseA}', '${caseworkCaseB}')
  and drs_case_id in ('${drsCaseA}', '${drsCaseB}')
  and specialist_id in ('${specialistA}', '${specialistB}');
delete from integration.drs_auth_specialist_bindings where authenticated_user_id = '${userId}';
delete from integration.drs_case_identity_bindings where casework_case_id in ('${caseworkCaseA}', '${caseworkCaseB}');
delete from public.drs_case_specialist_assignment_terminations where assignment_id in ('${assignmentA}', '${assignmentB}');
delete from public.drs_case_specialist_assignments where assignment_id in ('${assignmentA}', '${assignmentB}');
delete from public.drs_cases where case_id in ('${drsCaseA}', '${drsCaseB}');
delete from public.drs_specialists where specialist_id in ('${specialistA}', '${specialistB}');
delete from casework.cases where id in ('${caseworkCaseA}', '${caseworkCaseB}');
commit;
do $$ begin
  if exists (select 1 from integration.drs_server_sessions where authenticated_user_id = '${userId}')
    or exists (
      select 1 from integration.drs_workspace_grants
      where authenticated_user_id = '${userId}'
        and casework_case_id in ('${caseworkCaseA}', '${caseworkCaseB}')
        and drs_case_id in ('${drsCaseA}', '${drsCaseB}')
        and specialist_id in ('${specialistA}', '${specialistB}')
    )
    or exists (select 1 from integration.drs_auth_specialist_bindings where authenticated_user_id = '${userId}')
    or exists (select 1 from integration.drs_case_identity_bindings where casework_case_id in ('${caseworkCaseA}', '${caseworkCaseB}'))
    or exists (select 1 from public.drs_case_specialist_assignment_terminations where assignment_id in ('${assignmentA}', '${assignmentB}'))
    or exists (select 1 from public.drs_case_specialist_assignments where assignment_id in ('${assignmentA}', '${assignmentB}'))
    or exists (select 1 from public.drs_cases where case_id in ('${drsCaseA}', '${drsCaseB}'))
    or exists (select 1 from public.drs_specialists where specialist_id in ('${specialistA}', '${specialistB}'))
    or exists (select 1 from casework.cases where id in ('${caseworkCaseA}', '${caseworkCaseB}'))
  then raise exception 'A17_CLEAN_READBACK_FAILED'; end if;
end $$;`;
}

function sessionInput(userId) {
  return Object.freeze({
    authenticatedUserId: userId,
    specialistId: specialistA,
    authorizationSubject: subjectA,
    callbackOrigin: appOrigin,
    successRedirectUrl: successUrl,
    sessionCookieName: cookieName,
  });
}

async function createCookie(runtime, userId) {
  const result = await runtime.verifiedSessionProducer.createVerifiedSession(
    sessionInput(userId),
  );
  assert.equal(result.response.status, 303);
  assert.equal(result.response.headers.get("location"), successUrl);
  const responseBody = new Uint8Array(await result.response.arrayBuffer());
  assert.equal(responseBody.byteLength, 0);
  const setCookie = result.response.headers.get("set-cookie") ?? "";
  const cookieParts = setCookie.split(";").map((part) => part.trim());
  const exactCookie = cookieParts.shift() ?? "";
  assert.deepEqual(cookieParts, [
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ]);
  assert.equal(cookieParts.some((part) => /^Domain=/iu.test(part)), false);
  assert.match(exactCookie, new RegExp(`^${cookieName}=v1\\.`));
  assert.equal(exactCookie.includes(userId), false);
  assert.equal(exactCookie.includes(specialistA), false);
  return exactCookie;
}

function bootstrapRequest(cookie) {
  return new Request(bootstrapUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cookie": cookie,
      "origin": appOrigin,
      "sec-fetch-site": "same-origin",
    },
    body: "{}",
  });
}

function guardRequest(cookie, proof) {
  return new Request(`${appOrigin}/functions/v1/drs-secure-probe`, {
    method: "POST",
    headers: {
      "authorization": proof,
      "cookie": cookie,
      "origin": appOrigin,
      "sec-fetch-site": "same-origin",
    },
  });
}

async function startAcceptedServer() {
  let listeningResolve;
  const listening = new Promise((resolve) => listeningResolve = resolve);
  const server = Deno.serve({
    hostname: "127.0.0.1",
    port: 58017,
    onListen() {
      listeningResolve();
    },
  }, acceptedBootstrapHandler);
  await listening;
  return server;
}

async function bootstrapThroughLoopback(cookie) {
  const response = await fetch(bootstrapUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cookie": cookie,
      "origin": appOrigin,
      "sec-fetch-site": "same-origin",
    },
    body: "{}",
    redirect: "error",
  });
  assert.equal(response.status, 204);
  const proof = response.headers.get("authorization") ?? "";
  assert.match(
    proof,
    /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u,
  );
  await response.body?.cancel();
  return proof;
}

async function assertSanitizedBodyless401(response) {
  assert.equal(response.status, 401);
  const responseBody = new Uint8Array(await response.arrayBuffer());
  assert.equal(responseBody.byteLength, 0);
  assert.equal(response.headers.has("authorization"), false);
  assert.equal(response.headers.has("set-cookie"), false);
}

async function assertRevokedBootstrapAndGuard401(
  runtime,
  cookie,
  proof,
  guard,
) {
  const cookieValue = cookie.slice(cookie.indexOf("=") + 1);
  const envelope = await runtime.bootstrapDependencies.cookieEnvelope
    .openCookieEnvelope(cookieValue);
  await runtime.sessionRevoker.revokeServerSession({
    serverSessionId: envelope.serverSessionId,
    accessToken: envelope.accessToken,
  });
  await assert.rejects(() =>
    runtime.sessionRevoker.revokeServerSession({
      serverSessionId: envelope.serverSessionId,
      accessToken: envelope.accessToken,
    })
  );
  const bootstrap401 = await fetch(bootstrapUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      origin: appOrigin,
      "sec-fetch-site": "same-origin",
    },
    body: "{}",
    redirect: "error",
  });
  await assertSanitizedBodyless401(bootstrap401);
  await assert.rejects(
    () => guard.authorize(guardRequest(cookie, proof)),
    (error) => {
      assert.equal(error?.status, 401);
      assert.equal(JSON.stringify(error).includes(envelope.accessToken), false);
      return true;
    },
  );
}

async function assertProofReplayWithinWindow(guard, cookie, proof) {
  const first = await guard.authorize(guardRequest(cookie, proof));
  const replay = await guard.authorize(guardRequest(cookie, proof));
  assert.deepEqual(replay, first);
}

async function assertProofExpiryWithInjectedClock(
  productionEnvironment,
  userId,
) {
  let injectedNow = new Date();
  const proofIssuedAtMs = injectedNow.getTime();
  const runtime = createDrsSecureSessionRuntime({
    env: { get: (name) => productionEnvironment[name] },
    now: () => injectedNow,
  });
  const cookie = await createCookie(runtime, userId);
  const endpoint = createDrsSessionBootstrapEndpoint(
    runtime.bootstrapDependencies,
  );
  const response = await endpoint(bootstrapRequest(cookie));
  assert.equal(response.status, 204);
  const proof = response.headers.get("authorization");
  const guard = createDrsBffGuard(runtime.bootstrapDependencies, {
    method: "POST",
    pathname: "/functions/v1/drs-secure-probe",
    queryFields: Object.freeze([]),
    jsonBodyFields: null,
  });
  injectedNow = new Date(proofIssuedAtMs + 59_000);
  await guard.authorize(guardRequest(cookie, proof));
  injectedNow = new Date(proofIssuedAtMs + 61_000);
  await assert.rejects(() => guard.authorize(guardRequest(cookie, proof)));
}

async function assertProofRejectedAfterRevokeAndRotation(
  runtime,
  userId,
  guard,
) {
  const revokedCookie = await createCookie(runtime, userId);
  const revokedProof = await bootstrapThroughLoopback(revokedCookie);
  await assertRevokedBootstrapAndGuard401(
    runtime,
    revokedCookie,
    revokedProof,
    guard,
  );
  const rotatedCookie = await createCookie(runtime, userId);
  const rotatedProof = await bootstrapThroughLoopback(rotatedCookie);
  await runPsql(rotateBindingSql(userId, true));
  await assert.rejects(() =>
    guard.authorize(guardRequest(rotatedCookie, rotatedProof))
  );
  await runPsql(rotateBindingSql(userId, false));
}

function bitFlip(value) {
  return `${value.slice(0, -1)}${value.endsWith("A") ? "B" : "A"}`;
}

async function assertAcceptedRuntimeTamperCase(
  name,
  runtime,
  guard,
  cookie,
  proof,
  productionEnvironment,
) {
  if (name === "cookie-bit-flip") {
    await assert.rejects(() =>
      guard.authorize(guardRequest(bitFlip(cookie), proof))
    );
  } else if (name === "proof-bit-flip") {
    await assert.rejects(() =>
      guard.authorize(guardRequest(cookie, bitFlip(proof)))
    );
  } else if (name === "wrong-cookie-key" || name === "wrong-proof-key") {
    const wrongEnvironment = {
      ...productionEnvironment,
      ...(name === "wrong-cookie-key"
        ? { LAIBE_DRS_SESSION_COOKIE_KEY_V1: randomBase64Url() }
        : { LAIBE_DRS_BFF_PROOF_KEY_V1: randomBase64Url() }),
    };
    const wrongRuntime = createDrsSecureSessionRuntime({
      env: { get: (key) => wrongEnvironment[key] },
    });
    const wrongGuard = createDrsBffGuard(wrongRuntime.bootstrapDependencies, {
      method: "POST",
      pathname: "/functions/v1/drs-secure-probe",
      queryFields: Object.freeze([]),
      jsonBodyFields: null,
    });
    await assert.rejects(() =>
      wrongGuard.authorize(guardRequest(cookie, proof))
    );
  } else if (name === "malformed-cookie") {
    await assert.rejects(() =>
      guard.authorize(guardRequest(`${cookieName}=v1.malformed`, proof))
    );
  } else if (name === "malformed-proof") {
    await assert.rejects(() =>
      guard.authorize(guardRequest(cookie, "Bearer malformed"))
    );
  } else if (name === "alg-none") {
    await assert.rejects(() =>
      guard.authorize(guardRequest(cookie, "Bearer eyJhbGciOiJub25lIn0.e30."))
    );
  } else throw sanitizedFailure("TAMPER_CASE_UNKNOWN");
  assert.equal(runtime.runtimeAvailable, true);
}

async function startHostileLoopbackFixture() {
  const fixtureOrigin = "http://127.0.0.1:54329";
  const encoder = new TextEncoder();
  let activeCase = "canonical-content-length";
  let readerCanceled = false;
  let lastRequestHeaders = Object.freeze([]);
  let requestPaths = [];
  let requestCount = 0;
  let listeningResolve;
  const listening = new Promise((resolve) => listeningResolve = resolve);

  function responseWithLength(body, declaredLength, extraHeaders = {}) {
    return new Response(body, {
      status: 200,
      headers: {
        "content-length": String(declaredLength),
        "content-type": "application/json",
        "x-provider-secret": "must-not-project",
        ...extraHeaders,
      },
    });
  }

  const server = Deno.serve({
    hostname: "127.0.0.1",
    port: 54329,
    onListen() {
      listeningResolve();
    },
  }, (request) => {
    const url = new URL(request.url);
    requestCount += 1;
    requestPaths.push(url.pathname);
    lastRequestHeaders = Object.freeze([...request.headers.keys()].sort());
    if (url.pathname === authorityRevokePath) {
      const revoked = encoder.encode('{"revoked":true}');
      return responseWithLength(revoked, revoked.byteLength);
    }
    if (url.pathname !== authorityVerifyPath) {
      return new Response(null, { status: 404 });
    }
    const validProjection = JSON.stringify({
      authenticated_user_id: assignmentA,
      specialist_id: specialistA,
      authorization_subject: subjectA,
      expires_at: new Date(Date.now() + 120_000).toISOString(),
    });
    const canonical = encoder.encode(validProjection);
    if (activeCase === "redirect") {
      return Response.redirect(
        `${fixtureOrigin}/rest/v1/rpc/drs_server_session_verify_v1`,
        307,
      );
    }
    if (activeCase === "shorter-than-content-length") {
      return responseWithLength(canonical, canonical.byteLength + 1);
    }
    if (activeCase === "longer-than-content-length") {
      return responseWithLength(canonical, canonical.byteLength - 1);
    }
    if (activeCase === "empty") return responseWithLength(new Uint8Array(), 1);
    if (activeCase === "fatal-utf8") {
      return responseWithLength(new Uint8Array([0xff]), 1);
    }
    if (activeCase === "duplicate-top-level-member") {
      const duplicate = encoder.encode(
        `{${
          validProjection.slice(1, -1)
        },"authenticated_user_id":"${assignmentA}"}`,
      );
      return responseWithLength(duplicate, duplicate.byteLength);
    }
    if (activeCase === "overflow-reader-cancellation") {
      const overflow = new Uint8Array(8193);
      return responseWithLength(
        new ReadableStream({
          start(controller) {
            controller.enqueue(overflow);
          },
          cancel() {
            readerCanceled = true;
          },
        }),
        8192,
      );
    }
    return responseWithLength(canonical, canonical.byteLength);
  });
  await listening;
  return Object.freeze({
    fixtureOrigin,
    server,
    setCase(name) {
      activeCase = name;
      readerCanceled = false;
      lastRequestHeaders = Object.freeze([]);
      requestPaths = [];
      requestCount = 0;
    },
    readerWasCanceled: () => readerCanceled,
    requestHeaders: () => lastRequestHeaders,
    assertExactRequests(expectedPaths) {
      assert.equal(requestCount, expectedPaths.length);
      assert.deepEqual(requestPaths, expectedPaths);
    },
  });
}

async function assertAcceptedRuntimeHostileCase(
  name,
  fixture,
  productionEnvironment,
) {
  fixture.setCase(name);
  const hostileEnvironment = Object.freeze({
    ...productionEnvironment,
    SUPABASE_URL: fixture.fixtureOrigin,
  });
  const hostileRuntime = createDrsSecureSessionRuntime({
    env: { get: (key) => hostileEnvironment[key] },
    fetch: globalThis.fetch,
  });
  const verify = () =>
    hostileRuntime.bootstrapDependencies.accessSessionVerifier
      .verifyAccessSession({
        serverSessionId: assignmentB,
        accessToken: hostileAccessTokenCanary,
      });
  const expectedPaths = [authorityVerifyPath];
  if (
    name === "canonical-content-length" ||
    name === "provider-header-drop"
  ) {
    const verified = await verify();
    assert.equal(verified.authenticatedUserId, assignmentA);
    assert.equal(verified.specialistId, specialistA);
    assert.equal(verified.authorizationSubject, subjectA);
    assert.equal(Number.isInteger(verified.expiresAtEpochSeconds), true);
    assert.equal(
      verified.expiresAtEpochSeconds > Math.floor(Date.now() / 1000),
      true,
    );
    assert.equal(Object.hasOwn(verified, "x-provider-secret"), false);
    assert.equal(fixture.requestHeaders().includes("x-provider-secret"), false);
    if (name === "provider-header-drop") {
      await hostileRuntime.sessionRevoker.revokeServerSession({
        serverSessionId: assignmentB,
        accessToken: hostileAccessTokenCanary,
      });
      expectedPaths.push(authorityRevokePath);
    }
    fixture.assertExactRequests(expectedPaths);
    return;
  }
  await assert.rejects(verify, /A17_DRS_SECURE_SESSION_REJECTED/u);
  if (name === "overflow-reader-cancellation") {
    assert.equal(fixture.readerWasCanceled(), true);
  }
  fixture.assertExactRequests(expectedPaths);
}

async function assertRotationBarrier(userId) {
  let pauseResolve;
  let releaseResolve;
  const paused = new Promise((resolve) => pauseResolve = resolve);
  const released = new Promise((resolve) => releaseResolve = resolve);
  let pausedOnce = false;
  const injectedFetch = async (input, init) => {
    const url = new URL(String(input));
    if (
      !pausedOnce &&
      url.pathname === "/rest/v1/rpc/drs_workspace_grant_v1"
    ) {
      pausedOnce = true;
      pauseResolve("ROT_BARRIER_FETCH_PAUSED");
      await released;
    }
    return await fetch(input, init);
  };
  const runtime = createDrsSecureSessionRuntime({ fetch: injectedFetch });
  assert.equal(runtime.runtimeAvailable, true);
  const cookie = await createCookie(runtime, userId);
  const endpoint = createDrsSessionBootstrapEndpoint(
    runtime.bootstrapDependencies,
  );
  const responsePromise = endpoint(bootstrapRequest(cookie));
  assert.equal(await paused, "ROT_BARRIER_FETCH_PAUSED");
  await runPsql(rotateBindingSql(userId, true));
  releaseResolve();
  const response = await responsePromise;
  const proof = response.headers.get("authorization");
  if (response.status === 204 || proof !== null) {
    throw causalFailure(runtimeVerdictRot);
  }
  await runPsql(rotateBindingSql(userId, false));
}

async function readFromReaderUntilMarker(reader, marker) {
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (!text.includes(marker)) {
      const item = await reader.read();
      if (item.done) throw sanitizedFailure("LOCK_MARKER_MISSING");
      text += decoder.decode(item.value, { stream: true });
      if (text.length > 16_384) {
        throw sanitizedFailure("LOCK_OUTPUT_REJECTED");
      }
    }
    return text;
  } catch {
    await reader.cancel();
    throw sanitizedFailure("LOCK_STREAM_REJECTED");
  }
}

function assertDbDeadlineFuture(barrier) {
  const { deadlineEpoch, dbNowEpoch } = barrier;
  assert.equal(Number.isFinite(deadlineEpoch), true);
  assert.equal(Number.isFinite(dbNowEpoch), true);
  assert.equal(deadlineEpoch > dbNowEpoch, true);
}

async function assertPendingBeforeRelease(operationPromise) {
  const state = await Promise.race([
    operationPromise.then(() => "settled", () => "settled"),
    new Promise((resolve) => setTimeout(() => resolve("pending"), 250)),
  ]);
  assert.equal(state, "pending");
}

async function decodeSessionCookie(runtime, cookie) {
  const decodedCookie = cookie.slice(cookie.indexOf("=") + 1);
  const envelope = await runtime.bootstrapDependencies.cookieEnvelope
    .openCookieEnvelope(decodedCookie);
  return Object.freeze({
    sessionId: envelope.serverSessionId,
    accessToken: envelope.accessToken,
  });
}

async function startPsqlLockBarrier(lockSql, marker) {
  const command = new Deno.Command(dockerExecutable, {
    args: [
      "exec",
      databaseContainer,
      "psql",
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set=ON_ERROR_STOP=1",
      "--username=postgres",
      "--dbname=postgres",
    ],
    clearEnv: true,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(lockSql));
  await writer.close();
  const stdoutReader = child.stdout.getReader();
  const lockedOutput = await readFromReaderUntilMarker(stdoutReader, marker);
  const deadlineMatch = lockedOutput.match(
    new RegExp(
      `${marker}\\|([0-9]+(?:\\.[0-9]+)?)\\|([0-9]+(?:\\.[0-9]+)?)`,
      "u",
    ),
  );
  if (!deadlineMatch) throw sanitizedFailure("LOCK_DEADLINE_MISSING");
  return {
    child,
    stdoutReader,
    deadlineEpoch: Number(deadlineMatch[1]),
    dbNowEpoch: Number(deadlineMatch[2]),
  };
}

async function finishPsqlLockBarrier(barrier, deadlinePassedMarker) {
  await readFromReaderUntilMarker(barrier.stdoutReader, deadlinePassedMarker);
  const status = await barrier.child.status;
  if (!status.success) throw sanitizedFailure("LOCK_PSQL_REJECTED");
}

async function closePsqlLockBarrier(barrier) {
  await barrier.stdoutReader.cancel();
  await barrier.child.stderr.cancel();
}

async function assertIssueLockBarrier(userId, runtime) {
  const barrier = await startPsqlLockBarrier(
    `
begin;
set local statement_timeout = '15s';
select 1 from integration.drs_auth_specialist_bindings
where authenticated_user_id = '${userId}' for update;
update integration.drs_auth_specialist_bindings
set valid_until = clock_timestamp() + interval '3 seconds',
    updated_at = clock_timestamp()
where authenticated_user_id = '${userId}';
select 'ISSUE_BARRIER_ROW_LOCKED|' || extract(epoch from valid_until)::text ||
       '|' || extract(epoch from clock_timestamp())::text
from integration.drs_auth_specialist_bindings
where authenticated_user_id = '${userId}';
select repeat('L', 8192);
select pg_sleep(greatest(0, extract(epoch from (valid_until - clock_timestamp())) + 0.25))
from integration.drs_auth_specialist_bindings
where authenticated_user_id = '${userId}';
do $$ declare v_deadline timestamptz; begin
  select valid_until into strict v_deadline
  from integration.drs_auth_specialist_bindings
  where authenticated_user_id = '${userId}';
  if v_deadline >= clock_timestamp() then
    raise exception 'A17_ISSUE_DB_DEADLINE_NOT_PASSED';
  end if;
end $$;
\echo ISSUE_DB_DEADLINE_PASSED
commit;`,
    "ISSUE_BARRIER_ROW_LOCKED",
  );
  try {
    assertDbDeadlineFuture(barrier);
    const issuePromise = runtime.verifiedSessionProducer.createVerifiedSession(
      sessionInput(userId),
    );
    await assertPendingBeforeRelease(issuePromise);
    await finishPsqlLockBarrier(barrier, "ISSUE_DB_DEADLINE_PASSED");
    const issueRelease = "ISSUE_BARRIER_RELEASED";
    assert.equal(issueRelease, "ISSUE_BARRIER_RELEASED");
    try {
      await assert.rejects(issuePromise, /A17_DRS_SECURE_SESSION_REJECTED/u);
    } catch {
      throw causalFailure(runtimeVerdictLock);
    }
  } finally {
    await closePsqlLockBarrier(barrier);
    await runPsql(rotateBindingSql(userId, false));
  }
}

async function assertVerifyLockBarrier(userId, cookie, proof, guard, runtime) {
  const barrier = await startPsqlLockBarrier(
    `
begin;
set local statement_timeout = '15s';
select 1 from integration.drs_auth_specialist_bindings
where authenticated_user_id = '${userId}' for update;
update integration.drs_auth_specialist_bindings
set valid_until = clock_timestamp() + interval '3 seconds',
    updated_at = clock_timestamp()
where authenticated_user_id = '${userId}';
select 'VERIFY_BARRIER_ROW_LOCKED|' || extract(epoch from valid_until)::text ||
       '|' || extract(epoch from clock_timestamp())::text
from integration.drs_auth_specialist_bindings
where authenticated_user_id = '${userId}';
select repeat('V', 8192);
select pg_sleep(greatest(0, extract(epoch from (valid_until - clock_timestamp())) + 0.25))
from integration.drs_auth_specialist_bindings
where authenticated_user_id = '${userId}';
do $$ declare v_deadline timestamptz; begin
  select valid_until into strict v_deadline
  from integration.drs_auth_specialist_bindings
  where authenticated_user_id = '${userId}';
  if v_deadline >= clock_timestamp() then
    raise exception 'A17_VERIFY_DB_DEADLINE_NOT_PASSED';
  end if;
end $$;
\echo VERIFY_DB_DEADLINE_PASSED
commit;`,
    "VERIFY_BARRIER_ROW_LOCKED",
  );
  try {
    assertDbDeadlineFuture(barrier);
    const envelope = await decodeSessionCookie(runtime, cookie);
    const verifierPromise = runtime.bootstrapDependencies.accessSessionVerifier
      .verifyAccessSession({
        serverSessionId: envelope.sessionId,
        accessToken: envelope.accessToken,
      });
    await assertPendingBeforeRelease(verifierPromise);
    await finishPsqlLockBarrier(barrier, "VERIFY_DB_DEADLINE_PASSED");
    const verifyRelease = "VERIFY_BARRIER_RELEASED";
    assert.equal(verifyRelease, "VERIFY_BARRIER_RELEASED");
    try {
      await assert.rejects(verifierPromise, /A17_DRS_SECURE_SESSION_REJECTED/u);
    } catch {
      throw causalFailure(runtimeVerdictLock);
    }
    try {
      await assert.rejects(() => guard.authorize(guardRequest(cookie, proof)));
    } catch {
      throw causalFailure(runtimeVerdictLock);
    }
  } finally {
    await closePsqlLockBarrier(barrier);
    await runPsql(rotateBindingSql(userId, false));
  }
}

async function assertRevokeLockBarrier(userId, runtime) {
  const cookie = await createCookie(runtime, userId);
  const envelope = await decodeSessionCookie(runtime, cookie);
  const barrier = await startPsqlLockBarrier(
    `
begin;
set local statement_timeout = '15s';
select 1 from integration.drs_server_sessions
where server_session_id = '${envelope.sessionId}' for update;
update integration.drs_server_sessions
set expires_at = clock_timestamp() + interval '3 seconds'
where server_session_id = '${envelope.sessionId}';
select 'REVOKE_BARRIER_ROW_LOCKED|' || extract(epoch from expires_at)::text ||
       '|' || extract(epoch from clock_timestamp())::text
from integration.drs_server_sessions
where server_session_id = '${envelope.sessionId}';
select repeat('R', 8192);
select pg_sleep(greatest(0, extract(epoch from (expires_at - clock_timestamp())) + 0.25))
from integration.drs_server_sessions
where server_session_id = '${envelope.sessionId}';
do $$ declare v_deadline timestamptz; begin
  select expires_at into strict v_deadline
  from integration.drs_server_sessions
  where server_session_id = '${envelope.sessionId}';
  if v_deadline >= clock_timestamp() then
    raise exception 'A17_REVOKE_DB_DEADLINE_NOT_PASSED';
  end if;
end $$;
\echo REVOKE_DB_DEADLINE_PASSED
commit;`,
    "REVOKE_BARRIER_ROW_LOCKED",
  );
  try {
    assertDbDeadlineFuture(barrier);
    const revokePromise = runtime.sessionRevoker.revokeServerSession({
      serverSessionId: envelope.sessionId,
      accessToken: envelope.accessToken,
    });
    await assertPendingBeforeRelease(revokePromise);
    await finishPsqlLockBarrier(barrier, "REVOKE_DB_DEADLINE_PASSED");
    const revokeRelease = "REVOKE_BARRIER_RELEASED";
    assert.equal(revokeRelease, "REVOKE_BARRIER_RELEASED");
    try {
      await assert.rejects(revokePromise, /A17_DRS_SECURE_SESSION_REJECTED/u);
    } catch {
      throw causalFailure(runtimeVerdictLock);
    }
  } finally {
    await closePsqlLockBarrier(barrier);
  }
}

if (runtimeConfirmed) {
  Deno.test({
    name:
      "A17 S1A-R real BOOT/GUARD/REV/EXP/REPLAY/TAMPER/JSON/ROT/LOCK/FETCH/SAN/CLEAN",
    sanitizeOps: true,
    sanitizeResources: true,
    async fn() {
      assert.equal(SupabaseEdgeRuntimeContainerAcceptance, false);
      const productionEnvironment = exactSevenEnvironment();
      assert.equal(productionEnvironment.SUPABASE_URL, supabaseOrigin);
      assert.equal(
        typeof productionEnvironment.SUPABASE_SERVICE_ROLE_KEY,
        "string",
      );
      assert.equal(productionEnvironment.LAIBE_DRS_APP_ORIGIN, appOrigin);
      assert.equal(
        productionEnvironment.LAIBE_DRS_SESSION_SUCCESS_URL,
        successUrl,
      );
      assert.equal(
        productionEnvironment.LAIBE_DRS_SESSION_COOKIE_NAME,
        cookieName,
      );
      assert.match(
        productionEnvironment.LAIBE_DRS_SESSION_COOKIE_KEY_V1,
        base64url43Pattern,
      );
      assert.match(
        productionEnvironment.LAIBE_DRS_BFF_PROOF_KEY_V1,
        base64url43Pattern,
      );
      const serviceRoleKey = productionEnvironment.SUPABASE_SERVICE_ROLE_KEY;
      const exactEnvironmentAdapter = Object.freeze({
        get: (name) => productionEnvironment[name],
      });
      const defaultRuntime = createDrsSecureSessionRuntime({
        env: exactEnvironmentAdapter,
      });
      assert.equal(defaultRuntime.runtimeAvailable, true);

      let server;
      let hostileFixture;
      let userId;
      let primaryError;
      const cleanupErrors = [];
      try {
        const registerUserId = (createdUserId) => userId = createdUserId;
        const auth = await createRealAuthUser(serviceRoleKey, registerUserId);
        assert.equal(auth.userId, userId);
        await runPsql(fixtureSql(userId));
        server = await startAcceptedServer();
        hostileFixture = await startHostileLoopbackFixture();
        const cookie = await createCookie(defaultRuntime, userId);
        const proof = await bootstrapThroughLoopback(cookie);
        const guard = createDrsBffGuard(defaultRuntime.bootstrapDependencies, {
          method: "POST",
          pathname: "/functions/v1/drs-secure-probe",
          queryFields: Object.freeze([]),
          jsonBodyFields: null,
        });
        const authorized = await guard.authorize(guardRequest(cookie, proof));
        assert.deepEqual({
          authenticatedUserId: authorized.authenticatedUserId,
          specialistId: authorized.specialistId,
          authorizationSubject: authorized.authorizationSubject,
          selectedCaseId: authorized.selectedCaseId,
        }, {
          authenticatedUserId: userId,
          specialistId: specialistA,
          authorizationSubject: subjectA,
          selectedCaseId: caseworkCaseA,
        });

        await assertProofReplayWithinWindow(guard, cookie, proof);
        await assertProofExpiryWithInjectedClock(productionEnvironment, userId);
        await assertAcceptedRuntimeTamperCase(
          "cookie-bit-flip",
          defaultRuntime,
          guard,
          cookie,
          proof,
          productionEnvironment,
        );
        await assertAcceptedRuntimeTamperCase(
          "proof-bit-flip",
          defaultRuntime,
          guard,
          cookie,
          proof,
          productionEnvironment,
        );
        await assertAcceptedRuntimeTamperCase(
          "wrong-cookie-key",
          defaultRuntime,
          guard,
          cookie,
          proof,
          productionEnvironment,
        );
        await assertAcceptedRuntimeTamperCase(
          "wrong-proof-key",
          defaultRuntime,
          guard,
          cookie,
          proof,
          productionEnvironment,
        );
        await assertAcceptedRuntimeTamperCase(
          "malformed-cookie",
          defaultRuntime,
          guard,
          cookie,
          proof,
          productionEnvironment,
        );
        await assertAcceptedRuntimeTamperCase(
          "malformed-proof",
          defaultRuntime,
          guard,
          cookie,
          proof,
          productionEnvironment,
        );
        await assertAcceptedRuntimeTamperCase(
          "alg-none",
          defaultRuntime,
          guard,
          cookie,
          proof,
          productionEnvironment,
        );
        await assertAcceptedRuntimeHostileCase(
          "redirect",
          hostileFixture,
          productionEnvironment,
        );
        await assertAcceptedRuntimeHostileCase(
          "canonical-content-length",
          hostileFixture,
          productionEnvironment,
        );
        await assertAcceptedRuntimeHostileCase(
          "shorter-than-content-length",
          hostileFixture,
          productionEnvironment,
        );
        await assertAcceptedRuntimeHostileCase(
          "longer-than-content-length",
          hostileFixture,
          productionEnvironment,
        );
        await assertAcceptedRuntimeHostileCase(
          "empty",
          hostileFixture,
          productionEnvironment,
        );
        await assertAcceptedRuntimeHostileCase(
          "fatal-utf8",
          hostileFixture,
          productionEnvironment,
        );
        await assertAcceptedRuntimeHostileCase(
          "duplicate-top-level-member",
          hostileFixture,
          productionEnvironment,
        );
        await assertAcceptedRuntimeHostileCase(
          "overflow-reader-cancellation",
          hostileFixture,
          productionEnvironment,
        );
        await assertAcceptedRuntimeHostileCase(
          "provider-header-drop",
          hostileFixture,
          productionEnvironment,
        );
        await assertProofRejectedAfterRevokeAndRotation(
          defaultRuntime,
          userId,
          guard,
        );
        await assertRotationBarrier(userId);
        const lockCookie = await createCookie(defaultRuntime, userId);
        const lockProof = await bootstrapThroughLoopback(lockCookie);
        await assertIssueLockBarrier(userId, defaultRuntime);
        await assertVerifyLockBarrier(
          userId,
          lockCookie,
          lockProof,
          guard,
          defaultRuntime,
        );
        await assertRevokeLockBarrier(userId, defaultRuntime);
      } catch (error) {
        primaryError = error;
      } finally {
        await attemptCleanup("server-close", async () => {
          if (server) {
            await server.shutdown();
            await server.finished;
          }
        }, cleanupErrors);
        await attemptCleanup("hostile-server-close", async () => {
          if (hostileFixture) {
            await hostileFixture.server.shutdown();
            await hostileFixture.server.finished;
          }
        }, cleanupErrors);
        await attemptCleanup("db-fixture", async () => {
          if (userId) await runPsql(cleanupSql(userId));
        }, cleanupErrors);
        await attemptCleanup("auth-delete", async () => {
          if (userId) await deleteRealAuthUser(serviceRoleKey, userId);
        }, cleanupErrors);
        await attemptCleanup("auth-absence-readback", async () => {
          if (userId) {
            await assertAuthAdminAbsence(serviceRoleKey, userId);
            await assertExactCanaryAbsence(userId);
          }
        }, cleanupErrors);
      }
      if (cleanupErrors.length === 0) {
        console.log("A17_S1AR_CLEANUP_CONFIRMED");
      }
      if (primaryError || cleanupErrors.length > 0) {
        if (cleanupErrors.length === 0 && primaryError?.causalMarker) {
          console.log(primaryError.causalMarker);
          throw sanitizedFailure("CAUSAL_DEFECT_REPORTED");
        }
        const primaryTrace = primaryError?.causalMarker ??
          (primaryError instanceof Error &&
              /^A17_S1AR_[A-Z0-9_=:-]+$/u.test(primaryError.message)
            ? primaryError.message
            : "A17_S1AR_PRIMARY_REJECTED");
        if (!primaryError?.causalMarker) {
          console.log(`A17_S1AR_SANITIZED_PRIMARY=${primaryTrace}`);
        }
        const aggregate = [
          primaryError ? primaryTrace : "A17_S1AR_PRIMARY_COMPLETE",
          ...cleanupErrors,
        ];
        throw new AggregateError([], aggregate.join(";"));
      }
    },
  });
} else {
  Deno.test({
    name: "A17 S1A-R live runtime confirmation required",
    ignore: true,
    fn() {},
  });
}
