import assert from "node:assert/strict";
import { test } from "node:test";

const MODULE_PATH = "../../scripts/drs-core-postgres-runtime/runtime-harness.mjs";
const CLI_MODULE_PATH = "../../scripts/drs-core-postgres-runtime/run-runtime-checks.mjs";

async function loadHarness() {
  return await import(`${MODULE_PATH}?cache=${Date.now()}`);
}

async function loadCli() {
  return await import(`${CLI_MODULE_PATH}?cache=${Date.now()}`);
}

test("selectLocalRuntimeStrategy prefers local postgres binaries over docker and supabase", async () => {
  const harness = await loadHarness();
  const strategy = harness.selectLocalRuntimeStrategy({
    postgresBinaries: {
      available: true,
      commands: {
        initdb: { path: "C:/pgsql/bin/initdb.exe", version: "initdb (PostgreSQL) 16.4" },
        pg_ctl: { path: "C:/pgsql/bin/pg_ctl.exe", version: "pg_ctl (PostgreSQL) 16.4" },
        psql: { path: "C:/pgsql/bin/psql.exe", version: "psql (PostgreSQL) 16.4" },
      },
    },
    docker: { available: true, path: "C:/Docker/docker.exe", version: "Docker version 28.0.0" },
    supabase: { available: true, path: "C:/Users/J/scoop/shims/supabase.exe", version: "supabase 2.49.9" },
  });

  assert.equal(strategy.status, "ready");
  assert.equal(strategy.strategy_id, "postgres-binaries");
});

test("selectLocalRuntimeStrategy uses docker-postgres before supabase-cli when postgres binaries are absent", async () => {
  const harness = await loadHarness();
  const strategy = harness.selectLocalRuntimeStrategy({
    postgresBinaries: { available: false, missing: ["initdb", "pg_ctl", "psql"] },
    docker: { available: true, path: "C:/Docker/docker.exe", version: "Docker version 28.0.0" },
    supabase: { available: true, path: "C:/Users/J/scoop/shims/supabase.exe", version: "supabase 2.49.9" },
  });

  assert.equal(strategy.status, "ready");
  assert.equal(strategy.strategy_id, "docker-postgres");
});

test("detectLocalRuntimeTooling keeps supabase discovery observable without marking it available after a skipped probe", async () => {
  const harness = await loadHarness();
  const tooling = harness.detectLocalRuntimeTooling({
    probeCommand(commandName) {
      if (commandName === "supabase") {
        return {
          available: false,
          detected: true,
          path: "C:/Users/J/scoop/shims/supabase.exe",
          version: null,
          error: "probe skipped to avoid invoking supabase CLI during disposable-runtime detection",
        };
      }
      return { available: false, path: null, version: null, error: `${commandName} not found` };
    },
  });

  assert.equal(tooling.commands.supabase.available, false);
  assert.equal(tooling.commands.supabase.detected, true);
  assert.match(tooling.commands.supabase.error, /probe skipped/i);
  assert.equal(tooling.commands.docker.available, false);
  assert.equal(tooling.commands.psql.available, false);
  assert.equal(tooling.runtime_candidates.supabaseCliPresent, true);
});

test("createBlockedRuntimeReport preserves the exact blocker detail but surfaces blocked-no-disposable-postgres to the CLI", async () => {
  const harness = await loadHarness();
  const blocked = harness.createBlockedRuntimeReport({
    strategy: {
      status: "blocked",
      reason_code: "LOCAL_POSTGRES_RUNTIME_UNAVAILABLE",
      missing_commands: ["docker", "psql", "postgres", "pg_ctl", "initdb"],
      next_safe_action:
        "Provide one disposable local PostgreSQL runtime path on PATH, preferably Docker Desktop or local PostgreSQL binaries, then rerun the committed harness.",
    },
    tooling: {
      commands: {
        supabase: {
          available: false,
          detected: true,
          path: "C:/Users/J/scoop/shims/supabase.exe",
          error: "probe skipped to avoid invoking supabase CLI during disposable-runtime detection",
        },
      },
    },
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.status_code, "BLOCKED_NO_DISPOSABLE_POSTGRES");
  assert.equal(blocked.reason_code, "LOCAL_POSTGRES_RUNTIME_UNAVAILABLE");
  assert.deepEqual(blocked.missing_commands, ["docker", "psql", "postgres", "pg_ctl", "initdb"]);
  assert.match(blocked.reason, /supabase/i);
  assert.match(blocked.reason, /probe skipped/i);
  assert.match(blocked.next_safe_action, /Docker Desktop|PostgreSQL binaries/i);
});

test("createRuntimeHarnessPlan keeps runtime state inside the allowlisted scripts directory and covers every W2 proof area", async () => {
  const harness = await loadHarness();
  const plan = harness.createRuntimeHarnessPlan({
    strategy: { status: "ready", strategy_id: "docker-postgres" },
  });

  assert.equal(plan.runtime_root.replaceAll("\\", "/").includes("/scripts/drs-core-postgres-runtime/"), true);
  assert.deepEqual(
    plan.proofs.map((proof) => proof.proof_id),
    [
      "migration-apply",
      "schema-and-grants",
      "audit-dml-denied",
      "rls-force-rls-two-subjects",
      "specialist-identity-and-assignment",
      "formal-group-ingestion-only",
      "audit-append-replay-chronology-chain",
      "ai-advisory-statuses-only",
      "human-final-authority-and-break-glass",
      "final-message-vs-receipt",
      "invalid-timestamp-and-interval",
      "rollback-cleanup-determinism",
    ],
  );
});

test("buildDockerRunArgs keeps trust-auth docker runtime off published host ports", async () => {
  const harness = await loadHarness();
  const args = harness.buildDockerRunArgs(
    harness.createRuntimeHarnessPlan({
      strategy: { status: "ready", strategy_id: "docker-postgres" },
    }),
    "drs-core-runtime-test",
  );

  assert.equal(args.includes("-p"), false);
  assert.equal(args.some((entry) => /:5432$/i.test(entry)), false);
  assert.equal(args.includes("POSTGRES_HOST_AUTH_METHOD=trust"), true);
});

test("buildVerifiedProofs derives proof coverage from two runtime verification runs instead of plan declarations", async () => {
  const harness = await loadHarness();
  const sqlProofIds = harness.REQUIRED_PROOFS
    .map((proof) => proof.proof_id)
    .filter((proofId) => !["migration-apply", "rollback-cleanup-determinism"].includes(proofId));
  const verificationStdout = sqlProofIds
    .map((proofId) => `DRS_RUNTIME_PROOF|${proofId}|PASS`)
    .join("\n");

  const proofs = harness.buildVerifiedProofs({
    verificationStdouts: [verificationStdout, verificationStdout],
  });

  assert.deepEqual(
    proofs.map((proof) => proof.proof_id),
    harness.REQUIRED_PROOFS.map((proof) => proof.proof_id),
  );
  assert.equal(
    proofs.find((proof) => proof.proof_id === "rollback-cleanup-determinism")?.runs_verified,
    2,
  );
});

test("buildVerifiedProofs fails closed when a verification run omits one required proof marker", async () => {
  const harness = await loadHarness();
  const sqlProofIds = harness.REQUIRED_PROOFS
    .map((proof) => proof.proof_id)
    .filter((proofId) => !["migration-apply", "rollback-cleanup-determinism"].includes(proofId));
  const missingProofId = sqlProofIds.at(-1);
  const verificationStdout = sqlProofIds
    .filter((proofId) => proofId !== missingProofId)
    .map((proofId) => `DRS_RUNTIME_PROOF|${proofId}|PASS`)
    .join("\n");

  assert.throws(
    () => harness.buildVerifiedProofs({ verificationStdouts: [verificationStdout, verificationStdout] }),
    new RegExp(missingProofId ?? "missing proof", "i"),
  );
});

test("run-runtime-checks returns a nonzero exit code for blocked disposable-runtime detection", async () => {
  const cli = await loadCli();

  assert.equal(
    cli.determineExitCode({
      status: "blocked",
      status_code: "BLOCKED_NO_DISPOSABLE_POSTGRES",
      reason_code: "LOCAL_POSTGRES_RUNTIME_UNAVAILABLE",
    }),
    2,
  );
  assert.equal(cli.determineExitCode({ status: "passed" }), 0);
});
