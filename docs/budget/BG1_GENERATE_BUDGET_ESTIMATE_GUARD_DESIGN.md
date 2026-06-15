# BG1 generateBudgetEstimate Guard Design

Updated: `2026-06-14`

Status: `DOCS_ONLY_GUARD_DESIGN_READY_NO_EXECUTION`

## 1. Current State

`generateBudgetEstimate` is missing in this worktree.

This document designs future guard semantics only. It does not create or modify the function.

## 2. Future Guard Requirements

If later authorized, `generateBudgetEstimate` must:

- require `dry_run_only:true`;
- reject formal estimate mode;
- reject production quantity mode;
- reject forbidden quantity sources;
- reject PR `#100` embedded script runtime adapter requests;
- reject missing required type source if contract is incomplete;
- preserve candidate-only semantics;
- return blocked / candidate-safe response only;
- avoid formal BudgetEstimateLine creation;
- avoid PricingRule creation;
- avoid Renderer / Excel / PDF;
- avoid DB / API / AI / RAG / payment / LINE / n8n.

## 3. Forbidden Quantity Sources

The future function must not accept:

- SVG;
- renderer preview;
- `.pc`;
- visual simulation;
- screenshots;
- unverified geometry;
- PR `#50` guide mock;
- pure UI shell;
- owner free text as direct line item source.

## 4. Guard Outcomes

| Condition | Required Outcome |
|---|---|
| `dry_run_only` missing or false | Block. |
| formal estimate requested | Block. |
| production quantity requested | Block. |
| forbidden quantity source used | Block. |
| PR `#100` embedded script adapter requested | Block. |
| Issue `#89` still blocking harness | Block execution-related path. |
| unresolved type/source dependency | Block runtime output and request repair review. |

## 5. Non-goals

- No runtime implementation.
- No type creation.
- No test execution.
- No harness execution.
- No formal output.

## 6. Decision

`GENERATE_BUDGET_ESTIMATE_GUARD_DESIGN_READY_NO_EXECUTION`

