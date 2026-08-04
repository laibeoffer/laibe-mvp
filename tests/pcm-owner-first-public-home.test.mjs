import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const pageRoot = new URL(
  "../src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/",
  import.meta.url,
);
const htmlUrl = new URL("code.html", pageRoot);
const cssUrl = new URL("styles.css", pageRoot);
const appUrl = new URL("app.js", pageRoot);
const governanceUrl = new URL(
  "../docs/governance/pcm-owner-first-execution-manifest.v1.json",
  import.meta.url,
);
const planUrl = new URL(
  "../docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  import.meta.url,
);

class RouteTestElement {
  constructor(route) {
    this.dataset = { route };
    this.attributes = new Map([["data-route", route]]);
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === "data-route-state") this.dataset.routeState = stringValue;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "data-route-state") delete this.dataset.routeState;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

Object.defineProperty(globalThis, "Element", {
  configurable: true,
  value: RouteTestElement,
});

function makeRouteControl(route) {
  return new RouteTestElement(route);
}

function assertRouteClosed(control) {
  assert.equal(control.getAttribute("href"), null);
  assert.equal(control.getAttribute("aria-disabled"), "true");
  assert.equal(control.getAttribute("tabindex"), "-1");
  assert.equal(control.dataset.routeState, "planned");
}

test("homepage follows the seven-section owner decision hierarchy", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const ids = [
    "hero",
    "application-check",
    "pcm-scope",
    "result-example",
    "case-flow",
    "service-fee",
    "final-action",
  ];
  const positions = ids.map((id) => html.indexOf(`id="${id}"`));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(html, /PCM 是甲方的決策顧問/);
  assert.match(html, /給已取得乙方報價與施工圖的甲方/);
  assert.match(html, /先過濾差異與缺漏/);
  assert.match(html, /查看申請與文件準備/);
});

test("qualification appears beside the conversion path with three plain checks", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = html.match(
    /<section id="application-check"[\s\S]*?<\/section>/,
  )?.[0] ?? "";

  assert.equal((section.match(/data-qualification-item/g) ?? []).length, 3);
  assert.match(section, /已取得乙方報價單 PDF/);
  assert.match(section, /已取得施工圖 PDF，至少包含平面圖/);
  assert.match(section, /希望先確認文件差異、缺漏與待釐清事項/);
});

test("homepage explains five PCM checks without asking the owner to infer the answer", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = html.match(
    /<section id="pcm-scope"[\s\S]*?<\/section>/,
  )?.[0] ?? "";

  assert.equal((section.match(/data-pcm-check/g) ?? []).length, 5);
  for (const phrase of [
    "報價與圖說是否使用同一施工範圍",
    "是否有漏列、重複或說法不一致",
    "追加或變更前",
    "驗收及付款前",
    "甲方、乙方或 PCM 接續處理",
  ]) {
    assert.match(section, new RegExp(phrase));
  }
});

test("result example is explicitly synthetic and includes every decision fact", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = html.match(
    /<section id="result-example"[\s\S]*?<\/section>/,
  )?.[0] ?? "";

  assert.match(section, /格式示意，非真實案件/);
  for (const label of [
    "引用版本",
    "已確認內容",
    "差異與缺漏",
    "仍不確定事項",
    "建議下一步",
    "下一責任人",
    "案件紀錄",
  ]) {
    assert.match(section, new RegExp(label));
  }
  assert.doesNotMatch(section, /王小明|陳先生|NT\$|\d{4}\/\d{1,2}\/\d{1,2}/);
});

test("visible service flow has four stages and old six-step details are non-rendering compatibility evidence", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = html.match(/<section id="case-flow"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.deepEqual(
    [...section.matchAll(/data-home-stage="([1-4])"/g)].map((match) => match[1]),
    ["1", "2", "3", "4"],
  );
  for (const phrase of [
    "準備報價與圖說",
    "取得基本檢討結果",
    "決定是否申請正式 PCM 服務",
    "進入案件治理與紀錄",
  ]) {
    assert.match(section, new RegExp(phrase));
  }
  assert.match(html, /class="same-fact-rail"[^>]*hidden/);
  assert.match(section, /class="flow-list"[^>]*hidden/);
});

test("canonical entry controls start fail-closed before trusted route binding", async () => {
  const html = await readFile(htmlUrl, "utf8");

  for (const [route, label] of [
    ["quoteCheck", "查看報價健檢"],
    ["drawingCheck", "查看圖說檢討"],
    ["accountAccess", "註冊／登入"],
  ]) {
    const control = html.match(
      new RegExp(`<a\\b(?=[^>]*data-route="${route}")[^>]*>[\\s\\S]*?${label}[\\s\\S]*?<\\/a>`),
    )?.[0] ?? "";
    assert.match(control, /aria-disabled="true"/);
    assert.match(control, /data-route-state="planned"/);
    assert.doesNotMatch(control, /\shref=/);
  }
});

test("header starts fail closed and delegates the canonical shared account entry to route binding", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? "";
  const accountEntry = header.match(
    /<a\b(?=[^>]*data-account-entry)(?=[^>]*data-route="accountAccess")(?=[^>]*data-canonical-route="\/account\/access")[^>]*>[\s\S]*?註冊／登入[\s\S]*?<\/a>/,
  )?.[0] ?? "";

  assert.notEqual(accountEntry, "");
  assert.match(accountEntry, /aria-disabled="true"/);
  assert.match(accountEntry, /tabindex="-1"/);
  assert.match(accountEntry, /data-route-state="planned"/);
  assert.doesNotMatch(accountEntry, /\shref=/);
});

test("mobile header keeps account and decision actions without stacking secondary anchors", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(
    css,
    /@media\s*\(max-width:\s*620px\)[\s\S]*?\.site-header nav\s*>\s*a:nth-child\(-n\s*\+\s*3\)\s*\{[^}]*display:\s*none;/,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*620px\)[\s\S]*?\.site-header nav\s*>\s*a:nth-child\(5\)\s*\{[^}]*grid-column:\s*auto;/,
  );
});

test("route binding activates only routes with a real href", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?bind=${Date.now()}`);
  const planned = makeRouteControl("quoteCheck");
  const active = makeRouteControl("serviceContract");
  const root = { querySelectorAll: () => [planned, active] };

  bindPublicRoutes(root, {
    quoteCheck: null,
    serviceContract: "../service_contract/code.html",
  });

  assert.equal(planned.getAttribute("href"), null);
  assert.equal(planned.getAttribute("aria-disabled"), "true");
  assert.equal(planned.getAttribute("tabindex"), "-1");
  assert.equal(planned.dataset.routeState, "planned");
  assert.equal(active.getAttribute("href"), "../service_contract/code.html");
  assert.equal(active.getAttribute("aria-disabled"), null);
  assert.equal(active.getAttribute("tabindex"), null);
  assert.equal(active.dataset.routeState, "active");
});

test("route binding rejects inherited, non-string, non-local, and unknown href values", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?closed=${Date.now()}`);
  const cases = [
    { control: makeRouteControl("quoteCheck"), routes: Object.create({ quoteCheck: "javascript:alert(1)" }) },
    { control: makeRouteControl("quoteCheck"), routes: { quoteCheck: "javascript:alert(1)" } },
    { control: makeRouteControl("quoteCheck"), routes: { quoteCheck: { href: "../quote_check/code.html" } } },
    { control: makeRouteControl("quoteCheck"), routes: { quoteCheck: " ../quote_check/code.html" } },
    { control: makeRouteControl("unknownRoute"), routes: { serviceContract: "../service_contract/code.html" } },
  ];

  for (const item of cases) {
    bindPublicRoutes({ querySelectorAll: () => [item.control] }, item.routes);
    assert.equal(item.control.getAttribute("href"), null);
    assert.equal(item.control.getAttribute("aria-disabled"), "true");
    assert.equal(item.control.dataset.routeState, "planned");
  }
});

test("route binding uses module-load captured DOM methods for exact href writes and closed removal", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?dom-methods=${Date.now()}`);
  const setDescriptor = Object.getOwnPropertyDescriptor(RouteTestElement.prototype, "setAttribute");
  const removeDescriptor = Object.getOwnPropertyDescriptor(RouteTestElement.prototype, "removeAttribute");
  const getDescriptor = Object.getOwnPropertyDescriptor(RouteTestElement.prototype, "getAttribute");
  const trusted = makeRouteControl("accountAccess");
  const closed = makeRouteControl("unknownRoute");
  closed.attributes.set("href", "javascript:alert(2)");
  let poisonedSetCalls = 0;
  let poisonedRemoveCalls = 0;
  let poisonedGetCalls = 0;

  try {
    Object.defineProperty(RouteTestElement.prototype, "setAttribute", {
      ...setDescriptor,
      value(name, value) {
        poisonedSetCalls += 1;
        this.attributes.set(name, name === "href" ? "javascript:alert(1)" : String(value));
      },
    });
    Object.defineProperty(RouteTestElement.prototype, "removeAttribute", {
      ...removeDescriptor,
      value() {
        poisonedRemoveCalls += 1;
      },
    });
    Object.defineProperty(RouteTestElement.prototype, "getAttribute", {
      ...getDescriptor,
      value() {
        poisonedGetCalls += 1;
        return "javascript:alert(3)";
      },
    });

    assert.doesNotThrow(() => {
      bindPublicRoutes(
        { querySelectorAll: () => [trusted, closed] },
        { accountAccess: "../account_access/code.html" },
      );
    });

    assert.equal(trusted.attributes.get("href"), "../account_access/code.html");
    assert.equal(trusted.attributes.has("aria-disabled"), false);
    assert.equal(trusted.attributes.has("tabindex"), false);
    assert.equal(trusted.attributes.get("data-route-state"), "active");
    assert.equal(closed.attributes.has("href"), false);
    assert.equal(closed.attributes.get("aria-disabled"), "true");
    assert.equal(closed.attributes.get("tabindex"), "-1");
    assert.equal(closed.attributes.get("data-route-state"), "planned");
    assert.equal(poisonedSetCalls, 0);
    assert.equal(poisonedRemoveCalls, 0);
    assert.equal(poisonedGetCalls, 0);

    const throwingTrusted = makeRouteControl("accountAccess");
    const throwingClosed = makeRouteControl("unknownRoute");
    throwingClosed.attributes.set("href", "data:text/html,unsafe");
    Object.defineProperty(RouteTestElement.prototype, "setAttribute", {
      ...setDescriptor,
      value() {
        throw new Error("polluted setAttribute");
      },
    });
    Object.defineProperty(RouteTestElement.prototype, "removeAttribute", {
      ...removeDescriptor,
      value() {
        throw new Error("polluted removeAttribute");
      },
    });
    Object.defineProperty(RouteTestElement.prototype, "getAttribute", {
      ...getDescriptor,
      value() {
        throw new Error("polluted getAttribute");
      },
    });

    assert.doesNotThrow(() => {
      bindPublicRoutes(
        { querySelectorAll: () => [throwingTrusted, throwingClosed] },
        { accountAccess: "../account_access/code.html" },
      );
    });
    assert.equal(throwingTrusted.attributes.get("href"), "../account_access/code.html");
    assert.equal(throwingTrusted.attributes.get("data-route-state"), "active");
    assert.equal(throwingClosed.attributes.has("href"), false);
    assert.equal(throwingClosed.attributes.get("aria-disabled"), "true");
    assert.equal(throwingClosed.attributes.get("tabindex"), "-1");
    assert.equal(throwingClosed.attributes.get("data-route-state"), "planned");
  } finally {
    Object.defineProperty(RouteTestElement.prototype, "setAttribute", setDescriptor);
    Object.defineProperty(RouteTestElement.prototype, "removeAttribute", removeDescriptor);
    Object.defineProperty(RouteTestElement.prototype, "getAttribute", getDescriptor);
  }
});

test("route binding ignores post-load shared intrinsic and collection forEach pollution", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?intrinsics=${Date.now()}`);
  const trimDescriptor = Object.getOwnPropertyDescriptor(String.prototype, "trim");
  const testDescriptor = Object.getOwnPropertyDescriptor(RegExp.prototype, "test");
  const arrayForEachDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "forEach");
  let trimCalls = 0;
  let regexpCalls = 0;
  let nodeListForEachReads = 0;

  try {
    Object.defineProperty(String.prototype, "trim", {
      ...trimDescriptor,
      value() {
        trimCalls += 1;
        throw new Error("polluted String.prototype.trim");
      },
    });
    Object.defineProperty(RegExp.prototype, "test", {
      ...testDescriptor,
      value() {
        regexpCalls += 1;
        throw new Error("polluted RegExp.prototype.test");
      },
    });
    Object.defineProperty(Array.prototype, "forEach", {
      ...arrayForEachDescriptor,
      value() {
        throw new Error("polluted Array.prototype.forEach");
      },
    });

    const arrayControl = makeRouteControl("serviceContract");
    assert.doesNotThrow(() => {
      bindPublicRoutes(
        { querySelectorAll: () => [arrayControl] },
        { serviceContract: "https://untrusted.example/contract" },
      );
    });
    assertRouteClosed(arrayControl);

    const nodeListControl = makeRouteControl("serviceContract");
    const pollutedNodeListPrototype = Object.create(null, {
      forEach: {
        configurable: true,
        get() {
          nodeListForEachReads += 1;
          throw new Error("polluted NodeList.prototype.forEach");
        },
      },
    });
    const nodeListLike = Object.create(pollutedNodeListPrototype);
    nodeListLike[0] = nodeListControl;
    nodeListLike.length = 1;
    assert.doesNotThrow(() => {
      bindPublicRoutes(
        { querySelectorAll: () => nodeListLike },
        { serviceContract: "https://untrusted.example/contract" },
      );
    });
    assertRouteClosed(nodeListControl);
    assert.equal(nodeListForEachReads, 0);
    assert.equal(trimCalls, 0);
    assert.equal(regexpCalls, 0);
  } finally {
    Object.defineProperty(String.prototype, "trim", trimDescriptor);
    Object.defineProperty(RegExp.prototype, "test", testDescriptor);
    Object.defineProperty(Array.prototype, "forEach", arrayForEachDescriptor);
  }
});

test("route binding requires an exact trusted route name and href pair", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?trusted=${Date.now()}`);
  const closedCases = [
    ["unknownRoute", "../service_contract/code.html"],
    ["serviceContract", "../../../../outside.html"],
    ["process", "#missing-fragment"],
    ["serviceContract", "http://untrusted.example/contract"],
    ["serviceContract", "https://untrusted.example/contract"],
    ["serviceContract", "data:text/html,untrusted"],
    ["serviceContract", "javascript:alert(1)"],
  ];

  for (const [routeName, candidateHref] of closedCases) {
    const control = makeRouteControl(routeName);
    bindPublicRoutes(
      { querySelectorAll: () => [control] },
      { [routeName]: candidateHref },
    );
    assertRouteClosed(control);
  }

  const active = makeRouteControl("serviceContract");
  bindPublicRoutes(
    { querySelectorAll: () => [active] },
    { serviceContract: "../service_contract/code.html" },
  );
  assert.equal(active.getAttribute("href"), "../service_contract/code.html");
  assert.equal(active.getAttribute("aria-disabled"), null);
  assert.equal(active.getAttribute("tabindex"), null);
  assert.equal(active.dataset.routeState, "active");

  const activeQuote = makeRouteControl("quoteCheck");
  bindPublicRoutes(
    { querySelectorAll: () => [activeQuote] },
    { quoteCheck: "../quote_check/code.html" },
  );
  assert.equal(activeQuote.getAttribute("href"), "../quote_check/code.html");
  assert.equal(activeQuote.getAttribute("aria-disabled"), null);
  assert.equal(activeQuote.getAttribute("tabindex"), null);
  assert.equal(activeQuote.dataset.routeState, "active");

  const activeDrawing = makeRouteControl("drawingCheck");
  bindPublicRoutes(
    { querySelectorAll: () => [activeDrawing] },
    { drawingCheck: "../drawing_check/code.html" },
  );
  assert.equal(activeDrawing.getAttribute("href"), "../drawing_check/code.html");
  assert.equal(activeDrawing.getAttribute("aria-disabled"), null);
  assert.equal(activeDrawing.getAttribute("tabindex"), null);
  assert.equal(activeDrawing.dataset.routeState, "active");

  const appSource = await readFile(appUrl, "utf8");
  assert.match(appSource, /case "quoteCheck":/);
  assert.match(appSource, /case "drawingCheck":/);
});

test("footer links only to visible owner-first sections", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? "";

  assert.match(footer, /href="#case-flow"[^>]*>\s*服務流程\s*<\/a>/);
  assert.match(footer, /href="#service-fee"[^>]*>\s*費用與服務邊界\s*<\/a>/);
  assert.match(html, /<section\s+id="case-flow"/);
  assert.match(html, /<section\s+id="service-fee"/);
});

test("T5 DOM-method correction receipts stay bound to the admitted immutable evidence commit", () => {
  const repositoryRoot = new URL("../", import.meta.url);
  const gitText = (...args) => execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  const reviewTarget = "64539be0b93170a916106dbd61e9ca5841f83b2b";
  const manifestPath = "docs/governance/pcm-owner-first-execution-manifest.v1.json";
  const manifestBytes = execFileSync(
    "git",
    ["show", `${reviewTarget}:${manifestPath}`],
    { cwd: repositoryRoot, encoding: null },
  );
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const correction = manifest.t5SourceIntegration.domMethodCorrection;
  const expectedPaths = [
    "tests/pcm-owner-first-public-home.test.mjs",
    "docs/governance/pcm-owner-first-execution-manifest.v1.json",
    "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
    "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  ].sort();

  assert.equal(
    correction.reviewTarget,
    "CORRECTION_COMMIT_CONTAINING_THIS_MANIFEST",
  );
  assert.equal(correction.correctionParent, "b64238044b480e5570ef99dbc7a807e59b893b6e");
  assert.equal(gitText("rev-parse", `${reviewTarget}^`), correction.correctionParent);
  assert.deepEqual([...correction.writeSet].sort(), expectedPaths);
  assert.equal(correction.outsideWriteSet, 0);
  const changedPaths = gitText(
    "diff",
    "--name-only",
    `${correction.correctionParent}..${reviewTarget}`,
  ).split(/\r?\n/u).filter(Boolean).sort();
  assert.deepEqual(changedPaths, expectedPaths);
  assert.deepEqual(correction.red, {
    command:
      "node --test --test-name-pattern='T5 DOM-method correction receipts' tests/pcm-owner-first-public-home.test.mjs",
    tests: 1,
    passed: 0,
    failed: 1,
    exitCode: 1,
    actualFailure:
      "receipt verifier read mutable checkout bytes and lacked immutable review-target provenance",
  });
  assert.deepEqual(correction.focusedGreen, {
    command:
      "node --test tests/pcm-owner-first-route-manifest.test.mjs tests/pcm-owner-first-public-home.test.mjs",
    tests: 36,
    passed: 36,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.fullSuite, {
    command: "fresh enumeration of tests/pcm-*.test.mjs",
    files: 13,
    tests: 243,
    passed: 243,
    failed: 0,
    exitCode: 0,
  });

  assert.deepEqual(
    correction.artifactReceipts.map((receipt) => receipt.path).sort(),
    expectedPaths.filter((path) => path !== manifestPath),
  );

  const verifyImmutableReceipt = (receipt) => {
    assert.equal(receipt.scope, "review_target_commit_blob_bytes", receipt.path);
    assert.doesNotThrow(() => execFileSync(
      "git",
      ["cat-file", "-e", `${receipt.gitBlobSha1}^{blob}`],
      { cwd: repositoryRoot, stdio: "pipe" },
    ));
    const commitBlob = gitText("rev-parse", `${reviewTarget}:${receipt.path}`);
    assert.equal(commitBlob, receipt.gitBlobSha1, receipt.path);
    const bytes = execFileSync("git", ["cat-file", "blob", receipt.gitBlobSha1], {
      cwd: repositoryRoot,
      encoding: null,
    });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const gitBlobSha1 = createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex");
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, sha256, receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1, receipt.path);
    return bytes;
  };

  for (const receipt of correction.artifactReceipts) {
    const immutableBytes = verifyImmutableReceipt(receipt);
    const inMemoryDrift = Buffer.concat([
      immutableBytes,
      Buffer.from("\nMUTABLE_CHECKOUT_DRIFT", "utf8"),
    ]);
    assert.notEqual(
      createHash("sha256").update(inMemoryDrift).digest("hex"),
      receipt.sha256,
      receipt.path,
    );
    assert.deepEqual(verifyImmutableReceipt(receipt), immutableBytes, receipt.path);
  }

  const firstReceipt = correction.artifactReceipts[0];
  const secondReceipt = correction.artifactReceipts[1];
  assert.throws(
    () => verifyImmutableReceipt({
      ...firstReceipt,
      gitBlobSha1: secondReceipt.gitBlobSha1,
    }),
    { name: "AssertionError" },
  );
  assert.throws(
    () => verifyImmutableReceipt({
      ...firstReceipt,
      gitBlobSha1: "f".repeat(40),
    }),
  );

  const normalized = JSON.parse(manifestBytes.toString("utf8"));
  normalized.t3.selfRecorderReceipt.sha256 = "0".repeat(64);
  normalized.t3.selfRecorderReceipt.gitBlobSha1 = "0".repeat(40);
  const normalizedBytes = Buffer.from(`${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  const selfReceipt = manifest.t3.selfRecorderReceipt;
  assert.equal(selfReceipt.bytes, manifestBytes.length);
  assert.equal(selfReceipt.normalizedBytes, normalizedBytes.length);
  assert.equal(
    selfReceipt.sha256,
    createHash("sha256").update(normalizedBytes).digest("hex"),
  );
  assert.equal(
    selfReceipt.gitBlobSha1,
    createHash("sha1")
      .update(`blob ${normalizedBytes.length}\0`)
      .update(normalizedBytes)
      .digest("hex"),
  );
});

test("T2 evidence distinguishes current exact-five writes from the authorized historical hold", async () => {
  const manifest = JSON.parse(await readFile(governanceUrl, "utf8"));

  assert.equal(manifest.t2.outsideWriteSet, 0);
  assert.equal(manifest.t2.outsideWriteSetScope, "current_repository_git_diff_only");
  assert.equal(manifest.t2.recovery.currentWrite, false);
  assert.equal(manifest.t2.recovery.classification, "authorized_historical_external_hold");
});

test("T2 correction evidence is bound to its immutable admitted commit", async () => {
  const manifest = JSON.parse(await readFile(governanceUrl, "utf8"));
  const plan = await readFile(planUrl, "utf8");
  const expectedPaths = [
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html",
    "tests/pcm-owner-first-public-home.test.mjs",
    "docs/governance/pcm-owner-first-execution-manifest.v1.json",
    "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  ].sort();
  const correction = manifest.t2Correction;

  assert.equal(correction.status, "admitted_g1_ui_source_only_historical");
  assert.equal(correction.commit, "3c525bb6625e8a6a8c30fecc1f9b7f506f313ad7");
  assert.equal(correction.tree, "44ab599c45d6f167cb171846e345761f75fe0937");
  assert.equal(correction.parent, "ba22b765c727732b774a60259f111ac6a361f941");
  const repositoryRoot = new URL("../", import.meta.url);
  const gitText = (...args) => execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  assert.equal(gitText("rev-parse", `${correction.commit}^`), correction.parent);
  assert.equal(gitText("show", "-s", "--format=%T", correction.commit), correction.tree);
  assert.equal(
    gitText("show", "-s", "--format=%T", correction.parent),
    correction.parentTree,
  );
  assert.deepEqual([...correction.writeSet].sort(), expectedPaths);
  assert.equal(correction.outsideWriteSet, 0);
  assert.ok(correction.tdd.red.failed > 0);
  assert.equal(correction.tdd.red.exitCode, 1);
  assert.equal(correction.tdd.green.failed, 0);
  assert.equal(correction.tdd.green.exitCode, 0);

  const receipts = [
    ...correction.artifactReceipts,
    correction.selfRecorderReceipt,
  ];
  assert.deepEqual(receipts.map((receipt) => receipt.path).sort(), expectedPaths);
  assert.equal(correction.receiptConvention.artifactScope, "immutable_t2_commit_blobs");
  assert.equal(correction.receiptConvention.immutableCommit, correction.commit);
  const expectedBlobs = new Map([
    ["src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js", "6f016dbe23c4da7ac2496c90e4e34edb4305f25e"],
    ["src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html", "ff81381c3ae98bbbd3fb3e5934f2c232e025a696"],
    ["tests/pcm-owner-first-public-home.test.mjs", "a926130d0dda76387d2e39c8b94948e146eeccc0"],
    ["docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md", "5a799ee533d4d624ab0ef03f70933dddb2b195aa"],
  ]);
  for (const receipt of correction.artifactReceipts) {
    const bytes = execFileSync("git", ["show", `${correction.commit}:${receipt.path}`], {
      cwd: repositoryRoot,
      encoding: null,
    });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const gitBlobSha1 = createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex");
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, sha256, receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1, receipt.path);
    assert.equal(receipt.gitBlobSha1, expectedBlobs.get(receipt.path), receipt.path);
    assert.equal(receipt.scope, "immutable_t2_commit_blob");
  }
  assert.equal(correction.selfRecorderReceipt.scope, "immutable_t2_commit_manifest_snapshot");
  const historicalManifestBytes = execFileSync(
    "git",
    ["show", `${correction.commit}:${correction.selfRecorderReceipt.path}`],
    { cwd: repositoryRoot, encoding: null },
  );
  const historicalManifest = JSON.parse(historicalManifestBytes.toString("utf8"));
  historicalManifest.t2Correction.selfRecorderReceipt.sha256 = "0".repeat(64);
  historicalManifest.t2Correction.selfRecorderReceipt.gitBlobSha1 = "0".repeat(40);
  const normalizedHistoricalBytes = Buffer.from(
    `${JSON.stringify(historicalManifest, null, 2)}\n`,
    "utf8",
  );
  assert.equal(correction.selfRecorderReceipt.bytes, historicalManifestBytes.length);
  assert.equal(
    correction.selfRecorderReceipt.normalizedBytes,
    normalizedHistoricalBytes.length,
  );
  assert.equal(
    correction.selfRecorderReceipt.sha256,
    createHash("sha256").update(normalizedHistoricalBytes).digest("hex"),
  );
  assert.equal(
    correction.selfRecorderReceipt.gitBlobSha1,
    createHash("sha1")
      .update(`blob ${normalizedHistoricalBytes.length}\0`)
      .update(normalizedHistoricalBytes)
      .digest("hex"),
  );
  assert.equal(
    correction.selfRecorderReceipt.snapshotGitBlobSha1,
    "26add6c71469cd15aaa7de7233a90396b32e021a",
  );

  const t2Plan = plan.match(/### Task T2:[\s\S]*?(?=\n---)/)?.[0] ?? "";
  assert.doesNotMatch(t2Plan, /Exact proposed write set|\- \[ \]/);
  assert.match(t2Plan, /Actual bounded correction write set/);
  for (const path of expectedPaths) {
    assert.match(t2Plan, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.deepEqual(correction.freshVerification.focused, {
    tests: 16,
    passed: 16,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.homepagePair, {
    tests: 38,
    passed: 38,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.currentTrain, {
    files: 9,
    tests: 132,
    passed: 132,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.fullSuiteTruth, {
    files: 10,
    tests: 153,
    passed: 152,
    failed: 1,
    exitCode: 1,
    onlyFailure:
      "tests/pcm-governance-pages.test.mjs frozen A3 cumulative-path admission assertion",
  });
  assert.match(t2Plan, /152\/153[\s\S]*frozen A3 cumulative-path/);
});

test("fee, boundaries, final actions, local links, and accessible control floors remain truthful", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const visibleMarkup = html.replace(/<template\b[\s\S]*?<\/template>/gi, "");
  const visibleText = visibleMarkup.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");

  assert.match(html, /費用以正式 PCM 服務契約所載版本為準/);
  assert.doesNotMatch(visibleText, /canonical/i);
  assert.match(
    visibleText,
    /PCM 僅提供文件審查與決策整理；甲乙方工程款安排不屬於本服務/,
  );
  assert.doesNotMatch(
    visibleMarkup,
    /代收|不託管|付款授權|金流託管|代收代付|付款保障/,
  );
  assert.match(html, /PCM 協助核對與整理，不取代甲方作最後決定/);
  assert.match(html, /不取代設計師、統包或施工單位履行專業責任/);
  assert.match(html, /正式權利義務以服務契約為準/);
  assert.match(html, /id="final-action"[\s\S]*查看申請與文件準備[\s\S]*閱讀 PCM 服務契約/);
  assert.match(html, /\.\.\/shared\/owner-first-shell\.css/);
  const entryMinimum = css.match(
    /\.entry-choice\s*\{[^}]*min-height:\s*(\d+)px/,
  );
  assert.ok(Number(entryMinimum?.[1]) >= 44);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
  assert.match(css, /@media\s*\(max-width:\s*420px\)/);

  for (const href of [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])) {
    if (href.startsWith("#")) {
      assert.match(html, new RegExp(`id="${href.slice(1)}"`));
      continue;
    }
    await access(new URL(href.split("#")[0], htmlUrl));
  }
});
