# Output Documents Integration Usage Note

This note defines how the Output Documents workstream participates in the
budget integration harness. It is an integration usage note for snapshot-only
dry-run readiness. It is not authorization for real Excel / PDF output,
production artifact storage, or customer-facing final quote generation.

## 1. Integration Harness Role

Output Documents is the logistics and shipping layer of the budget pipeline.
It receives a completed `BudgetOutputSnapshot`, checks that the snapshot is
safe to render, and splits it into customer-facing preview output and internal
trace preview output.

The integration harness may use Output Documents to verify that a snapshot can
be rendered into structured preview documents, warning text, dry-run artifact
metadata, and renderer guard evidence.

The integration harness must not use Output Documents to regenerate budget
lines, recalculate quantities, resolve materials, choose prices, or promote a
placeholder preview into a formal quote.

## 2. Accepted Input

Output Documents accepts only:

- `BudgetOutputSnapshot`
- A `RenderedBudgetDocument` produced from a snapshot-gated renderer
- A formal structured document produced from `renderFormalBudgetDocument()`
  with the required formal renderer token

Output Documents rejects as direct input:

- `RawCandidate`
- `MethodSpecCatalog`
- `MethodRecipe`
- `MaterialSpec`
- `PricingRule`
- `PriceObservation`
- `PriceRange`
- RAG result
- AI response
- Project requirement form text
- SVG / plan-puzzle artifact
- `BudgetEstimate`
- `BudgetEstimateLine`

Any upstream provenance that needs to be preserved must enter through explicit
trace fields inside `BudgetOutputSnapshot`.

## 3. Customer View Allowed Fields

The customer preview may expose only fields intended for owner-facing review:

- item label / work item name
- room or zone label
- quantity display
- unit display
- amount display
- subtotal / total display
- customer-safe warnings
- customer-safe assumptions
- customer-safe exclusions
- disclaimer text
- placeholder / dry-run / not-customer-facing marker when applicable

The customer preview must not expose internal trace identifiers or price
authority fields, including:

- `source_id`
- `recipe_id`
- `material_code`
- `quantity_formula`
- `price_source`
- `confidence`
- `requires_review`
- `internal_note`
- raw provenance payloads
- AI / RAG response content

## 4. Internal Trace View Allowed Fields

The internal trace preview may include fields needed by reviewers and
integration officers:

- `source_type`
- `source_id`
- `recipe_id`
- `material_code`
- `quantity_formula`
- `price_source`
- `confidence`
- `requires_review`
- `internal_note`
- `assumptions`
- `risks`
- `warnings`
- `snapshot_id`
- `renderer_id`
- `artifact_manifest_id`
- requirement context trace fields listed in this note
- plan / SVG trace fields listed in this note

Internal trace output is not customer-facing quote authority. It is for audit,
review, dry-run integration, and handoff visibility.

## 5. Requirement Context Trace Window

Requirement context may enter Output Documents only through
`BudgetOutputSnapshot` trace fields.

Allowed fields:

- `project_requirement_brief_id`
- `owner_intent_id`
- `requirement_context_status`
- `requirement_source`
- `brief_placeholder`

Allowed `requirement_context_status` values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Allowed use:

- internal trace
- reviewer / integration officer inspection
- customer warning source reference
- customer disclaimer source reference
- dry-run provenance marker

Forbidden use:

- The renderer must not read requirement forms directly.
- The renderer must not generate line items from requirement text.
- The renderer must not display a requirement form as formal quote authority.
- A placeholder `ProjectRequirementBrief` must not become customer-facing final
  quote authority.
- Requirement text must not be treated as a pricing source.

## 6. Plan / SVG Trace Window

Plan and SVG context may enter Output Documents only through
`BudgetOutputSnapshot` trace fields.

Allowed fields:

- `plan_quantity_facts_id`
- `plan_id`
- `svg_artifact_id`
- `plan_context_status`
- `plan_quantity_source`
- `plan_placeholder`

Allowed `plan_context_status` values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Allowed use:

- internal trace
- reviewer note
- integration officer inspection
- customer warning source reference
- customer disclaimer source reference
- dry-run provenance marker

Forbidden use:

- The renderer must not read SVG files.
- The renderer must not calculate area.
- The renderer must not call plan-puzzle.
- The renderer must not call preview_floor_plan.
- The renderer must not show placeholder quantity as verified production
  quantity.
- The renderer must not create formal quantity authority.

## 7. Placeholder / Dry-Run Marking

When requirement or plan context is `placeholder`, `unavailable`, or otherwise
not verified, Output Documents must keep that status visible to internal trace
and, where customer-safe, expose a disclaimer instead of a formal source claim.

Dry-run preview output must be marked as:

- `placeholder`
- `dry-run`
- `not customer-facing`

This applies to structured preview rows, artifact manifests, registry entries,
and writer preflight evidence.

## 8. Renderer / Writer Boundaries

Renderer and writer paths must preserve the following rules:

- No budget engine rerun.
- No pricing lookup.
- No material resolver lookup.
- No raw warehouse lookup.
- No MethodSpecCatalog lookup.
- No RAG / AI API call.
- No payment / escrow / listing fee behavior.
- No plan-puzzle or SVG parsing.
- No legacy `formatBudgetOutput()` as a formal source.
- No real `.xlsx` or `.pdf` generation.
- No customer-facing final quote generation.

Excel / PDF work in this phase remains skeleton, dry-run, manifest-only, or
placeholder-only unless a later task explicitly authorizes formal output.

## 9. Verification Evidence

For Issue #18 / PR #23, merged evidence records the following checks:

- renderer static guard was run
- renderer TypeScript syntax loop passed
- formal renderer / writer fixture smoke passed
- customer warning sanitizer hardening was checked
- no real `.xlsx` / `.pdf` files were added or changed
- no budget engine rerun was performed
- no pricing rules, material resolver, MethodSpecCatalog, raw warehouse,
  frontend, plan-puzzle, payment, DB, RAG, or AI API work was included

If local verification cannot be run, integration officers may use the merged
PR #23 evidence as the baseline and must record the local limitation in their
report.

## 10. Integration Readiness

Current readiness meaning:

- MVP Scope Completion: `100%` for Issue #18 / PR #23 snapshot-only output
  readiness.
- Integration Readiness: `100%` for snapshot-only renderer / static-guard
  dry-run readiness.

This does not mean:

- formal Excel writer is complete
- formal PDF writer is complete
- production artifact storage is complete
- signed / approved artifact protection is complete
- customer-facing final quote is complete

The next integration harness may use Output Documents for snapshot-only
dry-run verification, internal trace review, customer-safe preview review, and
artifact manifest readiness checks.
