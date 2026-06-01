# Budget Workspace IA

## Purpose

The Budget Workspace is a future page / workspace shell for budget generation preparation. It is not the Budget Engine, not a renderer, and not a production quote page.

The workspace should let an owner, internal operator, or review agent understand the complete readiness chain before any budget dry-run is allowed.

## Primary Flow

1. Requirement form status
2. File intake status
3. Plan Puzzle / SVG / quantity status
4. Quote Factory package status
5. Raw Candidate status
6. MethodSpec status
7. Budget Engine dry-run gate
8. Output preview status
9. Knowledge Vault feedback
10. Blocker / warning review
11. Next-step CTA

## Page Regions

### Header

Shows workspace title, project id, mode, and source-of-truth warning.

Required labels:

- `Mock contract only`
- `No formal quote`
- `No production UI`
- `GitHub source of truth`

### Workflow Rail

Shows the module sequence and each module state.

Allowed state labels:

- `incomplete`
- `completed`
- `placeholder`
- `linked`
- `verified`
- `unavailable`
- `blocked`

### Main Status Canvas

Displays the currently selected module panel.

Each panel must show:

- current status
- source evidence
- missing fields
- blocker reason
- whether the data can enter Budget Engine dry-run
- next safe action

### Right Review Rail

Displays:

- blocker summary
- warning summary
- forbidden-flow checklist
- reviewer notes
- Knowledge Vault feedback

### Output Preview Area

Displays dry-run-only preview state.

Allowed states:

- `snapshot-only`
- `customer preview`
- `internal trace`
- `no formal Excel/PDF`

### CTA Area

The primary CTA is disabled unless every gate required for dry-run is satisfied.

The CTA must show the disabled reason when blocked.

## Required CTA Rules

The workspace must never let users skip:

- requirement form
- required file state
- Plan Puzzle / quantity status
- Budget Engine dry-run gate

Any incomplete gate must disable the next-step CTA.

## Non-Production Labels

Every page-level spec must preserve:

- no formal price
- no formal quote
- no customer-facing estimate
- no Excel / PDF writer
- no payment
- no AI API
- no DB / Supabase
- no n8n runtime

