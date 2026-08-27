import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGINAL_ACCEPTED_BASE = "d0571b467b0f75439a7773b300febbcfe8069cd1";
const EXACT10 = Object.freeze([
  "supabase/functions/_shared/drs-document-storage/drs-document-edge-runtime.ts",
  "supabase/functions/_shared/drs-document-storage/drs-document-scanner-runtime.ts",
  "supabase/functions/_shared/drs-document-storage/service.ts",
  "supabase/functions/drs-document-snapshot/index.ts",
  "supabase/functions/drs-document-upload-finalize/index.ts",
  "supabase/functions/drs-document-upload-intent/index.ts",
  "supabase/functions/drs-document-version-download/index.ts",
  "supabase/tests/drs_document_edge_runtime_composition_w1.test.mjs",
  "tests/drs-document-bff-adapter-source.test.mjs",
  "tests/drs-document-edge-runtime-composition-source.test.mjs",
].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))));

function source(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function gitPaths(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" })
    .trim().split(/\r?\n/u).filter(Boolean);
}

function changedPaths() {
  const committed = gitPaths([
    "diff",
    "--name-only",
    `${ORIGINAL_ACCEPTED_BASE}..HEAD`,
  ]);
  const unstaged = gitPaths(["diff", "--name-only", "HEAD"]);
  const staged = gitPaths(["diff", "--cached", "--name-only", "HEAD"]);
  const untracked = gitPaths(["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...committed, ...unstaged, ...staged, ...untracked])]
    .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

test("focused RED: exact S1B runtime modules and default handler wiring exist", () => {
  const edge = source(EXACT10[0]);
  const scanner = source(EXACT10[1]);
  assert.match(edge, /export function createDrsDocumentEdgeRuntime/u);
  assert.match(scanner, /export function createDrsDocumentScannerRuntime/u);
  for (const handler of EXACT10.slice(3, 7)) {
    const text = source(handler);
    assert.match(text, /createDrsDocumentEdgeRuntime/u, handler);
    assert.doesNotMatch(
      text,
      /createDefaultDocumentEdgeDependencies/u,
      handler,
    );
  }
});

test("sealed scanner composition is no-pull and does not expose secret or raw-error surfaces", () => {
  const combined = [source(EXACT10[0]), source(EXACT10[1])].join("\n");
  assert.doesNotMatch(combined, /from\s+["'](?:https?:|npm:|jsr:)/u);
  assert.doesNotMatch(combined, /console\.|error\.message|\.stack/u);
  assert.doesNotMatch(
    combined,
    /signedUploadUrl\s*[:=].*(?:scanner|log|cookie)/iu,
  );
  assert.match(combined, /LAIBE_DRS_DOCUMENT_SCANNER_URL/u);
  assert.match(combined, /LAIBE_DRS_DOCUMENT_SCANNER_TOKEN/u);
  assert.match(combined, /promoteSealed/u);
  assert.doesNotMatch(combined, /storage\/v1\/object\/copy/u);
});

test("candidate writes remain exactly within the admitted exact10 paths", () => {
  assert.deepEqual(changedPaths(), EXACT10);
  const status = execFileSync(
    "git",
    ["status", "--porcelain=v1", "-uall"],
    { cwd: ROOT, encoding: "utf8" },
  ).replace(/\r?\n$/u, "").split(/\r?\n/u).filter(Boolean).map((line) =>
    line.slice(3)
  )
    .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  if (status.length > 0) {
    assert.deepEqual(
      status,
      EXACT10.filter((candidate) => status.includes(candidate)),
    );
  }
});

test("protected config and migration bytes are not part of the S1B diff", () => {
  const allChanged = execFileSync(
    "git",
    ["status", "--porcelain=v1", "-uall"],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.doesNotMatch(allChanged, /supabase\/config\.toml/u);
  assert.doesNotMatch(allChanged, /supabase\/migrations\//u);
  assert.doesNotMatch(allChanged, /(?:calendar|line|pcm_standalone)/iu);
});
