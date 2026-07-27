import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  tmpdir,
} from "node:os";
import {
  join,
  resolve,
} from "node:path";
import test from "node:test";

import {
  groupSqlStatements,
  splitSqlStatements,
  writeMigrationChunks,
} from "../split_supabase_migration.mjs";

test("splitter preserves quoted and function-body semicolons", () => {
  const sql = `
    create table example (value text);
    insert into example values ('a; b');
    create function example_function()
    returns void
    language plpgsql
    as $body$
    begin
      perform 1;
      perform 'still; inside';
    end;
    $body$;
    -- comment with ;
    select "semi;colon" from example;
  `;

  const statements = splitSqlStatements(sql);

  assert.equal(statements.length, 4);
  assert.match(statements[2], /perform 1;/);
  assert.match(statements[2], /still; inside/);
});

test("grouper never splits an individual statement", () => {
  const statements = [
    "select 1;",
    `select '${"x".repeat(2_000)}';`,
    "select 3;",
  ];

  const groups = groupSqlStatements(statements, 1_000);

  assert.equal(groups.length, 3);
  assert.equal(splitSqlStatements(groups[1]).length, 1);
});

test("deployment chunks remove the source outer transaction wrapper", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "a5-transaction-chunks-"));
  const inputPath = join(outputDir, "wrapped.sql");
  const source = `
    begin;
    create table example (id bigint primary key);
    insert into example values (1);
    commit;
  `;
  writeFileSync(inputPath, source, "utf8");

  const manifest = writeMigrationChunks({
    inputPath,
    outputDir,
    maxChars: 1_000,
  });
  const deployedStatements = manifest.chunks.flatMap((chunk) => {
    const content = readFileSync(join(outputDir, chunk.file), "utf8");
    return splitSqlStatements(content);
  });

  assert.deepEqual(deployedStatements, [
    "create table example (id bigint primary key);",
    "insert into example values (1);",
  ]);
});

test("real migration produces ordered hash-verified deployment chunks", () => {
  const repoRoot = resolve(import.meta.dirname, "../../..");
  const inputPath = join(
    repoRoot,
    "supabase",
    "migrations",
    "20260726000100_pcm_knowledge_foundation.sql",
  );
  const outputDir = mkdtempSync(join(tmpdir(), "a5-migration-chunks-"));
  const source = readFileSync(inputPath, "utf8");

  const manifest = writeMigrationChunks({
    inputPath,
    outputDir,
    maxChars: 18_000,
  });

  assert.ok(manifest.chunk_count > 1);
  assert.equal(
    manifest.statement_count,
    splitSqlStatements(source).length - 2,
  );
  const deployedStatements = manifest.chunks.flatMap((chunk) => {
    const content = readFileSync(join(outputDir, chunk.file), "utf8");
    return splitSqlStatements(content);
  });
  assert.deepEqual(
    deployedStatements,
    splitSqlStatements(source).slice(1, -1),
  );
  assert.ok(
    manifest.chunks.every((chunk) =>
      chunk.char_length <= manifest.max_chars ||
      chunk.statement_count === 1
    ),
  );
});
