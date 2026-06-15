# BG1 Runtime Repair Testless Acceptance Criteria

Updated: `2026-06-14`

Status: `DOCS_ONLY_TESTLESS_ACCEPTANCE_READY_NO_EXECUTION`

## 1. Scope

This task cannot run tests, build, dev server, harness, lint fix, formatter write, or runtime checks.

Acceptance is therefore based on document completeness and forbidden-scope verification only.

## 2. Required Files

| File | Required |
|---|---|
| `docs/budget/BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN.md` | Yes |
| `docs/budget/BG1_MINIMAL_RUNTIME_REPAIR_CONTRACT.md` | Yes |
| `docs/budget/BG1_BUDGET_GENERATOR_SKELETON_DESIGN.md` | Yes |
| `docs/budget/BG1_GENERATE_BUDGET_ESTIMATE_GUARD_DESIGN.md` | Yes |
| `docs/budget/BG1_BUDGET_ESTIMATE_BLOCKED_ERROR_DESIGN.md` | Yes |
| `docs/budget/BG1_NO_PRODUCTION_QUANTITY_GUARD_DESIGN.md` | Yes |
| `docs/budget/BG1_NO_FORMAL_ESTIMATE_GUARD_DESIGN.md` | Yes |
| `docs/budget/BG1_RUNTIME_REPAIR_NEXT_AUTHORIZATION_PACKET.md` | Yes |

## 3. Boundary Checks

| Check | Expected |
|---|---|
| `git diff --name-only -- src` | Empty |
| `git diff --cached --name-only` | Empty |
| `Test-Path src/lib/budget/budget-generator.ts` | `False` |
| tests / build / dev server | Not executed |
| harness | Not executed |
| stage / push / PR / merge | Not performed |

## 4. Content Checks

The docs must state:

- candidate-only;
- dry-run-only;
- formal estimate blocked;
- production quantity blocked;
- no renderer production output;
- no Excel / PDF;
- no PricingRule;
- no BudgetEstimateLine production creation;
- no PR `#100` embedded script runtime adapter;
- Issue `#89` remains blocking harness execution.

## 5. Decision

`TESTLESS_ACCEPTANCE_CRITERIA_READY_NO_EXECUTION`

