# BG1 Docs-Only Runtime Drift Repair Plan

Updated: `2026-06-13`

Status: `BG1_DOCS_ONLY_RUNTIME_DRIFT_REPAIR_PLAN_READY_NO_EXECUTION`

## 1. Plan Status

| Field | Value |
|---|---|
| Task | `BG1_DOCS_ONLY_RUNTIME_DRIFT_REPAIR_PLAN_NO_EXECUTION` |
| Input status | `BG1_PLAN_PUZZLE_0_12_SHARED_TRUTH_INTAKE_CONSUMED_PR100_ALIGNED_NO_EXECUTION` |
| Output status | `BG1_DOCS_ONLY_RUNTIME_DRIFT_REPAIR_PLAN_READY_NO_EXECUTION` |
| Runtime code modified | `No` |
| `src/**` modified | `No` |
| Harness executed | `No` |
| Stage / push / PR / merge | `No` |

## 2. Current Blocking Facts

- Issue `#89` still blocks harness execution.
- `src/lib/budget/budget-generator.ts` is still missing.
- `generateBudgetEstimate` runtime definition is still missing.
- `BudgetEstimateBlockedError` runtime definition is still missing.
- `BudgetEstimate` / `BudgetEstimateLine` exported source/type is not verified.
- `src/lib/budget/storage/budget-catalog.ts` is missing while runtime files import `../storage/budget-catalog.ts`.
- PR `#100` is docs-only active candidate export head only.
- PR `#100` is not formal budget schema.
- PR `#100` is not production quantity source.
- PR `#100` embedded script must not be wired as runtime adapter.
- Production quantity is still prohibited.
- Formal estimate is still prohibited.
- Harness execution is still prohibited.

## 3. Runtime Drift Inventory

| Drift ID | Claim / Need | Current Evidence | Missing Runtime Artifact | Risk | Future Repair Type | Current Permission |
|---|---|---|---|---|---|---|
| D1 | `budget-generator.ts` should exist as Budget Engine entrypoint. | `Test-Path src/lib/budget/budget-generator.ts` returned missing. | `src/lib/budget/budget-generator.ts` | High | Locate/restore/recreate only after authorization. | Docs-only planning only |
| D2 | `generateBudgetEstimate` should exist. | Demo specs import `../budget-generator.ts`; renderer/static guards mention the symbol; no runtime definition found. | `generateBudgetEstimate` implementation | High | Candidate-only / dry-run guarded entrypoint proposal after authorization. | Docs-only planning only |
| D3 | `BudgetEstimateBlockedError` should enforce blocked formal estimate guard. | Docs and handoff claim it exists; no non-docs runtime definition found. | `BudgetEstimateBlockedError` class/type | High | Guard error proposal after authorization. | Docs-only planning only |
| D4 | Demo specs should be importable. | `src/lib/budget/specs/demo-method-spec-*.ts` import missing `../budget-generator.ts`. | Matching generator module | High | Repair import target or retire stale demos after authorization. | Docs-only planning only |
| D5 | `BudgetEstimate` type should be exported. | `budget-sheet-formatter.ts` imports `BudgetEstimate` from `../types.ts`; export search found no `BudgetEstimate` definition. | `BudgetEstimate` exported type/source | High | Type source trace and proposed contract after authorization. | Read-only trace only |
| D6 | `BudgetEstimateLine` type should be exported. | `budget-line-enricher.ts` imports `BudgetEstimateLine` from `../types.ts`; export search found no `BudgetEstimateLine` definition. | `BudgetEstimateLine` exported type/source | High | Type source trace and proposed contract after authorization. | Read-only trace only |
| D7 | PR `#100` candidate area metadata can guide planning. | PR `#100` verdict says docs-only active head, usable with restrictions. | Formal adapter-facing schema | Medium | Docs-only contract refinement only. | Docs-only planning only |
| D8 | Issue `#89` should clear before harness. | Gate snapshot says no independent reviewer verdict and no harness authorization. | Reviewer verdict + Commander execution authorization | High | Review gate intake only. | No execution |
| D9 | `formalEstimateGuard` exists upstream. | Found in `src/lib/budget/types.ts` and `preview-floor-plan-adapter.ts`; downstream generator guard is missing. | Downstream enforcement entrypoint | Medium | Preserve guard semantics in future generator plan. | Docs-only planning only |
| D10 | Renderer static guard exists. | `renderer-static-guard.ts` blocks `generateBudgetEstimate`, pricing/material resolver, RAG/AI tokens, workbook/PDF libraries. | None for docs-only; not execution proof. | Medium | Preserve snapshot-only renderer boundary. | Docs-only planning only |
| D11 | `storage/budget-catalog.ts` is referenced by runtime files. | `budget-line-enricher.ts` and `validate-method-spec-catalog.ts` import `../storage/budget-catalog.ts`; path is missing. | `src/lib/budget/storage/budget-catalog.ts` or replacement import path | High | Type/source/import trace before any output runtime use. | Read-only trace only |

## 4. Future Repair Philosophy

Future runtime repair must be gate-based and minimal.

Suggested order:

| Gate | Meaning |
|---|---|
| R0 | Shared truth and Reviewer verdict consumed. |
| R1 | Docs-only runtime drift repair plan. |
| R2 | Commander / Reviewer authorization for runtime repair scope. |
| R3 | Type source verification only. |
| R4 | Budget generator entrypoint skeleton proposal. |
| R5 | Candidate-only guard design. |
| R6 | No-production runtime repair draft. |
| R7 | Harness review request. |
| R8 | Harness execution only if Issue `#89` is cleared and Commander authorizes execution. |
| R9 | Production adapter planning only after separate gate. |

## 5. Future Repair May Eventually Include

Only after separate authorization, future repair may eventually include:

- define or locate `BudgetEstimate` exported type source;
- define or locate `BudgetEstimateLine` exported type source;
- locate or repair `storage/budget-catalog.ts` dependency;
- establish `budget-generator.ts` entrypoint;
- define `generateBudgetEstimate` only as candidate-only / dry-run guarded entrypoint;
- define `BudgetEstimateBlockedError`;
- connect to `BudgetInputBundle` only under `dry_run_only:true`;
- preserve `formalEstimateGuard`;
- preserve renderer static guard;
- preserve PR `#100` candidate-only boundary;
- preserve `areaProductionReady:false`;
- add explicit blocked formal estimate behavior;
- add no-production quantity guard.

## 6. Future Repair Must Not Include Without Separate Authorization

- Production quantity.
- Formal estimate.
- Formal quote.
- Formal Excel / PDF.
- PricingRule creation.
- BudgetEstimateLine production creation.
- PR `#100` embedded script runtime adapter wiring.
- Renderer production output.
- DB / Supabase / API / AI / RAG / payment / LINE / n8n.
- Harness execution before Issue `#89` clearance.

## 7. Immediate Decision

Current task decision:

`BG1_DOCS_ONLY_RUNTIME_DRIFT_REPAIR_PLAN_READY_NO_EXECUTION`

Recommended next single action:

`REQUEST_COMMANDER_REVIEWER_RUNTIME_REPAIR_SCOPE_AUTHORIZATION_NO_EXECUTION`

Rationale:

- The docs-only repair plan is ready.
- Any next move beyond planning needs Commander / Reviewer scope authorization.
- Runtime implementation, type creation, generator creation, and harness execution remain forbidden.
