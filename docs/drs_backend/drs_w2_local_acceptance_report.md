# DRS W2 Local Acceptance Report

## Overall Decision

`ACTIVE_PROTECTED`

The DRS W2 local integrated candidate is not frozen yet. This report is updated as each exact gate is satisfied. A local acceptance result will not imply production, deployment, live credentials, canonical A0 integration, or launch.

## Exact Integration Identity

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-w2-integration-20260821`
- Branch: `codex/drs-w2-integration-20260821`
- Baseline: `dfae8484228c2718486f147b8e22103c7ed2f0f7`
- Issue: `#117`
- Current integrated commit/tree: pending

## Gate Ledger

| Gate | Status | Evidence | Remaining Requirement |
|---|---|---|---|
| Source convergence inventory | GREEN 4/4 / NOT ADMISSION | `tests/drs-w2-source-convergence.test.mjs` passes as a clean-head/allowlist check only | Source admission remains held until A14, Core, and Workspace all have exact independent APPROVE plus Commander FROZEN |
| Core Data/Audit W2 | FROZEN LOCAL WITH LIVE HOLD | `5149037dda85b82c2fedca01d9bb08f9bc649438`; independent APPROVE; Commander FROZEN sent; W2 16/16, W1 45/45 | Live disposable PostgreSQL/RLS proof remains false and must be handled as a later hold |
| A14 runtime adapter W2 | ACTIVE REWORK AFTER REQUEST_CHANGES | Re-review rejected `a2ca226017c74bb64d7de0048a667ae31b8bc279`; blocker is lease ownership/expiry not protecting actual case receipt write | Original A14 writer is executing narrow RED/GREEN child of `a2ca226...` |
| Workspace W2 | CANDIDATE PENDING INDEPENDENT REVIEW | `4f9f3688224d12399fdcc842ed19a31ed9a90ff5`; Commander browser smoke `30/30`, console `0`, overflow `0`, small controls `0`, forbidden copy `0` | Fresh read-only independent review, then Commander freeze or narrow rework |
| Integration contract | REWORK GREEN 13/13 | `tests/drs-w2-runtime-integration.test.mjs`; four latest adversarial-review defects reproduced RED then fixed | Wait for source-lane admission, then bind admitted A14/Core/UI source and extend cross-lane E2E |
| A0 immutable guard | GREEN | No protected A0 diff in all current lane evidence | Re-run on exact final tree |
| Production/external gate | CLOSED | No credentials, real calls, remote migration, deploy, push, PR, or merge | Separate future authority and verification |

## Current Integration Contract Evidence

- Normal advisory review plus assigned Human send: PASS.
- AI sends by itself: denied; transport call count remains zero until Human decision.
- Transport timeout: no `FINAL_MESSAGE` or `RECEIPT`.
- Wrong authentication subject: denied before review/transport mutation.
- Review service unavailable: manual exception requires reason, urgency, and incident id.
- Human cancellation: no transport, final message, or receipt.
- Accepted replay: one transport call and one event chain; conflicting replay rejected.
- Core body hash and A14 transport-payload hash: distinct values.
- Transport accepted is not recipient read: `recipient_read=false`.
- Audit chain: one predecessor per appended case event in the contract slice.
- Concurrent exact replay: one Human decision, one transport call, one final/receipt pair.
- Source event, formal link, destination, and transport hash: non-substitutable.
- Advisory findings: schema-reduced; hidden reasoning and intermediate-edit keys excluded recursively.
- Malformed transport acceptance: no final/receipt and stable failure replay.
- Explicit submitted snapshot: hash-only audit event is created before advisory; exact bytes/hash stay paired for the advisory call.
- AI free-form recommendation/proposed text: not persisted; policy-controlled findings and proposed-text hash only.
- Sparse AI findings and sparse attachment arrays fail closed.
- Transport acceptance evidence is read once into primitive values before validation and persistence.
- Strict transport evidence: UTC RFC3339, destination/hash acknowledgement, and attachment identity/hash required.
- Assignment and formal-group intervals use calendar-valid RFC3339 parsing and fail closed for `"0"` and impossible dates.

## Workspace Browser Evidence

The Commander served exact Workspace W2 rework #2 commit `4f9f3688224d12399fdcc842ed19a31ed9a90ff5` on `127.0.0.1:5185`; the server was stopped after QA.

- Owner, Vendor, Specialist at `1440x900` and `390x844` across loading, ready, empty, retryable-error, and permission-denied states: `30/30` checks, `failures=[]`.
- Horizontal overflow max: `0`.
- Visible controls below 44px: `0`.
- Forbidden visible engineering copy: `0`.
- Non-ready tabs: enabled `0`, tabbable `0`; blocked case actions were disabled/inert while retry remained available.
- Ready initial render: exactly one visible panel, selected tab, and `tabIndex=0`; after second-tab switch still exactly one panel.
- Specialist mobile Human local transition: send-before receipt/live/timeline updated without external send.
- Owner mobile main CTA and live region overlap: `false` (`button 305x47.59 at y=687.98`, live region `347x63.59 at y=771.58`).
- Console errors: `0`.

## Remaining P0 Gates

1. Finish A14 narrow rework and independently approve/freeze A14; independently approve/freeze Workspace W2.
2. Bind A14 event/transport semantics to Core's body, receipt, and one-tail audit contract.
3. Implement and prove verified-session specialist binding and Vendor case-participant projection.
4. Run the complete cross-lane mocked LINE -> AI advisory -> Human -> transport -> audit -> workspace journey.
5. Obtain independent security/privacy and browser/product approval on the exact integrated tree.
6. Record the live PostgreSQL hold honestly if no preinstalled disposable runtime becomes available.

## Forbidden Boundary

- A0/canonical UI and routes remain unchanged.
- No real LINE/OpenAI call or secret.
- No remote/live database or production migration.
- No deploy, push, PR, merge, destructive Git, payment, Budget Engine, Plancraft, tender/bid, or formal quote/Excel/PDF.
