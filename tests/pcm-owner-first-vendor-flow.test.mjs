import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const pcmRoot = path.join(
  repositoryRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "pcm_standalone",
);
const accountAccessDir = path.join(pcmRoot, "account_access");
const invitationDir = path.join(pcmRoot, "vendor_invitation");
const workspaceDir = path.join(pcmRoot, "vendor_workspace");
const vendorWorkspacePreviewHarnessPath = path.join(
  repositoryRoot,
  "tests",
  "manual",
  "vendor-workspace-authorized-preview.html",
);
const pcmRouteManifestPath = path.join(
  pcmRoot,
  "public",
  "pcm-flow-route-manifest.js",
);
const expectedPackageFiles = Object.freeze(["app.js", "code.html", "styles.css"]);

const invitationCodes = Object.freeze([
  "INVITATION_PENDING",
  "DECLINED",
  "EXPIRED",
  "WITHDRAWN",
  "RESENT_PENDING",
  "ACCEPTANCE_PENDING_MEMBERSHIP",
  "MEMBERSHIP_UNCONFIRMED",
  "AUTHORIZED_VENDOR_WORKSPACE",
  "CONTEXT_UNAVAILABLE",
]);

const workspaceCodes = Object.freeze([
  "CONTEXT_UNAVAILABLE",
  "MEMBERSHIP_UNCONFIRMED",
  "AUTHORIZED_VENDOR_WORKSPACE",
  "PCM_EXITED_BILATERAL_CONTINUATION",
  "CASE_CLOSED_READ_ONLY",
  "CANCELLED",
]);

const resourceCodes = Object.freeze([
  "CONTRACT_DRAFT_VERSIONS",
  "ATTACHMENTS",
  "PUBLIC_PCM_REVIEWS",
  "SUPPLEMENTS",
  "SCHEDULES",
  "EVIDENCE",
  "ACCEPTANCE",
  "CHANGES",
  "ADDENDA",
  "CASE_RECORDS",
]);

function pagePath(directory, fileName) {
  return path.join(directory, fileName);
}

function moduleUrl(directory, marker) {
  return `${pathToFileURL(pagePath(directory, "app.js")).href}?${marker}=${Date.now()}`;
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#\d+);/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function vendorAuthorizedTemplate(html) {
  return html.match(
    /<template\s+id="vendor-authorized-workspace-template">([\s\S]*?)<\/template>/u,
  )?.[1] ?? "";
}

function vendorPublicMarkup(html) {
  return html.replace(
    /<template\s+id="vendor-authorized-workspace-template">[\s\S]*?<\/template>/u,
    "",
  );
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function splitCssTopLevel(source, delimiter) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (character === delimiter && depth === 0) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(source.slice(start).trim());
  return parts.filter(Boolean);
}

function cssMediaMatches(prelude, viewportWidth) {
  if (/prefers-/u.test(prelude)) return false;
  for (const match of prelude.matchAll(/max-width:\s*(\d+(?:\.\d+)?)px/gu)) {
    if (viewportWidth > Number(match[1])) return false;
  }
  for (const match of prelude.matchAll(/min-width:\s*(\d+(?:\.\d+)?)px/gu)) {
    if (viewportWidth < Number(match[1])) return false;
  }
  return /(?:min|max)-width/u.test(prelude);
}

function parseCssDeclarations(block) {
  const declarations = [];
  for (const part of splitCssTopLevel(block, ";")) {
    const colon = part.indexOf(":");
    if (colon < 1) continue;
    const property = part.slice(0, colon).trim();
    let value = part.slice(colon + 1).trim();
    const important = /!important\s*$/u.test(value);
    if (important) value = value.replace(/!important\s*$/u, "").trim();
    declarations.push({ property, value, important });
  }
  return declarations;
}

function cssSpecificity(selector) {
  const ids = selector.match(/#[a-z0-9_-]+/giu)?.length ?? 0;
  const classes = selector.match(/\.[a-z0-9_-]+|\[[^\]]+\]|:(?!:)[a-z0-9_-]+/giu)?.length ?? 0;
  const elements = selector
    .split(/\s+/u)
    .filter((part) => /^[a-z][a-z0-9-]*/iu.test(part))
    .length;
  return [ids, classes, elements];
}

function collectCssCascadeRules(css, viewportWidth, rules, order) {
  const source = css.replace(/\/\*[\s\S]*?\*\//gu, "");
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf("{", index);
    if (open < 0) break;
    const prelude = source.slice(index, open).trim();
    let depth = 1;
    let quote = null;
    let close = open + 1;
    for (; close < source.length && depth > 0; close += 1) {
      const character = source[close];
      if (quote) {
        if (character === "\\") close += 1;
        else if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
      }
    }
    const block = source.slice(open + 1, close - 1);
    index = close;
    if (prelude.startsWith("@media")) {
      if (cssMediaMatches(prelude, viewportWidth)) {
        collectCssCascadeRules(block, viewportWidth, rules, order);
      }
      continue;
    }
    if (!prelude || prelude.startsWith("@")) continue;
    const declarations = parseCssDeclarations(block);
    for (const selector of splitCssTopLevel(prelude, ",")) {
      rules.push({ selector, declarations, specificity: cssSpecificity(selector), order: order.value++ });
    }
  }
}

function cssNode(tag, { classes = [], attributes = {}, parent = null, isRoot = false } = {}) {
  return { tag, classes: new Set(classes), attributes, parent, isRoot };
}

function matchesSimpleCssSelector(element, simpleSelector) {
  if (!element || /[>+~]|::/u.test(simpleSelector)) return false;
  let remainder = simpleSelector;
  if (remainder.includes(":root")) {
    if (!element.isRoot) return false;
    remainder = remainder.replaceAll(":root", "");
  }
  if (/:(?!:)/u.test(remainder)) return false;
  const tag = remainder.match(/^[a-z][a-z0-9-]*/iu)?.[0];
  if (tag && tag.toLowerCase() !== element.tag.toLowerCase()) return false;
  for (const match of remainder.matchAll(/\.([a-z0-9_-]+)/giu)) {
    if (!element.classes.has(match[1])) return false;
  }
  for (const match of remainder.matchAll(/\[([a-z0-9_-]+)(?:=(["']?)([^\]"']+)\2)?\]/giu)) {
    if (!Object.hasOwn(element.attributes, match[1])) return false;
    if (match[3] !== undefined && String(element.attributes[match[1]]) !== match[3]) return false;
  }
  const unparsed = remainder
    .replace(/^[a-z][a-z0-9-]*/iu, "")
    .replace(/^\*/u, "")
    .replace(/\.[a-z0-9_-]+/giu, "")
    .replace(/\[[^\]]+\]/gu, "")
    .trim();
  return unparsed === "";
}

function matchesCssSelector(element, selector) {
  const parts = selector.trim().split(/\s+/u);
  let candidate = element;
  if (!matchesSimpleCssSelector(candidate, parts.at(-1))) return false;
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    candidate = candidate.parent;
    while (candidate && !matchesSimpleCssSelector(candidate, parts[index])) {
      candidate = candidate.parent;
    }
    if (!candidate) return false;
  }
  return true;
}

function compareCssPriority(left, right) {
  if (left.important !== right.important) return left.important ? 1 : -1;
  for (let index = 0; index < 3; index += 1) {
    if (left.specificity[index] !== right.specificity[index]) {
      return left.specificity[index] > right.specificity[index] ? 1 : -1;
    }
  }
  return left.order > right.order ? 1 : -1;
}

function computedCssStyle(element, rules, cache = new Map()) {
  if (cache.has(element)) return cache.get(element);
  const inherited = element.parent ? computedCssStyle(element.parent, rules, cache) : {};
  const style = {};
  for (const [property, value] of Object.entries(inherited)) {
    if (property.startsWith("--") || property === "visibility") style[property] = value;
  }
  const winners = new Map();
  for (const rule of rules) {
    if (!matchesCssSelector(element, rule.selector)) continue;
    for (let index = 0; index < rule.declarations.length; index += 1) {
      const declaration = rule.declarations[index];
      const candidate = {
        ...declaration,
        specificity: rule.specificity,
        order: rule.order * 1000 + index,
      };
      const current = winners.get(declaration.property);
      if (!current || compareCssPriority(candidate, current) > 0) {
        winners.set(declaration.property, candidate);
      }
    }
  }
  for (const [property, winner] of winners) style[property] = winner.value;
  cache.set(element, style);
  return style;
}

function defaultCssDisplay(tag) {
  return /^(?:span|strong|small|a|img)$/u.test(tag) ? "inline" : "block";
}

function effectiveCssVisibility(element, rules, cache) {
  for (let current = element; current; current = current.parent) {
    const style = computedCssStyle(current, rules, cache);
    if ((style.display ?? defaultCssDisplay(current.tag)) === "none") return false;
    if (["hidden", "collapse"].includes(style.visibility ?? "visible")) return false;
  }
  return true;
}

function resolveCssVariables(value, style) {
  let resolved = value;
  for (let index = 0; index < 8 && /var\(/u.test(resolved); index += 1) {
    resolved = resolved.replace(/var\((--[a-z0-9_-]+)(?:,\s*([^)]*))?\)/giu, (_, property, fallback) => (
      style[property] ?? fallback ?? ""
    ));
  }
  return resolved.trim();
}

function cssLengthToPixels(value, { viewportWidth, containingWidth, style }) {
  const resolved = resolveCssVariables(value ?? "0", style);
  const argumentsFor = (name) => splitCssTopLevel(resolved.slice(name.length + 1, -1), ",");
  if (/^-?\d+(?:\.\d+)?px$/u.test(resolved)) return Number.parseFloat(resolved);
  if (/^-?\d+(?:\.\d+)?vw$/u.test(resolved)) return Number.parseFloat(resolved) * viewportWidth / 100;
  if (/^-?\d+(?:\.\d+)?%$/u.test(resolved)) return Number.parseFloat(resolved) * containingWidth / 100;
  if (resolved === "0") return 0;
  if (resolved.startsWith("calc(") && resolved.endsWith(")")) {
    const expression = resolved.slice(5, -1).match(/^(.+?)\s*([+-])\s*(.+)$/u);
    assert.ok(expression, `unsupported calc length: ${resolved}`);
    const left = cssLengthToPixels(expression[1], { viewportWidth, containingWidth, style });
    const right = cssLengthToPixels(expression[3], { viewportWidth, containingWidth, style });
    return expression[2] === "+" ? left + right : left - right;
  }
  if (resolved.startsWith("min(") && resolved.endsWith(")")) {
    return Math.min(...argumentsFor("min").map((part) => cssLengthToPixels(part, { viewportWidth, containingWidth, style })));
  }
  if (resolved.startsWith("clamp(") && resolved.endsWith(")")) {
    const [minimum, preferred, maximum] = argumentsFor("clamp")
      .map((part) => cssLengthToPixels(part, { viewportWidth, containingWidth, style }));
    return Math.min(Math.max(preferred, minimum), maximum);
  }
  throw new Error(`unsupported CSS length: ${resolved}`);
}

function vendorWorkspacePanel(html, kind) {
  const start = html.indexOf(`data-vendor-workspace-panel="${kind}"`);
  if (start < 0) return "";
  if (kind === "construction") return html.slice(start);
  const end = html.indexOf('data-vendor-workspace-panel="construction"', start);
  return end > start ? html.slice(start, end) : "";
}

function restoreDescriptor(target, key, descriptor) {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
  } else {
    delete target[key];
  }
}

function assertFrozenNullRecord(record, label) {
  assert.equal(Object.getPrototypeOf(record), null, `${label} prototype`);
  assert.equal(Object.isFrozen(record), true, `${label} frozen`);
  for (const key of Object.keys(record)) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    assert.ok(descriptor, `${label}.${key} own descriptor`);
    assert.equal("value" in descriptor, true, `${label}.${key} own data`);
  }
}

function ownListValues(list, label) {
  assert.equal(Object.getPrototypeOf(list), null, `${label} prototype`);
  assert.equal(Object.isFrozen(list), true, `${label} frozen`);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(list, "length");
  assert.ok(lengthDescriptor && "value" in lengthDescriptor, `${label}.length own data`);
  const values = [];
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(list, String(index));
    assert.ok(descriptor && "value" in descriptor, `${label}[${index}] own data`);
    values.push(descriptor.value);
  }
  return values;
}

async function assertLocalReferences(directory) {
  const html = await readFile(pagePath(directory, "code.html"), "utf8");
  const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/giu)]
    .map((match) => match[1]);
  for (const reference of references) {
    assert.doesNotMatch(reference, /^(?:https?:)?\/\//iu, reference);
    const [relativeUrl, fragment] = reference.split("#");
    const [relativePath] = relativeUrl.split("?");
    if (!relativePath) {
      assert.match(html, new RegExp(`id=["']${fragment}["']`, "u"), reference);
      continue;
    }
    const target = path.resolve(directory, relativePath);
    await access(target);
    if (fragment) {
      const targetHtml = await readFile(target, "utf8");
      assert.match(targetHtml, new RegExp(`id=["']${fragment}["']`, "u"), reference);
    }
  }
}

test("vendor invitation and workspace are exact local three-file packages", async () => {
  for (const directory of [invitationDir, workspaceDir]) {
    const entries = await readdir(directory, { withFileTypes: true });
    assert.deepEqual(
      entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort(),
      expectedPackageFiles,
      directory,
    );
    assert.equal(entries.some((entry) => entry.isDirectory()), false, directory);
  }
});

test("both first folds state role contract case responsibility record and one primary action", async () => {
  const [invitationHtml, workspaceHtml] = await Promise.all([
    readFile(pagePath(invitationDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
  ]);
  const invitationFold = invitationHtml.slice(0, invitationHtml.indexOf('id="invitation-details"'));
  const workspaceFold = vendorPublicMarkup(workspaceHtml);

  assert.match(invitationFold, /角色/u);
  assert.match(invitationFold, /契約狀態/u);
  assert.match(invitationFold, /案件狀態/u);
  assert.match(invitationFold, /下一步[／/]責任人/u);
  assert.match(invitationFold, /最近紀錄/u);
  assert.equal(count(invitationFold, /\bdata-primary-action\b/gu), 1);
  assert.match(invitationFold, /尚未(?:顯示|取得)案件資料/u);
  assert.match(invitationFold, /尚無可顯示(?:的案件)?紀錄/u);

  assert.match(workspaceFold, /尚未確認案件授權/u);
  assert.match(workspaceFold, /下一步/u);
  assert.match(workspaceFold, /責任人/u);
  assert.match(workspaceFold, /會留下的紀錄/u);
  assert.equal(count(workspaceFold, /\bdata-primary-action\b/gu), 1);
  assert.match(workspaceFold, /受邀乙方｜設計師／統包/u);
  assert.match(workspaceFold, /身分與案件範圍尚待確認/u);
  assert.doesNotMatch(workspaceFold, /契約狀態|案件名稱/u);

  assert.match(invitationFold, /受邀乙方/u);
  assert.match(invitationFold, /href="\.\.\/account_access\/code\.html"/u);
  assert.match(invitationFold, /data-canonical-route="\/account\/access"/u);
  assert.doesNotMatch(workspaceFold, /href="\.\.\/(?:vendor_invitation|account_access)\/code\.html/u);
  assert.match(workspaceFold, /data-vendor-access-recovery/u);
  assert.match(workspaceFold, /data-canonical-link="vendorWorkspaceAccessRecoveryToAccountAccess"/u);
});

test("every invitation outcome explains reason next responsible return and recovery", async () => {
  const html = await readFile(pagePath(invitationDir, "code.html"), "utf8");
  for (const code of invitationCodes) {
    const block = html.match(
      new RegExp(`<details[^>]*data-state-code=["']${code}["'][\\s\\S]*?<\\/details>`, "u"),
    )?.[0];
    assert.ok(block, code);
    for (const label of ["原因", "下一步", "責任人", "返回位置", "恢復方式"]) {
      assert.match(block, new RegExp(label, "u"), `${code}:${label}`);
    }
  }
});

test("invitation runtime exports immutable canonical states actions and transitions", async () => {
  const runtime = await import(moduleUrl(invitationDir, "canonical"));
  assertFrozenNullRecord(runtime.INVITATION_STATES, "INVITATION_STATES");
  assert.deepEqual(Object.keys(runtime.INVITATION_STATES), invitationCodes);

  for (const code of invitationCodes) {
    const state = runtime.INVITATION_STATES[code];
    assertFrozenNullRecord(state, code);
    assert.equal(state.code, code);
    assert.equal(typeof state.reason, "string");
    assert.equal(typeof state.nextAction, "string");
    assert.equal(typeof state.responsible, "string");
    assert.equal(typeof state.returnPath, "string");
    assert.equal(typeof state.recovery, "string");
    assert.equal(state.caseData, null);
    assert.equal(state.payload, null);
    assert.equal(state.mutationAllowed, false);
    assert.equal(state.writeActionsEnabled, false);
    assert.deepEqual(ownListValues(state.actions, `${code}.actions`), []);
  }

  assert.deepEqual(
    ownListValues(runtime.INVITATION_STATE_LIST, "INVITATION_STATE_LIST")
      .map((state) => state.code),
    invitationCodes,
  );
  assertFrozenNullRecord(runtime.INVITATION_EVENTS, "INVITATION_EVENTS");
  for (const event of Object.values(runtime.INVITATION_EVENTS)) {
    assertFrozenNullRecord(event, event.code);
    assert.equal(event.mutationAuthority, false);
  }
  for (const transition of ownListValues(runtime.INVITATION_TRANSITIONS, "INVITATION_TRANSITIONS")) {
    assertFrozenNullRecord(transition, `${transition.from}:${transition.event}`);
  }
});

test("invitation transitions close terminal stale duplicate and same-identity resend events", async () => {
  const runtime = await import(moduleUrl(invitationDir, "transitions"));
  const states = runtime.INVITATION_STATES;
  const events = runtime.INVITATION_EVENTS;
  const transition = runtime.previewInvitationTransition;

  assert.equal(transition(states.INVITATION_PENDING, events.ACCEPT), states.ACCEPTANCE_PENDING_MEMBERSHIP);
  assert.equal(transition(states.INVITATION_PENDING, events.DECLINE), states.DECLINED);
  assert.equal(transition(states.INVITATION_PENDING, events.EXPIRE), states.EXPIRED);
  assert.equal(transition(states.INVITATION_PENDING, events.WITHDRAW), states.WITHDRAWN);
  assert.equal(
    transition(states.ACCEPTANCE_PENDING_MEMBERSHIP, events.MEMBERSHIP_CONFIRMED),
    states.AUTHORIZED_VENDOR_WORKSPACE,
  );
  assert.equal(
    transition(states.ACCEPTANCE_PENDING_MEMBERSHIP, events.MEMBERSHIP_UNCONFIRMED),
    states.MEMBERSHIP_UNCONFIRMED,
  );

  for (const terminal of [states.DECLINED, states.EXPIRED, states.WITHDRAWN]) {
    assert.equal(transition(terminal, events.ACCEPT), terminal, terminal.code);
    assert.equal(transition(terminal, events.RESEND, "invite-1", "invite-1"), terminal, terminal.code);
    assert.equal(transition(terminal, events.RESEND, "invite-1"), terminal, terminal.code);
    assert.equal(
      transition(terminal, events.RESEND, "invite-1", "invite-2"),
      states.RESENT_PENDING,
      terminal.code,
    );
  }

  assert.equal(transition(states.RESENT_PENDING, events.ACCEPT), states.ACCEPTANCE_PENDING_MEMBERSHIP);
  assert.equal(
    transition(states.ACCEPTANCE_PENDING_MEMBERSHIP, events.ACCEPT),
    states.ACCEPTANCE_PENDING_MEMBERSHIP,
  );
  assert.equal(
    transition(states.AUTHORIZED_VENDOR_WORKSPACE, events.DECLINE),
    states.AUTHORIZED_VENDOR_WORKSPACE,
  );
});

test("unknown hostile invitation and workspace contexts are trap-zero zero-case-data", async () => {
  const [invitation, workspace] = await Promise.all([
    import(moduleUrl(invitationDir, "hostile")),
    import(moduleUrl(workspaceDir, "hostile")),
  ]);
  let getterCalls = 0;
  let trapCalls = 0;
  const accessor = Object.create(null);
  Object.defineProperty(accessor, "code", {
    get() {
      getterCalls += 1;
      throw new Error("must not read caller authority");
    },
  });
  const proxy = new Proxy({}, {
    get() {
      trapCalls += 1;
      throw new Error("must not get caller authority");
    },
    getOwnPropertyDescriptor() {
      trapCalls += 1;
      throw new Error("must not inspect caller authority");
    },
    getPrototypeOf() {
      trapCalls += 1;
      throw new Error("must not inspect caller prototype");
    },
    has() {
      trapCalls += 1;
      throw new Error("must not inspect caller membership");
    },
  });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const hostileInputs = [
    undefined,
    null,
    false,
    1,
    "AUTHORIZED_VENDOR_WORKSPACE",
    {},
    { code: "AUTHORIZED_VENDOR_WORKSPACE" },
    Object.create({ code: "AUTHORIZED_VENDOR_WORKSPACE" }),
    accessor,
    proxy,
    revoked.proxy,
  ];

  for (const input of hostileInputs) {
    assert.doesNotThrow(() => invitation.resolveInvitationContext(input));
    assert.equal(invitation.resolveInvitationContext(input), invitation.CONTEXT_UNAVAILABLE);
    assert.doesNotThrow(() => workspace.resolveVendorWorkspaceAccess(input));
    assert.equal(workspace.resolveVendorWorkspaceAccess(input), workspace.CONTEXT_UNAVAILABLE);
  }
  assert.equal(getterCalls, 0);
  assert.equal(trapCalls, 0);
  assert.equal(invitation.CONTEXT_UNAVAILABLE.protectedRouteAllowed, false);
  assert.equal(workspace.CONTEXT_UNAVAILABLE.protectedRouteAllowed, false);
});

test("post-load intrinsic pollution cannot inject actions transitions resources or authority", async () => {
  const [invitation, workspace] = await Promise.all([
    import(moduleUrl(invitationDir, "pollution")),
    import(moduleUrl(workspaceDir, "pollution")),
  ]);
  const arrayIndex = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  const arrayIterator = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator);
  const objectCode = Object.getOwnPropertyDescriptor(Object.prototype, "code");
  const stringTrim = Object.getOwnPropertyDescriptor(String.prototype, "trim");
  const reflectGet = Object.getOwnPropertyDescriptor(Reflect, "get");
  const injected = Object.freeze({ code: "INJECTED_WRITE", enabled: true });
  let observations;

  try {
    Object.defineProperty(Array.prototype, "0", { configurable: true, value: injected });
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      configurable: true,
      value: function* pollutedIterator() {
        yield injected;
      },
    });
    Object.defineProperty(Object.prototype, "code", {
      configurable: true,
      value: "AUTHORIZED_VENDOR_WORKSPACE",
    });
    Object.defineProperty(String.prototype, "trim", {
      configurable: true,
      value() {
        throw new Error("polluted trim");
      },
    });
    Object.defineProperty(Reflect, "get", {
      configurable: true,
      value() {
        throw new Error("polluted Reflect.get");
      },
    });

    observations = {
      invitationActions: [...invitation.CONTEXT_UNAVAILABLE.actions],
      invitationIndex: invitation.CONTEXT_UNAVAILABLE.actions[0],
      legacyWorkspaceStates: [...workspace.VENDOR_WORKSPACE_STATES],
      workspaceActions: [...workspace.VENDOR_WORKSPACE_ACTIONS],
      resources: [...workspace.VENDOR_WORKSPACE_RESOURCES].map((resource) => resource.code),
      invitationAuthority: invitation.resolveInvitationContext({}),
      workspaceAuthority: workspace.resolveVendorWorkspaceAccess({}),
      resend: invitation.previewInvitationTransition(
        invitation.INVITATION_STATES.DECLINED,
        invitation.INVITATION_EVENTS.RESEND,
        "invite-a",
        "invite-b",
      ),
    };
  } finally {
    restoreDescriptor(Array.prototype, "0", arrayIndex);
    restoreDescriptor(Array.prototype, Symbol.iterator, arrayIterator);
    restoreDescriptor(Object.prototype, "code", objectCode);
    restoreDescriptor(String.prototype, "trim", stringTrim);
    restoreDescriptor(Reflect, "get", reflectGet);
  }

  assert.deepEqual(observations.invitationActions, []);
  assert.equal(observations.invitationIndex, undefined);
  assert.deepEqual(observations.legacyWorkspaceStates, [
    "ACCESS_CHECKING",
    "ACCESS_DENIED",
    "CONTRACT_PENDING",
    "AUTHORIZED_EMPTY",
    "AUTHORIZED_READY",
    "CASE_ARCHIVED_READ_ONLY",
    "LOAD_FAILED_RETRYABLE",
  ]);
  assert.deepEqual(observations.workspaceActions, ownListValues(workspace.VENDOR_WORKSPACE_ACTIONS, "actions"));
  assert.deepEqual(observations.resources, resourceCodes);
  assert.equal(observations.invitationAuthority, invitation.CONTEXT_UNAVAILABLE);
  assert.equal(observations.workspaceAuthority, workspace.CONTEXT_UNAVAILABLE);
  assert.equal(observations.resend, invitation.INVITATION_STATES.RESENT_PENDING);
});

test("workspace exports exact ten resources and keeps terminal states in the original workspace", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "resources"));
  assertFrozenNullRecord(runtime.VENDOR_WORKSPACE_CANONICAL_STATES, "canonical states");
  assert.deepEqual(Object.keys(runtime.VENDOR_WORKSPACE_CANONICAL_STATES), workspaceCodes);
  assert.deepEqual(
    ownListValues(runtime.VENDOR_WORKSPACE_RESOURCES, "VENDOR_WORKSPACE_RESOURCES")
      .map((resource) => resource.code),
    resourceCodes,
  );
  for (const resource of ownListValues(runtime.VENDOR_WORKSPACE_RESOURCES, "resources")) {
    assertFrozenNullRecord(resource, resource.code);
    assert.equal(typeof resource.label, "string");
    assert.equal(resource.defaultWriteEnabled, false);
  }
  for (const action of ownListValues(runtime.VENDOR_WORKSPACE_ACTIONS, "VENDOR_WORKSPACE_ACTIONS")) {
    assertFrozenNullRecord(action, action.code);
    assert.equal(action.enabled, false);
    assert.equal(action.mutationAuthority, false);
  }

  for (const code of workspaceCodes) {
    const state = runtime.VENDOR_WORKSPACE_CANONICAL_STATES[code];
    assertFrozenNullRecord(state, code);
    assert.equal(typeof state.reason, "string");
    assert.equal(typeof state.nextAction, "string");
    assert.equal(typeof state.responsible, "string");
    assert.equal(typeof state.returnPath, "string");
    assert.equal(typeof state.recovery, "string");
    assert.equal(state.caseData, null);
    assert.equal(state.mutationAllowed, false);
  }

  const pcmExited = runtime.VENDOR_WORKSPACE_CANONICAL_STATES.PCM_EXITED_BILATERAL_CONTINUATION;
  assert.equal(pcmExited.caseMode, "BILATERAL_CONTINUATION");
  assert.equal(pcmExited.newPcmOperationsAllowed, false);
  assert.equal(pcmExited.historicalPcmDataMode, "READ_ONLY");
  assert.equal(pcmExited.rejoinRequiresNewAuthorization, true);
  assert.equal(pcmExited.preserveResources, runtime.VENDOR_WORKSPACE_RESOURCES);

  const closed = runtime.VENDOR_WORKSPACE_CANONICAL_STATES.CASE_CLOSED_READ_ONLY;
  const cancelled = runtime.VENDOR_WORKSPACE_CANONICAL_STATES.CANCELLED;
  assert.notEqual(closed, cancelled);
  assert.equal(closed.workspaceMode, "ORIGINAL_WORKSPACE_READ_ONLY");
  assert.equal(cancelled.workspaceMode, "ORIGINAL_WORKSPACE_READ_ONLY");
  assert.doesNotMatch(`${closed.title} ${cancelled.title}`, /封存工作台/u);
});

test("workspace copy preserves the contract attachment review and document-sharing boundaries", async () => {
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  for (const label of [
    "契約版本",
    "契約附件",
    "公開審查",
    "補件",
    "施工任務",
    "施工照片",
    "驗收",
    "追加減項",
    "附約",
    "案件紀錄",
  ]) {
    assert.match(html, new RegExp(label, "u"), label);
  }
  assert.equal(count(html, /\bdata-resource-code=/gu), 10);
  assert.match(html, /唯讀範本[^<]*不是本案已成立契約/u);
  assert.match(html, /尚未送出／尚未保存/u);
  assert.match(html, /另建可追溯版本，不改寫原契約/u);
  assert.match(html, /萊比公開審查意見（PCM）/u);
  assert.match(html, /data-vendor-document-share="CASE_RECORDS"/u);
  assert.doesNotMatch(html, /大型輸入|data-line-send/u);
});

test("vendor workspace transposes the professional shell into two accessible management areas", async () => {
  const [html, css, runtimeSource] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
    readFile(pagePath(workspaceDir, "app.js"), "utf8"),
  ]);

  assert.match(html, /class="vendor-workspace-tabs"[^>]*role="tablist"/u);
  for (const [kind, label] of [
    ["design", "設計管理"],
    ["construction", "工程管理"],
  ]) {
    assert.match(
      html,
      new RegExp(`id="vendor-workspace-tab-${kind}"[\\s\\S]*?role="tab"[\\s\\S]*?data-vendor-workspace-tab="${kind}"[\\s\\S]*?aria-controls="vendor-workspace-panel-${kind}"[\\s\\S]*?${label}`, "u"),
      kind,
    );
    assert.match(
      html,
      new RegExp(`class="vendor-workspace-panel"[\\s\\S]*?id="vendor-workspace-panel-${kind}"[\\s\\S]*?role="tabpanel"[\\s\\S]*?aria-labelledby="vendor-workspace-tab-${kind}"[\\s\\S]*?data-vendor-workspace-panel="${kind}"`, "u"),
      kind,
    );
  }
  assert.equal(count(html, /class="vendor-panel-facts"/gu), 2);
  assert.equal(count(html, /\bdata-resource-code=/gu), 10);
  assert.match(html, /class="[^"]*\bapp\b[^"]*\bvendor-workspace-shell\b/u);
  assert.match(html, /class="[^"]*\bcols\b[^"]*\bvendor-workspace-stage\b/u);
  assert.doesNotMatch(html, /data-vendor-workspace-tab="contract"/iu);
  const workspaceFrames = html.match(/<iframe\b[^>]*>/giu) ?? [];
  assert.equal(workspaceFrames.length, 0);
  assert.match(html, /data-vendor-calendar-live-events/iu);
  assert.match(html, /data-vendor-calendar-events/iu);
  assert.doesNotMatch(`${html}\n${css}\n${runtimeSource}`, /\bowner-[a-z0-9_-]+/iu);
  assert.doesNotMatch(html, /data-document-(?:tab|panel|file|dropzone)|document-file-|PDF[^<]*拖/u);
  assert.match(css, /\.vendor-workspace-tabs\s*\{/u);
  assert.match(css, /\.app\s*\{[\s\S]{0,260}grid-template-columns:\s*236px minmax\(0, 1fr\)/u);
  assert.match(css, /\.scase\s*\{[\s\S]{0,420}border-radius:\s*12px/u);
  assert.match(css, /\.scase\.on\s*\{[\s\S]{0,160}background:\s*#fff/u);
  assert.match(css, /\.vendor-workspace-panel\s*\{/u);
  assert.match(css, /\.vendor-panel-facts\s*\{/u);
  assert.match(css, /\.vendor-status-rail\s*\{/u);
});

test("vendor workspace preserves both management tabs while calendar and document sharing replace LINE", async () => {
  const [html, css, runtimeSource] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
    readFile(pagePath(workspaceDir, "app.js"), "utf8"),
  ]);
  const authorizedMarkup = vendorAuthorizedTemplate(html);

  assert.equal(count(authorizedMarkup, /\bdata-vendor-workspace-tab=/gu), 2);
  assert.match(authorizedMarkup, /data-vendor-workspace-tab="design"[\s\S]*設計管理/u);
  assert.match(authorizedMarkup, /data-vendor-workspace-tab="construction"[\s\S]*工程管理/u);
  assert.equal(count(authorizedMarkup, /\bdata-vendor-document-share=/gu), resourceCodes.length);
  for (const code of resourceCodes) {
    assert.match(authorizedMarkup, new RegExp(`data-vendor-document-share="${code}"`, "u"));
  }
  assert.match(authorizedMarkup, /class="[^"]*\bvendor-calendar-hero\b/u);
  assert.match(authorizedMarkup, /class="[^"]*\bvendor-document-import\b/u);
  assert.match(css, /\.vendor-workspace-stage\s*\{[\s\S]{0,180}grid-template-columns:\s*minmax\(0,\s*1fr\)/u);
  assert.match(css, /\.vendor-document-share\s*\{/u);
  assert.match(runtimeSource, /export function initializeVendorDocumentSharing/u);
  assert.match(runtimeSource, /export function resolveVendorDocumentShareTarget/u);
  assert.doesNotMatch(`${authorizedMarkup}\n${css}\n${runtimeSource}`, /LINE 三方群組|LINE 案件對話|line-conversation|vendor-workspace-sidecar|vendor-gate-chat/u);
});

test("vendor document sharing uses the system share sheet with a permission-safe copied-link fallback", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "vendor-document-sharing"));
  const sourceHref = "http://127.0.0.1:4173/pcm/vendor/workspace/?role=owner&case=fake#records";

  for (const code of resourceCodes) {
    const target = runtime.resolveVendorDocumentShareTarget(code, sourceHref);
    assert.ok(target, code);
    assert.match(target.url, /^http:\/\/127\.0\.0\.1:4173\/pcm\/vendor\/workspace\/#/u);
    assert.doesNotMatch(target.url, /role=|case=|owner|fake/u);
    assert.match(target.text, /收件者仍須登入並具備案件權限/u);
  }
  assert.equal(runtime.resolveVendorDocumentShareTarget("UNKNOWN", sourceHref), null);
  assert.equal(runtime.resolveVendorDocumentShareTarget("ATTACHMENTS", "file:///tmp/code.html"), null);

  function shareButton(code) {
    const listeners = new Map();
    return {
      disabled: false,
      addEventListener(type, listener) { listeners.set(type, listener); },
      getAttribute(name) { return name === "data-vendor-document-share" ? code : null; },
      async emit(type) { await listeners.get(type)?.({ preventDefault() {} }); },
    };
  }

  const nativeButton = shareButton("ATTACHMENTS");
  const nativeStatus = { textContent: "" };
  const nativePayloads = [];
  const nativeRoot = {
    querySelector(selector) {
      return selector === "[data-vendor-workspace-live]" ? nativeStatus : null;
    },
    querySelectorAll(selector) {
      return selector === "[data-vendor-document-share]" ? [nativeButton] : [];
    },
  };
  assert.deepEqual(
    { ...runtime.initializeVendorDocumentSharing(nativeRoot, {
      locationHref: sourceHref,
      share: async (payload) => nativePayloads.push(payload),
      copy: async () => assert.fail("native share must precede copy fallback"),
    }) },
    { state: "READY", boundCount: 1 },
  );
  await nativeButton.emit("click");
  assert.equal(nativePayloads.length, 1);
  assert.match(nativePayloads[0].title, /契約附件/u);
  assert.equal(nativeStatus.textContent, "已開啟系統分享選單。");
  assert.equal(nativeButton.disabled, false);

  const fallbackButton = shareButton("EVIDENCE");
  const fallbackStatus = { textContent: "" };
  const copiedUrls = [];
  runtime.initializeVendorDocumentSharing({
    querySelector(selector) {
      return selector === "[data-vendor-workspace-live]" ? fallbackStatus : null;
    },
    querySelectorAll(selector) {
      return selector === "[data-vendor-document-share]" ? [fallbackButton] : [];
    },
  }, {
    locationHref: sourceHref,
    share: async () => { throw new Error("share unavailable"); },
    copy: async (url) => copiedUrls.push(url),
  });
  await fallbackButton.emit("click");
  assert.deepEqual(copiedUrls, ["http://127.0.0.1:4173/pcm/vendor/workspace/#execution"]);
  assert.match(fallbackStatus.textContent, /已複製受權連結/u);
});

test("vendor workspace keeps one current-case identity while design and construction stay separate management areas", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);
  const authorizedMarkup = vendorAuthorizedTemplate(html);
  const designTab = authorizedMarkup.match(
    /<button[^>]*data-vendor-workspace-tab="design"[\s\S]*?<\/button>/u,
  )?.[0] ?? "";
  const constructionTab = authorizedMarkup.match(
    /<button[^>]*data-vendor-workspace-tab="construction"[\s\S]*?<\/button>/u,
  )?.[0] ?? "";
  const designPanel = vendorWorkspacePanel(authorizedMarkup, "design");
  const constructionPanel = vendorWorkspacePanel(authorizedMarkup, "construction");

  assert.match(authorizedMarkup, /class="[^"]*\bside\b[^"]*"[^>]*aria-label="執行中案件"/u);
  for (const referenceClass of ["app", "side", "canvas", "top", "stats", "cols", "card"]) {
    assert.match(authorizedMarkup, new RegExp(`class="[^"]*\\b${referenceClass}\\b`, "u"), referenceClass);
  }
  assert.match(designTab, /目前授權案件/u);
  assert.match(designTab, /設計管理/u);
  assert.match(designTab, /35%/u);
  assert.match(designTab, /class="r1"[\s\S]*?<b>設計管理<\/b>[\s\S]*?35%/u);
  assert.match(designTab, /class="st"[\s\S]*?<strong>目前授權案件<\/strong>・需求、圖面、版本與決策/u);
  assert.match(constructionTab, /目前授權案件/u);
  assert.match(constructionTab, /工程管理/u);
  assert.match(constructionTab, /52%/u);
  assert.match(constructionTab, /class="r1"[\s\S]*?<b>工程管理<\/b>[\s\S]*?52%/u);
  assert.match(constructionTab, /class="st"[\s\S]*?<strong>目前授權案件<\/strong>・任務、照片、變更與驗收/u);

  assert.match(designPanel, /目前授權案件/u);
  assert.match(designPanel, /設計管理/u);
  assert.match(designPanel, /回覆甲方「平面 v2」提問/u);
  assert.match(designPanel, /需求、圖面、版本與待確認/u);
  assert.match(designPanel, /設計管理次分類/u);
  assert.match(designPanel, /data-vendor-calendar-node-summary/u);
  assert.doesNotMatch(designPanel, /vendor-calendar-grid|data-vendor-calendar-day/u);

  assert.match(constructionPanel, /目前授權案件/u);
  assert.match(constructionPanel, /工程管理/u);
  assert.match(constructionPanel, /寫今日施工日誌/u);
  assert.match(constructionPanel, /施工任務、進度、照片、變更與驗收/u);
  assert.match(constructionPanel, /工程管理次分類/u);
  assert.doesNotMatch(authorizedMarkup, /青埔 A7 新建案|林宅老屋翻新|桃園中壢|台北大安/u);
  assert.match(constructionPanel, /data-vendor-calendar-node-summary/u);
  assert.doesNotMatch(constructionPanel, /vendor-calendar-grid|data-vendor-calendar-day/u);

  assert.match(authorizedMarkup, /data-vendor-active-case-name/u);
  assert.match(authorizedMarkup, /data-calendar-case-context/u);
  assert.doesNotMatch(authorizedMarkup, /data-line-case-context/u);
  assert.match(css, /\.side\s*\{[\s\S]{0,360}color:\s*#eceef2/u);
  assert.match(css, /\.canvas\s*\{[\s\S]{0,300}background:\s*var\(--canvas\)/u);
  assert.match(css, /\.vendor-workspace-stage\s*\{[\s\S]{0,180}grid-template-columns:\s*minmax\(0,\s*1fr\)/u);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.app\s*\{[\s\S]{0,180}grid-template-columns:\s*1fr/u);
  assert.match(css, /\.side\s*\{[\s\S]{0,260}min-width:\s*0/u);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.vendor-workspace-tabs\s*\{[\s\S]{0,180}overflow-x:\s*auto/u);
  assert.match(css, /:root\s*\{\s*--paper:\s*#0B0B0B;\s*--canvas:\s*#0B0B0B;\s*--panel:\s*#EDEAE2;\s*--line:\s*#DAD8CE;\s*--line2:\s*#C9C4B8/u);
  assert.match(css, /\.hero\s*\{\s*background:\s*linear-gradient\(115deg,#FF7A2F 0%,#FF5809 52%,#D93D00 100%\)\s*!important/u);
  assert.match(css, /\.vendor-panel-heading h2\s*\{\s*color:\s*#F4F1EA/u);
  assert.match(css, /\.vendor-panel-facts dd\s*\{\s*color:\s*#F4F1EA/u);
  assert.match(css, /\.vendor-calendar-connection\s*\{/u);
});

test("workspace route links remain visible after hover focus and selection on the editorial canvas", async () => {
  const css = await readFile(pagePath(workspaceDir, "styles.css"), "utf8");

  assert.match(
    css,
    /\.vendor-route-nav a:hover,\s*\.vendor-route-nav a:focus-visible,\s*\.vendor-route-nav a\[aria-current="location"\]\s*\{[\s\S]{0,160}color:\s*#F4F1EA;[\s\S]{0,160}border-block-end-color:\s*#FF5809/u,
  );
});

test("vendor first fold adopts Dusk Ember and exposes one decision path without changing the Header", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);
  const authorizedMarkup = vendorAuthorizedTemplate(html);
  const marker = "/* DUSK EMBER visual system — owner/vendor external workspace.";
  const layerStart = css.indexOf(marker);

  assert.notEqual(layerStart, -1, "the external vendor workspace must use the Dusk Ember visual family");
  const layer = css.slice(layerStart);

  for (const [token, value] of [
    ["--vendor-carbon", "#09070B"],
    ["--vendor-obsidian", "#161019"],
    ["--vendor-night-plum", "#281820"],
    ["--vendor-ember-deep", "#F75000"],
    ["--vendor-ember", "#FF7530"],
    ["--vendor-ember-gold", "#FFAA45"],
    ["--vendor-responsibility", "#C26AE6"],
    ["--vendor-pending", "#E65A9F"],
    ["--vendor-record", "#C8C2CD"],
    ["--vendor-document-white", "#F3EEF5"],
  ]) {
    assert.match(layer, new RegExp(`${token}:\\s*${value}`, "u"), `${token} must match Dusk Ember`);
  }

  for (const hook of [
    "data-vendor-first-fold",
    "data-vendor-case-status-strip",
    "data-vendor-today-queue",
    "data-vendor-responsibility-signal",
    "data-vendor-evidence-basis",
    "data-vendor-record-consequence",
  ]) {
    assert.match(authorizedMarkup, new RegExp(`\\b${hook}\\b`, "u"), `${hook} must be visible in the first-fold decision path`);
  }

  assert.match(authorizedMarkup, /今日待處理[\s\S]*下一確認節點[\s\S]*下一責任人/u);
  assert.match(authorizedMarkup, /決策依據[\s\S]*案件紀錄/u);
  assert.match(layer, /\.vendor-calendar-hero__decision-grid\s*\{[\s\S]{0,260}grid-template-columns:\s*minmax\(210px,[\s\S]{0,140}minmax\(0,\s*1\.7fr\)/u);
  assert.match(layer, /\.vendor-calendar-connect\s*\{[\s\S]{0,300}linear-gradient\(100deg,\s*var\(--vendor-ember-deep\),\s*var\(--vendor-ember\),\s*var\(--vendor-ember-gold\)\)/u);
  assert.match(layer, /@media\s*\(max-width:\s*560px\)[\s\S]*?\.vendor-calendar-hero__stage\s*\{[\s\S]{0,120}order:\s*1/u);
  assert.doesNotMatch(layer, /OBSIDIAN BLOOM|#070708|#0E0C0D|#2D96FF|#79D94C/iu);
  assert.doesNotMatch(layer, /\.vendor-header|\.vendor-brand|\.drs-brand/iu);
  assert.match(layer, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none/u);
});

test("vendor clickable controls and today-status tiles share the approved glass language", async () => {
  const css = await readFile(pagePath(workspaceDir, "styles.css"), "utf8");
  const marker = "/* Layer 7 — glass controls and temperature-ranked status tiles. */";
  const layerStart = css.indexOf(marker);

  assert.notEqual(layerStart, -1, "the approved glass-control layer must exist");
  const layer = css.slice(layerStart);

  assert.match(
    layer,
    /#vendor-main\s+:where\(\.vendor-gate,\s*\.vendor-workspace\)\s+:where\([\s\S]{0,240}button[\s\S]{0,240}\.vendor-primary-action[\s\S]{0,240}\.vendor-calendar-node-summary\s+a[\s\S]{0,240}\.vendor-contract-preview\s+a[\s\S]{0,260}\)\s*\{/u,
  );
  assert.match(layer, /--vendor-glass-rgb:\s*194,\s*106,\s*230\s*;/u);
  assert.match(layer, /border-radius:\s*999px\s*!important\s*;/u);
  assert.match(layer, /backdrop-filter:\s*blur\(14px\)\s+saturate\(140%\)\s*;/u);
  assert.match(layer, /inset\s+0\s+1px\s+0\s+rgba\(243,\s*238,\s*245,\s*\.34\)/u);
  assert.match(layer, /inset\s+0\s+-10px\s+20px\s+rgba\(var\(--vendor-glass-rgb\),\s*\.18\)/u);
  assert.match(layer, /:where\(\s*button,\s*\.vendor-primary-action,[\s\S]{0,220}\):hover/u);
  assert.match(layer, /:where\(\s*button,\s*\.vendor-primary-action,[\s\S]{0,220}\):active/u);
  assert.match(layer, /:where\(\s*button:disabled,\s*button\[aria-disabled="true"\],[\s\S]{0,260}filter:\s*saturate\(\.55\)/u);

  assert.match(layer, /#vendor-workspace-panel-design\s+\.vendor-today-grid\s*\{\s*--vendor-tile-rgb:\s*194,\s*106,\s*230\s*;/u);
  assert.match(layer, /#vendor-workspace-panel-construction\s+\.vendor-today-grid\s*\{\s*--vendor-tile-rgb:\s*255,\s*117,\s*48\s*;/u);
  assert.match(layer, /\.vendor-today-grid\s*>\s*:where\(\.hero,\s*\.stat\)\s*\{[\s\S]{0,420}border-radius:\s*22px\s*!important/u);
  assert.match(layer, /inset\s+0\s+-3px\s+0\s+rgba\(var\(--vendor-tile-rgb\),\s*\.88\)/u);
  assert.match(layer, /#vendor-main\s+\.vendor-workspace\s+\.vendor-today-grid\s*>\s*:nth-child\(1\)\s*\{\s*--vendor-tile-heat:\s*\.34\s*;/u);
  assert.match(layer, /#vendor-main\s+\.vendor-workspace\s+\.vendor-today-grid\s*>\s*:nth-child\(4\)\s*\{\s*--vendor-tile-heat:\s*\.12\s*;/u);
  assert.match(layer, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,320}transition:\s*none\s*!important/u);
});

test("vendor public first fold leads with one Dusk Ember authorization decision instead of an empty card sea", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);
  const publicMarkup = vendorPublicMarkup(html);
  const marker = "/* DUSK EMBER visual system — owner/vendor external workspace.";
  const layer = css.slice(css.indexOf(marker));

  assert.match(publicMarkup, /\bdata-vendor-public-first-fold\b/u);
  assert.match(
    publicMarkup,
    /目前卡點[\s\S]*下一步[\s\S]*下一責任人[\s\S]*會留下的紀錄/u,
  );
  assert.match(
    publicMarkup,
    /data-vendor-access-recovery[\s\S]*>登入並開啟我的案件<\/a>/u,
  );
  assert.equal(count(publicMarkup, /\bvendor-primary-action\b/gu), 1);
  assert.equal(count(publicMarkup, /\bvendor-gate-placeholder\b/gu), 0);
  assert.equal(count(publicMarkup, /class="[^"]*\bcard\b/gu), 1);
  assert.match(publicMarkup, /\bdata-vendor-public-evidence\b/u);
  assert.match(publicMarkup, /\bdata-vendor-public-record\b/u);

  assert.match(
    layer,
    /\.vendor-gate-first-fold\s*\{[\s\S]{0,300}grid-template-columns:\s*minmax\(0,\s*1\.4fr\)\s+minmax\(240px,\s*\.6fr\)/u,
  );
  assert.match(
    layer,
    /\.vendor-gate \.vendor-primary-action\s*\{[\s\S]{0,320}linear-gradient\(100deg,\s*var\(--vendor-ember-deep\),\s*var\(--vendor-ember\),\s*var\(--vendor-ember-gold\)\)/u,
  );
  assert.match(
    layer,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.vendor-gate-first-fold\s*\{[\s\S]{0,120}grid-template-columns:\s*1fr/u,
  );
  assert.doesNotMatch(layer, /rgba\(255,\s*90,\s*0|#FF5A00|#2D96FF|#F3C969/iu);
});

test("vendor public state keeps the original workspace interface without exposing protected case data", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);
  const publicMarkup = vendorPublicMarkup(html);
  const authorizedMarkup = vendorAuthorizedTemplate(html);

  assert.match(publicMarkup, /id="invited-cases"/u);
  assert.match(publicMarkup, /class="[^"]*\bapp\b[^"]*\bvendor-gate-shell\b/u);
  for (const referenceClass of ["side", "canvas", "top", "stats", "hero", "cols", "card"]) {
    assert.match(publicMarkup, new RegExp(`class="[^"]*\\b${referenceClass}\\b`, "u"), referenceClass);
  }
  assert.match(publicMarkup, /執行中工作台/u);
  assert.match(publicMarkup, /今日待辦/u);
  assert.match(publicMarkup, /案件日曆/u);
  assert.match(publicMarkup, /最新動態/u);
  assert.match(publicMarkup, /登入後載入你參與的案件/u);
  assert.match(publicMarkup, /尚未確認案件授權/u);
  assert.match(publicMarkup, /登入並開啟我的案件/u);
  assert.doesNotMatch(publicMarkup, /回到邀請確認|href="\.\.\/vendor_invitation\/code\.html"/u);
  assert.match(publicMarkup, /責任人[\s\S]*目前使用者/u);
  assert.match(publicMarkup, /id="vendor-authorized-workspace-mount"/u);
  assert.equal(count(publicMarkup, /\bdata-vendor-gate-management-tab=/gu), 2);
  for (const [kind, label] of [["design", "設計管理"], ["construction", "工程管理"]]) {
    assert.match(
      publicMarkup,
      new RegExp(`<button[^>]*data-vendor-gate-management-tab="${kind}"[^>]*disabled[^>]*aria-disabled="true"[\\s\\S]*?${label}[\\s\\S]*?<\\/button>`, "u"),
    );
  }
  assert.doesNotMatch(publicMarkup, /data-vendor-workspace-tab|role="tabpanel"/u);
  assert.doesNotMatch(publicMarkup, /契約範本|共同契約|v0\.2|LINE|line-conversation|composer/u);
  assert.doesNotMatch(publicMarkup, /青埔 A7|林宅老屋|漢皇SUPER|blueleft0120|<input|<textarea|<select/u);
  assert.match(css, /\.vendor-gate-shell\s*\{[\s\S]{0,260}grid-template-columns:\s*236px minmax\(0,\s*1fr\)/u);
  assert.match(css, /\.vendor-gate-placeholder\s*\{/u);
  assert.match(css, /\.vendor-gate-columns\s*\{[\s\S]{0,120}grid-template-columns:\s*minmax\(0,\s*1fr\)/u);
  assert.match(css, /\.vendor-gate-management-tabs\s*\{/u);
  assert.match(css, /\.vendor-gate-management-tab:disabled\s*\{/u);

  assert.notEqual(authorizedMarkup, "", "authorized workspace lives in an inert template");
  assert.equal(count(authorizedMarkup, /\bdata-vendor-workspace-tab=/gu), 2);
  assert.equal(count(authorizedMarkup, /\bdata-vendor-workspace-panel=/gu), 2);
  assert.deepEqual(
    [...authorizedMarkup.matchAll(/data-vendor-workspace-tab="[^"]+"[^>]*>[\s\S]*?class="r1"[\s\S]*?<b>([^<]+)<\/b>/gu)]
      .map((match) => match[1]),
    ["設計管理", "工程管理"],
  );
  assert.match(vendorWorkspacePanel(authorizedMarkup, "design"), /契約管理/u);
  assert.doesNotMatch(authorizedMarkup, /設計案管理|工程案管理|main-tabs/u);
  assert.doesNotMatch(authorizedMarkup, /id="case-conversation"|line-conversation__composer/u);
  assert.equal(count(authorizedMarkup, /\bdata-vendor-document-share=/gu), resourceCodes.length);
  assert.doesNotMatch(authorizedMarkup, /data-line-send/u);
});

test("vendor header uses the cross-page official expanded DRS lockup and truthful context copy", async () => {
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");

  assert.match(html, /<title>[^<]*LaiBE DRS[^<]*<\/title>/u);
  assert.match(html, /href="\.\.\/shared\/drs-brand\.css/u);
  assert.match(html, /class="vendor-brand"[^>]*aria-label="LaiBE DRS 首頁"/u);
  assert.match(html, /drs-brand-lockup drs-brand-lockup--expanded/u);
  assert.match(html, /Decision &amp; Record System/u);
  assert.match(html, /裝潢決策系統/u);
  assert.match(html, /data-vendor-header-role[^>]*>受邀乙方｜設計師／統包</u);
  assert.match(html, /data-vendor-header-state[^>]*>身分與案件範圍尚待確認</u);
});

test("390px cascade keeps the DRS lockup role state and 44px recovery target visible", async () => {
  const [sharedBrandCss, css] = await Promise.all([
    readFile(path.join(pcmRoot, "shared", "drs-brand.css"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);
  const viewportWidth = 390;
  const rules = [];
  const order = { value: 0 };
  collectCssCascadeRules(sharedBrandCss, viewportWidth, rules, order);
  collectCssCascadeRules(css, viewportWidth, rules, order);

  const root = cssNode("html", { isRoot: true });
  const body = cssNode("body", { parent: root });
  const header = cssNode("header", { classes: ["vendor-header"], parent: body });
  const headerInner = cssNode("div", { classes: ["vendor-header__inner"], parent: header });
  const brand = cssNode("a", { classes: ["vendor-brand"], parent: headerInner });
  const logo = cssNode("img", { parent: brand });
  const lockup = cssNode("span", {
    classes: ["drs-brand-lockup", "drs-brand-lockup--expanded"],
    parent: brand,
  });
  const headerContext = cssNode("div", { classes: ["vendor-header__context"], parent: headerInner });
  const roleRow = cssNode("p", { classes: ["vendor-header__role"], parent: headerContext });
  const role = cssNode("strong", { attributes: { "data-vendor-header-role": "" }, parent: roleRow });
  const stateRow = cssNode("p", { classes: ["vendor-header__state"], parent: headerContext });
  const state = cssNode("strong", { attributes: { "data-vendor-header-state": "" }, parent: stateRow });
  const gate = cssNode("section", { classes: ["vendor-gate"], parent: body });
  const action = cssNode("a", {
    classes: ["vendor-primary-action"],
    attributes: { "aria-disabled": "true", "data-vendor-access-recovery": "" },
    parent: gate,
  });
  const cache = new Map();

  assert.equal(matchesCssSelector(lockup, ".vendor-brand span"), true);
  for (const [label, element] of [["brand identity", lockup], ["role", role], ["authorization state", state]]) {
    const style = computedCssStyle(element, rules, cache);
    assert.notEqual(style.display ?? defaultCssDisplay(element.tag), "none", `${label} own display`);
    assert.equal(style.visibility ?? "visible", "visible", `${label} own visibility`);
    assert.equal(effectiveCssVisibility(element, rules, cache), true, `${label} effective visibility`);
  }
  assert.equal(computedCssStyle(lockup, rules, cache).display, "inline-grid");
  assert.equal(computedCssStyle(roleRow, rules, cache).display, "grid");
  assert.equal(computedCssStyle(stateRow, rules, cache).display, "grid");

  const actionStyle = computedCssStyle(action, rules, cache);
  const actionMinHeight = Math.max(
    cssLengthToPixels(actionStyle["min-block-size"], { viewportWidth, containingWidth: viewportWidth, style: actionStyle }),
    cssLengthToPixels(actionStyle["min-height"], { viewportWidth, containingWidth: viewportWidth, style: actionStyle }),
  );
  assert.ok(actionMinHeight >= 44, `recovery target min-height ${actionMinHeight}px`);

  const rootStyle = computedCssStyle(root, rules, cache);
  const bodyStyle = computedCssStyle(body, rules, cache);
  const innerStyle = computedCssStyle(headerInner, rules, cache);
  const brandStyle = computedCssStyle(brand, rules, cache);
  const logoStyle = computedCssStyle(logo, rules, cache);
  const lockupStyle = computedCssStyle(lockup, rules, cache);
  const contextStyle = computedCssStyle(headerContext, rules, cache);
  const gateStyle = computedCssStyle(gate, rules, cache);
  const shellWidth = cssLengthToPixels(innerStyle["inline-size"], {
    viewportWidth,
    containingWidth: viewportWidth,
    style: innerStyle,
  });
  const gateWidth = cssLengthToPixels(gateStyle["inline-size"], {
    viewportWidth,
    containingWidth: viewportWidth,
    style: gateStyle,
  });
  const brandFootprint = [logoStyle["inline-size"], lockupStyle["min-width"], brandStyle.gap]
    .map((value) => cssLengthToPixels(value, { viewportWidth, containingWidth: shellWidth, style: brandStyle }))
    .reduce((sum, value) => sum + value, 0);

  assert.equal(rootStyle["box-sizing"], "border-box");
  assert.equal(bodyStyle["overflow-x"], "clip");
  assert.equal(shellWidth, 366);
  assert.ok(gateWidth <= viewportWidth, `gate width ${gateWidth}px`);
  assert.ok(innerStyle["flex-direction"] === "column" || innerStyle["flex-wrap"] === "wrap");
  assert.equal(cssLengthToPixels(innerStyle["padding-inline"] ?? "0", { viewportWidth, containingWidth: shellWidth, style: innerStyle }), 0);
  assert.equal(brandStyle["min-inline-size"], "0");
  assert.equal(contextStyle["min-inline-size"], "0");
  assert.ok(brandFootprint <= shellWidth, `brand footprint ${brandFootprint}px exceeds ${shellWidth}px shell`);
  assert.doesNotMatch(`${sharedBrandCss}\n${css}`, /\b100vw\b/iu);
  assert.doesNotMatch(`${sharedBrandCss}\n${css}`, /margin(?:-inline|-left|-right)?(?:-(?:start|end))?\s*:\s*-\d/iu);
});

test("production recovery binding canonicalizes the vendor recovery route with invited-partner intent and closes null wrong or throwing getters", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "manifest-recovery"));
  assert.equal(typeof runtime.bindVendorWorkspaceRecoveryRoute, "function");

  function recoveryFixture(initialHref = null) {
    const attributes = new Map();
    if (initialHref) attributes.set("href", initialHref);
    const action = {
      getAttribute(name) { return attributes.get(name) ?? null; },
      removeAttribute(name) { attributes.delete(name); },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
    return {
      action,
      root: {
        querySelector(selector) {
          return selector === "[data-vendor-access-recovery]" ? action : null;
        },
      },
    };
  }

  const active = recoveryFixture();
  assert.equal(
    runtime.bindVendorWorkspaceRecoveryRoute(
      active.root,
      (id) => id === "vendorWorkspaceAccessRecoveryToAccountAccess"
        ? "../account_access/code.html#top"
        : null,
    ),
    "/account/access/?intent=invited-partner",
  );
  assert.equal(
    active.action.getAttribute("href"),
    "/account/access/?intent=invited-partner",
  );
  assert.equal(active.action.getAttribute("aria-disabled"), "false");

  for (const [label, getter] of [
    ["null", () => null],
    ["wrong invitation route", () => "../vendor_invitation/code.html"],
    ["throw", () => { throw new Error("manifest unavailable"); }],
  ]) {
    const unavailable = recoveryFixture("../vendor_invitation/code.html");
    assert.equal(runtime.bindVendorWorkspaceRecoveryRoute(unavailable.root, getter), null, label);
    assert.equal(unavailable.action.getAttribute("href"), null, `${label}: href`);
    assert.equal(unavailable.action.getAttribute("aria-disabled"), "true", `${label}: disabled`);
  }
});

test("vendor recovery intent selects only the vendor grant check while missing or invalid intent remains owner-first", async () => {
  const accountRuntime = await import(moduleUrl(accountAccessDir, "vendor-recovery-intent-contract"));
  const ownerGrant = {
    schemaVersion: "laibe.owner-workspace-runtime.v1",
    state: "AUTHORIZED_OWNER_WORKSPACE",
    authenticatedUserId: "11111111-1111-4111-8111-111111111111",
    currentCaseId: "22222222-2222-4222-8222-222222222222",
    membership: {
      userId: "11111111-1111-4111-8111-111111111111",
      caseId: "22222222-2222-4222-8222-222222222222",
      role: "owner",
      status: "active",
    },
    workspaceAccess: {
      role: "owner",
      mutationAllowed: false,
      writeActionsEnabled: false,
      payloadPolicy: "AUTHORIZED_SCOPE_ONLY",
    },
    case: {
      caseId: "22222222-2222-4222-8222-222222222222",
      title: "住宅修改工程",
      status: "active",
    },
    serviceContext: { pcmStatus: "UNAVAILABLE", contractStatus: "UNAVAILABLE" },
    documents: [],
  };

  function accountRuntimeWithOwnerOnly(calls) {
    return {
      async getSession() {
        return { access_token: "real-session-token" };
      },
      async authenticatedFetch(endpoint) {
        calls.push(endpoint);
        if (endpoint === "owner-workspace-grant") {
          return new Response(JSON.stringify(ownerGrant), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ state: "CASE_NOT_AUTHORIZED" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      },
    };
  }

  const vendorIntentCalls = [];
  const vendorIntentNavigations = [];
  const vendorIntentResult = await accountRuntime.resumeAuthorizedSession({
    authRuntime: accountRuntimeWithOwnerOnly(vendorIntentCalls),
    navigate: (href) => vendorIntentNavigations.push(href),
    location: {
      pathname: "/account/access/",
      search: "?intent=invited-partner&role=pro&caseId=forged",
    },
    roleIntent: "invited-partner",
  });

  assert.deepEqual(vendorIntentCalls, ["vendor-workspace-grant"]);
  assert.deepEqual(vendorIntentNavigations, []);
  assert.deepEqual(vendorIntentResult, { state: "ACCESS_DENIED" });
  for (const authorityField of [
    "role",
    "caseId",
    "membership",
    "authorization",
    "workspaceAccess",
  ]) {
    assert.equal(
      Object.hasOwn(vendorIntentResult, authorityField),
      false,
      `${authorityField} must come only from a trusted server grant`,
    );
  }

  for (const roleIntent of [undefined, "unexpected"]) {
    const ownerFirstCalls = [];
    const ownerFirstNavigations = [];
    const ownerFirstResult = await accountRuntime.resumeAuthorizedSession({
      authRuntime: accountRuntimeWithOwnerOnly(ownerFirstCalls),
      navigate: (href) => ownerFirstNavigations.push(href),
      location: {
        pathname: "/account/access/",
        search: roleIntent === undefined ? "" : `?intent=${roleIntent}`,
      },
      roleIntent,
    });

    assert.deepEqual(ownerFirstCalls, ["owner-workspace-grant"]);
    assert.deepEqual(ownerFirstNavigations, ["/pcm/owner/workspace/"]);
    assert.deepEqual(ownerFirstResult, { state: "OWNER_GRANTED" });
  }
});

test("vendor redesign clones the formal workspace only for the exported canonical authorization singleton", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "authorized-template"));
  assert.equal(
    runtime.AUTHORIZED_VENDOR_WORKSPACE,
    runtime.VENDOR_WORKSPACE_CANONICAL_STATES.AUTHORIZED_VENDOR_WORKSPACE,
  );

  function renderingRoot() {
    const bodyAttributes = new Map();
    let cloneCount = 0;
    let mounted = false;
    const mount = {
      replaceChildren(...children) { mounted = children.length > 0; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    };
    const template = {
      content: {
        cloneNode() {
          cloneCount += 1;
          return { clonedAuthorizedWorkspace: true, querySelectorAll() { return []; } };
        },
      },
    };
    const root = {
      body: {
        setAttribute(name, value) { bodyAttributes.set(name, String(value)); },
      },
      querySelector(selector) {
        if (selector === "#vendor-authorized-workspace-template") return template;
        if (selector === "#vendor-authorized-workspace-mount") return mount;
        return null;
      },
      querySelectorAll() { return []; },
    };
    return {
      bodyAttributes,
      get cloneCount() { return cloneCount; },
      get mounted() { return mounted; },
      root,
    };
  }

  const denied = renderingRoot();
  assert.equal(runtime.initializeVendorWorkspace(denied.root), runtime.CONTEXT_UNAVAILABLE);
  assert.equal(denied.cloneCount, 0);
  assert.equal(denied.mounted, false);

  const shapedLookalike = renderingRoot();
  assert.equal(
    runtime.initializeVendorWorkspace(shapedLookalike.root, { code: "AUTHORIZED_VENDOR_WORKSPACE" }),
    runtime.CONTEXT_UNAVAILABLE,
  );
  assert.equal(shapedLookalike.cloneCount, 0);

  const authorized = renderingRoot();
  assert.equal(
    runtime.initializeVendorWorkspace(authorized.root, runtime.AUTHORIZED_VENDOR_WORKSPACE),
    runtime.AUTHORIZED_VENDOR_WORKSPACE,
  );
  assert.equal(authorized.cloneCount, 1);
  assert.equal(authorized.mounted, true);
  assert.equal(bodyAttributesValue(authorized.bodyAttributes, "data-vendor-state"), "AUTHORIZED_VENDOR_WORKSPACE");
});

test("vendor workspace ignores authorized preview query strings and shaped state objects", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "preview-query-denied"));

  function renderingRoot() {
    const bodyAttributes = new Map();
    let cloneCount = 0;
    let mounted = false;
    const mount = {
      hidden: true,
      replaceChildren(...children) { mounted = children.length > 0; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    };
    const template = {
      content: {
        cloneNode() {
          cloneCount += 1;
          return { querySelectorAll() { return []; } };
        },
      },
    };
    const root = {
      body: {
        setAttribute(name, value) { bodyAttributes.set(name, String(value)); },
      },
      defaultView: {
        location: { hash: "", search: "?preview=authorized" },
        addEventListener() {},
      },
      querySelector(selector) {
        if (selector === "#vendor-authorized-workspace-template") return template;
        if (selector === "#vendor-authorized-workspace-mount") return mount;
        return null;
      },
      querySelectorAll() { return []; },
    };
    return {
      bodyAttributes,
      get cloneCount() { return cloneCount; },
      get mounted() { return mounted; },
      root,
    };
  }

  const deniedByQuery = renderingRoot();
  assert.equal(
    runtime.initializeVendorWorkspace(deniedByQuery.root),
    runtime.CONTEXT_UNAVAILABLE,
  );
  assert.equal(deniedByQuery.cloneCount, 0);
  assert.equal(deniedByQuery.mounted, false);
  assert.equal(
    bodyAttributesValue(deniedByQuery.bodyAttributes, "data-vendor-state"),
    "CONTEXT_UNAVAILABLE",
  );

  const deniedByLookalike = renderingRoot();
  assert.equal(
    runtime.initializeVendorWorkspace(
      deniedByLookalike.root,
      { code: "AUTHORIZED_VENDOR_WORKSPACE" },
    ),
    runtime.CONTEXT_UNAVAILABLE,
  );
  assert.equal(deniedByLookalike.cloneCount, 0);
  assert.equal(deniedByLookalike.mounted, false);
});

test("vendor workspace reinitialization revokes stale authorized DOM and rolls back failed publication", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "authorized-revocation"));

  function reinitializationRoot({ failAuthorizedBody = false } = {}) {
    const bodyAttributes = new Map();
    const gate = { hidden: false };
    const headerState = { textContent: "身分與案件範圍尚待確認" };
    let mountedChildren = 0;
    const mount = {
      replaceChildren(...children) { mountedChildren = children.length; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    };
    const template = {
      content: {
        cloneNode() { return { clonedAuthorizedWorkspace: true, querySelectorAll() { return []; } }; },
      },
    };
    const root = {
      body: {
        setAttribute(name, value) {
          if (failAuthorizedBody && value === "AUTHORIZED_VENDOR_WORKSPACE") {
            throw new Error("authorized state publication failed");
          }
          bodyAttributes.set(name, String(value));
        },
      },
      querySelector(selector) {
        if (selector === "#vendor-authorized-workspace-template") return template;
        if (selector === "#vendor-authorized-workspace-mount") return mount;
        if (selector === "#invited-cases") return gate;
        if (selector === "[data-vendor-header-state]") return headerState;
        return null;
      },
      querySelectorAll(selector) {
        if (selector === "[data-vendor-workspace-tab]" || selector === "[data-vendor-workspace-panel]") {
          return mountedChildren ? [{}] : [];
        }
        return [];
      },
    };
    return {
      bodyAttributes,
      gate,
      headerState,
      get mountedChildren() { return mountedChildren; },
      root,
    };
  }

  for (const revokedState of [undefined, { code: "AUTHORIZED_VENDOR_WORKSPACE" }]) {
    const fixture = reinitializationRoot();
    assert.equal(
      runtime.initializeVendorWorkspace(fixture.root, runtime.AUTHORIZED_VENDOR_WORKSPACE),
      runtime.AUTHORIZED_VENDOR_WORKSPACE,
    );
    assert.equal(fixture.mountedChildren, 1);
    assert.equal(fixture.gate.hidden, true);
    assert.equal(fixture.headerState.textContent, "案件工作台已開啟");

    assert.equal(
      runtime.initializeVendorWorkspace(fixture.root, revokedState),
      runtime.CONTEXT_UNAVAILABLE,
    );
    assert.equal(bodyAttributesValue(fixture.bodyAttributes, "data-vendor-state"), "CONTEXT_UNAVAILABLE");
    assert.equal(fixture.mountedChildren, 0);
    assert.equal(fixture.gate.hidden, false);
    assert.equal(fixture.headerState.textContent, "身分與案件範圍尚待確認");
    assert.equal(fixture.root.querySelectorAll("[data-vendor-workspace-tab]").length, 0);
    assert.equal(fixture.root.querySelectorAll("[data-vendor-workspace-panel]").length, 0);
  }

  const failedPublication = reinitializationRoot({ failAuthorizedBody: true });
  assert.equal(
    runtime.initializeVendorWorkspace(failedPublication.root, runtime.AUTHORIZED_VENDOR_WORKSPACE),
    runtime.CONTEXT_UNAVAILABLE,
  );
  assert.equal(bodyAttributesValue(failedPublication.bodyAttributes, "data-vendor-state"), "CONTEXT_UNAVAILABLE");
  assert.equal(failedPublication.mountedChildren, 0);
  assert.equal(failedPublication.gate.hidden, false);
  assert.equal(failedPublication.headerState.textContent, "身分與案件範圍尚待確認");
});

function bodyAttributesValue(attributes, name) {
  return attributes.get(name);
}

test("vendor contract child tabs provide roving focus vertical keys hidden panels and a short live update", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "contract-tab-dom"));
  let focused = null;
  function element(dataset = {}) {
    const attributes = new Map();
    const listeners = new Map();
    return {
      dataset: { ...dataset },
      hidden: false,
      tabIndex: 0,
      textContent: "",
      addEventListener(type, listener) { listeners.set(type, listener); },
      emit(type, event = {}) { listeners.get(type)?.(event); },
      focus() { focused = this; },
      getAttribute(name) { return attributes.get(name) ?? null; },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
  }
  const tabs = ["overview", "reply", "decision", "records"].map((key) => element({ vendorContractView: key }));
  const panels = ["overview", "reply", "decision", "records"].map((key) => element({ vendorContractViewPanel: key }));
  const live = element();
  const root = {
    defaultView: { location: { hash: "" }, addEventListener() {} },
    querySelector(selector) {
      if (selector === "[data-vendor-workspace-live]") return live;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-vendor-contract-view]") return tabs;
      if (selector === "[data-vendor-contract-view-panel]") return panels;
      return [];
    },
  };

  runtime.initializeVendorContractViewTabs(root);
  tabs[0].emit("keydown", { key: "ArrowDown", preventDefault() {} });
  assert.equal(focused, tabs[1]);
  assert.equal(tabs[1].tabIndex, 0);
  assert.equal(panels[1].hidden, false);
  assert.equal(panels[0].hidden, true);
  assert.match(live.textContent, /已切換至待我回覆/u);

  tabs[1].emit("keydown", { key: "End", preventDefault() {} });
  assert.equal(focused, tabs[3]);
  assert.equal(panels[3].hidden, false);
  tabs[3].emit("keydown", { key: "ArrowUp", preventDefault() {} });
  assert.equal(focused, tabs[2]);
  tabs[2].emit("click");
  assert.equal(tabs[2].getAttribute("aria-selected"), "true");
});

test("vendor redesign authorized structure is data-first truthful and keeps all mutation controls closed", async () => {
  const [html, css, runtimeSource] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
    readFile(pagePath(workspaceDir, "app.js"), "utf8"),
  ]);
  const authorizedMarkup = vendorAuthorizedTemplate(html);
  const authorizedText = visibleText(authorizedMarkup);
  const codes = [...authorizedMarkup.matchAll(/data-resource-code="([A-Z_]+)"/gu)]
    .map((match) => match[1]);

  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.deepEqual([...codes].sort(), [...resourceCodes].sort());
  assert.doesNotMatch(`${authorizedMarkup}\n${runtimeSource}`, /quote[-_ ]?check|data-document-(?:tab|panel|file|dropzone)/iu);
  assert.match(authorizedText, /萊比公開審查意見（PCM）/u);
  assert.match(authorizedText, /契約範本預覽/u);
  assert.doesNotMatch(authorizedText, /本案共同契約|甲乙共同契約|v0\.2/u);
  assert.doesNotMatch(authorizedText, /\b(?:DB|API|n8n|debug)\b|raw JSON|mock-only|無 DB 寫入|API 未開/iu);
  assert.doesNotMatch(authorizedText, /金流託管|支付託管|代收代付|老屋投資|投資報酬|翻修獲利/u);

  for (const kind of ["design", "construction"]) {
    const panel = vendorWorkspacePanel(authorizedMarkup, kind);
    for (const label of ["目前狀態", "下一步", "責任人", "最近紀錄"]) {
      assert.match(panel, new RegExp(label, "u"), `${kind}: ${label}`);
    }
  }
  const controls = authorizedMarkup.match(/<(?:button|input|textarea|select)\b[^>]*\bdata-write-action\b[^>]*>/giu) ?? [];
  assert.ok(controls.length > 0);
  for (const control of controls) {
    assert.match(control, /\bdisabled\b/iu);
    assert.match(control, /\baria-disabled="true"/iu);
  }

  assert.match(css, /--workspace-control-min:\s*44px/u);
  assert.match(css, /body\s*\{[\s\S]{0,500}font-size:\s*16px/u);
  assert.match(css, /\.vendor-status-rail[\s\S]{0,800}font-size:\s*14px/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/u);
  assert.match(css, /backdrop-filter:\s*blur\(16px\)/u);
  assert.doesNotMatch(css, /text-shadow/u);
});

test("vendor workspace tab keyboard contract supports arrows Home and End", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "tabs"));
  assert.deepEqual(
    ownListValues(runtime.VENDOR_WORKSPACE_TAB_KEYS, "VENDOR_WORKSPACE_TAB_KEYS"),
    ["design", "construction"],
  );
  assert.equal(runtime.resolveVendorWorkspaceTabKey("design", "ArrowRight"), "construction");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("design", "ArrowLeft"), "construction");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("construction", "Home"), "design");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("construction", "End"), "construction");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("construction", "ArrowRight"), "design");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("construction", "Escape"), "construction");
});

test("vendor document resolver accepts native-style accessors and rejects hostile values", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "document-resolver"));
  const documentLike = {
    body: { setAttribute() {} },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  let receiver = null;
  const prototype = Object.create(null);
  Object.defineProperty(prototype, "document", {
    configurable: true,
    get() {
      receiver = this;
      return documentLike;
    },
  });
  const nativeLikeGlobal = Object.create(prototype);

  assert.equal(runtime.resolveVendorDocument(nativeLikeGlobal), documentLike);
  assert.equal(receiver, nativeLikeGlobal);

  const throwingPrototype = Object.create(null);
  Object.defineProperty(throwingPrototype, "document", {
    configurable: true,
    get() {
      throw new Error("hostile accessor");
    },
  });
  assert.equal(runtime.resolveVendorDocument(Object.create(throwingPrototype)), null);

  for (const invalid of [
    null,
    {},
    { body: {}, querySelector() {}, querySelectorAll() {} },
    { body: { setAttribute() {} }, querySelector: null, querySelectorAll() {} },
  ]) {
    assert.equal(runtime.resolveVendorDocument({ document: invalid }), null);
  }
});

test("vendor module auto-initializes through an accessor-backed document", async () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const bodyAttributes = new Map();
  const controlAttributes = new Map();
  const control = {
    disabled: false,
    setAttribute(name, value) { controlAttributes.set(name, String(value)); },
  };
  const documentLike = {
    body: {
      setAttribute(name, value) { bodyAttributes.set(name, String(value)); },
    },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === "[data-write-action]") return [control];
      return [];
    },
  };
  let receiver = null;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    get() {
      receiver = this;
      return documentLike;
    },
  });

  try {
    await import(moduleUrl(workspaceDir, "browser-auto-init"));
  } finally {
    if (originalDocument) {
      Object.defineProperty(globalThis, "document", originalDocument);
    } else {
      delete globalThis.document;
    }
  }

  assert.equal(receiver, globalThis);
  assert.equal(bodyAttributes.get("data-vendor-state"), "CONTEXT_UNAVAILABLE");
  assert.equal(control.disabled, true);
  assert.equal(controlAttributes.get("aria-disabled"), "true");
});

test("vendor tab initializer drives DOM state and maps current and legacy fragments", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "tab-dom"));
  let focused = null;

  function element({ dataset = {}, href = null, hidden = false } = {}) {
    const attributes = new Map();
    const listeners = new Map();
    const classes = new Set();
    return {
      dataset: { ...dataset },
      disabled: false,
      hidden,
      tabIndex: 0,
      textContent: "",
      classList: {
        contains(name) { return classes.has(name); },
        toggle(name, force) {
          if (force) classes.add(name);
          else classes.delete(name);
        },
      },
      addEventListener(type, listener) { listeners.set(type, listener); },
      emit(type, event = {}) { listeners.get(type)?.(event); },
      focus() { focused = this; },
      getAttribute(name) {
        if (name === "href") return href;
        return attributes.get(name) ?? null;
      },
      getBoundingClientRect() { return { top: 120 }; },
      removeAttribute(name) { attributes.delete(name); },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
  }

  const tabs = ["design", "construction"].map((kind) => element({
    dataset: { vendorWorkspaceTab: kind },
  }));
  const panels = ["design", "construction"].map((kind, index) => element({
    dataset: { vendorWorkspacePanel: kind },
    hidden: index !== 0,
  }));
  const links = ["#documents", "#execution", "#reviews", "#records"].map((href) => element({ href }));
  const targets = Object.fromEntries([
    ["#documents", panels[0]],
    ["#execution", panels[1]],
    ["#reviews", element()],
    ["#records", element()],
  ]);
  const live = element();
  const activeCaseName = element();
  activeCaseName.textContent = "目前授權案件";
  const calendarCaseContext = element();
  calendarCaseContext.textContent = "只顯示目前登入乙方的授權案件。";
  const windowListeners = new Map();
  const view = {
    location: { hash: "#documents" },
    scrollY: 20,
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    scrollTo() {},
  };
  const root = {
    defaultView: view,
    querySelector(selector) {
      if (selector === "[data-vendor-workspace-live]") return live;
      if (selector === "[data-vendor-active-case-name]") return activeCaseName;
      if (selector === "[data-calendar-case-context]") return calendarCaseContext;
      return targets[selector] ?? null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-vendor-workspace-tab]") return tabs;
      if (selector === "[data-vendor-workspace-panel]") return panels;
      if (selector === "[data-vendor-workspace-route]") return links;
      return [];
    },
  };

  const childActivations = [];
  runtime.initializeVendorWorkspaceTabs(root, {
    activate(viewKey) {
      assert.equal(panels[0].hidden, false, "parent design panel opens before the contract child view");
      childActivations.push(viewKey);
    },
  });
  assert.equal(tabs[0].getAttribute("aria-selected"), "true");
  assert.equal(tabs[0].tabIndex, 0);
  assert.equal(panels[0].hidden, false);
  assert.equal(focused, tabs[0]);
  assert.deepEqual(childActivations, ["overview"]);
  assert.equal(links[0].getAttribute("aria-current"), "location");
  assert.equal(activeCaseName.textContent, "目前授權案件");
  assert.equal(calendarCaseContext.textContent, "只顯示目前登入乙方的授權案件。");
  assert.equal(tabs[0].classList.contains("on"), true);

  tabs[0].emit("click");
  assert.equal(tabs[0].getAttribute("aria-selected"), "true");
  assert.equal(panels[0].hidden, false);

  tabs[0].emit("keydown", { key: "ArrowRight", preventDefault() {} });
  assert.equal(focused, tabs[1]);
  assert.equal(panels[1].hidden, false);
  assert.equal(activeCaseName.textContent, "目前授權案件");
  assert.equal(calendarCaseContext.textContent, "只顯示目前登入乙方的授權案件。");
  assert.equal(tabs[1].classList.contains("on"), true);
  tabs[1].emit("keydown", { key: "End", preventDefault() {} });
  assert.equal(focused, tabs[1]);
  tabs[1].emit("keydown", { key: "Home", preventDefault() {} });
  assert.equal(focused, tabs[0]);
  tabs[0].emit("keydown", { key: "ArrowLeft", preventDefault() {} });
  assert.equal(focused, tabs[1]);

  let prevented = false;
  links[1].emit("click", { preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(focused, tabs[1]);
  assert.equal(panels[1].hidden, false);

  view.location.hash = "#reviews";
  windowListeners.get("hashchange")?.();
  assert.equal(focused, tabs[0]);
  assert.equal(panels[0].hidden, false);
  assert.deepEqual(childActivations, ["overview", "records"]);
  assert.equal(links[2].getAttribute("aria-current"), "location");
  assert.equal(links[0].getAttribute("aria-current"), null);

  tabs[0].emit("keydown", { key: "ArrowLeft", preventDefault() {} });
  assert.equal(focused, tabs[1]);
  assert.equal(links[2].getAttribute("aria-current"), null, "manual keyboard navigation clears the old route claim");
  assert.equal(runtime.resolveVendorWorkspaceTabForFragment("#records"), "design");
  assert.equal(runtime.resolveVendorWorkspaceTabForFragment("#execution"), "construction");
  assert.equal(runtime.resolveVendorWorkspaceTabForFragment("#case-focus"), null);
});

test("vendor cloned Element resolves ownerDocument view for initial and changed fragments", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "element-owner-document-view"));

  function element(dataset = {}, href = null) {
    const attributes = new Map();
    const listeners = new Map();
    return {
      dataset: { ...dataset },
      hidden: false,
      tabIndex: 0,
      textContent: "",
      addEventListener(type, listener) { listeners.set(type, listener); },
      focus() {},
      getAttribute(name) { return name === "href" ? href : attributes.get(name) ?? null; },
      getBoundingClientRect() { return { top: 120 }; },
      removeAttribute(name) { attributes.delete(name); },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
  }

  const workspaceTabs = ["design", "construction"].map((key) => element({ vendorWorkspaceTab: key }));
  const workspacePanels = ["design", "construction"].map((key) => element({ vendorWorkspacePanel: key }));
  const contractTabs = ["overview", "reply", "decision", "records"].map((key) => element({ vendorContractView: key }));
  const contractPanels = ["overview", "reply", "decision", "records"].map((key) => element({ vendorContractViewPanel: key }));
  const routeLinks = ["#documents", "#execution", "#reviews", "#records"].map((href) => element({}, href));
  const targets = Object.fromEntries(routeLinks.map((link) => [link.getAttribute("href"), element()]));
  const viewListeners = new Map();
  const view = {
    location: { hash: "#reviews" },
    scrollY: 0,
    addEventListener(type, listener) {
      const listeners = viewListeners.get(type) ?? [];
      listeners.push(listener);
      viewListeners.set(type, listeners);
    },
    scrollTo() {},
  };
  const root = {
    ownerDocument: { defaultView: view },
    querySelector(selector) {
      if (selector === "[data-vendor-workspace-live]") return element();
      return targets[selector] ?? null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-vendor-workspace-tab]") return workspaceTabs;
      if (selector === "[data-vendor-workspace-panel]") return workspacePanels;
      if (selector === "[data-vendor-contract-view]") return contractTabs;
      if (selector === "[data-vendor-contract-view-panel]") return contractPanels;
      if (selector === "[data-vendor-workspace-route]") return routeLinks;
      return [];
    },
  };

  const contractController = runtime.initializeVendorContractViewTabs(root);
  runtime.initializeVendorWorkspaceTabs(root, contractController);
  assert.equal(workspacePanels[0].hidden, false);
  assert.equal(contractPanels[3].hidden, false);
  assert.equal(routeLinks[2].getAttribute("aria-current"), "location");

  view.location.hash = "#execution";
  for (const listener of viewListeners.get("hashchange") ?? []) listener();
  assert.equal(workspacePanels[1].hidden, false);
  assert.equal(routeLinks[1].getAttribute("aria-current"), "location");

  view.location.hash = "#documents";
  for (const listener of viewListeners.get("hashchange") ?? []) listener();
  assert.equal(workspacePanels[0].hidden, false);
  assert.equal(contractPanels[0].hidden, false);
  assert.equal(routeLinks[0].getAttribute("aria-current"), "location");
});

test("vendor Google Calendar Hero leads the main workspace without a conversation sidecar", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);
  const authorizedMarkup = vendorAuthorizedTemplate(html);
  const calendarHeroStart = authorizedMarkup.indexOf("data-vendor-calendar-hero");
  const documentImportStart = authorizedMarkup.indexOf("data-vendor-document-import");
  const designPanelStart = authorizedMarkup.indexOf('data-vendor-workspace-panel="design"');
  const constructionPanelStart = authorizedMarkup.indexOf('data-vendor-workspace-panel="construction"');

  assert.ok(calendarHeroStart >= 0);
  assert.ok(documentImportStart > calendarHeroStart);
  assert.ok(designPanelStart > documentImportStart);
  assert.ok(constructionPanelStart > designPanelStart);
  assert.match(authorizedMarkup, /案件行程[\s\S]*data-vendor-calendar-live-events/u);
  assert.doesNotMatch(authorizedMarkup, /vendor-workspace-sidecar|data-line-conversation|LINE 三方群組|LINE 案件對話/u);
  assert.match(css, /\.vendor-calendar-hero\s*\{[\s\S]{0,260}min-block-size:\s*clamp\(480px,\s*62vh,\s*680px\)/u);
  assert.match(css, /\.vendor-calendar-live-events\s*\{/u);
  assert.match(css, /\.vendor-calendar-event\s*\{/u);

  for (const kind of ["design", "construction"]) {
    const panel = vendorWorkspacePanel(authorizedMarkup, kind);
    assert.match(panel, /data-vendor-calendar-node-summary/u);
    assert.match(panel, /下一節點摘要/u);
    assert.match(panel, /href="#vendor-google-calendar-title"/u);
    assert.doesNotMatch(panel, /vendor-calendar-card|vendor-calendar-grid|乙方 Google 日曆尚未連結/u);
  }
});

test("round 1 document storage and work categories", async () => {
  const [html, css, runtimeSource] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
    readFile(pagePath(workspaceDir, "app.js"), "utf8"),
  ]);
  const authorizedMarkup = vendorAuthorizedTemplate(html);
  const designPanel = vendorWorkspacePanel(authorizedMarkup, "design");
  const constructionPanel = vendorWorkspacePanel(authorizedMarkup, "construction");

  assert.equal(count(authorizedMarkup, /\bdata-vendor-calendar-hero\b/gu), 1);
  assert.equal(count(authorizedMarkup, /class="[^"]*vendor-calendar-grid[^"]*"/gu), 0);
  assert.equal(count(authorizedMarkup, /\bdata-vendor-calendar-node-summary\b/gu), 2);
  assert.equal(count(authorizedMarkup, /href="#vendor-google-calendar-title"/gu), 2);

  assert.equal(count(authorizedMarkup, /\bdata-vendor-document-storage(?:\s|>)/gu), 1);
  assert.match(authorizedMarkup, /data-vendor-document-storage[^>]*data-expanded="false"/u);
  assert.match(authorizedMarkup, /data-vendor-document-toggle[^>]*aria-expanded="false"[^>]*aria-controls="vendor-document-storage-panel"/u);
  assert.match(authorizedMarkup, /data-vendor-document-add/u);
  assert.match(authorizedMarkup, /data-vendor-document-recent-version/u);
  assert.match(authorizedMarkup, /id="vendor-document-storage-panel"[^>]*hidden/u);

  assert.equal(count(authorizedMarkup, /\bdata-vendor-workspace-tab=/gu), 2);
  for (const [panel, labels] of [
    [designPanel, ["今日待辦", "圖面與版本", "契約與回覆", "決策留痕"]],
    [constructionPanel, ["今日任務", "變更與驗收", "施工文件與照片", "案件留痕"]],
  ]) {
    assert.equal(count(panel, /\bdata-vendor-work-subtab=/gu), 4);
    assert.equal(count(panel, /\bdata-vendor-work-subpanel=/gu), 4);
    for (const label of labels) assert.match(visibleText(panel), new RegExp(label, "u"));
  }

  assert.match(runtimeSource, /VENDOR_DESIGN_SUBTAB_KEYS\s*=\s*freezeList\([\s\S]*"today"[\s\S]*"drawings"[\s\S]*"contract"[\s\S]*"records"/u);
  assert.match(runtimeSource, /VENDOR_CONSTRUCTION_SUBTAB_KEYS\s*=\s*freezeList\([\s\S]*"today"[\s\S]*"changes"[\s\S]*"files"[\s\S]*"records"/u);
  assert.match(runtimeSource, /initializeVendorWorkSubtabs/u);
  assert.match(runtimeSource, /initializeVendorDocumentStorage/u);
  assert.match(css, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.vendor-work-subtabs\s*\{[\s\S]{0,220}grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/u);
  assert.match(css, /\.vendor-work-subtab[\s\S]{0,360}min-block-size:\s*var\(--workspace-control-min\)/u);
});

test("round 1 document storage and work categories retain queue and roving state", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "round-1-document-work-tabs"));
  let focused = null;
  let pickerClicks = 0;

  function node(dataset = {}, ownerDocument = null) {
    const attributes = new Map();
    const listeners = new Map();
    return {
      dataset: { ...dataset },
      ownerDocument,
      children: [],
      hidden: false,
      tabIndex: 0,
      textContent: "",
      value: "",
      className: "",
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(type, listener) { listeners.set(type, listener); },
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      click() { pickerClicks += 1; listeners.get("click")?.({ target: this }); },
      emit(type, event = {}) { return listeners.get(type)?.(event); },
      focus() { focused = this; },
      getAttribute(name) { return attributes.get(name) ?? null; },
      replaceChildren(...children) { this.children = children; },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
  }

  assert.deepEqual(ownListValues(runtime.VENDOR_DESIGN_SUBTAB_KEYS), ["today", "drawings", "contract", "records"]);
  assert.deepEqual(ownListValues(runtime.VENDOR_CONSTRUCTION_SUBTAB_KEYS), ["today", "changes", "files", "records"]);
  assert.equal(runtime.resolveVendorWorkSubtabKey("design", "today", "ArrowRight"), "drawings");
  assert.equal(runtime.resolveVendorWorkSubtabKey("design", "today", "End"), "records");
  assert.equal(runtime.resolveVendorWorkSubtabKey("construction", "records", "Home"), "today");

  const tabs = [];
  const panels = [];
  for (const [scope, keys] of [
    ["design", ["today", "drawings", "contract", "records"]],
    ["construction", ["today", "changes", "files", "records"]],
  ]) {
    for (const key of keys) {
      tabs.push(node({ vendorWorkScope: scope, vendorWorkSubtab: key }));
      panels.push(node({ vendorWorkScope: scope, vendorWorkSubpanel: key }));
    }
  }
  const live = node();
  const workRoot = {
    querySelector(selector) { return selector === "[data-vendor-workspace-live]" ? live : null; },
    querySelectorAll(selector) {
      if (selector === "[data-vendor-work-subtab]") return tabs;
      if (selector === "[data-vendor-work-subpanel]") return panels;
      return [];
    },
  };
  runtime.initializeVendorWorkSubtabs(workRoot);
  assert.equal(panels[0].hidden, false);
  assert.equal(panels[1].hidden, true);
  tabs[0].emit("keydown", { key: "ArrowRight", preventDefault() {} });
  assert.equal(focused, tabs[1]);
  assert.equal(panels[1].hidden, false);
  assert.equal(panels[0].hidden, true);
  assert.match(live.textContent, /圖面與版本/u);

  const ownerDocument = { createElement() {} };
  ownerDocument.createElement = () => node({}, ownerDocument);
  const storage = node({ expanded: "false" }, ownerDocument);
  const storagePanel = node({}, ownerDocument);
  storagePanel.hidden = true;
  const toggle = node({}, ownerDocument);
  const add = node({}, ownerDocument);
  const picker = node({}, ownerDocument);
  picker.id = "vendor-document-picker";
  const dropzone = node({}, ownerDocument);
  const queue = node({}, ownerDocument);
  const empty = node({}, ownerDocument);
  const countNode = node({}, ownerDocument);
  const status = node({}, ownerDocument);
  const storageNodes = new Map([
    ["[data-vendor-document-storage]", storage],
    ["#vendor-document-storage-panel", storagePanel],
    ["[data-vendor-document-toggle]", toggle],
    ["[data-vendor-document-add]", add],
    ["[data-vendor-document-dropzone]", dropzone],
    ["[data-vendor-document-picker]", picker],
    ["[data-vendor-document-queue]", queue],
    ["[data-vendor-document-empty]", empty],
    ["[data-vendor-document-count]", countNode],
    ["[data-vendor-document-import-status]", status],
  ]);
  const storageRoot = { querySelector(selector) { return storageNodes.get(selector) ?? null; } };
  const storageController = runtime.initializeVendorDocumentStorage(storageRoot);
  assert.equal(storageController.state, "READY");
  assert.equal(storagePanel.hidden, true);
  add.emit("click");
  assert.equal(storagePanel.hidden, false);
  assert.equal(pickerClicks, 1);
  storageController.collapse();
  const importController = runtime.initializeVendorDocumentImport(storageRoot, storageController);
  importController.stageFiles([
    { name: "平面配置-v3.pdf", size: 2048, type: "application/pdf", lastModified: 1 },
  ], "裝置選擇");
  assert.equal(storagePanel.hidden, false, "selecting a file expands the storage tool");
  assert.equal(queue.children.length, 1);
  storageController.collapse();
  assert.equal(queue.children.length, 1, "collapsing the toolbar keeps the session-only queue");
});

test("PHASE A: Calendar Hero and document import lead the authorized workspace without touching the public gate", async () => {
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  const header = html.match(/<header class="vendor-header" id="top">[\s\S]*?<\/header>/u)?.[0] ?? "";
  const authorizedMarkup = vendorAuthorizedTemplate(html);
  const publicMarkup = vendorPublicMarkup(html);
  const calendarHeroStart = authorizedMarkup.indexOf("data-vendor-calendar-hero");
  const documentImportStart = authorizedMarkup.indexOf("data-vendor-document-import");
  const managementWorkspaceStart = authorizedMarkup.indexOf("vendor-workspace-shell");

  assert.equal(
    createHash("sha256").update(header).digest("hex"),
    "3a7288f5e97f1ed63b6dc3073dd2bd831a668c74baee5e697cf771cba9aeb90d",
    "the frozen Header DOM, copy, attributes, and aria bytes must stay exact",
  );
  for (const label of [
    "Decision &amp; Record System",
    "裝潢決策系統",
    "目前角色",
    "受邀乙方｜設計師／統包",
    "授權狀態",
    "身分與案件範圍尚待確認",
  ]) {
    assert.match(header, new RegExp(label, "u"), label);
  }

  assert.equal(count(authorizedMarkup, /\bdata-vendor-calendar-hero\b/gu), 1);
  assert.ok(calendarHeroStart >= 0, "Calendar Hero must exist in the authorized template");
  assert.ok(documentImportStart > calendarHeroStart, "document import must follow Calendar Hero");
  assert.ok(managementWorkspaceStart > documentImportStart, "management tabs must follow the two new top-level areas");
  assert.match(authorizedMarkup, /data-vendor-calendar-hero[\s\S]*data-vendor-calendar-state="loading"/u);
  assert.match(authorizedMarkup, /data-vendor-calendar-hero[\s\S]*data-vendor-calendar-live-events/u);
  assert.match(authorizedMarkup, /data-vendor-calendar-events/u);
  assert.match(authorizedMarkup, /data-vendor-calendar-today/u);
  assert.match(authorizedMarkup, /data-vendor-calendar-seven-days/u);
  assert.match(authorizedMarkup, /data-vendor-calendar-next-step/u);
  assert.match(authorizedMarkup, /data-vendor-calendar-responsibility/u);

  assert.equal(count(authorizedMarkup, /\bdata-vendor-document-import(?:\s|>)/gu), 1);
  assert.match(authorizedMarkup, /data-vendor-document-dropzone/u);
  assert.match(authorizedMarkup, /<input[^>]*type="file"[^>]*data-vendor-document-picker/iu);
  assert.match(authorizedMarkup, /data-vendor-document-queue/u);
  assert.doesNotMatch(authorizedMarkup, /data-vendor-line-import|LINE 文件匯入/u);
  assert.match(authorizedMarkup, /data-vendor-document-upload[^>]*disabled[^>]*aria-disabled="true"/u);
  assert.match(authorizedMarkup, /文件上傳正在整理中/u);

  assert.doesNotMatch(publicMarkup, /data-vendor-calendar-hero|data-vendor-document-import|data-vendor-document-dropzone|LINE 文件匯入/u);
  assert.doesNotMatch(authorizedMarkup, /LINE 三方群組|LINE 案件對話|line-conversation|vendor-workspace-sidecar/u);
});

test("PHASE A: document picker and drop stage supported files locally without claiming an upload", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "phase-a-document-import"));

  function makeNode(ownerDocument = null) {
    const listeners = new Map();
    const classes = new Set();
    const attributes = new Map();
    return {
      ownerDocument,
      children: [],
      hidden: false,
      textContent: "",
      value: "",
      className: "",
      classList: {
        add(value) { classes.add(value); },
        remove(value) { classes.delete(value); },
      },
      addEventListener(type, listener) { listeners.set(type, listener); },
      append(...nodes) { this.children.push(...nodes); },
      appendChild(node) { this.children.push(node); },
      emit(type, event = {}) { return listeners.get(type)?.(event); },
      replaceChildren(...nodes) { this.children = nodes; },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
  }

  const ownerDocument = { createElement() {} };
  ownerDocument.createElement = () => makeNode(ownerDocument);
  const dropzone = makeNode(ownerDocument);
  const picker = makeNode(ownerDocument);
  picker.id = "vendor-document-picker";
  const queue = makeNode(ownerDocument);
  const empty = makeNode(ownerDocument);
  const countNode = makeNode(ownerDocument);
  const status = makeNode(ownerDocument);
  const nodes = new Map([
    ["[data-vendor-document-dropzone]", dropzone],
    ["[data-vendor-document-picker]", picker],
    ["[data-vendor-document-queue]", queue],
    ["[data-vendor-document-empty]", empty],
    ["[data-vendor-document-count]", countNode],
    ["[data-vendor-document-import-status]", status],
  ]);
  const controller = runtime.initializeVendorDocumentImport({
    querySelector(selector) { return nodes.get(selector) ?? null; },
  });

  assert.equal(controller.state, "READY");
  assert.equal(controller.stageFiles([
    { name: "平面配置-v3.pdf", size: 2048, type: "application/pdf", lastModified: 1 },
    { name: "現場照片.jpg", size: 4096, type: "image/jpeg", lastModified: 2 },
    { name: "未知格式.exe", size: 16, type: "application/octet-stream", lastModified: 3 },
  ], "裝置選擇"), 2);
  assert.equal(queue.children.length, 2);
  assert.equal(empty.hidden, true);
  assert.equal(countNode.textContent, "共 2 份・尚未送出");
  assert.match(status.textContent, /尚未送出/u);
  assert.equal(queue.children[0].children[0].children[0].textContent, "平面配置-v3.pdf");
  assert.match(queue.children[1].children[0].children[1].children[2].textContent, /影像文件・待確認/u);
  assert.equal(queue.children[0].children[0].children[1].children[3].textContent, "目前案件：目前授權案件");
  assert.equal(queue.children[0].children[0].children[1].children[8].textContent, "上傳狀態：待上傳");

  queue.children[0].children[1].emit("click");
  assert.equal(queue.children.length, 1);
  dropzone.emit("drop", {
    preventDefault() {},
    dataTransfer: { files: [{ name: "驗收照片.png", size: 8192, type: "image/png", lastModified: 4 }] },
  });
  assert.equal(queue.children.length, 2);
  assert.equal(countNode.textContent, "共 2 份・尚未送出");
});

test("vendor calendar embed resolves only a trusted active pro grant and clears stale frames", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "vendor-calendar-grant"));
  const grant = {
    schemaVersion: "laibe.vendor-calendar-embed.v1",
    authenticatedUserId: "vendor-42",
    currentCaseId: "case-7",
    membership: {
      userId: "vendor-42",
      caseId: "case-7",
      role: "pro",
      status: "active",
    },
    calendarBinding: {
      userId: "vendor-42",
      caseId: "case-7",
      connectionStatus: "connected",
      bindingStatus: "active",
      calendarId: "vendor+case@example.com",
      timeZone: "Asia/Taipei",
    },
  };

  const ready = runtime.resolveVendorCalendarEmbed(grant);
  assert.equal(ready.state, "READY");
  assert.equal(
    ready.iframeSrc,
    "https://calendar.google.com/calendar/embed?src=vendor%2Bcase%40example.com&ctz=Asia%2FTaipei&hl=zh_TW&mode=AGENDA&showTitle=0&showPrint=0&showTabs=0&showCalendars=0",
  );
  assert.equal(Object.getPrototypeOf(ready), null);
  assert.equal(Object.isFrozen(ready), true);

  const wrongIdentity = runtime.resolveVendorCalendarEmbed({
    ...grant,
    authenticatedUserId: "another-vendor",
  });
  assert.equal(wrongIdentity.state, "IDENTITY_MISMATCH");
  assert.equal(wrongIdentity.iframeSrc, null);
  assert.equal(
    runtime.resolveVendorCalendarEmbed({
      ...grant,
      membership: { ...grant.membership, role: "owner" },
    }).state,
    "CASE_NOT_AUTHORIZED",
  );
  assert.equal(
    runtime.resolveVendorCalendarEmbed({
      ...grant,
      calendarBinding: { ...grant.calendarBinding, connectionStatus: "disconnected" },
    }).state,
    "CALENDAR_NOT_CONNECTED",
  );
  assert.equal(
    runtime.resolveVendorCalendarEmbed({
      ...grant,
      calendarBinding: { ...grant.calendarBinding, connectionStatus: "expired" },
    }).state,
    "CALENDAR_CONNECTION_EXPIRED",
  );

  let getterCalled = false;
  const hostileBinding = {
    userId: "vendor-42",
    caseId: "case-7",
    connectionStatus: "connected",
    bindingStatus: "active",
    get calendarId() { getterCalled = true; return "other@example.com"; },
    timeZone: "Asia/Taipei",
  };
  assert.equal(
    runtime.resolveVendorCalendarEmbed({ ...grant, calendarBinding: hostileBinding }).state,
    "INVALID_CALENDAR_BINDING",
  );
  assert.equal(getterCalled, false);

  const attributes = new Map([["src", "https://calendar.google.com/stale"]]);
  const frame = {
    hidden: false,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; },
  };
  const empty = { hidden: true };
  const status = { textContent: "" };
  const root = {
    querySelector(selector) {
      if (selector === "[data-vendor-calendar-frame]") return frame;
      if (selector === "[data-vendor-calendar-empty]") return empty;
      if (selector === "[data-vendor-calendar-status]") return status;
      return null;
    },
  };

  runtime.initializeVendorCalendarEmbed(root, grant);
  assert.equal(frame.hidden, false);
  assert.equal(empty.hidden, true);
  assert.match(frame.getAttribute("src"), /vendor%2Bcase%40example\.com/u);
  assert.equal(status.textContent, "已連結目前乙方的 Google 日曆");

  runtime.initializeVendorCalendarEmbed(root, null);
  assert.equal(frame.getAttribute("src"), null);
  assert.equal(frame.hidden, true);
  assert.equal(empty.hidden, false);
  assert.equal(status.textContent, "尚未連結乙方 Google 日曆");
});

test("vendor calendar guidance stays in-page and renders only bounded server-read event fields", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "vendor-calendar-live-events"));
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  const authorizedMarkup = vendorAuthorizedTemplate(html);

  for (const [selector, label] of [
    ["data-vendor-calendar-description-link", "本日工作說明"],
    ["data-vendor-calendar-notification-link", "活動通知"],
    ["data-vendor-calendar-open-link", "案件日曆"],
  ]) {
    assert.match(
      authorizedMarkup,
      new RegExp(`${selector}[^>]*aria-disabled="true"[^>]*>${label}`, "u"),
      selector,
    );
  }
  assert.doesNotMatch(authorizedMarkup, /blueleft0120@gmail\.com/u);
  assert.doesNotMatch(authorizedMarkup, /calendar\.google\.com|data-vendor-calendar-frame/iu);

  function elementNode() {
    return {
      children: [],
      textContent: "",
      append(...children) { this.children.push(...children); },
    };
  }
  const ownerDocument = { createElement: () => elementNode() };
  const eventList = {
    children: [],
    ownerDocument,
    replaceChildren(...children) { this.children = children; },
  };
  const liveEvents = { hidden: true };
  const eventsEmpty = { hidden: true };
  const empty = { hidden: false };
  const today = { textContent: "" };
  const sevenDays = { textContent: "" };
  const root = {
    querySelector(selector) {
      if (selector === "[data-vendor-calendar-empty]") return empty;
      if (selector === "[data-vendor-calendar-live-events]") return liveEvents;
      if (selector === "[data-vendor-calendar-events]") return eventList;
      if (selector === "[data-vendor-calendar-events-empty]") return eventsEmpty;
      if (selector === "[data-vendor-calendar-today]") return today;
      if (selector === "[data-vendor-calendar-seven-days]") return sevenDays;
      return null;
    },
  };

  const result = runtime.initializeVendorCalendarEvents(root, {
    state: "ready",
    timeZone: "Asia/Taipei",
    events: [{
      eventId: "provider-id-must-not-render",
      etag: "provider-etag-must-not-render",
      title: "泥作進場",
      description: "本日工作說明：確認施工動線。",
      start: "2026-08-25T09:00:00+08:00",
      end: "2026-08-25T12:00:00+08:00",
      status: "confirmed",
    }],
  });
  assert.equal(result.state, "READY");
  assert.equal(liveEvents.hidden, false);
  assert.equal(empty.hidden, true);
  assert.equal(eventList.children.length, 1);
  assert.equal(eventList.children[0].children[1].textContent, "泥作進場");
  assert.match(eventList.children[0].children[2].textContent, /本日工作說明/u);
  assert.doesNotMatch(JSON.stringify(eventList.children), /provider-id|provider-etag/u);
  assert.match(today.textContent, /1 筆/u);
  assert.match(sevenDays.textContent, /1 筆/u);
});

test("vendor workspace and calendar loaders use the authenticated Supabase transport", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "vendor-calendar-fetch"));
  const calls = [];
  const membership = {
    userId: "vendor-42",
    caseId: "case-7",
    role: "pro",
    status: "active",
  };
  const workspaceGrant = {
    schemaVersion: "laibe.vendor-workspace-auth.v1",
    state: "AUTHORIZED_VENDOR_WORKSPACE",
    authenticatedUserId: "vendor-42",
    currentCaseId: "case-7",
    membership,
    workspaceAccess: {
      role: "pro",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
  };
  const supportGrant = {
    state: "connected",
    timeZone: "Asia/Taipei",
    capabilities: ["read", "create", "update", "cancel"],
  };
  const authRuntime = {
    async authenticatedFetch(endpoint, init = {}) {
      calls.push({ endpoint, init });
      if (endpoint === "vendor-workspace-grant") {
        return new Response(JSON.stringify(workspaceGrant), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (endpoint === "vendor-google-calendar-support-grant") {
        return new Response(JSON.stringify(supportGrant), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        state: "oauth_pending",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=opaque",
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  };

  assert.deepEqual(await runtime.fetchVendorWorkspaceGrant(authRuntime), workspaceGrant);
  assert.equal(calls[0].endpoint, "vendor-workspace-grant");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(Object.hasOwn(calls[0].init, "body"), false);

  assert.deepEqual(await runtime.fetchVendorGoogleCalendarSupportGrant(authRuntime), supportGrant);
  assert.equal(calls[1].endpoint, "vendor-google-calendar-support-grant");
  assert.equal(calls[1].init.method, "POST");
  assert.equal(calls[1].init.body, "{}");

  const started = await runtime.startVendorGoogleCalendarOAuth(authRuntime);
  assert.equal(started.state, "oauth_pending");
  assert.equal(calls[2].endpoint, "vendor-google-calendar-connect-start");
  assert.equal(calls[2].init.method, "POST");
  assert.equal(calls[2].init.headers["content-type"], "application/json");
  assert.equal(calls[2].init.body, "{}");

  const serializedCalls = JSON.stringify(calls);
  assert.doesNotMatch(serializedCalls, /userId|caseId|calendarId|role|gmail/i);
  assert.equal(
    await runtime.fetchVendorWorkspaceGrant({
      async authenticatedFetch() {
        return new Response(JSON.stringify({ state: "AUTHORIZED_VENDOR_WORKSPACE" }), { status: 200 });
      },
    }),
    null,
  );
});

test("A15 vendor calendar transport maps all seven server-owned routes without client authority", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "a15-vendor-calendar-transport"));
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  const runtimeSource = await readFile(pagePath(workspaceDir, "app.js"), "utf8");
  const authorizedMarkup = vendorAuthorizedTemplate(html);
  const calls = [];
  const responses = new Map([
    ["vendor-google-calendar-support-grant", { status: 200, body: {
      state: "connected",
      timeZone: "Asia/Taipei",
      capabilities: ["read", "create", "update", "cancel"],
    } }],
    ["vendor-google-calendar-events-read", { status: 200, body: {
      state: "ready",
      timeZone: "Asia/Taipei",
      events: [{
        eventId: "opaque-event-ref",
        etag: "etag-1",
        title: "泥作進場",
        description: "本日工作說明",
        start: "2026-08-25T09:00:00+08:00",
        end: "2026-08-25T12:00:00+08:00",
        status: "confirmed",
      }],
    } }],
    ["vendor-google-calendar-connect-start", { status: 200, body: {
      state: "oauth_pending",
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=opaque",
    } }],
    ["vendor-google-calendar-events-create", { status: 201, body: {
      state: "created",
      event: { eventId: "opaque-event-ref", etag: "etag-1" },
    } }],
    ["vendor-google-calendar-events-update", { status: 200, body: {
      state: "updated",
      event: { eventId: "opaque-event-ref", etag: "etag-2" },
    } }],
    ["vendor-google-calendar-events-cancel", { status: 200, body: {
      state: "cancelled",
      event: { eventId: "opaque-event-ref", etag: "etag-3", status: "cancelled" },
    } }],
  ]);
  const authRuntime = {
    async authenticatedFetch(endpoint, init = {}) {
      calls.push({ endpoint, init });
      const response = responses.get(endpoint);
      return response
        ? new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: { "content-type": "application/json" },
        })
        : new Response(JSON.stringify({ state: "invalid_request" }), { status: 400 });
    },
  };
  const window = {
    timeMin: "2026-08-25T00:00:00+08:00",
    timeMax: "2026-09-01T23:59:59+08:00",
  };
  const eventInput = {
    idempotencyKey: "calendar-create-1",
    title: "泥作進場",
    description: "本日工作說明",
    start: "2026-08-25T09:00:00+08:00",
    end: "2026-08-25T12:00:00+08:00",
    basis: "工程排程 v2",
    workNotes: "施工前確認動線",
    tradeNotes: "泥作",
    nextOwner: "乙方工務",
  };

  assert.equal(
    runtime.VENDOR_GOOGLE_CALENDAR_CONNECT_CALLBACK_ENDPOINT,
    "vendor-google-calendar-connect-callback",
  );

  const grant = await runtime.fetchVendorGoogleCalendarSupportGrant(authRuntime);
  assert.equal(grant.state, "connected");
  assert.deepEqual(grant.capabilities, ["read", "create", "update", "cancel"]);
  const events = await runtime.fetchVendorGoogleCalendarEvents(authRuntime, window);
  assert.equal(events.state, "ready");
  assert.equal(events.events[0].eventId, "opaque-event-ref");
  assert.equal((await runtime.startVendorGoogleCalendarOAuth(authRuntime)).state, "oauth_pending");
  assert.equal((await runtime.createVendorGoogleCalendarEvent(authRuntime, eventInput)).state, "created");
  assert.equal((await runtime.updateVendorGoogleCalendarEvent(authRuntime, {
    ...eventInput,
    idempotencyKey: "calendar-update-1",
    eventId: "opaque-event-ref",
    etag: "etag-1",
  })).state, "updated");
  assert.equal((await runtime.cancelVendorGoogleCalendarEvent(authRuntime, {
    idempotencyKey: "calendar-cancel-1",
    eventId: "opaque-event-ref",
    etag: "etag-2",
    reason: "工序調整",
    basis: "工程變更紀錄 v1",
    workNotes: "",
    tradeNotes: "泥作",
    nextOwner: "乙方工務",
  })).state, "cancelled");

  assert.deepEqual(calls.map(({ endpoint }) => endpoint), [
    "vendor-google-calendar-support-grant",
    "vendor-google-calendar-events-read",
    "vendor-google-calendar-connect-start",
    "vendor-google-calendar-events-create",
    "vendor-google-calendar-events-update",
    "vendor-google-calendar-events-cancel",
  ]);
  assert.equal(calls.every(({ init }) => init.method === "POST"), true);
  assert.equal(calls.every(({ init }) => init.headers["content-type"] === "application/json"), true);
  assert.deepEqual(JSON.parse(calls[0].init.body), {});
  assert.deepEqual(JSON.parse(calls[1].init.body), window);
  assert.doesNotMatch(JSON.stringify(calls), /authenticatedUserId|currentCaseId|caseId|calendarId|googleSubject|roleIntent|gmail/iu);
  assert.match(authorizedMarkup, /data-vendor-calendar-live-events/u);
  assert.match(authorizedMarkup, /data-vendor-calendar-events/u);
  assert.doesNotMatch(authorizedMarkup, /data-vendor-calendar-(?:create|update|cancel)-action/u);
  const serverBoot = runtimeSource.match(/export async function initializeVendorWorkspaceFromServer[\s\S]*?const documentRoot/u)?.[0] ?? "";
  assert.match(serverBoot, /fetchVendorWorkspaceGrant[\s\S]*refreshVendorCalendarSupportFromServer/u);
  assert.doesNotMatch(serverBoot, /calendarGrant|resolveVendorCalendarEmbed|localStorage|sessionStorage|location\.(?:search|hash)/u);
});

test("authorized vendor calendar connect keeps the workspace open and renders events only after the server grant is connected", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "vendor-calendar-connect"));
  const workspaceMarkup = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  assert.match(
    workspaceMarkup,
    /點擊後會另開 Google 授權視窗；完成後，本頁會自動載入已核對的日曆。/u,
  );
  const listeners = new Map();
  const navigations = [];
  const calls = [];
  const button = {
    disabled: false,
    addEventListener(type, listener) { listeners.set(type, listener); },
    setAttribute() {},
  };
  const actionStatus = { textContent: "" };
  const calendarStatus = { textContent: "" };
  const empty = { hidden: false };
  const hero = { dataset: {} };
  function elementNode() {
    return {
      children: [],
      textContent: "",
      append(...children) { this.children.push(...children); },
    };
  }
  const ownerDocument = { createElement: () => elementNode() };
  const eventList = {
    children: [],
    ownerDocument,
    replaceChildren(...children) { this.children = children; },
  };
  const liveEvents = { hidden: true };
  const eventsEmpty = { hidden: true };
  const root = {
    querySelector(selector) {
      if (selector === "[data-vendor-calendar-connect]") return button;
      if (selector === "[data-vendor-calendar-action-status]") return actionStatus;
      if (selector === "[data-vendor-calendar-status]") return calendarStatus;
      if (selector === "[data-vendor-calendar-empty]") return empty;
      if (selector === "[data-vendor-calendar-hero]") return hero;
      if (selector === "[data-vendor-calendar-live-events]") return liveEvents;
      if (selector === "[data-vendor-calendar-events]") return eventList;
      if (selector === "[data-vendor-calendar-events-empty]") return eventsEmpty;
      return null;
    },
  };
  let grantReads = 0;
  const authRuntime = {
    async authenticatedFetch(endpoint, init) {
      calls.push({ endpoint, init });
      if (endpoint === "vendor-google-calendar-support-grant") {
        grantReads += 1;
        return grantReads === 1
          ? new Response(JSON.stringify({ state: "calendar_not_connected" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          })
          : new Response(JSON.stringify({
            state: "connected",
            timeZone: "Asia/Taipei",
            capabilities: ["read", "create", "update", "cancel"],
          }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
      }
      if (endpoint === "vendor-google-calendar-events-read") {
        return new Response(JSON.stringify({
          state: "ready",
          timeZone: "Asia/Taipei",
          events: [{
            eventId: "opaque-event-ref",
            etag: "etag-1",
            title: "泥作進場",
            description: "確認本日施工動線",
            start: "2026-08-25T09:00:00+08:00",
            end: "2026-08-25T12:00:00+08:00",
            status: "confirmed",
          }],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        state: "oauth_pending",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=opaque",
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  };
  const authorizationWindow = {
    closed: false,
    location: {
      assign(href) { navigations.push(href); },
    },
    close() { this.closed = true; },
  };

  const result = runtime.initializeVendorGoogleCalendarActions(root, {
    authRuntime,
    openAuthorizationWindow: () => authorizationWindow,
    wait: async () => {},
    maxPollAttempts: 2,
  });
  assert.equal(result.state, "READY");
  assert.equal(typeof listeners.get("click"), "function");

  await listeners.get("click")({ preventDefault() {} });

  assert.equal(calls.length, 4);
  assert.equal(calls[0].endpoint, "vendor-google-calendar-connect-start");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[1].endpoint, "vendor-google-calendar-support-grant");
  assert.equal(calls[2].endpoint, "vendor-google-calendar-support-grant");
  assert.equal(calls[3].endpoint, "vendor-google-calendar-events-read");
  assert.deepEqual(navigations, ["https://accounts.google.com/o/oauth2/v2/auth?state=opaque"]);
  assert.equal(authorizationWindow.closed, true);
  assert.equal(empty.hidden, true);
  assert.equal(liveEvents.hidden, false);
  assert.equal(eventList.children.length, 1);
  assert.equal(eventList.children[0].children[1].textContent, "泥作進場");
  assert.equal(calendarStatus.textContent, "已連結目前乙方的 Google 日曆");
  assert.equal(button.disabled, true);
});

test("formal vendor page bootstraps only from the real-session workspace grant", async () => {
  const runtime = await readFile(pagePath(workspaceDir, "app.js"), "utf8");

  assert.match(runtime, /getSupabaseAuthRuntime/u);
  assert.match(runtime, /initializeVendorWorkspaceFromServer\(documentRoot/u);
  assert.doesNotMatch(
    runtime,
    /initializeVendorWorkspace\(\s*documentRoot\s*,\s*AUTHORIZED_VENDOR_WORKSPACE/u,
  );
  assert.doesNotMatch(runtime, /preview=authorized|URLSearchParams|user_metadata|app_metadata/u);
});

test("vendor resource ownership is grouped under design and construction management", async () => {
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  const panel = (kind) => vendorWorkspacePanel(html, kind);
  const resourceCodes = (source) => [...source.matchAll(/data-resource-code="([A-Z_]+)"/gu)]
    .map((match) => match[1]);

  assert.deepEqual(resourceCodes(panel("design")), [
    "CONTRACT_DRAFT_VERSIONS",
    "ATTACHMENTS",
    "PUBLIC_PCM_REVIEWS",
    "SUPPLEMENTS",
    "ADDENDA",
    "CASE_RECORDS",
  ]);
  assert.deepEqual(resourceCodes(panel("construction")), [
    "CHANGES",
    "ACCEPTANCE",
    "SCHEDULES",
    "EVIDENCE",
  ]);
  assert.match(panel("design"), /雙方確認/u);
  assert.match(panel("design"), /新版本/u);
  assert.match(panel("design"), /責任人/u);
  assert.doesNotMatch(panel("design"), /class="message-panel"/u);
  for (const fragment of ["documents", "execution", "reviews", "records"]) {
    assert.match(html, new RegExp(`id="${fragment}"`, "u"), fragment);
    assert.match(html, new RegExp(`data-vendor-workspace-route[^>]*href="#${fragment}"|href="#${fragment}"[^>]*data-vendor-workspace-route`, "u"), fragment);
  }
});

test("vendor contract draft classifies every material impact as a change proposal", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "contract-classification"));
  const impactKeys = ownListValues(
    runtime.VENDOR_CONTRACT_IMPACT_KEYS,
    "VENDOR_CONTRACT_IMPACT_KEYS",
  );

  assert.deepEqual(impactKeys, [
    "SCOPE",
    "PRICE",
    "TIME",
    "PAYMENT",
    "ACCEPTANCE",
    "MATERIAL",
    "WARRANTY",
  ]);
  assert.equal(runtime.classifyVendorContractEntry([]), "SUPPLEMENT");
  for (const key of impactKeys) {
    assert.equal(runtime.classifyVendorContractEntry([key]), "CHANGE_PROPOSAL", key);
  }
  assert.equal(
    runtime.classifyVendorContractEntry(["UNRECOGNIZED_IMPACT"]),
    "CHANGE_PROPOSAL",
    "unknown impact must not be under-classified as a supplement",
  );
});

test("vendor contract reducer keeps a session-only draft without synthesizing formal states", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "contract-reducer"));
  const initial = runtime.createVendorContractDraftState();

  assert.equal(initial.description, "");
  assert.deepEqual(ownListValues(initial.impactKeys, "impact keys"), []);
  assert.equal(initial.classification, "SUPPLEMENT");
  assert.equal(initial.relatedVersion, "");
  assert.deepEqual(
    Object.fromEntries(Object.entries(initial.attachmentMetadata)),
    { fileName: "", versionLabel: "", note: "" },
  );
  assert.equal(initial.vendorResponseIntent, "");
  assert.equal(initial.ownerDecisionStatus, "NOT_RECORDED");
  assert.equal(initial.partyAgreementStatus, "NOT_RECORDED");
  assert.equal(initial.drsReviewStatus, "NOT_REQUESTED");
  assert.equal(initial.paymentStatus, "NOT_RECORDED");
  assert.equal(initial.persistenceStatus, "SESSION_ONLY");

  const described = runtime.reduceVendorContractDraft(initial, {
    type: "DESCRIPTION_CHANGED",
    value: "玄關收邊材料補充說明",
    ownerDecisionStatus: "APPROVED",
    partyAgreementStatus: "AGREED",
    paymentStatus: "RELEASED",
    persistenceStatus: "SAVED",
  });
  const impacted = runtime.reduceVendorContractDraft(described, {
    type: "IMPACT_TOGGLED",
    key: "MATERIAL",
  });
  const versioned = runtime.reduceVendorContractDraft(impacted, {
    type: "RELATED_VERSION_CHANGED",
    value: "契約 v3",
  });
  const attached = runtime.reduceVendorContractDraft(versioned, {
    type: "ATTACHMENT_METADATA_CHANGED",
    field: "fileName",
    value: "玄關材料說明.pdf",
  });
  const responded = runtime.reduceVendorContractDraft(attached, {
    type: "VENDOR_RESPONSE_INTENT_CHANGED",
    value: "REQUEST_OWNER_REVIEW",
  });

  assert.equal(responded.description, "玄關收邊材料補充說明");
  assert.deepEqual(ownListValues(responded.impactKeys, "impact keys"), ["MATERIAL"]);
  assert.equal(responded.classification, "CHANGE_PROPOSAL");
  assert.equal(responded.relatedVersion, "契約 v3");
  assert.equal(responded.attachmentMetadata.fileName, "玄關材料說明.pdf");
  assert.equal(responded.vendorResponseIntent, "REQUEST_OWNER_REVIEW");
  assert.equal(responded.ownerDecisionStatus, "NOT_RECORDED");
  assert.equal(responded.partyAgreementStatus, "NOT_RECORDED");
  assert.equal(responded.drsReviewStatus, "NOT_REQUESTED");
  assert.equal(responded.paymentStatus, "NOT_RECORDED");
  assert.equal(responded.persistenceStatus, "SESSION_ONLY");

  const toggledOff = runtime.reduceVendorContractDraft(responded, {
    type: "IMPACT_TOGGLED",
    key: "MATERIAL",
  });
  assert.equal(toggledOff.classification, "SUPPLEMENT");
  assert.deepEqual(ownListValues(toggledOff.impactKeys, "impact keys"), []);
  assert.deepEqual(
    runtime.reduceVendorContractDraft(toggledOff, { type: "CLEAR" }),
    runtime.createVendorContractDraftState(),
  );
});

test("vendor contract reducer normalizes hostile session-shaped state on every event", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "contract-hostile-state"));
  const forged = {
    description: "浴室材料替代說明",
    impactKeys: ["MATERIAL"],
    classification: "SUPPLEMENT",
    relatedVersion: "契約 v4",
    attachmentMetadata: {
      fileName: "材料表.pdf",
      versionLabel: "v2",
      note: "供甲方確認",
    },
    vendorResponseIntent: "REQUEST_OWNER_REVIEW",
    ownerDecisionStatus: "APPROVED",
    partyAgreementStatus: "AGREED",
    drsReviewStatus: "APPROVED",
    paymentStatus: "RELEASED",
    persistenceStatus: "SESSION_ONLY",
    formalSubmissionStatus: "SUBMITTED",
    signatureStatus: "SIGNED",
    extraAuthority: true,
  };

  const normalized = runtime.reduceVendorContractDraft(forged, { type: "UNKNOWN_EVENT" });

  assert.notEqual(normalized, forged);
  assert.equal(normalized.description, "浴室材料替代說明");
  assert.deepEqual(ownListValues(normalized.impactKeys, "normalized impacts"), ["MATERIAL"]);
  assert.equal(normalized.classification, "CHANGE_PROPOSAL");
  assert.equal(normalized.relatedVersion, "契約 v4");
  assert.equal(normalized.attachmentMetadata.fileName, "材料表.pdf");
  assert.equal(normalized.vendorResponseIntent, "REQUEST_OWNER_REVIEW");
  assert.equal(normalized.ownerDecisionStatus, "NOT_RECORDED");
  assert.equal(normalized.partyAgreementStatus, "NOT_RECORDED");
  assert.equal(normalized.drsReviewStatus, "NOT_REQUESTED");
  assert.equal(normalized.paymentStatus, "NOT_RECORDED");
  assert.equal(normalized.persistenceStatus, "SESSION_ONLY");
  assert.equal(Object.hasOwn(normalized, "formalSubmissionStatus"), false);
  assert.equal(Object.hasOwn(normalized, "signatureStatus"), false);
  assert.equal(Object.hasOwn(normalized, "extraAuthority"), false);
});

test("trusted structural rendering never enables write save send or signature controls", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "contract-authority"));

  function control() {
    const attributes = new Map();
    return {
      disabled: false,
      getAttribute(name) { return attributes.get(name) ?? null; },
      removeAttribute(name) { attributes.delete(name); },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
  }

  function rootFor(generalControl, contractControl) {
    const mount = {
      replaceChildren() {},
      querySelector() { return null; },
      querySelectorAll(selector) {
        if (selector === "[data-write-action]") return [generalControl, contractControl];
        return [];
      },
    };
    return {
      body: { setAttribute() {} },
      querySelector(selector) {
        if (selector === "#vendor-authorized-workspace-template") {
          return {
            content: {
              cloneNode() {
                return {
                  querySelectorAll(fragmentSelector) {
                    if (fragmentSelector === "[data-write-action]") return [generalControl, contractControl];
                    return [];
                  },
                };
              },
            },
          };
        }
        if (selector === "#vendor-authorized-workspace-mount") return mount;
        return null;
      },
      querySelectorAll(selector) {
        if (selector === "[data-write-action]") return [generalControl, contractControl];
        if (selector === "[data-vendor-contract-control]") return [contractControl];
        return [];
      },
    };
  }

  const deniedGeneral = control();
  const deniedContract = control();
  const denied = runtime.initializeVendorWorkspace(
    rootFor(deniedGeneral, deniedContract),
    { code: "AUTHORIZED_VENDOR_WORKSPACE" },
  );
  assert.equal(denied, runtime.CONTEXT_UNAVAILABLE);
  assert.equal(deniedGeneral.disabled, true);
  assert.equal(deniedContract.disabled, true);
  assert.equal(deniedContract.getAttribute("aria-disabled"), "true");

  const authorizedGeneral = control();
  const authorizedContract = control();
  const authorizedState = runtime.VENDOR_WORKSPACE_CANONICAL_STATES.AUTHORIZED_VENDOR_WORKSPACE;
  const authorized = runtime.initializeVendorWorkspace(
    rootFor(authorizedGeneral, authorizedContract),
    authorizedState,
  );
  assert.equal(authorized, authorizedState);
  assert.equal(authorizedGeneral.disabled, true, "workspace writes stay closed");
  assert.equal(authorizedContract.disabled, true, "contract writes stay closed");
  assert.equal(authorizedContract.getAttribute("aria-disabled"), "true");
});

test("trusted vendor structural rendering leaves contract controls inert", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "contract-dom-inert"));
  const attributes = new Map();
  let listenerCount = 0;
  const control = {
    disabled: false,
    addEventListener() { listenerCount += 1; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
  };
  const mount = {
    replaceChildren() {},
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === "[data-write-action]") return [control];
      return [];
    },
  };
  const root = {
    body: { setAttribute() {} },
    querySelector(selector) {
      if (selector === "#vendor-authorized-workspace-template") {
        return {
          content: {
            cloneNode() {
              return {
                querySelectorAll(fragmentSelector) {
                  if (fragmentSelector === "[data-write-action]") return [control];
                  return [];
                },
              };
            },
          },
        };
      }
      if (selector === "#vendor-authorized-workspace-mount") return mount;
      return null;
    },
    querySelectorAll() { return []; },
  };

  assert.equal(
    runtime.initializeVendorWorkspace(root, runtime.AUTHORIZED_VENDOR_WORKSPACE),
    runtime.AUTHORIZED_VENDOR_WORKSPACE,
  );
  assert.equal(control.disabled, true);
  assert.equal(attributes.get("aria-disabled"), "true");
  assert.equal(listenerCount, 0, "disabled controls receive no session mutation handlers");
});

test("vendor design management exposes a truthful disabled contract reply state and decision boundary", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);
  const contractPanel = vendorWorkspacePanel(html, "design");

  assert.match(contractPanel, /契約範本預覽/u);
  assert.match(contractPanel, /目前狀態/u);
  assert.match(contractPanel, /責任人/u);
  assert.match(contractPanel, /待我回覆/u);
  assert.match(contractPanel, /補件或說明可能影響/u);
  assert.match(contractPanel, /回覆內容/u);
  assert.match(contractPanel, /尚未送出／尚未保存/u);
  assert.match(contractPanel, /離開頁面後不保留內容/u);
  assert.match(contractPanel, /乙方回覆/u);
  assert.match(contractPanel, /甲方決定/u);
  assert.match(contractPanel, /雙方確認/u);
  assert.match(contractPanel, /新版本/u);
  assert.match(contractPanel, /data-write-action[^>]*disabled[^>]*aria-disabled="true"/u);
  assert.doesNotMatch(contractPanel, /已送出|已保存|已簽署|已同意|已付款/u);
  assert.match(css, /\.vendor-disabled-field\s*\{/u);
  assert.match(css, /\.vendor-decision-grid\s*\{/u);
  assert.match(
    css,
    /@media\s*\(max-width:\s*768px\)[\s\S]*?\.vendor-decision-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/u,
  );
});

test("vendor contract template preview uses the shared reader without claiming a case version", async () => {
  const previewPage = path.join(
    repositoryRoot,
    "site",
    "standard_contract_editor",
    "code.html",
  );
  const [vendorHtml, previewHtml] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(previewPage, "utf8"),
  ]);
  const vendorCard = vendorHtml.match(/<article\s+class="vendor-contract-preview"[\s\S]*?<\/article>/u)?.[0] ?? "";
  const vendorHref = vendorCard.match(/href="([^"]+)"/u)?.[1] ?? "";
  const vendorPreviewUrl = new URL(vendorHref.replaceAll("&amp;", "&"), pathToFileURL(pagePath(workspaceDir, "code.html")));

  assert.equal(vendorPreviewUrl.searchParams.get("contractType"), "DESIGN_BUILD");
  assert.equal(vendorPreviewUrl.searchParams.get("returnTo"), "vendor");
  assert.match(vendorCard, /契約範本預覽/u);
  assert.match(vendorCard, /不是本案已成立契約/u);
  assert.doesNotMatch(vendorCard, /v0\.2|本案共同契約|甲乙共同契約/u);
  assert.match(previewHtml, /--book-cover:\s*#C94318/iu);
  assert.match(previewHtml, /class="contract-book__spine"/u);
  assert.match(previewHtml, /class="contract-book__reader contract-reading"/u);
  assert.match(previewHtml, /id="contract-book"[^>]*aria-label="專案契約唯讀預覽"/u);
});

test("vendor design management keeps contract work bounded inside the approved category", async () => {
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  const panel = vendorWorkspacePanel(html, "design");
  const tabsStart = panel.indexOf('data-vendor-work-subtab="contract"');
  const contractPanelStart = panel.indexOf('data-vendor-work-subpanel="contract"');
  const previewStart = panel.indexOf('class="vendor-contract-preview"');
  const replyStart = panel.indexOf("補件或說明可能影響");

  assert.ok(previewStart >= 0, "shared preview exists");
  assert.ok(tabsStart >= 0 && tabsStart < previewStart, "work categories precede the preview");
  assert.ok(contractPanelStart > tabsStart && contractPanelStart < previewStart, "contract content stays in its category");
  assert.ok(replyStart > previewStart, "disabled reply state follows the template preview");
  assert.match(panel, /待我回覆/u);
  assert.match(panel, /補件或說明可能影響/u);
  assert.match(panel, /契約附件/u);
  assert.match(panel, /甲方決定/u);
  assert.match(panel, /data-write-action[^>]*disabled/u);
  assert.doesNotMatch(panel, /<details[^>]*data-vendor-contract-editor/u);
  assert.doesNotMatch(panel, /data-vendor-contract-view=/u);
  assert.match(panel, /乙方回覆不等於甲方同意/u);
  assert.doesNotMatch(panel, /data-owner-contract-fact/u);
});

test("vendor authorized workspace is one flat data-first surface while the public gate stays separate", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);

  const publicMarkup = vendorPublicMarkup(html);
  const authorizedMarkup = vendorAuthorizedTemplate(html);
  assert.match(publicMarkup, /class="vendor-gate"/u);
  assert.doesNotMatch(publicMarkup, /class="vendor-workspace"/u);
  assert.match(authorizedMarkup, /class="vendor-workspace"/u);
  assert.equal(count(authorizedMarkup, /class="vendor-workspace-panel"/gu), 2);
  assert.match(css, /linear-gradient/u);
  assert.match(css, /\.vendor-workspace\s*\{[\s\S]{0,300}border:\s*1px solid var\(--workspace-line\)/u);
  assert.match(css, /\.canvas\s*\{[\s\S]{0,300}background:\s*var\(--canvas\)/u);
});

test("vendor workspace offers one permission-safe share action for every document resource", async () => {
  const [html, css, runtimeSource] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
    readFile(pagePath(workspaceDir, "app.js"), "utf8"),
  ]);

  const authorizedMarkup = vendorAuthorizedTemplate(html);
  const resourceMatches = [...authorizedMarkup.matchAll(/data-resource-code="([A-Z_]+)"/gu)]
    .map((match) => match[1]);
  const shareMatches = [...authorizedMarkup.matchAll(/data-vendor-document-share="([A-Z_]+)"/gu)]
    .map((match) => match[1]);
  assert.deepEqual(resourceMatches.sort(), [...resourceCodes].sort());
  assert.deepEqual(shareMatches.sort(), [...resourceCodes].sort());
  assert.match(css, /\.vendor-document-share\s*\{/u);
  assert.match(runtimeSource, /resolveVendorDocumentShareTarget/u);
  assert.match(runtimeSource, /initializeVendorDocumentSharing/u);
  assert.doesNotMatch(`${html}\n${css}\n${runtimeSource}`, /LINE 三方群組|LINE 案件對話|line-conversation|vendor-workspace-sidecar|vendor-gate-chat/u);
  assert.doesNotMatch(vendorPublicMarkup(html), /calendar\.google\.com|blueleft0120/iu);
});

test("all visible write controls stay disabled and browser-derived authority is absent", async () => {
  for (const directory of [invitationDir, workspaceDir]) {
    const [html, runtime] = await Promise.all([
      readFile(pagePath(directory, "code.html"), "utf8"),
      readFile(pagePath(directory, "app.js"), "utf8"),
    ]);
    const controls = html.match(/<(?:button|input|textarea|select)\b[^>]*\bdata-write-action\b[^>]*>/giu) ?? [];
    assert.ok(controls.length > 0, directory);
    for (const control of controls) {
      assert.match(control, /\bdisabled\b/iu, control);
      assert.match(control, /\baria-disabled="true"/iu, control);
    }
    assert.doesNotMatch(
      runtime,
      /\b(?:XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|URLSearchParams)\b|location\.(?:search|hash)|document\.cookie/iu,
      directory,
    );
    if (directory === workspaceDir) {
      assert.match(runtime, /vendor-workspace-grant/u);
      assert.match(runtime, /vendor-google-calendar-grant/u);
      assert.match(runtime, /vendor-google-calendar-oauth-start/u);
      assert.match(runtime, /authenticatedFetch/u);
      assert.doesNotMatch(runtime, /fetch\(["']https?:\/\//iu);
    }
    assert.doesNotMatch(runtime, /\.innerHTML\s*=|insertAdjacentHTML|eval\s*\(/iu, directory);
  }
});

test("local references language UTF-8 and accessibility source stay bounded", async () => {
  const forbiddenVisibleLanguage = /招標|投標|競標|媒合|最低價|金流託管|支付託管|代收代付|付款保障|老屋投資|投資報酬|翻修獲利|裝修理財|raw JSON|stack trace|debug|mock-only|無 DB 寫入|API 未開|404/iu;
  for (const directory of [invitationDir, workspaceDir]) {
    const [htmlBytes, css] = await Promise.all([
      readFile(pagePath(directory, "code.html")),
      readFile(pagePath(directory, "styles.css"), "utf8"),
    ]);
    const html = new TextDecoder("utf-8", { fatal: true }).decode(htmlBytes);
    assert.doesNotMatch(visibleText(html), forbiddenVisibleLanguage, directory);
    assert.match(css, /:focus-visible/iu, directory);
    assert.match(css, /min-(?:block-)?size:\s*(?:var\([^)]*44|44px)|--[^:]+:\s*44px/iu, directory);
    assert.match(css, /@media\s*\(max-width:\s*768px\)/iu, directory);
    assert.match(css, /@media\s*\(max-width:\s*420px\)/iu, directory);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/iu, directory);
    assert.match(css, /overflow-x:\s*(?:clip|hidden)/iu, directory);
    await assertLocalReferences(directory);
    execFileSync(process.execPath, ["--check", pagePath(directory, "app.js")], {
      cwd: repositoryRoot,
      stdio: "pipe",
    });
  }
});

test("vendor 設計管理以四個工作次分類整理今日、圖面、契約與留痕", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);
  const contractPanel = vendorWorkspacePanel(html, "design");

  assert.equal((contractPanel.match(/data-vendor-work-scope="design" data-vendor-work-subtab="(?:today|drawings|contract|records)"/g) || []).length, 4);
  for (const label of ["今日待辦", "圖面與版本", "契約與回覆", "決策留痕"]) {
    assert.match(contractPanel, new RegExp(label));
  }
  assert.match(contractPanel, /contractType=DESIGN_BUILD&amp;returnTo=vendor/u);
  assert.match(contractPanel, /唯讀範本，不是本案已成立契約/u);
  assert.match(contractPanel, /尚未送出／尚未保存/u);
  assert.doesNotMatch(contractPanel, /甲乙內容一致|本案共同契約|v0\.2/u);
  assert.match(css, /\.vendor-work-subtabs\s*\{/u);
});

test("vendor 契約內層任務分頁支援循環方向鍵與 Home End", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "contract-view-tabs"));
  assert.deepEqual(
    ownListValues(runtime.VENDOR_CONTRACT_VIEW_KEYS, "VENDOR_CONTRACT_VIEW_KEYS"),
    ["overview", "reply", "decision", "records"],
  );
  assert.equal(runtime.resolveVendorContractViewKey("overview", "ArrowRight"), "reply");
  assert.equal(runtime.resolveVendorContractViewKey("overview", "ArrowLeft"), "records");
  assert.equal(runtime.resolveVendorContractViewKey("decision", "Home"), "overview");
  assert.equal(runtime.resolveVendorContractViewKey("reply", "End"), "records");
  assert.equal(runtime.resolveVendorContractViewKey("reply", "Escape"), "reply");
});

test("vendor 契約內層任務分頁以已定義 token 顯示非僅靠顏色的鍵盤焦點", async () => {
  const css = await readFile(pagePath(workspaceDir, "styles.css"), "utf8");
  const focusRule = css.match(
    /:where\(a, button, textarea, summary\):focus-visible\s*\{([^}]*)\}/u,
  )?.[1] ?? "";

  assert.match(css, /--workspace-paper:\s*#[0-9a-f]{6}\s*;/iu);
  assert.match(focusRule, /outline:\s*3px solid var\(--workspace-amber\)\s*;/u);
  assert.match(focusRule, /outline-offset:\s*3px\s*;/u);
  assert.doesNotMatch(focusRule, /var\(--paper\)/u);
});

test("契約預覽返回乙方工作台時直接開啟待我回覆而不是契約總覽", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "contract-return-task"));

  assert.equal(
    runtime.resolveVendorWorkspaceTabForFragment("#vendor-contract-view-panel-reply"),
    "design",
  );
  assert.equal(
    runtime.resolveVendorContractViewFromFragment("#vendor-contract-view-panel-reply"),
    "reply",
  );
  assert.equal(
    runtime.resolveVendorContractViewFromFragment("#vendor-contract-view-panel-decision"),
    "decision",
  );
  assert.equal(
    runtime.resolveVendorContractViewFromFragment("#vendor-contract-view-panel-records"),
    "records",
  );
  assert.equal(runtime.resolveVendorContractViewFromFragment("#execution"), null);
});

test("local visual preview harness opens only the exported authorized template without production bypass", async () => {
  const [harnessHtml, vendorRuntime, routeManifest] = await Promise.all([
    readFile(vendorWorkspacePreviewHarnessPath, "utf8"),
    readFile(pagePath(workspaceDir, "app.js"), "utf8"),
    readFile(pcmRouteManifestPath, "utf8"),
  ]);

  assert.doesNotMatch(
    visibleText(harnessHtml),
    /本機視覺驗收｜非正式登入｜不含真實案件資料|TEMPORARY_VISUAL_PREVIEW|AUTHORIZED_TEMPLATE_VISUAL_ONLY|REAL_AUTH_CONNECTED=FALSE|REAL_CASE_DATA=FALSE|WRITE_CONTROLS=DISABLED/u,
  );
  assert.doesNotMatch(harnessHtml, /class="visual-preview-banner"/u);
  assert.match(harnessHtml, /TEMPORARY_VISUAL_PREVIEW/u);
  assert.match(harnessHtml, /AUTHORIZED_TEMPLATE_VISUAL_ONLY/u);
  assert.match(harnessHtml, /REAL_AUTH_CONNECTED=FALSE/u);
  assert.match(harnessHtml, /REAL_CASE_DATA=FALSE/u);
  assert.match(harnessHtml, /WRITE_CONTROLS=DISABLED/u);
  assert.match(
    harnessHtml,
    /<iframe\b[^>]*\bsrc="\/src\/stitch_laibe_landing_onboarding\/pcm_standalone\/vendor_workspace\/code\.html"/u,
  );
  assert.match(
    harnessHtml,
    /from\s+"\/src\/stitch_laibe_landing_onboarding\/pcm_standalone\/vendor_workspace\/app\.js"/u,
  );
  assert.match(
    harnessHtml,
    /vendorDocument\.createElement\(\s*["']script["']\s*\)[\s\S]{0,360}type\s*=\s*["']module["']/u,
  );
  assert.match(
    harnessHtml,
    /initializeVendorWorkspace\(\s*document,\s*vendorRuntime\.AUTHORIZED_VENDOR_WORKSPACE/u,
  );
  assert.match(
    harnessHtml,
    /window\.parent\.postMessage\([\s\S]{0,240}LOCAL_VISUAL_PREVIEW_HARNESS/u,
  );
  assert.match(
    harnessHtml,
    /frame\.addEventListener\(\s*["']load["'][\s\S]{0,240}openAuthorizedVisualTemplate/u,
  );
  assert.match(
    harnessHtml,
    /void\s+openAuthorizedVisualTemplate\(\)/u,
  );
  assert.match(
    harnessHtml,
    /frame\.addEventListener\(\s*["']load["'][\s\S]*?\);\s*void\s+openAuthorizedVisualTemplate\(\);/u,
  );
  assert.doesNotMatch(
    harnessHtml,
    /\?preview=authorized|preview=authorized|URLSearchParams|location\.search|document\.cookie|localStorage|sessionStorage|indexedDB|\bfetch\s*\(|caches\.|navigator\.serviceWorker/iu,
  );
  assert.doesNotMatch(
    harnessHtml,
    /\b(?:userId|caseId|calendarId|fakeSession|fakeRpc)\b|code:\s*["']AUTHORIZED_VENDOR_WORKSPACE["']/iu,
  );
  assert.match(
    harnessHtml,
    /querySelectorAll\(\s*["']\[data-write-action\]["']\s*\)[\s\S]{0,520}\.disabled\s*===\s*true[\s\S]{0,520}getAttribute\(\s*["']aria-disabled["']\s*\)\s*===\s*["']true["']/u,
  );
  assert.doesNotMatch(
    vendorRuntime,
    /preview=authorized|URLSearchParams|location\.search|document\.cookie|localStorage|sessionStorage|indexedDB/iu,
  );
  assert.doesNotMatch(
    routeManifest,
    /vendor-workspace-authorized-preview|TEMPORARY_VISUAL_PREVIEW/u,
  );
});
