# Integration Gap Register

## Current Integration Harness Blockers

| Gap | Workstream | Status | Why It Blocks Integration |
|---|---|---|---|
| PR #3 not merged / still draft in task brief | Quote Factory | Open | Shared truth for export package is not confirmed. |
| Raw Candidate Final Completion Packet pending after PR #26 merge | Raw Candidate | Open | Compact blackboard / Issue #41 context now records PR #26 as merged, but final packet and Integration Officer gate acceptance remain pending. |
| `BUDGET_ENGINE_ENTRY_BLOCKER` | MethodSpec / Budget Engine | Open | Executable budget integration dry-run cannot be claimed until the engine entry path is clarified. Issue #41 dispatches a read-only investigation and the compact blackboard routes active blocker context through Issue #49 / `budget/engine-entry-picking`. |
| PR #29 not merged in task brief | Output Documents | Open | Snapshot-only integration usage note is not confirmed as merged shared truth. |
| Functional Acceptance evidence required | All four budget core lines | Open | Issue #41 says `MERGED_TO_MAIN` is not `FUNCTIONAL_ACCEPTED`; no line can become 100 without accepted runtime / validator / static guard / smoke evidence. |
| Budget Engine entry investigation pending | MethodSpec / Budget Engine | Open | Issue #41 assigns read-only Budget Engine entry investigation outside this vault and forbids patching or creating `budget-generator.ts`, starting integration harness, or marking any line 100 from investigation alone. |

## Support Agent Initialization Gaps

These items are not part of the four-line Integration Gate, but they are active Budget Knowledge Vault work until resolved.

| Gap | Workstream | Status | Why It Matters | Next Vault Action |
|---|---|---|---|---|
| PR #31 boundary PR Integration Officer disposition pending | `knowledge/budget-vault` / governance boundary | Open | PR #31 records Budget Knowledge Vault support boundary, has Codex review usage-limit comments, and is now included in Integration Officer disposition issue #41. It should not be counted complete while not merge-ready. | Track as related open boundary PR; do not merge, close, supersede, approve, reject, or decide it from this vault. |
| PR #32 review / merge pending | `knowledge/budget-vault` | Open | The initial vault structure exists on the branch but is not yet merged shared truth; current patrol also refreshes it against compact blackboard changes from `main`. | Keep scoped patrol on PR #32 comments, assigned issues, Integration Officer instructions, and mergeability against compact blackboard changes. |
| No-change response cannot be used yet | `knowledge/budget-vault` | Open until initialization completes | Open initialization work exists, so treating the workstream as idle would hide active work. | Use explicit progress reports until PR #31 / PR #32 are resolved, initialization is complete, and no new tasks remain. |

## Non-Blocker Support Note

Budget Knowledge Vault is `ACTIVE_SUPPORT` and not part of the four-line Integration Gate. It must not raise or lower core readiness percentages.
