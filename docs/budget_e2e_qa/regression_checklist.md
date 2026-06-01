# Regression Checklist

## Repository Scope

- [ ] Only `docs/budget_e2e_qa/` and approved blackboard / handoff docs changed.
- [ ] No `src/` files changed.
- [ ] No `app/` files changed.
- [ ] No Budget Engine implementation changed.
- [ ] No PricingRule implementation changed.
- [ ] No BudgetEstimateLine implementation changed.
- [ ] No MethodSpec implementation changed.
- [ ] No Raw Candidate implementation changed.
- [ ] No Output Documents implementation changed.

## Dry-Run Boundary

- [ ] Every fixture has `dry_run_only: true`.
- [ ] No fixture contains a formal price.
- [ ] No fixture contains a formal quote number.
- [ ] No fixture requires production DB writes.
- [ ] No fixture requires webhook, n8n, payment, AI API, or Supabase.

## Data Flow Boundary

- [ ] Raw evidence does not directly create a budget row.
- [ ] HandoffProposal enters review gate.
- [ ] Only approved MethodSpec rules can be accepted.
- [ ] Placeholder ProjectRequirementBrief remains dry-run only.
- [ ] Placeholder PlanPuzzleQuantityFacts remains dry-run only.
- [ ] Budget Engine fixture step produces only `BudgetOutputSnapshot` contract.
- [ ] Output Documents read only the snapshot.

## Output Boundary

- [ ] Customer preview hides internal handoff and raw evidence payloads.
- [ ] Internal trace preview records provenance and blocked reasons.
- [ ] Warning summary reports dry-run placeholders and missing formal authority.
- [ ] Provenance summary identifies each source warehouse separately.
- [ ] Forbidden flow report contains every required negative case.

## Final Gate

- [ ] Acceptance matrix complete.
- [ ] Forbidden flow checklist complete.
- [ ] Expected snapshot contract complete.
- [ ] Final QA report filled.
- [ ] Reviewer requested before final integration harness acceptance.
