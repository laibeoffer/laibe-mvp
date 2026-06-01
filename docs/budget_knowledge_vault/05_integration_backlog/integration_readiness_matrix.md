# Integration Readiness Matrix

This matrix is a support summary, not the official Integration Gate decision.

| Core Line | Workstream | Current Evidence | Missing | Vault Classification |
|---|---|---|---|---|
| Quote Factory | `quote-factory/price-range-governance` | QF5.4 / PR #3 evidence exists, but Issue #41 marks final acceptance pending | final acceptance / validator evidence accepted by Integration Officer | Functional acceptance pending |
| Raw Candidate | `warehouse/raw-candidate` | Compact blackboard / Issue #41 context now records PR #26 merged as `7b72fd9cfeada095ed5729bac3d728f4da0da806` with R1.5 CLI / static guard evidence | Final Completion Packet and Integration Officer gate acceptance | Functional acceptance pending after merge |
| MethodSpec | `warehouse/method-spec` | PR #30 context and integration readiness evidence exist; Issue #41 dispatches read-only Budget Engine entry investigation; compact blackboard routes blocker context to Issue #49; Issue #49 / PR #47 record docs-only `NO_ENTRY_FOUND_MINIMAL_DRY_RUN_ENTRY_REQUIRED` evidence | Commander authorization for a scoped minimal dry-run runtime entry, then implementation / verification evidence outside this vault | Blocked by missing engine entry |
| Output Documents | `output/budget-documents` | PR #23 merged, PR #29 open, snapshot-only usage note and static guard evidence exist; Issue #49 says PR #29 has no direct regression and Output Documents does not rely on `budget-generator.ts` | PR #29 / final static guard and snapshot-only evidence; upstream snapshot-compatible dry-run input still missing | Functional acceptance pending |

## Gate Rule

The Integration Officer, not this vault, determines readiness. This vault must not start the integration harness.

## Functional Acceptance Rule

Issue #41 records that `MERGED_TO_MAIN` is not equal to `FUNCTIONAL_ACCEPTED`.

- No workstream may be marked `TASK_COMPLETE_100` or `INTEGRATION_READY_100` without Functional Acceptance evidence.
- Docs / governance / blackboard / handoff-only PRs are `Functional Acceptance: NOT_APPLICABLE_DOCS_ONLY` and must not increase feature progress.
- Budget Knowledge Vault PRs are support documentation and cannot raise the four-line Integration Gate.

## Latest Vault Patrol

- checked_at: 2026-06-01T14:46:02+08:00
- source_checked: GitHub PR #32 / PR #31 / PR #47 / Issue #41 / Issue #49 / compact blackboard / four core vault summaries
- assigned_pr: PR #32 `Add Budget Knowledge Vault support agent`
- assigned_pr_status: open, mergeable clean, not merged, no PR comments or review threads found in latest scoped patrol
- assigned_pr_head_sha_at_patrol_start: `75c83540a4b91d24a92637c9874fe2cb66e86247`
- assigned_pr_base_sha: `896d5dd21ecedaa0754d2052262cedf67d5be82c`
- assigned_pr_comments: none found in scoped patrol
- related_boundary_pr: PR #31 `Register Budget Knowledge Vault support boundary`, open, mergeability dirty, review signal unavailable because Codex review usage limits were reached, now routed to Integration Officer disposition issue #41
- related_boundary_pr_head_sha: `024289e74b8d7e4200dd40aa210aca5f2ffcb82a`
- related_boundary_pr_status: open, not merged, mergeability dirty
- issue_41_comments_checked: Commander Dispatch - Budget Engine Entry Investigation remains the latest scoped instruction mirrored by this vault; it assigns read-only Budget Engine entry investigation outside this vault and preserves the prohibition on patching or creating `budget-generator.ts`
- issue_49_comments_checked: Issue #49 now contains the active Budget Engine Entry Investigation report. It confirms no old entry, no alternative entry, no callable `generateBudgetEstimate()`, no integration-harness readiness, Need Commander Yes before runtime implementation, and Need Reviewer No for the read-only investigation.
- pr_47_support_evidence: PR #47 is open / mergeable and records docs-only `NO_ENTRY_FOUND_MINIMAL_DRY_RUN_ENTRY_REQUIRED` evidence: `budget-generator.ts`, `demo-generate-budget.ts`, callable `generateBudgetEstimate()`, and an alternative Budget Engine entry are absent on GitHub `main`; runtime implementation and functional acceptance remain pending.
- scoped_change_since_last_patrol: PR #32 still has no comments or review threads and GitHub reports it mergeable at patrol-start head `75c83540a4b91d24a92637c9874fe2cb66e86247`; PR #31 has no new disposition comments or review threads; Issue #41 still has no new direct instruction for this vault; Issue #49 now has the requested investigation report and routes the next executable decision to Commander authorization for a scoped minimal dry-run runtime entry; compact blackboard support-only boundaries are unchanged.
- active_work: Budget Knowledge Vault initialization remains active until PR #31 / PR #32 are resolved, initialization is complete, and no known vault todo remains.
- no_idle_rule: if no new instruction exists, advance the first safe item in `AUTOMATION.md` / `00_index.md` active work queue.
- no_change_response_guard: `本 workstream 本輪無新指派。` must not be used while active initialization PRs, support gaps, or known todo items exist.
- issue_41_instruction: Budget Engine entry investigation is assigned outside this vault; this vault only mirrors the blocker, acceptance rules, Issue #49 / PR #47 evidence, and support-only boundaries.
- next_action: keep PR #32 current with compact blackboard discipline; continue scoped support-doc maintenance, decision-signal tracking, gap tracking, and evidence refresh without touching implementation code, Budget Engine entry files, runtime implementation proposals as decisions, Commander authorization, or gate decisions.
