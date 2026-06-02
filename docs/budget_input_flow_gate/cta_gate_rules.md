# CTA Gate Rules

Workstream: `budget/input-flow-gate`

## CTA States

Each CTA has one of these states:

- `enabled`: user may proceed.
- `disabled_missing_required_data`: required fields are incomplete.
- `disabled_missing_plan_context`: plan quantity context is missing.
- `disabled_review_required`: evidence exists but needs review before next step.
- `hidden_out_of_scope`: CTA is not part of the current phase.

## Requirement Form Incomplete

When the requirement form is incomplete, these CTAs must be disabled:

- Enter Plan Puzzle
- Continue to Budget Preview
- Generate Budget Preview
- Request Formal Quote
- Export Customer Quote

Allowed CTAs:

- Save Draft Requirement
- Continue Requirement Form
- Upload Reference Files

## Plan Puzzle Incomplete

When Plan Puzzle is incomplete or quantity facts are not `verified`, these CTAs must be disabled:

- Continue to Budget Preview
- Generate Budget Preview
- Request Formal Quote
- Export Customer Quote

Allowed CTAs:

- Return to Plan Puzzle
- Upload Plan / Drawing References
- Mark Quantity Context for Review

## Budget Preview Gate

Budget Preview can be enabled only when:

- required requirement fields are complete;
- plan quantity context is `verified`;
- file intake evidence is at least `linked` or explicitly `unavailable` with review flag;
- preview remains dry-run / not customer-facing.

## Forbidden CTA Claims

No CTA in this docs-only packet may claim to generate formal price, formal quote, formal Excel/PDF, `PricingRule`, or production `BudgetEstimateLine`.
