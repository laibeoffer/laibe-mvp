# Plan Puzzle Target Loop 4A SVG Overlay QA Consolidation Packet

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 4A
- task: SVG Furniture Candidate Overlay QA consolidation
- checkedAt: 2026-06-12 06:46 Asia/Taipei
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- globalBlackboardWrite: false

## Consolidated Gate

furnitureSvgPackageRuntime: BLOCKED_UNTIL_REVIEWED_DEDUPED_ACCEPTANCE

No SVG candidate is included in runtime. Batch decisions only identify candidates that may proceed to future candidate-only package review. Runtime inclusion remains blocked until reviewer / commander acceptance and explicit package integration scope approval.

## Batch Coverage Summary

| Batch | Categories | Reviewed | ALLOW_CANDIDATE_AFTER_QA | QUARANTINE | REJECT | Runtime Include |
|---:|---|---:|---:|---:|---:|---|
| 01 | kitchen_refrigerator / kitchen_sink | 6 | 3 | 3 | 0 | false |
| 02 | kitchen_cooktop / bath_toilet / bath_tub | 24 | 6 | 18 | 0 | false |
| 03 | seating / bed | 19 | 4 | 15 | 0 | false |
| 04 | bath_sink | 15 | 3 | 12 | 0 | false |
| 05 | table_dining | 20 | 4 | 16 | 0 | false |
| Total | 9 categories | 84 | 20 | 64 | 0 | false |

## Allow-after-QA Canonical Candidate Ledger

These 20 rows are not runtime includes. They are only candidates that may continue to reviewer / commander package acceptance.

| Category | Candidate | Source SVG Path | Batch | Decision | Runtime Include | Notes |
|---|---|---|---:|---|---|---|
| kitchen_refrigerator | KITCH45 | `廚具設備\平面\KITCH45.svg` | 01 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical refrigerator / REF-like appliance candidate. |
| kitchen_sink | 2KITC-AB | `廚具設備\平面\2KITC-AB.svg` | 01 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical single-basin sink candidate. |
| kitchen_sink | HTHTHTH | `廚具設備\平面\HTHTHTH.svg` | 01 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical drainer-sink candidate. |
| kitchen_cooktop | 13$74 | `廚具設備\平面\13$74.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | false | Two-burner cooktop with controls. |
| kitchen_cooktop | AD14D2D | `廚具設備\平面\AD14D2D.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | false | Four-burner cooktop candidate. |
| kitchen_cooktop | KITCH1 | `廚具設備\平面\KITCH1.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | false | Simple two-burner cooktop candidate. |
| bath_toilet | TL2P-C01 | `衛浴設備\平面\TL2P-C01.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical toilet candidate. |
| bath_toilet | TL2P-C09 | `衛浴設備\平面\TL2P-C09.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | false | Compact toilet alternate candidate. |
| bath_tub | TL2P-F09 | `衛浴設備\平面\TL2P-F09.svg` | 02 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical bathtub candidate. |
| seating | sofa group | `沙發\平面\瘝_00.svg` | 03 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical sofa / seating group. |
| seating | alternate seating | `其他\未判定\1e21g1.svg` | 03 | ALLOW_CANDIDATE_AFTER_QA | false | Source-risked alternate seating candidate. |
| bed | canonical bed | `床具\平面\摨_1.svg` | 03 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical bed candidate. |
| bed | alternate bed | `其他\未判定\_鈭箏_02.svg` | 03 | ALLOW_CANDIDATE_AFTER_QA | false | Source-risked alternate bed candidate. |
| bath_sink | rectangular basin | `衛浴設備\平面\2.svg` | 04 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical rectangular basin. |
| bath_sink | compact basin | `衛浴設備\平面\4.svg` | 04 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical compact basin. |
| bath_sink | oval basin | `衛浴設備\平面\AE02D2D.svg` | 04 | ALLOW_CANDIDATE_AFTER_QA | false | Oval basin candidate with notes. |
| table_dining | round dining cluster | `事務機器\平面\PDSK014.svg` | 05 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical round dining table/chair cluster. |
| table_dining | rectangular dining cluster | `其他\未判定\A$C02D410CF.svg` | 05 | ALLOW_CANDIDATE_AFTER_QA | false | Canonical rectangular dining table/chair cluster. |
| table_dining | compact round table | `其他\未判定\A$C431D7821.svg` | 05 | ALLOW_CANDIDATE_AFTER_QA | false | Compact round table/chair candidate. |
| table_dining | alternate round dining | `其他\未判定\獢_璊_1.svg` | 05 | ALLOW_CANDIDATE_AFTER_QA | false | Alternate round dining candidate pending final dedupe. |

## Quarantine Ledger by Category

All quarantined candidates remain excluded from runtime and package assets.

| Category | Quarantine Count | Source SVG Paths / IDs | Primary Reason |
|---|---:|---|---|
| kitchen_refrigerator | 1 | `廚具設備\平面\KITCH46.svg` | Duplicate / alternate refrigerator variant. |
| kitchen_sink | 2 | `廚具設備\平面\KITCH13.svg`; `廚具設備\平面\8.svg` | Whole-counter risk or duplicate / ambiguous sink variant. |
| kitchen_cooktop | 5 | `廚具設備\平面\555.svg`; `廚具設備\平面\AD15D2D.svg`; `其他\未判定\_--ar-111-4_.svg`; `其他\未判定\_餌_撟喳_.svg`; `其他\未判定\A$C14F81C31.svg` | Duplicate, unknown-source, or insufficient focused overlay proof. |
| bath_toilet | 6 | `衛浴設備\平面\TL2P-C05.svg`; `衛浴設備\平面\TL2P-C13.svg`; `其他\未判定\A$C00AB7B2C.svg`; `其他\未判定\A$C24966DAC.svg`; `其他\未判定\A$C2EEB7789.svg`; `其他\未判定\撠_靘踵_.svg` | Duplicate or unknown-source toilet candidates. |
| bath_tub | 7 | `衛浴設備\平面\TL2P-F13.svg`; `衛浴設備\平面\TL2P-F17.svg`; `其他\未判定\A$C0116197D.svg`; `其他\未判定\A$C03D16BB4.svg`; `其他\未判定\A$C29DA3926.svg`; `其他\未判定\A$C2D4D0F45.svg`; `其他\未判定\A$C47941496.svg` | Duplicate tub variants or unknown-source risk. |
| seating | 6 | `其他\未判定\A$C15085DBF.svg`; `其他\未判定\A$C2F0631E8.svg`; `其他\未判定\A$C47D34BEE.svg`; `其他\未判定\A$C52D84EDD.svg`; `其他\未判定\A$C638B20A1.svg`; `其他\未判定\鈭_鈭箸_142-78.svg` | Unknown-source / room-group / weak overlay proof. |
| bed | 9 | `床具\平面\摨_2.svg`; `其他\未判定\_鈭箏_10.svg`; `其他\未判定\_鈭箏_8.svg`; `其他\未判定\A$C0CCE426D.svg`; `其他\未判定\A$C34522901.svg`; `其他\未判定\A$C54A37BF1.svg`; `其他\未判定\A$C5AAA4E67.svg`; `其他\未判定\A$C6BC949F2.svg`; `其他\未判定\璊_摮_00.svg` | Duplicate / unknown-source / mojibake-path bed variants. |
| bath_sink | 12 | `衛浴設備\平面\AE07D2D.svg`; `其他\未判定\A$C086B1D2D.svg`; `其他\未判定\A$C1E967EE2.svg`; `其他\未判定\A$C1F6C5D6E.svg`; `其他\未判定\A$C47DC704C.svg`; `其他\未判定\A$C5BC84928.svg`; `其他\未判定\A$C65015AE7.svg`; `其他\未判定\A$C662C17CB.svg`; `其他\未判定\A$C67181380.svg`; `其他\未判定\A$C748C16AE.svg`; `其他\未判定\A$C7652417D.svg`; `其他\未判定\A$C7F44343C.svg` | Duplicate basin or unknown-source risk. |
| table_dining | 16 | `其他\未判定\150.svg`; `其他\未判定\A$C133A79B5.svg`; `其他\未判定\A$C179D2D71.svg`; `其他\未判定\A$C20A62B8E.svg`; `其他\未判定\A$C2C66799B.svg`; `其他\未判定\A$C3B195AE9.svg`; `其他\未判定\A$C3E045EAA.svg`; `其他\未判定\A$C4A3B3148.svg`; `其他\未判定\A$C5D466F91.svg`; `其他\未判定\A$C5D965E3A.svg`; `其他\未判定\A$C5DB30B85.svg`; `其他\未判定\A$C62673E99.svg`; `其他\未判定\A$C665A2105.svg`; `其他\未判定\A$C778E73CB.svg`; `其他\未判定\獢_璊_2.svg`; `其他\未判定\擗_獢_-_8.svg` | Duplicate, annotation-heavy, faint, or low plan-scale confidence. |

## Reject Ledger

| Count | Decision |
|---:|---|
| 0 | No candidate was hard-rejected in the initial overlay evidence pass. Non-allowed rows remain quarantined instead of included. |

## Runtime Boundary

- canIncludeInRuntimePackage: false for all 84 rows
- direct include count: 0
- copied SVG count: 0
- runtime furniture package changed: no
- parametric furniture / cabinet MVP: unaffected and still candidate-only
- package acceptance required before any future SVG runtime integration

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

LOOP_4A_CONSOLIDATION_PACKET_READY

The initial 84-candidate overlay QA pass is consolidated. This packet does not approve runtime inclusion. It creates a reviewer-ready candidate boundary: 20 allow-after-QA rows, 64 quarantined rows, 0 rejected rows, 0 runtime includes.

## Next Automatic Task

If no new packet arrives in 20 minutes, prepare a Loop 4A reviewer gate packet that asks for explicit acceptance / rejection of the 20 allow-after-QA candidates and keeps all SVG runtime inclusion disabled until accepted.
