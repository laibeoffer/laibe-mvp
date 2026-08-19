import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
const invitationDir = path.join(pcmRoot, "vendor_invitation");
const workspaceDir = path.join(pcmRoot, "vendor_workspace");
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
  const nextMarker = kind === "design"
    ? 'data-vendor-workspace-panel="construction"'
    : 'class="conversation-boundary"';
  const end = html.indexOf(nextMarker, start);
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

test("workspace copy preserves the contract attachment review and conversation boundaries", async () => {
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
  assert.match(html, /私人對話不會顯示/u);
  assert.doesNotMatch(html, /大型輸入|data-line-send|line-conversation__composer/u);
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
  assert.match(html, /class="vendor-workspace-shell"/u);
  assert.match(html, /class="vendor-workspace-stage"/u);
  assert.doesNotMatch(html, /data-vendor-workspace-tab="contract"|<iframe\b/iu);
  assert.doesNotMatch(`${html}\n${css}\n${runtimeSource}`, /\bowner-[a-z0-9_-]+/iu);
  assert.doesNotMatch(html, /data-document-(?:tab|panel|file|dropzone)|document-file-|PDF[^<]*拖/u);
  assert.match(css, /\.vendor-workspace-tabs\s*\{/u);
  assert.match(css, /\.vendor-workspace-tabs button\s*\{[\s\S]{0,700}border-radius:\s*11px 11px 0 0/u);
  assert.match(css, /\.vendor-workspace-tabs button\s*\{[\s\S]{0,700}linear-gradient/u);
  assert.match(css, /\.vendor-workspace-panel\s*\{/u);
  assert.match(css, /\.vendor-panel-facts\s*\{/u);
  assert.match(css, /\.vendor-status-rail\s*\{/u);
});

test("vendor redesign keeps the public document at a short authorization gate and the formal workspace inert", async () => {
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  const publicMarkup = vendorPublicMarkup(html);
  const authorizedMarkup = vendorAuthorizedTemplate(html);

  assert.match(publicMarkup, /id="invited-cases"/u);
  assert.match(publicMarkup, /目前無法開啟案件工作台/u);
  assert.match(publicMarkup, /尚未確認案件授權/u);
  assert.match(publicMarkup, /返回登入／帳號入口/u);
  assert.doesNotMatch(publicMarkup, /回到邀請確認|href="\.\.\/vendor_invitation\/code\.html"/u);
  assert.match(publicMarkup, /責任人[\s\S]*目前使用者/u);
  assert.match(publicMarkup, /id="vendor-authorized-workspace-mount"/u);
  assert.doesNotMatch(publicMarkup, /data-vendor-workspace-tab|role="tabpanel"/u);
  assert.doesNotMatch(publicMarkup, /契約範本|共同契約|v0\.2|案件 LINE|line-conversation|composer/u);
  assert.doesNotMatch(publicMarkup, /<button|<input|<textarea|<select/u);

  assert.notEqual(authorizedMarkup, "", "authorized workspace lives in an inert template");
  assert.equal(count(authorizedMarkup, /\bdata-vendor-workspace-tab=/gu), 2);
  assert.equal(count(authorizedMarkup, /\bdata-vendor-workspace-panel=/gu), 2);
  assert.deepEqual(
    [...authorizedMarkup.matchAll(/data-vendor-workspace-tab="[^"]+"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/gu)]
      .map((match) => match[1]),
    ["設計管理", "工程管理"],
  );
  assert.match(vendorWorkspacePanel(authorizedMarkup, "design"), /契約管理/u);
  assert.doesNotMatch(authorizedMarkup, /設計案管理|工程案管理|main-tabs/u);
  assert.match(authorizedMarkup, /id="case-conversation"/u);
  assert.doesNotMatch(authorizedMarkup, /line-conversation__composer|data-line-send/u);
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

test("production recovery binding enables only the manifest account route and closes null wrong or throwing getters", async () => {
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
    "../account_access/code.html#top",
  );
  assert.equal(active.action.getAttribute("href"), "../account_access/code.html#top");
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
    return {
      dataset: { ...dataset },
      disabled: false,
      hidden,
      tabIndex: 0,
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

  tabs[0].emit("click");
  assert.equal(tabs[0].getAttribute("aria-selected"), "true");
  assert.equal(panels[0].hidden, false);

  tabs[0].emit("keydown", { key: "ArrowRight", preventDefault() {} });
  assert.equal(focused, tabs[1]);
  assert.equal(panels[1].hidden, false);
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
    "SCHEDULES",
    "EVIDENCE",
    "CHANGES",
    "ACCEPTANCE",
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

test("vendor design management contains contract task tabs and keeps owner facts protected", async () => {
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  const panel = vendorWorkspacePanel(html, "design");
  const tabsStart = panel.indexOf('class="vendor-contract-view-tabs"');
  const previewStart = panel.indexOf('class="vendor-contract-preview"');
  const replyStart = panel.indexOf('data-vendor-contract-view-panel="reply"');

  assert.ok(previewStart >= 0, "shared preview exists");
  assert.ok(tabsStart >= 0 && tabsStart < previewStart, "task tabs precede the preview");
  assert.ok(replyStart > previewStart, "disabled reply state follows the template preview");
  assert.match(panel, /待我回覆/u);
  assert.match(panel, /補件或說明可能影響/u);
  assert.match(panel, /契約附件/u);
  assert.match(panel, /甲方決定/u);
  assert.match(panel, /data-write-action[^>]*disabled/u);
  assert.doesNotMatch(panel, /<details[^>]*data-vendor-contract-editor/u);
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
  assert.doesNotMatch(authorizedMarkup, /<iframe\b/iu);
  assert.match(css, /linear-gradient/u);
  assert.match(css, /\.vendor-workspace\s*\{[\s\S]{0,300}border:\s*1px solid var\(--workspace-line\)/u);
  assert.match(css, /\.vendor-workspace-panel\s*\{[\s\S]{0,160}background:\s*var\(--workspace-rail\)/u);
});

test("vendor public conversation is a secondary disclosure without a composer", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);

  const authorizedMarkup = vendorAuthorizedTemplate(html);
  const workspaceStart = authorizedMarkup.indexOf('class="vendor-workspace"');
  const conversationStart = authorizedMarkup.indexOf('id="case-conversation"');
  assert.ok(workspaceStart >= 0);
  assert.ok(conversationStart > workspaceStart);
  assert.match(authorizedMarkup, /<details class="conversation-boundary" id="case-conversation">/u);
  assert.match(authorizedMarkup, /與案件決定有關的公開對話紀錄/u);
  assert.match(authorizedMarkup, /私人對話不會顯示/u);
  assert.doesNotMatch(authorizedMarkup, /<form|data-line-send|line-conversation__composer/u);
  assert.doesNotMatch(html, /訊息已送出|已傳送訊息/u);
  assert.match(css, /\.conversation-boundary\s*\{/u);
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
      /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|URLSearchParams)\b|location\.(?:search|hash)|document\.cookie/iu,
      directory,
    );
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

test("vendor 設計管理以四個契約任務分頁說清共同預覽、待回覆、決定與紀錄", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);
  const contractPanel = vendorWorkspacePanel(html, "design");

  assert.equal((contractPanel.match(/data-vendor-contract-view="(?:overview|reply|decision|records)"/g) || []).length, 4);
  for (const label of ["契約總覽", "待我回覆", "變更與決定", "版本與紀錄"]) {
    assert.match(contractPanel, new RegExp(label));
  }
  assert.match(contractPanel, /contractType=DESIGN_BUILD&amp;returnTo=vendor/u);
  assert.match(contractPanel, /唯讀範本，不是本案已成立契約/u);
  assert.match(contractPanel, /尚未送出／尚未保存/u);
  assert.doesNotMatch(contractPanel, /甲乙內容一致|本案共同契約|v0\.2/u);
  assert.match(css, /\.vendor-contract-view-tabs\s*\{/u);
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
