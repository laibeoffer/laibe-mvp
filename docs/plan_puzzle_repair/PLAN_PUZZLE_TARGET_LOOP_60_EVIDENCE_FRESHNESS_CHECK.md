# Plan Puzzle Target Loop 60 - Evidence Freshness and JSON Parse Check

## Summary

- workstream: Plancraft+ Plan Puzzle Repair
- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Loop 60 - evidence freshness and latest JSON parse check
- checkedAt: 2026-06-13 22:31:00 +08:00
- branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- HEAD: `34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5`
- result: `LOOP_60_EVIDENCE_FRESHNESS_PASS_WITH_BOM_NOTE`
- runtimePatch: false
- stagedCount: 0

Loop 60 re-checked the latest evidence files referenced by the A2 completion index. It does not change runtime behavior.

## JSON Parse Matrix

| Evidence file | Exists | Plain JSON parse | Counts / result | Guard |
|---|---|---|---|---|
| `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5_EXPORT.json` | YES | PASS | walls `1`, openings `3`, furniture `1`, layoutObjects `1` | formalEstimate `false`, budgetEngineCalled `false`, productionReady `false` |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_R4_FINAL_EXPORT.json` | YES | PASS | walls `1`, openings `3`, furniture `1`, layoutObjects `1` | formalEstimate `false`, budgetEngineCalled `false`, productionReady `false` |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_EXPORT.json` | YES | PASS | walls `1`, openings `1`, furniture `1`, layoutObjects `1` | formalEstimate `false`, budgetEngineCalled `false`, productionReady `false` |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_INITIAL_EXPORT.json` | YES | PASS | walls `1`, openings `1`, furniture `1`, layoutObjects `1` | formalEstimate `false`, budgetEngineCalled `false`, productionReady `false` |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_HIDDEN_EXPORT.json` | YES | PASS | walls `1`, openings `1`, furniture `1`, layoutObjects `1` | formalEstimate `false`, budgetEngineCalled `false`, productionReady `false` |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_RESTORED_EXPORT.json` | YES | PASS | walls `1`, openings `1`, furniture `1`, layoutObjects `1` | formalEstimate `false`, budgetEngineCalled `false`, productionReady `false` |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_LOOP56_PPT_LIKE_FUNCTIONAL_SMOKE_R3_RESULT.json` | YES | PASS | consoleErrors `[]`, consoleWarnings `[]` | not an export payload |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_LOOP56_SELECTION_HIGHLIGHT_SMOKE_RESULT.json` | YES | PASS | consoleErrors `[]`, consoleWarnings `[]` | not an export payload |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_LOOP56_PROPERTY_FIELD_TERMS_CHECK_CORRECTED_RESULT.json` | YES | BOM_NOTE | plain `JSON.parse` fails on leading UTF-8 BOM; parse after BOM strip PASS; `pass=true`; labels `寬度 mm`, `深度 mm`, `高度 mm`, `材料`, `備註` | not an export payload |

## Evidence Hygiene Note

`PLAN_PUZZLE_LOOP56_PROPERTY_FIELD_TERMS_CHECK_CORRECTED_RESULT.json` starts with a UTF-8 BOM. The file content is valid after removing the BOM and confirms the Loop 56 property-label evidence, but strict Node `JSON.parse(fs.readFileSync(file, "utf8"))` fails until the BOM is stripped.

This is an evidence-file hygiene issue, not a runtime defect. It does not affect browser behavior, candidate JSON export, or guard boundaries.

## Guard Status

| Guard | Result |
|---|---|
| Runtime patch in Loop 60 | NO |
| Export payload parse | PASS for latest candidate JSON exports |
| Candidate boundary | PASS: all parsed export payloads keep `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` |
| Evidence hygiene | PASS_WITH_BOM_NOTE |
| Staged files | 0 |
| Plancraft core touched | NO |
| Budget runtime touched | NO |
| Package / node_modules added | NO |

## Decision

`EVIDENCE_FRESHNESS_CONFIRMED_WITH_ONE_BOM_HYGIENE_NOTE`

The package remains ready for A2 review. If A2 requires every evidence JSON to parse with strict plain Node `JSON.parse` without BOM handling, the next safe task is to normalize that single evidence result file encoding without touching runtime.

## Next Automatic Task

Loop 61 - evidence hygiene normalization request watch. If no A2 / Reviewer response arrives, keep runtime unchanged and prepare a tiny evidence-only encoding normalization plan for the single BOM-bearing result file.
