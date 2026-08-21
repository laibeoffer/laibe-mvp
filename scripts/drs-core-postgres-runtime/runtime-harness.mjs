import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..");
export const MIGRATION_PATH = path.join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20260820090000_drs_core_case_audit_contract.sql",
);
export const BOOTSTRAP_SQL_PATH = path.join(MODULE_DIR, "bootstrap-local-auth.sql");
export const VERIFY_SQL_PATH = path.join(MODULE_DIR, "verify-drs-core-runtime.sql");
export const RUNTIME_ROOT = path.join(MODULE_DIR, ".runtime");
export const DEFAULT_PORT = 55432;
export const DEFAULT_DATABASE = "drs_core_runtime";
export const DEFAULT_DOCKER_IMAGE = "postgres:16";
export const BLOCKED_STATUS_CODE = "BLOCKED_NO_DISPOSABLE_POSTGRES";

export const REQUIRED_PROOFS = Object.freeze([
  { proof_id: "migration-apply", label: "W1 migration applies to a fresh disposable local DB" },
  { proof_id: "schema-and-grants", label: "schema, owner, revoke, and execute grants exist as expected" },
  { proof_id: "audit-dml-denied", label: "direct audit DML is denied to application roles" },
  { proof_id: "rls-force-rls-two-subjects", label: "RLS and FORCE RLS hold for owner and specialist authenticated subjects" },
  { proof_id: "specialist-identity-and-assignment", label: "specialist identity and assignment interval constraints stay immutable" },
  { proof_id: "formal-group-ingestion-only", label: "LINE ingest requires a formal same-case DRS group link" },
  { proof_id: "audit-append-replay-chronology-chain", label: "guarded append, replay, chronology, and chain rules hold" },
  { proof_id: "ai-advisory-statuses-only", label: "trusted AI review append only accepts bounded advisory statuses" },
  { proof_id: "human-final-authority-and-break-glass", label: "human authority, unavailable-review handling, and break-glass stay bounded" },
  { proof_id: "final-message-vs-receipt", label: "final message and transport receipt remain distinct" },
  { proof_id: "invalid-timestamp-and-interval", label: "invalid timestamp and interval cases fail closed" },
  { proof_id: "rollback-cleanup-determinism", label: "runtime data rolls back and repeated fresh runs stay deterministic" },
]);

const PROBE_COMMANDS = Object.freeze(["docker", "psql", "postgres", "pg_ctl", "initdb", "supabase"]);
const RUNTIME_PROOF_MARKER = "DRS_RUNTIME_PROOF|";
const SQL_DERIVED_PROOF_IDS = REQUIRED_PROOFS
  .map((proof) => proof.proof_id)
  .filter((proofId) => !["migration-apply", "rollback-cleanup-determinism"].includes(proofId));

function normalizeText(value) {
  return String(value ?? "").trim();
}

function runCommand(commandName, args = [], options = {}) {
  const result = spawnSync(commandName, args.map((arg) => String(arg)), {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  const stdout = normalizeText(result.stdout);
  const stderr = normalizeText(result.stderr);
  const combined = [stdout, stderr].filter(Boolean).join("\n");
  return {
    status: result.status,
    stdout,
    stderr,
    combined,
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function firstLine(value) {
  return normalizeText(value).split(/\r?\n/).find(Boolean) ?? null;
}

function compactDiagnostic(value, maxLines = 6, maxChars = 400) {
  const text = normalizeText(value);
  if (!text) return null;
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, maxLines);
  const joined = lines.join("\n");
  return joined.length > maxChars ? `${joined.slice(0, maxChars)}...` : joined;
}

function findOnPath(commandName, env = process.env) {
  const pathValue = env.PATH || env.Path || env.path || "";
  const pathExtValue = env.PATHEXT || ".COM;.EXE;.BAT;.CMD";
  const extensions = path.extname(commandName)
    ? [""]
    : pathExtValue.split(";").map((entry) => entry.trim()).filter(Boolean);
  for (const rawDir of pathValue.split(path.delimiter)) {
    const directory = rawDir.trim();
    if (!directory) continue;
    for (const extension of extensions) {
      const candidate = path.join(directory, `${commandName}${extension}`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function defaultProbeCommand(commandName) {
  const locator = runCommand("where.exe", [commandName]);
  const location = firstLine(locator.stdout) ?? findOnPath(commandName);
  const detected = Boolean(location);
  if (commandName === "supabase") {
    return {
      available: false,
      detected,
      path: location,
      version: null,
      error: detected
        ? "probe skipped to avoid invoking supabase CLI during disposable-runtime detection"
        : compactDiagnostic(locator.error || locator.stderr || null),
    };
  }
  const versionProbe = runCommand(location ?? commandName, ["--version"]);
  const combined = versionProbe.combined;
  const available = versionProbe.status === 0;
  return {
    available,
    detected,
    path: location,
    version: firstLine(combined),
    error: available
      ? null
      : compactDiagnostic(versionProbe.error || combined || locator.error || locator.stderr || null),
  };
}

function normalizeProbeResult(commandName, result = {}) {
  return {
    command: commandName,
    available: Boolean(result.available),
    detected: Boolean(result.detected ?? result.path),
    path: result.path ?? null,
    version: result.version ?? null,
    error: result.error ?? null,
  };
}

export function detectLocalRuntimeTooling({ probeCommand = defaultProbeCommand } = {}) {
  const commands = Object.fromEntries(
    PROBE_COMMANDS.map((commandName) => [commandName, normalizeProbeResult(commandName, probeCommand(commandName))]),
  );
  const postgresBinaries = {
    available: ["initdb", "pg_ctl", "psql"].every((name) => commands[name].available),
    commands: {
      initdb: commands.initdb,
      pg_ctl: commands.pg_ctl,
      psql: commands.psql,
      postgres: commands.postgres,
    },
  };
  return {
    commands,
    postgresBinaries,
    runtime_candidates: {
      postgresBinaries: postgresBinaries.available,
      dockerPostgres: commands.docker.available,
      supabaseCliPresent: commands.supabase.detected,
    },
  };
}

export function selectLocalRuntimeStrategy(tooling) {
  const dockerAvailable = Boolean(tooling?.commands?.docker?.available ?? tooling?.docker?.available);

  if (tooling?.postgresBinaries?.available) {
    return {
      status: "ready",
      strategy_id: "postgres-binaries",
      label: "local PostgreSQL binaries",
      reason_code: null,
      missing_commands: [],
      next_safe_action: null,
    };
  }

  if (dockerAvailable) {
    return {
      status: "ready",
      strategy_id: "docker-postgres",
      label: "local Docker postgres image",
      reason_code: null,
      missing_commands: [],
      next_safe_action: null,
    };
  }

  const missingCommands = PROBE_COMMANDS
    .filter((commandName) => ["docker", "psql", "postgres", "pg_ctl", "initdb"].includes(commandName))
    .filter((commandName) => !tooling?.commands?.[commandName]?.available);

  return {
    status: "blocked",
    strategy_id: null,
    label: null,
    reason_code: "LOCAL_POSTGRES_RUNTIME_UNAVAILABLE",
    missing_commands: missingCommands,
    next_safe_action:
      "Provide one disposable local PostgreSQL runtime path on PATH, preferably Docker Desktop or local PostgreSQL binaries, then rerun the committed harness.",
  };
}

export function createRuntimeHarnessPlan({ strategy, repoRoot = REPO_ROOT } = {}) {
  return {
    strategy_id: strategy?.strategy_id ?? null,
    runtime_root: path.join(repoRoot, "scripts", "drs-core-postgres-runtime", ".runtime"),
    migration_path: MIGRATION_PATH,
    bootstrap_sql_path: BOOTSTRAP_SQL_PATH,
    verification_sql_path: VERIFY_SQL_PATH,
    database_name: DEFAULT_DATABASE,
    requested_port: DEFAULT_PORT,
    docker_image: DEFAULT_DOCKER_IMAGE,
    proofs: [...REQUIRED_PROOFS],
    steps: [
      "bootstrap-disposable-runtime",
      "apply-local-auth-bootstrap",
      "apply-w1-migration",
      "execute-runtime-verification-sql",
      "teardown-runtime",
    ],
  };
}

export function createBlockedRuntimeReport({ strategy, tooling } = {}) {
  const supabaseDetail = tooling?.commands?.supabase?.detected
    ? `supabase CLI is present at ${tooling.commands.supabase.path}${tooling.commands.supabase.error ? ` and ${tooling.commands.supabase.error}` : ""}`
    : "supabase CLI is absent";
  const missingDetail = (strategy?.missing_commands ?? []).length > 0
    ? `missing runtime commands: ${(strategy.missing_commands ?? []).join(", ")}`
    : "no supported disposable local runtime command set was detected";

  return {
    status: "blocked",
    status_code: BLOCKED_STATUS_CODE,
    reason_code: strategy?.reason_code ?? "LOCAL_POSTGRES_RUNTIME_UNAVAILABLE",
    missing_commands: [...(strategy?.missing_commands ?? [])],
    reason:
      `No supported disposable local PostgreSQL runtime is available in this worktree environment; ${missingDetail}; ${supabaseDetail}.`,
    next_safe_action: strategy?.next_safe_action
      ?? "Provide one disposable local PostgreSQL runtime path on PATH, preferably Docker Desktop or local PostgreSQL binaries, then rerun the committed harness.",
    tooling,
  };
}

function ensureRuntimeRoot(runtimeRoot) {
  mkdirSync(runtimeRoot, { recursive: true });
}

function readSql(filePath) {
  return readFileSync(filePath, "utf8");
}

function createRunDirectory(runtimeRoot) {
  const runId = `run-${Date.now()}-${process.pid}`;
  const runRoot = path.join(runtimeRoot, runId);
  mkdirSync(runRoot, { recursive: true });
  return runRoot;
}

function cleanupRunDirectory(runRoot) {
  if (existsSync(runRoot)) {
    rmSync(runRoot, { recursive: true, force: true });
  }
}

function assertCommandOk(result, message) {
  if (result.status !== 0) {
    throw new Error(`${message}\n${result.combined || result.error || "no output"}`);
  }
}

function collectProofIds(verificationStdout) {
  const proofIds = new Set();
  for (const rawLine of normalizeText(verificationStdout).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith(RUNTIME_PROOF_MARKER)) continue;
    const [, proofId, status] = line.split("|");
    if (!proofId || status !== "PASS") {
      throw new Error(`Invalid runtime proof marker: ${line}`);
    }
    proofIds.add(proofId);
  }
  return proofIds;
}

export function buildVerifiedProofs({ verificationStdouts = [] } = {}) {
  if (!Array.isArray(verificationStdouts) || verificationStdouts.length < 2) {
    throw new Error("rollback-cleanup-determinism requires two successful runtime verification runs");
  }

  const requiredSqlProofIds = new Set(SQL_DERIVED_PROOF_IDS);
  for (const [index, verificationStdout] of verificationStdouts.entries()) {
    const actualProofIds = collectProofIds(verificationStdout);
    for (const requiredProofId of requiredSqlProofIds) {
      if (!actualProofIds.has(requiredProofId)) {
        throw new Error(`Runtime verification run ${index + 1} is missing proof marker ${requiredProofId}`);
      }
    }
  }

  return REQUIRED_PROOFS.map((proof) => {
    if (proof.proof_id === "migration-apply") {
      return { ...proof, verified_by: "migration-apply", runs_verified: 1 };
    }
    if (proof.proof_id === "rollback-cleanup-determinism") {
      return { ...proof, verified_by: "two-verification-runs", runs_verified: verificationStdouts.length };
    }
    return { ...proof, verified_by: "verification-sql", runs_verified: verificationStdouts.length };
  });
}

function runPsqlThroughDocker({ containerName, databaseName, sqlText }) {
  const result = runCommand(
    "docker",
    ["exec", "-i", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", databaseName],
    { input: sqlText },
  );
  assertCommandOk(result, "Docker psql execution failed.");
  return result;
}

function waitForDockerPostgres({ containerName, attempts = 30 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = runCommand("docker", ["exec", containerName, "pg_isready", "-U", "postgres", "-d", DEFAULT_DATABASE]);
    if (result.status === 0) return;
  }
  throw new Error("Docker postgres did not become ready in time.");
}

function ensureLocalDockerImage(imageName = DEFAULT_DOCKER_IMAGE) {
  const inspect = runCommand("docker", ["image", "inspect", imageName]);
  if (inspect.status !== 0) {
    return {
      status: "blocked",
      status_code: BLOCKED_STATUS_CODE,
      reason_code: "LOCAL_DOCKER_POSTGRES_IMAGE_UNAVAILABLE",
      missing_commands: [],
      next_safe_action:
        "Load the postgres:16 Docker image locally without pulling during this task, or provide local PostgreSQL binaries on PATH, then rerun the committed harness.",
      reason: `Docker is present, but the local image ${imageName} is not available for a no-install local runtime.`,
    };
  }
  return null;
}

export function buildDockerRunArgs(plan, containerName) {
  return [
    "run",
    "--rm",
    "-d",
    "--name",
    containerName,
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "-e",
    `POSTGRES_DB=${plan.database_name}`,
    plan.docker_image,
  ];
}

function executeDockerStrategy(plan) {
  const imageBlocker = ensureLocalDockerImage(plan.docker_image);
  if (imageBlocker) return imageBlocker;

  ensureRuntimeRoot(plan.runtime_root);
  const runRoot = createRunDirectory(plan.runtime_root);
  const containerName = `drs-core-runtime-${process.pid}-${Date.now()}`;
  const bootstrapSql = readSql(plan.bootstrap_sql_path);
  const migrationSql = readSql(plan.migration_path);
  const verificationSql = readSql(plan.verification_sql_path);

  try {
    const runResult = runCommand("docker", buildDockerRunArgs(plan, containerName));
    assertCommandOk(runResult, "Failed to start local Docker postgres runtime.");
    waitForDockerPostgres({ containerName });
    runPsqlThroughDocker({ containerName, databaseName: plan.database_name, sqlText: bootstrapSql });
    runPsqlThroughDocker({ containerName, databaseName: plan.database_name, sqlText: migrationSql });
    const verificationRunOne = runPsqlThroughDocker({
      containerName,
      databaseName: plan.database_name,
      sqlText: verificationSql,
    });
    const verificationRunTwo = runPsqlThroughDocker({
      containerName,
      databaseName: plan.database_name,
      sqlText: verificationSql,
    });
    const version = runCommand("docker", ["exec", containerName, "psql", "-U", "postgres", "-d", plan.database_name, "-Atqc", "select version()"]);
    assertCommandOk(version, "Failed to query Docker postgres version.");
    return {
      status: "passed",
      strategy_id: plan.strategy_id,
      runtime_identity: {
        kind: "docker-postgres",
        version: firstLine(version.stdout),
        image: plan.docker_image,
        port: null,
      },
      proofs: buildVerifiedProofs({
        verificationStdouts: [verificationRunOne.stdout, verificationRunTwo.stdout],
      }),
      verification_runs: 2,
      run_root: runRoot,
    };
  } finally {
    runCommand("docker", ["stop", containerName]);
    cleanupRunDirectory(runRoot);
  }
}

function waitForLocalPostgres(plan, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ready = runCommand("psql", ["-h", "127.0.0.1", "-p", String(plan.requested_port), "-U", "postgres", "-d", "postgres", "-Atqc", "select 1"]);
    if (ready.status === 0) return;
  }
  throw new Error("Local PostgreSQL binaries runtime did not become ready in time.");
}

function runPsqlBinary({ databaseName, plan, sqlText }) {
  const result = runCommand(
    "psql",
    ["-h", "127.0.0.1", "-p", String(plan.requested_port), "-U", "postgres", "-d", databaseName, "-v", "ON_ERROR_STOP=1"],
    { input: sqlText },
  );
  assertCommandOk(result, `psql execution failed for database ${databaseName}.`);
  return result;
}

function executePostgresBinariesStrategy(plan) {
  ensureRuntimeRoot(plan.runtime_root);
  const runRoot = createRunDirectory(plan.runtime_root);
  const dataRoot = path.join(runRoot, "data");
  const logPath = path.join(runRoot, "postgres.log");
  const bootstrapSql = readSql(plan.bootstrap_sql_path);
  const migrationSql = readSql(plan.migration_path);
  const verificationSql = readSql(plan.verification_sql_path);

  try {
    assertCommandOk(runCommand("initdb", ["-D", dataRoot, "-U", "postgres", "-A", "trust"]), "initdb failed.");
    assertCommandOk(
      runCommand("pg_ctl", [
        "-D",
        dataRoot,
        "-l",
        logPath,
        "-o",
        `-F -p ${plan.requested_port} -c listen_addresses=127.0.0.1`,
        "start",
      ]),
      "pg_ctl start failed.",
    );
    waitForLocalPostgres(plan);
    assertCommandOk(
      runCommand("psql", [
        "-h",
        "127.0.0.1",
        "-p",
        String(plan.requested_port),
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-Atqc",
        `create database ${plan.database_name}`,
      ]),
      "Failed to create disposable runtime database.",
    );
    runPsqlBinary({ databaseName: plan.database_name, plan, sqlText: bootstrapSql });
    runPsqlBinary({ databaseName: plan.database_name, plan, sqlText: migrationSql });
    const verificationRunOne = runPsqlBinary({ databaseName: plan.database_name, plan, sqlText: verificationSql });
    const verificationRunTwo = runPsqlBinary({ databaseName: plan.database_name, plan, sqlText: verificationSql });
    const version = runCommand("psql", [
      "-h",
      "127.0.0.1",
      "-p",
      String(plan.requested_port),
      "-U",
      "postgres",
      "-d",
      plan.database_name,
      "-Atqc",
      "select version()",
    ]);
    assertCommandOk(version, "Failed to query local postgres version.");
    return {
      status: "passed",
      strategy_id: plan.strategy_id,
      runtime_identity: {
        kind: "postgres-binaries",
        version: firstLine(version.stdout),
        port: plan.requested_port,
      },
      proofs: buildVerifiedProofs({
        verificationStdouts: [verificationRunOne.stdout, verificationRunTwo.stdout],
      }),
      verification_runs: 2,
      run_root: runRoot,
    };
  } finally {
    runCommand("pg_ctl", ["-D", dataRoot, "stop", "-m", "immediate"]);
    cleanupRunDirectory(runRoot);
  }
}

export function runLocalPostgresRuntimeVerification({ tooling = null } = {}) {
  const resolvedTooling = tooling ?? detectLocalRuntimeTooling();
  const strategy = selectLocalRuntimeStrategy(resolvedTooling);
  if (strategy.status === "blocked") {
    return createBlockedRuntimeReport({ strategy, tooling: resolvedTooling });
  }
  const plan = createRuntimeHarnessPlan({ strategy });
  if (strategy.strategy_id === "docker-postgres") {
    return executeDockerStrategy(plan);
  }
  if (strategy.strategy_id === "postgres-binaries") {
    return executePostgresBinariesStrategy(plan);
  }
  throw new Error(`Unsupported runtime strategy: ${strategy.strategy_id}`);
}
