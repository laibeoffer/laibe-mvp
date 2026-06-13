# Plan Puzzle Target Loop 2 Defect Matrix

## Decision

NO_RUNTIME_DEFECT_PROVEN

## Matrix

| Area | Expected | Observed | Status | Root Cause | Patch |
|---|---|---|---|---|---|
| No-wall opening guard | no opening data written | openings [] | PASS | N/A | none |
| Door placement | door attaches to selected wall | kind door, edge/sourceWall exported | PASS | N/A | none |
| Door offset | offset updates and remains attached | offset 400 exported | PASS | N/A | none |
| Door width | width updates and exports | width 1000 exported | PASS | N/A | none |
| Door swing | swing updates and exports | right exported | PASS | N/A | none |
| Door delete | only selected opening removed | walls 1, openings [] | PASS | N/A | none |
| Window placement | window attaches to wall | kind window, sillHeight 900 | PASS | N/A | none |
| Window offset | offset updates and exports | offset 650 exported | PASS | N/A | none |
| Window width | width updates and exports | width 900 exported | PASS | N/A | none |
| Direct opening placement | opening kind supported | kind opening exported | PASS | N/A | none |
| Direct opening delete | selected opening removed | walls 1, openings [] | PASS | N/A | none |
| Console | zero errors | 0 | PASS | N/A | none |
| Production guard | .pc export disabled | disabled true | PASS | N/A | none |

## P0 Bugs

None for Target Loop 2.

## P1 Bugs

None for Target Loop 2.

## Remaining Non-Loop-2 Backlog

- Furniture / cabinet placement is still NOT_IMPLEMENTED.
- Material bucket is still NOT_IMPLEMENTED.
- Inspector/status UX remains information-heavy and should be improved in a later loop.

