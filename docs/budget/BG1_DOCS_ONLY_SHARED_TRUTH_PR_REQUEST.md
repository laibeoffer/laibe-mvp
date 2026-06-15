# BG1 Docs-Only Shared Truth PR Request

Updated: `2026-06-14`

## 1. Request Status

| Field | Value |
|---|---|
| Task | `PREPARE_DOCS_ONLY_SHARED_TRUTH_PR_REQUEST_NO_EXECUTION` |
| Input status | `BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_REVIEW_PASSED_NO_EXECUTION` |
| Output status | `BG1_DOCS_ONLY_SHARED_TRUTH_PR_REQUEST_READY_NO_EXECUTION` |
| Request type | `docs_only_shared_truth_pr_request` |
| Current action | request authorization only |
| Stage performed | `No` |
| Commit performed | `No` |
| Push performed | `No` |
| PR opened | `No` |
| Merge performed | `No` |

## 2. Purpose

BG1 has produced local docs-only evidence for runtime type/source drift, repair decision planning, and minimal runtime repair design. Those files remain local review evidence and are not GitHub shared truth.

This request asks Commander / Reviewer to decide whether BG1 may promote the local docs evidence through a docs-only GitHub flow.

This document is not a PR, not a commit, not a push, and not a merge request execution.

## 3. Why This PR Is Needed

- Current `docs/budget/**` BG1 evidence is mostly untracked local evidence.
- Current `docs/bg1_budget_commander/**` evidence is untracked local evidence.
- `docs/NEXT_CODEX_HANDOFF.md` is modified locally.
- Local evidence cannot be treated as GitHub shared truth.
- A docs-only PR would let reviewers inspect the evidence before any runtime skeleton patch plan or implementation-adjacent work.
- Runtime repair planning needs a stable shared-truth reference before moving further.

## 4. Requested Authorization

Requested decision:

`AUTHORIZE_DOCS_ONLY_STAGE_COMMIT_PUSH_PR`

Allowed only if approved:

- stage authorized docs-only files;
- commit authorized docs-only files;
- push BG1 branch;
- open docs-only PR.

Still not requested:

- merge;
- runtime implementation;
- `src/**` modification;
- harness execution;
- formal estimate;
- production quantity;
- Budget Engine execution;
- Renderer production output.

## 5. Proposed PR Scope

Proposed allowed scope:

- `docs/budget/**`
- `docs/bg1_budget_commander/**`
- `docs/NEXT_CODEX_HANDOFF.md`

Explicitly excluded:

- `src/**`
- runtime files;
- tests;
- build config;
- renderer runtime;
- adapter runtime;
- `src/lib/budget/budget-generator.ts`;
- generated Excel / PDF;
- binary outputs;
- DB / Supabase / API / AI / RAG / payment / LINE / n8n.

## 6. Proposed PR Title

`BG1 budget docs-only shared truth: runtime drift evidence and repair design`

## 7. Proposed PR Body Outline

Suggested sections:

1. Summary
2. What changed
3. What is explicitly not changed
4. No runtime / no src confirmation
5. Issue `#89` still blocking
6. PR `#100` docs-only boundary
7. Review notes
8. Next after PR

Detailed draft body:

`docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_DRAFT_BODY.md`

## 8. Required Review Before Any PR Execution

Before BG1 may stage, commit, push, or open a PR, Commander / Reviewer must approve:

- exact file list;
- whether `docs/bg1_budget_commander/**` should be included as a whole or subset;
- whether legacy renderer / owner quote evidence should be included in this PR or left out;
- whether `docs/NEXT_CODEX_HANDOFF.md` should be included despite local line-ending warning;
- whether the PR should include only BG1 budget docs or broader budget docs.

## 9. Request Result

`BG1_DOCS_ONLY_SHARED_TRUTH_PR_REQUEST_READY_NO_EXECUTION`

Next required action:

`AWAIT_COMMANDER_DOCS_ONLY_SHARED_TRUTH_PR_AUTHORIZATION_NO_EXECUTION`

