# Plan Puzzle Target Loop 4A Reviewer Response Template

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 4A
- task: reviewer response template
- preparedAt: 2026-06-12 08:01 Asia/Taipei
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- globalBlackboardWrite: false

## Required Reviewer Response

Reviewer / Commander must choose one disposition for each candidate row:

| Disposition | Meaning | Runtime Effect |
|---|---|---|
| ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | Candidate may continue to a future candidate-only package design task. | Runtime include remains false. |
| KEEP_QUARANTINED | Candidate remains excluded. | Runtime include remains false. |
| REJECT | Candidate is removed from future package consideration. | Runtime include remains false. |
| NEEDS_CROP_OVERLAY_PROOF | Candidate needs a focused crop-overlay proof packet before disposition. | Runtime include remains false. |

No row may be marked runtime-ready in this response template.

## Candidate Response Table

Fill `Reviewer Disposition` and `Reason`.

| # | Category | Source SVG Path | Current Default | Reviewer Disposition | Reason |
|---:|---|---|---|---|---|
| 1 | kitchen_refrigerator | `廚具設備\平面\KITCH45.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 2 | kitchen_sink | `廚具設備\平面\2KITC-AB.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 3 | kitchen_sink | `廚具設備\平面\HTHTHTH.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 4 | kitchen_cooktop | `廚具設備\平面\13$74.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 5 | kitchen_cooktop | `廚具設備\平面\AD14D2D.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 6 | kitchen_cooktop | `廚具設備\平面\KITCH1.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 7 | bath_toilet | `衛浴設備\平面\TL2P-C01.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 8 | bath_toilet | `衛浴設備\平面\TL2P-C09.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 9 | bath_tub | `衛浴設備\平面\TL2P-F09.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 10 | seating | `沙發\平面\瘝_00.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 11 | seating | `其他\未判定\1e21g1.svg` | NEEDS_CROP_OVERLAY_PROOF |  |  |
| 12 | bed | `床具\平面\摨_1.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 13 | bed | `其他\未判定\_鈭箏_02.svg` | NEEDS_CROP_OVERLAY_PROOF |  |  |
| 14 | bath_sink | `衛浴設備\平面\2.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 15 | bath_sink | `衛浴設備\平面\4.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 16 | bath_sink | `衛浴設備\平面\AE02D2D.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 17 | table_dining | `事務機器\平面\PDSK014.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 18 | table_dining | `其他\未判定\A$C02D410CF.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 19 | table_dining | `其他\未判定\A$C431D7821.svg` | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW |  |  |
| 20 | table_dining | `其他\未判定\獢_璊_1.svg` | NEEDS_CROP_OVERLAY_PROOF |  |  |

## Quarantine Response

The 64 quarantined candidates remain excluded by default. Reviewer / Commander may respond at category level:

| Category | Quarantined Count | Reviewer Category Disposition | Reason |
|---|---:|---|---|
| kitchen_refrigerator | 1 | KEEP_QUARANTINED |  |
| kitchen_sink | 2 | KEEP_QUARANTINED |  |
| kitchen_cooktop | 5 | KEEP_QUARANTINED |  |
| bath_toilet | 6 | KEEP_QUARANTINED |  |
| bath_tub | 7 | KEEP_QUARANTINED |  |
| seating | 6 | KEEP_QUARANTINED |  |
| bed | 9 | KEEP_QUARANTINED |  |
| bath_sink | 12 | KEEP_QUARANTINED |  |
| table_dining | 16 | KEEP_QUARANTINED |  |

## Runtime Guard Confirmation

Reviewer / Commander must confirm:

- `canIncludeInRuntimePackage=false` remains true for all rows.
- direct include count remains 0.
- copied SVG count remains 0.
- future package integration requires a separate authorized task.
- candidate-only SVGs must not enter Budget Engine, formal estimates, Plancraft core, DB, payment, AI API, or production export.

## Response Processing Rule

After reviewer response arrives:

1. Update a response packet, not runtime.
2. Keep rejected / quarantined rows out of package scope.
3. Convert accepted rows only into a future candidate-package review scope, not runtime code.
4. Require a separate package integration authorization before any asset copy or runtime wiring.

## Decision

LOOP_4A_REVIEWER_RESPONSE_TEMPLATE_READY

This template is ready to receive Reviewer / Commander disposition. Runtime inclusion remains blocked.

## Next Automatic Task

If no response arrives in 20 minutes, perform a read-only response-watch check. Do not create runtime package work without explicit acceptance.
