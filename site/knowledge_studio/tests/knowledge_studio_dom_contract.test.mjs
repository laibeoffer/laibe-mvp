import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function read(name) {
  return readFileSync(resolve(root, name), "utf8");
}

test("Studio markup exposes transient-editor, feedback and confirmation states", () => {
  const html = read("code.html");
  for (const fragment of [
    'id="back-to-list-button"',
    "返回規則清單",
    'id="cancel-button"',
    'id="unsaved-indicator"',
    'id="confirmation-dialog"',
    'id="confirmation-impact"',
    'id="confirmation-note"',
    'id="confirmation-cancel"',
    'id="confirmation-confirm"',
    'aria-busy="false"',
  ]) {
    assert.ok(html.includes(fragment), `Studio markup is missing ${fragment}`);
  }
  for (const field of [
    "title",
    "type",
    "owner",
    "summary",
    "criteria",
    "next-owner",
    "evidence",
  ]) {
    assert.ok(
      html.includes(`id="error-${field}"`),
      `inline error slot is missing for ${field}`,
    );
  }
});

test("Studio controller exposes mobile pane, busy and dirty-state behavior", () => {
  const app = read("app.js");
  for (const fragment of [
    "createDraftBuffer",
    "discardDraftBuffer",
    "validateDraft",
    "saveAndSubmitReview",
    'setMobilePane("detail")',
    'setMobilePane("list")',
    "setBusy",
    "requestConfirmation",
    "beforeunload",
    "aria-selected",
    "unsaved",
  ]) {
    assert.ok(app.includes(fragment), `Studio controller is missing ${fragment}`);
  }
  assert.doesNotMatch(
    app,
    /newDraft\.addEventListener\([\s\S]{0,500}?store\.createDraft/i,
    "New Draft still creates a persistent record immediately",
  );
});

test("mobile layout switches list and detail instead of stacking both panes", () => {
  const css = read("styles.css");
  assert.match(css, /@media\s*\([^)]*max-width:\s*720px/i);
  assert.match(css, /\.mobile-back-button/i);
  assert.match(
    css,
    /data-mobile-pane="detail"[\s\S]*?\.record-pane[\s\S]*?display:\s*none/i,
  );
  assert.match(
    css,
    /data-mobile-pane="list"[\s\S]*?\.detail-pane[\s\S]*?display:\s*none/i,
  );
});

test("product copy identifies internal PCM governance and sample-data limits", () => {
  const html = read("code.html");
  assert.match(html, /PCM 規則治理中心/);
  assert.match(html, /僅供流程操作示範，不是案件事實/);
  assert.match(html, /僅限 PCM 與管理者/);
  assert.doesNotMatch(html, /內部規則編修預覽/);
});

test("changed Studio assets carry incremented cache versions", () => {
  const html = read("code.html");
  assert.match(html, /styles\.css\?v=2026072702/);
  assert.match(html, /app\.js\?v=2026072702/);
});
