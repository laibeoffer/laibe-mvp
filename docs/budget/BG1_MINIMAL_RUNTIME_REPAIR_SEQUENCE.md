# BG1 Minimal Runtime Repair Sequence

Updated: `2026-06-14`

Status: `DOCS_ONLY_SEQUENCE_READY_NO_EXECUTION`

## 1. Sequence Position

| Step | Status | Notes |
|---|---|---|
| Type/source evidence collection | Complete | `BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_AND_REPAIR_DECISION_PACKET_READY_NO_EXECUTION` |
| Docs-only minimal runtime repair design | Complete by this packet | No runtime implementation. |
| Docs-only shared truth PR request | Recommended next | Requires separate authorization. |
| Runtime skeleton patch plan | Not started | Docs-only only, if later authorized. |
| Runtime implementation | Not authorized | Must not start. |
| Harness review / execution | Blocked | Issue `#89` still blocks execution. |

## 2. Design Sequence

1. Confirm evidence packet.
2. Define minimal repair contract.
3. Define future `budget-generator.ts` skeleton responsibilities.
4. Define `generateBudgetEstimate` guard behavior.
5. Define `BudgetEstimateBlockedError` reason codes.
6. Define no-production-quantity guard.
7. Define no-formal-estimate guard.
8. Prepare next authorization packet.
9. Update next stitching action and handoff.

## 3. Hard Stop Sequence

Stop before:

- editing `src/**`;
- creating runtime files;
- running tests / build / harness;
- producing formal output;
- staging or pushing.

## 4. Decision

`MINIMAL_RUNTIME_REPAIR_SEQUENCE_READY_NO_EXECUTION`

