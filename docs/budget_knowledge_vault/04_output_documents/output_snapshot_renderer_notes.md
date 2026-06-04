# Output Snapshot Renderer Notes

## Snapshot-only Rule

Renderer work must remain downstream of `BudgetOutputSnapshot` or `RenderedBudgetDocument`.

## Allowed Evidence

- Snapshot-only usage notes.
- Static guard reports.
- PR state and final packet references.
- Renderer gate notes that do not execute runtime output.

## Forbidden Evidence Claims

- Formal Excel/PDF generated.
- Customer quote generated.
- Renderer invoked from this vault.
- Budget Engine rerun.
- Pricing rules or material resolver read by output.
