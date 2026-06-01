# E2E Fixture Plan

## Objective

Define the minimum dry-run E2E fixture set used to accept a future Budget Integration Harness without modifying or running production implementation code.

The fixture verifies data boundaries across Quote Factory, Raw Candidate, MethodSpec, Budget Engine, and Output Documents. It is a QA contract only.

## Required Inputs

| Input | Required Fixture | Authority | Dry-Run Rule |
|---|---|---|---|
| Quote Factory cloud-ready export package | cloud export package metadata and reviewed price-source references | Quote Factory only | may provide reviewed references, never direct formal line prices |
| Raw Candidate HandoffProposal | proposed source candidates with review gate metadata | Raw Candidate warehouse | must enter review gate before any downstream use |
| MethodSpec approved seed / rule catalog | approved deterministic rule IDs and catalog version | MethodSpec warehouse | only approved rules may enter Budget Engine |
| Placeholder ProjectRequirementBrief | normalized owner requirement summary | dry-run placeholder | may inform assumptions and warnings only |
| Placeholder PlanPuzzleQuantityFacts | normalized plan facts | dry-run placeholder | may exercise formulas only, not formal quantities |

## Minimum E2E Flow

1. Load all dry-run fixtures with `dry_run_only: true`.
2. Reject raw evidence if it attempts to directly populate budget preview rows.
3. Route every `HandoffProposal` through `review_gate.status`.
4. Allow only MethodSpec rules with `approval_status: approved`.
5. Keep Placeholder ProjectRequirementBrief and Placeholder PlanPuzzleQuantityFacts in dry-run mode.
6. Produce an expected `BudgetOutputSnapshot` contract with redacted price fields.
7. Allow Output Documents to read only the snapshot contract.
8. Produce customer preview, internal trace preview, warning summary, provenance summary, and forbidden flow report.

## Expected Outputs

- customer preview
- internal trace preview
- warning summary
- provenance summary
- forbidden flow report

## Fixture Groups

| Group | Purpose | Example File |
|---|---|---|
| requirement placeholder | exercise requirement assumptions and owner text boundary | `examples/placeholder_project_requirement_brief.json` |
| plan facts placeholder | exercise plan-derived quantity facts without formal authority | `examples/placeholder_plan_quantity_facts.json` |
| expected snapshot | define target output shape and blocked price behavior | `examples/expected_budget_output_snapshot.sample.json` |
| forbidden flows | define negative cases that must fail closed | `examples/forbidden_flow_test_cases.sample.json` |

## Pass Criteria

The dry-run E2E acceptance passes only when:
- no raw evidence enters a budget row directly
- no `HandoffProposal` appears in `customer_view`
- no unapproved MethodSpec rule is used
- no placeholder input is promoted to production authority
- no formal price or formal quote is generated
- Output Documents read only `BudgetOutputSnapshot`
- every forbidden flow is blocked with a traceable reason

## Fail Criteria

The dry-run E2E acceptance fails if any implementation path creates formal price, formal quote, formal BudgetEstimateLine, production renderer output, payment interaction, AI price, DB write, n8n run, webhook call, or direct raw-to-budget flow.
