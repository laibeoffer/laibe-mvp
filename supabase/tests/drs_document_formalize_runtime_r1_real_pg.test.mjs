import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";

const migrationsUrl = new URL("../migrations/", import.meta.url);
const migrationPattern =
  /^(\d{14})_drs_document_formalize_runtime_r1\.sql$/u;

test("Task4 binds exactly one CLI-created document runtime migration after Task3", () => {
  const matches = readdirSync(migrationsUrl)
    .map((name) => ({ name, match: name.match(migrationPattern) }))
    .filter((entry) => entry.match !== null);

  assert.equal(matches.length, 1, "one exact Task4 runtime migration is required");
  assert.ok(
    matches[0].match[1] > "20260901214241",
    "Task4 migration must be a direct successor to the accepted Task3 migration",
  );
});
