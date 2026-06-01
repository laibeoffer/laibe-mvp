# Dry-Run Fixture Contract

## Contract Status

This is a dry-run QA fixture contract. It is not a production schema, price authority, or renderer contract. It is intended for acceptance testing only.

## Shared Fixture Controls

Every fixture package must include:

```json
{
  "dry_run_only": true,
  "formal_price_generated": false,
  "formal_quote_generated": false,
  "production_write_allowed": false,
  "external_io_allowed": false
}
```

## Package Layout

```text
docs/budget_e2e_qa/examples/
  placeholder_project_requirement_brief.json
  placeholder_plan_quantity_facts.json
  expected_budget_output_snapshot.sample.json
  forbidden_flow_test_cases.sample.json
```

A future harness may copy these fixtures into a temporary dry-run workspace, but it must not mutate production data stores.

## Quote Factory Cloud-Ready Export Package

Required fields:
- `package_id`
- `export_version`
- `source_system: quote_factory`
- `review_status`
- `price_reference_ids`
- `source_quality_summary`
- `dry_run_only`

Allowed downstream use:
- provenance summary
- warning summary
- reviewed reference metadata

Forbidden downstream use:
- direct `BudgetEstimateLine.unit_price`
- direct `PricingRule`
- direct customer price display

## Raw Candidate HandoffProposal

Required fields:
- `handoff_proposal_id`
- `source_system: raw_candidate_warehouse`
- `review_gate.status`
- `raw_candidate_ids`
- `proposed_mapping`
- `dry_run_only`

Allowed downstream use:
- review gate input
- internal trace preview after review status is known
- warning summary

Forbidden downstream use:
- `customer_view`
- `PricingRule`
- formal price
- formal BudgetEstimateLine

## MethodSpec Approved Seed / Rule Catalog

Required fields:
- `catalog_id`
- `catalog_version`
- `source_system: method_spec_catalog`
- `approval_status: approved`
- `approved_rule_ids`
- `recipe_ids`

Allowed downstream use:
- deterministic Budget Engine fixture input
- rule provenance
- internal trace preview

Forbidden downstream use:
- any rule with `approval_status` other than `approved`
- direct mutation by Output Documents
- mutation by Raw Candidate or Quote Factory

## Placeholder ProjectRequirementBrief

Required fields:
- `brief_id`
- `source_system: placeholder_project_requirement_brief`
- `dry_run_only: true`
- `requirement_facts`
- `owner_text_raw`
- `assumption_flags`

Allowed downstream use:
- assumptions
- warning summary
- formula exercise in dry-run only

Forbidden downstream use:
- direct `BudgetEstimateLine`
- formal price
- formal quantity authority

## Placeholder PlanPuzzleQuantityFacts

Required fields:
- `facts_id`
- `source_system: placeholder_plan_puzzle_quantity_facts`
- `dry_run_only: true`
- `quantity_facts`
- `source_plan_artifacts`
- `quantity_authority: placeholder_dry_run_only`

Allowed downstream use:
- dry-run formula exercise
- trace preview
- warning summary

Forbidden downstream use:
- formal quantity
- direct renderer input from SVG
- formal BudgetEstimateLine generation

## Required Validation Behavior

A harness using these fixtures must fail closed when:
- any fixture has `dry_run_only` missing or false
- any formal price field is non-null
- any raw evidence bypasses review
- any unapproved MethodSpec rule is consumed
- any Output Documents component reads Raw Warehouse or MethodSpecCatalog directly
- any external IO is attempted
