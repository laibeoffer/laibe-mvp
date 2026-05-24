# Phase 3.3 / 3.4 Formal File Writer Preflight

This document defines the preflight contract before any future formal `.xlsx` / `.pdf` writer may enter.

Phase 3.3 established token guard, artifact policy, fixed snapshot fixtures, and preflight checks.

Phase 3.4 hardens preflight so malformed input returns a validation report instead of throwing, and adds a dry-run writer contract.

## Boundary

Formal file writer preflight may only accept the gated structured document produced by:

```ts
renderFormalBudgetDocument(snapshot, options)
```

It must not accept or call:

- `BudgetEstimate`
- `BudgetEstimateLine`
- budget engine
- pricing rules
- material resolver
- RAG
- AI API
- legacy `formatBudgetOutput()`

## Renderer Token Guard

Formal Excel / PDF skeleton output must carry a runtime token created by `formal-renderer-entry.ts`.

The old string marker is not sufficient. A manually forged string marker must be rejected.

The token is backed by module runtime state and static guard rules. It is not a production security boundary by itself, so User-triggered Review result may be requested by the user before real file writing.

## Preflight Checks

`runFormalFileWriterPreflight()` checks:

- input is a formal renderer gated document
- audience is allowed by artifact policy
- format is allowed by artifact policy
- filename follows the snapshot-bound naming rule
- customer artifact contains no internal trace layout columns
- customer artifact contains no internal trace row fields
- internal artifact is marked `internal_trace`
- `snapshot_id` exists
- `layout_contract` exists
- `layout_contract.columns` exists
- `totals` exists
- `rows` exists and is an array
- customer warnings are sanitized
- writer options do not contain forbidden engine / pricing / material / retrieval / model keys

## Phase 3.4 No-throw Behavior

`runFormalFileWriterPreflight()` must return:

```ts
{
  valid: false,
  errors: [...],
  warnings: [...],
  checks: [...]
}
```

It must not throw for:

- null / undefined input
- primitive input
- missing `snapshot_id`
- missing `layout_contract`
- missing `layout_contract.columns`
- missing `rows`
- `rows` is not an array
- missing `totals`
- missing `audience`
- missing `renderer`
- wrong token
- customer artifact with internal trace fields
- filename mismatch
- forbidden writer options

## Fixture Snapshot

`fixture-budget-output-snapshot.ts` is a hand-written deterministic `BudgetOutputSnapshot`.

Renderer and writer-preflight demos may use the fixture so they do not rerun the budget engine.

## Dry-run Writer

Phase 3.4 adds `runFormalFileWriterDryRun()`.

The dry-run writer:

- runs preflight
- returns would-write metadata
- returns `would_write: false` if preflight fails
- does not write files
- does not create `.xlsx`
- does not create `.pdf`

The detailed dry-run contract is in `docs/budget/25-file-writer-dry-run-contract.md`.

## Not Implemented

- no real `.xlsx`
- no real `.pdf`
- no workbook library
- no PDF library
- no file storage
- no frontend
- no RAG / AI API
- no payment / escrow / listing fee
