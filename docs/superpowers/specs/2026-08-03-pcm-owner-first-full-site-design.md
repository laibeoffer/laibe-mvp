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
- The current review target is the bounded exact-five correction commit that contains this specification and has `403e4f7b84b3e5ee999db583bd23b65732e369d4` as its parent.
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

This is the only canonical quotation-check page. Introduction, consent, PDF selection, format checks, correction list, resubmission, and result are states of one page. It is not split into anonymous and registered variants. Until T3 creates the page, its manifest lifecycle is `planned` and its local `href` is `null`.

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

## Verification contract

Every package records an exact write set, establishes actual RED, implements minimal GREEN, runs focused and current-train regression checks, verifies syntax/UTF-8/JSON/local references/forbidden visible language/diff scope, receives a Critical 0 and Important 0 review, creates one bounded local commit, and returns to a clean worktree. Candidate-specific historical admission assertions remain truthful historical checks and are not rewritten to pretend the integration branch is the old candidate.
