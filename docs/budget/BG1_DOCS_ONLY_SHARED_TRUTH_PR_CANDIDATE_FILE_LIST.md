# BG1 Docs-Only Shared Truth PR Candidate File List

Updated: `2026-06-14`

Status: `PR_CANDIDATE_FILE_LIST_READY_NO_EXECUTION`

## 1. Candidate File List Boundary

This file list is a proposal only.

It does not stage, commit, push, open a PR, merge, or publish any file.

## 2. Must Include

These files form the core BG1 runtime drift evidence and docs-only repair design chain.

| File Path | Status | Include Decision | Reason | Risk |
|---|---|---|---|---|
| `docs/budget/BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_COLLECTION_RESULT.md` | new local evidence | include | Primary read-only type/source evidence. | Low if docs-only. |
| `docs/budget/BG1_RUNTIME_REPAIR_DECISION_PACKET.md` | new local evidence | include | Repair decision packet accepted for next design step. | Low if docs-only. |
| `docs/budget/BG1_LOCAL_EVIDENCE_SHARED_TRUTH_INVENTORY.md` | new local evidence | include | Records local-vs-shared truth boundary. | Low. |
| `docs/budget/BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN.md` | new local evidence | include | Main minimal runtime repair design. | Low if not mistaken for implementation. |
| `docs/budget/BG1_MINIMAL_RUNTIME_REPAIR_CONTRACT.md` | new local evidence | include | Candidate-only / dry-run-only contract. | Low. |
| `docs/budget/BG1_BUDGET_GENERATOR_SKELETON_DESIGN.md` | new local evidence | include | Future skeleton design; no file creation. | Medium if mistaken for authorization. |
| `docs/budget/BG1_GENERATE_BUDGET_ESTIMATE_GUARD_DESIGN.md` | new local evidence | include | Future guard semantics. | Medium if mistaken for implementation. |
| `docs/budget/BG1_BUDGET_ESTIMATE_BLOCKED_ERROR_DESIGN.md` | new local evidence | include | Future blocked reason design. | Medium if mistaken for runtime error class. |
| `docs/budget/BG1_NO_PRODUCTION_QUANTITY_GUARD_DESIGN.md` | new local evidence | include | Production quantity guard design. | Low. |
| `docs/budget/BG1_NO_FORMAL_ESTIMATE_GUARD_DESIGN.md` | new local evidence | include | Formal estimate guard design. | Low. |
| `docs/budget/BG1_RUNTIME_REPAIR_NEXT_AUTHORIZATION_PACKET.md` | new local evidence | include | Next authorization options. | Low. |
| `docs/budget/BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_REVIEW_VERDICT_CONSUMPTION.md` | new local evidence | include | Consumes Issue `#103` review PASS. | Low. |
| `docs/budget/BG1_RUNTIME_REPAIR_FORBIDDEN_SCOPE.md` | new local evidence | include | Central forbidden scope record. | Low. |
| `docs/budget/BG1_RUNTIME_DRIFT_REPAIR_GATE_MATRIX.md` | new local evidence | include | Gate sequence and hard stops. | Low. |
| `docs/budget/BUDGET_NEXT_STITCHING_ACTIONS.md` | new local evidence | include | Current BG1 next action state. | Medium because it is central coordination doc. |
| `docs/NEXT_CODEX_HANDOFF.md` | modified tracked file | include | Required handoff continuity. | Medium due line-ending warning and existing long history. |

## 3. Should Include

These files support the candidate contract / PR `#100` boundary and Issue `#89` state.

| File Path | Status | Include Decision | Reason | Risk |
|---|---|---|---|---|
| `docs/budget/BG1_PR100_DOCS_ONLY_ACTIVE_HEAD_BOUNDARY.md` | new local evidence | include | Preserves PR `#100` docs-only boundary. | Low. |
| `docs/budget/BG1_PR100_PLAN_PUZZLE_0_12_ALIGNMENT.md` | new local evidence | include | Shows Plan Puzzle 0.12 alignment. | Low. |
| `docs/budget/BG1_PR100_RUNTIME_ADAPTER_PROHIBITION_NOTE.md` | new local evidence | include | Explicitly blocks PR `#100` embedded script runtime adapter. | Low. |
| `docs/budget/BG1_PLAN_PUZZLE_0_12_SHARED_TRUTH_INTAKE_CONSUMPTION.md` | new local evidence | include | Upstream shared-truth intake record. | Low. |
| `docs/budget/BG1_PLAN_PUZZLE_0_12_SHARED_TRUTH_BLOCKERS.md` | new local evidence | include | Documents remaining blockers. | Low. |
| `docs/budget/BUDGET_ISSUE_89_GATE_SNAPSHOT.md` | new local evidence | include | Harness gate state. | Low. |
| `docs/budget/BUDGET_RUNTIME_ENTRYPOINT_DISCOVERY.md` | new local evidence | include | Earlier runtime entrypoint discovery. | Low. |
| `docs/budget/BUDGET_RUNTIME_DOCS_DRIFT_DECISION_PACKET.md` | new local evidence | include | Earlier drift decision packet. | Low. |
| `docs/budget/BUDGET_INTERNAL_INTERFACE_PREP.md` | new local evidence | include | Internal interface planning. | Low. |

## 4. Needs Review

These paths may be useful but should not be blindly included without Commander / Reviewer file-list approval.

| Path | Status | Include Decision | Reason | Risk |
|---|---|---|---|---|
| `docs/bg1_budget_commander/**` | untracked local evidence directory | needs_review | Contains many BG1 round reports and operational boards. | Medium: broad scope and historical reports may be noisy. |
| `docs/budget/BG1_*` files not listed above | untracked local evidence | needs_review | Some are upstream decision or previous-round support files. | Medium: may include stale or duplicate evidence. |
| `docs/budget/BUDGET_*` files not listed above | untracked local evidence | needs_review | Some are broad control manifest / interface registry docs. | Medium: may broaden PR scope. |
| existing tracked `docs/budget/[numbered]*.md` baseline docs | tracked at HEAD | needs_review | Existing baseline may not need inclusion unless modified. | Low. |

## 5. Exclude

| Path / Pattern | Include Decision | Reason |
|---|---|---|
| `src/**` | exclude | Runtime/source modification forbidden. |
| `src/lib/budget/budget-generator.ts` | exclude | Missing and must not be created. |
| `src/lib/budget/adapters/preview-floor-plan-adapter.ts` | exclude | Adapter patch forbidden. |
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/**` | exclude | Plan Puzzle runtime forbidden. |
| `plan-puzzle.js` / `code.html` | exclude | Plan Puzzle runtime forbidden. |
| renderer runtime files | exclude | Renderer production integration forbidden. |
| generated Excel / PDF / binary outputs | exclude | Formal output forbidden. |
| DB / Supabase / API / AI / RAG / payment / LINE / n8n files | exclude | Sensitive integrations forbidden. |

## 6. Decision

`DOCS_ONLY_SHARED_TRUTH_PR_CANDIDATE_FILE_LIST_READY_NO_EXECUTION`

