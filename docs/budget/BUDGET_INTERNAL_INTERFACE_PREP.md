# Budget Internal Interface Preparation

Updated: `2026-06-13`

Scope: future internal interface preparation only. This document defines boundaries and owners but does not implement, execute, or connect runtime paths.

## 1. Operating Rule

All interfaces below are preparation contracts. They do not authorize:

- Budget Engine execution;
- PricingRule creation;
- BudgetEstimateLine creation;
- formal price;
- formal quote;
- Renderer / Excel / PDF output;
- DB / Supabase / API;
- RAG / AI API;
- payment / escrow / listing fee;
- Plan Puzzle runtime modification.

## 2. Interface Preparation Table

| Interface | allowed input | allowed output | forbidden input | forbidden output | owner workstream | current status | required upstream dependency |
|---|---|---|---|---|---|---|---|
| `BudgetInputBundle` | `ProjectRequirementBrief` with placeholder/linked/verified status preserved; `PlanPuzzleQuantityFacts` with placeholder/linked/verified status preserved; approved MethodSpec seed; dry-run guardrails | Dry-run bundle for review assembly; warnings; validation summary; `dry_run_only:true` guardrails | SVG as production quantity; candidate facts as production facts; raw quote direct feed; `PriceObservation` / `PriceRange` as unit price; owner free text as line item | Harness execution; formal quote; formal price; `BudgetEstimateLine`; Renderer output | Budget Engine Entry / BG1-BG2 integration | Runtime type/builder found; review-only | Plan Puzzle shared truth; Issue #89 review; Commander execution authorization |
| `QuantityFacts` | Verified future Plan Puzzle quantity facts; currently placeholder/linked/dry-run quantity facts only | Quantity context window for `BudgetInputBundle`; confidence/reviewer flags | SVG geometry direct; `.pc` file direct; unverified area as production area; user-edited visual label as measured quantity | Production quantity without verification; formal budget quantity; customer-facing formal output | Plan Puzzle / Preview floor plan adapter | Candidate-only adapter found; production contract pending | Plan Puzzle / Plancraft+ 0.12+ shared truth intake |
| `MethodSpecCatalog` | Reviewed/approved method specs, method recipes, material specs, labor rules, note templates, unit conversions, inclusion/exclusion rules | Approved seed or routing evidence for dry-run bundle; future deterministic engine catalog input | Raw candidates without review; price observation direct; renderer request; customer output request | Direct formal price; direct `PricingRule`; direct `BudgetEstimateLine`; direct Renderer output | Method / Spec Warehouse | Runtime/catalog docs exist; dry-run seed can be referenced only | Candidate review gate; MethodSpec reviewer/commander approval |
| `PricingReference` | Reviewed pricing source references, provenance, approved rules in future deterministic catalog | Price source reference for deterministic engine only | Raw `PriceObservation`; unreviewed `PriceRange`; AI recommendation; payment/listing fee; supplier lead as formal price | `BudgetEstimateLine.unit_price` without deterministic engine; formal price claim; PricingRule write without review | Method/Pricing Review + Budget Engine | Not safe to stitch as runtime now | Review Gate decision; formal pricing authority; restored budget engine entrypoint |
| `BudgetEstimate` | Future verified `BudgetInputBundle`; MethodSpec/PricingReference resolved by deterministic engine | Estimate lines, trade groups, assumptions, exclusions, internal trace fields | Placeholder facts as production; raw quote direct; renderer direct input; AI/RAG price; payment/listing fee | Formal quote by itself; Excel/PDF; Renderer production output; DB write without authorization | Budget Engine | Type/entrypoint unresolved in this worktree | `budget-generator.ts` / `generateBudgetEstimate` reconciliation after Plan Puzzle shared truth |
| `BudgetOutputSnapshot` | `BudgetEstimate`, `BudgetEstimateLine`, trade groups, assumptions, exclusions, internal trace fields from proper engine/output process | Frozen snapshot with `customer_view`, `internal_view`, totals, validation report, warnings, source summary | Raw quote; unreviewed price observation; MethodSpec direct-to-renderer; Plan Puzzle raw artifacts; AI recommendation | Formal Excel/PDF by itself; payment trigger; formal quote without renderer/formal gate | Output Documents | Type/validator/gate found; snapshot-only boundary valid | Verified `BudgetEstimate` source and reviewer/commander formal output decisions |
| `RenderedBudgetDocument` | `BudgetOutputSnapshot` or renderer-token-gated structured document | Structured rows, customer preview snapshot, internal trace preview, skeleton/manifest evidence | `generateBudgetEstimate()`; pricing rules; material resolver; raw warehouse data; Quote Factory data; RAG/AI API | Formal Excel/PDF without separate authorization; customer formal quote; payment trigger | Renderer / Output Documents | Renderer static guard found; formal file output blocked | Snapshot source authority; formal renderer review; commander output authorization |

## 3. Internal Prep Decision

- Can define interface boundaries now: `Yes`
- Can implement runtime stitching now: `No`
- Can use placeholder Plan Puzzle facts for review assembly: `Yes, review-only`
- Can use placeholder Plan Puzzle facts for execution or formal output: `No`
- Can use PriceObservation / PriceRange for formal unit price: `No`

