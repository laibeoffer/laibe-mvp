# PCM Service Contract Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full v0.3 / 3.5% PCM service-contract reading and fail-closed signing page to the PCM standalone mainline, with a homepage Header entry.

**Architecture:** A static inert content module holds the complete legal text and metadata. A small page controller renders trusted static content, evaluates a typed readiness envelope without persistence, and leaves signing disabled until every trusted prerequisite is present. The homepage only adds the route and canonical fee copy; current routes and core aggregates remain unchanged.

**Tech Stack:** Semantic HTML, CSS custom properties, native ES modules, Node built-in test runner, static local HTTP browser acceptance.

## Global Constraints

- Work only in `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\aa-pcm-service-contract-20260802`.
- Exact source snapshot parent: `fd0220e2abcb6754b9055773b807b8359ba57c85`.
- Use only the ten paths listed in the design spec.
- No dependency install, package/lock, Supabase, Auth, server/proxy, shared-route, A5, A6 or production changes.
- Do not import or execute `site/shared/laibe-pcm-contract.js`.
- Keep legal status `READY_FOR_LEGAL_REVIEW`; signing must remain fail-closed.
- Do not push, open a PR, merge or deploy.

---

### Task 1: Lock the content and readiness contract with RED tests

**Files:**
- Create: `tests/pcm-service-contract.test.mjs`
- Modify: `tests/pcm-public-home.test.mjs`

**Interfaces:**
- Consumes: the frozen PCM source snapshot.
- Produces: tests for `CONTRACT_META`, `CONTRACT_SOURCE`, `LIFECYCLE`, `evaluateSigningReadiness()` and the new page route.

- [ ] **Step 1: Write the failing service-contract tests**

Use `node:test`, `node:assert/strict`, `node:fs/promises`, `node:path` and `pathToFileURL`. Assert:

```js
assert.equal(CONTRACT_META.version, "v0.3");
assert.equal(CONTRACT_META.ownerServiceFeeRate, "3.5%");
assert.equal(CONTRACT_META.legalReviewStatus, "READY_FOR_LEGAL_REVIEW");
assert.deepEqual(LIFECYCLE, [
  "DRAFT",
  "OWNER_ACCEPTANCE_PENDING",
  "OWNER_ACCEPTED_PROVIDER_PENDING",
  "ACTIVE",
]);
assert.match(CONTRACT_SOURCE, /## 第一條/);
assert.match(CONTRACT_SOURCE, /## 第二十八條/);
assert.match(CONTRACT_SOURCE, /# 附件十四/);
```

For readiness, build one fully ready envelope and delete or mutate each required field one at a time. Each mutation must return `{ ready: false }`; the complete envelope returns `{ ready: true, reasons: [] }`. Assert that the page's initial envelope remains false because legal review and trusted runtime facts are absent.

Assert the new source contains none of:

```js
[
  "localStorage",
  "PREVIEWED",
  "OWNER_SIGNED_PENDING_PCM_REVIEW",
  "PCM_REVIEWER_SIGNED_ACTIVE",
  "LEGAL_FINAL／律師核准",
]
```

- [ ] **Step 2: Extend the homepage test before production changes**

Assert the homepage contains:

```js
assert.match(html, /href="\.\.\/service_contract\/code\.html"/);
assert.match(html, />PCM 服務契約<\/a>/);
assert.match(html, /3\.5%/);
assert.doesNotMatch(html, /之 3%。/);
assert.match(css, /\.site-header nav > a:last-child[\s\S]*grid-column:\s*1\s*\/\s*-1/);
```

- [ ] **Step 3: Run RED and confirm the expected failure**

Run:

```powershell
node --test tests/pcm-service-contract.test.mjs tests/pcm-public-home.test.mjs
```

Expected: failure because `service_contract` modules/page and homepage route do not exist.

- [ ] **Step 4: Commit the RED tests**

```powershell
git add tests/pcm-service-contract.test.mjs tests/pcm-public-home.test.mjs
git commit -m "test(pcm): specify service contract integration"
```

### Task 2: Add inert v0.3 contract content

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/contract-content.js`
- Test: `tests/pcm-service-contract.test.mjs`

**Interfaces:**
- Produces immutable `CONTRACT_META`, `KEY_CLAUSES`, `CONTRACT_SOURCE` and `LIFECYCLE` exports.

- [ ] **Step 1: Define immutable metadata and lifecycle**

```js
export const CONTRACT_META = Object.freeze({
  version: "v0.3",
  displayVersion: "MVP v0.3 Draft",
  ownerServiceFeeRate: "3.5%",
  legalReviewStatus: "READY_FOR_LEGAL_REVIEW",
});

export const LIFECYCLE = Object.freeze([
  "DRAFT",
  "OWNER_ACCEPTANCE_PENDING",
  "OWNER_ACCEPTED_PROVIDER_PENDING",
  "ACTIVE",
]);
```

- [ ] **Step 2: Port only inert legal content**

Copy the exact eight `KEY_CLAUSES` entries and exact `contractSource` text from `C:\CodexWork\08-Jacky\laibe_MVP_project\site\shared\laibe-pcm-contract.js`. Remove all runtime fields and functions. Freeze the exported clause array and export the full source string unchanged, including Articles 1–28 and Annexes 1–14.

- [ ] **Step 3: Run focused tests**

```powershell
node --test tests/pcm-service-contract.test.mjs
```

Expected: content tests pass; readiness/page tests still fail until Task 3.

- [ ] **Step 4: Commit the inert content**

```powershell
git add src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/contract-content.js
git commit -m "feat(pcm): add inert v0.3 service contract content"
```

### Task 3: Build fail-closed readiness and the contract page

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/app.js`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/styles.css`
- Test: `tests/pcm-service-contract.test.mjs`

**Interfaces:**
- Consumes: `CONTRACT_META`, `KEY_CLAUSES`, `CONTRACT_SOURCE`, `LIFECYCLE`.
- Produces: `evaluateSigningReadiness(input)`, page rendering and print interaction.

- [ ] **Step 1: Implement the pure readiness evaluator**

```js
const SHA256 = /^[a-f0-9]{64}$/;

export function evaluateSigningReadiness(input = {}) {
  const reasons = [];
  if (!SHA256.test(input.contractVersionHash ?? "")) reasons.push("正式契約版本尚未固定");
  if (input.ownerIdentityVerified !== true || !input.ownerPartyId?.trim()) reasons.push("甲方身分尚未完成確認");
  const provider = input.serviceProviderPartySnapshot;
  if (provider?.partyType !== "natural_person" || !provider.partyId?.trim() || !provider.signatoryActorId?.trim()) {
    reasons.push("自然人服務方資料尚未完成確認");
  }
  if (input.writerReady !== true) reasons.push("正式簽署紀錄功能尚未就緒");
  if (input.legalReviewStatus !== "LEGAL_FINAL") reasons.push("契約仍在法務審閱中");
  return Object.freeze({ ready: reasons.length === 0, reasons: Object.freeze(reasons) });
}
```

Do not read global time, browser storage, URL parameters or mutable globals.

- [ ] **Step 2: Implement trusted static rendering**

Render the full contract by creating DOM elements and assigning `textContent`; do not use caller-supplied `innerHTML`. Generate stable section IDs from an explicit ordered heading map. Use numeric loops rather than prototype-dependent transforms for contract assembly.

The initial readiness envelope is:

```js
const INITIAL_SIGNING_ENVELOPE = Object.freeze({
  contractVersionHash: "",
  ownerIdentityVerified: false,
  ownerPartyId: "",
  serviceProviderPartySnapshot: null,
  writerReady: false,
  legalReviewStatus: CONTRACT_META.legalReviewStatus,
});
```

Set the signing button's native `disabled` property and `aria-disabled="true"` whenever `ready === false`. The print button calls `window.print()` only from an explicit click.

- [ ] **Step 3: Build semantic HTML structure**

Include:

- skip link, LaiBE logo and valid return route;
- status masthead with `v0.3`, `法務審閱中`, `草稿` and next step;
- orange document case;
- service summary and eight key clauses;
- sticky full-contract contents navigation and A4 article;
- readiness checklist, disabled signing button and print button;
- honest copy: no legal-final, runtime-ready or engineering language.

- [ ] **Step 4: Add responsive and print CSS**

Use the exact design tokens from the spec. At `max-width: 880px`, collapse the reading grid. At `max-width: 620px`, use one column, 44 px minimum controls and no horizontal overflow. Add `@media (prefers-reduced-motion: reduce)` and `@media print` that hides navigation/buttons and prints the A4 content in black on white.

- [ ] **Step 5: Run the service-contract tests**

```powershell
node --test tests/pcm-service-contract.test.mjs
```

Expected: all service-contract tests pass.

- [ ] **Step 6: Commit the page**

```powershell
git add src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract tests/pcm-service-contract.test.mjs
git commit -m "feat(pcm): add fail-closed service contract page"
```

### Task 4: Add the homepage entry and canonical fee

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css`
- Test: `tests/pcm-public-home.test.mjs`

**Interfaces:**
- Produces: valid link `../service_contract/code.html`, canonical 3.5% copy and mobile 2+2+1 navigation.

- [ ] **Step 1: Add the fifth Header item last**

```html
<a href="../service_contract/code.html">PCM 服務契約</a>
```

Preserve the existing four items and their routes.

- [ ] **Step 2: Replace the sole public 3% fee statement**

Use:

```html
<p>PCM 服務費為甲乙確認並納入契約的乙方報價版本之 3.5%。該報價版本會列入契約依據。</p>
```

- [ ] **Step 3: Extend Header CSS**

Add a fifth document icon using the existing `--nav-icon` pattern. Inside the `max-width: 620px` media query, set the last item to `grid-column: 1 / -1` and keep `min-height: 44px`.

- [ ] **Step 4: Run homepage and combined tests**

```powershell
node --test tests/pcm-public-home.test.mjs tests/pcm-service-contract.test.mjs tests/pcm-standalone-core.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit homepage integration**

```powershell
git add src/stitch_laibe_landing_onboarding/pcm_standalone/public_home tests/pcm-public-home.test.mjs
git commit -m "feat(pcm): link canonical service contract from home"
```

### Task 5: Static, security and browser acceptance

**Files:**
- Modify only the authorized page/test paths if a failure requires repair.

**Interfaces:**
- Produces fresh verification evidence and screenshots; no production deployment.

- [ ] **Step 1: Run complete focused verification**

```powershell
node --test tests/pcm-public-home.test.mjs tests/pcm-service-contract.test.mjs tests/pcm-standalone-core.test.mjs
Get-ChildItem src\stitch_laibe_landing_onboarding\pcm_standalone -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
git diff fd0220e2abcb6754b9055773b807b8359ba57c85..HEAD --check
```

Expected: zero test/syntax/diff failures.

- [ ] **Step 2: Run bounded forbidden scans**

Scan the new service-contract source for old statuses, localStorage, raw JSON/debug copy, escrow/custody/collection claims, investment language, Supabase/Auth/server imports and broken route strings. Expected: zero forbidden hits; the legally necessary statement that LaiBE does not receive or hold project money is allowed.

- [ ] **Step 3: Start a temporary local static server**

Start a hidden Python HTTP server rooted at the integration worktree on an available loopback port. Record its PID and stop it in `finally`; do not connect external services.

- [ ] **Step 4: Run Chromium acceptance**

Exercise:

- homepage → `PCM 服務契約`;
- contract summary → full contract;
- print button;
- disabled signing state and five reasons;
- return to PCM home.

Viewports: `390×844`, `768×1024`, `1280×720`, `1440×900`. Confirm no horizontal overflow, no clipped text, visible focus, valid assets and no new console errors.

- [ ] **Step 5: Final identity and clean-state gate**

```powershell
git status --porcelain
git rev-parse HEAD
git rev-parse 'HEAD^{tree}'
git diff --name-only fd0220e2abcb6754b9055773b807b8359ba57c85..HEAD
git diff --cached --name-only
```

Expected: exact authorized paths only, clean worktree and staged count zero.
