# Phase 3.5 Formal File Writer Controlled Entry

Phase 3.5 establishes a controlled entry for future formal file writers. It does not create production-grade `.xlsx` or `.pdf` files.

## Purpose

The goal is to freeze the boundary before real file generation:

- writer input must be the gated structured document from `renderFormalBudgetDocument()`
- writer entry must run `runFormalFileWriterPreflight()` first
- failed preflight must block all artifact output
- writer output is limited to an artifact manifest or optional local `.json` / `.txt` placeholder
- no workbook or PDF library is introduced

## Controlled Entry

The controlled entry is:

```ts
writeFormalBudgetArtifact(gatedDocument, options)
```

The first runtime step is:

```ts
runFormalFileWriterPreflight(gatedDocument, options)
```

If preflight returns `valid: false`, the result is blocked and no artifact is written.

## Artifact Manifest

`FormalArtifactManifest` records:

- `manifest_id`
- `artifact_id`
- `snapshot_id`
- `project_id`
- `estimate_id`
- `audience`
- `format`
- `intended_extension`
- `actual_artifact_kind`
- `filename`
- `storage_target`
- `row_count`
- `total_amount`
- `layout_profile`
- `created_at`
- `preflight_valid`
- `policy_id`
- `security_flags`
- `warnings`

`security_flags` must record:

- `snapshot_only: true`
- `preflight_passed: true`
- `engine_not_called: true`
- `pricing_not_called: true`
- `material_resolver_not_called: true`
- `rag_not_called: true`
- `ai_not_called: true`
- `legacy_output_not_used: true`

## Local Staging Policy

Local staging is limited to:

```text
artifacts/budget-renderer-staging/
```

The policy rejects:

- absolute paths
- path traversal such as `../`
- paths that include the staging root instead of being relative to it
- signed / approved artifact overwrite
- `.xlsx` and `.pdf` targets during this phase
- extensions other than `.json` for manifest placeholders or `.txt` for text placeholders

## Placeholder Writer

`formal-placeholder-artifact-writer.ts` may write only after preflight and local staging policy pass.

Allowed output kinds:

- `manifest_only`
- `placeholder_text`

Allowed file extensions if writing is explicitly enabled:

- `.json`
- `.txt`

The placeholder writer must not write `.xlsx` or `.pdf`.

## Static Guard Coverage

The renderer static guard now also blocks formal writer dependencies and writer escape routes:

- workbook library tokens
- `xlsx` package import
- `pdfkit`
- `jspdf`
- `puppeteer`
- `playwright`
- `html-pdf`
- `writeFileSync` outside `formal-placeholder-artifact-writer.ts`
- `createWriteStream` outside `formal-placeholder-artifact-writer.ts`

The guard still blocks budget engine, pricing, material resolver, RAG, AI, and legacy output imports or keywords.

## Not Implemented

- no real `.xlsx`
- no real `.pdf`
- no production writer
- no workbook library
- no PDF library
- no production artifact storage
- no frontend
- no database migration
- no RAG / AI API
- no payment / escrow / listing fee
