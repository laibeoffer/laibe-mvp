# Plan Puzzle Target Loop 6 Focused Regression Packet

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 6
- task: focused regression packet and remaining placeholder list
- checkedAt: 2026-06-12 03:32 Asia/Taipei
- validationUrl: `http://127.0.0.1:50361/code.html?validation=loop6-focused-regression`
- global blackboard write: false

## Browser Regression Path

1. Load the Plan Puzzle validation page.
2. Start Blank mm draft.
3. Draw a wall.
4. Select the wall through browser hit target.
5. Add a door opening from selected wall inspector.
6. Select the opening through browser hit target.
7. Place a `wardrobe` parametric furniture candidate.
8. Change native material select to `fabric`.
9. Export candidate draft JSON preview.
10. Expand Geometry diagnostics.
11. Verify `.pc` controls remain disabled/mock-only.

## Evidence Matrix

| Area | Expected | Actual | Status |
|---|---|---|---|
| Page load | Page loads through local static server | Loaded `loop6-focused-regression` URL | PASS |
| Wall hit target | Wall midpoint hits `wall-hit-target` | `element.class=wall-hit-target`, `data-wall-id` present | PASS |
| Wall inspector | Selected wall inspector is first visible inspector card | `targetExists=true`, `firstIsTarget=true` | PASS |
| Opening hit target | Door midpoint hits `opening-hit-target` | `element.class=opening-hit-target`, `data-opening-id` present | PASS |
| Opening inspector | Selected opening inspector is first visible inspector card | `targetExists=true`, `firstIsTarget=true` | PASS |
| Furniture placement | Wardrobe candidate can be placed | Furniture inspector exists after placement | PASS |
| Furniture inspector | Selected furniture inspector is first visible card | `targetExists=true`, `firstIsTarget=true` | PASS |
| Native material select | Material select updates candidate material | JSON preview contains `fabric` | PASS |
| Candidate JSON Preview | Preview visible after export | `furniture=1`, `toolCatalogItems=10`, `layoutObjects=1` | PASS |
| Candidate guard fields | No formal estimate / no Budget Engine / productionReady false | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS |
| Diagnostics collapse | Diagnostics closed by default | wall/opening/furniture states each report all diagnostics closed | PASS |
| Diagnostics expansion | Geometry diagnostics can be expanded | `geometryOpen=true` | PASS |
| `.pc` boundary | `.pc` export controls disabled/mock-only | 3 `.pc` buttons, all disabled and `data-mock-only=true` | PASS |
| Console | No browser console errors | `consoleErrorCount=0` | PASS |

## Guard Result

- Plancraft core touched: No
- Budget Engine touched: No
- formalEstimateGuard changed: No
- DB / payment / AI API touched: No
- `package.json` / `node_modules` touched: No
- `.pc` production export enabled: No
- candidate furniture entered formal estimate: No
- SVG furniture package included in runtime: No

## Remaining Placeholder / Boundary List

| Item | Status | Boundary | Next |
|---|---|---|---|
| SVG furniture package runtime | BLOCKED | 84 candidates remain QA_PENDING until per-candidate overlay QA | Continue Loop 4A overlay QA separately |
| JSON download content capture | TOOL_LIMITED | In-app Browser cannot capture download contents; Candidate JSON Preview is browser-verifiable mitigation | Keep preview readout as acceptance evidence |
| `.pc` production export | DISABLED_BY_GUARD | Static page must not call Plancraft core production or produce formal `.pc` output | Keep disabled/mock-only until commander explicitly reopens |
| Formal estimate / Budget Engine | EXCLUDED | Furniture candidates are context only, not formal quantity or estimate input | No action in Plan Puzzle repair worktree |
| Style visual sandbox | MOCK_ONLY | No AI/image API; only static candidate wording | Keep out of production routes |
| SVG package inclusion | EXCLUDED_FROM_RUNTIME_NOW | No direct include from the 84 SVG candidates before overlay QA | Use parametric furniture MVP until overlay QA passes |

## Decision

LOOP_6_FOCUSED_REGRESSION_PASS_WITH_NOTES

## Next Automatic Task

If no new packet arrives in 20 minutes, prepare the next repair target demand for either:

1. Loop 7 interaction polish: furniture resize handles / selected-item affordance / compact human-readable inspector labels.
2. Loop 4A overlay QA execution packet for the 84 SVG candidates.

The default next safe task is Loop 7 interaction polish packet, because SVG runtime remains blocked by overlay QA and must not block parametric operability.
