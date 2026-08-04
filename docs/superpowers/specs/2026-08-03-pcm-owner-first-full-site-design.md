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
- T3 quotation check is admitted at exact `f16b6d8191634eba9cc7037237e17f471363e312`.
- T6 case-setup source is admitted at exact `bfcfd2461443864cac4b2fbb4874dbc45a8084cc`; T7 service-contract source is admitted at exact `db289177da74283d3075383d7714318aa9760951`.
- The unique integration writer mechanically absorbed the admitted T6 and T7 product/test blobs in local commit `6bc25bab3b4cadaa16c6deae6b24207bc7d4007c`. Shared route, state, evidence, and browser integration remain a separate serial gate.
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

This is the only canonical quotation-check page. Introduction, consent, PDF selection, format checks, correction list, resubmission, and result are states of one page. It is not split into anonymous and registered variants. T3 activates this page at `../quote_check/code.html`; T4 activates the paired drawing-check entrance, while account access remains planned with a null href.

### `/pcm/drawing-check`

This is the only canonical drawing-review page. Introduction, consent, upload, format checks, corrections, resubmission, and result are states of one page. It is not split by account state. T4 source commit `ca90ecdd3fb0191c8f3ae4f420c2011758908521` is admitted G1 source, and the serial integration activates its local route at `../drawing_check/code.html` without granting upload, parsing, Auth, durable-data, or production authority.

The first serial route candidate `fd7a5719f545033a6b27c51ce028f95ba3f35a9f` is superseded evidence, not an admitted source: it made the shared graph clickable while the quotation page still said drawing review was unavailable. The bounded route-truth correction uses that exact commit as parent, keeps the shared route and public contract byte-frozen, and gives the quotation result and `QUOTE_ONLY_DRAWING_MISSING` recovery one exact local, keyboard-operable `../drawing_check/code.html` destination. An executable production-listener mutation probe proves that removing the guard permits hostile navigation; the current listener instead rejects missing, traversal, JavaScript, data, and external hrefs even after relevant browser intrinsics are polluted. The page continues to state that no upload, save, case creation, or formal result occurs at this G1 gate.

### `/account/access`

This is the single shared registration and sign-in entrance for owners and invited vendors. The admitted source commit is exact `1b62e12712178451b47b6b85c2fca859c26bde83`; its forms, role guidance, and recovery states remain disabled under `CONTEXT_UNAVAILABLE`, expose zero case data, and perform no Auth, network, persistence, or durable write. The unique integration writer absorbs those exact four blobs at `bd3e0678eba2bd272f05b7e787ef99a954cbb9ee`, then activates only the local G1 route `../account_access/code.html` and the homepage entry. The header begins fail closed and receives its href only from trusted route binding; it no longer points at the compatibility account-status page.

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

## PCM exit and read-only outcomes

`PCM_EXITED_BILATERAL_CONTINUATION` is the canonical PCM-exit state. It does not close or archive the case and does not create another workspace. The owner and vendor remain in their original workspaces, where contract, documents, messages, schedules, evidence, acceptance, changes, addenda, and case records continue under later G2/G3 authority. New PCM reviews, supplement requests, and PCM operations stop; historical PCM records remain read-only. PCM re-entry requires new authorization and cannot retroactively approve decisions made during the exit period.

`CASE_CLOSED_READ_ONLY` is the separate closed-case outcome. An own primitive role of `owner` maps only to `ownerWorkspace`; an own primitive role of `vendor` maps only to `vendorWorkspace`. Missing, inherited, accessor-backed, non-primitive, or unknown roles fail closed to `accessUnavailable` with `ZERO_CASE_DATA`. G1 exposes no mutation authority for either state; later runtime adapters must enforce the bilateral-versus-closed distinction rather than treating PCM exit as whole-case read-only.

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

Identity, membership, access, and pre-membership invitation failures use `ZERO_CASE_DATA`. File failures retain only limited file metadata or submission/version references. Contract failures retain only contract references. Cancelled and closed cases preserve only already-authorized content as read-only. PCM exit instead preserves bilateral case continuation while removing new PCM authority; the exact continuation resource set is `workspaces`, `contract`, `documents`, `messages`, `schedules`, `evidence`, `acceptance`, `changes`, `addenda`, and `caseRecords`. The overdue-supplement state permits only viewing pending details, contacting the responsible actor, or returning to the original workspace; it does not claim a write or record action. Every failure code has a non-mutating G1 recovery edge.

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
- The fail-closed set is `CONTEXT_UNAVAILABLE`, `AUTH_REQUIRED`, `ACCESS_DENIED`, `PREREQUISITES_PENDING`, `SERVICE_PREPARING`, and `CASE_CLOSED_READ_ONLY`; `PCM_EXITED_BILATERAL_CONTINUATION` is a distinct continuation state.
- PCM exit preserves the exact bilateral resource set in the original owner and vendor workspaces while disabling new PCM operations. Case close preserves only previously authorized content read-only. Neither state creates a separate archive workspace, and G1 grants no mutation.

## T6 and T7 serial integration candidate

The unique integration writer uses exact parent `6bc25bab3b4cadaa16c6deae6b24207bc7d4007c`. Its bounded product/evidence write set is the three shared route/state sources, five focused shared tests, this specification, and the current execution plan. The admitted T6 and T7 page/test blobs remain byte-frozen from `bfcfd2461443864cac4b2fbb4874dbc45a8084cc` and `db289177da74283d3075383d7714318aa9760951`.

The initial direct-descendant full suite was 260/264: four failures were stale evidence assertions that treated the descendant HEAD as an older immutable review commit or expected the pre-T7 visual structure. Focused TDD then reproduced the old PCM-exit semantics at 63/71. The serial correction binds historical evidence to its declared immutable Git commit, defines `PCM_EXITED_BILATERAL_CONTINUATION`, keeps `caseSetup` planned at G2 with `href:null`, and preserves the G1 service-contract reading route without enabling signing. A further actual Array-prototype RED was 18/19; continuation actions, workspace lists, and the exact ten-resource set now use frozen null-prototype lists with own iterators across the route manifest, public resolver, and shared state. Fresh focused evidence is 73/73 and the complete enumerated PCM suite is 15 files, 266/266.

Fresh browser acceptance covers both pages at 1280×900, 768×1024, 390×844, 390×640, 1280×768, and the 640×450 CSS viewport used for 200% reflow. Every run has horizontal overflow 0, visible controls below 44px 0, broken fragments/images 0, enabled write controls 0, and visible role/current state/next responsibility/recent record. Six directly requested local HTML/CSS/logo resources returned HTTP 200 and browser console warnings/errors were 0. The case-setup CTA reaches and focuses `#preparation`; the service-contract CTA reaches `#full-contract`, while the signing control remains disabled and local print preview remains available.

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

Hero projection authority is the canonical object identity exported by `QUOTE_CHECK_STATES`, `QUOTE_CHECK_FAILURES`, or `CONTEXT_UNAVAILABLE`, never a caller-provided `code` property. Plain own-data lookalikes, extra-key records, null-prototype records, inherited values from a custom prototype or `Object.prototype`, accessor-backed records, functions, and Proxies all receive the disabled target-free action. Projection performs no getter or Proxy trap call on those inputs. It uses direct identity comparisons rather than Map, Set, Array, or another mutable-prototype collection as authority, while preserving the complete built-in state and failure action matrix.

T3 activates `quoteCheck` at `../quote_check/code.html`. T4 serial integration activates `drawingCheck` at `../drawing_check/code.html` and the two quote/drawing completion edges. T5 serial integration activates `accountAccess` at `../account_access/code.html` and the homepage account edge while preserving zero case data and no write authority. Compatibility pages remain aliases and never become canonical steps.

The T5 homepage binder treats DOM mutation methods as part of the authority boundary. It captures the branded `Element.prototype.setAttribute`, `removeAttribute`, and `getAttribute` methods plus `Reflect.apply` at module load; post-load control/prototype overrides cannot rewrite an admitted local href or prevent a closed control from losing an unsafe href. A route control is first projected to a verified no-`href` closed state, then activated only when the exact trusted route pair can be written and read back unchanged. Any failed write or verification returns the control to the closed projection without navigation authority.

### Quantitative CTA contrast

Quotation-check primary actions retain the shared orange gradient but use a page-local `#080b0d` foreground. At the computed 14px size, contrast against `#ffb145`, `#ff711f`, and `#ff4925` is respectively 10.93:1, 7.17:1, and 5.86:1. Each gradient node therefore exceeds the 4.5:1 normal-text requirement without changing the shared T1 system, secondary actions, focus treatment, layout, or interaction behavior.

## Verification contract

Every package records an exact write set, establishes actual RED, implements minimal GREEN, runs focused and current-train regression checks, verifies syntax/UTF-8/JSON/local references/forbidden visible language/diff scope, receives a Critical 0 and Important 0 review, creates one bounded local commit, and returns to a clean worktree. Candidate-specific historical admission assertions read receipts from immutable Git objects and use the approved candidate as an explicit upper bound; they never inspect a later descendant worktree or pretend the integration branch is the old candidate. When a receipt declares a Git blob, verification reads those declared blob bytes and first requires the blob object to exist; mutable checkout bytes are not receipt authority. The current canonical-identity correction is separate from the historical e7a hero-action candidate and has parent `e7a12315d5d7a8aff6b6d12778a9e404b68a96a6`.

### T5 immutable review-target receipt closure

The T5 product behavior is frozen at `b64238044b480e5570ef99dbc7a807e59b893b6e`. Its evidence-only correction has that exact parent and modifies only the focused public-home test, this specification, the integration plan, and the governance manifest. The manifest uses the non-circular review target `CORRECTION_COMMIT_CONTAINING_THIS_MANIFEST`; the verifier resolves it only to the current immutable correction commit after proving the exact parent and exact-four diff.

Every non-manifest receipt has scope `review_target_commit_blob_bytes`. Verification first resolves the review-target tree entry, requires the declared blob object to exist, proves the tree entry equals the declared blob, and then recomputes bytes, SHA-256, and Git blob identity from `git cat-file` bytes. Checkout or in-memory drift is an adversarial input only and cannot change the immutable result. Wrong or missing blobs, a wrong parent, or any extra path fail closed. The homepage binder, route graph, account source, and all other product bytes remain frozen.
