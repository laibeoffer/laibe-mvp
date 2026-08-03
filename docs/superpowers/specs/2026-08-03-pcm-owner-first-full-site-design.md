# LaiBE PCM Owner-First Full-Site Design

## Authority and candidate identity

- Design/source owner: A0｜design
- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a0-design-pcm-owner-first-integration-20260803`
- Branch: `a0/design-pcm-owner-first-integration-20260803`
- Seed: `3f6bddea936bdebd36846a239bc5d13c37e1d331`
- S0 integration: `0d81189e8cc7f7563fb390e17b524afabb5b3b54`
- Intermediate commit `888af2fb98f8a202e76ce3135d8e3f0ad66087fb` is `SUPERSEDED_PRE_CORRECTION` and is not admissible.
- First correction `9e268212f5b3050a1770f7e559508521f4cff4ec` received `CHANGES_REQUIRED` and is not admitted as the final T0 contract.
- Shared-system commit `2f1c9ac61128dd4646e7239ac38e9fbdd1620cc7` is the exact parent of the focused admission correction.
- Focused admission commit `403e4f7b84b3e5ee999db583bd23b65732e369d4` received `CHANGES_REQUIRED` because internal parsed context still depended on the shared Array iterator and the governance JSON contained duplicate evidence keys.
- T2 homepage work is byte-identically held outside the repository until the Array-iterator/evidence correction receives A0 focused admission.
- `403e4f7b84b3e5ee999db583bd23b65732e369d4` is historical T0 evidence only and is not the current review target.
- The current review target is the T3 hero-action correction whose sole correction parent is `74b606297c391615d76de505759bceda4756ec57`.
- This train owns G1 source only. G2 identity/role, G3 durable records, and G4 production remain closed.

## Product outcome

The owner-first PCM journey must let a Taiwan homeowner understand what can be checked, choose a quotation check or drawing check, register or sign in through one shared account entrance, create a case, decide whether to apply for formal PCM service, read and complete the contract flow, and then work with the three roles in traceable workspaces. Every failure has a plain-language reason, a responsible role, an executable next action, and a safe return or recovery route.

## Design Read

```yaml
artifact: public landing page plus owner-first PCM service flow
audience: homeowners first; invited vendors, PCM staff, and governance staff after their gates
visual-language: restrained dark LaiBE glass with evidence-first operational hierarchy
mode: redesign-preserve
visual-variance: 4
motion-intensity: 2
information-density: 6
asset-dependence: 4
brand-fidelity: 10
```

Preserve the real LaiBE logo, dark professional background, orange-red primary action, cyan viewing action, clear large typography, and existing valid route/anchor behavior. Improve state clarity, recovery, document responsibility, and responsive scanning. Remove duplicate process descriptions, dead destinations, demo cases, and any visual claim that G2–G4 is available.

## Canonical entry routes

### `/pcm/quote-check`

This is the only canonical quotation-check page. Introduction, consent, PDF selection, format checks, correction list, resubmission, and result are states of one page. It is not split into anonymous and registered variants. T3 activates this page at `../quote_check/code.html`; the drawing and account entrances remain planned with null hrefs.

### `/pcm/drawing-check`

This is the only canonical drawing-review page. Introduction, consent, upload, format checks, corrections, resubmission, and result are states of one page. It is not split by account state. Until T4 creates the page, its manifest lifecycle is `planned` and its local `href` is `null`.

### `/account/access`

This is the single shared registration and sign-in entrance for owners and invited vendors. The PCM homepage must expose a clear future entrance without creating a clickable 404. Until T5 creates the page, its manifest lifecycle is `planned` and its local `href` is `null`.

## Compatibility-only pages

`owner_start`, `document_corrections`, `basic_report`, and `self_service_archive` remain physically present during this train but are not canonical nodes and do not participate in canonical edges. They are listed only in `compatibilityAliases` with lifecycle `RETIRED_COMPATIBILITY`, a real compatibility file path, `canonicalHref: null`, and a replacement route. T17 performs the approved retirement work.

## Canonical owner-first journey

```text
PCM 公開首頁
├─ 報價健檢（單頁狀態機）
├─ 圖說檢討（單頁狀態機）
└─ 甲乙方共用註冊／登入
   → 案件建立、文件關聯與正式 PCM 申請分流
   → PCM 服務契約
   → 契約前置／待補
   → STEP 01–07 簽訂
   → 甲方 calendar-first 工作台
   → 乙方邀請／成員／工作台
   → PCM 授權案件與案件工作台
   → 內部治理
   → 案件紀錄中心
   → PCM 退出／案件取消／結案與三方確認
```

## Read-only outcomes

Only `PCM_EXITED_READ_ONLY` and `CASE_CLOSED_READ_ONLY` are canonical read-only outcomes. They do not create another workspace. An own primitive role of `owner` maps only to `ownerWorkspace`; an own primitive role of `vendor` maps only to `vendorWorkspace`. Missing, inherited, accessor-backed, non-primitive, or unknown roles fail closed to `accessUnavailable` with `ZERO_CASE_DATA`. Existing content stays visible only after G2 confirms authority, PCM no longer intervenes after exit, `mutationAllowed` is false, and `actions` is an empty list. Cancelled cases use the same role-bound original-workspace principle and retain only existing traceable content.

## Failure and recovery contract

`PCM_FLOW_FAILURE_MATRIX` is an immutable, typed-closed matrix. Each row contains:

- `code`
- plain-language `reason`
- `nextAction`
- `responsibleRole`
- `responsibleActor`, equal to the responsible role in this G1 contract
- `returnRoute`
- `recoveryRoute`
- an explicit closed `payloadPolicy`
- `mutationAllowed: false`

Identity, membership, access, and pre-membership invitation failures use `ZERO_CASE_DATA`. File failures retain only limited file metadata or submission/version references. Contract failures retain only contract references. Cancelled, PCM-exited, and closed cases preserve already-authorized case content as read-only without enabling new actions. The overdue-supplement state permits only viewing pending details, contacting the responsible actor, or returning to the original workspace; it does not claim a write or record action. Every failure code has a non-mutating recovery edge.

The required matrix covers invitation declined/expired/withdrawn/resend, missing paired quotation or drawing, invalid/oversized/wrong-page-count/unreadable/corrupted files, duplicate submission, version conflict, contract prerequisites, mutual version acceptance, identity/membership/access confirmation, overdue supplement, cancellation, PCM exit, and case closeout.

## Route safety

- Active nodes expose an existing local `href`.
- Planned nodes expose `href: null` and every edge targeting them has `clickable: false`.
- Retired nodes name a canonical replacement and expose no live `href`.
- Unknown, missing, malformed, or caller-asserted authority resolves to `accessUnavailable` with `ZERO_CASE_DATA` and no mutation.
- URL fragments, query values, browser storage, and caller booleans never grant G2, G3, or G4.
- Continuation context accepts only own data `intent` and optional own data `role` keys on a plain or null-prototype input. Captured structured cloning rejects Proxy input before routing; accessors, inherited values, extra caller assertions, hostile proxies, and revoked proxies fail closed.
- Authority decisions use closed equality/switch branches and module-load captured reflection primitives. Post-load `Object` or `Set` prototype pollution cannot select a protected route or escape the resolver.
- Parsed intent and role travel only through a frozen null-prototype own-data record and are read as scalar fields. No Array, destructuring, iterator, or other shared iterable can rewrite the internal authority decision.

## Shared first-screen facts

Operational pages show role, PCM contract state, case state, next responsible actor/action, and latest record. Loading, empty, failure, and recovery copy uses Traditional Chinese product language. The interface does not expose implementation vocabulary, raw data, stack traces, fabricated cases, payment custody/collection, investment claims, or claims that AI makes the final decision.

### T1 shared G1 contract

- `owner-first-tokens.css` defines the restrained near-black surfaces, orange-red primary action, cyan viewing action, typography, spacing, focus, and 44px control floor without claiming a page has adopted them.
- `owner-first-shell.css` provides one five-fact information spine, state copy layout, primary/secondary controls, 1280/768/390-safe sizing, clear keyboard focus, and reduced-motion behavior. It does not create a card wall or a second navigation system.
- `owner-first-state.js` exposes only frozen product-language state descriptions. Missing, malformed, inherited, hostile, URL-derived, or caller-asserted context resolves to `CONTEXT_UNAVAILABLE` with `ZERO_CASE_DATA` and no actions.
- The closed set is `CONTEXT_UNAVAILABLE`, `AUTH_REQUIRED`, `ACCESS_DENIED`, `PREREQUISITES_PENDING`, `SERVICE_PREPARING`, `PCM_EXITED_READ_ONLY`, and `CASE_CLOSED_READ_ONLY`.
- The two approved read-only outcomes preserve only previously authorized existing content in the original owner or vendor workspace. They never create a separate archive workspace and never enable mutation.

## Visual and interaction system

- Near-black restrained surfaces, the real LaiBE logo, orange-red primary action, and cyan secondary viewing action.
- One primary action per section; no card wall, thick borders, excessive gradients, emoji icons, or decorative motion.
- Visible controls at least 44×44 CSS pixels, clear `:focus-visible`, reduced-motion support, and zero horizontal overflow at 1280×900, 768×1024, and 390×844.
- Workspace pages favor task scanning, calendars, messages, responsibility, and records rather than marketing-sized headings.
- The quotation-check correction is also accepted at a 640 by 450 CSS viewport as the 200% zoom equivalent, with the same zero-overflow and 44px-target requirements.

## T3 single-page quotation check

`/pcm/quote-check` is one canonical page for owners who already have a vendor quotation PDF. It is an extension of the admitted LaiBE owner-first system, not a separate anonymous flow or an account flow.

### Design decision

- Mode: extension; brand fidelity 10, visual variance 4, motion 2, information density 6, asset dependence 2.
- Preserve: the real LaiBE logo, restrained dark surfaces, orange-red primary action, cyan viewing status, the five-fact spine, local routes, focus treatment, and reduced-motion support.
- Improve from the read-only `preview_budget` reference: retain its clear step orientation and main-work/side-context split, while removing external dependencies, fabricated totals, market language, payment actions, and unrelated route meaning.
- Signature: an eight-position document-inspection rail that keeps service explanation, consent, file selection, pending validation, correction, reselection, result format, and the closed outcome on one page.
- Highest-risk change: a local file choice could be mistaken for a durable upload. Every state therefore repeats the boundary that no file is sent or saved, and no case or formal result is created.

### State and data contract

The ordered page states are `INTRODUCTION`, `CONSENT`, `SELECT_FILE`, `VALIDATION_PENDING`, `CORRECTION_REQUIRED`, `RESELECT_FILE`, `RESULT_FORMAT`, and `RESULT_UNAVAILABLE`. The browser may temporarily display the selected filename and the browser-provided MIME label. Only the exact `application/pdf` label may advance to `VALIDATION_PENDING`; a `.pdf` suffix alone is never format evidence. Even for that MIME label, the page states that the content format is still unverified because G1 has no byte parser. It must not use URL/hash/storage authority, persist the file, claim upload, claim case creation, or synthesize a quotation result.

The file-selection event is one fail-closed boundary. It uses module-load captured WebIDL getters and methods to brand-check the real input, `FileList`, and `File` objects. Selection requires exactly one own `FileList` data slot corroborated by the captured `item()` result, then reads the filename and MIME label through captured native getters. Inherited slots or metadata, caller-created plain objects, own metadata shadows, sparse collections, revoked or throwing proxies, and post-load shared-prototype changes never become authority. Genuine branded `File` subclasses remain supported without exact-prototype matching. Empty selection is treated only as cancellation. Any other unreadable or malformed metadata enters `FILE_FORMAT_INVALID` with null case data, no actions, and product copy that says the browser label is unavailable while the file contents remain unverified; it never infers that the bytes are not PDF.

File size, page count, readability, and corruption remain pending without trusted rules or parsing. The result area is labeled as a format example and contains no person, case, price, date, statistic, or completion claim. The closed result uses zero case data and points back to file selection or the PCM homepage.

The failure contract includes `FILE_FORMAT_INVALID`, `FILE_TOO_LARGE`, `PAGE_COUNT_INVALID`, `FILE_UNREADABLE`, `FILE_CORRUPTED`, `DUPLICATE_SUBMISSION`, `VERSION_CONFLICT`, and `QUOTE_ONLY_DRAWING_MISSING`. Every row has a plain reason, executable next action, responsible role, return step, recovery step, closed payload policy, `mutationAllowed: false`, null case data, and no actions. Unknown, malformed, accessor-backed, inherited, Proxy, and post-load intrinsic-polluted input resolves to `CONTEXT_UNAVAILABLE` with zero case data.

The no-action value is a frozen null-prototype zero-action iterable, not an empty Array. It exposes only an own zero length and an own empty iterator, so post-load Array index or iterator pollution cannot inject an action through direct indexing or spread. Failure remains exception-safe and never derives authority from shared mutable prototypes.

Replacing a previously accepted local PDF label with an invalid selection clears the prior filename and the native file input before the failure appears. Recovery keeps those two surfaces consistent. Every state transition focuses the new panel heading (or its primary operation if a heading is unavailable), providing a visible focus target without returning focus to BODY.

The short-viewport continuation repeats only the current status, next step, and one primary action inside the hero service boundary. It preserves the full five-fact spine below, while ensuring 390×640 and 1280×768 can show those three decision facts together without changing the page's routes, contract state, or G1-only boundary.

The hero action uses one closed, state-owned hero action projection for its label, enabled state, and target. Rendering never takes authority from the button's initial dataset or another caller. `VALIDATION_PENDING` leads only to `CORRECTION_REQUIRED`; it cannot return to consent. The consent state has no legal hero next action until the in-panel consent control is completed, so the hero action is disabled with `aria-disabled="true"` and no target. Every state without a legal next action has the same disabled, target-free behavior.

T3 activates only `quoteCheck` at `../quote_check/code.html` and makes only the `home` to `quoteCheck` edge clickable. `drawingCheck` and `accountAccess` remain planned with null hrefs; compatibility pages remain aliases and never become canonical steps.

### Quantitative CTA contrast

Quotation-check primary actions retain the shared orange gradient but use a page-local `#080b0d` foreground. At the computed 14px size, contrast against `#ffb145`, `#ff711f`, and `#ff4925` is respectively 10.93:1, 7.17:1, and 5.86:1. Each gradient node therefore exceeds the 4.5:1 normal-text requirement without changing the shared T1 system, secondary actions, focus treatment, layout, or interaction behavior.

## Verification contract

Every package records an exact write set, establishes actual RED, implements minimal GREEN, runs focused and current-train regression checks, verifies syntax/UTF-8/JSON/local references/forbidden visible language/diff scope, receives a Critical 0 and Important 0 review, creates one bounded local commit, and returns to a clean worktree. Candidate-specific historical admission assertions read receipts from the immutable Git object and use the approved candidate as an explicit upper bound; they never inspect a later descendant worktree or pretend the integration branch is the old candidate.
