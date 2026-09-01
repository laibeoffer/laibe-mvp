import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const sharedUrl = new URL(
  "supabase/functions/_shared/drs-auth/drs-session-bootstrap-bff.ts",
  root,
);
const endpointUrl = new URL(
  "supabase/functions/drs-session-bootstrap/index.ts",
  root,
);
const configUrl = new URL("supabase/config.toml", root);
const documentationUrl = new URL(
  "docs/drs_backend/drs_session_bootstrap_bff_w1.md",
  root,
);
const requiredCompositionPaths = [
  "docs/drs_backend/drs_identity_google_line_binding_w1.md",
  "docs/drs_backend/drs_session_bootstrap_bff_w1.md",
  "supabase/config.toml",
  "supabase/functions/_shared/drs-auth/contracts.ts",
  "supabase/functions/_shared/drs-auth/drs-session-bootstrap-bff.ts",
  "supabase/functions/_shared/drs-auth/google-identity-adapter.ts",
  "supabase/functions/_shared/drs-auth/line-login-adapter.ts",
  "supabase/functions/_shared/drs-auth/specialist-authorization.ts",
  "supabase/functions/drs-google-auth-callback/index.ts",
  "supabase/functions/drs-google-auth-start/index.ts",
  "supabase/functions/drs-line-login-callback/index.ts",
  "supabase/functions/drs-line-login-start/index.ts",
  "supabase/functions/drs-session-bootstrap/index.ts",
  "supabase/functions/drs-session-grant/index.ts",
  "supabase/migrations/20260824092002_drs_identity_foundation.sql",
  "supabase/tests/drs_identity_google_line_binding_w1.test.mjs",
  "supabase/tests/drs_session_bootstrap_bff_w1.test.mjs",
  "tests/drs-identity-google-line-source-closure.test.mjs",
  "tests/drs-session-bootstrap-bff-source.test.mjs",
].sort();

function source(url) {
  assert.equal(existsSync(url), true, `${url.pathname} must exist`);
  return readFileSync(url, "utf8");
}

test("source exposes only injected session, envelope, verifier, proof, and accepted authority ports", () => {
  const shared = source(sharedUrl);
  for (
    const required of [
      "ServerSessionIssuer",
      "SealedCookieEnvelopeCodec",
      "OpaqueBffProofCodec",
      "AccessSessionVerifier",
      "DrsSpecialistAuthorizationStrategy",
      "createServerOwnedVerifiedSessionProducer",
      "createDrsSessionBootstrapHandler",
      "createDrsBffGuard",
      "BFF_PROOF_AUDIENCE",
      "validHostCookieName",
      "proofClaimsEqual",
      "DrsBffRequestContract",
      "compileRequestContract",
      "assertClosedRequestContract",
      "assertNoCustomGuardHeaders",
    ]
  ) assert.match(shared, new RegExp(`\\b${required}\\b`, "u"), required);
  assert.match(shared, /verifyOpaqueProof\(proof\)/u);
  assert.doesNotMatch(
    shared,
    /AUTHORITY_KEY_QUALIFIERS|normalizeAuthorityKey|isAuthorityKey|hasAuthorityKey/u,
  );
  for (
    const forbidden of [
      /createClient/u,
      /supabase-js/u,
      /Deno\.env/u,
      /SUPABASE_(?:URL|KEY|SECRET)/u,
      /service_role/u,
      /\bfetch\s*\(/u,
      /localStorage|sessionStorage|document\.|location\.(?:search|hash)/u,
    ]
  ) assert.doesNotMatch(shared, forbidden);
});

test("Edge Function endpoint delegates to the injected core and config disables the platform JWT gate only for bootstrap", () => {
  const endpoint = source(endpointUrl);
  const config = source(configUrl);
  assert.match(endpoint, /createDrsSessionBootstrapHandler/u);
  assert.match(endpoint, /VERIFY_JWT_REQUIRED\s*=\s*false/u);
  assert.match(endpoint, /Deno\.serve\(handler\)/u);
  assert.match(
    config,
    /\[functions\.drs-session-bootstrap\]\s*\r?\nverify_jwt\s*=\s*false/u,
  );
  for (const path of requiredCompositionPaths) {
    assert.equal(existsSync(new URL(path, root)), true, path);
  }
});

test("documentation preserves local-only proof, future A0 memory contract, and explicit integration gaps", () => {
  const documentation = source(documentationUrl);
  for (
    const fact of [
      "LOCAL_SOURCE_STATIC_MOCK_ONLY",
      'credentials: "same-origin"',
      "SAME_COOKIE_WITHIN_TTL_REUSE=ALLOWED",
      "mandatory",
      "closed request contract",
      "exact method",
      "timeMin",
      "duplicate query key",
      "authority-name blacklist",
      "反向代理",
      "不得以 `Domain` attribute",
      "不是 single-use",
      "每次使用仍必須重新驗",
      "Authorization",
      "X-Laibe-Session-Expires-At",
      "記憶體",
      "A0 source 未修改",
      "direct existing endpoints remain incompatible",
      "未部署",
      "未連線真實 Supabase",
      "不含金流託管",
      "不含老屋煉金術",
    ]
  ) assert.match(documentation, new RegExp(fact, "u"), fact);
});
