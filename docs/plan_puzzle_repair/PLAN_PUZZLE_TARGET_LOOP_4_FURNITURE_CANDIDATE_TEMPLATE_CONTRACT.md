# Plan Puzzle Target Loop 4 Furniture Candidate Template Contract

## Scope
- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- source audit: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_3_FURNITURE_BLOCK_AUDIT.md
- source SVG root: Z:\08-Jacky\svg_blocks
- plan-study root: Z:\08-Jacky\plan study
- source SVG count: 1826
- allow candidates from Loop 3: 84
- direct include count: 0
- can include now: false
- status: DOCS_ONLY_CANDIDATE_CONTRACT

## Non-pollution Rule
- No candidate in this file is approved for direct furniture-package inclusion.
- Every row remains `QA_PENDING`.
- All 1742 non-candidate SVG blocks remain quarantined.
- All `PARTIAL_REVIEW_REQUIRED` SVG blocks remain quarantined.
- This contract does not modify runtime, Plancraft core, source SVG folders, Budget Engine, or any production package.

## Candidate Template Fields
Future candidate-only runtime placement may use this neutral shape. It must not be treated as production furniture data.

```json
{
  "candidateId": "PPF-CAND-000",
  "sourceSvgPath": "relative/path.svg",
  "label": "candidate label",
  "category": "bed | seating | table_dining | kitchen_cooktop | kitchen_sink | kitchen_refrigerator | bath_sink | bath_toilet | bath_tub",
  "defaultWidthMm": 0,
  "defaultDepthMm": 0,
  "defaultHeightMm": null,
  "rotationAllowed": true,
  "resizeAllowed": true,
  "materialTagAllowed": false,
  "exportAsCandidateOnly": true,
  "qaStatus": "QA_PENDING",
  "productionReady": false,
  "budgetEligible": false
}
```

## Default Candidate Dimensions
These are temporary candidate defaults for browser placement QA only. They are not product specifications, formal quantities, or budget inputs.

| Category | Count | defaultWidthMm | defaultDepthMm | Notes |
|---|---:|---:|---:|---|
| bed | 11 | 1500 | 2000 | Candidate bed symbol only. |
| seating | 8 | 1800 | 900 | Candidate sofa / chair / tea-table group. |
| table_dining | 20 | 1600 | 900 | Candidate table or dining group. |
| kitchen_cooktop | 8 | 600 | 600 | Candidate cooktop appliance only. |
| kitchen_sink | 4 | 800 | 500 | Candidate sink symbol only. |
| kitchen_refrigerator | 2 | 700 | 700 | Candidate REF / refrigerator symbol only. |
| bath_sink | 15 | 600 | 500 | Candidate wash basin symbol only. |
| bath_toilet | 8 | 700 | 450 | Candidate toilet symbol only. |
| bath_tub | 8 | 1700 | 750 | Candidate bathtub symbol only. |

## Candidate Register
| Candidate ID | Category | Source SVG path | QA status |
|---|---|---|---|
| PPF-CAND-001 | bed | `床具\平面\摨_1.svg` | QA_PENDING |
| PPF-CAND-002 | bed | `床具\平面\摨_2.svg` | QA_PENDING |
| PPF-CAND-003 | seating | `沙發\平面\瘝_00.svg` | QA_PENDING |
| PPF-CAND-004 | table_dining | `事務機器\平面\PDSK014.svg` | QA_PENDING |
| PPF-CAND-005 | kitchen_cooktop | `廚具設備\平面\13$74.svg` | QA_PENDING |
| PPF-CAND-006 | kitchen_sink | `廚具設備\平面\2KITC-AB.svg` | QA_PENDING |
| PPF-CAND-007 | kitchen_cooktop | `廚具設備\平面\555.svg` | QA_PENDING |
| PPF-CAND-008 | kitchen_sink | `廚具設備\平面\8.svg` | QA_PENDING |
| PPF-CAND-009 | kitchen_cooktop | `廚具設備\平面\AD14D2D.svg` | QA_PENDING |
| PPF-CAND-010 | kitchen_cooktop | `廚具設備\平面\AD15D2D.svg` | QA_PENDING |
| PPF-CAND-011 | kitchen_sink | `廚具設備\平面\HTHTHTH.svg` | QA_PENDING |
| PPF-CAND-012 | kitchen_cooktop | `廚具設備\平面\KITCH1.svg` | QA_PENDING |
| PPF-CAND-013 | kitchen_sink | `廚具設備\平面\KITCH13.svg` | QA_PENDING |
| PPF-CAND-014 | kitchen_refrigerator | `廚具設備\平面\KITCH45.svg` | QA_PENDING |
| PPF-CAND-015 | kitchen_refrigerator | `廚具設備\平面\KITCH46.svg` | QA_PENDING |
| PPF-CAND-016 | bath_sink | `衛浴設備\平面\2.svg` | QA_PENDING |
| PPF-CAND-017 | bath_sink | `衛浴設備\平面\4.svg` | QA_PENDING |
| PPF-CAND-018 | bath_sink | `衛浴設備\平面\AE02D2D.svg` | QA_PENDING |
| PPF-CAND-019 | bath_sink | `衛浴設備\平面\AE07D2D.svg` | QA_PENDING |
| PPF-CAND-020 | bath_toilet | `衛浴設備\平面\TL2P-C01.svg` | QA_PENDING |
| PPF-CAND-021 | bath_toilet | `衛浴設備\平面\TL2P-C05.svg` | QA_PENDING |
| PPF-CAND-022 | bath_toilet | `衛浴設備\平面\TL2P-C09.svg` | QA_PENDING |
| PPF-CAND-023 | bath_toilet | `衛浴設備\平面\TL2P-C13.svg` | QA_PENDING |
| PPF-CAND-024 | bath_tub | `衛浴設備\平面\TL2P-F09.svg` | QA_PENDING |
| PPF-CAND-025 | bath_tub | `衛浴設備\平面\TL2P-F13.svg` | QA_PENDING |
| PPF-CAND-026 | bath_tub | `衛浴設備\平面\TL2P-F17.svg` | QA_PENDING |
| PPF-CAND-027 | kitchen_cooktop | `其他\未判定\_--ar-111-4_.svg` | QA_PENDING |
| PPF-CAND-028 | bed | `其他\未判定\_鈭箏_02.svg` | QA_PENDING |
| PPF-CAND-029 | bed | `其他\未判定\_鈭箏_10.svg` | QA_PENDING |
| PPF-CAND-030 | bed | `其他\未判定\_鈭箏_8.svg` | QA_PENDING |
| PPF-CAND-031 | bed | `其他\未判定\A$C0CCE426D.svg` | QA_PENDING |
| PPF-CAND-032 | bed | `其他\未判定\A$C34522901.svg` | QA_PENDING |
| PPF-CAND-033 | bed | `其他\未判定\A$C54A37BF1.svg` | QA_PENDING |
| PPF-CAND-034 | bed | `其他\未判定\A$C5AAA4E67.svg` | QA_PENDING |
| PPF-CAND-035 | bed | `其他\未判定\A$C6BC949F2.svg` | QA_PENDING |
| PPF-CAND-036 | bed | `其他\未判定\璊_摮_00.svg` | QA_PENDING |
| PPF-CAND-037 | seating | `其他\未判定\1e21g1.svg` | QA_PENDING |
| PPF-CAND-038 | seating | `其他\未判定\A$C15085DBF.svg` | QA_PENDING |
| PPF-CAND-039 | seating | `其他\未判定\A$C2F0631E8.svg` | QA_PENDING |
| PPF-CAND-040 | seating | `其他\未判定\A$C47D34BEE.svg` | QA_PENDING |
| PPF-CAND-041 | seating | `其他\未判定\A$C52D84EDD.svg` | QA_PENDING |
| PPF-CAND-042 | seating | `其他\未判定\A$C638B20A1.svg` | QA_PENDING |
| PPF-CAND-043 | seating | `其他\未判定\鈭_鈭箸_142-78.svg` | QA_PENDING |
| PPF-CAND-044 | table_dining | `其他\未判定\150.svg` | QA_PENDING |
| PPF-CAND-045 | table_dining | `其他\未判定\A$C02D410CF.svg` | QA_PENDING |
| PPF-CAND-046 | table_dining | `其他\未判定\A$C133A79B5.svg` | QA_PENDING |
| PPF-CAND-047 | table_dining | `其他\未判定\A$C179D2D71.svg` | QA_PENDING |
| PPF-CAND-048 | table_dining | `其他\未判定\A$C20A62B8E.svg` | QA_PENDING |
| PPF-CAND-049 | table_dining | `其他\未判定\A$C2C66799B.svg` | QA_PENDING |
| PPF-CAND-050 | table_dining | `其他\未判定\A$C3B195AE9.svg` | QA_PENDING |
| PPF-CAND-051 | table_dining | `其他\未判定\A$C3E045EAA.svg` | QA_PENDING |
| PPF-CAND-052 | table_dining | `其他\未判定\A$C431D7821.svg` | QA_PENDING |
| PPF-CAND-053 | table_dining | `其他\未判定\A$C4A3B3148.svg` | QA_PENDING |
| PPF-CAND-054 | table_dining | `其他\未判定\A$C5D466F91.svg` | QA_PENDING |
| PPF-CAND-055 | table_dining | `其他\未判定\A$C5D965E3A.svg` | QA_PENDING |
| PPF-CAND-056 | table_dining | `其他\未判定\A$C5DB30B85.svg` | QA_PENDING |
| PPF-CAND-057 | table_dining | `其他\未判定\A$C62673E99.svg` | QA_PENDING |
| PPF-CAND-058 | table_dining | `其他\未判定\A$C665A2105.svg` | QA_PENDING |
| PPF-CAND-059 | table_dining | `其他\未判定\A$C778E73CB.svg` | QA_PENDING |
| PPF-CAND-060 | table_dining | `其他\未判定\獢_璊_1.svg` | QA_PENDING |
| PPF-CAND-061 | table_dining | `其他\未判定\獢_璊_2.svg` | QA_PENDING |
| PPF-CAND-062 | table_dining | `其他\未判定\擗_獢_-_8.svg` | QA_PENDING |
| PPF-CAND-063 | kitchen_cooktop | `其他\未判定\_餌_撟喳_.svg` | QA_PENDING |
| PPF-CAND-064 | kitchen_cooktop | `其他\未判定\A$C14F81C31.svg` | QA_PENDING |
| PPF-CAND-065 | bath_toilet | `其他\未判定\A$C00AB7B2C.svg` | QA_PENDING |
| PPF-CAND-066 | bath_tub | `其他\未判定\A$C0116197D.svg` | QA_PENDING |
| PPF-CAND-067 | bath_tub | `其他\未判定\A$C03D16BB4.svg` | QA_PENDING |
| PPF-CAND-068 | bath_sink | `其他\未判定\A$C086B1D2D.svg` | QA_PENDING |
| PPF-CAND-069 | bath_sink | `其他\未判定\A$C1E967EE2.svg` | QA_PENDING |
| PPF-CAND-070 | bath_sink | `其他\未判定\A$C1F6C5D6E.svg` | QA_PENDING |
| PPF-CAND-071 | bath_toilet | `其他\未判定\A$C24966DAC.svg` | QA_PENDING |
| PPF-CAND-072 | bath_tub | `其他\未判定\A$C29DA3926.svg` | QA_PENDING |
| PPF-CAND-073 | bath_tub | `其他\未判定\A$C2D4D0F45.svg` | QA_PENDING |
| PPF-CAND-074 | bath_toilet | `其他\未判定\A$C2EEB7789.svg` | QA_PENDING |
| PPF-CAND-075 | bath_tub | `其他\未判定\A$C47941496.svg` | QA_PENDING |
| PPF-CAND-076 | bath_sink | `其他\未判定\A$C47DC704C.svg` | QA_PENDING |
| PPF-CAND-077 | bath_sink | `其他\未判定\A$C5BC84928.svg` | QA_PENDING |
| PPF-CAND-078 | bath_sink | `其他\未判定\A$C65015AE7.svg` | QA_PENDING |
| PPF-CAND-079 | bath_sink | `其他\未判定\A$C662C17CB.svg` | QA_PENDING |
| PPF-CAND-080 | bath_sink | `其他\未判定\A$C67181380.svg` | QA_PENDING |
| PPF-CAND-081 | bath_sink | `其他\未判定\A$C748C16AE.svg` | QA_PENDING |
| PPF-CAND-082 | bath_sink | `其他\未判定\A$C7652417D.svg` | QA_PENDING |
| PPF-CAND-083 | bath_sink | `其他\未判定\A$C7F44343C.svg` | QA_PENDING |
| PPF-CAND-084 | bath_toilet | `其他\未判定\撠_靘踵_.svg` | QA_PENDING |

## QA Gates Before Any Runtime Use
1. Deduplicate visually equivalent symbols inside each category.
2. Produce a black / white render screenshot for every surviving candidate.
3. Overlay at least one representative from each category against plan-study evidence.
4. Confirm each source SVG can be rendered in browser without console errors.
5. Confirm every candidate is exported only as `furnitureCandidate`, not as formal product, quantity, estimate, or quote.
6. Keep all uncertain, noisy, partial, duplicate, or category-mismatched assets in quarantine.

## Builder Dispatch Boundary
Furniture / Cabinet Builder may start only after this contract is accepted by the commander. Even then:
- candidate placement must be browser-verifiable;
- candidate data must be exportable as candidate-only JSON;
- candidate data must not enter Budget Engine;
- candidate data must not modify Plancraft core;
- candidate data must not become a formal furniture package.
