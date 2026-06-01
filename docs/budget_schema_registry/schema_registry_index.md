# Budget Schema Registry Index

Status: `ACTIVE_INITIALIZATION`

Functional acceptance: `NOT_APPLICABLE_DOCS_ONLY`

This index lists canonical budget-system data contracts for cross-agent integration planning. It is documentation-only and does not create runtime schemas, migrations, pricing rules, or formal estimate authority.

## Universal Contract Header

Every cross-agent contract should carry these fields when practical:

| Field | Required | Purpose |
|---|---:|---|
| `schema_name` | Yes | Canonical contract name. |
| `schema_version` | Yes | Version such as `0.1.0-docs`. |
| `contract_status` | Yes | `placeholder`, `linked`, `verified`, or `unavailable`. |
| `source_agent` | Yes | Agent or workstream that produced the object. |
| `source_ref` | Yes | Source id, package id, issue, PR, or artifact ref. |
| `created_at` | Recommended | ISO-8601 timestamp. |
| `updated_at` | Recommended | ISO-8601 timestamp. |
| `warnings` | Recommended | Human-readable safety warnings. |
| `forbidden_use` | Recommended | Uses the receiver must not perform. |

## Registered Contracts

| Contract | Owner / Source | Receiver | Current Status | Formal Authority |
|---|---|---|---|---|
| `OwnerIntent` | Owner Guide | Project brief / budget intake planning | placeholder contract | No |
| `ProjectRequirementBrief` | Owner Guide / requirement intake | Plan Puzzle, budget planning, output trace window | placeholder contract | No |
| `PlanPuzzleQuantityFacts` | Plan Puzzle Guide / plan-puzzle | budget input planning, output trace window | placeholder contract | No |
| `FileManifest` | Upload / source packaging proposal | workflow / evidence packets | placeholder contract | No |
| `QuoteFactoryExportPackage` | Quote Factory | raw candidate / integration review | linked proposal evidence | No |
| `PriceObservation` | Quote Factory / raw source | PriceRange / review queue | candidate evidence | No |
| `PriceRange` | Quote Factory | review decision / raw candidate | candidate evidence | No |
| `RawCandidate` | Raw Candidate Warehouse | review queue / handoff proposal | candidate evidence | No |
| `HandoffProposal` | Raw Candidate Warehouse | MethodSpec / reviewer / integration officer | proposal only | No |
| `MethodSpecCatalog` | MethodSpec Warehouse | deterministic budget engine | approved rules/specs only | No direct price authority |
| `PricingRuleReference` | MethodSpec / pricing governance | budget engine planning | reference only in this registry | No |
| `BudgetInputBundle` | Integration planning | budget engine dry-run entry | placeholder planning | No |
| `BudgetRunPlan` | Budget engine entry planning | reviewers / integration officer | placeholder planning | No |
| `BudgetOutputSnapshot` | Budget output logistics | renderer / output documents | snapshot boundary | Contains generated result; renderer input only |
| `ReviewDecision` | Reviewer / integration officer | upstream workstream | decision record | No price authority by itself |
| `FunctionalAcceptanceReport` | owning agent / reviewer | Deputy Commander / integration officer | evidence packet | No runtime authority |
| `RuntimeEvidenceReport` | owning agent | reviewer / commander | evidence packet | No runtime authority |
| `FinalCompletionPacket` | owning agent | commander / integration officer | closeout evidence | No runtime authority |

## Example Files

- `examples/owner_intent.schema.example.json`
- `examples/project_requirement_brief.schema.example.json`
- `examples/plan_puzzle_quantity_facts.schema.example.json`
- `examples/file_manifest.schema.example.json`
- `examples/quote_factory_export_package.schema.example.json`
- `examples/raw_candidate_handoff.schema.example.json`
- `examples/budget_input_bundle.schema.example.json`
- `examples/budget_run_plan.schema.example.json`
- `examples/budget_output_snapshot.schema.example.json`
- `examples/functional_acceptance_report.schema.example.json`

## Integration Rule

A contract marked `placeholder` or `linked` may support dry-run planning and traceability only. It must not be promoted to formal estimate input, formal quantity, formal price, renderer source, or customer-facing quote authority.
