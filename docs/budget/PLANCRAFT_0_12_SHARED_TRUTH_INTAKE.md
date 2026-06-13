# Plancraft+ 0.12 Shared Truth Intake

Date: 2026-06-13 Asia/Taipei

Workstream: Plan Puzzle / Plancraft+ shared truth intake for future budget stitching.

Scope: PR, file, schema, and shared truth inventory only. This document does not modify budget runtime and does not authorize formal budget generation.

## 1. Sources Checked

GitHub repository:

- `laibeoffer/laibe-mvp`
- Open PRs checked through GitHub REST API on 2026-06-13.

Local worktree:

- `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`
- Branch observed earlier in this intake: `codex/plan-puzzle-test-repair-worktree-20260611`
- Local files checked:
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
  - `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `src/lib/budget/types.ts`
  - `docs/budget/plancraft-plus-production-adapter-design.md`
  - `docs/NEXT_CODEX_HANDOFF.md`

Requested local files not found in this worktree:

- `docs/budget/BUDGET_STITCHING_CONTROL_MANIFEST.md`
- `docs/budget/BUDGET_WORKSTREAM_ARTIFACT_REGISTRY.md`
- `docs/budget/BUDGET_INTERFACE_GATE_MAP.md`
- `docs/budget/BUDGET_RUNTIME_DOCS_DRIFT_AUDIT.md`
- `docs/budget/BUDGET_NEXT_STITCHING_ACTIONS.md`

## 2. Open PR Inventory

| PR | Title | Head | Base | Draft | Head SHA | Shared Truth Relevance |
|---:|---|---|---|---|---|---|
| #25 | Add Plancraft+ zone area boundary refinement | `plancraft/zone-area-boundary-refinement` | `main` | No | `037565e1da0bcde3e0a86f18f052511e59c8cbae` | Older zone / area / boundary work; relevant to candidate walls / openings / zones, but likely superseded by later Plan Puzzle chain. |
| #50 | Add Plan Puzzle Guide runtime mock and acceptance packet | `codex/plan-puzzle-guide-init-main-sync` | `main` | Yes | `ccd57fe36668504d608b40448bb4794636ab093c` | Guide mock context only; includes guide data and placeholder quantity facts but is not budget shared truth. |
| #54 | Sync Plan Puzzle UI IA alignment 0.12 handoff | `codex/plan-puzzle-ui-ia-alignment-0-12` | `main` | Yes | `f7384709f63fbf0cf1cd854dc80af8bce0fb5977` | Best 0.12 UI / IA handoff baseline. Not sufficient as production budget schema. |
| #56 | Productize Plan Puzzle status area 0.14 | `codex/plan-puzzle-status-area-productization-0-14` | `main` | Yes | `46b1fa67045532edb7512887957e0fd6a1529dcf` | Later UI status area productization; may affect operator evidence, not budget truth by itself. |
| #67 | Polish Plan Puzzle compact workspace 0.15.1 | `codex/plan-puzzle-compact-workspace-polish-0-15-1` | `codex/plan-puzzle-status-area-productization-0-14` | Yes | `fb926cd10f56a490f46deee216d5ec7c3d1d8062` | UI / workspace polish; chained on #56. |
| #68 | Repair Plan Puzzle intuitive workspace 0.15.2 | `codex/plan-puzzle-intuitive-workspace-repair-0-15-2` | `codex/plan-puzzle-compact-workspace-polish-0-15-1` | Yes | `3bb13b49eed58419122db7b1a442ed80723b59c6` | Parallel UI repair; conflicts or overlaps with #69 path. |
| #69 | Repair Plan Puzzle one-screen drawing workbench 0.16 | `codex/plan-puzzle-one-screen-drawing-workbench-0-16` | `codex/plan-puzzle-compact-workspace-polish-0-15-1` | Yes | `df781eadec7425ceac548938661331253dd15073` | Active UI workbench draft in the 0.16 path; likely supersedes parts of #68. |
| #76 | Wire Plan Puzzle canvas tools 0.16.1 | `codex/plan-puzzle-canvas-tool-wiring-0-16-1` | `codex/plan-puzzle-one-screen-drawing-workbench-0-16` | Yes | `3aafbe59fa5edb42d5cc18c77bb1f8a6a9ae548b` | Runtime tool wiring draft; most relevant to candidate draft JSON before A1/A2 integration work. |
| #98 | A1 GitHub clean integration round 1 | `a1/github-clean-integration-round-1-20260611` | `main` | Yes | `34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5` | Integration package touching preview route `code.html`; not a 0.12-only baseline. |
| #100 | [A1] GitHub clean integration round 2 package | `a1/github-clean-integration-round-2-20260611` | `a1/github-clean-integration-round-1-20260611` | Yes | `41959ee1f183ceb90226db98f47a642c72036c0a` | Integration package touching `code.html` and `plan-puzzle.js`; candidate shared runtime only after review. |

GitHub REST returned 15 open PRs in this repository during this intake. The table above lists the PRs with direct Plan Puzzle / Plancraft+ shared-truth relevance.

Other open PRs checked but excluded from Plan Puzzle / Plancraft+ 0.12 budget shared-truth candidacy:

| PR | Title | Reason Excluded From Shared Truth |
|---:|---|---|
| #33 | Register visual simulation agent completion status | Visual simulation governance / status, not Plan Puzzle draft JSON schema. |
| #52 | Report visual simulation progress on compact blackboard | Visual simulation progress reporting, not Plan Puzzle draft JSON schema. |
| #53 | Add Owner Guide Agent contract | Owner Guide / requirement flow, not Plancraft+ geometry shared truth. |
| #77 | [codex] Initialize AI PCM department governance | AI PCM governance, not Plan Puzzle draft JSON schema. |
| #86 | Approve budget closeout standby on blackboard | Budget closeout governance, not Plan Puzzle runtime schema. |

## 3. UI / IA PRs

The following PRs are UI / IA or interaction shell oriented:

- #54: 0.12 UI IA handoff baseline.
- #56: 0.14 status area productization.
- #67: 0.15.1 compact workspace polish.
- #68: 0.15.2 intuitive workspace repair.
- #69: 0.16 one-screen drawing workbench.

Budget impact:

- These PRs can define operator workflow, visible layers, tool availability, labels, and acceptance evidence.
- They must not be treated as budget schema by themselves.
- They may contain runtime files, but the budget system should only rely on reviewed exported draft JSON fields, not UI labels.

## 4. PRs That May Affect Draft JSON Schema

The following PRs or branches may affect exported draft data:

- #25: zone / area / boundary refinement affects `zones`, boundary metadata, and possibly wall / opening contract assumptions.
- #50: Guide mock adds `guide`, `guideLog`, `requirementNotes`, `guideSummary`, and `PlanPuzzleQuantityFacts`; this is context-only and not a budget quantity source.
- #76: canvas tool wiring affects walls, openings, zones, and candidate export behavior.
- #100 / current A1 integration chain: touches `plan-puzzle.js`; local repair work also adds or hardens furniture, layout object, material, export preview, and candidate boundary behavior.

Local observed draft payload fields in `plan-puzzle.js` include:

- `product`
- `version`
- `unit`
- `scale`
- `underlay`
- `walls`
- `wallGraph`
- `nodeGraph`
- `openings`
- `zones`
- `furniture`
- `toolCatalogItems`
- `layoutObjects`
- `candidateExportBoundary`
- `plancraftBridge`

Current local export boundary explicitly keeps:

- `formalEstimate: false`
- `budgetEngineCalled: false`
- `productionReady: false`

## 5. Rooms / Zones / Walls / Openings / Furniture / Objects Impact

| Data Area | Current Local Source | Budget Shared Truth Status |
|---|---|---|
| Rooms | Not formalized as production room schema in local Plan Puzzle export. Zones may be candidate space input. | Candidate only. Needs room / space taxonomy review. |
| Zones | `project.zones`, boundary metadata, polygon, `boundaryStatus`, `boundaryIssues`. | Candidate only. Current adapter can map zones to `SpaceCandidate` when Plancraft+ draft shape is valid. |
| Walls | `project.walls`, `nodeGraph.edges`, wall graph / node graph rebuild. | Candidate only. Current adapter maps node graph edges to wall quantity candidates, not production quantity. |
| Openings | `project.openings` with `kind`, `edgeId`, `offset`, `width`, `swing`, height fields when present. | Candidate only. Current adapter maps openings to quantity candidates with warnings. |
| Furniture | `project.furniture`, parametric furniture candidates. | Unsupported for production adapter. Candidate layout context only. |
| Layout objects | `layoutObjects` derived from furniture candidates. | Candidate only. Not production-ready and not formal quantity. |
| Unsupported objects | Not yet a stable first-class export section in local runtime; should be part of future candidate contract. | Required in candidate interface contract. |
| Warnings | Adapter creates warnings and unsupported lists; local Plan Puzzle export has `candidateExportBoundary`. | Warnings must remain blocking / review input before production. |

## 6. Visual / Operation PRs That Should Not Affect Budget

The following should not be used by budget adapter as shared truth unless a separate reviewed exported-data contract says otherwise:

- Pure UI layout changes in #54, #56, #67, #68, #69.
- Plan Puzzle Guide mock in #50.
- Visual simulation or style-image candidate PRs.
- Renderer preview, SVG preview, `.pc` converter output, and diagnostic UI panels.
- SVG furniture candidate package before reviewer / commander acceptance and package integration authorization.

## 7. Candidate Baseline Decision

Recommended 0.12 handoff baseline:

- PR #54 / commit `f7384709f63fbf0cf1cd854dc80af8bce0fb5977`

Reason:

- It is the explicit 0.12 UI IA alignment handoff.
- It should remain the reference baseline for the UI / IA starting point.
- It is not sufficient as a production budget dependency.

Recommended budget shared truth source:

- Do not rely directly on any open draft PR as production truth.
- Use `docs/budget/PLAN_PUZZLE_TO_BUDGET_INTERFACE_CANDIDATE_CONTRACT.md` as the candidate-only interface until a reviewer-approved production adapter contract exists.
- Treat #76 / #98 / #100 / current repair worktree as runtime evidence candidates that need review and consolidation before budget stitching.

## 8. PRs That Need Merge / Rebase / Disposition First

Likely dependency chain if the original 0.12-to-0.16 PR path is preserved:

1. #54 as 0.12 IA handoff baseline.
2. #56 status area productization.
3. #67 compact workspace polish.
4. #69 one-screen drawing workbench.
5. #76 canvas tool wiring.

Potentially superseded or conflicting:

- #25 likely needs closeout or re-review because later Plan Puzzle chain changes the same preview files and schema assumptions.
- #68 appears parallel to #69 and should be dispositioned before merging both.
- #50 is separate guide mock context and should not block the Plan Puzzle shared truth chain.
- #98 and #100 are newer integration packages, but they should not be merged without resolving how they replace or incorporate #54 / #56 / #67 / #69 / #76.

## 9. PRs Not Safe For Budget Adapter Reliance

Budget adapter must not rely on these as production inputs:

- #50 guide mock and PlanPuzzleQuantityFacts placeholders.
- #54 UI IA baseline by itself.
- #56 / #67 / #68 / #69 UI / UX drafts by themselves.
- #76 until reviewer confirms the exported draft JSON contract.
- #98 / #100 until A1/A2 integration review confirms they are the consolidated head.
- Any SVG furniture candidate set until overlay QA and package integration are separately authorized.

## 10. Formal Draft JSON Schema Status

Formal draft JSON schema found: No.

Observed:

- Runtime exports a concrete candidate payload.
- `src/lib/budget/types.ts` defines adapter spike types for `PlancraftPlusDraft`, candidates, warnings, and formal estimate guard.
- `docs/budget/plancraft-plus-production-adapter-design.md` describes future production adapter gates.

Missing:

- A stable schema file with versioned Plan Puzzle export contract.
- A reviewed production-ready mapping from Plan Puzzle candidate fields to budget quantities.
- Furniture / layout object production contract.
- Reviewer gate confirming when candidate facts may become production facts.

## 11. Budget Stitching Intake Result

Budget adapter stitching can start only as candidate-contract stitching.

Allowed:

- Build tests or docs around candidate `rooms`, `zones`, `walls`, `openings`, `layout_objects`, `unsupported_objects`, `warnings`, and `source_metadata`.
- Produce candidate `SpaceCandidate`, candidate `QuantityFact`, candidate layout object warnings, and unsupported records.
- Keep `production_ready: false`.

Not allowed:

- Direct call to `generateBudgetEstimate`.
- Direct production `BudgetEstimateLine`.
- Formal Excel / PDF.
- Formal quote or price output.
- Treat candidate draft JSON as production quantity.

## 12. Current Blockers

| Blocker | Owner | Required Next Action |
|---|---|---|
| No reviewed formal Plan Puzzle draft JSON schema | Plan Puzzle shared truth owner + Reviewer | Accept candidate contract or request schema revision. |
| PR chain has multiple open draft heads and chained bases | Commander / Reviewer | Decide merge / close / supersede order. |
| Furniture runtime and SVG package are candidate-only | Plan Puzzle Repair Commander + Reviewer | Keep runtime SVG package blocked; review candidate-only layout object boundary. |
| Budget stitching gate docs requested by user are absent locally | Budget Integration owner | Recreate or confirm replacement docs before production integration. |

## 13. Intake Conclusion

Conclusion: `CANDIDATE_CONTRACT_ONLY_SHARED_TRUTH`

PR #54 is accepted as the 0.12 UI IA handoff baseline, but no open PR is currently safe as production budget shared truth. The budget system should depend on a candidate interface contract and reviewer gate, not direct draft PR payloads.
