# Runtime Evidence Levels

Workstream: `qa/budget-runtime-acceptance`

## Evidence Levels

### `NOT_APPLICABLE_DOCS_ONLY`

Used when a PR only changes docs, governance, contract language, checklists, or placeholder examples. It must not be reported as runtime verified.

### `CONTRACT_ONLY`

Used when a PR defines fields, interfaces, handoff expectations, or mock schemas but does not execute a workflow.

### `MOCK_READY`

Used when a mock surface or sample artifact exists. Mock-ready does not mean production-ready.

### `WEB_RUNTIME_VERIFIED`

Requires:

- target URL or route;
- browser steps;
- observed result;
- screenshot or smoke-test transcript when available;
- known failures or limitations.

### `CLI_VALIDATED`

Requires:

- exact command;
- pass/fail result;
- relevant output summary;
- static guard or validator output when applicable.

### `RUNTIME_VERIFIED`

Requires reproducible runtime behavior for the exact claimed scope plus forbidden-flow checks.

## Forbidden Upgrade

A docs-only PR cannot be upgraded to `WEB_RUNTIME_VERIFIED`, `CLI_VALIDATED`, or `RUNTIME_VERIFIED` without actual runtime evidence.
