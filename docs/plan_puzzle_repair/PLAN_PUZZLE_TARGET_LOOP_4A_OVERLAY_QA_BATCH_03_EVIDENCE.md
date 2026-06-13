# Plan Puzzle Target Loop 4A Overlay QA Batch 03 Evidence

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- batch: Loop 4A Batch 03
- categories: seating, bed
- checkedAt: 2026-06-12 06:01 Asia/Taipei
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- globalBlackboardWrite: false

## Source Evidence Checked

| Evidence | Path / Source | Use |
|---|---|---|
| SVG focused contact sheet | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_focused_page_01.png` | Bed and seating canonical render reference |
| SVG unknown contact sheets | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_unknown_page_01..09.png` | Unknown-source bed / seating variants |
| Loop 3 strict audit | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_3_FURNITURE_BLOCK_AUDIT.md` | Existing allow-candidate source and boundary |
| Plan-study positive examples | `Z:\08-Jacky\plan study\45b17b8adc54fd8c6d274ef9821e342d.jpg` | Bedrooms and living seating examples |
| Plan-study positive examples | `Z:\08-Jacky\plan study\fee8a08da819a27bd7f1a30a862edad6.jpg` | Sofa / lounge / table seating examples |
| Plan-study positive examples | `Z:\08-Jacky\plan study\04cab4865ffbca44474a0cc562ec1569.jpg` | Multiple bedroom bed symbols |
| Plan-study positive examples | `Z:\08-Jacky\plan study\ffa0dee4a88032f3498544aaad331746.jpg` | Bedroom and reception seating examples |

## Batch 03 Result Summary

| Category | Reviewed | ALLOW_CANDIDATE_AFTER_QA | QUARANTINE | REJECT | Runtime Include |
|---|---:|---:|---:|---:|---|
| seating | 8 | 2 | 6 | 0 | false |
| bed | 11 | 2 | 9 | 0 | false |
| Total | 19 | 4 | 15 | 0 | false |

No SVG is runtime-ready. This packet only chooses candidates that may proceed to later package review after all overlay batches, dedupe, and commander acceptance.

## Seating Ledger

| Candidate | Source SVG Path | Plan Study Target | Render Evidence | Visual Similarity | Top-view Symbol | Duplicate Decision | Package Decision | canIncludeInRuntimePackage | Notes |
|---|---|---|---|---|---|---|---|---|---|
| B03-SEAT-001 | `沙發\平面\瘝_00.svg` | living / lounge seating areas in plan-study JPGs | `svg_focused_page_01.png`, card #159 | PASS | PASS | CANONICAL_SOFA_GROUP | ALLOW_CANDIDATE_AFTER_QA | false | Clear sofa/seat top-view group; best canonical seating candidate from focused library. |
| B03-SEAT-002 | `其他\未判定\1e21g1.svg` | living / lounge seating areas in plan-study JPGs | `svg_unknown_page_01.png`, card #249 | PASS_WITH_NOTES | PASS | CANONICAL_BEDLIKE_SOFA_ALT | ALLOW_CANDIDATE_AFTER_QA | false | Readable seat/sofa-like top-view, but source category is unknown; keep as candidate-only alternate pending reviewer acceptance. |
| B03-SEAT-003 | `其他\未判定\A$C15085DBF.svg` | living / lounge seating areas in plan-study JPGs | `svg_unknown_page_03.html`, card #369 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Loop 3 marks seating-like, but no focused high-confidence render in this batch. Needs side-by-side crop proof. |
| B03-SEAT-004 | `其他\未判定\A$C2F0631E8.svg` | living / lounge seating areas in plan-study JPGs | `svg_unknown_page_04.html`, card #504 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown A$C source; quarantine until explicit visual overlay proves match. |
| B03-SEAT-005 | `其他\未判定\A$C47D34BEE.svg` | living / lounge seating areas in plan-study JPGs | `svg_unknown_page_06.html`, card #622 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown source and possible room-group / object-fragment risk. |
| B03-SEAT-006 | `其他\未判定\A$C52D84EDD.svg` | living / lounge seating areas in plan-study JPGs | `svg_unknown_page_07.html`, card #682 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown source; no runtime or package use until overlay proof. |
| B03-SEAT-007 | `其他\未判定\A$C638B20A1.svg` | living / lounge seating areas in plan-study JPGs | `svg_unknown_page_08.html`, card #777 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown source; likely duplicate/alternate if seating-like. |
| B03-SEAT-008 | `其他\未判定\鈭_鈭箸_142-78.svg` | living / lounge seating areas in plan-study JPGs | Loop 3 audit text only | PARTIAL | UNKNOWN | MOJIBAKE_PATH_RISK | QUARANTINE | false | Mojibake path and no focused render reference in this batch; quarantine. |

## Bed Ledger

| Candidate | Source SVG Path | Plan Study Target | Render Evidence | Visual Similarity | Top-view Symbol | Duplicate Decision | Package Decision | canIncludeInRuntimePackage | Notes |
|---|---|---|---|---|---|---|---|---|---|
| B03-BED-001 | `床具\平面\摨_1.svg` | bedroom bed symbols across plan-study JPGs | `svg_focused_page_01.png`, card #148 | PASS | PASS | CANONICAL_BED | ALLOW_CANDIDATE_AFTER_QA | false | Clean bed top-view with pillows and bed body; matches repeated plan-study bedroom symbols. |
| B03-BED-002 | `床具\平面\摨_2.svg` | bedroom bed symbols across plan-study JPGs | `svg_focused_page_01.png`, card #149 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_BED_001 | QUARANTINE | false | Similar to canonical bed; quarantine duplicate to keep package small. |
| B03-BED-003 | `其他\未判定\_鈭箏_02.svg` | bedroom bed symbols across plan-study JPGs | Loop 3 audit text; unknown contact sheet family | PASS_WITH_NOTES | PASS | CANONICAL_ALT_BED | ALLOW_CANDIDATE_AFTER_QA | false | Bed-like variant may be useful as alternate; remains candidate-only because source is unknown/mojibake. |
| B03-BED-004 | `其他\未判定\_鈭箏_10.svg` | bedroom bed symbols across plan-study JPGs | Loop 3 audit text; unknown contact sheet family | PARTIAL | PASS_WITH_NOTES | DUPLICATE_OF_ALT_BED | QUARANTINE | false | Bed-like duplicate/variant; quarantine until package owner requests alternate. |
| B03-BED-005 | `其他\未判定\_鈭箏_8.svg` | bedroom bed symbols across plan-study JPGs | Loop 3 audit text; unknown contact sheet family | PARTIAL | PASS_WITH_NOTES | DUPLICATE_OF_ALT_BED | QUARANTINE | false | Bed-like duplicate/variant; quarantine. |
| B03-BED-006 | `其他\未判定\A$C0CCE426D.svg` | bedroom bed symbols across plan-study JPGs | `svg_unknown_page_02.html`, card #326 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C bed-like variant; no direct focused overlay evidence in this batch. |
| B03-BED-007 | `其他\未判定\A$C34522901.svg` | bedroom bed symbols across plan-study JPGs | `svg_unknown_page_05.html`, card #523 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C bed-like variant; quarantine. |
| B03-BED-008 | `其他\未判定\A$C54A37BF1.svg` | bedroom bed symbols across plan-study JPGs | `svg_unknown_page_07.html`, card #693 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C bed-like variant; quarantine. |
| B03-BED-009 | `其他\未判定\A$C5AAA4E67.svg` | bedroom bed symbols across plan-study JPGs | `svg_unknown_page_07.html`, card #724 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C bed-like variant; quarantine. |
| B03-BED-010 | `其他\未判定\A$C6BC949F2.svg` | bedroom bed symbols across plan-study JPGs | `svg_unknown_page_09.html`, card #838 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C bed-like variant; quarantine. |
| B03-BED-011 | `其他\未判定\璊_摮_00.svg` | bedroom bed symbols across plan-study JPGs | Loop 3 audit text only | PARTIAL | UNKNOWN | MOJIBAKE_PATH_RISK | QUARANTINE | false | Mojibake path and no focused render reference; quarantine. |

## Batch 03 Decisions

Proceed to future package review only:

- `沙發\平面\瘝_00.svg` as canonical sofa/seating group.
- `其他\未判定\1e21g1.svg` as alternate seating candidate, still source-risked.
- `床具\平面\摨_1.svg` as canonical bed.
- `其他\未判定\_鈭箏_02.svg` as alternate bed candidate, still source-risked.

Quarantine:

- all duplicate, unknown-source, mojibake-path, or weak-render variants listed above.

Reject:

- none in Batch 03.

## Data Guard

- SVG copied into runtime: No
- runtime furniture package changed: No
- Plancraft core touched: No
- Budget Engine touched: No
- formalEstimateGuard changed: No
- DB / payment / AI API touched: No
- `package.json` / `node_modules` touched: No
- direct include count: 0

## Decision

LOOP_4A_BATCH_03_OVERLAY_QA_EVIDENCE_READY

This is a docs-only QA evidence packet. It does not make any SVG runtime-ready. Runtime inclusion remains blocked until all category batches are completed, reviewed, deduplicated, and accepted by commander / reviewer.

## Next Automatic Task

If no new packet arrives in 20 minutes, proceed to Loop 4A Batch 04 for `bath_sink`, with strict PASS / FAIL / QUARANTINE decisions and no runtime include.
