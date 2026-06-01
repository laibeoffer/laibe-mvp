# Output Feedback Proposals

Status: proposal register only.

## Proposal Rules

- Output feedback may identify customer-safe note, trace, or disclaimer needs.
- Feedback must not alter renderer layout directly.
- Feedback must not call budget engine.
- Feedback must not read pricing rules, material resolver, raw warehouse, or MethodSpecCatalog from renderer scope.

## Current Proposals

No output feedback proposal is approved by this vault.

## Candidate Review Inputs

These are non-binding review inputs for output feedback. They do not modify renderer behavior.

| Candidate | Source Signal | Proposed Review Question | Boundary |
|---|---|---|---|
| Snapshot-only source reminder | Integration readiness notes Output Documents still depends on PR #29 / snapshot-only usage evidence. | Should customer-safe output notes explicitly state that renderer output must come from `BudgetOutputSnapshot` / rendered snapshot contracts only? | Do not change renderer code, layout, file writers, budget engine, pricing rules, or snapshot generation. |
| Context evidence disclaimer | Requirement and SVG windows may be placeholder / linked / verified / unavailable. | Should preview or dry-run output feedback show context evidence status as an internal trace note before formal output exists? | Do not create customer-facing quote, formal Excel/PDF, or official renderer artifact. |
| Dry-run snapshot-candidate flags | Issue #49 proposes any future entry output mark `dry_run_only`, `formal_price_generated:false`, `renderer_invoked:false`, `payment_invoked:false`, `ai_api_invoked:false`, and `db_invoked:false`. | Should snapshot-candidate review notes require these flags before Output Documents can inspect any upstream dry-run result? | Do not invoke renderer, create `BudgetOutputSnapshot`, produce Excel/PDF, or convert dry-run candidates into customer-facing output. |
