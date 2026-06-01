# Budget Knowledge Vault Index

Status: `ACTIVE_SUPPORT_INITIALIZATION_PR_OPEN`
Workstream: `knowledge/budget-vault`
Managed by: `LAIBE_REVIEWER_INTEGRATION_OFFICER`
Not part of Integration Gate: Yes

## Purpose

This vault summarizes the four core LaiBE budget workstreams for Integration Officer review:

- Quote Factory / `quote-factory/price-range-governance`
- Raw Candidate Warehouse / `warehouse/raw-candidate`
- MethodSpec Warehouse / `warehouse/method-spec`
- Output Documents / `output/budget-documents`

The vault records status summaries, gaps, proposals, review notes, decision logs, and readiness signals. It does not create formal budget data.

## Current Active Work Queue

This queue is used when there is no new instruction. The agent must advance safe documentation backlog instead of waiting.

| Priority | Item | Current Status | Next Safe Action |
|---:|---|---|---|
| 1 | PR #32 initialization PR | Open and mergeable as of latest patrol; not merged. | Keep PR current with scoped support-doc updates, compact blackboard reconciliation, and PR / Integration Officer instruction tracking. |
| 2 | PR #31 boundary PR | Open with review signal unavailable because Codex review usage limits were reached. | Track as related boundary context and keep it separate from PR #32 initialization content. |
| 3 | Four core summaries | Initial summaries exist; latest scoped evidence records PR #26 merged but final acceptance still pending. | Refresh only from scoped completion reports, final packets, PR comments, compact blackboard signals, or Integration Officer instructions. |
| 4 | Requirement / SVG context windows | Placeholder metadata exists. | Keep status labels explicit until linked / verified evidence exists. |
| 5 | Proposal registers | Initial proposal files exist. | Keep proposals non-binding and route any rule / pricing implications to Integration Officer review. |

## Latest Scoped Snapshot

- checked_at: 2026-06-01T17:30:38+08:00
- PR #32: open, mergeable, head `23fa9a0581a5d073bb28fbea44d2318dd4b316b8`, no comments or review threads found in scoped patrol.
- PR #31: open, not merged, related boundary context only, no review threads found in scoped patrol.
- PR #47 / Issue #49: `FOLLOW_UP_REQUIRED / IMPLEMENTATION_PLAN_PENDING` remains the latest scoped implementation-plan signal for `budget/engine-entry-picking`; this vault only mirrors the signal.
- Issue #41: latest scoped signal remains Budget Review Gate PR #37 docs-only final-report status; no vault execution assignment found.
- Active vault work: keep PR #32 current, maintain support-only evidence, and do not touch runtime code or Integration Gate decisions.

## Allowed Outputs

- status summary
- integration gap register
- proposal register
- review note
- decision log
- readiness matrix
- automation patrol note

## Forbidden Outputs

- formal price
- approved price
- direct `PricingRule` publish
- direct `MaterialSpec` publish
- direct `LaborRule` publish
- `BudgetEstimateLine`
- `BudgetOutputSnapshot`
- customer quote
- official renderer output

## Core Files

- `AUTOMATION.md`
- `01_quote_factory/qf_status_summary.md`
- `02_raw_candidate/raw_candidate_status_summary.md`
- `03_method_spec/methodspec_status_summary.md`
- `04_output_documents/output_documents_status_summary.md`
- `05_integration_backlog/integration_gap_register.md`
- `05_integration_backlog/integration_readiness_matrix.md`
- `06_proposals/*.md`
- `07_decision_logs/*.md`

## Parameter Windows

The vault preserves two integration context windows:

- Requirement Form / ProjectRequirementBrief window
- Plan Puzzle SVG / Quantity Facts window

Both windows may support dry-run or trace notes only. They must not directly create prices, formal estimate lines, renderer input, or customer-facing quotes.

## Requirement Form / ProjectRequirementBrief Window

Tracked fields:

- `project_requirement_brief_id`
- `owner_intent_id`
- `requirement_context_status`: `placeholder`, `linked`, `verified`, or `unavailable`
- `budget_preference`
- `space_requirements`
- `scope_constraints`
- `review_flags`

Status rules:

- `placeholder` may support dry-run notes only.
- `linked` may support trace notes only.
- `verified` is required before the context can support more formal estimate preparation.
- `unavailable` means the vault has no usable requirement context evidence.

Forbidden use:

- Free-text requirements must not directly become `BudgetEstimateLine`.
- Requirement form content must not directly create or mutate `PricingRule`.

## Plan Puzzle SVG / Quantity Facts Window

Tracked fields:

- `plan_id`
- `svg_artifact_id`
- `plan_quantity_facts_id`
- `quantity_context_status`: `placeholder`, `linked`, `verified`, or `unavailable`
- `zone_id`
- `area_m2`
- `wall_length_m`
- `opening_count`
- `quantity_confidence`
- `reviewer_required`

Status rules:

- `placeholder` may support dry-run notes only.
- `linked` may support trace notes only.
- `verified` is required before any quantity context can support more formal estimate preparation.
- `unavailable` means the vault has no usable plan / SVG quantity evidence.

Forbidden use:

- SVG must not directly enter Renderer.
- SVG must not directly enter `BudgetEstimateLine`.
- Plan Puzzle candidate area must not become production quantity fact.
- Unverified SVG must not become formal quantity authority.
