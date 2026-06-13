# Plan Puzzle Target Loop 58 - Reviewer Response Watch and Patch Split Guide

## Summary

- workstream: Plancraft+ Plan Puzzle Repair
- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Loop 58 - reviewer response watch and patch split guide
- checkedAt: 2026-06-13 22:24:13 +08:00
- branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- HEAD: `34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5`
- result: `LOOP_58_PATCH_SPLIT_GUIDE_READY`
- runtimePatch: false
- stagedCount: 0

Loop 58 does not change Plan Puzzle runtime. It turns the large Loop 1-57 runtime delta into reviewer-sized groups so A2 / Reviewer can accept, request rework, or split PR scope without losing the human-operability evidence trail.

## Current Response Watch

| Watch Item | Status | Owner | Next if unchanged |
|---|---|---|---|
| Reviewer response for Loop 57 scope map | NO_RESPONSE_OBSERVED_LOCALLY | Reviewer / A2 | Use this split guide for review |
| A2 completion disposition | NOT_READY_FOR_COMPLETION_DECLARATION | A2 | Request review of candidate-only human-test usability |
| SVG furniture package inclusion | BLOCKED_BY_DESIGN | Reviewer / Commander | Keep runtime include `0` |
| Formal `.pc` production export | BLOCKED_BY_GUARD | Commander / Plancraft owner | Keep disabled |
| Budget adapter stitching | EXCLUDED_FROM_RUNTIME_REPAIR | Budget integration owner | Candidate contract only |

## Runtime Diff Split Proposal

The tracked runtime diff remains two files:

| File | Added | Removed |
|---|---:|---:|
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html` | 1290 | 420 |
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` | 2085 | 275 |

Recommended review groups:

| Group | Scope | Primary files | Evidence | Risk | Reviewer decision options |
|---|---|---|---|---|---|
| A. Workbench shell / Chinese UI | Top file area, left tool rail, canvas-first layout, right property panel, full Chinese primary labels | `code.html`, `plan-puzzle.js` labels | Loop 20, 21, 22, 28, 41, 45, 56 | Medium: visual polish can regress layout | ACCEPT / REQUEST_VISUAL_REWORK / SPLIT_AS_UI_ONLY |
| B. Wall and opening core operations | Draw wall, flat caps, wall status/type/thickness, door/window/opening add/edit/delete, opening-to-wall action | `plan-puzzle.js`, related inspector HTML | Loop 1, 2, 11, 20, 24, 47, 51, 52 | Medium: core drawing data touched | ACCEPT / REQUEST_OPENING_RETEST / SPLIT_CORE_TOOLS |
| C. Furniture / cabinet direct manipulation | Parametric item templates, place, select, drag, resize, material/note/dimension edit, delete | `plan-puzzle.js`, tool rail and inspector HTML | Loop 4B, 30, 42, 44, 47, 49, 50, 56 | Medium-high: user-visible interaction surface | ACCEPT_WITH_CANDIDATE_BOUNDARY / REQUEST_TARGETED_REWORK |
| D. Inspector / property panel | Contextual selected-object panel, tabs, human-readable labels, material select, diagnostics collapse | `code.html`, `plan-puzzle.js` inspector renderers | Loop 5, 7, 29, 42, 44, 56 | Medium: copy and field binding must remain intuitive | ACCEPT / REQUEST_COPY_REWORK / REQUEST_FIELD_BINDING_RETEST |
| E. Command history and safe deletion | Delete selected object, wall dependent opening deletion, undo/redo buttons, keyboard undo/redo | `plan-puzzle.js` | Loop 23, 40, 51 | Medium: state history can mask data loss | ACCEPT / REQUEST_HISTORY_RETEST |
| F. Layer visibility and export boundary | Layer hide/show persistence, candidate JSON, `.pc` disabled, guard labels | `plan-puzzle.js`, guard copy in HTML | Loop 30, 34, 35, 39, 40, 46, 47, 51, 52, 53, 54 | High if misused as production | ACCEPT_CANDIDATE_ONLY / REQUEST_GUARD_COPY_REWORK |
| G. SVG furniture candidate boundary | Docs-only candidate QA, zero runtime include, reviewer gate rows | `docs/plan_puzzle_repair/**` only | Loop 3, 4A batches, consolidation, reviewer template | High if assets are included too early | KEEP_BLOCKED / ACCEPT_CANDIDATE_ONLY / REQUEST_MORE_OVERLAY_QA |

## Minimal Rework Queue

If A2 / Reviewer rejects a group, use the smallest matching queue item:

| Trigger | Repair owner | Minimal next action | Required evidence |
|---|---|---|---|
| UI feels non-professional or too text-heavy | B_PLAN_PUZZLE_REPAIR_COMMANDER + Inspector / Status UX Builder | Patch only labels, icon sizing, rail density, or inspector copy | Screenshot at 1508x709 and small viewport, console `0` |
| Selection feedback unclear | Canvas / Import Core Builder | Patch selected stroke / outline / handles only | Browser screenshot showing selected wall/opening/furniture |
| Wall/opening behavior regresses | Door / Window / Opening Builder | Re-run Loop 2/51/52 subset and patch only proven failing handler | Export JSON before/after and console `0` |
| Furniture drag/resize/material regresses | Furniture / Cabinet Builder | Re-run Loop 4B/47/49 subset and patch only direct-manipulation handler | Screenshot + candidate JSON with furniture candidate |
| Inspector field wording/binding regresses | Inspector / Material Builder | Patch affected field label or handler only | DOM field evidence + exported JSON |
| Candidate export or guard wording is unclear | Data Guard | Patch guard copy / candidate metadata only; no Budget Engine wiring | Forbidden scan + candidate JSON |
| Runtime diff must be split before PR | Commander / A2 | Split review disposition into UI, tools, inspector, export/guard groups | This guide plus Loop 57 scope map |

## Non-negotiable Boundaries

- Do not include SVG furniture candidates in runtime in this worktree.
- Do not enable formal `.pc` production export.
- Do not connect Budget Engine, `generateBudgetEstimate`, `PricingRule`, or `BudgetEstimateLine`.
- Do not connect DB, payment, escrow, listing fee, AI API, image API, LINE, or n8n.
- Do not add `package.json`, `node_modules`, or run `npm install`.
- Do not stage, push, merge, deploy, reset, clean, or delete.

## Guard Status

| Guard | Result |
|---|---|
| Runtime patch in Loop 58 | NO |
| Staged files | 0 |
| Plancraft core touched | NO |
| Budget runtime touched | NO |
| Package / node_modules added | NO |
| Production estimate enabled | NO |

The last concrete guard run remains Loop 57:

- `node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`: PASS.
- forbidden scan: PASS, no matches.
- `git diff --check`: PASS with CRLF warnings only.

## Reviewer Packet Index

| Need | Primary packet |
|---|---|
| Final scope map | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_57_RUNTIME_DIFF_RISK_AUDIT.md` |
| UI/direct manipulation evidence | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_56_PPT_LIKE_DIRECT_MANIPULATION_UI_REPAIR.md` |
| Completion matrix | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_54_COMPLETION_MATRIX_REFRESH.md` |
| Full human-operable regression | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_HUMAN_OPERABLE_REGRESSION.md` |
| Delete / undo / redo | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_REGRESSION.md` |
| Classification / persistence | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE.md` |
| Layer visibility | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_REGRESSION.md` |
| SVG candidate package boundary | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4A_REVIEWER_RESPONSE_TEMPLATE.md` |

## Decision

`REVIEWER_RESPONSE_WATCH_CONTINUES_WITH_PATCH_SPLIT_GUIDE_READY`

The Plan Puzzle core candidate drafting workflow has browser evidence for human-test usability, but completion / PR-readiness remains unproven until A2 / Reviewer reviews the grouped runtime scope.

## Next Automatic Task

Loop 59 - execute targeted rework only if A2 / Reviewer identifies a specific rejected group.

If no response arrives, continue safe work by preparing a one-page A2 completion evidence index that references Loop 47, Loop 51, Loop 52, Loop 53, Loop 56, Loop 57, and this Loop 58 packet without changing runtime.
