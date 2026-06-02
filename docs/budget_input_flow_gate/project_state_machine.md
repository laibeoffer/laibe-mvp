# Project State Machine

Workstream: `budget/input-flow-gate`

## States

| State | Meaning | May Enter Plan Puzzle | May Enter Budget Preview |
|---|---|---:|---:|
| `draft_requirement` | Owner guide has not collected the minimum requirement facts. | No | No |
| `requirement_ready` | Minimum requirement facts exist and required fields are complete. | Yes | No |
| `plan_context_linked` | Plan puzzle exists but quantity facts are placeholder or linked only. | Yes | No |
| `plan_quantity_verified` | Plan puzzle quantity facts are verified for dry-run preview context. | Yes | Yes, dry-run only |
| `budget_preview_ready` | Requirement and plan quantity context are present with review flags. | Yes | Yes, dry-run only |
| `formal_budget_blocked` | Any required context is missing, placeholder, or unavailable. | No new formal step | No formal budget |

## Status Values

- `placeholder`: temporary trace data, never production authority.
- `linked`: points to upstream source but not verified.
- `verified`: reviewed and acceptable for the next dry-run gate.
- `unavailable`: absent or explicitly not provided.

## Rules

1. Plan Puzzle entry requires `requirement_completion_status = complete`.
2. Budget Preview entry requires `requirement_completion_status = complete` and `plan_quantity_context_status = verified`.
3. Placeholder or linked quantity facts may support trace windows, but must not create production quantity.
4. Formal budget remains blocked until explicit future runtime authorization and verified production inputs exist.
