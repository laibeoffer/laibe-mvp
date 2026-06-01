# Output Preview Panel Spec

## Purpose

The output preview panel shows dry-run output status without creating formal customer documents.

## Status Values

- `snapshot-only`
- `customer preview`
- `internal trace`
- `no formal Excel/PDF`
- `blocked`

## Required Display

- preview mode
- snapshot id, if available
- audience label
- trace safety label
- no-formal-output label
- renderer boundary note

## Allowed Preview Types

### Snapshot Only

May show a structured BudgetOutputSnapshot readiness state.

### Customer Preview

May show customer-safe rows only if derived from a gated snapshot.

### Internal Trace

May show trace fields for internal review only.

### No Formal Excel/PDF

Must be visible when real file writer is not allowed.

## Forbidden Behavior

The panel must not:

- generate real `.xlsx`
- generate real `.pdf`
- run renderer runtime outside the allowed snapshot contract
- read pricing rules
- read material resolver
- rerun Budget Engine
- use legacy `formatBudgetOutput()` as formal source

