# PCM Service Contract Integration Design

## Decision and authority

- Handoff authority: Human transferred integration and closeout from `A0｜design` to `AA｜萊比參謀長` on 2026-08-02.
- Canonical content selection: `v0.3 法務審閱稿`, owner service fee `3.5%`, complete contract and signing mainline.
- Legal status remains `READY_FOR_LEGAL_REVIEW`. The page must never claim `LEGAL_FINAL`, lawyer approval, or production-signature readiness.
- The externally rendered contract uses product/legal language only. It does not expose MVP/API/database/internal packet names and does not reserve future payment-custody or payment-processing capabilities.
- Signing readiness must exact-bind contract source SHA-256 `0000676e400fd42f6c87bb289457616f69c3dd54104380cca584130ebb783383`; a different well-formed SHA-256 is not authoritative.
- `A0｜design` remains frozen. The integration work does not write to its dirty workspace.

## Immutable source identity

- Original design workspace: `C:\Users\J\.codex\worktrees\laibe_pcm_a0`
- Last tracked design commit: `b204a34b169ba59982c96cda7ef0e80c4270af40`
- Source snapshot commit: `fd0220e2abcb6754b9055773b807b8359ba57c85`
- Source snapshot tree: `e82f7533f86d5bd18ee31fb18e922608a7bb4c3e`
- Integration worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\aa-pcm-service-contract-20260802`
- Integration branch: `aa/pcm-service-contract-20260802`

The snapshot records only `pcm_standalone/**` plus its standalone-core regression test. It excludes unrelated dirty application, Supabase, package, lockfile, A5, A6 and production paths.

## Selected approach

Use a native PCM package extension:

1. Add a new `pcm_standalone/service_contract/` page.
2. Port only the legal content and presentation ideas from the old `site` candidate.
3. Do not execute or import the old localStorage runtime, old header, old status machine or old signing methods.
4. Keep the public output lineage inside PCM: the homepage links to `../service_contract/code.html`.

Rejected approaches:

- Linking directly to the old `site/ai_pcm_045_contract_support_candidate` page: it contains a local-only state machine and stale authority.
- Copying the complete old preview/sign/generator runtime: it would duplicate current PCM lifecycle logic and expose stale statuses.
- Editing the dirty A0 workspace in place: it has no immutable source identity and overlaps unrelated Human changes.

## Design Read

```yaml
artifact: public pre-signing service-contract review page
audience: prospective owner first; natural-person service provider second
visual-language: restrained LaiBE dark shell with a warm legal-document reading surface
mode: Extension
visual-variance: 3
motion-intensity: 2
information-density: 7
asset-dependence: 2
brand-fidelity: 10
```

Consequences:

- Stable navigation and reading order; novelty is limited to the orange document case and layered A4 paper.
- Motion is limited to hover, focus and short disclosure feedback, with reduced-motion support.
- Dense legal text uses a persistent section navigator on desktop and a compact disclosure on mobile.
- The real LaiBE logo is reused. No generated or counterfeit brand imagery is added.
- Existing PCM tokens, spacing, radius and copy tone remain authoritative.

## Positioning

- Narrative role: move the owner from service understanding to informed contract review, while clearly showing that formal signing is not ready.
- Viewing distance: phone at 10–30 cm and laptop at about 1 m.
- Visual temperature: authoritative, calm and warm enough to support long-form reading.
- Capacity: desktop uses contract navigator + A4 reading surface + readiness rail; mobile collapses to one column and preserves 44 px controls.

## Design system

- Palette: `#0a0c0f` background, `#f4f1ea` primary text, `#9aa3ad` secondary text, `#ff8a2b` primary accent, `#eb581e` active accent, warm paper `#f7f1e6`, paper ink `#29231e`.
- Typography: existing `Noto Sans TC`, `Microsoft JhengHei`, `PingFang TC`; legal reading uses the same family with increased line-height rather than introducing a new font dependency.
- Spacing: 4 px base, with 8 / 12 / 16 / 24 / 32 / 48 rhythms.
- Radius: 14 px shell, 12 px content groups, 10 px controls, 999 px status labels; paper itself uses 2 px to read as a document.
- Shadow: one paper elevation and one floating navigation elevation only.
- Motion: 140–180 ms feedback; no scroll spectacle, no auto-play, no `scrollIntoView`.
- Logo: `../../../../assets/logo/laibe_offer.svg` from both public-home and service-contract route depth.

## Protected contracts

- Preserve existing public-home anchors and owner-start route.
- Add the header item without changing the meaning of existing navigation items.
- Mobile header contains five items in a `2 + 2 + 1` grid; `PCM 服務契約` is the final full-width item.
- Replace the homepage's sole `3%` service-fee statement with canonical `3.5%`; the two rates must never coexist.
- Keep external copy in Taiwanese Traditional Chinese and free of engineering terms.
- Do not add payment custody, collection, remittance, escrow or renovation-investment claims.
- Do not change Supabase, Auth, server/proxy, package/lock, shared routes, A5 or A6 files.

## Contract content boundary

- Source text is the exact `contractSource` from `site/shared/laibe-pcm-contract.js`, including Articles 1–28 and Annexes 1–14.
- New code exports inert content only: metadata, key-clause copy and the complete text.
- It does not export `load`, `save`, `ownerSign`, `reviewerSign`, `markPreviewed`, localStorage keys or old status values.
- Public copy shows `v0.3`, `3.5%` and `READY_FOR_LEGAL_REVIEW` in product language: `法務審閱中`.
- Blank retention periods, service-provider legal identity and other unresolved legal fields remain visibly unresolved; the UI must not fill them with fabricated data.

## Lifecycle and fail-closed signing

The displayed lifecycle is fixed to:

`DRAFT → OWNER_ACCEPTANCE_PENDING → OWNER_ACCEPTED_PROVIDER_PENDING → ACTIVE`

The page starts in `DRAFT`. It may display the remaining stages but cannot transition them locally.

`evaluateSigningReadiness(input)` returns ready only when all conditions are true:

1. `contractVersionHash` is a lowercase 64-character SHA-256 string.
2. `ownerIdentityVerified === true` and a non-empty `ownerPartyId` exists.
3. `serviceProviderPartySnapshot.partyType === "natural_person"` with non-empty party and signatory actor IDs.
4. `writerReady === true`.
5. `legalReviewStatus === "LEGAL_FINAL"`.

The current page envelope intentionally has `legalReviewStatus="READY_FOR_LEGAL_REVIEW"` and no trusted runtime facts, so the signing action is disabled. No browser storage or global clock may turn it on. The active action is document reading/printing, not signing.

## Page structure

1. LaiBE header: return to PCM home, contract section links and owner-start route.
2. Status masthead: v0.3, `法務審閱中`, lifecycle `草稿`, current responsibility and next step.
3. Orange document case: compact visual bridge to the supplied candidate design.
4. Contract summary: service role, 3.5% fee, non-custody boundary and evidence-record responsibility.
5. Key clauses: eight supplied clause highlights, without card repetition.
6. Full contract: sticky table of contents and A4 reading surface containing all articles and annexes.
7. Signing readiness: five explicit prerequisites and a disabled `開始簽署` action.
8. Print style: hide navigation and controls; print only title, status, complete content and signature-readiness notice.

## Exact implementation write set

Create:

- `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/code.html`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/styles.css`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/contract-content.js`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/app.js`
- `tests/pcm-service-contract.test.mjs`
- `docs/superpowers/specs/2026-08-02-pcm-service-contract-integration-design.md`
- `docs/superpowers/plans/2026-08-02-pcm-service-contract-integration.md`

Modify:

- `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css`
- `tests/pcm-public-home.test.mjs`

No other path is authorized.

## Acceptance contract

- TDD RED proves the page, header route, canonical fee and fail-closed readiness are missing before implementation.
- Focused and baseline Node tests pass after implementation.
- JavaScript syntax checks pass.
- Static scans find no old local runtime, stale lifecycle status, engineering copy, custody/payment guarantees or investment language in the new page.
- Browser acceptance covers Chromium at 390×844, 768×1024, 1280×720 and 1440×900.
- Public-home header, service-contract load, full-contract navigation, print action and disabled signing state remain reachable without horizontal overflow or console errors.
- Final commit is local, bounded to the exact write set, clean and not pushed, merged or deployed.
