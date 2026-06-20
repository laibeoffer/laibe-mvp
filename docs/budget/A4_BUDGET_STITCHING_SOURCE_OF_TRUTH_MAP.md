# A4 Budget Stitching Source Of Truth Map

This map distinguishes ingest sources, shared-truth documents, local evidence, and forbidden authority sources for `CORRECT_BUDGET_GENERATION_STITCHING`.

## 1. Candidate Ingest Source

`laibe_budget_ai_master_index.xlsx`

Path:
`Z:\08-Jacky\laibe_MVP_project\bugget\清單分類_20260605_0107\_AI_BUDGET_MASTER_INDEX_OUTPUT_20260617_132725\laibe_budget_ai_master_index.xlsx`

Status: ready for no-runtime ingest contract review. It is a human-review source/view and structured ingest evidence, not the runtime Budget Engine source by itself.

A4 may treat this workbook as AI/Budget Engine ingest source-of-truth only after contract review and shared-truth gate acceptance.

## 2. Workbook Source Areas

| Source area | Sheet | Authority |
|---|---|---|
| Standard work item master | `01_standard_work_item_master` | Candidate work-item identity |
| Price range index | `02_price_range_index` | Price evidence and review flags only |
| Trigger rules | `03_object_trigger_rules` | Candidate trigger mapping |
| Bundle rules | `04_budget_bundle_rules` | Candidate bundle mapping |
| Bundle items | `05_bundle_items` | Candidate item expansion |
| Dependency rules | `06_dependency_rules` | Candidate dependencies |
| Quantity rules | `07_quantity_rules` | Quantity-rule ids, not formal quantity |
| Puzzle mapping | `08_puzzle_mapping` | Plan Puzzle candidate mapping |
| Alias/material/method support | `09_ai_alias_index`, `10_material_method_index` | Retrieval support |
| Rejects | `11_rejects` | Excluded evidence only |
| Validation | `12_validation_report` | Workbook validation evidence |
| Public work mapping | `13_public_work_mapping` | Metadata only |

## 3. Existing Shared Truth / Boundary Inputs

- PR #104 shared-truth docs: merged and usable as docs baseline.
- PR #100 docs-only candidate area metadata: boundary only; not a production adapter and not a formal budget schema.
- Plan Puzzle / Plancraft+ 0.12 shared truth: alignment context only; no unverified geometry as quantity.
- Issue #89 harness gate: preserved; harness remains closed unless explicitly cleared.
- Runtime gap evidence: local evidence only until a runtime authorization task names exact files.

## 4. Target Runtime Concepts

- `BudgetInputBundle`: future input context, not created in this task.
- `BudgetCandidateLine`: candidate review line defined by A4 contract.
- `BudgetOutputSnapshot`: output-side authority after future generator and review gates.
- `FinalBudgetLine`: future formal line only after human review and formal-output authorization.

## 5. Forbidden Authority Sources

- Generated workbook as automatic engine truth before contract gate.
- UI/SVG/renderer preview/`.pc`/screenshot/unverified geometry as quantity source.
- Public work mapping as primary key or formal classification verdict.
- Reject rows as work items or price candidates.
- AI-generated prices or quantities.

Local `docs/budget/BG1_BUDGET_STITCHING_SOURCE_OF_TRUTH_MAP.md` may be referenced as local evidence but is not shared truth by itself.
