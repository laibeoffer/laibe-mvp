# Owner Guide Completion Gate

Workstream: `budget/input-flow-gate`

## Purpose

The Owner Guide completion gate decides whether user requirement intake is complete enough to enter Plan Puzzle.

## Required Conditions

Plan Puzzle entry is allowed only when:

- required requirement fields are completed;
- project scope is not empty;
- room / area context is present or explicitly unavailable;
- user goals and constraints are recorded;
- missing files are either not required yet or marked with a review flag;
- no formal budget CTA is shown as available.

## Disabled CTAs When Incomplete

- Enter Plan Puzzle
- Continue to Budget Preview
- Generate Budget Preview
- Request Formal Quote
- Export Customer Quote

## Allowed CTAs When Incomplete

- Save Draft Requirement
- Continue Requirement Form
- Add Reference Files

## Completion Output

The gate emits a docs-only status object:

- `requirement_completion_status`
- `missing_required_fields`
- `review_required`
- `next_allowed_step`

It does not emit `BudgetEstimateLine`, `PricingRule`, formal price, or renderer payload.
