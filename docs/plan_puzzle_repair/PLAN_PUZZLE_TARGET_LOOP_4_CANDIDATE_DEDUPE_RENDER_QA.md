# Plan Puzzle Target Loop 4 Candidate Dedupe / Render QA

## Status
- owner: B_PLAN_PUZZLE_REPAIR_COMMANDER
- task: PLAN_PUZZLE_TARGET_LOOP_4_CANDIDATE_DEDUPE_RENDER_QA
- status: DOCS_ONLY_QA_PLAN_AND_RENDER_EVIDENCE
- runtime touched: no
- source SVG folders touched: no
- Plancraft core touched: no
- Budget Engine touched: no
- production furniture package touched: no

## Inputs
- candidate contract: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_4_FURNITURE_CANDIDATE_TEMPLATE_CONTRACT.md
- strict source audit: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_3_FURNITURE_BLOCK_AUDIT.md
- rendered SVG evidence folder: docs/plan_puzzle_repair/furniture_block_audit_work
- candidate rows confirmed in contract: 84
- direct include count: 0
- all candidates current QA status: QA_PENDING

## Render Evidence
The SVG library has browser-rendered contact sheets created inside the dedicated repair workspace:

| Evidence | Status | Notes |
|---|---|---|
| docs/plan_puzzle_repair/furniture_block_audit_work/svg_all_page_01.png through svg_all_page_19.png | EXISTS | Browser-rendered broad SVG gallery for visual audit. |
| docs/plan_puzzle_repair/furniture_block_audit_work/svg_focused_page_*.png | EXISTS | Focused SVG gallery used by strict Loop 3 audit. |
| docs/plan_puzzle_repair/test_assets/svg_relevant_candidate_gallery.jpg | EXISTS | Earlier representative gallery for relevant candidates. |
| Per-candidate black / white render sheet | PENDING | Required before runtime placement. |
| Plan-study overlay proof | PENDING | Required before runtime placement. |

## Category QA Matrix
| Category | Candidate count | Dedupe status | Render status | Overlay status | Runtime readiness |
|---|---:|---|---|---|---|
| bed | 11 | DEDUPE_REQUIRED | CONTACT_SHEET_EVIDENCE_EXISTS | OVERLAY_PENDING | NOT_RUNTIME_READY |
| seating | 8 | DEDUPE_REQUIRED | CONTACT_SHEET_EVIDENCE_EXISTS | OVERLAY_PENDING | NOT_RUNTIME_READY |
| table_dining | 20 | DEDUPE_REQUIRED_HIGH_RISK | CONTACT_SHEET_EVIDENCE_EXISTS | OVERLAY_PENDING | NOT_RUNTIME_READY |
| kitchen_cooktop | 8 | DEDUPE_REQUIRED | CONTACT_SHEET_EVIDENCE_EXISTS | OVERLAY_PENDING | NOT_RUNTIME_READY |
| kitchen_sink | 4 | DEDUPE_REQUIRED | CONTACT_SHEET_EVIDENCE_EXISTS | OVERLAY_PENDING | NOT_RUNTIME_READY |
| kitchen_refrigerator | 2 | DEDUPE_REQUIRED | CONTACT_SHEET_EVIDENCE_EXISTS | OVERLAY_PENDING | NOT_RUNTIME_READY |
| bath_sink | 15 | DEDUPE_REQUIRED_HIGH_RISK | CONTACT_SHEET_EVIDENCE_EXISTS | OVERLAY_PENDING | NOT_RUNTIME_READY |
| bath_toilet | 8 | DEDUPE_REQUIRED | CONTACT_SHEET_EVIDENCE_EXISTS | OVERLAY_PENDING | NOT_RUNTIME_READY |
| bath_tub | 8 | DEDUPE_REQUIRED | CONTACT_SHEET_EVIDENCE_EXISTS | OVERLAY_PENDING | NOT_RUNTIME_READY |

## Dedupe Rules
1. Keep the clearest top-view linework version per visual family.
2. Quarantine black-filled, noisy, cropped, rotated, or room-composition variants.
3. Do not keep duplicate anonymous `其他\未判定\A$...` files unless they are visibly cleaner than named category files.
4. Do not allow `櫃體`, `植栽`, `門窗`, elevation, decorative, symbol, or equipment blocks into this furniture candidate loop.
5. If a candidate cannot be matched to one of the 7 plan-study JPG positive examples, it returns to quarantine.
6. If a candidate renders poorly on white or dark canvas, it stays `QA_PENDING_RENDER_FIX_REQUIRED`.

## Representative Candidate Shortlist For Next QA
This shortlist is not an include list. It is the minimum representative set for the next overlay/render QA pass.

| Category | Representative IDs | Required next evidence |
|---|---|---|
| bed | PPF-CAND-001, PPF-CAND-002, PPF-CAND-028 | black / white render and bedroom plan overlay |
| seating | PPF-CAND-003, PPF-CAND-037, PPF-CAND-038 | living area overlay and label clarity |
| table_dining | PPF-CAND-004, PPF-CAND-044, PPF-CAND-060 | dining / tea-table overlay and dedupe |
| kitchen_cooktop | PPF-CAND-005, PPF-CAND-012, PPF-CAND-064 | kitchen appliance overlay and scale check |
| kitchen_sink | PPF-CAND-006, PPF-CAND-011, PPF-CAND-013 | sink plan overlay and scale check |
| kitchen_refrigerator | PPF-CAND-014, PPF-CAND-015 | REF area overlay and label policy |
| bath_sink | PPF-CAND-016, PPF-CAND-018, PPF-CAND-068 | bathroom basin overlay and render clarity |
| bath_toilet | PPF-CAND-020, PPF-CAND-021, PPF-CAND-084 | WC overlay and orientation check |
| bath_tub | PPF-CAND-024, PPF-CAND-066, PPF-CAND-075 | bath overlay and rectangular / oval variant check |

## Decision
- candidate contract: ACCEPTED_FOR_QA_ONLY
- direct package inclusion: DENIED
- runtime furniture placement repair: BLOCKED_UNTIL_DEDUPE_RENDER_OVERLAY_QA
- next owner: B_PLAN_PUZZLE_REPAIR_COMMANDER for QA evidence preparation; Furniture / Cabinet Builder remains gated.

## Next Automatic Task
If no new instruction arrives at the next anti-idle check, create per-category representative render/overlay evidence from the shortlist above, still without modifying runtime, Plancraft, Budget Engine, or source asset folders.
