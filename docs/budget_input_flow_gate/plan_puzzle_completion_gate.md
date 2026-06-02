# Plan Puzzle Completion Gate

Workstream: `budget/input-flow-gate`

## Purpose

The Plan Puzzle completion gate decides whether plan and quantity context is strong enough for Budget Preview.

## Required Conditions For Budget Preview

- plan puzzle session exists or plan context is explicitly unavailable with review flag;
- required zones / rooms are mapped when applicable;
- quantity facts are `verified` for dry-run preview;
- placeholder and linked quantities are preserved as trace only;
- unresolved quantity gaps are listed in warnings;
- no formal price or formal quantity claim is made.

## Disabled CTAs When Incomplete

- Continue to Budget Preview
- Generate Budget Preview
- Request Formal Quote
- Export Customer Quote

## Allowed CTAs When Incomplete

- Return to Plan Puzzle
- Add / Link Plan File
- Mark Quantity for Review
- Save Draft

## Quantity Status Rules

- `placeholder`: not accepted for formal budget.
- `linked`: can show trace link but needs verification.
- `verified`: may unlock dry-run Budget Preview, not production formal budget.
- `unavailable`: must trigger review-required state.

## Forbidden

Plan Puzzle quantity facts must not directly become production `BudgetEstimateLine.quantity` or formal pricing basis.
