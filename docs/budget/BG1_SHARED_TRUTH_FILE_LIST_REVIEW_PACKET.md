# BG1 Shared Truth File List Review Packet

Updated: `2026-06-15`

## 1. Review Status

| Field | Value |
|---|---|
| Task | `BG1_SHARED_TRUTH_FILE_LIST_REVIEW_REQUIRED_NO_EXECUTION` |
| Input decision | `REQUEST_FILE_LIST_REVIEW_BEFORE_AUTHORIZATION` |
| Input status | `BG1_DOCS_ONLY_SHARED_TRUTH_PR_REQUEST_READY_NO_EXECUTION` |
| Output status | `BG1_SHARED_TRUTH_FILE_LIST_REVIEW_REQUIRED_NO_EXECUTION` |
| Stage performed | `No` |
| Commit performed | `No` |
| Push performed | `No` |
| PR opened | `No` |
| Merge performed | `No` |
| Runtime implementation | `No` |
| Harness / tests / build / dev server | `No` |

## 2. File-list Rule

This packet is an exact review packet for Commander / Review Officer.

It does not authorize or perform stage, commit, push, PR creation, or merge.

The recommended PR scope is intentionally minimal:

- include the current accepted evidence chain;
- include the current docs-only repair design chain;
- include shared-truth PR request docs;
- include only the upstream boundary docs needed to understand Issue `#89` and PR `#100`;
- keep noisy historical round reports out unless Review Officer explicitly asks for them.

## 3. Must Include In Shared Truth PR

These files are the minimum exact set recommended for a docs-only shared-truth PR.

| File | Reason | Docs-only | Runtime / src / harness / formal estimate / production quantity involvement | Safe for docs-only PR |
|---|---|---|---|---|
| `docs/budget/BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_COLLECTION_RESULT.md` | Primary read-only type/source evidence accepted by review. | Yes | No | Yes |
| `docs/budget/BG1_RUNTIME_REPAIR_DECISION_PACKET.md` | Repair decision packet accepted by review. | Yes | No | Yes |
| `docs/budget/BG1_LOCAL_EVIDENCE_SHARED_TRUTH_INVENTORY.md` | Defines local evidence vs GitHub shared truth boundary. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_RUNTIME_DRIFT_REPAIR_PLAN.md` | Runtime drift repair plan, docs-only predecessor to evidence packet. | Yes | No | Yes |
| `docs/budget/BG1_RUNTIME_DRIFT_REPAIR_GATE_MATRIX.md` | Gate matrix and hard stops for repair flow. | Yes | No | Yes |
| `docs/budget/BG1_BUDGET_GENERATOR_ENTRYPOINT_REPAIR_PLAN.md` | Documents missing entrypoint repair plan without creating runtime file. | Yes | No | Yes |
| `docs/budget/BG1_BUDGET_ESTIMATE_TYPE_TRACE_PLAN.md` | Documents unresolved estimate type trace. | Yes | No | Yes |
| `docs/budget/BG1_RUNTIME_REPAIR_FORBIDDEN_SCOPE.md` | Central forbidden-scope guard. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN.md` | Main minimal runtime repair design accepted by review. | Yes | No | Yes |
| `docs/budget/BG1_MINIMAL_RUNTIME_REPAIR_CONTRACT.md` | Candidate-only / dry-run-only repair contract. | Yes | No | Yes |
| `docs/budget/BG1_BUDGET_GENERATOR_SKELETON_DESIGN.md` | Future skeleton design; no `budget-generator.ts` creation. | Yes | No | Yes |
| `docs/budget/BG1_GENERATE_BUDGET_ESTIMATE_GUARD_DESIGN.md` | Future guard semantics; no function creation. | Yes | No | Yes |
| `docs/budget/BG1_BUDGET_ESTIMATE_BLOCKED_ERROR_DESIGN.md` | Future blocked error design; no runtime class creation. | Yes | No | Yes |
| `docs/budget/BG1_NO_PRODUCTION_QUANTITY_GUARD_DESIGN.md` | Documents production quantity block. | Yes | No | Yes |
| `docs/budget/BG1_NO_FORMAL_ESTIMATE_GUARD_DESIGN.md` | Documents formal estimate block. | Yes | No | Yes |
| `docs/budget/BG1_RUNTIME_REPAIR_NEXT_AUTHORIZATION_PACKET.md` | Captures next authorization options after design. | Yes | No | Yes |
| `docs/budget/BG1_MINIMAL_RUNTIME_REPAIR_SEQUENCE.md` | Defines no-execution sequence. | Yes | No | Yes |
| `docs/budget/BG1_RUNTIME_REPAIR_TESTLESS_ACCEPTANCE_CRITERIA.md` | Defines acceptance without tests/build/harness. | Yes | No | Yes |
| `docs/budget/BG1_PR100_RUNTIME_ADAPTER_PROHIBITION_NOTE.md` | Blocks PR `#100` embedded script as runtime adapter. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_REVIEW_VERDICT_CONSUMPTION.md` | Consumes Issue `#103` PASS verdict. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_REQUEST.md` | Shared-truth PR request package root. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_CANDIDATE_FILE_LIST.md` | Prior candidate list, superseded by this exact review packet but useful audit context. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_BOUNDARY_CHECKLIST.md` | Docs-only boundary checklist. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_RISK_REVIEW.md` | Risk review and mitigations. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_COMMANDER_AUTH_REQUEST.md` | Commander authorization request options. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_EXCLUDED_FILES.md` | Explicit exclusion list. | Yes | No | Yes |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_DRAFT_BODY.md` | Draft PR body, not submitted. | Yes | No | Yes |
| `docs/budget/BG1_SHARED_TRUTH_FILE_LIST_REVIEW_PACKET.md` | This exact file-list review packet. | Yes | No | Yes |
| `docs/budget/BG1_PR100_DOCS_ONLY_ACTIVE_HEAD_BOUNDARY.md` | Defines PR `#100` docs-only active head boundary. | Yes | No | Yes |
| `docs/budget/BG1_PR100_PLAN_PUZZLE_0_12_ALIGNMENT.md` | Aligns PR `#100` with Plan Puzzle 0.12 docs-only intake. | Yes | No | Yes |
| `docs/budget/BG1_PLAN_PUZZLE_0_12_SHARED_TRUTH_INTAKE_CONSUMPTION.md` | Consumes upstream Plan Puzzle shared-truth context. | Yes | No | Yes |
| `docs/budget/BG1_PLAN_PUZZLE_0_12_SHARED_TRUTH_BLOCKERS.md` | Lists remaining shared-truth blockers. | Yes | No | Yes |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_HEAD_VERDICT_CONSUMPTION.md` | Records PR `#100` selected as docs-only active candidate export head. | Yes | No | Yes |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_COMPARISON_PACKET.md` | Provides PR `#76` vs PR `#100` comparison evidence behind verdict. | Yes | No | Yes |
| `docs/budget/BUDGET_RUNTIME_ENTRYPOINT_DISCOVERY.md` | Earlier runtime entrypoint discovery. | Yes | No | Yes |
| `docs/budget/BUDGET_RUNTIME_DOCS_DRIFT_DECISION_PACKET.md` | Earlier docs-runtime drift decision packet. | Yes | No | Yes |
| `docs/budget/BUDGET_INTERNAL_INTERFACE_PREP.md` | Internal budget interface prep for future design. | Yes | No | Yes |
| `docs/budget/BUDGET_ISSUE_89_GATE_SNAPSHOT.md` | Records Issue `#89` still blocks harness execution. | Yes | No | Yes |
| `docs/budget/BUDGET_NEXT_STITCHING_ACTIONS.md` | Current BG1 state / next action board. | Yes | No | Yes |
| `docs/NEXT_CODEX_HANDOFF.md` | Cross-thread handoff with latest BG1 state. | Yes | No | Yes, with line-ending warning noted. |

## 4. Temporarily Exclude From Shared Truth PR

These files are docs-only, but they are not required for the minimal shared-truth PR and should be left out unless Review Officer expands scope.

| File | Reason | Docs-only | Runtime / src / harness / formal estimate / production quantity involvement | Safe for docs-only PR |
|---|---|---|---|---|
| `docs/budget/BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_COLLECTION_REQUEST.md` | Superseded by completed result file. | Yes | No | Not needed |
| `docs/budget/BG1_RUNTIME_REPAIR_AUTHORIZATION_OUTBOX.md` | Superseded by Issue `#102` and evidence result. | Yes | No | Not needed |
| `docs/budget/BG1_RUNTIME_REPAIR_SCOPE_AUTHORIZATION_REQUEST.md` | Superseded by Issue `#102` authorization. | Yes | No | Not needed |
| `docs/budget/BG1_RUNTIME_REPAIR_SCOPE_AUTHORIZATION_OPTIONS.md` | Superseded by later decision packet and design. | Yes | No | Not needed |
| `docs/budget/BG1_RUNTIME_REPAIR_SHARED_TRUTH_PRECONDITION.md` | Superseded by current shared-truth PR request. | Yes | No | Not needed |
| `docs/budget/BG1_RUNTIME_REPAIR_REVIEWER_COMMANDER_AUTH_REQUEST_DRAFT.md` | Draft-only old request; superseded. | Yes | No | Not needed |
| `docs/budget/BG1_RUNTIME_REPAIR_MINIMAL_PATCH_SEQUENCE_DRAFT.md` | Patch-plan-adjacent draft; could imply implementation too early. | Yes | No runtime change, but implementation-adjacent wording risk | No for minimal PR |
| `docs/budget/BG1_COMMANDER_REVIEWER_DECISION_REQUEST.md` | Earlier decision request, superseded by later verdicts. | Yes | No | Not needed |
| `docs/budget/BG1_COMMANDER_REVIEWER_CANDIDATE_EXPORT_HEAD_DECISION_INTAKE.md` | Earlier intake, superseded by verdict consumption. | Yes | No | Not needed |
| `docs/budget/BG1_CANDIDATE_EXPORT_HEAD_DECISION_CONSUMPTION.md` | Earlier Commander A-G consumption, superseded by reviewer verdict consumption and PR100 boundary. | Yes | No | Not needed |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_HEAD_VERDICT_INTAKE_TEMPLATE.md` | Template, not evidence needed for minimal PR. | Yes | No | Not needed |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_HEAD_VERDICT_REQUEST_SUBMISSION.md` | Submission draft, superseded by verdict consumption. | Yes | No | Not needed |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_REVIEW_REQUEST.md` | Review request draft, superseded by verdict consumption. | Yes | No | Not needed |
| `docs/budget/BG1_CANDIDATE_CONTRACT_STITCHING_PLAN.md` | Earlier candidate contract plan; minimal PR should focus on runtime drift evidence/design. | Yes | No | Not needed |
| `docs/budget/BG1_DOCS_ONLY_CANDIDATE_CONTRACT_ADAPTER_REPAIR_PLAN.md` | Adapter repair planning is adjacent but not required for runtime drift shared-truth PR. | Yes | No | Not needed |
| `docs/budget/BG1_PLAN_PUZZLE_SHARED_TRUTH_CONSUMPTION.md` | Earlier generic shared-truth consumption; newer Plan Puzzle 0.12 files are more exact. | Yes | No | Not needed |
| `docs/budget/BUDGET_STITCHING_CONTROL_MANIFEST.md` | Broad control manifest; useful but widens PR scope. | Yes | No | Not needed |
| `docs/budget/BUDGET_WORKSTREAM_ARTIFACT_REGISTRY.md` | Broad registry; useful but widens PR scope. | Yes | No | Not needed |
| `docs/budget/BUDGET_INTERFACE_GATE_MAP.md` | Broad interface map; not required for minimal runtime drift PR. | Yes | No | Not needed |
| `docs/budget/BUDGET_RUNTIME_DOCS_DRIFT_AUDIT.md` | Earlier audit superseded by evidence collection result and decision packet. | Yes | No | Not needed |
| tracked numbered `docs/budget/*.md` baseline files | Already tracked and unchanged in current review scope. | Yes | No | Not part of this PR diff |
| `docs/budget/plancraft-plus-production-adapter-design.md` | Tracked baseline and production-adapter-adjacent. | Yes | Production-adapter-adjacent wording risk | Not part of this PR diff |

## 5. Needs Reviewer Decision

These files may be included only if Review Officer intentionally widens the PR beyond the minimal runtime drift evidence/design scope.

| File / Path | Reason | Docs-only | Runtime / src / harness / formal estimate / production quantity involvement | Safe for docs-only PR |
|---|---|---|---|---|
| `docs/bg1_budget_commander/BG1_COMMANDER_CHARTER.md` | BG1 governance context. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_SOURCE_BOUNDARY.md` | Source boundary context. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_ATTACHMENT_FORMAT_MATRIX.md` | Owner quote attachment context, not core runtime drift. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_TEST_QUEUE.md` | Queue context, may be stale/noisy. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_COMMANDER_TEAM_OPERATION_BOARD.md` | Operation board, broad historical state. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_STITCHING_SEQUENCE_VALIDATION_REPORT.md` | Sequence validation evidence, useful but older. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_NO_EXECUTION_UNTIL_HARNESS_AUTHORIZATION_GUARD.md` | Strong guard context. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_ISSUE_89_BLOCKED_WATCH_BOARD.md` | Issue `#89` watch state, older than budget snapshot. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_ISSUE_89_FOUR_VERDICT_RESPONSE_PLAN.md` | Harness gate response plan. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_ISSUE_89_REVIEWER_DECISION_INTAKE.md` | Harness reviewer intake. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_BLOCKED_WATCH_ACTIVE_REPORT.md` | Blocked watch report, historical. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_BUDGET_GENERATION_STITCHING_EVIDENCE_PACKET.md` | Broad stitching packet, may duplicate current evidence. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_BUDGET_GENERATION_STITCHING_REPORT.md` | Broad report, may be superseded. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_BUDGET_GENERATION_STITCHING_TEAM_ROSTER.md` | Team roster, governance context only. | Yes | No | Conditional |
| `docs/bg1_budget_commander/BG1_TO_BG2_BUDGET_STITCHING_GOAL_COORDINATION_TRACKER.md` | Cross-team coordination tracker, broad. | Yes | No | Conditional |
| `docs/bg1_budget_commander/** other files` | Many historical round reports and owner quote renderer fixture records. | Yes | No direct runtime change, but scope/noise risk | Conditional |
| `docs/budget/BG1_RUNTIME_DRIFT_REPAIR_BLOCKER_MAP.md` | Useful blocker context but not required if gate matrix + decision packet are included. | Yes | No | Conditional |
| `docs/budget/BG1_BUDGET_ESTIMATE_TYPE_TRACE_PLAN.md` | Included in minimal set above; if Review Officer wants an even smaller PR, this can move to optional. | Yes | No | Conditional fallback |
| `docs/budget/BG1_BUDGET_GENERATOR_ENTRYPOINT_REPAIR_PLAN.md` | Included in minimal set above; can be optional only if PR is narrowed to evidence-only. | Yes | No | Conditional fallback |

## 6. Exact Excluded Non-docs Scope

| Path / Pattern | Reason | Docs-only | Runtime / src / harness / formal estimate / production quantity involvement | Safe for docs-only PR |
|---|---|---|---|---|
| `src/**` | Runtime/source modification forbidden. | No | Yes | No |
| `src/lib/budget/budget-generator.ts` | Missing and must not be created. | No | Yes | No |
| `src/lib/budget/adapters/preview-floor-plan-adapter.ts` | Adapter patch forbidden. | No | Yes | No |
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/**` | Plan Puzzle runtime forbidden. | No | Yes | No |
| `plan-puzzle.js` | Plan Puzzle runtime forbidden. | No | Yes | No |
| `code.html` | Plan Puzzle runtime forbidden. | No | Yes | No |
| renderer runtime files | Renderer production integration forbidden. | No | Yes | No |
| generated Excel / PDF / binary outputs | Formal output forbidden. | No | Yes | No |
| DB / Supabase / API / AI / RAG / payment / LINE / n8n files | Sensitive integration forbidden. | No | Yes | No |

## 7. Review Officer Decision Needed

Review Officer should choose one:

| Decision | Meaning | Resulting State |
|---|---|---|
| `APPROVE_MINIMAL_FILE_LIST_FOR_DOCS_ONLY_PR_AUTHORIZATION` | Approve section 3 exact files only. | `AWAIT_COMMANDER_DOCS_ONLY_SHARED_TRUTH_PR_AUTHORIZATION_NO_EXECUTION` |
| `APPROVE_WITH_REVIEWER_DECISION_FILES_ADDED` | Approve section 3 plus selected section 5 files. | `AWAIT_COMMANDER_DOCS_ONLY_SHARED_TRUTH_PR_AUTHORIZATION_NO_EXECUTION` |
| `REQUEST_NARROWER_FILE_LIST` | Ask BG1 to reduce the must-include list. | `BG1_SHARED_TRUTH_FILE_LIST_REVIEW_REQUIRED_NO_EXECUTION` |
| `REJECT_FILE_LIST_FOR_SCOPE_RISK` | Reject because the proposed PR is too broad or risky. | `BG1_SHARED_TRUTH_FILE_LIST_REJECTED_NO_EXECUTION` |

## 8. Packet Result

`BG1_SHARED_TRUTH_FILE_LIST_REVIEW_REQUIRED_NO_EXECUTION`

