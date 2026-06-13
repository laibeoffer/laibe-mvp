# Plan Puzzle Human-Usable Reviewer Evidence Map

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- source instruction: `PLAN_PUZZLE_REPAIR_BLACKBOARD.md` currentSafeTask
- preparedAt: 2026-06-13 Asia/Taipei
- branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- baseline HEAD: `34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5`
- worktreePath: `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`
- globalBlackboardWrite: false
- merge / stage / push: false

## Reviewer Decision

`HUMAN_USABLE_REVIEWER_EVIDENCE_MAP_READY`

This packet maps the human-usable goal to evidence and reviewer checks. It is not a merge request and does not authorize SVG furniture package runtime inclusion, Plancraft production export, Budget Engine entry, or formal estimate generation.

## Core Function Evidence Map

| Core Function | Primary Evidence | Validation URL / Path | Console / Error Status | Reviewer Check | Status |
|---|---|---|---|---|---|
| Page load | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | `http://127.0.0.1:50361/code.html?validation=human-usable-goal-smoke` | console 0 | `planCanvas` present and title loaded | PASS |
| PNG import | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=human-usable-download-json` | console 0 / page 0 / 404 0 | `importSource.accepted=true`, `previewSupported=true`, `normalizedAs=underlay-image` | PASS |
| Scale calibration | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | same PNG/download validation path | console 0 | `scale.calibrated=true`, `pxPerMm=0.1`, `3,000 mm = 300 px` | PASS |
| Blank mm draft | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | in-app smoke path | console 0 | `start-blank-mm-draft` produces calibrated candidate-only workspace | PASS |
| Wall draw | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 1 evidence | in-app smoke path and Loop 1 packet | console 0 | two canvas clicks create wall DOM / hit target | PASS |
| Wall select / inspector | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | in-app smoke path | console 0 | selected wall card foregrounds ID, length, status, thickness, delete action | PASS |
| Wall delete | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | in-app smoke path | console 0 | inspector `delete-wall` removes selected wall and dependent openings | PASS_WITH_P2_NOTE |
| Door placement/edit | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 2 evidence | Loop 2 browser packet | console 0 | selected wall can receive door; width / offset / swing controls work | PASS |
| Window placement/edit | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 2 evidence | Loop 2 browser packet | console 0 | selected wall can receive window; width / offset controls work | PASS |
| Opening placement/delete | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 2 evidence | Loop 2 browser packet | console 0 | opening created, selected, deleted without removing unrelated objects | PASS |
| Furniture templates | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | in-app smoke path | console 0 | 10 parametric templates visible | PASS |
| Furniture placement | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 4B evidence | Loop 4B validation path | console 0 | canvas click creates candidate furniture object | PASS |
| Furniture drag | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 4B evidence | Loop 4B validation path | console 0 | object can be moved and remains selected/editable | PASS |
| Furniture resize | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 7 evidence | Loop 7 validation path | console 0 | resize handle exists and drag completes | PASS_WITH_NOTES |
| Furniture inspector edit | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | in-app smoke path | console 0 | width, depth, note, material fields update candidate data | PASS |
| Material apply | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 5 evidence | Loop 5 / in-app smoke paths | console 0 | `materialTags` includes selected material | PASS |
| Furniture delete | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | in-app smoke path | console 0 | selected furniture count decreases after delete | PASS |
| Layer visibility | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=human-usable-layer-visibility-v3` | console 0 / page 0 / 404 0 | walls and furniture can be hidden and restored through `Layer visibility` card | PASS |
| Candidate JSON preview | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 5 evidence | in-app smoke path | console 0 | preview parses and contains furniture/toolCatalog/layoutObjects candidate data | PASS_WITH_P2_NOTE |
| Actual draft JSON download | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | PNG/download validation path | console 0 / page 0 / 404 0 | downloaded JSON contains `importSource`, `scale`, `walls`, `wallGraph`, `nodeGraph`, `toolCatalogItems`, `layoutObjects`, `candidateExportBoundary` | PASS |
| `.pc` production boundary | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 6/8 packets | in-app smoke and Loop 6 path | console 0 | `.pc` controls remain disabled/mock-only | PASS |
| Guard boundaries | `PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md`; Loop 8 packet | docs + runtime scan | PASS | no Budget Engine, no formal estimate, no Plancraft core, no DB/payment/AI/API | PASS |

## Guard Matrix

| Boundary | Required State | Evidence | Status |
|---|---|---|---|
| Plancraft core | untouched | git scope and guard scan | PASS |
| `plancraft/` | untouched | git scope and guard scan | PASS |
| Budget Engine | not called / not modified | runtime scan and JSON boundary | PASS |
| PricingRule / BudgetEstimateLine | not introduced | downloaded JSON scan | PASS |
| formalEstimateGuard | not modified | runtime scan | PASS |
| generateBudgetEstimate | not called | runtime scan | PASS |
| formal Excel / PDF / quote | not produced | guard packet | PASS |
| DB / payment / escrow / listing fee | untouched | runtime scan | PASS |
| AI / image / LINE / n8n APIs | untouched | runtime scan | PASS |
| `package.json` / `node_modules` | not added or changed | git scope | PASS |
| `.pc` production export | disabled/mock-only | browser evidence | PASS |
| SVG furniture package runtime | blocked | Loop 4A packets | PASS |
| global blackboard | untouched | git diff check against global handoff files | PASS |

## Changed File Review Map

| File / Scope | Review Purpose | Evidence |
|---|---|---|
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html` | Workbench UI, controls, mock-only boundary wording | Loop 1-8 evidence |
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` | Runtime interaction, data model, layer visibility, candidate export | Human-usable smoke, Loop 1-8 evidence |
| `docs/plan_puzzle_repair/**` | Dedicated repair evidence only | this packet and supporting loop packets |

## Remaining P2 Notes

| Note | Blocking? | Recommended Disposition |
|---|---|---|
| Keyboard Delete for selected wall can be hardened | No | Inspector delete path passes; treat as optional focused polish |
| Candidate JSON Preview can be stale after later mutations until export is clicked again | No | Optional stale label or auto-refresh polish |

## Reviewer Checklist

1. Confirm the human-usable goal evidence covers all core functions listed in the objective.
2. Confirm console/page/bad-response error counts are 0 in fresh PNG/download and layer validations.
3. Confirm wall, opening, and furniture delete paths are not destructive outside the selected object/dependent openings.
4. Confirm furniture remains candidate-only with `budgetCandidate=true`, `productionReady=false`, and `notFormalEstimate=true`.
5. Confirm downloaded JSON has guard boundary fields and no formal estimate objects.
6. Confirm SVG candidates remain excluded from runtime.
7. Confirm P2 notes are acceptable as non-blocking UX hardening.

## Commander Options

| Option | Meaning | Allowed |
|---|---|---|
| ACCEPT_HUMAN_USABLE_CORE | Accept current core human-operable status with P2 notes | Yes |
| REQUEST_P2_HARDENING | Ask for keyboard Delete or stale-preview polish before review | Yes |
| CONTINUE_SVG_OVERLAY_QA | Continue Loop 4A SVG candidate QA without runtime include | Yes |
| MERGE | Merge PR/worktree changes | No |
| ENABLE_SVG_PACKAGE_RUNTIME | Include SVG candidates in runtime package | No |
| ENABLE_FORMAL_ESTIMATE | Send candidates to Budget Engine / formal quote | No |

## Decision

`A2_CURRENT_SAFE_TASK_COMPLETE`

The reviewer-facing evidence map is ready. If no reviewer / commander response arrives, the next safe task remains Loop 4A SVG response-watch / candidate-only disposition handling, with runtime SVG include still blocked.
