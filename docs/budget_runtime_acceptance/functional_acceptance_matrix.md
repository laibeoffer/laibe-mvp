# Functional Acceptance Matrix

Workstream: `qa/budget-runtime-acceptance`

## Purpose

This matrix separates GitHub merge state from functional completion. A PR can be merged and still have no runtime acceptance.

| Level | Meaning | Required Evidence | Can Claim Runtime Complete |
|---|---|---|---:|
| `NOT_APPLICABLE_DOCS_ONLY` | Docs / governance / checklist only. | Changed files limited to docs and explicit forbidden-scope check. | No |
| `CONTRACT_ONLY` | Defines interfaces or handoff contracts without executable proof. | Contract docs, examples, owner, limitations. | No |
| `MOCK_READY` | Mock or placeholder surface exists. | Mock sample, boundary statement, no production side effects. | No |
| `WEB_RUNTIME_VERIFIED` | Browser UI path verified. | URL, browser steps, screenshot or smoke result, failure notes. | Partial |
| `CLI_VALIDATED` | CLI / validator command passed. | Command, environment, output summary, pass/fail result. | Partial |
| `RUNTIME_VERIFIED` | Runtime behavior verified for the specific scope. | Reproducible command/browser evidence, expected output, forbidden-flow check. | Yes, only for that scope |
| `PRODUCTION_READY` | Approved for production use. | Explicit product/commander decision plus runtime evidence. | Yes |

## Current Budget Workstreams Needing Functional Acceptance

- Quote Factory PR #3: validator evidence and Functional Acceptance Packet still required.
- Budget Engine Entry PR #55: runtime reviewer gate required before blocker can clear.
- Support agents #63/#64/#65: docs-only packets only, Functional Acceptance is `NOT_APPLICABLE_DOCS_ONLY`.

## Guardrail

`PR merged` is a GitHub landing fact. It is not a functional acceptance result.
