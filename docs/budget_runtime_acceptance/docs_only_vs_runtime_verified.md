# Docs-only vs Runtime Verified

Workstream: `qa/budget-runtime-acceptance`

## Rule

Docs-only work is valuable governance evidence, but it is not runtime evidence.

## Docs-only Means

- Markdown, contract, checklist, governance, handoff, or sample-only changes;
- no executed app path;
- no CLI validator result unless separately provided;
- no browser smoke result;
- no production behavior claim.

Functional Acceptance label: `NOT_APPLICABLE_DOCS_ONLY`.

## Runtime Verified Means

A specific runtime claim was executed and observed. The evidence must include reproducible steps, command output or browser observation, result, and limitations.

## Forbidden Upgrade Examples

- Merged docs PR -> not runtime verified.
- Placeholder JSON sample -> not CLI validated.
- PR body lists commands -> not validator evidence unless results are posted.
- Mock file manifest -> not real upload backend.
- Output snapshot docs -> not formal Excel/PDF writer.

## Required Review Language

Use precise claims:

- "docs-only contract submitted";
- "mock-ready sample provided";
- "CLI validator passed for this command";
- "browser smoke passed for this route".

Do not say "functional complete" unless evidence level supports it.
