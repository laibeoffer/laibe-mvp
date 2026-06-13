# Plan Puzzle Repair PR Body and Reviewer Checklist

## PR Title

`[codex] Repair Plan Puzzle human-operable drawing workflow`

## Branch

`codex/plan-puzzle-test-repair-worktree-20260611`

## Latest pushed commit

`862c3d72dfdd7eff4a1b17a615ef35e1a6373b14`

## Summary

This branch repairs the Plan Puzzle / Plancraft+ preview floor-plan workbench toward a human-test usable drafting workflow.

Primary changes:

- Turns the layout into a left-to-right path workbench: file area, tool rail, canvas, contextual property panel.
- Improves full-Chinese primary UI wording and app-like tool rail behavior.
- Makes selected objects visibly foregrounded.
- Verifies wall drawing, door/window/opening placement, furniture/cabinet placement, drag, resize, material edit, delete, undo/redo, layer visibility, and candidate JSON export.
- Keeps `.pc` production export disabled.
- Keeps all Plan Puzzle output candidate-only, not production quantity or formal estimate data.
- Confirms the local SVG source path `Z:\08-Jacky\svg_blocks` has `1565` SVG files and that the existing 84 SVG candidate ledger paths still exist, while keeping SVG runtime include at `0`.

## Included Scope

Runtime files:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

Evidence / repair docs:

- `docs/plan_puzzle_repair/**`

## Not Included

These local files are intentionally not part of this PR scope:

- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/budget/PLANCRAFT_0_12_SHARED_TRUTH_INTAKE.md`
- `docs/budget/PLANCRAFT_0_12_PR_MERGE_ORDER_RECOMMENDATION.md`
- `docs/budget/PLAN_PUZZLE_TO_BUDGET_INTERFACE_CANDIDATE_CONTRACT.md`

## Reviewer Checklist

| Area | Expected disposition | Primary evidence |
|---|---|---|
| Workbench layout / Chinese UI | PASS_WITH_NOTES | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_56_PPT_LIKE_DIRECT_MANIPULATION_UI_REPAIR.md` |
| Core drawing flow | PASS | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_HUMAN_OPERABLE_REGRESSION.md` |
| Delete / undo / redo | PASS | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_REGRESSION.md` |
| Classification / persistence | PASS | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE.md` |
| Layer visibility data preservation | PASS | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_REGRESSION.md` |
| Completion matrix | READY_FOR_A2_REVIEW | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_54_COMPLETION_MATRIX_REFRESH.md` |
| Runtime diff risk | REVIEW_REQUIRED | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_57_RUNTIME_DIFF_RISK_AUDIT.md` |
| Patch split guide | READY | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_58_REVIEWER_RESPONSE_WATCH_AND_PATCH_SPLIT_GUIDE.md` |
| A2 evidence index | READY | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_59_A2_COMPLETION_EVIDENCE_INDEX.md` |
| Evidence freshness | PASS_WITH_BOM_NOTE | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_60_EVIDENCE_FRESHNESS_CHECK.md` |
| SVG source truth | CONFIRMED_WITH_RECONCILIATION | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_61_SVG_SOURCE_PATH_CONFIRMATION.md`, `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_62_SVG_SOURCE_RECONCILIATION.md` |

## Validation

Latest local checks:

- `node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`: PASS
- Forbidden runtime scan: PASS / no matches for `fetch(`, `XMLHttpRequest`, `OpenAI`, `apiKey`, `generateBudgetEstimate`, `BudgetEstimateLine`, `PricingRule`, `formalEstimateGuard` assignment, `payment`, `escrow`, `listing fee`, `Supabase`, `n8n`, or `LINE API`
- `git diff --check`: PASS with CRLF warnings only
- staged count before push: `0`

Browser evidence is recorded across repair loops under `docs/plan_puzzle_repair/**`, especially Loops 47, 51, 52, 53, and 56.

## Guard Boundaries

This branch does not:

- touch `plancraft/` or Plancraft core,
- touch budget runtime,
- call Budget Engine,
- modify `PricingRule` or `BudgetEstimateLine`,
- enable `generateBudgetEstimate`,
- alter `formalEstimateGuard`,
- connect DB / Supabase / payment / escrow / listing fee,
- connect AI API / image API / LINE / n8n,
- add `package.json`,
- add `node_modules`,
- enable formal quote / formal Excel / PDF,
- enable production `.pc` export,
- include SVG furniture assets in runtime.

## Remaining Explicit Non-completion

These are still not complete and must not be treated as production-ready:

- True OCR / visual dimension-line scale recognition.
- Direct PDF preview / calibration.
- SVG furniture package runtime include.
- Formal Plancraft `.pc` production export.
- Budget Engine / formal estimate stitching.
- Formal Excel / PDF output.
- AI / DB / payment / escrow / listing fee / LINE / n8n integration.

## Reviewer Decision Needed

Recommended disposition:

`REVIEW_REQUIRED_BEFORE_PR_READY`

The local workflow is human-test usable as candidate drafting, but the runtime diff is large and should be reviewed by grouped scope:

1. Workbench shell / Chinese UI.
2. Wall and opening core operations.
3. Furniture / cabinet direct manipulation.
4. Inspector / property panel.
5. Command history and safe deletion.
6. Layer visibility and export boundary.
7. SVG candidate boundary.

## PR Creation Note

`gh` is not available in the current shell PATH, so the branch was pushed and this PR body was prepared for manual GitHub PR creation.

GitHub PR creation URL:

`https://github.com/laibeoffer/laibe-mvp/pull/new/codex/plan-puzzle-test-repair-worktree-20260611`
