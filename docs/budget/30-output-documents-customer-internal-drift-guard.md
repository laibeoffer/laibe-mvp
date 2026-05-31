# Output Documents Customer/Internal Drift Guard Packet

Status: docs-only boundary packet
Workstream: output/budget-documents
Owner: Output Documents / Budget Output Logistics
Audience: integration officer, reviewer, future formal writer builder

## 1. Purpose

This packet defines the drift guard between the Output Documents customer preview and the internal trace preview.

The guard exists so an integration harness or future formal writer can verify that customer-facing output stays limited to approved snapshot-derived display fields, while internal trace output can retain provenance, warnings, dry-run markers, and reviewer evidence.

This is not a writer implementation. It does not generate real Excel, PDF, CSV, or customer-facing final quote artifacts.

## 2. Current Baseline

Output Documents may consume only BudgetOutputSnapshot or a RenderedBudgetDocument derived from a BudgetOutputSnapshot.

The current safe baseline is snapshot-only dry-run output readiness:

- renderer input is a BudgetOutputSnapshot
- customer preview is sanitized
- internal trace preview may show provenance and guard evidence
- dry-run manifests are allowed
- real Excel/PDF output is not enabled
- budget engine reruns are forbidden
- pricing, material resolver, raw warehouse, MethodSpecCatalog, plan-puzzle, SVG parsing, payment, auth, DB, webhook, and AI API are outside this workstream

## 3. Drift Guard Definition

Customer/internal drift means any mismatch where:

- customer_view receives an internal-only field
- internal_trace_view loses required provenance evidence
- customer_view displays placeholder data as verified authority
- a dry-run preview is labeled like a formal quote
- a renderer infers new line items from non-snapshot inputs
- a future writer emits an artifact without a manifest that proves snapshot-only origin

The guard should fail closed when a field is unknown, ambiguous, or not explicitly allowed.

## 4. Snapshot-only Input Contract

Allowed input:

- BudgetOutputSnapshot
- RenderedBudgetDocument produced from BudgetOutputSnapshot
- dry-run render manifest produced from the same snapshot lineage

Rejected input:

- RawCandidate
- MethodSpecCatalog
- MethodRecipe
- PriceObservation
- PriceRange
- PricingRule
- MaterialSpec resolver output
- material resolver output
- ProjectRequirementBrief as direct renderer input
- plan-puzzle output as direct renderer input
- SVG or parsed SVG geometry
- legacy formatBudgetOutput() as formal source
- direct user requirement text as line-item authority

## 5. Customer View Allowed Fields

customer_view may contain only sanitized snapshot-derived display data.

Allowed field categories:

- document title and preview status
- project display label, if already present in the snapshot
- grouped line rows produced from snapshot rows
- item display name produced from snapshot rows
- quantity display when snapshot marks it as display-safe
- unit display when snapshot marks it as display-safe
- amount display when snapshot already contains deterministic budget output
- included / excluded notes already normalized in snapshot output
- assumptions and warnings approved for customer preview
- dry-run / placeholder / not-customer-facing disclaimer
- generated-at timestamp or snapshot version, if not sensitive

customer_view must not expose internal IDs unless they are explicitly designed as public display identifiers.

## 6. Customer View Forbidden Fields

customer_view must not contain:

- raw source IDs
- internal reviewer notes
- internal trace logs
- material resolver evidence
- pricing rule IDs
- raw candidate source details
- source quality reviewer details
- MethodSpec internal catalog paths
- validator internals
- budget engine debug payloads
- stack traces or error internals
- plan-puzzle raw geometry
- SVG artifact content
- ProjectRequirementBrief raw text
- owner intent raw notes
- private user contact data
- payment, escrow, listing fee, auth, webhook, DB, token, or credential data
- any value labeled as final quote authority unless formal writer authorization exists

## 7. Internal Trace View Allowed Fields

internal_trace_view may contain provenance and guard evidence needed by reviewers and the integration officer.

Allowed field categories:

- snapshot id
- snapshot version
- snapshot created-at timestamp
- render policy version
- renderer name and version
- dry-run manifest id
- customer/internal split summary
- sanitizer pass/fail summary
- warning list
- placeholder status list
- source lineage IDs already present in BudgetOutputSnapshot
- requirement context trace window fields
- plan / SVG trace window fields
- writer disabled / formal output disabled evidence
- no-engine-rerun evidence
- no-real-Excel/PDF evidence

internal_trace_view is not customer-facing and must be labeled as such.

## 8. Requirement Context Trace Window

Requirement context can enter Output Documents only through BudgetOutputSnapshot trace fields.

Allowed fields:

- project_requirement_brief_id
- owner_intent_id
- requirement_context_status
- requirement_source
- brief_placeholder

Allowed status values:

- placeholder
- linked
- verified
- unavailable

Allowed use:

- internal trace
- reviewer context
- integration officer audit
- source for customer warning or disclaimer text

Forbidden use:

- direct requirement form reading by renderer
- direct user requirement text as formal quote authority
- line item generation from requirement text
- replacing BudgetOutputSnapshot rows with requirement brief content
- treating placeholder ProjectRequirementBrief as verified customer quote authority

## 9. Plan / SVG Trace Window

Plan or SVG context can enter Output Documents only through BudgetOutputSnapshot trace fields.

Allowed fields:

- plan_quantity_facts_id
- plan_id
- svg_artifact_id
- plan_context_status
- plan_quantity_source
- plan_placeholder

Allowed status values:

- placeholder
- linked
- verified
- unavailable

Allowed use:

- internal trace
- reviewer note
- integration officer audit
- source for customer warning or disclaimer text

Forbidden use:

- renderer reading SVG files
- renderer calculating area
- renderer calling plan-puzzle
- renderer converting placeholder quantity into verified production quantity
- renderer creating formal quantity authority
- exposing raw SVG geometry in customer_view

## 10. Drift Guard Checks

A future guard or review checklist should verify:

1. Customer allowlist check
   - Every customer_view field is on the allowlist.
   - Unknown customer fields fail closed.

2. Internal trace label check
   - internal_trace_view is clearly marked internal-only.
   - Internal-only values do not leak into customer_view.

3. Placeholder truthfulness check
   - placeholder, dry-run, unavailable, and unverified states remain visible where needed.
   - No placeholder value is upgraded to verified authority by renderer wording.

4. Snapshot lineage check
   - Every rendered document points back to a BudgetOutputSnapshot id or version.
   - No raw warehouse, MethodSpec, pricing, material resolver, requirement form, plan-puzzle, or SVG input is consumed directly.

5. Formal writer disabled check
   - Real Excel/PDF writer remains disabled unless a separate authorized issue enables it.
   - A dry-run artifact cannot be named or labeled as a formal customer quote.

6. Engine isolation check
   - The output path does not call budget engine generation.
   - The output path does not generate prices, quantities, or line items.

## 11. Integration Harness Usage

The integration harness may use this packet as a read-only acceptance checklist for Output Documents participation.

Integration harness may check:

- BudgetOutputSnapshot is the only renderer input
- customer_view fields match the allowed customer categories
- internal_trace_view retains required trace windows
- placeholder and dry-run disclaimers survive rendering
- no real Excel/PDF writer is invoked
- no budget engine rerun occurs in output rendering
- no forbidden workstream input is read directly

Integration harness must not use this packet as permission to start full integration if the global Integration Gate remains WAITING or BLOCKED.

## 12. Evidence Expected From Future PRs

Future Output Documents PRs that touch customer/internal split should report:

- changed files
- whether only Output Documents files were touched
- customer allowed field evidence
- customer forbidden field evidence
- internal trace field evidence
- placeholder disclaimer evidence
- no engine rerun evidence
- no real Excel/PDF evidence
- no forbidden scope evidence
- Web validation: NOT_WEB_SURFACE, unless a web/UI preview is added

## 13. Forbidden Scope Reminder

This packet does not authorize:

- budget engine rerun
- price decision or pricing rule read
- material resolver read
- raw warehouse read as renderer input
- MethodSpecCatalog read as renderer input
- RAG or AI API calls
- payment, auth, webhook, escrow, listing fee, DB, or migration work
- plan-puzzle calls
- preview_floor_plan changes
- SVG parsing or area calculation
- real Excel or PDF generation
- customer-facing final quote output

## 14. Current Completion Status

MVP Scope Completion: 100% for snapshot-only dry-run output readiness already recorded by the workstream.

Integration Readiness: 100% for snapshot-only renderer/static-guard dry-run readiness, not for formal writer production output.

Formal Excel writer: not complete.
Formal PDF writer: not complete.
Production artifact storage: not complete.
Customer-facing final quote: not complete.

## 15. Next Safe Follow-up

A safe next Output Documents task can convert this packet into either:

- a static guard checklist for customer/internal drift, or
- a formal writer activation issue draft, or
- an artifact manifest review checklist.

Any runtime implementation must be separately scoped and must keep the snapshot-only boundary intact.
