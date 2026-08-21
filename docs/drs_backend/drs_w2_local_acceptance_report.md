# DRS W2 Local Acceptance Report

## Overall Decision

`DRS_W2_LOCAL_INTEGRATED_CANDIDATE_READY_FOR_FINAL_REVIEW`

The isolated DRS W2 local candidate now contains the exact Commander-frozen A14, Core, and Workspace source lanes plus integration-only runtime, source-convergence, and browser-smoke guards. This is still local evidence only. It does not imply canonical A0 admission, live PostgreSQL/RLS, Supabase production, real LINE/OpenAI, deployment, push, PR, merge, or launch.

## Exact Integration Identity

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-w2-integration-20260821`
- Branch: `codex/drs-w2-integration-20260821`
- Baseline: `dfae8484228c2718486f147b8e22103c7ed2f0f7`
- Issue: `#117`
- Current integrated commit/tree: recorded by the Commander terminal report after commit creation.

## Gate Ledger

| Gate | Status | Evidence | Remaining Requirement |
|---|---|---|---|
| Source convergence and admission | GREEN 7/7 | Exact frozen lane HEAD/tree and byte-for-byte admitted-file equality | Final independent review on exact integrated commit |
| Core Data/Audit W2 | FROZEN LOCAL WITH LIVE HOLD | `5149037dda85b82c2fedca01d9bb08f9bc649438`; tree `d00b4e415c55c3297242cbdc370c9cfed84a95e1`; independent APPROVE; Commander FROZEN; admitted Core tests `61/61` | Live disposable PostgreSQL/RLS proof remains false |
| A14 runtime adapter W2 | FROZEN LOCAL | `db955712199652c1fbac38273ba31e4b6fba64df`; tree `14992b5eb9946d229204f309f69fd3339acd4752`; independent APPROVE; Commander FROZEN; W2 `20/20`; W1+W2 `78/78` | No live LINE/OpenAI or production route claim |
| Workspace W2 | FROZEN LOCAL | `697bc83f6734abc6842546faa6feed9abef81f65`; tree `2768fe8e2403418fb92a27198a3bee6059e5b0de`; independent APPROVE; Commander FROZEN; source `23/23`; browser smoke `1/1` | No A0/canonical integration |
| Integration runtime contract | GREEN 13/13 | `tests/drs-w2-runtime-integration.test.mjs` | Live DB/RLS and real Auth remain outside this local candidate |
| Browser/product acceptance | GREEN 1/1 | `tests/drs-w2-browser-smoke.test.mjs` over admitted integration files | Independent browser/product reviewer still required |
| A0 immutable guard | GREEN | Protected path scan found no A0/canonical route/header/navigation/manifest/page-registry/CTA changes | Re-run on exact final commit |
| Secret/production guard | GREEN | Token-shape secret scan no match; no production commands used | Production/external gates remain closed |
| Final independent review | PENDING | Ready to dispatch against exact integrated commit | Security/privacy APPROVE and browser/product APPROVE required before Commander freeze |

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
- Sparse AI findings and sparse attachment arrays fail closed.
- Malformed transport acceptance: no final/receipt and stable failure replay.
- Explicit submitted snapshot: hash-only audit event is created before advisory; exact bytes/hash stay paired for the advisory call.
- AI free-form recommendation/proposed text: not persisted; policy-controlled findings and proposed-text hash only.
- Accepted transport evidence is snapshotted once before validation and persistence.
- Strict transport evidence: UTC RFC3339, destination/hash acknowledgement, and attachment identity/hash required.
- Assignment and formal-group intervals use calendar-valid RFC3339 parsing and fail closed for `"0"` and impossible dates.

## Workspace Browser Evidence

`tests/drs-w2-browser-smoke.test.mjs` serves the admitted integration worktree through a temporary local HTTP server and closes it after the test.

- Owner, Vendor, Specialist at `1440x900` and `390x844`.
- States covered: loading, ready, empty, retryable-error, permission-denied.
- Ready states: exactly one selected visible panel; after tab switch still exactly one.
- Non-ready states: tabs disabled/inert; ready-only content hidden while status panels may show product state.
- Specialist mobile Human local decision: visible live/receipt/trace copy uses product labels, not internal enum values.
- Console/page errors: `0`.
- Horizontal overflow: `0`.
- Visible controls below 44px: `0`.
- Forbidden visible engineering copy, payment escrow, old-house ROI, and low-bid marketplace copy: `0`.

## Verification Summary

Commands completed on the admitted integration tree:

```powershell
node --test tests/drs-w2-source-convergence.test.mjs
node --test tests/drs-w2-runtime-integration.test.mjs
$env:NODE_PATH='C:\Users\J\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'; node --test tests/drs-w2-browser-smoke.test.mjs
deno test --allow-net=none tests/line_bot/drs_runtime_adapter_w2.test.ts
deno test --allow-net=none --allow-read=src/lib/drs-linebot/w1.ts,supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql,tests/line_bot/drs_group_ai_human_w1.test.ts tests/line_bot
node --test tests/drs-core-contract.test.mjs tests/drs-core-postgres-runtime/preflight.test.mjs tests/drs-core-postgres-runtime/static-contract.test.mjs
node --test tests/drs-workspace-shell.test.mjs tests/drs-workspace-data-binding.test.mjs
deno check src/lib/drs-linebot/w1.ts src/lib/drs-linebot/runtime/mod.ts tests/line_bot/drs_group_ai_human_w1.test.ts tests/line_bot/drs_runtime_adapter_w2.test.ts
deno lint src/lib/drs-linebot tests/line_bot
deno fmt --check src/lib/drs-linebot tests/line_bot
```

Results:

- Source convergence/admitted-file equality: `7/7 PASS`.
- Integration runtime: `13/13 PASS`.
- Browser smoke: `1/1 PASS`.
- A14 W2: `20/20 PASS`.
- A14 W1+W2: `78/78 PASS`.
- Core contract/static/runtime harness: `61/61 PASS`.
- Workspace shell/data-binding: `23/23 PASS`.
- Deno check/lint/fmt: PASS.
- Node syntax checks: PASS.
- JSON parse: PASS.
- Diff whitespace guard: PASS.
- Token-shape secret guard: PASS.
- Protected-path guard: PASS.

## Remaining Holds

1. Final independent security/privacy review on the exact integrated commit.
2. Final independent browser/product review on the exact integrated commit.
3. Live PostgreSQL/RLS proof remains false because no disposable runtime proof was executed.
4. Real Supabase Auth, Google Calendar, secrets, redirect settings, Edge deploy, and production setup are not part of this W2 candidate and remain deferred.

## Forbidden Boundary

- A0/canonical UI and routes remain unchanged.
- No real LINE/OpenAI call or secret.
- No remote/live database or production migration.
- No deploy, push, PR, merge, destructive Git, payment, Budget Engine, Plancraft, tender/bid, or formal quote/Excel/PDF.
