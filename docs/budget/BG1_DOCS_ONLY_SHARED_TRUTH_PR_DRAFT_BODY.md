# BG1 Docs-Only Shared Truth PR Draft Body

Updated: `2026-06-14`

Status: `DRAFT_BODY_READY_NO_EXECUTION`

This is a draft body only. It is not submitted and does not open a PR.

## Proposed PR Title

`BG1 budget docs-only shared truth: runtime drift evidence and repair design`

## Proposed PR Body

### Summary

This PR promotes BG1 local budget-system evidence into GitHub shared-truth review scope.

It is docs-only. It does not modify runtime code, does not run Budget Engine, does not run harness, and does not produce formal estimate, production quantity, formal quote, Excel, or PDF.

### What Changed

- Adds BG1 read-only runtime type/source evidence packet.
- Adds runtime repair decision packet.
- Adds local evidence shared-truth inventory.
- Adds docs-only minimal runtime repair design.
- Adds candidate-only / dry-run-only minimal repair contract.
- Adds future `budget-generator.ts` skeleton design, without creating the file.
- Adds future `generateBudgetEstimate` guard design, without creating the function.
- Adds future `BudgetEstimateBlockedError` design, without creating the class.
- Adds no-production-quantity and no-formal-estimate guard designs.
- Adds PR `#100` runtime adapter prohibition note.
- Updates BG1 next action and handoff docs.

### What Is Explicitly Not Changed

- No `src/**` changes.
- No runtime implementation.
- No Budget Engine execution.
- No harness execution.
- No `budget-generator.ts`.
- No `generateBudgetEstimate`.
- No `BudgetEstimateBlockedError`.
- No `BudgetEstimateLine`.
- No `PricingRule`.
- No `preview-floor-plan-adapter.ts`.
- No Renderer production output.
- No Excel / PDF.
- No DB / Supabase / API / AI / RAG / payment / LINE / n8n.

### Issue #89

Issue `#89` remains the harness execution gate. This PR does not authorize or start harness execution.

### PR #100 Boundary

PR `#100` remains docs-only active candidate export head. It is not a production adapter, formal budget schema, production quantity source, or formal estimate contract.

### Review Notes

Review should verify:

- docs-only scope;
- no `src/**` diff;
- no staged runtime file;
- no formal estimate / production quantity claim;
- no PR `#100` embedded script runtime adapter wiring;
- whether candidate file list should be narrowed before merge.

### Next After PR

After a docs-only PR is reviewed and accepted, BG1 may request the next no-runtime decision:

`BG1_PREPARE_RUNTIME_SKELETON_PATCH_PLAN_NO_EXECUTION`

This would still be a patch plan only unless Commander separately authorizes implementation.

