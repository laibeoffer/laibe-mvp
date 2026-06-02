# PR Merged Is Not Functional Completion

Workstream: `qa/budget-runtime-acceptance`

## Core Rule

A merged PR proves that GitHub accepted the change into `main`. It does not prove the feature works at runtime.

## Separate Gates

| Gate | Proves | Does Not Prove |
|---|---|---|
| Merge Gate | Code/docs landed in GitHub main. | Runtime behavior, browser flow, validator pass, product approval. |
| Functional Acceptance Gate | Evidence for the claimed behavior. | Broader production readiness outside the claim. |
| Integration Gate | Required workstreams are accepted together. | Support agent completion or unrelated docs completion. |

## Examples

- PR #58 merged: support agents registered; evidence packets still required.
- Docs-only Output Documents PR: snapshot usage note exists; no real Excel/PDF writer.
- Quote Factory PR body listing validators: commands listed; execution evidence still required.
- Budget Engine dry-run PR: runtime evidence can be reviewed, but integration harness is still not started until gate clears.

## Required Report Language

Use:

- `MERGED_TO_MAIN`
- `FUNCTIONAL_ACCEPTANCE_PENDING`
- `NOT_APPLICABLE_DOCS_ONLY`
- `RUNTIME_VERIFIED_FOR_SCOPE`

Avoid:

- "done" without evidence level;
- "100%" for docs-only registration;
- "production ready" without explicit production authorization.
