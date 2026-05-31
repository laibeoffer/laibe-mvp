# Raw Candidate File Intake Contract

Phase R1.6 defines a docs-only intake contract for sending a Quote Factory export package into the Raw Candidate Warehouse dry-run path.

This is not a production upload feature, not a database import, not a parser implementation, and not a formal pricing path. The contract only describes how a reviewed export package can be mapped into candidate evidence for downstream human review.

## 1. Purpose

Raw Candidate Warehouse may receive a `cloud_ready_export_package.json` from Quote Factory when the package has already been prepared as candidate evidence.

The intake contract exists to preserve:

- source identity
- raw item lineage
- candidate evidence
- risk flags
- review status
- contextual tags for later matching
- handoff provenance

The intake contract must not create formal catalog records, formal prices, formal budget lines, renderer output, customer output, or production files.

## 2. Accepted Package Shape

The package may contain:

- `package_id`
- `package_version`
- `exported_at`
- `source_system`
- `source_files`
- `raw_sources`
- `raw_items`
- `price_observations`
- `candidate_rows`
- `review_decisions`
- `provenance`
- `requirement_context_window`
- `plan_context_window`
- `safety_flags`

The Raw Candidate Warehouse should treat all package data as untrusted evidence until it passes candidate validation and review-queue checks.

## 3. Quote Factory to Raw Candidate Mapping

Quote Factory export data may map into the Raw Candidate Warehouse as follows:

| Quote Factory field | Raw Candidate target | Meaning |
|---|---|---|
| `package_id` | `RawCatalogSource.metadata.package_id` | Export package identity |
| `source_files[]` | `RawCatalogSource.metadata.source_files` | Source file lineage |
| `raw_sources[]` | `RawCatalogSource[]` | Source records |
| `raw_items[]` | `RawCatalogItem[]` | Raw row evidence |
| `price_observations[]` | `RawCatalogItem.raw_unit_price` / metadata | Observed evidence only |
| `candidate_rows[]` | `RawCatalogCandidate[]` | Candidate evidence |
| `review_decisions[]` | `CatalogReviewItem[]` | Candidate review status |
| `provenance` | `HandoffProposal.provenance_trace` | End-to-end trace |

Any observed price in the package remains `observed_price` evidence only.

## 4. Dry-run Flow

The dry-run flow should remain:

```text
cloud_ready_export_package.json
-> RawCatalogSource
-> RawCatalogItem
-> RawCatalogCandidate
-> CandidateValidationResult
-> CatalogReviewItem
-> HandoffProposal
```

The dry-run may run existing validators:

- candidate validation
- review queue creation
- handoff proposal contract validation
- warehouse export safety validation
- observed price safety validation
- raw warehouse static guard
- source quality scoring

The dry-run must fail closed if package shape, source trace, candidate evidence, or price-safety invariants are missing.

## 5. Requirement Context Window

The package may include a requirement context window:

```json
{
  "project_id": "optional-project-id",
  "project_requirement_brief_id": "optional-brief-id",
  "owner_intent_id": "optional-owner-intent-id",
  "requirement_context_status": "placeholder",
  "project_type": "residential-renovation",
  "space_scope_hint": "kitchen",
  "work_scope_hint": "cabinet-and-countertop"
}
```

Allowed `requirement_context_status` values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

This window is metadata only. It can help reviewers understand why a candidate may be relevant to a project context. It must not approve a candidate, create a `PricingRule`, create a `BudgetEstimateLine`, or convert owner intent into a formal spec.

## 6. Plan / SVG Quantity Context Window

The package may include a plan context window:

```json
{
  "plan_id": "optional-plan-id",
  "svg_artifact_id": "optional-svg-id",
  "plan_quantity_facts_id": "optional-quantity-facts-id",
  "room_or_zone_ref": "kitchen",
  "area_hint_m2": 8.5,
  "quantity_context_status": "placeholder",
  "quantity_source": "svg_placeholder"
}
```

Allowed `quantity_context_status` values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Allowed `quantity_source` values:

- `svg_placeholder`
- `plan_puzzle_mock`
- `verified_plan`
- `none`

This window is metadata only. It can support candidate matching and review hints. It must not become a production quantity fact, must not write `BudgetEstimateLine`, must not modify Plancraft geometry, must not modify `plan-puzzle.js`, and must not convert an area hint into a formal quantity.

## 7. Candidate-only Safety Invariants

Every file-intake dry-run must preserve:

- `formal_price_generated: false`
- `price_authority: "none"`
- `observed_price_is_evidence_only: true`
- no formal `PricingRule`
- no formal `MaterialSpec`
- no formal `LaborRule`
- no `BudgetEstimateLine`
- no `BudgetEstimateLine.unit_price`
- no renderer / Excel / PDF output
- no `BudgetOutputSnapshot`
- no payment, escrow, listing fee, RAG, AI API, Supabase, DB, migration, upload, or webhook
- no Plancraft geometry mutation

## 8. Rejection Conditions

The intake dry-run should reject or hold the package when:

- source identity is missing
- source date is missing and cannot be tagged as unavailable
- observed price is negative
- currency or unit is required but missing
- candidate rows cannot be traced to raw items
- handoff proposal provenance is incomplete
- package contains formal pricing fields such as `unit_price`, `formal_price`, `amount`, or `approved_price`
- package attempts to publish to MethodSpec, Budget Engine, Renderer, DB, or customer output

## 9. Output

The only allowed output is candidate evidence:

- `RawCatalogSource`
- `RawCatalogItem`
- `RawCatalogCandidate`
- `CandidateValidationResult`
- `CatalogReviewItem`
- `HandoffProposal`
- validation reports
- source quality assessments

The output may be used by a later MethodSpec / Pricing Review dry-run, but only as review input.

## 10. Non-goals

This contract does not implement:

- real file upload
- cloud storage
- package parser runtime
- production import job
- database write
- formal catalog publishing
- formal price approval
- customer budget rendering
- Excel / PDF generation
- AI / RAG enrichment
- Plan Puzzle integration
