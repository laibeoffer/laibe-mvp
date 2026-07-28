import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildCoreReconciliation,
  EXPECTED_MIGRATIONS,
  validateMigrationSet,
} from "../build_core_reconciliation.mjs";

const repoRoot = resolve(import.meta.dirname, "../../..");

function outputSnapshot(directory) {
  return Object.fromEntries(
    readdirSync(directory)
      .sort()
      .map((name) => [name, readFileSync(join(directory, name), "utf8")]),
  );
}

test("Core reconciliation generation is deterministic and hash-bound", () => {
  const first = mkdtempSync(join(tmpdir(), "a5-core-reconciliation-a-"));
  const second = mkdtempSync(join(tmpdir(), "a5-core-reconciliation-b-"));

  const firstManifest = buildCoreReconciliation({
    repoRoot,
    outputDir: first,
  });
  const secondManifest = buildCoreReconciliation({
    repoRoot,
    outputDir: second,
  });

  assert.deepEqual(firstManifest, secondManifest);
  assert.deepEqual(outputSnapshot(first), outputSnapshot(second));
  assert.equal(firstManifest.source_migrations.length, 7);
  assert.ok(
    firstManifest.source_migrations.every((item) =>
      /^[a-f0-9]{64}$/.test(item.sha256) && item.bytes > 0
    ),
  );
  assert.ok(
    firstManifest.artifacts.every((item) =>
      /^[a-f0-9]{64}$/.test(item.sha256) && item.bytes > 0
    ),
  );
});

test("generator strips component transactions and emits one outer transaction", () => {
  const output = mkdtempSync(join(tmpdir(), "a5-core-transaction-"));
  buildCoreReconciliation({ repoRoot, outputDir: output });
  const bundle = readFileSync(
    join(output, "010_a5_knowledge_foundation.sql"),
    "utf8",
  );

  assert.equal((bundle.match(/\bbegin\s*;/gi) || []).length, 1);
  assert.equal((bundle.match(/\bcommit\s*;/gi) || []).length, 1);
  for (const name of EXPECTED_MIGRATIONS) {
    assert.ok(bundle.includes(name), `bundle omits ${name}`);
  }
});

test("generator rejects missing, reordered or unexpected migration sets", () => {
  assert.throws(
    () => validateMigrationSet(EXPECTED_MIGRATIONS.slice(0, -1)),
    /migration set/i,
  );
  assert.throws(
    () => validateMigrationSet([...EXPECTED_MIGRATIONS].reverse()),
    /migration set/i,
  );
  assert.throws(
    () => validateMigrationSet([...EXPECTED_MIGRATIONS, "unexpected.sql"]),
    /migration set/i,
  );
  assert.doesNotThrow(() => validateMigrationSet(EXPECTED_MIGRATIONS));
});

test("preflight and rollback remain scoped to exact A5 ownership", () => {
  const output = mkdtempSync(join(tmpdir(), "a5-core-scope-"));
  buildCoreReconciliation({ repoRoot, outputDir: output });
  const preflight = readFileSync(join(output, "000_preflight.sql"), "utf8");
  const rollback = readFileSync(join(output, "990_rollback.sql"), "utf8");

  assert.match(preflight, /a5\.knowledge_foundation\.core_readiness\.v1/);
  assert.match(preflight, /to_regnamespace\('knowledge'\)/);
  assert.match(preflight, /to_regnamespace\('knowledge_staging'\)/);
  assert.match(preflight, /to_regnamespace\('casework'\)/);
  assert.doesNotMatch(preflight, /(drop|truncate|alter)\s+table/i);

  assert.match(rollback, /pg_class[\s\S]*?knowledge_staging[\s\S]*?knowledge[\s\S]*?casework/);
  assert.match(rollback, /format\([\s\S]*?select exists[\s\S]*?limit 1/i);
  assert.match(rollback, /drop schema knowledge_staging;/i);
  assert.match(rollback, /drop schema knowledge;/i);
  assert.match(rollback, /drop schema casework;/i);
  assert.doesNotMatch(rollback, /drop schema[\s\S]*?\bcascade\b/i);
  assert.match(rollback, /pg_get_function_identity_arguments/i);
  assert.match(rollback, /drop table %I\.%I/i);
  assert.doesNotMatch(rollback, /drop\s+table\s+public\./i);
});
