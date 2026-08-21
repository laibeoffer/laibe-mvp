# DRS W2 Source Convergence Map

## Purpose

This document records the exact local source lanes admitted into the isolated DRS W2 integration candidate. It is local-source evidence only. It does not authorize A0/canonical changes, production integration, remote services, deployment, push, PR, or merge.

## Integration Identity

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-w2-integration-20260821`
- Branch: `codex/drs-w2-integration-20260821`
- Baseline: `dfae8484228c2718486f147b8e22103c7ed2f0f7`
- Issue: `#117`
- Current state: `DRS_W2_LOCAL_INTEGRATED_CANDIDATE_READY_FOR_FINAL_REVIEW`

## Admitted Lane Inventory

### Core Data/Audit

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-core-data-audit-w1-20260820`
- Branch: `codex/drs-core-data-audit-w1-20260820`
- Frozen W1 parent: `5fac5f5c98554683b6046b5b39aa8db9173ca25b`
- W2 issue: `#120`
- W2 status: `FROZEN_LOCAL_CANDIDATE_WITH_LIVE_POSTGRES_HOLD`
- W2 frozen commit: `5149037dda85b82c2fedca01d9bb08f9bc649438`
- W2 frozen tree: `d00b4e415c55c3297242cbdc370c9cfed84a95e1`
- Independent verdict: `APPROVE_CORE_W2_LOCAL_HARNESS_FOR_COMMANDER_FREEZE_WITH_LIVE_POSTGRES_HOLD`
- Commander freeze token: `DRS_CORE_W2_FROZEN_LOCAL_CANDIDATE_WITH_LIVE_POSTGRES_HOLD`
- Evidence: W2 harness/static `16/16`, W1 contract `45/45`, admitted integration Core tests `61/61`.
- Live hold: `LIVE_POSTGRES_PROOF=FALSE`; no disposable PostgreSQL binary/runtime proof is claimed.
- Admitted paths:
  - `docs/drs_backend/core_data_audit_w1.md`
  - `docs/drs_backend/core_data_audit_w2_runtime.md`
  - `scripts/drs-core-postgres-runtime/bootstrap-local-auth.sql`
  - `scripts/drs-core-postgres-runtime/run-runtime-checks.mjs`
  - `scripts/drs-core-postgres-runtime/runtime-harness.mjs`
  - `scripts/drs-core-postgres-runtime/verify-drs-core-runtime.sql`
  - `src/lib/drs-core/index.mjs`
  - `supabase/migrations/20260820090000_drs_core_case_audit_contract.sql`
  - `tests/drs-core-contract.test.mjs`
  - `tests/drs-core-postgres-runtime/preflight.test.mjs`
  - `tests/drs-core-postgres-runtime/static-contract.test.mjs`

### A14 LINE/OpenAI Runtime Adapter

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a14-drs-linebot-group-ai-human-w1-20260820`
- Branch: `drs-web/a14-drs-linebot-group-ai-human-w1-20260820`
- Frozen W1 parent: `8cc97d03f65b3317e21aeae9b7c252f2079709ab`
- W2 issue: `#119`
- W2 status: `FROZEN_LOCAL_CANDIDATE`
- W2 frozen commit: `db955712199652c1fbac38273ba31e4b6fba64df`
- W2 frozen tree: `14992b5eb9946d229204f309f69fd3339acd4752`
- Independent verdict: `APPROVE_A14_W2_LOCAL_CANDIDATE_FOR_COMMANDER_FREEZE`
- Commander freeze token: `A14_DRS_LINEBOT_W2_FROZEN_LOCAL_CANDIDATE`
- Evidence: W2 `20/20`, W1+W2 `78/78`, Deno check/lint/fmt clean.
- Admission note: `deno.json` is included in the source inventory and admitted source guard.
- Admitted paths:
  - `deno.json`
  - `docs/drs_backend/line_ai_runtime_adapter_w2.md`
  - `src/lib/drs-linebot/runtime/mod.ts`
  - `src/lib/drs-linebot/w1.ts`
  - `supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql`
  - `tests/line_bot/drs_group_ai_human_w1.test.ts`
  - `tests/line_bot/drs_runtime_adapter_w2.test.ts`

### Isolated DRS Workspace

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-workspaces-w1-20260820`
- Branch: `codex/drs-workspaces-w1-20260820`
- Frozen W1 parent: `6866e9e61cadf6a22ae485c944a4f6ca753475f1`
- W2 issue: `#118`
- W2 status: `FROZEN_LOCAL_CANDIDATE`
- W2 frozen commit: `697bc83f6734abc6842546faa6feed9abef81f65`
- W2 frozen tree: `2768fe8e2403418fb92a27198a3bee6059e5b0de`
- Independent verdict: `APPROVE_WORKSPACE_W2_LOCAL_CANDIDATE_FOR_COMMANDER_FREEZE`
- Commander freeze token: `DRS_WORKSPACE_UI_W2_FROZEN_LOCAL_CANDIDATE`
- Evidence: source tests `23/23`; Commander and reviewer browser smoke green; admitted integration browser smoke `1/1`.
- Admission note: isolated `drs_standalone/**` only; no A0/canonical route/header/navigation/manifest/page-registry/CTA integration.
- Admitted paths:
  - `docs/drs_backend/workspace_ui_w1.md`
  - `docs/drs_backend/workspace_ui_w2.md`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/owner_workspace/app.js`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/owner_workspace/code.html`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/owner_workspace/styles.css`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/shared/drs-data-client.js`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/shared/drs-workspace-renderer.js`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/app.js`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/code.html`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/styles.css`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/vendor_workspace/app.js`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/vendor_workspace/code.html`
  - `src/stitch_laibe_landing_onboarding/drs_standalone/vendor_workspace/styles.css`
  - `tests/drs-workspace-data-binding.test.mjs`
  - `tests/drs-workspace-shell.test.mjs`

## Protected Paths

Any candidate touching these surfaces is rejected before local source admission:

- `src/stitch_laibe_landing_onboarding/pcm_standalone/**`
- Shared/canonical UI outside `drs_standalone/**`
- Route manifest or runtime routes
- `AI_RULES/PAGE_REGISTRY.md`
- `AI_RULES/CTA_FLOW_MAP.md`
- Header or navigation source
- Payment, Budget Engine, Plancraft, tender, bid, formal quote, Excel, or PDF paths

The admitted path guard returned no protected-path matches.

## Admission Decision

Current decision: `SOURCE_ADMITTED_LOCAL_CANDIDATE_FINAL_REVIEW_PENDING`.

Admission method: final-tree diffs from baseline `dfae8484228c2718486f147b8e22103c7ed2f0f7` to the three Commander-frozen lane commits were applied into the integration worktree. The integration source-convergence test now proves:

1. Each lane worktree is still clean and at the exact frozen commit/tree.
2. Each lane remains a descendant of its frozen W1 parent.
3. Each lane W2 delta stays inside its allowlist and outside protected A0 paths.
4. Each admitted integration file is byte-for-byte equal to the corresponding file at the frozen lane commit.
5. Migration filenames remain unique, with A14 `20260820000000` before Core `20260820090000`.

Evidence command:

```powershell
node --test tests/drs-w2-source-convergence.test.mjs
```

Result: `7/7 PASS`.

## Commander Bridge Decisions

1. **Migration order:** A14 `20260820000000` precedes Core `20260820090000`.
2. **Group mapping:** both A14 group types map to Core `DRS_CASE_GROUP`; visibility is preserved separately as `OWNER_DRS_PRIVATE` versus `OWNER_VENDOR_DRS_SHARED`.
3. **Vendor access:** local UI is role-scoped. Durable vendor participant/RLS projection remains a live-runtime gate, not a production claim.
4. **Specialist identity:** integration runtime derives the DRS specialist from an injected verified session binding; caller-supplied specialist authority is rejected.
5. **Hash translation:** Core body hash and A14 transport payload hash are distinct and non-substitutable.
6. **Inbound receipt:** A14 webhook receipt remains internal ingestion evidence and is not converted into outbound Core `RECEIPT`.
7. **Queued send:** Core-style `FINAL_MESSAGE` and outbound `RECEIPT` are appended only after complete transport acceptance.
8. **Cancellation:** Human `CANCEL` consumes no transport and creates no final-message/outbound-receipt event.
9. **AI review timing:** the bridge records a hash-only submitted snapshot before advisory review; hidden reasoning, intermediate edits, and submitted body bytes are not persisted.
10. **Audit chain:** the local integration runtime maintains one linear predecessor chain per case.

## Remaining External Holds

- No live PostgreSQL/RLS execution is claimed.
- No remote Supabase migration apply, live LINE/OpenAI call, secret, deploy, push, PR, merge, or production launch is authorized.
- No canonical A0 route admission is claimed.
