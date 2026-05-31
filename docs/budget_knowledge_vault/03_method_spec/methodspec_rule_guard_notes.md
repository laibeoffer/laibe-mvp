# MethodSpec Rule Guard Notes

## Formal Guards

- `PricingRule` remains the only deterministic formal unit-price source.
- AI, RAG, and raw candidate data must not directly write or approve `PricingRule`.
- `MaterialSpec` and `ItemMaterialBinding` may support traceability but must not change formal prices.
- `LaborRule` is reference-only unless a later approved phase activates a labor/material split contract.
- `UnitConversion` must not silently rewrite already generated quantities.
- `NoteTemplate` and `InclusionExclusionRule` may provide notes, assumptions, exclusions, and risks; they must not change quantity, amount, or renderer layout.

## Requirement Context Window

Allowed fields:

- `project_requirement_brief_id`
- `owner_intent_id`
- `requirement_context_status`
- `budget_preference`
- `space_requirements`
- `scope_constraints`
- `review_flags`

Forbidden:

- free-text requirements directly creating `BudgetEstimateLine`
- requirement form content directly producing `PricingRule`

## Plan / SVG Quantity Context Window

Allowed fields:

- `plan_id`
- `svg_artifact_id`
- `plan_quantity_facts_id`
- `quantity_context_status`
- `zone_id`
- `area_m2`
- `wall_length_m`
- `opening_count`
- `quantity_confidence`
- `reviewer_required`

Forbidden:

- SVG directly entering renderer
- SVG directly entering `BudgetEstimateLine`
- candidate area becoming production quantity fact
- unverified SVG becoming formal quantity authority
