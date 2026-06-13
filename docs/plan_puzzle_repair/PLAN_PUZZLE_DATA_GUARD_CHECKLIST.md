# Plan Puzzle Data Guard Checklist

sourcePriority: GitHub / PR98 first; local files are secondary comparison only.
worktreePath: Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611
branch: codex/plan-puzzle-test-repair-worktree-20260611
HEAD: 34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5

## Scope

Checked runtime files:
- src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html
- src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js

## Forbidden Flow Scan

Search terms:
- fetch(
- XMLHttpRequest
- OpenAI / apiKey / api_key
- generateBudgetEstimate
- formalEstimateGuard
- BudgetEngine
- PricingRule
- BudgetEstimateLine
- Supabase
- payment / escrow / listing fee
- LINE API
- n8n

Result:
- No runtime call/import/connection found.
- `PricingRule` and `BudgetEstimateLine` appear only in an explicit boundary text: "No formal estimate / no Plancraft core production / no Budget Engine / no PricingRule / no BudgetEstimateLine."

## Candidate Boundary

- Plan Puzzle output remains candidate / draft / mock.
- Walls and openings are user-drawn plan data, not production budget input.
- Candidate JSON export may be enabled only as draft evidence.
- `.pc` and renderer preview remain candidate / not production.
- No Budget Engine call is allowed from this workstream.

## Guard Status

| Guard | Status | Evidence |
|---|---|---|
| Plancraft core untouched | PASS | No plancraft/ file in scope |
| Budget runtime untouched | PASS | No budget runtime file in scope |
| formalEstimateGuard unchanged | PASS | No match |
| Budget Engine not called | PASS | No runtime match |
| PricingRule not produced | PASS | Boundary text only |
| BudgetEstimateLine not produced | PASS | Boundary text only |
| DB/payment/API/AI/n8n untouched | PASS | No runtime match |
| package/node_modules untouched | PASS | No package scope |

## Next Guard Task

After Target Loop 1 patch, rerun this scan and confirm candidate draft JSON export does not introduce formal estimate or Budget Engine paths.
