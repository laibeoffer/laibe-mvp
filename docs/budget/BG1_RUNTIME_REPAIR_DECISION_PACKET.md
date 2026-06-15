# BG1 Runtime Repair Decision Packet

Updated: `2026-06-13`

Task: `BG1_COLLECT_RUNTIME_TYPE_SOURCE_EVIDENCE_NO_EXECUTION`

Input decision: `AUTHORIZE_READ_ONLY_TYPE_SOURCE_EVIDENCE`

Decision source: GitHub Issue `#102` - `[A4/BG1] Runtime type/source evidence + repair decision packet - no execution`

Current status: `BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_AND_REPAIR_DECISION_PACKET_READY_NO_EXECUTION`

Evidence class: `LOCAL_REVIEW_EVIDENCE_ONLY`

Shared-truth status: `NOT_SHARED_TRUTH_UNTIL_GITHUB_PR_OR_MAIN`

## 1. Current Status

BG1 has completed read-only type/source/import evidence collection.

The evidence supports one conclusion:

The current worktree can proceed to docs-only runtime repair design / decision planning, but it cannot proceed to runtime implementation or harness execution.

Issue `#102` removes the prior waiting blocker `AWAIT_COMMANDER_REVIEWER_RUNTIME_REPAIR_SCOPE_DECISION_NO_EXECUTION` for this read-only evidence task only. It does not authorize direct implementation, runtime stitching, harness execution, production quantity, formal estimate, or formal output.

## 2. Evidence Summary

| Area | Evidence Summary | Decision |
|---|---|---|
| Engine entrypoint | `src/lib/budget/budget-generator.ts` is missing. | Blocks runtime stitching. |
| Generator function | `generateBudgetEstimate` is referenced by docs and demo specs, but no runtime definition is found. | Blocks runtime stitching. |
| Formal estimate blocker | `BudgetEstimateBlockedError` is referenced by docs/handoff, but no runtime definition is found. | Runtime guard claim is unverified. |
| Estimate types | `BudgetEstimate` and `BudgetEstimateLine` are referenced by output runtime, but no export source is verified. | Type repair decision needed. |
| Output snapshot | `BudgetOutputSnapshot` type source exists in `src/lib/budget/output/types.ts`. | Snapshot boundary remains usable for docs-only planning. |
| Dry-run input bundle | `BudgetInputBundle` type source exists in `src/lib/budget/integration/types.ts` with `dry_run_only:true`. | Dry-run input contract exists for review only. |
| Storage helper | `src/lib/budget/storage/budget-catalog.ts` is missing while runtime imports it. | Import graph repair decision needed. |
| Renderer guard | `renderer-static-guard.ts` source exists. | Renderer snapshot-only guard evidence exists; this is not execution proof. |
| Candidate formal guard | `FormalEstimateGuard` type and adapter metadata exist. | Upstream candidate stop gate exists; downstream generator enforcement is missing. |

## 3. Runtime Gaps Confirmed

| Runtime Gap | Evidence | Blocks Runtime Stitching? |
|---|---|---|
| Missing `budget-generator.ts` | `Test-Path src/lib/budget/budget-generator.ts` returned missing; no file found under `src/lib/budget`. | `Yes` |
| Missing `generateBudgetEstimate` definition | Demo specs import it; no runtime definition found. | `Yes` |
| Missing `BudgetEstimateBlockedError` definition | Docs/handoff reference it; no runtime source found. | `Yes` |
| Missing `budget-catalog.ts` import target | `budget-line-enricher.ts` and `validate-method-spec-catalog.ts` import `../storage/budget-catalog.ts`; path missing. | `Yes` |
| Missing/unverified `BudgetEstimate` export | `budget-sheet-formatter.ts` imports it from `../types.ts`; no export found. | `Yes` |
| Missing/unverified `BudgetEstimateLine` export | `budget-line-enricher.ts` imports it from `../types.ts`; no export found. | `Yes` |
| Collateral missing/unverified catalog types | `BudgetCatalog`, `Material`, `LaborRate`, `PriceSource`, `QuoteItemTemplate`, `MethodRecipe`, `PricingRule`, and `TradeCode` are referenced/imported from `../types.ts`, but not exported from current inspected `src/lib/budget/types.ts`. | `Yes` |

## 4. Type/source Evidence Confirmed

| Symbol / file | Confirmed Source | Status | Boundary |
|---|---|---|---|
| `BudgetInputBundle` | `src/lib/budget/integration/types.ts:72` | `FOUND_TYPE_SOURCE` | Dry-run review contract only. |
| `BudgetDryRunGuardrails` | `src/lib/budget/integration/types.ts:47` | `FOUND_TYPE_SOURCE` | Requires dry-run / no formal output flags. |
| `BudgetOutputSnapshot` | `src/lib/budget/output/types.ts:80` | `FOUND_TYPE_SOURCE` | Snapshot-only; not formal renderer output. |
| `BudgetOutputValidationReport` | `src/lib/budget/output/types.ts:65` | `FOUND_TYPE_SOURCE` | Validation shape only. |
| `FormalEstimateGuard` | `src/lib/budget/types.ts:14` | `FOUND_TYPE_SOURCE` | Upstream candidate block metadata only. |
| `renderer-static-guard.ts` | `src/lib/budget/renderers/renderer-static-guard.ts` | `FOUND_RUNTIME_SOURCE` | Source exists; not executed in this task. |
| `buildBudgetInputBundle` | `src/lib/budget/integration/build-budget-input-bundle.ts` | `FOUND_RUNTIME_SOURCE` | Source exists; not executed in this task. |

## 5. Type/source Evidence Unresolved

| Symbol | Current Evidence | Required Future Decision |
|---|---|---|
| `BudgetEstimate` | Import-only reference from `budget-sheet-formatter.ts`; no export source verified. | Restore, replace, or redefine estimate output contract in a scoped future plan. |
| `BudgetEstimateLine` | Import-only reference from `budget-line-enricher.ts`; no export source verified. | Restore, replace, or redefine line item contract in a scoped future plan. |
| `BudgetCatalog` | Imported by `build-budget-catalog-from-method-spec.ts`; no export source verified. | Decide whether catalog type belongs in `types.ts`, a storage module, or a new engine contract. |
| `PriceSource` | Imported by `output/types.ts`; no export source verified. | Decide price-source contract before any formal price path. |
| `QuoteItemTemplate` | Imported by MethodSpec and output files; no export source verified. | Decide whether the root type file was truncated, renamed, or moved. |
| `PricingRule` | Imported by MethodSpec types; no export source verified. | Do not recreate until formal pricing authority is separately reviewed. |

## 6. Missing Files

| Missing File | Import / Claim Source | Risk |
|---|---|---|
| `src/lib/budget/budget-generator.ts` | Demo specs and docs claim `generateBudgetEstimate`. | `High` |
| `src/lib/budget/storage/budget-catalog.ts` | `budget-line-enricher.ts` and `validate-method-spec-catalog.ts`. | `High` |

## 7. Import-only References

| Import-only Reference | Referencing Files | Impact |
|---|---|---|
| `../budget-generator.ts` | Four demo specs under `src/lib/budget/specs/`. | Demo specs cannot be treated as runnable proof in this worktree. |
| `BudgetEstimate` from `../types.ts` | `src/lib/budget/output/budget-sheet-formatter.ts`. | Output formatter contract is not type-source verified. |
| `BudgetEstimateLine` from `../types.ts` | `src/lib/budget/output/budget-line-enricher.ts`. | Output enrichment contract is not type-source verified. |
| `PriceSource` from `../types.ts` | `src/lib/budget/output/types.ts`. | Internal trace price-source contract is not type-source verified. |
| `QuoteItemTemplate` from `../types.ts` | MethodSpec seed/types and output enricher. | MethodSpec catalog bridge depends on unverified root type. |
| `getTemplateItemCode`, `getRecipeCode`, `getRecipeOutputItemCode` from `../storage/budget-catalog.ts` | Output enricher and MethodSpec validator. | Helper source missing. |

## 8. Contradictory Evidence

Contradictory docs/runtime evidence exists, but it does not block this docs-only packet.

| Contradiction | Evidence | Decision |
|---|---|---|
| Older handoff / docs claim `generateBudgetEstimate()` and `BudgetEstimateBlockedError` were guarded. | `docs/NEXT_CODEX_HANDOFF.md` contains historical entries claiming this path existed; current `src/lib/budget/budget-generator.ts` is missing. | Treat as docs-runtime drift, not runtime proof. |
| MethodSpec docs/demo flow claims generator can run. | Demo specs import missing `../budget-generator.ts`. | Treat demo files as stale or blocked until future repair decision. |
| Output/runtime files imply root `types.ts` contains engine/catalog types. | Current `src/lib/budget/types.ts` contains floor-plan adapter types only. | Treat root budget type layer as drifted/incomplete. |

Overall contradiction status:

`CONTRADICTORY_EVIDENCE_RECORDED_BUT_DOCS_ONLY_DECISION_PACKET_CAN_PROCEED`

## 9. Risk Matrix

| Risk | Level | Why | Mitigation |
|---|---|---|---|
| Implementing `budget-generator.ts` without type/source evidence | `High` | Could recreate wrong engine contract. | Do docs-only design first; no code until separate authorization. |
| Creating `BudgetEstimateLine` from candidate facts or raw price range | `High` | Violates formal pricing and production quantity boundary. | Preserve forbidden flow guard. |
| Treating PR `#100` as production quantity | `High` | PR `#100` is docs-only active head with restrictions. | Keep `areaProductionReady:false` / candidate-only status. |
| Treating `BudgetOutputSnapshot` as formal output | `Medium` | Snapshot type exists, but formal renderer/file output remains blocked. | Keep snapshot-only boundary. |
| Restoring missing type exports into wrong module | `Medium` | Current root `types.ts` appears adapter-oriented. | Decide type ownership before patch. |
| Running harness before Issue `#89` clears | `High` | Issue `#89` is still review gate only. | No harness execution. |

## 10. Minimal Future Repair Scope Proposal

The evidence supports a future docs-only design step, not implementation.

Recommended next option:

`BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_NO_EXECUTION`

Minimal future design questions:

1. Should the future engine entrypoint be restored as `src/lib/budget/budget-generator.ts`, or should old demo imports be retired/replaced?
2. Where should `BudgetEstimate`, `BudgetEstimateLine`, `BudgetCatalog`, `PriceSource`, and `QuoteItemTemplate` live?
3. Should `storage/budget-catalog.ts` be restored as helper source, or should helper functions move to MethodSpec/catalog utilities?
4. What guard semantics should `BudgetEstimateBlockedError` enforce without enabling formal estimate?
5. How should `BudgetInputBundle` dry-run guardrails connect to future engine design without enabling harness execution?

This design step must still be docs-only.

## 11. Forbidden Implementation Scope

Still forbidden:

- runtime stitching;
- `src/**` modification;
- creating `budget-generator.ts`;
- creating `generateBudgetEstimate`;
- creating `BudgetEstimateBlockedError`;
- creating or modifying `BudgetEstimateLine`;
- creating or modifying `PricingRule`;
- patching `preview-floor-plan-adapter.ts`;
- Plan Puzzle runtime modification;
- Renderer runtime modification;
- Budget Engine execution;
- harness execution;
- tests / build / dev server;
- production quantity;
- formal estimate;
- formal price;
- formal quote;
- formal Excel / PDF;
- DB / Supabase / API / AI / RAG / payment / LINE / n8n;
- stage / push / PR / merge / deploy.

## 12. Commander / Reviewer Next Decision Options

| Option | Label | Meaning | Still Forbidden |
|---|---|---|---|
| A | `BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_NO_EXECUTION` | Prepare a docs-only design for minimal future runtime repair based on this evidence. | Code changes, runtime, harness, formal output. |
| B | `BG1_PREPARE_RUNTIME_SKELETON_PATCH_PLAN_NO_EXECUTION` | Prepare a patch plan only, without applying it. | Creating files, editing `src/**`, running tests/build. |
| C | `PREPARE_DOCS_ONLY_SHARED_TRUTH_PR_REQUEST_NO_EXECUTION` | Prepare a request to promote local docs evidence through a docs-only PR. | stage/push/PR unless separately authorized. |
| D | `AWAIT_ISSUE_89_REVIEWER_GATE_UPDATE_NO_EXECUTION` | Stop further repair planning until Issue `#89` changes. | Runtime/harness/formal output. |
| E | `ESCALATE_RUNTIME_DRIFT_CONTRADICTION_TO_COMMANDER_NO_EXECUTION` | Escalate docs-runtime contradictions before planning repair design. | Runtime/harness/formal output. |

Recommended:

`BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_NO_EXECUTION`

Reason:

It is the smallest next step that uses the collected evidence without touching runtime.

## 13. Decision

Current packet status:

`BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_AND_REPAIR_DECISION_PACKET_READY_NO_EXECUTION`

Runtime stitching can start: `No`

Harness execution can start: `No`

Docs-only future design can be proposed: `Yes`
