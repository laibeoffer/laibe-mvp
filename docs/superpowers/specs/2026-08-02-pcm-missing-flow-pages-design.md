# PCM Missing Flow Pages Design

## Scope and decision

This change is a source-only extension of the LaiBE AI PCM standalone experience at commit `0b0037ff50a4dc5b1756fe3230588f12a01c5337`. It adds six missing flow states without modifying an existing file, shared route, page shell, authentication surface, package dependency, or product runtime.

The approved mode is **Extension**. New pages must look native to the existing LaiBE dark operational interface while remaining fail-closed when no trusted case context is available.

## Design read

```yaml
artifact: six source-only PCM flow-state pages
audience: owner and authorized PCM workflow participants
visual-language: restrained dark case-governance interface with one orange action accent
mode: Extension
visual-variance: 3
motion-intensity: 2
information-density: 7
asset-dependence: 2
brand-fidelity: 10
```

The pages are read at phone and laptop distance. The first viewport must identify the role, PCM contract state, case state, next responsible actor, and latest record. Information density is high enough for operational scanning, but the unknown default cannot show fabricated case facts.

## Visual system

- Palette: `#0a0c0f` background, `#12161a` surface, `#f4f1ea` primary text, `#9aa3ad` secondary text, `#ff8a2b` primary accent, `#eb581e` emphasis.
- Type: `Noto Sans TC`, `Microsoft JhengHei`, `PingFang TC`, sans-serif.
- Spacing: 4px base; principal intervals are 8, 12, 16, 24 and 32px.
- Radius: 14px major grouping, 10px controls, 999px status tags.
- Motion: 140–180ms state feedback only, with a complete reduced-motion path.
- Brand asset: the existing logo at `../../../../assets/logo/laibe_offer.svg`; it is never redrawn.
- Layout: sticky header, first-screen state band, one dominant content surface, a responsibility panel, and a final safe-return action.

## Shared first-screen contract

Every page includes the following five explicit facts before detailed content:

1. fixed audience role;
2. PCM contract state;
3. case state;
4. next responsible actor;
5. latest record.

The default state is `CONTEXT_UNAVAILABLE`. It contains no case ID, case name, party identity, amount, document filename, timestamp, or inferred workflow result. No write button is enabled. JavaScript only reinforces the inert state, validates safe local navigation, and exposes no browser storage or demo data.

## Page contracts

### `account_service_status`

Purpose: explain that account service is being prepared. It displays zero case data. The only action returns to the PCM public home.

### `access_unavailable`

Purpose: state that access cannot be confirmed or is denied. It exposes zero case data and provides a safe return to the PCM public home.

### `document_corrections`

Purpose: explain the supported correction dimensions for PDF and drawing documents: format, file size, page count and readability. It does not claim that a file has been uploaded, rejected or resubmitted. The action returns to document preparation.

### `self_service_archive`

Purpose: explain the read-only archive available when the owner does not apply for formal PCM service. It describes preserved documents and a basic report without rendering case payload. No restore, delete, edit or application action is enabled.

### `contract_prerequisites`

Purpose: list the categories that must be complete before a contract can proceed: required documents, one canonical version, both party identities and writer readiness. It never claims that signing is available. The signing control remains disabled.

### `case_closeout`

Purpose: show the structure of a read-only closeout summary: three-party confirmation status, latest record and archive status. Unknown context shows no case facts and offers only a safe return.

## Interaction and accessibility

- Every interactive control has a minimum target size of 44px.
- Keyboard focus is visible, headings follow a valid hierarchy and every page includes a skip link.
- All local `href`, `src`, stylesheet and script references resolve from the page folder.
- At 768px the two-column operational grid collapses; at 390px header and actions become full-width without horizontal overflow.
- Disabled controls use both `disabled` and `aria-disabled="true"`.
- No `scrollIntoView`, browser storage, query-derived authority or HTML injection is used.

## Content boundaries

All external copy uses Traditional Chinese in a Taiwan context. The entire PCM source tree must have zero matches for `招標、投標、競標、決標、得標、標案、標書、標價、邀標、發包`. New pages also exclude engineering language, payment custody, old-house investment claims, fabricated live status and guarantees.

## Evidence convention

The 22-path manifest records artifact receipts using `UTF8_LF` canonical bytes:

1. decode with `new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })`;
2. normalize CRLF to LF while preserving lone CR;
3. encode the normalized text as UTF-8;
4. compute canonical byte length, SHA-256 and Git blob SHA-1 from those canonical bytes.

The byte-order mark remains part of the canonical text because `ignoreBOM: true` prevents the decoder from consuming it. Therefore BOM and no-BOM inputs intentionally produce different receipts. Invalid UTF-8 must throw.

## Acceptance

- Exact new-only write set: 22 paths, all listed by the manifest.
- Six pages each contain only `code.html`, `styles.css` and `app.js`.
- Static tests verify page contracts, forbidden copy, local references, safe defaults, 44px targets, responsive rules and canonical receipts.
- Browser acceptance covers 1280px, 768px and 390px widths, no horizontal overflow, no console error and no enabled write action in the unknown state.
- The bounded local commit must have parent `0b0037ff50a4dc5b1756fe3230588f12a01c5337`; no push, merge or deploy follows.
