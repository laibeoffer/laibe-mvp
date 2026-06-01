# Canonical Field Naming Rules

Status: `ACTIVE_INITIALIZATION`

These rules normalize cross-agent field names for docs-only budget schema coordination.

## General Rules

- Use `snake_case` for JSON fields.
- Use stable ids ending in `_id`.
- Use plural arrays only for list values.
- Use `*_status` for lifecycle/status windows.
- Use `*_source` for human-readable source category.
- Use `source_ref` for a trace pointer to an upstream artifact, issue, PR, file, package, or record.
- Use `source_refs` for multiple trace pointers.
- Use `warnings` for human-readable safety warnings.
- Use `risk_flags` for machine-readable risk labels.
- Use `review_flags` for items requiring human review.
- Use `forbidden_use` to show what receivers must not do.

## Universal Status Field

Use `contract_status` for the whole object when the object is exchanged across agents.

Allowed values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Do not invent synonyms such as `mock`, `draft_ready`, `approved`, or `production_ready` for this universal field.

## Canonical Id Fields

| Contract | Canonical id |
|---|---|
| `OwnerIntent` | `owner_intent_id` |
| `ProjectRequirementBrief` | `project_requirement_brief_id` |
| `PlanPuzzleQuantityFacts` | `plan_quantity_facts_id` |
| `FileManifest` | `file_manifest_id` |
| `QuoteFactoryExportPackage` | `quote_factory_export_package_id` |
| `PriceObservation` | `price_observation_id` |
| `PriceRange` | `price_range_id` |
| `RawCandidate` | `raw_candidate_id` |
| `HandoffProposal` | `handoff_proposal_id` |
| `MethodSpecCatalog` | `method_spec_catalog_id` or existing `catalog_id` |
| `PricingRuleReference` | `pricing_rule_ref_id` |
| `BudgetInputBundle` | `budget_input_bundle_id` |
| `BudgetRunPlan` | `budget_run_plan_id` |
| `BudgetOutputSnapshot` | `budget_output_snapshot_id` or existing `snapshot_id` |
| `ReviewDecision` | `review_decision_id` |
| `FunctionalAcceptanceReport` | `functional_acceptance_report_id` |
| `RuntimeEvidenceReport` | `runtime_evidence_report_id` |
| `FinalCompletionPacket` | `final_completion_packet_id` |

## Price Field Rules

Use evidence-safe names for candidate prices:

- `observed_price`
- `observed_amount`
- `observed_currency`
- `price_observation_id`
- `price_range_id`

Do not use formal-authority names in candidate or support-agent contracts:

- `formal_price`
- `approved_price`
- `official_unit_price`
- `unit_price` unless the object is already a valid `BudgetOutputSnapshot` or internal budget line produced by the deterministic budget engine

## Quantity Field Rules

Use candidate-safe names before formal budget generation:

- `quantity_signal`
- `quantity_context_status`
- `area_sqm`
- `area_ping`
- `length_mm`
- `count`

Do not call placeholder or linked plan data `formal_quantity`.

## Requirement Context Fields

Canonical trace window fields:

- `owner_intent_id`
- `project_requirement_brief_id`
- `requirement_context_status`
- `requirement_source`
- `brief_placeholder`

## Plan Context Fields

Canonical trace window fields:

- `plan_quantity_facts_id`
- `plan_id`
- `svg_artifact_id`
- `plan_context_status`
- `plan_quantity_source`
- `plan_placeholder`

## Forbidden Naming Pattern

A field name must not imply formal authority unless the owning runtime has actually produced a verified formal object through the correct gate.

Blocked examples:

- `customer_quote_from_candidate`
- `approved_pricing_rule_from_raw`
- `budget_output_snapshot_from_raw_data`
- `formal_estimate_from_requirement_text`
