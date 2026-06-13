# Plan Puzzle Repair Agent Dispatch Matrix

sourcePriority: GitHub / PR98 first; local files are secondary comparison only.
worktreePath: Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611
activeBranch: codex/plan-puzzle-test-repair-worktree-20260611
activeHead: 34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5

| Agent | Status | CurrentTask | DoneDefinition | FallbackTask | Runtime Write Allowed |
|---|---|---|---|---|---|
| B_PLAN_PUZZLE_REPAIR_COMMANDER | ACTIVE | Maintain command board, decide phase gates, assign owners | Blackboard and dispatch matrix current; no solo runtime patch | Data guard checklist / first repair order | No direct runtime patch unless defect proven and minimal |
| Execution Officer | ACTIVE | Heartbeat and anti-idle enforcement | All agents have doneDefinition and fallbackTask | Update blockerQueue / hungryBacklog | No |
| Code Reality Auditor | COMMANDER_BASELINE_COMPLETE | Target Loop 1 selector/action/export reality mapped | Button/action/canvas/data/export matrix with PASS/PARTIAL/FAIL evidence | Expand selector/event map for P1 tools | No |
| Human Operability QA | TARGET_LOOP_1_REGRESSION_COMPLETE | Browser usability audit for Target Loop 1 | Browser evidence, pass/fail summary, bug queue | Door/window focused replay | No |
| Data Guard | TARGET_LOOP_1_PASS | Budget / forbidden-flow guard checklist | No forbidden runtime path; candidate/export boundary mapped | Re-run after any runtime patch | No |
| Canvas / Import Core Builder | COMPLETED_TARGET_LOOP_1_PATCH | code.html scoped patch | Layout contained; candidate JSON export enabled; .pc disabled | Support regression questions only | Yes, completed in allowed runtime file |
| Door / Window / Opening Builder | TARGET_LOOP_2_PASS_NO_PATCH_REQUIRED | Door/window/opening audit complete | No runtime patch required | Support regression questions only | No current runtime write |
| Plancraft Furniture Package Auditor | ACTIVE_NEXT_TARGET_LOOP_3 | Read-only furniture package audit | Furniture/fixture source and placeholder contract mapped | Contract-only item template | No |
| Furniture / Cabinet Builder | GATED | Not started | Starts after canvas and furniture contract | Prepare object interaction spec | Yes, gated to allowed runtime files |
| Inspector / Material Builder | GATED | Not started | Starts after core flow evidence | Prepare inspector/material bug map | Yes, gated to allowed runtime files |

## Current Phase Gate

Target Loop 1 runtime patch is complete inside allowed scope.

Target Loop 2 passed without runtime patch.

Target Loop 3 may start when:
- Furniture package source is audited read-only.
- Item template contract is defined without touching Plancraft core.
- Commander gates any furniture/cabinet runtime patch to browser-proven defects only.
