# BG1 Docs-Only Minimal Runtime Repair Design

Updated: `2026-06-14`

## 1. Design Status

| Field | Value |
|---|---|
| Task | `BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_NO_EXECUTION` |
| Input status | `BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_AND_REPAIR_DECISION_PACKET_READY_NO_EXECUTION` |
| Output status | `BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_READY_NO_EXECUTION` |
| Review source | Issue `#103` reviewer verdict: `A4_STITCHING_REVIEW_PASS_READY_NO_EXECUTION` |
| Design mode | `docs_only` |
| Runtime implementation | `No` |
| Harness execution | `No` |
| Formal estimate | `No` |
| Production quantity | `No` |

## 2. Purpose

This document defines the smallest future runtime repair design that can be reviewed before any runtime implementation is requested.

It is a design artifact only. It does not create `budget-generator.ts`, implement `generateBudgetEstimate`, implement `BudgetEstimateBlockedError`, create `BudgetEstimateLine`, create `PricingRule`, run the Budget Engine, run harnesses, or produce formal output.

## 3. Current Runtime Gaps

| Gap | Evidence | Design Decision |
|---|---|---|
| `budget-generator.ts` missing | `docs/budget/BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_COLLECTION_RESULT.md` | Future skeleton may be planned, but file creation is not authorized. |
| `generateBudgetEstimate` missing | Evidence packet and demo import references | Future function must be guard-first and candidate-only if later authorized. |
| `BudgetEstimateBlockedError` missing | Evidence packet records docs-only references | Future error semantics may be designed, not implemented. |
| `BudgetEstimate` / `BudgetEstimateLine` type source unresolved | Import-only references from output files | Future type ownership must be decided before code repair. |
| `budget-catalog.ts` missing | `budget-line-enricher.ts` and MethodSpec validator import missing helper | Future import graph repair must be planned before any patch. |
| Issue `#89` harness gate still blocking | `docs/budget/BUDGET_ISSUE_89_GATE_SNAPSHOT.md` | Harness execution remains blocked. |

## 4. Minimal Repair Design Principles

- Candidate-only.
- Dry-run-only.
- Formal estimate blocked.
- Production quantity blocked.
- No renderer production output.
- No Excel / PDF.
- No PricingRule creation.
- No BudgetEstimateLine production creation.
- No PR `#100` embedded script runtime adapter wiring.
- Preserve `areaProductionReady:false`.
- Preserve reviewer-required semantics.
- Preserve candidate-only semantics.
- Preserve Issue `#89` as harness execution gate.

## 5. Future Repair Components

These components describe possible future repair scope only. They are not implemented by this task.

| Future Component | Purpose | Current Permission |
|---|---|---|
| budget-generator entrypoint skeleton | Provide one guarded future engine entrypoint candidate. | Docs-only design only. |
| `generateBudgetEstimate` guarded function | Define candidate-only guard behavior before any estimate-like output. | Docs-only design only. |
| `BudgetEstimateBlockedError` | Define controlled block reasons. | Docs-only design only. |
| `BudgetEstimate` / `BudgetEstimateLine` type import boundary | Decide where output contract types should live. | Docs-only design only. |
| `BudgetInputBundle` input boundary | Require `dry_run_only:true` and no forbidden quantity source. | Docs-only design only. |
| `BudgetOutputSnapshot` output boundary | Keep snapshot-compatible output non-formal and non-renderer-production. | Docs-only design only. |
| no-production-quantity guard | Reject production quantity attempts. | Docs-only design only. |
| no-formal-estimate guard | Reject formal estimate attempts. | Docs-only design only. |
| renderer isolation guard | Keep renderer from calling generator, pricing, AI, workbook, or PDF paths. | Docs-only design only. |
| forbidden source guard | Block SVG, screenshots, visual simulation, `.pc`, renderer preview, PR `#50` guide mock, and unverified geometry. | Docs-only design only. |

## 6. Forbidden Implementation Scope

This task must not:

- modify `src/**`;
- create or repair `src/lib/budget/budget-generator.ts`;
- implement `generateBudgetEstimate`;
- implement `BudgetEstimateBlockedError`;
- create or modify `BudgetEstimateLine`;
- create or modify `PricingRule`;
- patch `preview-floor-plan-adapter.ts`;
- modify Plan Puzzle runtime;
- wire PR `#100` embedded script as runtime adapter;
- run Budget Engine runtime;
- run harness, tests, build, dev server, lint fix, formatter write, or code generation;
- produce production quantity;
- produce formal estimate, formal price, formal quote, Excel, or PDF;
- touch Renderer runtime;
- touch DB / Supabase / API / AI / RAG / payment / LINE / n8n;
- stage, push, open PR, merge, or deploy.

## 7. Next Decision

The design is ready for review as:

`BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_READY_NO_EXECUTION`

Recommended next single action:

`PREPARE_DOCS_ONLY_SHARED_TRUTH_PR_REQUEST_NO_EXECUTION`

Reason:

The repair design is still local review evidence. Before any skeleton patch planning or implementation planning, BG1 should prepare a docs-only shared-truth PR request so the evidence can move from local worktree state to reviewed GitHub shared truth under separate authorization.

