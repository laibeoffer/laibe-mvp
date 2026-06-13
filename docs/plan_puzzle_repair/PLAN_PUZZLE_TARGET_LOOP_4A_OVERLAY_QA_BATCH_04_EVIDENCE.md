# Plan Puzzle Target Loop 4A Overlay QA Batch 04 Evidence

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- batch: Loop 4A Batch 04
- category: bath_sink
- checkedAt: 2026-06-12 06:16 Asia/Taipei
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- globalBlackboardWrite: false

## Source Evidence Checked

| Evidence | Path / Source | Use |
|---|---|---|
| SVG focused contact sheet | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_focused_page_05.png` | Bath sink / basin render reference |
| SVG unknown contact sheets | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_unknown_page_02..10.html` | Unknown-source A$C basin candidate lookup |
| Loop 3 strict audit | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_3_FURNITURE_BLOCK_AUDIT.md` | Existing allow-candidate source and boundary |
| Plan-study positive examples | `Z:\08-Jacky\plan study\45b17b8adc54fd8c6d274ef9821e342d.jpg` | Bath / vanity / wash basin examples |
| Plan-study positive examples | `Z:\08-Jacky\plan study\04cab4865ffbca44474a0cc562ec1569.jpg` | Master bath and bath basin examples |
| Plan-study positive examples | `Z:\08-Jacky\plan study\aea188d1216f20ef7bed5cdae4174b61.jpg` | Wet-room wash basin examples |
| Plan-study positive examples | `Z:\08-Jacky\plan study\ffa0dee4a88032f3498544aaad331746.jpg` | Bathroom basin examples |

## Batch 04 Result Summary

| Category | Reviewed | ALLOW_CANDIDATE_AFTER_QA | QUARANTINE | REJECT | Runtime Include |
|---|---:|---:|---:|---:|---|
| bath_sink | 15 | 3 | 12 | 0 | false |

No SVG is runtime-ready. `ALLOW_CANDIDATE_AFTER_QA` means candidate-only package review may continue after all overlay batches and commander acceptance.

## Bath Sink Ledger

| Candidate | Source SVG Path | Plan Study Target | Render Evidence | Visual Similarity | Top-view Symbol | Duplicate Decision | Package Decision | canIncludeInRuntimePackage | Notes |
|---|---|---|---|---|---|---|---|---|---|
| B04-SINK-001 | `衛浴設備\平面\2.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_focused_page_05.png`, card #1625 | PASS | PASS | CANONICAL_RECT_BASIN | ALLOW_CANDIDATE_AFTER_QA | false | Clear rectangular counter basin with faucet; strong top-view candidate and not a whole bathroom fixture group. |
| B04-SINK-002 | `衛浴設備\平面\4.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_focused_page_05.png`, card #1627 | PASS | PASS | CANONICAL_COMPACT_BASIN | ALLOW_CANDIDATE_AFTER_QA | false | Compact square/rounded basin with faucet; useful distinct variant from 2.svg. |
| B04-SINK-003 | `衛浴設備\平面\AE02D2D.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_focused_page_05.png`, card #1630 | PASS_WITH_NOTES | PASS | CANONICAL_OVAL_BASIN | ALLOW_CANDIDATE_AFTER_QA | false | Oval basin / vanity top-view is readable but faint at contact-sheet scale; allow-after-QA only. |
| B04-SINK-004 | `衛浴設備\平面\AE07D2D.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_focused_page_05.png`, card #1633 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_AE02D2D | QUARANTINE | false | Similar oval basin family; quarantine duplicate to avoid package bloat. |
| B04-SINK-005 | `其他\未判定\A$C086B1D2D.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_02.html`, card #304 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; no focused basin render panel and no explicit overlay proof. |
| B04-SINK-006 | `其他\未判定\A$C1E967EE2.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_03.html`, card #413 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine until side-by-side crop proof. |
| B04-SINK-007 | `其他\未判定\A$C1F6C5D6E.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_03.html`, card #417 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine. |
| B04-SINK-008 | `其他\未判定\A$C47DC704C.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_06.html`, card #623 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine. |
| B04-SINK-009 | `其他\未判定\A$C5BC84928.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_07.html`, card #728 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine. |
| B04-SINK-010 | `其他\未判定\A$C65015AE7.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_08.html`, card #795 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine. |
| B04-SINK-011 | `其他\未判定\A$C662C17CB.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_08.html`, card #805 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine. |
| B04-SINK-012 | `其他\未判定\A$C67181380.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_08.html`, card #816 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine. |
| B04-SINK-013 | `其他\未判定\A$C748C16AE.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_09.html`, card #888 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine. |
| B04-SINK-014 | `其他\未判定\A$C7652417D.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_09.html`, card #897 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine. |
| B04-SINK-015 | `其他\未判定\A$C7F44343C.svg` | bath / vanity basin symbols in plan-study JPGs | `svg_unknown_page_10.html`, card #934 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C candidate; quarantine. |

## Batch 04 Decisions

Proceed to future package review only:

- `衛浴設備\平面\2.svg` as canonical rectangular basin.
- `衛浴設備\平面\4.svg` as canonical compact basin.
- `衛浴設備\平面\AE02D2D.svg` as oval basin candidate with notes.

Quarantine:

- `AE07D2D.svg` as duplicate of AE02D2D.
- all unknown-source A$C variants until rendered overlay proof exists.

Reject:

- none in Batch 04.

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

LOOP_4A_BATCH_04_OVERLAY_QA_EVIDENCE_READY

This is a docs-only QA evidence packet. It does not make any SVG runtime-ready. Runtime inclusion remains blocked until all category batches are completed, reviewed, deduplicated, and accepted by commander / reviewer.

## Next Automatic Task

If no new packet arrives in 20 minutes, proceed to Loop 4A Batch 05 for `table_dining`, with strict PASS / FAIL / QUARANTINE decisions and no runtime include.
