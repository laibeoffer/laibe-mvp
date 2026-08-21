# DRS Workspace UI W1 local static candidate

## Scope

W1 builds three local static workspace candidates under `src/stitch_laibe_landing_onboarding/drs_standalone/`:

- owner workspace: `OWNER_DRS_PRIVATE` plus `OWNER_VENDOR_DRS_SHARED`, case state, next actor, document status and decision trace.
- vendor workspace: `OWNER_VENDOR_DRS_SHARED` only, assigned case work, document responses and next action.
- specialist workspace: case queue, submitted snapshot, AI advisory statuses, `EDIT_AND_SEND`, `OVERRIDE_AND_SEND`, `MANUAL_EXCEPTION_SEND`, complex document editor entry, bulk drawing review entry and audit timeline.

## Product Boundary

The pages use a mock data boundary through each page's `DRS_WORKSPACE_VIEW_MODEL`. This is local view-model data only. There is no real identity, persistence, LINE runtime, AI runtime, document parser, case authorization or external service connection in W1.

User-facing text describes unfinished behavior as product state: `正式開放後` or `正在整理中`. It does not present engineering state to users.

A0 existing website UI is immutable. This candidate must stay isolated inside `src/stitch_laibe_landing_onboarding/drs_standalone/` and must not change existing website pages, shared navigation, page registration, CTA wiring or runtime routing.

## Interaction Boundary

All W1 CTA controls are local UI behavior:

- tab buttons update selected state and the live region;
- primary actions switch to the relevant workspace area or show a truthful product-state message;
- send, editor and drawing actions do not claim a real external send or durable record.

## Copy Boundary

DRS replaces PCM in user-facing copy. W1 avoids tender, bid, award and bidding semantics. W1 also excludes payment, escrow, old-house investment return, production, DB, API, debug, n8n, Budget Engine, PricingRule, BudgetEstimateLine and Plancraft product claims.

## Validation Plan

- focused RED/GREEN: `node --test tests/drs-workspace-shell.test.mjs`
- source tests: scoped Node tests that do not require route manifest writes
- static localhost/browser smoke: owner, vendor and specialist pages
- viewports: desktop `1440x900`, mobile `390x844`
- browser checks: page errors, console errors, horizontal overflow and CTA behavior
- forbidden-copy scan: focused test plus source search

## Known Gaps

- The candidate is not connected to real Auth/RLS, case membership or persistence.
- LINE remains the ordinary interaction surface, but W1 does not connect LINE.
- AI advisory status is visual and local only; AI never sends by itself and is not an approver.
- Specialist editor and bulk drawing review are entries with local state responses, not full document tools.
- No canonical route manifest, deployment, production server, push, PR or merge is included in W1.

## Next safe action

The next safe action is read-only re-review and candidate freeze only. No additional UI writing or website integration action is authorized by this W1 candidate.
