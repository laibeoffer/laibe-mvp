# BG1 Docs-Only Shared Truth PR Commander Authorization Request

Updated: `2026-06-14`

Status: `COMMANDER_AUTH_REQUEST_READY_NO_EXECUTION`

## 1. Decision Requested

`AUTHORIZE_DOCS_ONLY_STAGE_COMMIT_PUSH_PR`

This request is limited to docs-only publication flow.

## 2. Allowed If Approved

- stage authorized docs-only changes;
- commit authorized docs-only changes;
- push BG1 branch;
- open docs-only PR.

## 3. Still Forbidden

- merge;
- `src/**`;
- runtime implementation;
- runtime stitching;
- harness execution;
- tests / build / dev server;
- formal estimate;
- production quantity;
- `budget-generator.ts`;
- `generateBudgetEstimate`;
- `BudgetEstimateBlockedError`;
- `BudgetEstimateLine`;
- `PricingRule`;
- `preview-floor-plan-adapter.ts`;
- Renderer production output;
- DB / API / AI / RAG / payment / LINE / n8n.

## 4. Commander Options

| Option | Meaning | Resulting Next State |
|---|---|---|
| `AUTHORIZE_DOCS_ONLY_STAGE_COMMIT_PUSH_PR` | Allow BG1 to stage authorized docs, commit, push branch, and open docs-only PR. | `BG1_DOCS_ONLY_SHARED_TRUTH_PR_EXECUTION_NO_RUNTIME` |
| `AUTHORIZE_DOCS_ONLY_STAGE_COMMIT_ONLY_NO_PUSH` | Allow local docs-only stage/commit only; no push or PR. | `BG1_DOCS_ONLY_LOCAL_COMMIT_ONLY_NO_RUNTIME` |
| `REQUEST_FILE_LIST_REVIEW_BEFORE_AUTHORIZATION` | Require exact include/exclude review before any git action. | `BG1_SHARED_TRUTH_FILE_LIST_REVIEW_REQUIRED_NO_EXECUTION` |
| `REJECT_SHARED_TRUTH_PR_REQUEST` | Reject publication request. | `BG1_SHARED_TRUTH_PR_REQUEST_REJECTED_NO_EXECUTION` |

## 5. Recommended Option

`REQUEST_FILE_LIST_REVIEW_BEFORE_AUTHORIZATION`

Reason:

There are many untracked local docs. A file-list review should precede stage / commit / push / PR authorization.

## 6. Request Result

`DOCS_ONLY_SHARED_TRUTH_PR_COMMANDER_AUTH_REQUEST_READY_NO_EXECUTION`

