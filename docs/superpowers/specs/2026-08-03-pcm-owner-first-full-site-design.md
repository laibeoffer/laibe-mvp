# LaiBE PCM Owner-First Full-Site Design

## Decision record

- Owner: A0｜design
- Mode: redesign-preserve with bounded source integration
- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a0-design-pcm-owner-first-integration-20260803`
- Branch: `a0/design-pcm-owner-first-integration-20260803`
- Seed: `3f6bddea936bdebd36846a239bc5d13c37e1d331`
- S0 inclusion: `266a567c4881a14b438921a5ff1d8ba6165270ca`, integrated as `0d81189e8cc7f7563fb390e17b524afabb5b3b54`
- Product goal: let a first-time homeowner understand, enter, recover, and follow the PCM journey without any interface pretending that identity, signing, durable records, or production services are available before their gates pass.

## Design Read

```yaml
artifact: public landing page plus owner-first service flow
audience: Taiwan homeowners first; invited vendors, PCM staff, and governance staff only after their gates
visual-language: restrained dark LaiBE glass with evidence-first operational hierarchy
mode: redesign-preserve
visual-variance: 4
motion-intensity: 2
information-density: 6
asset-dependence: 4
brand-fidelity: 10
```

The visual variance is concentrated in the homepage sequence and calendar-first workspace. Motion is limited to short state feedback. Operational pages use a stable grid and progressive disclosure. The existing LaiBE logo, dark background, orange-red primary action, cyan secondary information, routes, anchors, and Traditional Chinese voice remain protected.

## Preserve, improve, remove

### Preserve

- Existing LaiBE logo assets and dark, restrained visual identity.
- Orange-red primary action and cyan secondary viewing action.
- Existing valid local routes and anchor compatibility.
- Existing service contract v0.3, 3.5% fee presentation, and legal-review status.
- Fail-closed authorization behavior and zero-case-data defaults.

### Improve

- One owner-first route graph with visible forward, back, pending, and recovery paths.
- A shared first-screen fact spine: role, PCM contract state, case state, next actor, and latest record.
- Homepage content hierarchy for five-second comprehension.
- Basic report as a decision result rather than a service manual.
- Owner workspace as calendar-first work with case-message support.
- Keyboard focus, touch targets, reduced motion, overflow control, and truthful loading/empty/error states.

### Remove or retire

- Duplicate six-step explanations on the homepage.
- Long contract, pause, termination, and governance details from the public homepage.
- Old demo-case entry points and market-comparison semantics.
- Any clickable route that has no existing destination.
- Any UI that implies identity, signing, durable writes, or production readiness before its gate passes.

## Product architecture

### Canonical owner-first journey

```text
PCM 公開首頁
→ 甲方註冊與文件準備
→ 文件檢查、修正與重新提交
→ 報價／圖說／整體基本檢討結果
→ 是否申請正式 PCM
   ├─ 暫不申請 → 唯讀文件與報告區
   └─ 申請 → PCM 服務契約
             ├─ 前提不足 → 契約待補項目
             └─ 前提齊備 → STEP 01–07 契約簽訂
                            → 甲方 calendar-first 工作台
```

The source layer renders all destinations truthfully. Protected destinations remain safe, non-mutating views until identity and durable-data gates are admitted.

### Four gates

| Gate | Meaning | Owner | Current train authority |
|---|---|---|---|
| G1_UI_SOURCE | HTML, CSS, JavaScript, route graph, and browser-visible source | A0 | Active |
| G2_AUTH_RUNTIME | Authenticated identity, membership, and role | A6 | Closed |
| G3_DURABLE_DATA | Writers, Storage, signing records, events, and canonical case data | A5 and canonical producers | Closed |
| G4_PRODUCTION | Migration, secrets, deployment, monitoring, and production writes | A0 final | Closed |

No query string, fragment, browser storage value, or caller-provided boolean grants a higher gate. Unknown, missing, malformed, or protected continuation context resolves to the safe recovery page with no case payload and no mutation capability.

## Route contract

`public/pcm-flow-route-manifest.js` is the canonical G1 route inventory. Every node declares lifecycle, role, owner, and gate. Active nodes expose an existing local `href`; planned nodes do not expose a clickable destination; retired nodes name a canonical replacement. Every edge declares its kind, gate, owner, and human-readable action.

`public/public-contract.js` retains the original enumerable route aliases for existing homepage consumers and adds direct canonical route properties. `resolvePcmFlowContinuation(context)` is a pure, fail-closed resolver. It permits public G1 intents and refuses protected continuation regardless of caller-asserted authority.

## Shared interface system

### Visual tokens

- Near-black background and restrained translucent surfaces.
- Existing LaiBE orange-red gradient for the single primary action in a section.
- Cyan for viewing, understanding, comparison, or explanatory actions.
- Hairline borders, soft depth, disciplined radius grammar, and generous negative space.
- Existing real logo assets only; no emoji or substitute identity marks.

### Shared fact spine

Every protected or operational page presents, above the working content:

1. role;
2. PCM contract state;
3. case state;
4. next responsible actor and action;
5. latest recorded event.

When the context is unavailable, the fact spine contains no case values and instead states the safe recovery action in product language.

### Closed and recovery states

- `CONTEXT_UNAVAILABLE`
- `AUTH_REQUIRED`
- `ACCESS_DENIED`
- `PREREQUISITES_PENDING`
- `ARCHIVED_READ_ONLY`
- `SERVICE_PREPARING`

All closed states carry zero case payload and zero mutation capability. Loading, empty, error, and recovery copy explains what the user can do next without exposing implementation terminology.

## Page responsibilities

- Homepage: explain what PCM checks, who qualifies, what result arrives first, and the next action.
- Owner start: clarify qualification and document preparation; preserve honest account/intake boundaries.
- Document corrections: list format, file size, page count, readability, and resubmission actions.
- Basic report: present quotation, drawing, and combined-result structures without fabricated people, prices, dates, or statistics.
- Service decision: make the formal-service versus self-service branch explicit.
- Self-service archive: provide a truthful read-only information state and a return path.
- Service contract: preserve full canonical draft content and expose a readable mobile structure.
- Contract prerequisites: identify missing prerequisites, responsible actor, and return path.
- Contract signing: show a complete STEP 01–07 sequence while keeping signing disabled until trusted identity and durable writer readiness exist.
- Owner workspace: calendar-first main view with a LINE-like case-message side panel; it must never claim to be a live LINE thread.
- Vendor, PCM, and governance surfaces: show invitation, identity, permission, and recovery states before any case content.
- Record center, closeout, and archive: organize documents, decisions, messages, changes, acceptance, responsibilities, and final read-only trace.

## Content rules

- Traditional Chinese for Taiwan users.
- Every page answers: audience, purpose, current state, next actor, next action, and what will be recorded.
- PCM supports document checking, decision organization, and case governance; it does not replace the owner’s final decision or the professional responsibility of the designer or contractor.
- No price-guarantee, risk-guarantee, fund custody, payment collection, payment protection, investment-return, or final-decision claims.
- No fabricated cases, names, ratings, counts, completion states, or working capabilities.
- No external engineering vocabulary, raw data objects, stack traces, or console failures.

## Interaction and accessibility

- Visible controls are at least 44 by 44 CSS pixels.
- Focus-visible styles remain clear against the dark background.
- Hover movement is subtle and active state returns to rest.
- Disabled and loading controls do not submit repeatedly.
- Reduced-motion mode removes nonessential movement without changing content order.
- 1280×900, 768×1024, and 390×844 have zero horizontal overflow.

## Acceptance contract

Each package follows actual RED → minimal GREEN → refactor → focused verification → exact-path review → bounded local commit. T18 verifies the canonical route graph, all local href/src/fragment targets, forbidden visible language, UTF-8, JavaScript syntax, console cleanliness, responsive overflow, touch targets, focus, reduced motion, and screenshot evidence. No merge, push, pull request, deployment, migration, secret change, or production write belongs to this train.

## T0 write set

1. `src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js`
2. `src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js`
3. `tests/pcm-owner-first-route-manifest.test.mjs`
4. `docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md`
5. `docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md`
6. `docs/governance/pcm-owner-first-execution-manifest.v1.json`
