# BG1 PR100 Runtime Adapter Prohibition Note

Updated: `2026-06-14`

Status: `PR100_RUNTIME_ADAPTER_PROHIBITION_ACTIVE_NO_EXECUTION`

## 1. Boundary

PR `#100` is accepted only as the docs-only active candidate export head.

PR `#100` is not:

- formal budget schema;
- production adapter;
- production quantity source;
- formal estimate contract;
- direct runtime adapter;
- direct `generateBudgetEstimate` input;
- direct `BudgetEstimateLine` input;
- direct BudgetOutputSnapshot production input;
- Renderer production input.

## 2. Embedded Script Rule

PR `#100` embedded script must not be wired directly as runtime adapter.

Any future production adapter requires:

- separate Reviewer gate;
- Commander authorization;
- explicit runtime implementation task;
- source verification;
- production quantity authority;
- continued exclusion of forbidden quantity sources;
- continued no-formal-estimate guard until formal estimate is separately authorized.

## 3. Candidate Semantics To Preserve

- `areaProductionReady:false`;
- candidate-only;
- reviewer-required;
- no-execution;
- not production quantity;
- not formal estimate input.

## 4. Decision

`PR100_RUNTIME_ADAPTER_PROHIBITION_READY_NO_EXECUTION`

