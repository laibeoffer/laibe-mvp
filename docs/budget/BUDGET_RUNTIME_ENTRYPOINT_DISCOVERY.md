# Budget Runtime Entrypoint Discovery

Updated: `2026-06-13`

Scope: read-only symbol discovery for Budget Commander safe parallel work. This document does not create runtime code, does not start Budget Engine stitching, and does not authorize harness execution.

## 1. Discovery Boundary

- Runtime code modified: `No`
- Budget Engine executed: `No`
- Renderer / Excel / PDF connected: `No`
- DB / Supabase / API connected: `No`
- RAG / AI API connected: `No`
- payment / escrow / listing fee touched: `No`
- Plan Puzzle runtime touched: `No`
- Candidate facts promoted to production facts: `No`
- `PriceObservation` / `PriceRange` promoted to formal price: `No`

## 2. Entrypoint Discovery Table

| symbol_name | expected_file | actual_file_found | found_status | risk_level | required_action | whether_safe_to_stitch_now |
|---|---|---|---|---|---|---|
| `generateBudgetEstimate` | `src/lib/budget/budget-generator.ts` | No definition found. Only docs and demo specs reference it: `src/lib/budget/specs/demo-method-spec-*.ts` imports `../budget-generator.ts`. | `docs_only` | `high` | Reconcile source-of-truth branch/PR before any Budget Engine runtime stitching. Do not recreate in this round. | `No` |
| `BudgetEstimateBlockedError` | `src/lib/budget/budget-generator.ts` or adjacent guard file | No runtime definition found. Mentioned in `docs/NEXT_CODEX_HANDOFF.md`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`, and BG1 drift docs. | `docs_only` | `high` | Treat blocked-error guard claims as unverified until runtime source is restored or formally repaired. | `No` |
| `budget-generator.ts` | `src/lib/budget/budget-generator.ts` | `Test-Path src/lib/budget/budget-generator.ts` returned `False`. No `*budget*generator*` file found under `src/lib/budget`. | `missing` | `high` | Create a separate authorized runtime reconciliation task after Plan Puzzle shared truth is selected. | `No` |
| `BudgetEstimate` | `src/lib/budget/types.ts` or budget engine output types | Runtime references exist as imports in output code, but no exported `BudgetEstimate` interface/type definition was found by symbol export search. | `unknown` | `high` | Confirm whether it was removed, renamed, or lives on another branch before stitching. | `No` |
| `BudgetOutputSnapshot` | `src/lib/budget/output/types.ts` | Found: `src/lib/budget/output/types.ts` exports `interface BudgetOutputSnapshot`; output validator, repository, renderer gate, and renderer fixture reference it. | `found` | `medium` | Keep snapshot-only boundary; do not treat snapshot-compatible objects as formal output. | `Docs-only prep only` |
| `formalEstimateGuard` | `src/lib/budget/types.ts`, `src/lib/budget/adapters/preview-floor-plan-adapter.ts` | Found in adapter output types and adapter runtime. The adapter creates `formalEstimateGuard` with blocked formal estimate semantics. | `found` | `medium` | Keep as candidate-only upstream guard; downstream generator guard is still missing/unverified. | `Docs-only prep only` |
| `BudgetInputBundle` | `src/lib/budget/integration/types.ts` | Found: `src/lib/budget/integration/types.ts` exports `interface BudgetInputBundle`; build function exists in `build-budget-input-bundle.ts`. | `found` | `medium` | Use only as dry-run/review assembly contract until Issue #89 and Commander authorize execution. | `Docs-only prep only` |
| `dry_run_only` | `src/lib/budget/integration/types.ts`, `src/lib/budget/integration/build-budget-input-bundle.ts` | Found: guardrail type requires `dry_run_only: true`; builder rejects non-true dry-run input. | `found` | `medium` | Preserve dry-run-only gate; do not infer execution readiness. | `Docs-only prep only` |
| `renderer-static-guard` | `src/lib/budget/renderers/renderer-static-guard.ts` | Found: static guard blocks `budget-generator`, `generateBudgetEstimate`, pricing/material resolver tokens, RAG/AI tokens, and workbook/PDF libraries in renderer path. | `found` | `medium` | Keep renderer snapshot-only guard; do not run production renderer. | `Docs-only prep only` |

## 3. Key Read-only Evidence

| Evidence | Result |
|---|---|
| `src/lib/budget/budget-generator.ts` path check | Missing |
| `generateBudgetEstimate` definition search | No runtime definition found |
| `BudgetEstimateBlockedError` definition search | No runtime definition found |
| `BudgetInputBundle` definition search | Found in `src/lib/budget/integration/types.ts` |
| `BudgetOutputSnapshot` definition search | Found in `src/lib/budget/output/types.ts` |
| `formalEstimateGuard` search | Found in `src/lib/budget/types.ts` and adapter runtime |
| `dry_run_only` search | Found in integration types/builder and dry-run docs |
| `renderer-static-guard` search | Found in renderer guard runtime |

## 4. Discovery Decision

The budget worktree has enough stable internal review contracts for docs-only preparation, but it does not have a verified Budget Engine runtime entrypoint.

Decision:

- Runtime stitching: `No`
- Docs-only prep: `Yes`
- Harness execution: `No`
- Formal price / quote / Excel / PDF: `No`

