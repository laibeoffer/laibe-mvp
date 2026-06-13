# Plan Puzzle Human-Usable Goal Smoke

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- goal: all core Plan Puzzle functions human-test usable
- checkedAt: 2026-06-12 10:34 Asia/Taipei
- primary validationUrl: `http://127.0.0.1:50361/code.html?validation=human-usable-goal-smoke`
- png/download validationUrl: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=human-usable-download-json`
- layer validationUrl: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=human-usable-layer-visibility-v3`
- browser surfaces: Codex in-app Browser plus local Chrome / Playwright for file upload and download capture
- globalBlackboardWrite: false
- merge / stage / push: false

## Current Result

HUMAN_USABLE_GOAL_SMOKE_PASS_WITH_P2_NOTES

The current runtime supports the required human-operable drawing flow with browser evidence:

- PNG import through `planImportInput`
- scale calibration
- blank millimeter draft
- wall drawing
- wall selection and inspector
- wall delete through inspector action
- door / window / opening creation and edit controls
- opening delete
- parametric furniture placement
- furniture drag
- furniture resize handle
- furniture width / depth / note / material editing
- furniture delete
- layer visibility controls for walls and furniture
- candidate JSON preview and actual downloaded draft JSON
- `.pc` production export disabled
- console / page / 404 error count 0 in the fresh validation paths

The remaining notes are P2 UX hardening only: keyboard Delete for selected wall focus handling, and marking Candidate JSON Preview stale after later mutations.

## Evidence Matrix

| Requirement | Evidence | Status | Notes |
|---|---|---|---|
| Page load | title `LaiBE | Plancraft+`; `planCanvas` present | PASS | console error count 0 |
| PNG import | local Chrome set `#planImportInput` to `phase0-audit-final-1440x900-20260611.png` | PASS | `importSource.accepted=true`, `previewSupported=true`, `normalizedAs=underlay-image` |
| Scale calibration | two canvas points plus known length 3000 mm | PASS | `scale.calibrated=true`, `pxPerMm=0.1`, readout `3,000 mm = 300 px` |
| Blank mm draft / scale | `start-blank-mm-draft` created calibrated workspace | PASS | scale readout `1 mm = 0.1 px`; candidate-only workspace |
| Wall drawing | two canvas clicks after wall tool created 1 wall DOM / hit target | PASS | `.wall-hit-target` count 1 |
| Wall selection / inspector | wall click foregrounded selected wall card | PASS | inspector showed selected wall ID, length, status, thickness, delete action |
| Wall delete | inspector `data-action="delete-wall"` removed selected wall and dependent openings | PASS | wall hit targets 1 -> 0; opening hit targets 1 -> 0 |
| Door placement | scoped door button on selected wall created opening | PASS | opening hit targets increased |
| Door edit | selected opening width / offset / swing controls were fillable/selectable | PASS | edited width 1100, offset 400, swing left |
| Window placement | scoped window button on selected wall created opening | PASS | opening hit target count increased |
| Opening placement | scoped opening button on selected wall created opening | PASS | opening hit target count increased |
| Opening delete | selecting opening and Delete reduced opening hit targets | PASS | opening hit targets 3 -> 2 in regression |
| Furniture templates | 10 parametric templates visible | PASS | wardrobe, tall_cabinet, low_wall_cabinet, tv_cabinet, kitchen_cabinet, bed, sofa, dining_table, toilet, washbasin |
| Furniture placement | wardrobe placed by canvas click in furniture mode | PASS | `.furniture-item` count 0 -> 1 |
| Furniture drag | wardrobe body drag preserved selected candidate and moved object | PASS | browser drag completed with console 0 |
| Furniture resize | visible resize handle exists and drag completed | PASS | `.furniture-resize-handle` present; inspector dimensions remain editable |
| Inspector width / depth / note | edited width 2600, depth 700, note `human usable smoke note` | PASS | values reflected in Candidate JSON Preview |
| Material apply | material select set to `wood` | PASS | Candidate JSON Preview contains `materialTags: ["wood"]` for wardrobe |
| Second furniture item | bed template placed | PASS | `.furniture-item` count 2; Candidate JSON Preview includes bed |
| Furniture delete | selected furniture deletion reduced furniture count | PASS | `.furniture-item` count 2 -> 1 |
| Layer visibility | new `Layer visibility` card toggled walls and furniture | PASS | wall layer hidden/display none then restored; furniture hidden/display none then restored |
| Candidate JSON preview | `export-draft` generated `[data-testid="candidate-export-json-preview"]` | PASS | preview parsed in browser evidence |
| Actual JSON download | Chrome captured `laibe-plancraft-plus-draft.json` | PASS | top-level keys include `importSource`, `scale`, `walls`, `wallGraph`, `nodeGraph`, `toolCatalogItems`, `layoutObjects`, `candidateExportBoundary` |
| JSON guard | downloaded draft `candidateExportBoundary.formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | no `BudgetEstimateLine`, no `PricingRule` |
| `.pc` production guard | three `.pc` controls remained disabled / mock-only | PASS | no production export enabled |
| Console errors | Browser dev logs error count 0 | PASS | fresh PNG/download and layer validation paths also had page error count 0 and bad response count 0 |

## Downloaded JSON Evidence

Actual downloaded `laibe-plancraft-plus-draft.json` contained:

- `importSource.accepted = true`
- `importSource.previewSupported = true`
- `importSource.normalizedAs = underlay-image`
- `scale.calibrated = true`
- `scale.pxPerMm = 0.1`
- `walls.length = 1`
- `nodeGraph.nodes.length = 2`
- `nodeGraph.edges.length = 1`
- `candidateExportBoundary.formalEstimate = false`
- `candidateExportBoundary.budgetEngineCalled = false`
- `candidateExportBoundary.productionReady = false`
- no `BudgetEstimateLine`
- no `PricingRule`

## Candidate JSON Preview Evidence

Candidate JSON Preview contained:

- `furniture.length = 2` before deletion
- `toolCatalogItems.length = 10`
- `layoutObjects.length = 2`
- wardrobe:
  - `type: wardrobe`
  - `category: cabinet`
  - `widthMm: 2600`
  - `depthMm: 700`
  - `materialTags: ["wood"]`
  - `note: human usable smoke note`
  - `budgetCandidate: true`
  - `productionReady: false`
  - `notFormalEstimate: true`
- bed:
  - `type: bed`
  - `category: furniture`
  - `widthMm: 1500`
  - `depthMm: 2000`
  - `materialTags: ["fabric"]`
  - `budgetCandidate: true`
  - `productionReady: false`
  - `notFormalEstimate: true`
- `candidateExportBoundary.formalEstimate = false`
- `candidateExportBoundary.budgetEngineCalled = false`
- `candidateExportBoundary.productionReady = false`

## Guard Check

- Plancraft core touched: No
- `plancraft/` touched: No
- Budget Engine touched: No
- PricingRule / BudgetEstimateLine touched: No
- formalEstimateGuard changed: No
- generateBudgetEstimate called: No
- formal Excel / PDF / quote produced: No
- DB / payment / escrow / listing fee touched: No
- AI API / image API / LINE API / n8n touched: No
- `package.json` / `node_modules` touched: No
- `.pc` production export enabled: No
- SVG furniture package included in runtime: No
- global blackboard write: No

## P2 Notes

| Gap | Severity | Owner | Next |
|---|---|---|---|
| Keyboard Delete for wall was not sufficient in one run | P2 hardening | Canvas / Inspector Builder | Inspector `delete-wall` path passes; harden keyboard focus only if required |
| Candidate JSON Preview remains stale after deletes until export is clicked again | P2 UX note | Inspector / Export Builder | Consider marking preview stale or refreshing after mutation |

## Decision

The target goal is met for the scoped core functions listed in the commander objective:

`import / scale / wall / select / delete / openings / furniture placement-drag-resize / material / inspector / layer status / candidate JSON export / guard`.

Next automatic task:

1. Prepare reviewer-facing evidence map for the human-usable goal.
2. If no reviewer action arrives, harden P2 keyboard Delete or stale-preview labeling only within the allowed runtime files.
