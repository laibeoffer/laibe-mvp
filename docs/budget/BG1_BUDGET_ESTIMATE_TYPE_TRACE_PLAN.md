# BG1 BudgetEstimate Type Trace Plan

Updated: `2026-06-13`

Status: `TYPE_TRACE_PLAN_DOCS_ONLY_NO_EXECUTION`

## 1. Current State

| Type / Source | Current Evidence | Status |
|---|---|---|
| `BudgetEstimate` | `src/lib/budget/output/budget-sheet-formatter.ts` imports it from `../types.ts`. Export search did not find `BudgetEstimate` in `src/lib/budget/types.ts`. | `unverified_missing_export` |
| `BudgetEstimateLine` | `src/lib/budget/output/budget-line-enricher.ts` imports it from `../types.ts`. Export search did not find `BudgetEstimateLine` in `src/lib/budget/types.ts`. | `unverified_missing_export` |
| `PriceSource` | `src/lib/budget/output/types.ts` imports it from `../types.ts`. Export search did not find `PriceSource` in `src/lib/budget/types.ts`. | `unverified_missing_export` |
| `QuoteItemTemplate` | `src/lib/budget/output/budget-line-enricher.ts` imports it from `../types.ts`; specs types also reference it. Export search did not find it in `src/lib/budget/types.ts`. | `unverified_missing_export` |
| `BudgetOutputSnapshot` | `src/lib/budget/output/types.ts` exports `interface BudgetOutputSnapshot`. | `found` |
| `BudgetInputBundle` | `src/lib/budget/integration/types.ts` exports `interface BudgetInputBundle`. | `found` |
| `storage/budget-catalog.ts` | `budget-line-enricher.ts` and `validate-method-spec-catalog.ts` import `../storage/budget-catalog.ts`; file path is missing. | `missing_import_target` |

## 2. Future Evidence Collection Plan

Future read-only trace should collect:

- type export location;
- import graph from output files;
- import graph from MethodSpec validator files;
- output snapshot dependency;
- demo spec dependency;
- docs/runtime claim gap;
- whether missing types were removed, renamed, or live on another branch/PR;
- whether `storage/budget-catalog.ts` moved or was never present in this worktree.

## 3. Forbidden In This Task

- Do not create types.
- Do not modify types.
- Do not add runtime types.
- Do not mark `BudgetEstimateLine` as production output.
- Do not create `PricingRule`.
- Do not create `BudgetEstimateLine`.
- Do not patch output runtime.

## 4. Possible Next Action

`BG1_COLLECT_RUNTIME_TYPE_SOURCE_EVIDENCE_NO_EXECUTION`

This is an alternate next action if Commander / Reviewer requests more evidence before authorizing repair scope.
