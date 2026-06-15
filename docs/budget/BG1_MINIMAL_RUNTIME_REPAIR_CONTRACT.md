# BG1 Minimal Runtime Repair Contract

Updated: `2026-06-14`

Status: `DOCS_ONLY_CONTRACT_READY_NO_EXECUTION`

Input status: `BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_AND_REPAIR_DECISION_PACKET_READY_NO_EXECUTION`

Output status: `BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_READY_NO_EXECUTION`

## 1. Input Contract

Future runtime repair, if separately authorized, must accept only a guarded review input shape.

| Contract Element | Requirement |
|---|---|
| Primary input | `BudgetInputBundle` |
| Dry-run flag | `dry_run_only` must be `true` or equivalent guard state must be present. |
| Formal estimate mode | Must be absent or explicitly blocked. |
| Production quantity | Must be absent or explicitly blocked. |
| Candidate quantity | May be present only as candidate-only, reviewer-required, non-production facts. |
| PR `#100` candidate metadata | May be referenced only through docs-only contract planning. |

Forbidden input sources:

- SVG;
- renderer preview;
- `.pc`;
- visual simulation;
- screenshots;
- unverified geometry;
- PR `#50` guide mock;
- pure UI shell;
- PR `#100` embedded script used directly as runtime adapter;
- owner free text converted directly to estimate lines;
- PriceObservation / PriceRange converted directly to formal unit price.

## 2. Output Contract

Future runtime repair, if authorized, must return blocked-safe, candidate-only output.

| Output Element | Requirement |
|---|---|
| Candidate response | Allowed only as candidate-only / dry-run-only review object. |
| `BudgetOutputSnapshot` | Allowed only if existing evidence supports snapshot-compatible review output. |
| Formal estimate | Forbidden. |
| Formal quote | Forbidden. |
| Excel / PDF | Forbidden. |
| Renderer production output | Forbidden. |
| `BudgetEstimateLine` production creation | Forbidden. |
| `PricingRule` creation | Forbidden. |

## 3. Error / Block Contract

The future guarded path must block:

- formal estimate request;
- production quantity request;
- missing `dry_run_only`;
- forbidden quantity source;
- PR `#100` embedded script adapter request;
- Issue `#89` harness execution attempt;
- missing required type source;
- runtime repair attempt before authorization.

The block result may be an error object, explicit blocked response, or future `BudgetEstimateBlockedError`, but this task does not implement any runtime error class.

## 4. Non-contract Items

The following are not contracts:

- PR `#100` is not a formal budget schema.
- PR `#100` is not a production adapter.
- PR `#100` is not a production quantity source.
- PR `#100` is not a formal estimate contract.
- Local BG1 docs are not GitHub shared truth until separately promoted by an authorized docs-only flow.

## 5. Contract Decision

`MINIMAL_RUNTIME_REPAIR_CONTRACT_READY_NO_EXECUTION`

