# Expected BudgetOutputSnapshot Contract

## Purpose

This document defines the expected dry-run `BudgetOutputSnapshot` shape for E2E acceptance. It is not a formal quote and must not be rendered as formal Excel, PDF, CSV, or HTML output.

## Top-Level Requirements

The snapshot must contain:
- `snapshot_id`
- `snapshot_type: dry_run_expected_contract`
- `dry_run_only: true`
- `formal_price_generated: false`
- `formal_quote_generated: false`
- `source_package_refs`
- `customer_preview`
- `internal_trace_preview`
- `warning_summary`
- `provenance_summary`
- `forbidden_flow_report`

## Price Handling

All formal price-capable fields must be null, redacted, or explicitly marked dry-run.

Allowed:
- `unit_price: null`
- `amount: null`
- `display_price: DRY_RUN_REDACTED`
- `price_authority: none`

Forbidden:
- numeric formal `unit_price`
- numeric formal line amount
- computed total amount
- formal quote number
- customer-facing price derived from raw evidence, AI, RAG, markdown proposal, payment, escrow, or listing fee data

## Customer Preview

Customer preview may include:
- item label
- dry-run quantity display
- assumption notes
- blocked price display
- warning badges

Customer preview must not include:
- HandoffProposal content
- raw candidate payloads
- internal source quality scoring
- formal unit price
- formal total

## Internal Trace Preview

Internal trace preview may include:
- fixture IDs
- MethodSpec rule IDs
- recipe IDs
- review gate status
- source package references
- blocked flow reasons

Internal trace preview must not mutate source warehouses or renderer runtime.

## Warning Summary

Warning summary must report:
- placeholder requirement input
- placeholder plan fact input
- dry-run-only status
- missing formal price authority
- any rejected forbidden flow

## Provenance Summary

Provenance summary must distinguish:
- Quote Factory reviewed references
- Raw Candidate handoff proposals
- MethodSpec approved rules
- Placeholder requirement facts
- Placeholder plan facts
- Output Documents snapshot-only reads

## Forbidden Flow Report

The report must include one record per forbidden flow test case with:
- `flow_id`
- `from`
- `to`
- `expected_verdict`
- `actual_verdict`
- `blocked_reason`
- `must_not_create`

Acceptance requires every `actual_verdict` to match a blocked, rejected, or fail-closed verdict.
