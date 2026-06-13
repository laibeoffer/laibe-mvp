# Plan Puzzle Target Loop 4 Per-category Overlay Work Packet

## Status
- owner: B_PLAN_PUZZLE_REPAIR_COMMANDER
- task: PLAN_PUZZLE_TARGET_LOOP_4_PER_CATEGORY_OVERLAY_WORK_PACKET
- status: DOCS_ONLY_WORK_PACKET
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- Plancraft core touched: no
- Budget Engine touched: no
- direct include count: 0
- runtime gate: STILL_BLOCKED

## Purpose
This packet defines the exact next QA work needed before any Furniture / Cabinet Builder runtime repair can start. It does not approve any SVG for direct furniture package inclusion.

## Shared Pass / Fail Criteria
Pass requires all of the following:
1. Candidate SVG renders clearly in black on white and white on dark canvas.
2. Candidate shape is visually similar to a specific symbol in the assigned plan-study JPG region.
3. Candidate is a top-view block, not elevation, decoration, room composition, or annotation.
4. Candidate can be given a neutral label and default candidate-only dimensions.
5. Candidate remains `productionReady: false`, `budgetEligible: false`, and `exportAsCandidateOnly: true`.

Fail if any of the following appears:
1. Shape is only category-related by name but not visually similar.
2. Symbol is too noisy, cropped, filled, rotated, or unclear at plan scale.
3. Candidate duplicates a clearer candidate in the same category.
4. Candidate resembles door/window/core shell, material hatch, plant/landscape, or annotation.
5. Candidate would require Plancraft core, Budget Engine, or formal package changes.

## Overlay Work Items
| Category | Representative candidates | Source SVG paths | Plan-study JPG target | Crop / region target | Required output |
|---|---|---|---|---|---|
| bed | PPF-CAND-001, PPF-CAND-002, PPF-CAND-028 | `床具\平面\摨_1.svg`; `床具\平面\摨_2.svg`; `其他\未判定\_鈭箏_02.svg` | `04cab4865ffbca44474a0cc562ec1569.jpg` | Right-side bedrooms and lower bedroom areas showing rectangular beds with pillows / bedheads. | Pick one cleanest bed candidate or quarantine all unclear variants. |
| seating | PPF-CAND-003, PPF-CAND-037, PPF-CAND-038 | `沙發\平面\瘝_00.svg`; `其他\未判定\1e21g1.svg`; `其他\未判定\A$C15085DBF.svg` | `fee8a08da819a27bd7f1a30a862edad6.jpg` | Central living-room sofa / lounge zone around the main coffee table. | Verify sofa or seat-and-table top-view readability; reject room-group shapes. |
| table_dining | PPF-CAND-004, PPF-CAND-044, PPF-CAND-060 | `事務機器\平面\PDSK014.svg`; `其他\未判定\150.svg`; `其他\未判定\獢_璊_1.svg` | `45b17b8adc54fd8c6d274ef9821e342d.jpg` | Upper-right round dining table and chair cluster. | Deduplicate table/chair sets and keep only clean table-top symbol variants. |
| kitchen_cooktop | PPF-CAND-005, PPF-CAND-012, PPF-CAND-064 | `廚具設備\平面\13$74.svg`; `廚具設備\平面\KITCH1.svg`; `其他\未判定\A$C14F81C31.svg` | `fee8a08da819a27bd7f1a30a862edad6.jpg` | Lower central kitchen counter zone with cooktop / appliance symbols. | Confirm appliance-only symbol, not whole cabinet run. |
| kitchen_sink | PPF-CAND-006, PPF-CAND-011, PPF-CAND-013 | `廚具設備\平面\2KITC-AB.svg`; `廚具設備\平面\HTHTHTH.svg`; `廚具設備\平面\KITCH13.svg` | `fee8a08da819a27bd7f1a30a862edad6.jpg` | Lower central wet counter / kitchen sink zone. | Confirm basin-only symbol and reject whole-counter compositions. |
| kitchen_refrigerator | PPF-CAND-014, PPF-CAND-015 | `廚具設備\平面\KITCH45.svg`; `廚具設備\平面\KITCH46.svg` | `45b17b8adc54fd8c6d274ef9821e342d.jpg` | Kitchen / pantry zones marked by rectangular appliance or REF-like block. | Decide label policy: keep as `REF / refrigerator candidate` only if visual block is clear. |
| bath_sink | PPF-CAND-016, PPF-CAND-018, PPF-CAND-068 | `衛浴設備\平面\2.svg`; `衛浴設備\平面\AE02D2D.svg`; `其他\未判定\A$C086B1D2D.svg` | `45b17b8adc54fd8c6d274ef9821e342d.jpg` | Bathroom zones with vanity / wash basin symbols, especially left-side wet rooms. | Keep only basin symbols with clear top-view bowl / counter outline. |
| bath_toilet | PPF-CAND-020, PPF-CAND-021, PPF-CAND-084 | `衛浴設備\平面\TL2P-C01.svg`; `衛浴設備\平面\TL2P-C05.svg`; `其他\未判定\撠_靘踵_.svg` | `aea188d1216f20ef7bed5cdae4174b61.jpg` | Bathroom / WC zones with toilet bowl and tank top-view marks. | Confirm orientation, readable bowl / tank shape, and avoid side-view fixtures. |
| bath_tub | PPF-CAND-024, PPF-CAND-066, PPF-CAND-075 | `衛浴設備\平面\TL2P-F09.svg`; `其他\未判定\A$C0116197D.svg`; `其他\未判定\A$C47941496.svg` | `fee8a08da819a27bd7f1a30a862edad6.jpg` | Right-side bathroom / bathtub zone with rectangular tub symbol. | Confirm rectangular / oval tub is top-view and not a decorative or side-view fixture. |

## Required QA Artifact For Each Category
For each category above, the next QA agent must produce:
1. One cropped plan-study image region.
2. One rendered SVG candidate panel.
3. One side-by-side comparison.
4. A pass / fail / quarantine decision for each representative candidate.
5. A dedupe recommendation for the full category.

## Runtime Gate
Furniture / Cabinet Builder remains blocked until this packet is executed and the commander accepts the resulting overlay QA.

## Next Automatic Task
If no new instruction arrives at the next anti-idle check, create a docs-only QA checklist for executing this overlay packet. Runtime work remains forbidden.

## Loop 4A Split Decision Update
- decisionAt: 2026-06-12 Asia/Taipei
- loop4A: SVG Furniture Candidate Overlay QA
- furnitureSvgPackageRuntime: BLOCKED_UNTIL_OVERLAY_QA
- parametricFurnitureCabinetMvp: ALLOWED_TO_START
- direct include count: 0
- candidate count requiring overlay QA: 84
- runtime scope of this packet: none
- note: SVG furniture package runtime remains blocked, but basic parametric furniture / cabinet placement can proceed as candidate-only layout objects.

## Full 84-candidate Per-category Overlay Work Packet
Every row below remains `canIncludeInRuntimePackage: false until QA pass`. The `Source SVG` column names all QA_PENDING candidates in that category, not an approved package allowlist.

| Category | Candidate Count | Source SVG | Plan Study Target | Overlay Requirement | Pass Criteria | Fail Criteria | Next |
|---|---:|---|---|---|---|---|---|
| bed | 11 | `床具\平面\摨_1.svg`; `床具\平面\摨_2.svg`; `其他\未判定\_鈭箏_02.svg`; `其他\未判定\_鈭箏_10.svg`; `其他\未判定\_鈭箏_8.svg`; `其他\未判定\A$C0CCE426D.svg`; `其他\未判定\A$C34522901.svg`; `其他\未判定\A$C54A37BF1.svg`; `其他\未判定\A$C5AAA4E67.svg`; `其他\未判定\A$C6BC949F2.svg`; `其他\未判定\璊_摮_00.svg` | Bedroom bed symbols in the 7 plan-study JPGs, especially `04cab4865ffbca44474a0cc562ec1569.jpg` and `45b17b8adc54fd8c6d274ef9821e342d.jpg`. | Crop bedroom regions, render each SVG at plan scale, overlay or side-by-side compare against observed bed symbols. | Similar top-view bed body, pillow/headboard logic, readable at plan scale, duplicate policy selected. | Side/elevation view, whole-room group, unclear black fill, or no visible plan-study match. | Render QA contact sheet, per-candidate PASS/FAIL, dedupe one canonical bed if any pass. |
| seating | 8 | `沙發\平面\瘝_00.svg`; `其他\未判定\1e21g1.svg`; `其他\未判定\A$C15085DBF.svg`; `其他\未判定\A$C2F0631E8.svg`; `其他\未判定\A$C47D34BEE.svg`; `其他\未判定\A$C52D84EDD.svg`; `其他\未判定\A$C638B20A1.svg`; `其他\未判定\鈭_鈭箸_142-78.svg` | Living / lounge sofa and chair group symbols, especially `fee8a08da819a27bd7f1a30a862edad6.jpg`. | Compare each seat/sofa candidate with crop regions around living-room seating. | Recognizable top-view sofa/chair footprint, not room composition, not decorative. | Category name only, no matching footprint, too noisy or duplicated by clearer candidate. | Produce seating overlay panel and dedupe recommendation. |
| table_dining | 20 | `事務機器\平面\PDSK014.svg`; `其他\未判定\150.svg`; `其他\未判定\A$C02D410CF.svg`; `其他\未判定\A$C133A79B5.svg`; `其他\未判定\A$C179D2D71.svg`; `其他\未判定\A$C20A62B8E.svg`; `其他\未判定\A$C2C66799B.svg`; `其他\未判定\A$C3B195AE9.svg`; `其他\未判定\A$C3E045EAA.svg`; `其他\未判定\A$C431D7821.svg`; `其他\未判定\A$C4A3B3148.svg`; `其他\未判定\A$C5D466F91.svg`; `其他\未判定\A$C5D965E3A.svg`; `其他\未判定\A$C5DB30B85.svg`; `其他\未判定\A$C62673E99.svg`; `其他\未判定\A$C665A2105.svg`; `其他\未判定\A$C778E73CB.svg`; `其他\未判定\獢_璊_1.svg`; `其他\未判定\獢_璊_2.svg`; `其他\未判定\擗_獢_-_8.svg` | Dining / table-chair symbols across plan-study JPGs, especially `45b17b8adc54fd8c6d274ef9821e342d.jpg`. | Crop dining/table regions, compare round/rectangular table plus chair footprints. | Clean top-view table/chair symbol; scale and chair count reasonably match plan examples. | Desk/equipment shape unrelated to plan, line noise, annotation, or duplicate of clearer candidate. | Per-candidate overlay and duplicate collapse. |
| kitchen_cooktop | 8 | `廚具設備\平面\13$74.svg`; `廚具設備\平面\555.svg`; `廚具設備\平面\AD14D2D.svg`; `廚具設備\平面\AD15D2D.svg`; `廚具設備\平面\KITCH1.svg`; `其他\未判定\_--ar-111-4_.svg`; `其他\未判定\_餌_撟喳_.svg`; `其他\未判定\A$C14F81C31.svg` | Kitchen cooktop symbols in the plan-study JPGs, especially `fee8a08da819a27bd7f1a30a862edad6.jpg`. | Crop kitchen counter/cooktop zones and compare burner layout. | Clear plan-view cooktop only; neutral scale and readable burner marks. | Whole kitchen run, elevation, appliance not visible in plan, or ambiguous geometry. | Cooktop overlay panel, select canonical if pass. |
| kitchen_sink | 4 | `廚具設備\平面\2KITC-AB.svg`; `廚具設備\平面\8.svg`; `廚具設備\平面\HTHTHTH.svg`; `廚具設備\平面\KITCH13.svg` | Kitchen / wet counter sink symbols in the plan-study JPGs. | Crop wet counter regions and compare basin/tap/drainer geometry. | Basin top-view matches visible plan symbol and is not a whole counter. | Whole cabinet/counter, side view, or too noisy to separate basin. | Sink overlay panel and pass/quarantine list. |
| kitchen_refrigerator | 2 | `廚具設備\平面\KITCH45.svg`; `廚具設備\平面\KITCH46.svg` | REF / appliance rectangles in `45b17b8adc54fd8c6d274ef9821e342d.jpg` and `aea188d1216f20ef7bed5cdae4174b61.jpg`. | Compare rectangular appliance footprint and label strategy. | Clear refrigerator/appliance block and optional REF label policy agreed. | Just generic rectangle without plan evidence or unreadable label. | Refrigerator overlay panel and label rule. |
| bath_sink | 15 | `衛浴設備\平面\2.svg`; `衛浴設備\平面\4.svg`; `衛浴設備\平面\AE02D2D.svg`; `衛浴設備\平面\AE07D2D.svg`; `其他\未判定\A$C086B1D2D.svg`; `其他\未判定\A$C1E967EE2.svg`; `其他\未判定\A$C1F6C5D6E.svg`; `其他\未判定\A$C47DC704C.svg`; `其他\未判定\A$C5BC84928.svg`; `其他\未判定\A$C65015AE7.svg`; `其他\未判定\A$C662C17CB.svg`; `其他\未判定\A$C67181380.svg`; `其他\未判定\A$C748C16AE.svg`; `其他\未判定\A$C7652417D.svg`; `其他\未判定\A$C7F44343C.svg` | Bathroom vanity / wash basin symbols in the plan-study JPGs. | Crop wet-room vanity regions and compare basin footprint. | Top-view basin/counter outline matches plan symbols and is readable. | Plumbing/elevation/annotation/noisy fragment or duplicate of clearer basin. | Per-candidate basin overlay and dedupe. |
| bath_toilet | 8 | `衛浴設備\平面\TL2P-C01.svg`; `衛浴設備\平面\TL2P-C05.svg`; `衛浴設備\平面\TL2P-C09.svg`; `衛浴設備\平面\TL2P-C13.svg`; `其他\未判定\A$C00AB7B2C.svg`; `其他\未判定\A$C24966DAC.svg`; `其他\未判定\A$C2EEB7789.svg`; `其他\未判定\撠_靘踵_.svg` | WC/toilet symbols in wet-room plan-study regions, especially `aea188d1216f20ef7bed5cdae4174b61.jpg`. | Crop WC regions and compare bowl/tank top-view. | Bowl/tank shape recognizable at plan scale. | Side/elevation toilet, too abstract, or not matched in plan image. | Toilet overlay panel and canonical selection. |
| bath_tub | 8 | `衛浴設備\平面\TL2P-F09.svg`; `衛浴設備\平面\TL2P-F13.svg`; `衛浴設備\平面\TL2P-F17.svg`; `其他\未判定\A$C0116197D.svg`; `其他\未判定\A$C03D16BB4.svg`; `其他\未判定\A$C29DA3926.svg`; `其他\未判定\A$C2D4D0F45.svg`; `其他\未判定\A$C47941496.svg` | Bathtub symbols in bathroom plan-study crop regions. | Crop bathtub/wet-room regions and compare tub footprint. | Rectangular/oval tub top-view clear and scale plausible. | Fixture side-view, decorative oval, duplicate, or no plan match. | Bathtub overlay panel and quarantine unclear variants. |

## Required Fields Per Category
- category: table row category.
- source SVG path: all paths listed in `Source SVG`; none may be copied into runtime before QA pass.
- candidate count: row count from Loop 3 allow-candidate audit; total must remain 84.
- corresponding plan-study JPG: listed in `Plan Study Target`.
- target crop / region: described in `Overlay Requirement`.
- overlay method: crop plan region, render SVG at comparable scale, side-by-side plus optional translucent overlay.
- pass criteria / fail criteria: row-specific criteria above.
- naming rule: category prefix + normalized English type + source stem; duplicates receive `-altN` only after pass.
- duplicate handling: choose one canonical when shapes are equivalent; quarantine redundant/noisy variants.
- canAdvanceToRenderQA: true for all rows in this packet.
- canIncludeInRuntimePackage: false until per-candidate QA pass.
