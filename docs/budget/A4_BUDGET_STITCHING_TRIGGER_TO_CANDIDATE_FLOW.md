# A4 Budget Stitching Trigger To Candidate Flow

This is a no-runtime flow contract. It does not implement the flow.

## 1. Flow

1. Plan Puzzle object/context
2. Trigger rule
3. Bundle rule
4. Bundle items
5. Dependency rules
6. Quantity rule
7. Standard work item lookup
8. Price range evidence
9. `BudgetCandidateLine`
10. Human review
11. Final output gate

## 2. Guard Notes

- AI does not infer final quantity.
- AI does not infer final price.
- The system creates `BudgetCandidateLine` only.
- Candidate output goes to human review gate.
- `zero_price_review` rows cannot become formal price.
- `negative_price_review` rows cannot become formal price.
- Public work mapping remains metadata only.
- Reject rows remain excluded evidence only.

## 3. TV Wall / Media Wall Case

Input context: Plan Puzzle or user context indicates `TV_WALL`, `NEW`, `LIVING_ROOM`.

Expected path:

- Trigger: `TRG_NEW_TV_WALL`.
- Bundle: `BND_NEW_TV_WALL`.
- Dependencies: power outlet/dedicated circuit, weak current/HDMI/network, optional LED/indirect lighting, wall paint/repair.
- Quantity rules: `Q_WALL_AREA` for wall body and repair, `Q_POINT_COUNT` for electrical/weak-current points.
- Standard work item lookup: by `work_item_query_key`, `budget_retrieval_key`, or `puzzle_retrieval_key`.
- Price range: candidate evidence only.
- Output: `BudgetCandidateLine` records with review status.
- Manual review: required for dimensions, material, electrical point count, optional lighting, and any zero/negative price flags.

## 4. Bathroom Work Case

Input context: `BATHROOM`, `RENOVATE`, `BATHROOM`.

Expected path:

- Trigger: `TRG_BATHROOM_WORK`.
- Bundle: `BND_BATHROOM_WORK`.
- Dependencies: waterproofing, tile/masonry, sanitary equipment, accessories, plumbing/drainage.
- Quantity rules: `Q_ROOM_COUNT`, `Q_FLOOR_AREA`, `Q_WALL_AREA`, `Q_EQUIPMENT_COUNT`, or `Q_MANUAL` depending on item.
- Output: `BudgetCandidateLine` records only.
- Manual review: required for waterproofing scope, tile area, fixture count, fixture grade, and price review flags.

## 5. Demolition Repair Case

Input context: cabinet/wall/floor demolition or repair context.

Expected path:

- Trigger: demolition-related trigger.
- Bundle: `BND_DEMOLITION_REPAIR`.
- Dependencies: demolition, wall/floor repair, cleanup/protection, closing/make-good work.
- Quantity rules: `Q_LUMP_SUM`, `Q_WALL_AREA`, `Q_FLOOR_AREA`, or `Q_MANUAL`.
- Output: `BudgetCandidateLine` records only.
- Manual review: required for actual demolition scope, hidden repair risk, cleanup/protection level, and price review flags.

## 6. Final Output Gate

No candidate in this flow may become formal estimate, production quantity, Excel, or PDF in this task.
