# Plan Puzzle Target Loop 4A Overlay QA Batch 02 Evidence

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- batch: Loop 4A Batch 02
- categories: kitchen_cooktop, bath_toilet, bath_tub
- checkedAt: 2026-06-12 05:46 Asia/Taipei
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- globalBlackboardWrite: false

## Source Evidence Checked

| Evidence | Path / Source | Use |
|---|---|---|
| SVG focused contact sheet | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_focused_page_04.png` | Kitchen cooktop render reference |
| SVG focused contact sheet | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_focused_page_05.png` | Bath toilet / tub render reference |
| SVG unknown contact sheets | `docs/plan_puzzle_repair/furniture_block_audit_work/svg_unknown_page_01..06.html` | Unknown-source candidate lookup |
| Loop 3 strict audit | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_3_FURNITURE_BLOCK_AUDIT.md` | Existing allow-candidate source and boundary |
| Plan-study positive examples | `Z:\08-Jacky\plan study\04cab4865ffbca44474a0cc562ec1569.jpg` | Cooktop, toilet, bath/tub plan examples |
| Plan-study positive examples | `Z:\08-Jacky\plan study\45b17b8adc54fd8c6d274ef9821e342d.jpg` | Kitchen, bath, toilet, bathtub references |
| Plan-study positive examples | `Z:\08-Jacky\plan study\aea188d1216f20ef7bed5cdae4174b61.jpg` | Kitchen and wet-room references |
| Plan-study positive examples | `Z:\08-Jacky\plan study\ffa0dee4a88032f3498544aaad331746.jpg` | Bath/toilet/tub references |

## Batch 02 Result Summary

| Category | Reviewed | ALLOW_CANDIDATE_AFTER_QA | QUARANTINE | REJECT | Runtime Include |
|---|---:|---:|---:|---:|---|
| kitchen_cooktop | 8 | 3 | 5 | 0 | false |
| bath_toilet | 8 | 2 | 6 | 0 | false |
| bath_tub | 8 | 1 | 7 | 0 | false |
| Total | 24 | 6 | 18 | 0 | false |

No SVG is runtime-ready. `ALLOW_CANDIDATE_AFTER_QA` means the candidate may proceed to future package review after all overlay batches, dedupe, and commander acceptance.

## Kitchen Cooktop Ledger

| Candidate | Source SVG Path | Plan Study Target | Render Evidence | Visual Similarity | Top-view Symbol | Duplicate Decision | Package Decision | canIncludeInRuntimePackage | Notes |
|---|---|---|---|---|---|---|---|---|---|
| B02-CK-001 | `廚具設備\平面\13$74.svg` | kitchen cooktop symbols in the 7 plan-study JPGs | `svg_focused_page_04.png`, card #1569 | PASS | PASS | UNIQUE_TWO_BURNER_WITH_KNOBS | ALLOW_CANDIDATE_AFTER_QA | false | Clear two-burner cooktop with control marks; not a full kitchen run. |
| B02-CK-002 | `廚具設備\平面\555.svg` | kitchen cooktop symbols in the 7 plan-study JPGs | `svg_focused_page_04.png`, card #1571 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_KITCH1 | QUARANTINE | false | Simple two-burner block overlaps with KITCH1; quarantine duplicate to avoid package bloat. |
| B02-CK-003 | `廚具設備\平面\AD14D2D.svg` | kitchen cooktop symbols in the 7 plan-study JPGs | `svg_focused_page_04.png`, card #1588 | PASS | PASS | CANONICAL_FOUR_BURNER | ALLOW_CANDIDATE_AFTER_QA | false | Clean four-burner cooktop / side-control footprint; useful distinct variant. |
| B02-CK-004 | `廚具設備\平面\AD15D2D.svg` | kitchen cooktop symbols in the 7 plan-study JPGs | `svg_focused_page_04.png`, card #1589 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_AD14D2D | QUARANTINE | false | Similar four-burner footprint; keep quarantined as alternate. |
| B02-CK-005 | `廚具設備\平面\KITCH1.svg` | kitchen cooktop symbols in the 7 plan-study JPGs | `svg_focused_page_04.png`, card #1599 | PASS | PASS | CANONICAL_SIMPLE_TWO_BURNER | ALLOW_CANDIDATE_AFTER_QA | false | Strong clean two-burner symbol that matches plan-study cooktop marks and is readable at small scale. |
| B02-CK-006 | `其他\未判定\_--ar-111-4_.svg` | kitchen cooktop symbols in the 7 plan-study JPGs | `svg_unknown_page_01.html`, card #197 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source candidate; no focused render proof in the kitchen contact sheet. Quarantine until rendered side-by-side. |
| B02-CK-007 | `其他\未判定\_擗..._.svg` | kitchen cooktop symbols in the 7 plan-study JPGs | Loop 3 audit text only | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Path is mojibake/ambiguous and not located in the focused render sheet during this batch. Do not advance without a clean rendered asset reference. |
| B02-CK-008 | `其他\未判定\A$C14F81C31.svg` | kitchen cooktop symbols in the 7 plan-study JPGs | `svg_unknown_page_03.html`, card #368 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C block may be cooktop-like per Loop 3, but lacks focused overlay proof. Quarantine. |

## Bath Toilet Ledger

| Candidate | Source SVG Path | Plan Study Target | Render Evidence | Visual Similarity | Top-view Symbol | Duplicate Decision | Package Decision | canIncludeInRuntimePackage | Notes |
|---|---|---|---|---|---|---|---|---|---|
| B02-WC-001 | `衛浴設備\平面\TL2P-C01.svg` | WC/toilet symbols in bath plan-study regions | `svg_focused_page_05.png`, card #1660 | PASS | PASS | CANONICAL_TOILET | ALLOW_CANDIDATE_AFTER_QA | false | Clear bowl + tank top-view. Rotation can cover orientation differences. |
| B02-WC-002 | `衛浴設備\平面\TL2P-C05.svg` | WC/toilet symbols in bath plan-study regions | `svg_focused_page_05.png`, card #1661 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_TL2P_C01 | QUARANTINE | false | Similar toilet with minor shape difference; quarantine duplicate. |
| B02-WC-003 | `衛浴設備\平面\TL2P-C09.svg` | WC/toilet symbols in bath plan-study regions | `svg_focused_page_05.png`, card #1662 | PASS | PASS | COMPACT_TOILET_ALT | ALLOW_CANDIDATE_AFTER_QA | false | Distinct compact rounded bowl; useful as a second canonical toilet shape. |
| B02-WC-004 | `衛浴設備\平面\TL2P-C13.svg` | WC/toilet symbols in bath plan-study regions | `svg_focused_page_05.png`, card #1663 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_TL2P_C09 | QUARANTINE | false | Similar compact toilet; quarantine duplicate. |
| B02-WC-005 | `其他\未判定\A$C00AB7B2C.svg` | WC/toilet symbols in bath plan-study regions | `svg_unknown_page_01.html`, card #263 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Loop 3 says toilet-like, but not in focused bath contact sheet. Needs rendered overlay before advancement. |
| B02-WC-006 | `其他\未判定\A$C24966DAC.svg` | WC/toilet symbols in bath plan-study regions | `svg_unknown_page_04.html`, card #445 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C block; quarantine until side-by-side overlay. |
| B02-WC-007 | `其他\未判定\A$C2EEB7789.svg` | WC/toilet symbols in bath plan-study regions | `svg_unknown_page_04.html`, card #502 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source A$C block; quarantine until side-by-side overlay. |
| B02-WC-008 | `其他\未判定\撠_靘踵_.svg` | WC/toilet symbols in bath plan-study regions | Loop 3 audit text only | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Mojibake path and no focused render reference in this batch. Quarantine. |

## Bath Tub Ledger

| Candidate | Source SVG Path | Plan Study Target | Render Evidence | Visual Similarity | Top-view Symbol | Duplicate Decision | Package Decision | canIncludeInRuntimePackage | Notes |
|---|---|---|---|---|---|---|---|---|---|
| B02-TUB-001 | `衛浴設備\平面\TL2P-F09.svg` | bathtub symbols in master bath / wet-room plan-study regions | `svg_focused_page_05.png`, card #1668 | PASS | PASS | CANONICAL_RECT_TUB | ALLOW_CANDIDATE_AFTER_QA | false | Clear top-view bathtub with outline and drain logic. Best canonical tub in this batch. |
| B02-TUB-002 | `衛浴設備\平面\TL2P-F13.svg` | bathtub symbols in master bath / wet-room plan-study regions | `svg_focused_page_05.png`, card #1669 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_TL2P_F09 | QUARANTINE | false | Similar tub with minor shape variation; quarantine duplicate until package owner asks for alternate. |
| B02-TUB-003 | `衛浴設備\平面\TL2P-F17.svg` | bathtub symbols in master bath / wet-room plan-study regions | `svg_focused_page_05.png`, card #1670 | PASS_WITH_NOTES | PASS | DUPLICATE_OF_TL2P_F09 | QUARANTINE | false | Similar rectangular tub; quarantine duplicate. |
| B02-TUB-004 | `其他\未判定\A$C0116197D.svg` | bathtub symbols in master bath / wet-room plan-study regions | `svg_unknown_page_01.html`, card #265 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source tub-like candidate; no focused render overlay in this batch. |
| B02-TUB-005 | `其他\未判定\A$C03D16BB4.svg` | bathtub symbols in master bath / wet-room plan-study regions | `svg_unknown_page_02.html`, card #286 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source tub-like candidate; quarantine. |
| B02-TUB-006 | `其他\未判定\A$C29DA3926.svg` | bathtub symbols in master bath / wet-room plan-study regions | `svg_unknown_page_04.html`, card #476 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source tub-like candidate; quarantine. |
| B02-TUB-007 | `其他\未判定\A$C2D4D0F45.svg` | bathtub symbols in master bath / wet-room plan-study regions | `svg_unknown_page_04.html`, card #497 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source tub-like candidate; quarantine. |
| B02-TUB-008 | `其他\未判定\A$C47941496.svg` | bathtub symbols in master bath / wet-room plan-study regions | `svg_unknown_page_06.html`, card #621 | PARTIAL | UNKNOWN | UNKNOWN_SOURCE_RISK | QUARANTINE | false | Unknown-source tub-like candidate; quarantine. |

## Batch 02 Decisions

Proceed to future package review only:

- `13$74.svg`, `AD14D2D.svg`, and `KITCH1.svg` as cooktop candidates.
- `TL2P-C01.svg` and `TL2P-C09.svg` as toilet candidates.
- `TL2P-F09.svg` as bathtub candidate.

Quarantine:

- all duplicate, unknown-source, whole-composition-risk, or alternate variants listed above.

Reject:

- none in Batch 02.

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

LOOP_4A_BATCH_02_OVERLAY_QA_EVIDENCE_READY

This is a docs-only QA evidence packet. It does not make any SVG runtime-ready. Runtime inclusion remains blocked until all category batches are completed, reviewed, deduplicated, and accepted by commander / reviewer.

## Next Automatic Task

If no new packet arrives in 20 minutes, proceed to Loop 4A Batch 03 for `seating` and `bed`, with strict PASS / FAIL / QUARANTINE decisions and no runtime include.
