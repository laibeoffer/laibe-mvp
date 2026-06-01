# Budget Workspace Module Map

## Purpose

This module map defines what the future Budget Workspace may display and what each module is allowed to read. It does not define production data flow.

| Module | Upstream Source | Allowed Status | Can Enter Dry-Run | Must Display |
|---|---|---|---|---|
| Requirement form | Owner intake / ProjectRequirementBrief placeholder | `incomplete`, `completed`, `placeholder`, `verified` | Only when `verified` or explicitly accepted for dry-run | missing fields, assumptions, verification status |
| File intake | Local/mock file manifest | `incomplete`, `placeholder`, `linked`, `verified`, `unavailable` | Only required files may pass | file type, missing file, privacy note |
| Plan quantity | Plan Puzzle / SVG / quantity facts | `placeholder`, `linked`, `verified`, `unavailable` | Only when `verified` | source artifact, quantity confidence, unavailable reason |
| Quote Factory | Quote Factory package | `not started`, `package ready`, `validator passed`, `functional acceptance pending` | Only after validator and acceptance gate | package id, validator evidence, acceptance status |
| Raw Candidate | Raw Candidate warehouse | `candidate-only`, `reviewed`, `final packet accepted` | Only after final packet acceptance | candidate boundary, no formal price label |
| MethodSpec | Method / Spec Warehouse | `ready`, `blocked by engine entry`, `validated` | Only when not blocked | rule source, validator status, blocker |
| Budget Engine dry-run | Budget Engine entry / dry-run gate | `unavailable`, `pending`, `dry-run ready`, `blocked` | Controls CTA | gate status, blocker, no formal price |
| Output preview | BudgetOutputSnapshot / RenderedBudgetDocument | `snapshot-only`, `customer preview`, `internal trace`, `no formal Excel/PDF` | Never formal output in this phase | preview type, trace safety, renderer boundary |
| Knowledge Vault feedback | Budget Knowledge Vault summaries | `not linked`, `linked`, `reviewed` | Context only | feedback source, unresolved gaps |
| Blocker / warning | Workspace local warning list | `none`, `warning`, `blocked` | No | owner, severity, unblock action |

## Cross-Warehouse Boundaries

The workspace may display status from the three budget warehouses, but it must not merge their responsibilities:

- Method / Spec Warehouse provides rules and method/spec evidence.
- Material / Procurement Warehouse provides raw/candidate/material evidence.
- Output / Renderer Warehouse reads only BudgetOutputSnapshot / RenderedBudgetDocument.

The workspace cannot make any warehouse output formal by display alone.

