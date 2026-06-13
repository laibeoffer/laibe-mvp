# Plan Puzzle Target Loop 4A SVG Overlay QA Execution Packet

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 4A
- task: SVG Furniture Candidate Overlay QA execution
- checkedAt: 2026-06-12 04:46 Asia/Taipei
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- globalBlackboardWrite: false

## Current Gate

furnitureSvgPackageRuntime: BLOCKED_UNTIL_OVERLAY_QA

No SVG candidate may be copied into runtime, package assets, production templates, or Plancraft core until it passes per-candidate overlay QA and commander acceptance.

## Inputs Checked

| Input | Path / Source | Status |
|---|---|---|
| Strict audit packet | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_3_FURNITURE_BLOCK_AUDIT.md` | 84 allow candidates, 0 direct include |
| Per-category work packet | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4_PER_CATEGORY_OVERLAY_WORK_PACKET.md` | 9 categories, 84 candidates |
| Candidate contact sheets | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_focused_page_01..07.png` | Available as render reference |
| All-SVG contact sheets | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_all_page_01..19.png` | Available as broad render reference |
| Candidate CSV | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_audit_all_list.csv` | Available as inventory source |
| Plan study sources | `Z:\08-Jacky\plan study` | External comparison target, read-only |

## Execution Queue

Run categories in increasing complexity so strict rejects happen early and package pollution stays contained.

| Batch | Category | Candidate Count | Reason | Output Required | Runtime Include |
|---:|---|---:|---|---|---|
| 1 | kitchen_refrigerator | 2 | Smallest set; validates generic appliance label rule | Batch 01 evidence + PASS/FAIL ledger | false |
| 1 | kitchen_sink | 4 | Small wet fixture set; likely clear reject/pass decision | Batch 01 evidence + PASS/FAIL ledger | false |
| 2 | kitchen_cooktop | 8 | Appliance footprint validation | Batch 02 evidence + PASS/FAIL ledger | false |
| 2 | bath_toilet | 8 | Toilet footprint validation | Batch 02 evidence + PASS/FAIL ledger | false |
| 2 | bath_tub | 8 | Tub footprint validation | Batch 02 evidence + PASS/FAIL ledger | false |
| 3 | seating | 8 | High false-positive risk; needs plan crop comparison | Batch 03 evidence + PASS/FAIL ledger | false |
| 3 | bed | 11 | Medium set; duplicate collapse required | Batch 03 evidence + PASS/FAIL ledger | false |
| 4 | bath_sink | 15 | Large fixture set; high duplicate risk | Batch 04 evidence + PASS/FAIL ledger | false |
| 5 | table_dining | 20 | Largest and noisiest set; execute last | Batch 05 evidence + PASS/FAIL ledger | false |

Total candidate count remains 84. Direct include count remains 0.

## Per-candidate Ledger Fields

Every candidate row in every batch must record:

| Field | Required Value |
|---|---|
| candidateId | Audit ID such as `PPF-CAND-014` |
| category | One of the 9 Loop 4A categories |
| sourceSvgPath | Original SVG path, read-only |
| planStudyTarget | Specific plan-study JPG |
| cropRegion | Human-readable crop / room region |
| renderEvidence | Contact sheet or rendered SVG reference |
| overlayEvidence | Side-by-side or translucent overlay evidence |
| visualSimilarity | PASS / FAIL / UNCLEAR |
| topViewPlanSymbol | PASS / FAIL |
| duplicateDecision | CANONICAL / DUPLICATE / UNIQUE / NOT_APPLICABLE |
| packageDecision | ALLOW_CANDIDATE_AFTER_QA / QUARANTINE / REJECT |
| canIncludeInRuntimePackage | false unless accepted after full QA |
| notes | Evidence-based reason; no name-only approvals |

## Strict Pass Criteria

PASS requires all of:

1. Candidate shape visibly matches a symbol that actually appears in a plan-study image.
2. Shape is a top-view plan block, not elevation, decoration, hatch, annotation, or whole-room grouping.
3. Candidate is readable at small plan scale.
4. Candidate is not a worse duplicate of another candidate in the same category.
5. Candidate can remain `productionReady: false`, `budgetEligible: false`, and `exportAsCandidateOnly: true`.

## Strict Fail Criteria

FAIL if any of:

1. No visually similar symbol appears in plan study.
2. Match is based only on filename or category label.
3. Shape is too noisy, cropped, filled, distorted, or unreadable.
4. Shape resembles door/window/wall shell, material hatch, vegetation, annotation, or decorative icon.
5. Candidate would require Plancraft core, Budget Engine, or formal package changes.

## Batch 01 Assignment

Owner: SVG Furniture Candidate Overlay QA

Batch 01 covers:

| Category | Candidate Count | Required Plan Targets | Evidence Output |
|---|---:|---|---|
| kitchen_refrigerator | 2 | Appliance / REF-like blocks in plan study | `PLAN_PUZZLE_TARGET_LOOP_4A_OVERLAY_QA_BATCH_01_EVIDENCE.md` |
| kitchen_sink | 4 | Kitchen wet counter / sink regions in plan study | `PLAN_PUZZLE_TARGET_LOOP_4A_OVERLAY_QA_BATCH_01_EVIDENCE.md` |

Batch 01 must not approve package inclusion. It may only assign `ALLOW_CANDIDATE_AFTER_QA`, `QUARANTINE`, or `REJECT`, with `canIncludeInRuntimePackage=false` until commander acceptance.

## Data Guard

- Plancraft core touched: No
- Budget Engine touched: No
- formalEstimateGuard changed: No
- DB / payment / AI API touched: No
- `package.json` / `node_modules` touched: No
- SVG copied into runtime: No
- runtime furniture package changed: No

## Decision

LOOP_4A_OVERLAY_QA_EXECUTION_STARTED_BATCH_QUEUE_READY

## Next Automatic Task

If no new packet arrives in 20 minutes, create `PLAN_PUZZLE_TARGET_LOOP_4A_OVERLAY_QA_BATCH_01_EVIDENCE.md` for kitchen_refrigerator and kitchen_sink, with strict PASS / FAIL / QUARANTINE rows and no runtime include.
