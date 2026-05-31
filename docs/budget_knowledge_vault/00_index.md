# Budget Knowledge Vault Index

Status: support-only Markdown knowledge vault.
Workstream: `knowledge/budget-vault`
Managed by: `LAIBE_REVIEWER_INTEGRATION_OFFICER`
Not part of Integration Gate: Yes

## Purpose

This vault summarizes the four core LaiBE budget workstreams for Integration Officer review:

- Quote Factory / `quote-factory/price-range-governance`
- Raw Candidate Warehouse / `warehouse/raw-candidate`
- MethodSpec Warehouse / `warehouse/method-spec`
- Output Documents / `output/budget-documents`

The vault records status summaries, gaps, proposals, review notes, decision logs, and readiness signals. It does not create formal budget data.

## Allowed Outputs

- status summary
- integration gap register
- proposal register
- review note
- decision log
- readiness matrix
- automation patrol note

## Forbidden Outputs

- formal price
- approved price
- direct `PricingRule` publish
- direct `MaterialSpec` publish
- direct `LaborRule` publish
- `BudgetEstimateLine`
- `BudgetOutputSnapshot`
- customer quote
- official renderer output

## Core Files

- `AUTOMATION.md`
- `01_quote_factory/qf_status_summary.md`
- `02_raw_candidate/raw_candidate_status_summary.md`
- `03_method_spec/methodspec_status_summary.md`
- `04_output_documents/output_documents_status_summary.md`
- `05_integration_backlog/integration_gap_register.md`
- `05_integration_backlog/integration_readiness_matrix.md`
- `06_proposals/*.md`
- `07_decision_logs/*.md`

## Parameter Windows

The vault preserves two integration context windows:

- Requirement Form / ProjectRequirementBrief window
- Plan Puzzle SVG / Quantity Facts window

Both windows may support dry-run or trace notes only. They must not directly create prices, formal estimate lines, renderer input, or customer-facing quotes.
