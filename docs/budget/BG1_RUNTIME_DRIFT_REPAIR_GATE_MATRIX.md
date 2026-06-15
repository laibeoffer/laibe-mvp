# BG1 Runtime Drift Repair Gate Matrix

Updated: `2026-06-13`

Status: `R1_DOCS_ONLY_RUNTIME_DRIFT_REPAIR_PLAN_READY_NO_EXECUTION`

## Gate Matrix

| Gate | Name | Purpose | Required Input | Allowed Action | Forbidden Action | Exit Condition |
|---|---|---|---|---|---|---|
| R0 | Shared Truth / Verdict Consumed | Confirm upstream planning context is available. | PR `#100` verdict consumed; Plan Puzzle 0.12 shared truth consumed. | Read docs and preserve boundaries. | Runtime work, harness, formal estimate. | `BG1_PLAN_PUZZLE_0_12_SHARED_TRUTH_INTAKE_CONSUMED_PR100_ALIGNED_NO_EXECUTION` |
| R1 | Docs-only Runtime Drift Repair Plan | Convert drift evidence into repair plan. | R0 complete; runtime discovery docs. | Create docs-only plan, matrix, blocker list, authorization draft. | Any `src/**` change or runtime file creation. | `BG1_DOCS_ONLY_RUNTIME_DRIFT_REPAIR_PLAN_READY_NO_EXECUTION` |
| R2 | Commander / Reviewer Runtime Repair Scope Authorization | Decide whether any runtime repair may be scoped. | R1 plan and authorization request draft. | Commander/Reviewer decision only. | Runtime implementation before decision. | Explicit authorization or explicit denial. |
| R3 | Type Source Verification | Verify `BudgetEstimate`, `BudgetEstimateLine`, `PriceSource`, `QuoteItemTemplate`, and storage import sources. | R2 authorization for evidence collection. | Read-only type/import graph evidence collection. | Creating or editing types. | Type source evidence packet. |
| R4 | Budget Generator Entrypoint Skeleton Planning | Plan possible `budget-generator.ts` entrypoint shape. | R3 evidence. | Docs-only skeleton proposal. | Creating `budget-generator.ts`. | Reviewer/Commander-approved skeleton plan. |
| R5 | Candidate-only Guard Design | Define guard semantics for dry-run/candidate-only flow. | R4 plan plus PR `#100` boundary. | Docs-only guard design. | Implementing `generateBudgetEstimate` or `BudgetEstimateBlockedError`. | Guard design approved for possible implementation. |
| R6 | No-production Runtime Repair Draft | Draft exact minimal patch sequence if authorized. | R5 design and explicit Commander authorization. | Draft patch plan or proposal. | Applying patch without implementation authorization. | Separate implementation task issued. |
| R7 | Harness Review Request | Prepare review request before execution. | R6 implementation, if ever authorized and completed. | No-execution review packet. | Starting harness. | Reviewer verdict for harness review. |
| R8 | Harness Execution Gate | Decide whether execution may start. | Issue `#89` cleared plus Commander authorization. | Harness execution only if explicitly authorized. | Harness execution while Issue `#89` blocks. | Execution result, if authorized. |
| R9 | Production Adapter Gate | Decide any production adapter path. | Runtime review and production quantity authority. | Future planning only unless separately authorized. | PR `#100` embedded script runtime wiring, production quantity, formal estimate. | Separate production adapter authorization. |

## Current Gate Position

- Current gate: `R1`
- R1 status: `Ready`
- R2 status: `Not authorized`
- R3 status: `Not authorized`
- R4 status: `Not authorized`
- R5 status: `Not authorized`
- R6 status: `Not authorized`
- R8 status: `Blocked by Issue #89`
- R9 status: `Blocked by production quantity / formal estimate authority`

## Hard Stops

- R2 must not modify `src/**`.
- R3 must not create or edit `BudgetEstimate` / `BudgetEstimateLine` types.
- R4 must not create `budget-generator.ts`.
- R5 must not implement `generateBudgetEstimate`.
- R5 must not implement `BudgetEstimateBlockedError`.
- R6 must not apply runtime implementation without separate explicit authorization.
- R8 must not execute harness while Issue `#89` is blocking.
- R9 must not wire PR `#100` embedded script as runtime adapter.
