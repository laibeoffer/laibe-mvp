# BG1 No Formal Estimate Guard Design

Updated: `2026-06-14`

Status: `DOCS_ONLY_NO_FORMAL_ESTIMATE_GUARD_READY_NO_EXECUTION`

## 1. Guard Purpose

Future budget runtime repair must prevent dry-run or candidate-only paths from producing formal estimates.

## 2. Formal Estimate Attempts That Must Be Blocked

- Requesting formal estimate mode.
- Creating formal price.
- Creating formal quote.
- Creating formal Excel / PDF.
- Creating production `BudgetEstimateLine`.
- Creating `PricingRule`.
- Treating PriceObservation / PriceRange as formal unit price.
- Treating BudgetOutputSnapshot-compatible object as formal output.

## 3. Required Block Semantics

| Attempt | Required Result |
|---|---|
| formal estimate requested | Block with `FORMAL_ESTIMATE_PROHIBITED`. |
| formal price requested | Block. |
| formal quote requested | Block. |
| Excel / PDF requested | Block. |
| Renderer production output requested | Block. |
| `BudgetEstimateLine` production creation requested | Block. |
| `PricingRule` creation requested | Block. |

## 4. Allowed Docs-only Use

The system may describe:

- future guard semantics;
- blocked reason codes;
- candidate-only review output;
- repair planning decisions.

It must not produce formal price, formal estimate, formal quote, Excel, PDF, or production renderer output.

## 5. Issue #89 Relationship

Issue `#89` remains a harness execution gate. No formal estimate path can use Issue `#89` review-readiness as execution permission.

## 6. Decision

`NO_FORMAL_ESTIMATE_GUARD_DESIGN_READY_NO_EXECUTION`

