# Output Feedback Proposals

These proposals are support-only and do not modify renderer runtime.

## Proposal OUT-PROP-001

Output Documents should continue to require `BudgetOutputSnapshot` or `RenderedBudgetDocument` as its formal input boundary.

Support note: placeholder context, non-verified SVG quantities, and candidate prices should appear only as trace or warning evidence until upstream acceptance is explicit.

Boundary: no renderer invocation, no Excel/PDF/customer quote generation, no Budget Engine rerun.
