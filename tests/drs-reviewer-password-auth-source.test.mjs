import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
test("password Edge uses the sole S1 verifier and password-specific producer, retaining typed denial layers", () => {
  const source = read(
    "supabase/functions/_shared/drs-auth/drs-password-auth-session.ts",
  );
  const entry = read("supabase/functions/drs-password-auth-session/index.ts");
  assert.match(entry, /export const VERIFY_JWT_REQUIRED = true;/u);
  assert.match(
    source,
    /import \{ verifyAuthSession \} from "\.\.\/auth-session\/verified-auth-session\.ts"/u,
  );
  assert.doesNotMatch(
    source,
    /decodeJwtPayload|function verifiedUserId|\/auth\/v1\/user/u,
  );
  for (
    const field of [
      "authSessionId",
      "supabaseAccessToken",
      "authExpiresAtEpochSeconds",
    ]
  ) assert.ok(source.includes(field));
  assert.match(
    entry,
    /sessionProducer: secureRuntime\.passwordSessionProducer/u,
  );
  assert.doesNotMatch(
    source,
    /refresh_token|user_metadata|raw_user_meta_data|console\.|localStorage/u,
  );
  const contracts = read("supabase/functions/_shared/drs-auth/contracts.ts");
  assert.ok(contracts.includes('"REVIEWER_APPROVAL_REQUIRED"'));
  assert.match(source, /state === "CONTEXT_UNAVAILABLE"\s+\? 503/u);
});
test("new Core forward migration uses one password resolver and leaves provider functions and existing role data untouched", () => {
  const sql = read(
    "supabase/migrations/20260908070633_drs_auth_session_binding_v1.sql",
  );
  assert.doesNotMatch(
    sql,
    /identity_provider_bindings|provider\s*=\s*'google'|membership_record\.role|delete from auth\.sessions/iu,
  );
  assert.equal(
    (sql.match(
      /create (?:or replace )?function drs_forward_private\.drs_password_authority_resolve_locked_v1/giu,
    ) || []).length,
    1,
  );
  assert.equal(
    (sql.match(
      /v_authority := drs_forward_private\.drs_password_authority_resolve_locked_v1/gu,
    ) || []).length,
    2,
  );
  assert.doesNotMatch(
    sql,
    /(?:insert into|update|delete from)\s+(?:casework\.|drs_forward_private\.(?:specialists|auth_specialist_bindings|reviewer_case_authorities|case_mappings))/iu,
  );
  assert.match(
    sql,
    /membership_record\.user_id = authority_record\.granted_by/u,
  );
  assert.match(
    sql,
    /revoke all on function public\.drs_auth_bound_session_logout_v1/u,
  );
});
