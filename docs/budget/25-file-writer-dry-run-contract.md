# Phase 3.4 File Writer Dry-run Contract

Phase 3.4 is a file-writer readiness hardening phase. It does not create real `.xlsx` or `.pdf` files.

## Scope

This phase adds:

- no-throw preflight behavior for malformed formal renderer output
- invalid formal document fixtures
- dry-run writer metadata
- token factory import guard
- clearer static guard reporting

It does not add a workbook library, PDF library, frontend UI, database migration, RAG, AI API, Skills, payment, escrow, or listing fee behavior.

## No-throw Preflight

`runFormalFileWriterPreflight()` must return a validation report for any input shape. It must not throw when input is:

- `null`
- `undefined`
- string or number
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
- filename does not match policy
- writer options contain forbidden engine, pricing, material, retrieval, or model keys

Malformed input must return:

```ts
{
  valid: false,
  errors: [...],
  warnings: [...],
  checks: [...]
}
```

## Dry-run Writer

`runFormalFileWriterDryRun()` does not write files. It only returns would-write metadata:

- `valid`
- `would_write`
- `audience`
- `format`
- `filename`
- `storage_target`
- `snapshot_id`
- `row_count`
- `total_amount`
- `preflight_errors`
- `preflight_warnings`
- `artifact_policy_id`

When preflight fails, `would_write` must be `false`.

## Input Boundary

The dry-run writer accepts only formal renderer gated structured documents. It must not accept `BudgetEstimate`, `BudgetEstimateLine`, raw pricing sources, material resolver output, MethodSpecCatalog, RAG results, AI output, or legacy debug output.

Future real file writers must accept the same gated structured document and must run preflight first.

## Token Guard

Formal Excel / PDF skeleton output must carry a formal renderer token created by `formal-renderer-entry.ts`.

The old string contract marker is not sufficient. A manually forged string marker must be rejected.

`createFormalRendererToken()` is guarded by static scan policy:

- allowed in `formal-renderer-token.ts`
- allowed in `formal-renderer-entry.ts`
- forbidden in formal renderer, file writer, preflight, and dry-run files

The runtime token remains a module-level guard, not a cryptographic boundary. User-triggered Review result may be requested by the user before real file writing.

## Static Guard Reporting

`run-renderer-static-guard.ts` now reports `forbidden_rules_checked`, including each rule's scan type:

- `full_text`
- `import_pattern`
- `restricted_usage`

It still exits non-zero when issues are found.

## Still Not Implemented

- no real `.xlsx`
- no real `.pdf`
- no file write
- no workbook formatting engine
- no PDF layout engine
- no CI integration for the guard command
- no production artifact storage
