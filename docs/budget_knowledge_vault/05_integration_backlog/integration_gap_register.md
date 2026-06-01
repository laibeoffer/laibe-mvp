# Integration Gap Register

## Current Integration Harness Blockers

| Gap | Workstream | Status | Why It Blocks Integration |
|---|---|---|---|
| PR #3 not merged / still draft in task brief | Quote Factory | Open | Shared truth for export package is not confirmed. |
| Raw Candidate Final Completion Packet pending after PR #26 merge | Raw Candidate | Open | Compact blackboard / Issue #41 context now records PR #26 as merged, but final packet and Integration Officer gate acceptance remain pending. |
| `BUDGET_ENGINE_ENTRY_BLOCKER` | MethodSpec / Budget Engine | Open | Executable budget integration dry-run cannot be claimed until the engine entry exists and passes Functional Acceptance. Issue #49 confirms no current entry and records Commander authorization for the Budget Engine Entry & Picking Agent to prepare a minimal dry-run runtime with zero-value placeholders only. |
| PR #29 not merged in task brief | Output Documents | Open | Snapshot-only integration usage note is not confirmed as merged shared truth. |
| Functional Acceptance evidence required | All four budget core lines | Open | Issue #41 says `MERGED_TO_MAIN` is not `FUNCTIONAL_ACCEPTED`; no line can become 100 without accepted runtime / validator / static guard / smoke evidence. |
| Budget Engine entry investigation report posted / runtime entry still absent | MethodSpec / Budget Engine | Open | Issue #49 now contains the active investigation report against GitHub `main` `896d5dd21ecedaa0754d2052262cedf67d5be82c`. It confirms `budget-generator.ts`, `demo-generate-budget.ts`, callable `generateBudgetEstimate()`, and an alternative Budget Engine entry are absent. Runtime implementation and functional acceptance remain pending. |
| Minimal dry-run entry implementation / evidence pending | MethodSpec / Budget Engine | Open | Issue #49 records Commander authorization to prepare the minimal dry-run runtime with zero-value placeholder amounts only; PR #47 comment `4590757841` now records `FOLLOW_UP_REQUIRED / IMPLEMENTATION_PLAN_PENDING` and asks Budget Engine Entry & Picking Agent for the executable implementation plan, branch / PR plan, exact files, CLI/demo plan, snapshot-compatible output evidence plan, forbidden-flow validation plan, zero-value placeholder confirmation, and Integration Officer review need before merge. CLI/demo evidence, snapshot-compatible output shape, dry-run metadata flags, forbidden-flow checks, and Functional Acceptance are still required before completion. |

## Support Agent Initialization Gaps

These items are not part of the four-line Integration Gate, but they are active Budget Knowledge Vault work until resolved.

| Gap | Workstream | Status | Why It Matters | Next Vault Action |
|---|---|---|---|---|
| PR #31 boundary PR Integration Officer disposition pending | `knowledge/budget-vault` / governance boundary | Open | PR #31 records Budget Knowledge Vault support boundary, has Codex review usage-limit comments, and is now included in Integration Officer disposition issue #41. It should not be counted complete while not merge-ready. | Track as related open boundary PR; do not merge, close, supersede, approve, reject, or decide it from this vault. |
| PR #32 review / merge pending | `knowledge/budget-vault` | Open | The initial vault structure exists on the branch but is not yet merged shared truth; current patrol also refreshes it against compact blackboard changes from `main`. | Keep scoped patrol on PR #32 comments, assigned issues, Integration Officer instructions, and mergeability against compact blackboard changes. |
| PR #32 mergeability signal | `knowledge/budget-vault` | Open / GitHub reports `mergeable=false` | 2026-06-01T19:21:21+08:00 scoped patrol found PR #32 open and not merged at head `d1184b0e632482a75a71db47bd04c56452b2c9ec`; no PR comments or review threads were found. This prevents the vault from treating initialization as merge-ready from support evidence alone. | Track as support evidence only. Integration Officer / PR owner decides whether refresh, rebase, or disposition is needed; this vault must not merge, rebase, close, or touch implementation code. |
| No-change response cannot be used yet | `knowledge/budget-vault` | Open until initialization completes | Open initialization work exists, so treating the workstream as idle would hide active work. | Use explicit progress reports until PR #31 / PR #32 are resolved, initialization is complete, and no new tasks remain. |

## Non-Blocker Support Note

Budget Knowledge Vault is `ACTIVE_SUPPORT` and not part of the four-line Integration Gate. It must not raise or lower core readiness percentages.
