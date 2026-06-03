# Pre Tender Intake Schema

This is a documentation schema for readiness review. It is not a DB schema and does not connect to production systems.

## Required Object

| Field | Type | Required | Notes |
|---|---|---:|---|
| `case_id` | string | yes | Approved case packet identifier |
| `project_name` | string | yes | Owner-side project name |
| `site` | object | yes | Address / zone / access constraints |
| `scope_zones` | array | yes | Rooms, systems, elevations, or work zones |
| `demand_form` | object | yes | Purpose, priorities, constraints, target dates |
| `drawings` | array | yes | Plan / SVG / marked drawing with revision date |
| `photos` | array | yes | Existing-condition photos with location notes |
| `budget` | object | yes | Budget range, trade items, exclusions, contingency |
| `materials` | array | yes | Material item, grade, finish, substitution rule |
| `work_methods` | array | yes | Demolition, protection, hauling, installation, testing, cleanup |
| `exclusions` | array | yes | Not-included work and owner responsibilities |
| `payment_acceptance` | array | yes | Milestone, acceptance evidence, payment trigger |
| `tender_process` | object | yes | Q&A route, deadline, submission format, comparison basis |
| `source_of_truth` | object | yes | GitHub PR / commit SHA or approved case packet reference |

## Review Status Values

- `complete`
- `partial`
- `missing`
- `needs_human_review`

## Output Status Values

- `NOT_READY_FOR_TENDER`
- `READY_WITH_WARNINGS`
- `READY_FOR_TENDER`
- `NEEDS_HUMAN_REVIEW`

