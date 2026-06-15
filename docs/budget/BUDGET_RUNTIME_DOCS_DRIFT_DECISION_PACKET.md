# Budget Runtime Docs Drift Decision Packet

Updated: `2026-06-13`

Scope: decision packet for docs/runtime drift found during Budget Commander safe parallel work. This packet is not a runtime patch and does not authorize Budget Engine execution.

## 1. Files Claiming Runtime Exists

| Claim Area | File / Location | Claim |
|---|---|---|
| Budget Engine entrypoint | `docs/NEXT_CODEX_HANDOFF.md` | Claims `generateBudgetEstimate()` has a guard and throws `BudgetEstimateBlockedError` for Plancraft+ spike/candidate input. |
| Phase review packet | `docs/CURRENT_PHASE_REVIEW_PACKET.md` | Claims `generateBudgetEstimate()` guard and `BudgetEstimateBlockedError` were added and checked. |
| MethodSpec warehouse docs | `docs/budget/14-method-spec-warehouse.md` | Shows `MethodSpecCatalog -> generateBudgetEstimate() -> BudgetEstimate` as future/claimed flow. |
| Renderer guard docs | `docs/budget/18-renderer-gate-and-legacy-output-guard.md`, `19-excel-pdf-renderer-skeleton.md`, `20-renderer-contract-hardening.md` | Require renderers not to call `generateBudgetEstimate()`. |
| MethodSpec reports | `docs/budget/21-method-spec-catalog-inventory-report.md`, `24-method-spec-validator-p1-plan.md`, `26-method-spec-validator-p1-reviewer-pass.md`, `31-method-spec-p1b-reviewer-pass.md` | Refer to `budget-generator.ts` and demo validation using `generateBudgetEstimate()`. |
| BG1 control docs | `docs/budget/BUDGET_RUNTIME_DOCS_DRIFT_AUDIT.md`, `BUDGET_WORKSTREAM_ARTIFACT_REGISTRY.md`, `BUDGET_STITCHING_CONTROL_MANIFEST.md` | Already mark this as drift/missing in the current worktree. |

## 2. Runtime Actually Missing Or Unverified

| Runtime Item | Observed State | Decision |
|---|---|---|
| `src/lib/budget/budget-generator.ts` | Missing in current worktree. | `BLOCKS_RUNTIME_STITCHING` |
| `generateBudgetEstimate` definition | No runtime definition found; demo specs import a missing file. | `BLOCKS_RUNTIME_STITCHING` |
| `BudgetEstimateBlockedError` definition | No runtime definition found; docs-only claim. | `BLOCKS_RUNTIME_STITCHING` |
| `BudgetEstimate` exported type | Runtime imports reference it, but exported type/interface was not found in the searched budget runtime. | `BLOCKS_RUNTIME_STITCHING_UNTIL_RECONCILED` |
| `BudgetEstimateLine` exported type | Output runtime imports/reference estimate lines, but no explicit exported type/interface definition was found in the searched budget runtime. | `BLOCKS_RUNTIME_STITCHING_UNTIL_RECONCILED` |
| Renderer static guard | Found. | `SAFE_AS_GUARD_EVIDENCE_ONLY` |
| `BudgetInputBundle` dry-run entry | Found. | `SAFE_FOR_DOCS_ONLY_PREP` |
| `BudgetOutputSnapshot` type/validator/gate | Found. | `SAFE_FOR_SNAPSHOT_BOUNDARY_DOCS_ONLY` |

## 3. Items Blocking Budget Engine Stitching

| Blocking Item | Why It Blocks |
|---|---|
| Missing `budget-generator.ts` | There is no verified deterministic engine entrypoint to stitch. |
| Missing `generateBudgetEstimate` definition | Demo specs and docs reference an entrypoint that cannot be located in runtime. |
| Missing `BudgetEstimateBlockedError` definition | Guard claims cannot be treated as runtime-enforced. |
| Unverified `BudgetEstimate` type source | Downstream `BudgetOutputSnapshot` expects estimate lines, but the upstream engine object is not currently verified. |
| Unverified `BudgetEstimateLine` type source | Output enrichment and sheet formatting reference estimate lines, but the line contract source is not currently verified. |
| Plan Puzzle / Plancraft+ 0.12 shared truth pending | Budget input shape may change; runtime repair before shared truth may harden the wrong contract. |
| Issue #89 reviewer verdict missing | Harness review gate is still open; execution remains unauthorized. |

## 4. Items That Can Wait Until Plan Puzzle Shared Truth

| Item | Can Wait? | Reason |
|---|---|---|
| Recreating or restoring `budget-generator.ts` | Yes | The upstream quantity/input contract must be selected first. |
| Rebuilding `generateBudgetEstimate` guards | Yes | Guard predicates depend on final Plan Puzzle / QuantityFacts authority semantics. |
| Deciding exact `BudgetEstimate` type repair | Yes | It should match the chosen input and MethodSpec routing contract. |
| Runtime static guard expansion | Yes | Static guard can be planned now but implemented after source truth is selected. |
| Harness execution transcript | Yes | Execution is explicitly unauthorized. |

## 5. Commander Decisions Needed

| Decision | Needed Before |
|---|---|
| Which Plan Puzzle / Plancraft+ 0.12+ PR or branch is shared truth | Any runtime stitching |
| Whether to restore old `budget-generator.ts` or write a new reconciled entrypoint | Runtime repair task |
| Whether `BudgetEstimate` type should be restored, renamed, or replaced by a new contract | Budget Engine repair |
| Whether Issue #89 verdict is sufficient for review-only continuation | Post-review decision step |
| Separate authorization for harness execution | Any harness execution |
| Separate authorization for production / formal price / formal quote / Excel / PDF | Any formal output |

## 6. Reviewer Needed

| Review Area | Reviewer Needed? | Timing |
|---|---|---|
| Issue #89 harness review verdict | Yes | Before any harness execution decision |
| Docs-only interface preparation | Optional unless promoted to shared truth PR | Before merge/shared-truth claim |
| Runtime repair of budget entrypoint | Yes | Before execution or production use |
| Renderer formal output | Yes | Before Excel/PDF/customer formal quote |

## 7. Explicit Stop Rule

In the absence of selected Plan Puzzle / Plancraft+ shared truth, BG1 must not自行補 runtime stitching.

Forbidden before shared truth:

- no `budget-generator.ts` creation;
- no `generateBudgetEstimate` recreation;
- no `BudgetEstimateBlockedError` recreation;
- no candidate facts to production facts;
- no Budget Engine runtime stitching;
- no harness execution;
- no formal price, formal quote, formal Excel, or formal PDF.

## 8. Decision

- Runtime stitching can start now: `No`
- Docs-only prep can continue now: `Yes`
- Required next upstream intake: Plan Puzzle / Plancraft+ 0.12+ shared truth selection or intake result.
