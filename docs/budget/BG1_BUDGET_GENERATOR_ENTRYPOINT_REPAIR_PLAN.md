# BG1 Budget Generator Entrypoint Repair Plan

Updated: `2026-06-13`

Status: `ENTRYPOINT_REPAIR_PLAN_DOCS_ONLY_NO_EXECUTION`

## 1. Current State

- `src/lib/budget/budget-generator.ts` is missing.
- Demo specs import `../budget-generator.ts`.
- `generateBudgetEstimate` runtime definition is missing.
- `BudgetEstimateBlockedError` runtime definition is missing.
- Runtime implementation is not authorized.
- Harness execution is not authorized.

## 2. Future Entrypoint Intent

If separately authorized, a future entrypoint should be:

- candidate-only until a later gate;
- dry-run-only until a later gate;
- formal-estimate-blocked by default;
- no production quantity by default;
- no formal Excel / PDF;
- no renderer production output;
- no PricingRule creation;
- no BudgetEstimateLine production creation.

## 3. Required Guard Principles

Future design must:

- require `dry_run_only:true` for dry-run paths;
- reject formal estimate mode;
- reject production quantity;
- reject renderer preview as quantity source;
- reject SVG / `.pc` / visual simulation / screenshots / unverified geometry;
- preserve `formalEstimateGuard`;
- preserve renderer static guard;
- preserve PR `#100` candidate-only boundary;
- preserve `areaProductionReady:false`;
- prevent PR `#100` embedded page script from being wired as runtime adapter;
- prevent raw `PriceObservation` / `PriceRange` from becoming formal unit price.

## 4. Candidate Future Shape

This is a planning shape only, not implementation:

| Future Element | Purpose | Required Guard |
|---|---|---|
| `BudgetEstimateBlockedError` | Typed blocked-state error for forbidden formal estimate paths. | Must not imply execution authorization. |
| `assertBudgetInputProductionReady` | Future guard for production-only paths. | Must reject candidate-only input unless separate production gate clears. |
| `generateBudgetEstimate` | Future deterministic estimate entrypoint. | Must not accept PR `#100` candidate metadata directly. |
| `BudgetEstimate` | Future engine output object. | Must be traceable to approved input bundle and deterministic catalog. |
| `BudgetEstimateLine` | Future line item object. | Must not be created from raw price range, owner free text, SVG, `.pc`, renderer preview, or candidate facts. |

## 5. Authorization Required Before Any Work

The following require separate explicit authorization:

- create or repair `src/lib/budget/budget-generator.ts`;
- implement `generateBudgetEstimate`;
- implement `BudgetEstimateBlockedError`;
- modify Budget Engine runtime;
- create or modify `BudgetEstimateLine`;
- create or modify `PricingRule`;
- patch `preview-floor-plan-adapter.ts`;
- connect Renderer / Excel / PDF;
- execute harness.

## 6. Current Decision

Entrypoint repair can be planned: `Yes`

Entrypoint repair can be implemented now: `No`
