# DRS W2 Local Integration Runtime

## Status

`SOURCE_ADMITTED / CONTRACT_SLICE_GREEN / FINAL_REVIEW_PENDING`

This is an isolated local integration contract. It admits the exact frozen A14, Core, and Workspace source files into one integration worktree, then verifies the cross-lane contract through dependency-injected local ports. It does not connect to A0, real LINE, OpenAI, live Auth, remote PostgreSQL, Supabase production, or deployment services.

## Admitted Source Binding

- A14 frozen commit: `db955712199652c1fbac38273ba31e4b6fba64df`
- Core frozen commit: `5149037dda85b82c2fedca01d9bb08f9bc649438`
- Workspace frozen commit: `697bc83f6734abc6842546faa6feed9abef81f65`
- Source convergence: `tests/drs-w2-source-convergence.test.mjs` verifies exact frozen HEAD/tree for each lane and byte-for-byte equality for every admitted integration file.
- Migration order: A14 `20260820000000_drs_linebot_group_ai_human_w1.sql` before Core `20260820090000_drs_core_case_audit_contract.sql`.

## Implemented Contract Slice

- Advisory review can return only the three accepted statuses.
- Advisory AI cannot send by itself.
- A verified authentication subject must map to the immutable assigned `specialist_id`.
- Assignment and formal group link must both be active at the action time.
- The reviewed source event, formal link, LINE destination, and transport payload hash are one non-substitutable binding.
- The assigned specialist's explicit review submission creates a hash-only `REVIEW_SNAPSHOT_SUBMITTED` audit event before the advisory call; the exact submitted bytes and that server-generated hash are passed together to the advisory port.
- Normal, attention, and review-service-unavailable decisions remain Human-controlled.
- `MANUAL_EXCEPTION_SEND` requires reason, urgency, and service incident id.
- Manual-exception urgency and incident id are retained in the Human decision audit event.
- Human cancellation creates no transport call, final message, or outbound receipt.
- A transport timeout creates no Core-style `FINAL_MESSAGE` or `RECEIPT`.
- An incomplete or mismatched transport acceptance creates no final message or receipt.
- Transport acceptance creates one final message followed by one receipt with `recipient_read=false`.
- Core body hash and A14 transport-payload hash are stored as distinct values.
- One linear predecessor chain is maintained for each local case.
- An accepted idempotent replay returns the prior result without sending again; conflicting content under the same key is rejected.
- Concurrent exact replays share one in-flight finalization and one transport call; rejected transport results replay stably.
- Submitted text is passed to the advisory port for the explicit review call but is not persisted in audit events; intermediate edits and hidden reasoning are not stored.
- Advisory findings are reduced to the accepted `code`, `severity`, `evidenceRef`, and `recommendation` fields before persistence.
- Finding codes, severities, evidence-reference syntax, and recommendations are policy-controlled. Free-form AI recommendation/proposed text is not persisted; only a proposed-text SHA-256 is retained.
- Sparse advisory findings and sparse attachment arrays fail closed.
- Transport acceptance evidence is snapshotted once into primitives before validation and persistence.
- Transport acceptance requires strict UTC RFC3339 evidence, a non-empty transport message id, matching destination and payload hash, and valid attachment id/SHA-256 pairs.
- Assignment and formal-group intervals use calendar-valid RFC3339 parsing and fail closed for `"0"` and impossible dates.
- Workspace browser behavior preserves disabled/inert tabs in non-ready states, exactly one selected visible panel in ready states, role-scoped message visibility, and Traditional Chinese product copy without internal decision enum leakage.

## Fresh Evidence

Commands:

```powershell
node --test tests/drs-w2-runtime-integration.test.mjs
node --test tests/drs-w2-source-convergence.test.mjs
$env:NODE_PATH='C:\Users\J\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'; node --test tests/drs-w2-browser-smoke.test.mjs
```

Results:

- Runtime integration: `13/13 PASS`.
- Source convergence/admitted-file equality: `7/7 PASS`.
- Browser smoke over admitted Workspace files: `1/1 PASS`.

Lane suites on the same integration tree:

- A14 W1+W2 Deno tests: `78/78 PASS`.
- A14 W2 focused tests: `20/20 PASS`.
- Core contract/static/runtime-harness Node tests: `61/61 PASS`.
- Workspace shell/data-binding Node tests: `23/23 PASS`.

Static checks:

- `deno check` over admitted A14 source/tests: PASS.
- `deno lint src/lib/drs-linebot tests/line_bot`: PASS.
- `deno fmt --check src/lib/drs-linebot tests/line_bot`: PASS.
- `node --check` over integration runtime, source convergence, Core, Workspace JS, and tests: PASS.
- `git diff --check` and `git diff --cached --check`: PASS.
- Token-shape secret scan: no match.
- Protected A0 path scan: no match.

## Not Claimed

- No disposable PostgreSQL execution or real RLS proof is claimed.
- No remote Supabase migration has been applied.
- No real LINE/OpenAI call, credential, secret, production deployment, push, PR, or merge is claimed.
- No canonical A0 route/header/navigation/page-registry/CTA/runtime admission is claimed.
- No recipient read/confirmation is inferred from transport acceptance.
- No payment escrow, old-house investment/ROI, tender/bid, Budget Engine, Plancraft, formal quote, Excel, or PDF scope is included.

## Next Gate

The exact integration tree must receive independent security/privacy review and independent browser/product review before Commander can freeze the final local integrated candidate.
