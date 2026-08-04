import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const PAGE_ROOT = new URL(
  "../src/stitch_laibe_landing_onboarding/pcm_standalone/case_setup/",
  import.meta.url,
);
const HTML_URL = new URL("code.html", PAGE_ROOT);
const CSS_URL = new URL("styles.css", PAGE_ROOT);
const APP_URL = new URL("app.js", PAGE_ROOT);
const SEED = "64539be0b93170a916106dbd61e9ca5841f83b2b";
const EXACT_PATHS = [
  "src/stitch_laibe_landing_onboarding/pcm_standalone/case_setup/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/case_setup/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/case_setup/app.js",
  "tests/pcm-owner-first-case-setup.test.mjs",
].sort();

async function source(url) {
  return readFile(url, "utf8");
}

test("case setup is one exact local three-file page", async () => {
  for (const url of [HTML_URL, CSS_URL, APP_URL]) await access(url);
  const html = await source(HTML_URL);
  assert.match(html, /data-case-setup-page/);
  assert.match(html, /\.\/styles\.css/);
  assert.match(html, /\.\/app\.js/);
  assert.match(html, /\.\.\/shared\/owner-first-shell\.css/);
  assert.doesNotMatch(html, /https?:\/\//u);
});

test("first screen states role status next responsibility record and one primary action", async () => {
  const html = await source(HTML_URL);
  for (const marker of [
    "甲方",
    "目前狀態",
    "下一步",
    "下一責任人",
    "最近紀錄",
    "查看案件準備項目",
  ]) assert.match(html, new RegExp(marker, "u"));
  assert.equal((html.match(/class="owner-first-primary-action"/gu) ?? []).length, 1);
  assert.match(html, /href="#preparation"[^>]*class="owner-first-primary-action"/u);
  assert.equal((html.match(/data-owner-fact/gu) ?? []).length, 5);
});

test("document pairing and formal PCM decision stay truthful and zero-write", async () => {
  const html = await source(HTML_URL);
  for (const marker of [
    "報價健檢資料",
    "圖說檢討資料",
    "只有報價、缺圖說",
    "只有圖說、缺報價",
    "兩份資料都尚未準備",
    "是否申請正式 PCM 服務",
    "尚未建立案件",
  ]) assert.match(html, new RegExp(marker, "u"));
  assert.match(html, /href="\.\.\/quote_check\/code\.html"/u);
  assert.match(html, /href="\.\.\/drawing_check\/code\.html"/u);
  assert.doesNotMatch(html, /(?:已上傳|已儲存|案件已建立|正式審查完成)/u);
  const disabledControls = html.match(/<(?:button|input)[^>]*disabled/gu) ?? [];
  assert.ok(disabledControls.length >= 3);
});

test("every failure row has reason next owner return and recovery", async () => {
  const { CASE_SETUP_FAILURES } = await import(APP_URL.href);
  assert.deepEqual(Object.keys(CASE_SETUP_FAILURES).sort(), [
    "BOTH_DOCUMENTS_MISSING",
    "DRAWING_ONLY_QUOTE_MISSING",
    "FILE_METADATA_UNCONFIRMED",
    "PREREQUISITE_DATA_MISSING",
    "QUOTE_ONLY_DRAWING_MISSING",
    "VERSION_CONFLICT",
  ]);
  for (const failure of Object.values(CASE_SETUP_FAILURES)) {
    assert.equal(typeof failure.reason, "string");
    assert.equal(typeof failure.nextAction, "string");
    assert.equal(typeof failure.responsibleRole, "string");
    assert.equal(typeof failure.returnRoute, "string");
    assert.equal(typeof failure.recoveryRoute, "string");
    assert.equal(failure.payloadPolicy, "ZERO_CASE_DATA");
    assert.equal(failure.mutationAllowed, false);
    assert.equal(failure.writeAuthority, "NONE");
    assert.equal(failure.caseData, null);
    assert.equal(failure.actions.length, 0);
    assert.deepEqual([...failure.actions], []);
  }
});

test("unknown hostile context is no-throw zero-case-data", async () => {
  const { CONTEXT_UNAVAILABLE, resolveCaseSetupContext } = await import(APP_URL.href);
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "status", {
    get() {
      getterCalls += 1;
      throw new Error("must not read caller context");
    },
  });
  const proxy = new Proxy({}, {
    get() { throw new Error("must not trap"); },
    ownKeys() { throw new Error("must not enumerate"); },
  });
  for (const input of [undefined, null, "READY", accessor, proxy, () => {}]) {
    assert.doesNotThrow(() => resolveCaseSetupContext(input));
    assert.equal(resolveCaseSetupContext(input), CONTEXT_UNAVAILABLE);
  }
  assert.equal(getterCalls, 0);
  assert.equal(CONTEXT_UNAVAILABLE.payloadPolicy, "ZERO_CASE_DATA");
  assert.equal(CONTEXT_UNAVAILABLE.mutationAllowed, false);
  assert.equal(CONTEXT_UNAVAILABLE.actions.length, 0);
});

test("zero-authority actions resist post-load Array pollution", async () => {
  const { CONTEXT_UNAVAILABLE } = await import(APP_URL.href);
  const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, 0);
  const iterator = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator);
  try {
    Object.defineProperty(Array.prototype, 0, {
      configurable: true,
      value: { code: "INJECTED" },
      writable: true,
    });
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      configurable: true,
      value() { throw new Error("shared iterator"); },
      writable: true,
    });
    assert.equal(CONTEXT_UNAVAILABLE.actions[0], undefined);
    assert.equal(CONTEXT_UNAVAILABLE.actions.length, 0);
    assert.deepEqual([...CONTEXT_UNAVAILABLE.actions], []);
  } finally {
    if (descriptor) Object.defineProperty(Array.prototype, 0, descriptor);
    else delete Array.prototype[0];
    if (iterator) Object.defineProperty(Array.prototype, Symbol.iterator, iterator);
  }
});

test("state and failure tables reject post-load Object prototype injection", async () => {
  const { CASE_SETUP_FAILURES, CASE_SETUP_STATES, CONTEXT_UNAVAILABLE } = await import(APP_URL.href);
  const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, "INJECTED_STATE");
  try {
    Object.defineProperty(Object.prototype, "INJECTED_STATE", {
      configurable: true,
      value: CONTEXT_UNAVAILABLE,
      writable: true,
    });
    assert.equal(CASE_SETUP_STATES.INJECTED_STATE, undefined);
    assert.equal(CASE_SETUP_FAILURES.INJECTED_STATE, undefined);
  } finally {
    if (descriptor) Object.defineProperty(Object.prototype, "INJECTED_STATE", descriptor);
    else delete Object.prototype.INJECTED_STATE;
  }
});

test("local links resolve and visible copy excludes forbidden platform promises", async () => {
  const html = await source(HTML_URL);
  const localRefs = [...html.matchAll(/(?:href|src)="([^"]+)"/gu)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith("#"));
  for (const ref of localRefs) {
    const [pathname] = ref.split("#");
    await access(new URL(pathname, HTML_URL));
  }
  assert.doesNotMatch(
    html,
    /招標|投標|競標|媒合|金流託管|支付託管|代收代付|第三方付款保障|老屋煉金術|投資報酬|\b(?:DB|API|debug|mock-only)\b/iu,
  );
});

test("responsive source includes focus 44px reflow and reduced-motion floors", async () => {
  const css = await source(CSS_URL);
  assert.match(css, /min-(?:block-)?size:\s*44px/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /@media\s*\([^)]*max-width:\s*768px/u);
  assert.match(css, /@media\s*\([^)]*max-width:\s*480px/u);
  assert.match(css, /prefers-reduced-motion:\s*reduce/u);
  assert.doesNotMatch(css, /@import|https?:\/\//u);
});

test("primary action sends keyboard focus to the preparation section", async () => {
  const html = await source(HTML_URL);
  assert.match(
    html,
    /<section[^>]*id="preparation"[^>]*tabindex="-1"[^>]*aria-labelledby="preparation-title"/u,
  );
});

test("T6 source candidate is immediate exact four with outside zero", () => {
  const cwd = ROOT;
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
  let changed;
  if (head === SEED) {
    changed = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
      cwd,
      encoding: "utf8",
    })
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => line.slice(3).replaceAll("\\", "/"));
  } else {
    assert.equal(execFileSync("git", ["rev-parse", "HEAD^"], { cwd, encoding: "utf8" }).trim(), SEED);
    changed = execFileSync("git", ["diff", "--name-only", `${SEED}..${head}`], {
      cwd,
      encoding: "utf8",
    })
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean);
  }
  assert.deepEqual(changed.sort(), EXACT_PATHS);
});
