# Plan Puzzle Target Loop 4A Reviewer Gate Packet

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 4A
- task: SVG Furniture Candidate Reviewer Gate
- checkedAt: 2026-06-12 07:01 Asia/Taipei
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- globalBlackboardWrite: false

## Gate Decision Required

SVG furniture package runtime remains blocked. This packet asks Reviewer / Commander to decide what happens to the 20 `ALLOW_CANDIDATE_AFTER_QA` rows produced by Loop 4A. No decision in this packet grants runtime inclusion by itself.

Allowed gate decisions per candidate:

| Decision | Meaning | Runtime Effect |
|---|---|---|
| ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | Candidate may proceed to a future candidate-only SVG package design step. | Still no runtime include. |
| KEEP_QUARANTINED | Candidate remains excluded until stronger overlay/crop proof or package owner need exists. | No runtime include. |
| REJECT | Candidate is removed from future package consideration. | No runtime include. |
| NEEDS_CROP_OVERLAY_PROOF | Candidate cannot be decided from contact-sheet evidence alone. | No runtime include. |

## Non-negotiable Runtime Guard

- canIncludeInRuntimePackage: false for all 84 candidates
- direct include count: 0
- copied SVG count: 0
- runtime furniture package changed: no
- Plancraft core changed: no
- Budget Engine changed: no
- productionReady: false for future candidates
- budgetEligible: false for future candidates
- exportAsCandidateOnly: true for future candidates

## Review Inputs

| Input | Path |
|---|---|
| Batch 01 evidence | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4A_OVERLAY_QA_BATCH_01_EVIDENCE.md` |
| Batch 02 evidence | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4A_OVERLAY_QA_BATCH_02_EVIDENCE.md` |
| Batch 03 evidence | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4A_OVERLAY_QA_BATCH_03_EVIDENCE.md` |
| Batch 04 evidence | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4A_OVERLAY_QA_BATCH_04_EVIDENCE.md` |
| Batch 05 evidence | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4A_OVERLAY_QA_BATCH_05_EVIDENCE.md` |
| Consolidation packet | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4A_CONSOLIDATION_PACKET.md` |
| Source SVG reference | `Z:\08-Jacky\svg_blocks` |
| Plan-study reference | `Z:\08-Jacky\plan study` |

## Candidate Gate Table

Reviewer / Commander should set one of the allowed gate decisions for each row. The default state remains `PENDING_REVIEW`.

| # | Category | Source SVG Path | Evidence Batch | Current QA Decision | Proposed Gate Default | Required Reviewer Decision |
|---:|---|---|---:|---|---|---|
| 1 | kitchen_refrigerator | `廚具設備\平面\KITCH45.svg` | 01 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 2 | kitchen_sink | `廚具設備\平面\2KITC-AB.svg` | 01 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 3 | kitchen_sink | `廚具設備\平面\HTHTHTH.svg` | 01 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 4 | kitchen_cooktop | `廚具設備\平面\13$74.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 5 | kitchen_cooktop | `廚具設備\平面\AD14D2D.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 6 | kitchen_cooktop | `廚具設備\平面\KITCH1.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 7 | bath_toilet | `衛浴設備\平面\TL2P-C01.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 8 | bath_toilet | `衛浴設備\平面\TL2P-C09.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 9 | bath_tub | `衛浴設備\平面\TL2P-F09.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 10 | seating | `沙發\平面\瘝_00.svg` | 03 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 11 | seating | `其他\未判定\1e21g1.svg` | 03 | ALLOW_CANDIDATE_AFTER_QA | NEEDS_CROP_OVERLAY_PROOF | PENDING_REVIEW |
| 12 | bed | `床具\平面\摨_1.svg` | 03 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 13 | bed | `其他\未判定\_鈭箏_02.svg` | 03 | ALLOW_CANDIDATE_AFTER_QA | NEEDS_CROP_OVERLAY_PROOF | PENDING_REVIEW |
| 14 | bath_sink | `衛浴設備\平面\2.svg` | 04 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 15 | bath_sink | `衛浴設備\平面\4.svg` | 04 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 16 | bath_sink | `衛浴設備\平面\AE02D2D.svg` | 04 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 17 | table_dining | `事務機器\平面\PDSK014.svg` | 05 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 18 | table_dining | `其他\未判定\A$C02D410CF.svg` | 05 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 19 | table_dining | `其他\未判定\A$C431D7821.svg` | 05 | ALLOW_CANDIDATE_AFTER_QA | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW | PENDING_REVIEW |
| 20 | table_dining | `其他\未判定\獢_璊_1.svg` | 05 | ALLOW_CANDIDATE_AFTER_QA | NEEDS_CROP_OVERLAY_PROOF | PENDING_REVIEW |

## Quarantine Gate

The 64 quarantined candidates remain excluded by default. Reviewer may only override a quarantined row by requesting a focused crop-overlay proof packet. No quarantined row may be copied into runtime or a package directory from this packet.

## Required Reviewer Output

Reviewer / Commander must return:

1. Accepted candidate package-review rows, if any.
2. Rows that must stay quarantined.
3. Rows that are rejected outright.
4. Rows needing additional crop-overlay proof.
5. Confirmation that runtime inclusion remains blocked until a separate package integration task is authorized.

## Data Guard

- SVG copied into runtime: No
- production furniture package touched: No
- Plancraft core touched: No
- Budget Engine touched: No
- formalEstimateGuard changed: No
- DB / payment / AI API touched: No
- `package.json` / `node_modules` touched: No
- direct include count: 0

## Decision

LOOP_4A_REVIEWER_GATE_PACKET_READY

This packet is ready for Reviewer / Commander disposition. It does not approve runtime package inclusion.

## Next Automatic Task

If no reviewer response arrives in 20 minutes, prepare a no-runtime SVG candidate package boundary appendix that defines future metadata fields and import preconditions without copying assets or touching runtime.
