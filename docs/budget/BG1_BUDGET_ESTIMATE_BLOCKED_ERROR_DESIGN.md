# BG1 BudgetEstimateBlockedError Design

Updated: `2026-06-14`

Status: `DOCS_ONLY_ERROR_DESIGN_READY_NO_EXECUTION`

## 1. Current State

`BudgetEstimateBlockedError` is referenced by docs / handoff evidence, but no runtime definition was found in this worktree.

This document defines future error semantics only. It does not implement an error class.

## 2. Future Blocked Reasons

| Reason Code | Meaning |
|---|---|
| `FORMAL_ESTIMATE_PROHIBITED` | A caller requested formal estimate behavior. |
| `PRODUCTION_QUANTITY_PROHIBITED` | A caller attempted to use production quantity without authorization. |
| `DRY_RUN_ONLY_REQUIRED` | Required dry-run guard was absent or false. |
| `FORBIDDEN_QUANTITY_SOURCE` | Input used SVG, renderer preview, `.pc`, visual simulation, screenshot, unverified geometry, PR `#50` guide mock, or pure UI shell. |
| `ISSUE_89_HARNESS_GATE_BLOCKED` | Harness execution path was attempted while Issue `#89` remains blocking. |
| `PR100_RUNTIME_ADAPTER_PROHIBITED` | PR `#100` embedded script was requested as runtime adapter. |
| `MISSING_REQUIRED_TYPE_SOURCE` | Required type/source ownership is still unresolved. |
| `RUNTIME_REPAIR_NOT_AUTHORIZED` | Runtime implementation was attempted without explicit authorization. |

## 3. Future Error Payload Requirements

If later authorized, a blocked error or blocked response should carry:

- reason code;
- human-readable message;
- source artifact;
- whether reviewer is required;
- whether commander is required;
- whether execution is blocked;
- whether formal output is blocked;
- suggested next docs-only action.

## 4. Forbidden Now

- Do not create `BudgetEstimateBlockedError`.
- Do not modify runtime files.
- Do not throw or execute runtime behavior.
- Do not run tests / build / harness.

## 5. Decision

`BUDGET_ESTIMATE_BLOCKED_ERROR_DESIGN_READY_NO_EXECUTION`

