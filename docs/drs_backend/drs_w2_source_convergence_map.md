# DRS W2 Source Convergence Map

## Purpose

This document records the exact local source lanes that may feed the isolated DRS W2 integration candidate. It is evidence for local convergence only. It does not authorize A0 changes, production integration, remote services, deployment, push, PR, or merge.

## Integration Identity

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-w2-integration-20260821`
- Branch: `codex/drs-w2-integration-20260821`
- Baseline: `dfae8484228c2718486f147b8e22103c7ed2f0f7`
- Issue: `#117`
- Current state: `ACTIVE_PROTECTED`

## Lane Inventory

### Core Data/Audit

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-core-data-audit-w1-20260820`
- Branch: `codex/drs-core-data-audit-w1-20260820`
- Frozen W1 parent: `5fac5f5c98554683b6046b5b39aa8db9173ca25b`
- W1 tree: `40107b3a287b028c8f19fd5a19c5b190bf6f8692`
- W2 issue: `#120`
- W2 status: `FROZEN_LOCAL_CANDIDATE_WITH_LIVE_POSTGRES_HOLD`
- W2 candidate: `5149037dda85b82c2fedca01d9bb08f9bc649438`
- W2 candidate tree: `d00b4e415c55c3297242cbdc370c9cfed84a95e1`
- Independent verdict: `APPROVE_CORE_W2_LOCAL_HARNESS_FOR_COMMANDER_FREEZE_WITH_LIVE_POSTGRES_HOLD`
- Runtime boundary: deterministic harness exists and W2 16/16 plus W1 45/45 pass, but live disposable PostgreSQL proof remains false because no runtime command was available.
- W1 cumulative paths from integration baseline:
  - `docs/drs_backend/core_data_audit_w1.md`
  - `src/lib/drs-core/index.mjs`
  - `supabase/migrations/20260820090000_drs_core_case_audit_contract.sql`
  - `tests/drs-core-contract.test.mjs`
- W2 admission allowlist:
  - `tests/drs-core-postgres-runtime/**`
  - `scripts/drs-core-postgres-runtime/**`
  - `docs/drs_backend/core_data_audit_w2_runtime.md`
  - bounded migration/contract-test repair only when runtime RED proves it

### A14 LINE/OpenAI Runtime Adapter

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a14-drs-linebot-group-ai-human-w1-20260820`
- Branch: `drs-web/a14-drs-linebot-group-ai-human-w1-20260820`
- Frozen W1 parent: `8cc97d03f65b3317e21aeae9b7c252f2079709ab`
- W1 tree: `2f805cbb3e08206aeee795301fc1f3500265ffb1`
- W2 issue: `#119`
- W2 status: `ACTIVE_REWORK_AFTER_REREVIEW_REQUEST_CHANGES`
- Rejected rework candidate: `a2ca226017c74bb64d7de0048a667ae31b8bc279`
- Rejected rework candidate tree: `abb1679e3cd279f94a2ef1db8b4c6c66c49d55d5`
- Independent verdict: `REQUEST_CHANGES_A14_W2`
- Current blocker: provider-event lease ownership/expiry must protect the actual case receipt write, not only the final claim commit.
- W1 source paths:
  - `src/lib/drs-linebot/w1.ts`
  - `supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql`
  - `tests/line_bot/drs_group_ai_human_w1.test.ts`
- Auxiliary baseline delta requiring explicit convergence review: `deno.json` is present and was omitted from the older three-path frozen summary. Source admission inventory must include it; it must not be silently admitted.
- W2 admission allowlist:
  - `src/lib/drs-linebot/runtime/**`
  - `tests/line_bot/drs_runtime_adapter_w2.test.ts`
  - `docs/drs_backend/line_ai_runtime_adapter_w2.md`
  - minimal `src/lib/drs-linebot/w1.ts` export seam only when proven necessary

### Isolated DRS Workspace

- Worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-workspaces-w1-20260820`
- Branch: `codex/drs-workspaces-w1-20260820`
- Frozen W1 parent: `6866e9e61cadf6a22ae485c944a4f6ca753475f1`
- W1 tree: `a2ab44c1ca1402923dc1d062c34c98638c46a756`
- W2 issue: `#118`
- W2 status: `CANDIDATE_PENDING_INDEPENDENT_REVIEW_AFTER_COMMANDER_BROWSER_GREEN`
- W2 candidate: `4f9f3688224d12399fdcc842ed19a31ed9a90ff5`
- W2 candidate tree: `43b54bf3efe9cebaa907008d91e1fd804a2915a4`
- Commander browser smoke: `30/30` role/state/viewport checks green on `127.0.0.1:5185`; console errors `0`, max horizontal overflow `0`, small controls `0`, forbidden copy `0`; reviewer pending.
- W1 cumulative paths: 11 files under `docs/drs_backend/workspace_ui_w1.md`, `tests/drs-workspace-shell.test.mjs`, and the three `src/stitch_laibe_landing_onboarding/drs_standalone/*_workspace/` directories.
- W2 admission allowlist:
  - `src/stitch_laibe_landing_onboarding/drs_standalone/**`
  - `tests/drs-workspace-data-binding.test.mjs`
  - `tests/drs-workspace-shell.test.mjs`
  - `tests/drs-workspace-browser-e2e.test.mjs`
  - `docs/drs_backend/workspace_ui_w2.md`

## Protected Paths

Any W2 candidate touching these surfaces is rejected before integration:

- `src/stitch_laibe_landing_onboarding/pcm_standalone/**`
- shared/canonical UI outside `drs_standalone/**`
- route manifest or runtime routes
- `AI_RULES/PAGE_REGISTRY.md`
- `AI_RULES/CTA_FLOW_MAP.md`
- header or navigation source
- payment, Budget Engine, Plancraft, tender, bid, formal quote/Excel/PDF paths

## Admission Gate

A lane may be copied or cherry-picked into the integration worktree only when all conditions are true:

1. HEAD is a descendant of the exact frozen W1 parent and differs from it.
2. Worktree and index are clean.
3. Every W2 delta path is inside the lane allowlist.
4. Focused tests and lane-wide regression tests pass.
5. An independent reviewer returns `APPROVE` against the exact commit/tree.
6. The Commander issues a `FROZEN` instruction.

Current decision: `HOLD_NO_SOURCE_ADMISSION`. The source convergence test is a clean-source inventory check only; it is not admission. Core W2 is frozen locally with `LIVE_POSTGRES_PROOF=FALSE`; A14 W2 is rejected and in active rework; Workspace W2 has Commander browser evidence and is pending independent review. No lane may be copied or cherry-picked into the integration worktree until all three source candidates are exact approved and Commander frozen.

## Commander Bridge Decisions

These decisions close the source-level ambiguities without changing A0 or authorising production:

1. **Migration order:** A14 `20260820000000` precedes Core `20260820090000`; a fresh-database test must prove `extensions.digest` resolves.
2. **Group mapping:** both A14 group types map to Core `DRS_CASE_GROUP`. A separate integration visibility field preserves `OWNER_DRS_PRIVATE` versus `OWNER_VENDOR_DRS_SHARED` and controls projections.
3. **Vendor access:** an active, time-bounded case participant binding is required. Vendor access must pass RLS against that binding; service-role bypass is not a product permission model.
4. **Specialist identity:** immutable `specialist_id` binds to a verified authentication subject. Runtime code derives the subject from an injected verified session and does not accept it from an arbitrary request payload.
5. **Hash translation:** Core body hash and A14 transport-payload hash remain distinct named values. Both are verified; neither is substituted for the other.
6. **Inbound receipt:** A14 webhook receipt is an internal ingestion receipt and does not become a Core outbound `RECEIPT`.
7. **Queued send:** A14 queued outbox/final-message records are internal preparation state. Core `FINAL_MESSAGE` is appended only after transport acceptance, followed by exactly one Core `RECEIPT` with `recipient_read=false`.
8. **Cancellation:** a Human `CANCEL` consumes the review/decision path without transport and creates no Core final-message or outbound receipt event.
9. **AI review timing:** the bridge appends the Core AI review while the explicitly submitted snapshot is available; it must not attempt a post-hoc reconstruction after A14 clears the request body.
10. **Audit chain:** the bridge owns one Core tail pointer per case and appends a single linear predecessor chain. A14 audit identifiers remain correlations, not Core predecessors.

## P0 Integration Gaps

- No A14-to-Core composition adapter or shared transaction boundary exists yet.
- No accepted/timeout/retry/permanent-failure transport executor writes the Core final-message/receipt pair.
- No verified-session-to-specialist binding exists in the current candidates.
- No Vendor participant/RLS projection exists in Core W1.
- The isolated workspace has W2 data binding in progress but no admitted durable projection.
- Attachment authorization, retention, expiry, and deletion remain unproved.
