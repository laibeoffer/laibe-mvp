import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return await readFile(new URL(path, root), "utf8");
}

test("focused RED: Google sealed-session runtime is absent", async () => {
  const runtime = await source(
    "supabase/functions/_shared/drs-auth/drs-google-session-runtime.ts",
  );
  const start = await source(
    "supabase/functions/drs-google-auth-start/index.ts",
  );
  const callback = await source(
    "supabase/functions/drs-google-auth-callback/index.ts",
  );
  const grant = await source("supabase/functions/drs-session-grant/index.ts");
  const config = await source("supabase/config.toml");

  assert.match(runtime, /createDrsGoogleSessionRuntime/u);
  assert.match(runtime, /createGoogleIdentityAdapter/u);
  assert.match(runtime, /createDrsSecureSessionRuntime/u);
  assert.match(runtime, /RS256/u);
  assert.match(runtime, /https:\/\/accounts\.google\.com/u);
  assert.match(runtime, /https:\/\/oauth2\.googleapis\.com\/token/u);
  assert.match(runtime, /https:\/\/www\.googleapis\.com\/oauth2\/v3\/certs/u);
  assert.match(runtime, /drs_identity_link_state_create_v1/u);
  assert.match(runtime, /drs_identity_link_state_claim_v1/u);
  assert.match(runtime, /drs_identity_link_state_fail_v1/u);
  assert.match(runtime, /drs_identity_callback_prepare_v1/u);
  assert.match(runtime, /drs_identity_callback_finalize_v1/u);
  assert.match(runtime, /LAIBE_DRS_IDENTITY_STATE_KEY_V1/u);
  assert.doesNotMatch(runtime, /console\.|localStorage|sessionStorage/iu);

  for (const endpoint of [start, callback, grant]) {
    assert.match(endpoint, /drs-google-session-runtime\.ts/u);
    assert.match(endpoint, /createDrsGoogleSessionRuntime/u);
  }
  assert.match(start, /runtime\.googleAuthStartDependencies/u);
  assert.match(callback, /runtime\.googleAuthCallbackDependencies/u);
  assert.match(grant, /runtime\.sessionGrantDependencies/u);
  assert.match(grant, /VERIFY_JWT_REQUIRED\s*=\s*true/u);

  assert.match(
    config,
    /\[functions\.drs-google-auth-start\]\r?\nverify_jwt\s*=\s*false/u,
  );
  assert.match(
    config,
    /\[functions\.drs-google-auth-callback\]\r?\nverify_jwt\s*=\s*false/u,
  );
  assert.match(
    config,
    /\[functions\.drs-session-grant\]\r?\nverify_jwt\s*=\s*true/u,
  );
});
