import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";

const BASE_COMMIT = "4236b40f086b1f709c5fa6ee8d98faf9bd998f92";
const BASE_TREE = "a07f654348663c596d3e97e1740add6828c1e6bc";
const PREREQUISITE_COMMIT = "0163b4f006ad7157f4543d7952e22a4a4a99573b";
const T3_COMMIT = "0d715b713a15fdca235ec283de6cb1952a5952b4";
const T3_TREE = "8376ebec151e86bcdc2b3042c59b3f733adbd9d4";
const MANIFEST = "docs/drs_backend/drs_t3_calendar_convergence_map.md";
const TEST_PATH = "tests/drs-t3-calendar-source-convergence.test.mjs";

const sources = [
  [
    "docs/integrations/google-calendar-drs-account-contract.md",
    T3_COMMIT,
    "3ad75cc3b274c48f4a9b17d9554dbf0f1ce36036",
  ],
  [
    "supabase/functions/_shared/google-calendar/contracts.ts",
    T3_COMMIT,
    "88adb24e73268185ebbc8152f92656a51ffd83be",
  ],
  [
    "supabase/functions/_shared/google-calendar/google-oauth-adapter.ts",
    T3_COMMIT,
    "81d262cee02538a9fce60b773c4c24f92e5ef781",
  ],
  [
    "supabase/migrations/20260821170000_google_calendar_drs_account_contract.sql",
    T3_COMMIT,
    "ed6c597361c8268e3317c97f564b0bb85d4901d6",
  ],
  [
    "supabase/tests/case_member_google_calendar_contract.test.mjs",
    T3_COMMIT,
    "109020c2d8a164c2ceaae817eb023bbbec1502e6",
  ],
  [
    "supabase/tests/google_calendar_drs_account_contract.test.mjs",
    T3_COMMIT,
    "445a248deb8997af4aae5bff25f6fbe63437d42c",
  ],
  [
    "supabase/functions/_shared/google-calendar/case-calendar-authorization.ts",
    PREREQUISITE_COMMIT,
    "ea8c3edab6f3e36e66b034eb781cddb2d034139c",
  ],
  [
    "supabase/migrations/20260818165231_case_member_google_calendar_binding.sql",
    PREREQUISITE_COMMIT,
    "ea129a2dc5156f2572f4e2640e07af3e558d2ecd",
  ],
  [
    "supabase/functions/owner-google-calendar-grant/index.ts",
    PREREQUISITE_COMMIT,
    "bb47571abf735fd96c65ad1887cd0f42a4aa6615",
  ],
  [
    "supabase/functions/owner-google-calendar-oauth-callback/index.ts",
    PREREQUISITE_COMMIT,
    "5bcf944cd1ef13d13b68089d3a27b2bd42bbdf73",
  ],
  [
    "supabase/functions/owner-google-calendar-oauth-start/index.ts",
    PREREQUISITE_COMMIT,
    "06312e9c1aef1b899303bd04cf5027b5db4beb8c",
  ],
  [
    "supabase/functions/vendor-google-calendar-grant/index.ts",
    PREREQUISITE_COMMIT,
    "50ad5d0d9cbccf8d84de5e4cf27f4e51148d0ebb",
  ],
  [
    "supabase/functions/vendor-google-calendar-oauth-callback/index.ts",
    PREREQUISITE_COMMIT,
    "5e5de771096790a69665ea5fb3f527d4bd8664e9",
  ],
  [
    "supabase/functions/vendor-google-calendar-oauth-start/index.ts",
    PREREQUISITE_COMMIT,
    "7631886519be4cdc3cf22468725be83801880db2",
  ],
];

const protectedPatterns = [
  /^src\/stitch_laibe_landing_onboarding\/pcm_standalone\//,
  /^src\/stitch_laibe_landing_onboarding\/drs_standalone\//,
  /(?:^|\/)PAGE_REGISTRY\.md$/,
  /(?:^|\/)CTA_FLOW_MAP\.md$/,
  /(?:^|\/)(?:route-manifest|routes?|header|navigation)(?:\.|\/)/iu,
];

function git(...args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function gitBuffer(...args) {
  return execFileSync("git", args, { windowsHide: true });
}

function lines(value) {
  return value ? value.split(/\r?\n/u).filter(Boolean) : [];
}

function candidatePaths() {
  const committed = lines(git("diff", "--name-only", `${BASE_COMMIT}..HEAD`));
  const working = lines(git("status", "--porcelain=v1", "-uall"))
    .map((line) => line.slice(3));
  return [...new Set([...committed, ...working])].sort();
}

test("calendar convergence starts from the exact frozen W2 base", () => {
  assert.equal(git("rev-parse", `${BASE_COMMIT}^{tree}`), BASE_TREE);
  assert.equal(git("rev-parse", `${T3_COMMIT}^{tree}`), T3_TREE);
  assert.doesNotThrow(() =>
    git("merge-base", "--is-ancestor", BASE_COMMIT, "HEAD")
  );
});

test("calendar convergence changes only the exact local allowlist", () => {
  const expected = [...sources.map(([file]) => file), MANIFEST, TEST_PATH]
    .sort();
  const actual = candidatePaths();
  assert.deepEqual(actual, expected);
  for (const file of actual) {
    assert.ok(
      !protectedPatterns.some((pattern) => pattern.test(file)),
      `protected A0 or workspace path entered Calendar convergence: ${file}`,
    );
  }
});

test("admitted Calendar files match their immutable Git blobs", () => {
  for (const [file, sourceCommit, expectedBlob] of sources) {
    assert.deepEqual(
      readFileSync(path.join(process.cwd(), file)),
      gitBuffer("show", `${sourceCommit}:${file}`),
      `admitted bytes drifted from ${sourceCommit}: ${file}`,
    );
    assert.equal(git("hash-object", "--", file), expectedBlob, file);
  }
});

test("the frozen W2 base did not already contain Calendar package files", () => {
  for (const [file] of sources) {
    const result = spawnSync("git", [
      "cat-file",
      "-e",
      `${BASE_COMMIT}:${file}`,
    ], {
      windowsHide: true,
    });
    assert.notEqual(
      result.status,
      0,
      `unexpected Calendar path already present at base: ${file}`,
    );
  }
});

test("manifest preserves source identities, closed gates, and migration order", () => {
  const manifest = readFileSync(MANIFEST, "utf8");
  for (
    const value of [
      BASE_COMMIT,
      BASE_TREE,
      PREREQUISITE_COMMIT,
      T3_COMMIT,
      T3_TREE,
      "LIVE_POSTGRES_PROOF=FALSE",
      "SHARED_AUTH_COMMIT=HOLD_NOT_APPROVED",
      "SOURCE_ADMISSION=HOLD",
    ]
  ) {
    assert.match(manifest, new RegExp(value, "u"));
  }

  const migrations = [
    "20260818165231_case_member_google_calendar_binding.sql",
    "20260820000000_drs_linebot_group_ai_human_w1.sql",
    "20260820090000_drs_core_case_audit_contract.sql",
    "20260821170000_google_calendar_drs_account_contract.sql",
  ];
  const migrationSection = manifest.slice(
    manifest.indexOf("## Migration Order"),
    manifest.indexOf("## Contract Evidence"),
  );
  const positions = migrations.map((file) => migrationSection.indexOf(file));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});
