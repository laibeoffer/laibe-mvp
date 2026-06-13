# Plan Puzzle Target Loop 57 - Runtime Diff Risk Audit and Reviewer-ready Scope Map

## Summary

- workstream: Plancraft+ Plan Puzzle Repair
- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Loop 57 - runtime diff risk audit and reviewer-ready scope map
- checkedAt: 2026-06-13 22:20:21 +08:00
- branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- HEAD: `34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5`
- result: `LOOP_57_REVIEWER_SCOPE_MAP_READY`
- stagedCount: 0

## Runtime Diff Summary

The tracked runtime diff is confined to the Plan Puzzle preview floor-plan files.

| File | Git status | Added | Removed | Scope | Risk |
|---|---|---:|---:|---|---|
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html` | M | 1290 | 420 | Workbench layout, icon rail, tool wording, responsive shell, inspector surface, visual affordance CSS | Medium: large UI surface diff; needs reviewer visual check |
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` | M | 2085 | 275 | Tool wiring, candidate object operations, inspector render, export preview, direct manipulation support, guard labels | Medium-high: core Plan Puzzle runtime touched; browser evidence exists but reviewer should inspect data-flow boundaries |

`git diff --stat` for tracked runtime files:

```txt
code.html      | 1710 ++++++++++----
plan-puzzle.js | 2360 +++++++++++++++++---
2 files changed, 3375 insertions(+), 695 deletions(-)
```

## Evidence Inventory

Repair evidence currently lives under `docs/plan_puzzle_repair/`.

| Evidence type | Count |
|---|---:|
| Markdown packets | 92 |
| Browser screenshots | 61 |
| JSON results / exports | 96 |
| Total evidence files | 249 |

## Reviewer Scope Map

| Area | Files | Evidence | Reviewer focus |
|---|---|---|---|
| Import / blank draft / scale | `code.html`, `plan-puzzle.js` | Loop 1, 10, 31, 46, 47 | Confirm PNG import and filename scale suggestion remain candidate-only; PDF direct preview remains excluded |
| Wall drawing / wall classification | `code.html`, `plan-puzzle.js` | Loop 20, 26, 44, 47, 52, 56 | Confirm wall drawing, selected-wall highlight, wall status/type/thickness persistence, flat wall caps |
| Door / window / opening | `code.html`, `plan-puzzle.js` | Loop 2, 11, 36, 47, 51, 52 | Confirm opening placement / width / offset / swing / delete and selected inspector fields |
| Furniture / cabinet direct manipulation | `code.html`, `plan-puzzle.js` | Loop 4B, 30, 42, 44, 47, 49, 56 | Confirm place, drag, resize, width/depth/material/note edit, delete, JSON candidate export |
| Icon rail / PPT-like UX | `code.html`, `plan-puzzle.js` | Loop 28, 41, 45, 56 | Confirm human-readable labels, app-like icon rail, no confusing `狀態區` / `節點` / `加入圖面` primary wording |
| Inspector / property panel | `code.html`, `plan-puzzle.js` | Loop 29, 42, 44, 56 | Confirm right side behaves as contextual property panel, not a status report |
| Delete / undo / redo | `plan-puzzle.js` | Loop 23, 40, 51 | Confirm object-specific delete, undo, redo, and dependent opening restore behavior |
| Layer visibility | `code.html`, `plan-puzzle.js` | Loop 39, 40, 53 | Confirm hide/show is visual only and does not remove candidate data |
| Candidate JSON export | `plan-puzzle.js` | Loop 30, 34, 35, 39, 40, 44, 47, 51-53 | Confirm export contains candidate walls/openings/zones/furniture/layoutObjects and remains non-production |
| Guard boundaries | `code.html`, `plan-puzzle.js` | Loop 46 guard result, Loop 54, Loop 56 | Confirm no Budget Engine, no formal estimate, no formal `.pc`, no AI/DB/payment/LINE/n8n |

## Risk Register

| Risk | Level | Evidence / Mitigation | Reviewer action |
|---|---|---|---|
| Runtime diff is large | Medium-high | 2 runtime files only, 249 local evidence files, repeated browser smoke | Review scoped chunks by function area rather than line-by-line chronology |
| UI wording changed after many loops | Medium | Loop 56 checks visible wording and console 0 | Confirm no new non-Chinese / confusing primary labels remain |
| Direct manipulation behavior could regress on narrow viewports | Medium | Loop 49 and Loop 50 viewport packets | Spot-check 1280x620 and 430x820 after review if patch changes continue |
| Candidate JSON could be mistaken for production quantity | High if misused | Guard labels and export evidence state `productionReady=false`, not formal estimate | Keep reviewer note: candidate-only; do not wire to Budget Engine yet |
| SVG furniture package could be incorrectly included | High if merged into runtime | Loop 4A keeps 0 runtime include; SVG package remains blocked | Do not include SVG assets until candidate disposition is accepted |
| Formal `.pc` export could be misunderstood | High if exposed as production | `.pc` button remains disabled / mock-only | Keep disabled until separate Plancraft integration decision |

## Guard Status

| Guard | Result |
|---|---|
| `node --check plan-puzzle.js` | PASS |
| Forbidden scan for fetch/XMLHttpRequest/OpenAI/apiKey/generateBudgetEstimate/BudgetEstimateLine/PricingRule/formalEstimateGuard assignment/payment/escrow/listing fee/Supabase/n8n/LINE API | PASS, no matches (`rg` exit 1) |
| `git diff --check` | PASS with CRLF warnings only |
| staged files | 0 |
| push / merge / PR / deploy | NOT DONE |
| Plancraft core touched | NO |
| budget runtime touched | NO |
| package / node_modules added | NO |

## Remaining Explicit Non-completion

These are intentionally not complete and must not be described as production-ready:

- True OCR or visual dimension-line auto-scale.
- Direct PDF preview / calibration.
- SVG furniture package runtime include.
- Formal Plancraft `.pc` production export.
- Budget Engine / formal estimate stitching.
- Formal Excel / PDF output.
- AI / DB / payment / escrow / listing fee / LINE / n8n integration.

## Reviewer Recommendation

`REVIEW_REQUIRED_BEFORE_PR_READY`

Reason:

- The work is scoped to Plan Puzzle runtime files and dedicated repair docs, but the runtime diff is large.
- Browser evidence supports human-test usability for the core candidate drafting workflow.
- Guard evidence supports candidate-only boundaries.
- Reviewer should inspect the changed runtime surface before any A2 PR-ready or merge-ready decision.

## Commander / A2 Decision Needed

`YES_FOR_FINAL_DISPOSITION`

A2 should decide whether this package is:

- acceptable for reviewer handoff,
- needs a smaller scoped patch split,
- or needs targeted rework before PR preparation.

## Next Automatic Task

Loop 58 - Reviewer response watch / targeted rework queue.

If no reviewer response arrives, continue safe work by preparing a smaller patch-splitting guide that groups the runtime diff into UI shell, tool operations, inspector, export, and guard labels.
