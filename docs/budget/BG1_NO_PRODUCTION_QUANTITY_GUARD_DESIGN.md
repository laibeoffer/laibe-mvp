# BG1 No Production Quantity Guard Design

Updated: `2026-06-14`

Status: `DOCS_ONLY_NO_PRODUCTION_QUANTITY_GUARD_READY_NO_EXECUTION`

## 1. Guard Purpose

Future budget runtime repair must prevent candidate facts from becoming production quantity.

## 2. Inputs That Must Be Blocked As Production Quantity

- Plan Puzzle candidate draft JSON.
- Candidate QuantityFacts.
- PR `#100` candidate area metadata.
- SVG.
- renderer preview.
- `.pc`.
- visual simulation.
- screenshots.
- unverified geometry.
- pure UI shell.
- PR `#50` guide mock.

## 3. Required Block Semantics

| Attempt | Required Result |
|---|---|
| Candidate quantity used as production quantity | Block with `PRODUCTION_QUANTITY_PROHIBITED`. |
| Missing reviewer-required marker | Block. |
| `areaProductionReady:false` ignored | Block. |
| PR `#100` embedded script wired as adapter | Block with `PR100_RUNTIME_ADAPTER_PROHIBITED`. |
| Quantity source lacks verification provenance | Block with `FORBIDDEN_QUANTITY_SOURCE`. |

## 4. Allowed Docs-only Use

Candidate quantity may be used only for:

- interface planning;
- review evidence;
- dry-run design;
- blocked-safe contract examples;
- reviewer-required risk notes.

## 5. Forbidden Now

- No runtime guard implementation.
- No adapter productionization.
- No Budget Engine execution.
- No harness execution.
- No production quantity.

## 6. Decision

`NO_PRODUCTION_QUANTITY_GUARD_DESIGN_READY_NO_EXECUTION`

