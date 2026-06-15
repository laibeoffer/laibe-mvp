# BG1 Budget Generator Skeleton Design

Updated: `2026-06-14`

Status: `DOCS_ONLY_SKELETON_DESIGN_READY_NO_EXECUTION`

## 1. Future File Candidate

`src/lib/budget/budget-generator.ts`

## 2. Current State

The file is missing in this worktree.

Evidence source:

- `docs/budget/BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_COLLECTION_RESULT.md`
- `docs/budget/BG1_RUNTIME_REPAIR_DECISION_PACKET.md`

## 3. Not Authorized Now

This task does not authorize file creation, runtime implementation, type creation, import repair, test execution, harness execution, or Budget Engine execution.

## 4. Future Skeleton Responsibilities If Authorized

A future skeleton, if separately authorized, should:

- expose a single guarded candidate-only entrypoint;
- require `dry_run_only:true`;
- inspect guard flags before any estimate-like output;
- reject formal estimate requests;
- reject production quantity requests;
- reject forbidden quantity sources;
- reject PR `#100` embedded script runtime adapter wiring;
- return only candidate-safe blocked / review output;
- preserve trace fields needed for review;
- isolate itself from Renderer / Excel / PDF output;
- never call DB / Supabase / API / AI / RAG / payment / LINE / n8n.

## 5. Future Skeleton Non-responsibilities

A future skeleton must not:

- generate PricingRule;
- create production BudgetEstimateLine;
- create formal estimate;
- create formal price;
- create formal quote;
- create Excel / PDF;
- call Renderer production output;
- read PR `#100` embedded script as adapter;
- resolve production quantity from candidate facts;
- execute harness.

## 6. Future Guard Order

If later authorized, the future entrypoint should use this guard order:

1. Authorization present.
2. `dry_run_only:true`.
3. no formal estimate request.
4. no production quantity request.
5. no forbidden quantity source.
6. PR `#100` not used as embedded runtime adapter.
7. Issue `#89` not used to imply execution permission.
8. output remains candidate-only / blocked-safe.

## 7. Decision

`BUDGET_GENERATOR_SKELETON_DESIGN_READY_NO_EXECUTION`

