# Plan Puzzle Target Loop 4A Overlay QA Batch 05 Evidence

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- batch: Loop 4A Batch 05
- category: table_dining
- checkedAt: 2026-06-12 06:31 Asia/Taipei
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- globalBlackboardWrite: false

## Source Evidence Checked

| Evidence | Path / Source | Use |
|---|---|---|
| SVG focused contact sheet | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_focused_page_01.png` | `PDSK014.svg` table/chair render reference |
| SVG unknown contact sheets | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_unknown_page_01..09.png`, `svg_unknown_page_14..15.png` | Unknown-source table/dining candidate lookup |
| SVG inventory CSV | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_audit_all_list.csv` | Source id / path cross-check |
| Loop 3 strict audit | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_3_FURNITURE_BLOCK_AUDIT.md` | Existing allow-candidate source and boundary |
| Loop 4A work packet | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4_PER_CATEGORY_OVERLAY_WORK_PACKET.md` | Required table_dining candidate list and gate |
| Plan-study positive examples | `Z:\08-Jacky\plan study\45b17b8adc54fd8c6d274ef9821e342d.jpg` | Upper-right dining table/chair cluster, living / tea table references |
| Plan-study positive examples | `Z:\08-Jacky\plan study\fee8a08da819a27bd7f1a30a862edad6.jpg` | Dining / lounge table and chair references |
| Plan-study positive examples | `Z:\08-Jacky\plan study\04cab4865ffbca44474a0cc562ec1569.jpg` | Bedroom / living table reference sanity check |

## Batch 05 Result Summary

| Category | Reviewed | ALLOW_CANDIDATE_AFTER_QA | QUARANTINE | REJECT | Runtime Include |
|---|---:|---:|---:|---:|---|
| table_dining | 20 | 4 | 16 | 0 | false |

No SVG is runtime-ready. `ALLOW_CANDIDATE_AFTER_QA` means candidate-only package review may continue after all overlay batches and commander / reviewer acceptance. Duplicate or annotation-heavy table symbols remain quarantined to prevent furniture package pollution.

## Table / Dining Ledger

| Candidate | Source SVG Path | Plan Study Target | Render Evidence | Visual Similarity | Top-view Symbol | Duplicate Decision | Package Decision | canIncludeInRuntimePackage | Notes |
|---|---|---|---|---|---|---|---|---|---|
| B05-TABLE-001 | `事務機器\平面\PDSK014.svg` | Upper-right round dining table/chair cluster in `45b17b8adc54fd8c6d274ef9821e342d.jpg` | `svg_focused_page_01.png`, card #183 | PASS | PASS | CANONICAL_ROUND_DINING_CLUSTER | ALLOW_CANDIDATE_AFTER_QA | false | Clear top-view round dining table with chairs; closest clean match to plan-study dining cluster. |
| B05-TABLE-002 | `其他\未判定\150.svg` | Dining / tea table clusters in plan-study JPGs | `svg_unknown_page_01.png`, card #246 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_ROUND_DINING_CLUSTER | QUARANTINE | false | Visually table-like and similar, but duplicate of clearer PDSK014 family; quarantine until final dedupe. |
| B05-TABLE-003 | `其他\未判定\A$C02D410CF.svg` | Rectangular table with chairs in dining / study plan regions | `svg_unknown_page_02.png`, card #276 | PASS | PASS | CANONICAL_RECTANGULAR_DINING_CLUSTER | ALLOW_CANDIDATE_AFTER_QA | false | Clean rectangular table with six surrounding chairs; distinct enough from round dining cluster. |
| B05-TABLE-004 | `其他\未判定\A$C133A79B5.svg` | Dining / table regions | `svg_unknown_page_03.png`, card #356 | PARTIAL | PASS | ANNOTATION_HEAVY_DUPLICATE | QUARANTINE | false | Table/chair geometry is visible, but embedded size text pollutes the symbol; not safe for package inclusion. |
| B05-TABLE-005 | `其他\未判定\A$C179D2D71.svg` | Dining / table regions | `svg_unknown_page_03.png`, card #384 | PASS_WITH_NOTES | PASS | DUPLICATE_RECT_TABLE_FAMILY | QUARANTINE | false | Recognizable table/chair footprint but faint and redundant versus cleaner rectangular candidates. |
| B05-TABLE-006 | `其他\未判定\A$C20A62B8E.svg` | Dining / table regions | `svg_unknown_page_03.png`, card #420 | PASS_WITH_NOTES | PASS | DUPLICATE_RECT_TABLE_FAMILY | QUARANTINE | false | Similar rectangular table/chair set; quarantine as duplicate until final package dedupe. |
| B05-TABLE-007 | `其他\未判定\A$C2C66799B.svg` | Dining / table regions | `svg_unknown_page_04.png`, card #491 | PARTIAL | PASS | ANNOTATION_HEAVY_DUPLICATE | QUARANTINE | false | Contains dimension text / label noise; not clean enough for strict runtime package candidate. |
| B05-TABLE-008 | `其他\未判定\A$C3B195AE9.svg` | Dining / table regions | `svg_unknown_page_05.png`, card #556 | PASS_WITH_NOTES | PASS | COMPACT_TABLE_DUPLICATE | QUARANTINE | false | Square table with chairs is legible but duplicates the compact table family; keep quarantined for dedupe. |
| B05-TABLE-009 | `其他\未判定\A$C3E045EAA.svg` | Dining / table regions | `svg_unknown_page_05.png`, card #575 | PASS_WITH_NOTES | PASS | RECT_TABLE_DUPLICATE | QUARANTINE | false | Clear rectangular table/chair footprint, but redundant and less neutral than B05-TABLE-003. |
| B05-TABLE-010 | `其他\未判定\A$C431D7821.svg` | Smaller table / chair clusters in plan-study JPGs | `svg_unknown_page_06.png`, card #599 | PASS | PASS | CANONICAL_COMPACT_ROUND_TABLE | ALLOW_CANDIDATE_AFTER_QA | false | Compact four-chair table symbol; distinct useful scale from larger dining clusters. |
| B05-TABLE-011 | `其他\未判定\A$C4A3B3148.svg` | Table / chair clusters in plan-study JPGs | `svg_unknown_page_06.png`, card #632 | PASS_WITH_NOTES | PASS | DUPLICATE_COMPACT_ROUND_TABLE | QUARANTINE | false | Similar compact round table set; quarantine duplicate of B05-TABLE-010. |
| B05-TABLE-012 | `其他\未判定\A$C5D466F91.svg` | Dining / table regions | `svg_unknown_page_07.png`, card #731 | PARTIAL | PASS | FAINT_DUPLICATE | QUARANTINE | false | Table/chair footprint exists but is faint at contact-sheet scale; quarantine until better crop proof. |
| B05-TABLE-013 | `其他\未判定\A$C5D965E3A.svg` | Long dining / conference table references | `svg_unknown_page_07.png`, card #734 | PARTIAL | PASS | DIMENSION_LABEL_DUPLICATE | QUARANTINE | false | Long table is visible, but embedded dimension text makes it unsuitable as clean furniture block. |
| B05-TABLE-014 | `其他\未判定\A$C5DB30B85.svg` | Compact round table / chair references | `svg_unknown_page_07.png`, card #735 | PASS_WITH_NOTES | PASS | DUPLICATE_COMPACT_ROUND_TABLE | QUARANTINE | false | Legible round table/chair set but duplicates B05-TABLE-010 / B05-TABLE-011. |
| B05-TABLE-015 | `其他\未判定\A$C62673E99.svg` | Rectangular dining table references | `svg_unknown_page_08.png`, card #770 | PASS_WITH_NOTES | PASS | LONG_RECT_TABLE_DUPLICATE | QUARANTINE | false | Rectangular table with chairs appears related, but overlaps with cleaner rectangular dining candidate. |
| B05-TABLE-016 | `其他\未判定\A$C665A2105.svg` | Round dining table / chair cluster in `45b17b8adc54fd8c6d274ef9821e342d.jpg` | `svg_unknown_page_08.png`, card #807 | PASS_WITH_NOTES | PASS | ROUND_DINING_DUPLICATE | QUARANTINE | false | Strong match, but duplicate of PDSK014-style round dining cluster; keep out until dedupe. |
| B05-TABLE-017 | `其他\未判定\A$C778E73CB.svg` | Table / furniture regions | `svg_unknown_page_09.png`, card #902 | PARTIAL | UNKNOWN | LOW_SCALE_DETAIL_RISK | QUARANTINE | false | Table-like geometry is present but not enough plan-scale confidence for allow. |
| B05-TABLE-018 | `其他\未判定\獢_璊_1.svg` | Upper-right round dining table/chair cluster in `45b17b8adc54fd8c6d274ef9821e342d.jpg` | `svg_unknown_page_14.png`, card #1301 | PASS | PASS | ALTERNATE_ROUND_DINING_CLUSTER | ALLOW_CANDIDATE_AFTER_QA | false | Clean large round table/chair group; keep as alternate round dining candidate pending final dedupe. |
| B05-TABLE-019 | `其他\未判定\獢_璊_2.svg` | Upper-right round dining table/chair cluster in plan-study JPGs | `svg_unknown_page_14.png`, card #1302 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_ALT_ROUND_CLUSTER | QUARANTINE | false | Similar to B05-TABLE-018 with no stronger evidence; quarantine duplicate. |
| B05-TABLE-020 | `其他\未判定\擗_獢_-_8.svg` | Square / compact table-chair plan examples | `svg_unknown_page_15.png`, card #1327 | PASS_WITH_NOTES | PASS | DUPLICATE_COMPACT_TABLE_FAMILY | QUARANTINE | false | Clear compact table/chair symbol, but overlaps with compact round/square family; quarantine until dedupe. |

## Batch 05 Decisions

Proceed to future package review only:

- `事務機器\平面\PDSK014.svg` as canonical round dining table/chair cluster.
- `其他\未判定\A$C02D410CF.svg` as canonical rectangular dining table/chair cluster.
- `其他\未判定\A$C431D7821.svg` as canonical compact round table/chair symbol.
- `其他\未判定\獢_璊_1.svg` as alternate round dining candidate pending final dedupe.

Quarantine:

- all remaining table_dining candidates, including annotation-heavy, faint, and duplicate variants.

Reject:

- none in Batch 05. The non-allowed candidates are table-related but not clean enough for package inclusion without final dedupe / crop overlay proof.

## Data Guard

- SVG copied into runtime: No
- runtime furniture package changed: No
- Plancraft core touched: No
- Budget Engine touched: No
- formalEstimateGuard changed: No
- DB / payment / AI API touched: No
- `package.json` / `node_modules` touched: No
- direct include count: 0

## Loop 4A Batch Coverage

Batch 05 completes the initial per-category evidence pass for the 84 SVG allow candidates:

- Batch 01: kitchen_refrigerator / kitchen_sink
- Batch 02: kitchen_cooktop / bath_toilet / bath_tub
- Batch 03: seating / bed
- Batch 04: bath_sink
- Batch 05: table_dining

SVG furniture package runtime remains blocked. The next safe task is a Loop 4A consolidation packet that collapses all batch decisions into a canonical candidate list, quarantine list, and explicit non-runtime include guard.

## Decision

LOOP_4A_BATCH_05_OVERLAY_QA_EVIDENCE_READY

This is a docs-only QA evidence packet. It does not make any SVG runtime-ready. Runtime inclusion remains blocked until all category decisions are consolidated, reviewed, deduplicated, and accepted by commander / reviewer.

## Next Automatic Task

If no new packet arrives in 20 minutes, create a Loop 4A consolidation packet mapping Batch 01-05 `ALLOW_CANDIDATE_AFTER_QA`, quarantine, duplicate, and reject decisions. Keep SVG runtime include false.
