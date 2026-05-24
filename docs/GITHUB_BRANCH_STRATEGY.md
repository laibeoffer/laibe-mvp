# GITHUB_BRANCH_STRATEGY.md

## Purpose

This file defines which GitHub branch each LaiBE Codex chat / workstream should use.

No chat should work directly on `main`.

All work should happen on scoped branches and merge back through PR.

## Main Branch

main

Purpose:
Stable integration branch for LaiBE MVP.

Rules:
- Do not work directly on main.
- Do not push unrelated experiments to main.
- Merge only reviewed, scoped work.

## Branches

### site/page-formalization

Chatroom:
網站主流程 / page formalization

Scope:
- Official homepage
- Owner / client entry page
- AI guide page
- Floor plan UI page
- Quote check page
- Vendor entry page
- Tender platform page
- Award dashboard page
- PCM backend page

Rules:
- One page per task.
- Follow homepage visual system.
- Must perform UI Logic Self-Audit before completion.
- Must update NEXT_CODEX_HANDOFF.md when project state changes.

### warehouse/raw-candidate

Chatroom:
原物料採購與倉儲

Scope:
- RawCatalogSource
- RawCatalogItem
- Candidate
- risk_flags
- review queue
- handoff proposal
- observed price safety
- import boundary guard

Forbidden:
- No formal prices.
- No PricingRule.
- No BudgetEstimateLine.unit_price.
- No renderer / Excel / PDF.
- No floor plan.
- No payment.

### warehouse/method-spec

Chatroom:
配件倉庫：工法與規格

Scope:
- MethodSpecCatalog
- MethodRecipe
- MaterialSpec
- LaborRule
- NoteTemplate
- UnitConversion
- InclusionExclusionRule
- ItemMaterialBinding
- Validators

Forbidden:
- No renderer / output.
- No raw warehouse.
- No frontend.
- No formal budget engine changes.
- No payment.

### output/budget-documents

Chatroom:
成品物流：預算表單輸出

Scope:
- BudgetOutputSnapshot
- RenderedBudgetDocument
- customer_view
- internal_view
- renderSnapshot
- renderer gate
- static guard
- formal file writer preflight
- artifact manifest
- dry-run writer

Forbidden:
- No pricing decisions.
- No budget engine rerun.
- No material resolver.
- No MethodSpecCatalog changes.
- No frontend.
- No payment.

### plancraft/adapter

Chatroom:
平面拼圖 / Plancraft+

Scope:
- Plancraft+ import interface
- wall-first model
- wallGraph / nodeGraph
- openings
- zones
- converter spike
- budget-system adapter candidate data
- formal estimate guard

Forbidden:
- No production adapter unless approved.
- No formal estimate output.
- No Excel / PDF.
- No DB / API / AI.
- No payment.

### plancraft/page-ui

Scope:
- preview_floor_plan page UI
- canvas tool hierarchy
- header tools dropdown
- workflow navigation
- UI Logic Self-Audit fixes

### visual/simulation-governance

Chatroom:
模擬圖生成

Scope:
- LAIBE_VISUAL_SIM
- AI style preview
- prompt preview
- placeholder visual cards
- sandbox image preview
- image API spike governance
- disabled proxy contract

Forbidden:
- No formal construction drawing claims.
- No final design drawing claims.
- No real case claims.
- No quote basis claims.
- No completion guarantee.

### quote-factory/price-range-governance

Chatroom:
Quote Factory / PriceRange governance

Scope:
- PriceRange review decision
- manual override audit trail
- candidate price stats
- audit log
- illegal override blocking

Forbidden:
- No formal price.
- No PricingRule.
- No BudgetEstimateLine.
- No Supabase.
- No migration.
- No formal quotation.

### integrate/quote-factory

Purpose:
Future branch for merging laibe_quote_factory into laibe_project.

Rules:
- Integration only.
- No new feature design.
- Do not mix with page UI work.
- Do not connect formal pricing without approval.

## Initial Branches To Create First

Only create these first when approved:

- site/page-formalization
- warehouse/raw-candidate
- warehouse/method-spec
- output/budget-documents

Other branches are created only when their workstream becomes active.

## Required Reading For All Branches

- AGENTS.md
- docs/NEXT_CODEX_HANDOFF.md
- docs/USER_WORKING_STYLE.md
- docs/USER_IT_LIMITS.md

Additional reading depends on branch scope.

## Completion Rule

Every branch task must end with:
- modified files
- preview / validation result
- scope compliance
- next recommended task
- update to NEXT_CODEX_HANDOFF.md if project state changed
