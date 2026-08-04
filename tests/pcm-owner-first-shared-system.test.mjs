import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const sharedRoot = new URL(
  "src/stitch_laibe_landing_onboarding/pcm_standalone/shared/",
  repositoryRoot,
);
const tokensUrl = new URL("owner-first-tokens.css", sharedRoot);
const shellUrl = new URL("owner-first-shell.css", sharedRoot);
const stateUrl = new URL("owner-first-state.js", sharedRoot);

test("shared tokens preserve the restrained LaiBE visual language", async () => {
  const css = await readFile(tokensUrl, "utf8");

  for (const token of [
    "--owner-first-bg",
    "--owner-first-surface",
    "--owner-first-text",
    "--owner-first-muted",
    "--owner-first-primary",
    "--owner-first-secondary",
    "--owner-first-control-min",
    "--owner-first-focus",
  ]) {
    assert.match(css, new RegExp(`${token}\\s*:`));
  }
  assert.match(css, /#ff711f/i);
  assert.match(css, /#ff4925/i);
  assert.match(css, /101,\s*216,\s*255/i);
  assert.match(css, /--owner-first-control-min:\s*44px/i);
  assert.doesNotMatch(css, /emoji|neon|bounce/i);
});

test("shared shell exposes the five-fact spine without card stacking", async () => {
  const css = await readFile(shellUrl, "utf8");

  assert.match(css, /owner-first-facts/);
  assert.match(css, /data-owner-fact/);
  assert.match(css, /owner-first-state/);
  assert.match(css, /owner-first-primary-action/);
  assert.match(css, /owner-first-secondary-action/);
  assert.match(css, /min-block-size:\s*var\(--owner-first-control-min\)/);
  assert.match(css, /max-inline-size:\s*100%/);
  assert.match(css, /min-inline-size:\s*0/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(css, /grid-template-columns:\s*repeat\(\s*5\s*,/);
});

test("shared shell covers focus, reduced motion, and 768/390 responsive floors", async () => {
  const css = await readFile(shellUrl, "utf8");

  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
  assert.match(css, /@media\s*\(max-width:\s*420px\)/);
  assert.match(css, /touch-action:\s*manipulation/);
});

test("state contract defines the five shared facts and approved closed states", async () => {
  const state = await import(`${stateUrl.href}?case=${Date.now()}`);

  assert.deepEqual(state.OWNER_FIRST_FACT_KEYS, [
    "role",
    "pcmContractStatus",
    "caseStatus",
    "nextResponsibility",
    "latestRecord",
  ]);
  assert.deepEqual(Object.keys(state.OWNER_FIRST_CLOSED_STATES), [
    "CONTEXT_UNAVAILABLE",
    "AUTH_REQUIRED",
    "ACCESS_DENIED",
    "PREREQUISITES_PENDING",
    "SERVICE_PREPARING",
    "PCM_EXITED_BILATERAL_CONTINUATION",
    "CASE_CLOSED_READ_ONLY",
  ]);

  for (const item of Object.values(state.OWNER_FIRST_CLOSED_STATES)) {
    assert.equal(item.type, item.code === "PCM_EXITED_BILATERAL_CONTINUATION" ? "CONTINUATION" : "CLOSED");
    assert.equal(item.mutationAllowed, false);
    assert.equal(Array.isArray(item.actions), true);
    assert.equal(item.actions.length, 0);
    assert.equal(Object.getPrototypeOf(item.actions), null);
    assert.equal(Object.hasOwn(item.actions, "0"), false);
    assert.deepEqual([...item.actions], []);
    assert.equal(typeof item.title, "string");
    assert.equal(typeof item.reason, "string");
    assert.equal(typeof item.nextAction, "string");
    assert.equal(typeof item.responsibleRole, "string");
    assert.equal(typeof item.recoveryLabel, "string");
    assert.equal(Object.isFrozen(item), true);
  }
});

test("shared zero-authority actions and resolver resist post-load prototype pollution", async () => {
  const state = await import(`${stateUrl.href}?pollution=${Date.now()}`);
  const originalIndex = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  const originalIterator = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator);
  const originalGetPrototypeOf = Object.getPrototypeOf;
  const originalDescriptor = Object.getOwnPropertyDescriptor;
  try {
    Object.defineProperty(Array.prototype, "0", { configurable: true, value: { authority: "forged" } });
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      configurable: true,
      value: function* forgedIterator() { yield { authority: "forged" }; },
    });
    Object.getPrototypeOf = () => { throw new Error("poisoned getPrototypeOf"); };
    Object.getOwnPropertyDescriptor = () => { throw new Error("poisoned descriptor"); };
    const continuation = state.resolveOwnerFirstState({ code: "PCM_EXITED_BILATERAL_CONTINUATION" });
    const unknown = state.resolveOwnerFirstState({ code: "UNKNOWN" });
    assert.equal(continuation.code, "PCM_EXITED_BILATERAL_CONTINUATION");
    assert.equal(continuation.actions[0], undefined);
    assert.deepEqual([...continuation.actions], []);
    assert.equal(unknown.code, "CONTEXT_UNAVAILABLE");
  } finally {
    if (originalIndex) Object.defineProperty(Array.prototype, "0", originalIndex);
    else delete Array.prototype[0];
    if (originalIterator) Object.defineProperty(Array.prototype, Symbol.iterator, originalIterator);
    else delete Array.prototype[Symbol.iterator];
    Object.getPrototypeOf = originalGetPrototypeOf;
    Object.getOwnPropertyDescriptor = originalDescriptor;
  }
});

test("loading, empty, error, and recovery use product language", async () => {
  const state = await import(`${stateUrl.href}?view=${Date.now()}`);

  assert.deepEqual(Object.keys(state.OWNER_FIRST_VIEW_STATES), [
    "loading",
    "empty",
    "error",
    "recovery",
  ]);
  const visibleCopy = JSON.stringify(state.OWNER_FIRST_VIEW_STATES);
  assert.match(visibleCopy, /正在確認|尚無|無法|返回/);
  assert.doesNotMatch(
    visibleCopy,
    /\b(?:DB|API|mock|debug|runtime)\b|source clean|raw json|stack trace/i,
  );
});

test("unknown and caller-asserted context always returns zero-case-data recovery", async () => {
  const { resolveOwnerFirstState } = await import(`${stateUrl.href}?closed=${Date.now()}`);
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const inputs = [
    undefined,
    null,
    true,
    "AUTH_REQUIRED",
    [],
    new URL("https://example.invalid/?state=ACCESS_DENIED"),
    { code: "UNKNOWN", authorized: true, payload: { caseId: "caller-value" } },
    { code: "toString" },
    { code: "constructor" },
    { code: "__proto__" },
    Object.create({ code: "PCM_EXITED_BILATERAL_CONTINUATION" }),
    new Proxy({}, { getPrototypeOf() { throw new Error("do not trust reflection"); } }),
    revoked.proxy,
  ];

  for (const input of inputs) {
    const result = resolveOwnerFirstState(input);
    assert.equal(result.code, "CONTEXT_UNAVAILABLE");
    assert.equal(result.payloadPolicy, "ZERO_CASE_DATA");
    assert.equal(result.mutationAllowed, false);
    assert.equal(result.actions.length, 0);
    assert.equal(Object.getPrototypeOf(result.actions), null);
    assert.equal(Object.hasOwn(result.actions, Symbol.iterator), true);
    assert.equal("payload" in result, false);
    assert.equal("caseData" in result, false);
  }
});

test("PCM exit preserves bilateral work while case close remains authorized read-only", async () => {
  const { resolveOwnerFirstState } = await import(`${stateUrl.href}?readonly=${Date.now()}`);

  const continuation = resolveOwnerFirstState({ code: "PCM_EXITED_BILATERAL_CONTINUATION" });
  assert.equal(continuation.payloadPolicy, "PRESERVE_BILATERAL_CASE_CONTINUATION");
  assert.equal(continuation.caseMode, "BILATERAL_CONTINUATION");
  assert.equal(continuation.pcmMode, "HISTORICAL_READ_ONLY");
  assert.equal(continuation.caseClosed, false);
  assert.equal(continuation.caseArchived, false);
  assert.equal(continuation.newPcmOperationsAllowed, false);
  assert.equal(continuation.rejoinRequiresNewAuthorization, true);
  assert.deepEqual([...continuation.preserveResources], [
    "workspaces", "contract", "documents", "messages", "schedules",
    "evidence", "acceptance", "changes", "addenda", "caseRecords",
  ]);
  assert.deepEqual([...continuation.workspaceRoutes], ["ownerWorkspace", "vendorWorkspace"]);

  const closed = resolveOwnerFirstState({ code: "CASE_CLOSED_READ_ONLY" });
  assert.equal(closed.payloadPolicy, "PRESERVE_AUTHORIZED_EXISTING_CONTENT");
  assert.equal(closed.mutationAllowed, false);
  assert.deepEqual([...closed.workspaceRoutes], ["ownerWorkspace", "vendorWorkspace"]);
});

test("shared implementation excludes the deprecated standalone archive state", async () => {
  const source = await Promise.all([
    readFile(tokensUrl, "utf8"),
    readFile(shellUrl, "utf8"),
    readFile(stateUrl, "utf8"),
  ]);
  const deprecatedState = ["ARCHIVED", "READ", "ONLY"].join("_");
  assert.doesNotMatch(source.join("\n"), new RegExp(`\\b${deprecatedState}\\b`));
  assert.doesNotMatch(source.join("\n"), /\bPCM_EXITED_READ_ONLY\b/);
});
