# Plancraft+ Production Adapter Design

## 1. Purpose

This document defines the future production contract for converting Plancraft+ draft JSON into budget-system input. The current implementation is only an adapter contract spike. It produces candidate spaces and quantity facts, keeps formal estimate generation blocked, and must not be used as a formal quote source.

## 2. Current State

Plancraft+ currently exports a wall-first draft JSON with `nodeGraph.edges`, `openings`, `zones`, and bridge metadata. The adapter spike can identify valid Plancraft+ drafts and map them into candidate-only budget data:

- zones become space candidates.
- openings become opening count candidates.
- nodeGraph edges become wall length candidates.
- `.pc` converter output and SVG or renderer previews are explicitly excluded from budget input.

## 3. Non-goals

- No formal estimate generation.
- No Excel or PDF output.
- No pricing rule execution.
- No formal unit price output.
- No use of `.pc` or SVG preview as budget input.
- No production furniture or object placement mapping.
- No payment, escrow, listing fee, AI API, upload backend, or database integration.

## 4. Input Contract

Production Plancraft+ input must satisfy all of the following before it can be considered for a future production adapter:

- `product === "Plancraft+"`.
- `unit === "mm"`.
- `version` is a supported string range.
- `scale.calibrated === true`.
- `nodeGraph.edges` is present and valid.
- `zones` have closed boundaries and valid polygons.
- `openings` reference valid edge ids.
- wall status is one of `existing`, `new`, or `demolished`.
- provenance is preserved for every mapped fact.

Forbidden production input:

- underlay image data.
- `.pc` converter output.
- SVG or renderer preview output.
- unvalidated legacy room blocks.
- candidate facts from the spike path.

## 5. Space / Zone Contract

A zone can become a production space only when:

- `zone.id`, `zone.name`, and `zone.type` are present.
- `boundaryEdgeIds` and `boundaryWallIds` are traceable.
- `polygon` is valid and closed.
- area has been calculated by an approved area policy.
- `areaSource`, `areaConfidence`, and provenance are present.

If any requirement is missing, the zone remains a candidate and cannot drive a formal estimate.

## 6. Area Policy

Future production area may use polygon shoelace calculation only when the boundary is closed, the polygon is validated, and the unit is confirmed as millimeters. Conversion policy:

- mm2 to m2 by dividing by 1,000,000.
- m2 to ping by dividing by 3.305785.
- precision and rounding must be recorded.

Open boundaries, missing scale, or unverified polygons must not produce formal area quantities.

## 7. Wall Fact Contract

Each `nodeGraph.edges` item may become a wall fact when it has:

- `edgeId`.
- `sourceWallId`.
- `from` and `to` in mm.
- valid `length`.
- valid `thickness`.
- valid status.
- structural flag provenance.

`existing`, `new`, and `demolished` wall lengths require reviewer confirmation before production work items are generated. Structural walls require explicit review.

## 8. Opening Fact Contract

Openings can become production facts only when:

- `edgeId` resolves to a valid nodeGraph edge.
- `offset >= 0`.
- `width > 0`.
- `offset + width <= edge.length`.
- kind is `door`, `window`, or `opening`.
- height, sill height, and swing are either validated or marked not applicable.

Warnings keep an opening as a candidate until resolved.

## 9. Furniture / Object Future Contract

Furniture and object placement are not implemented in the current Plancraft+ adapter. A future contract must define object ids, type taxonomy, dimensions, position, rotation, room or zone relationship, and provenance before any production LayoutObject output is allowed.

## 10. Guard Model

The current adapter must keep:

- `productionReady: false`.
- `formalEstimateAllowed: false`.
- `formalEstimateGuard.status: "blocked"`.
- candidate facts marked `productionReady: false`.
- warnings and unsupported lists.
- provenance for every mapped candidate.

Production code must reject spike output unless a later reviewer-approved production contract replaces the guard.

## 11. Reviewer Gates

Reviewer approval is required when:

- zone boundary has issues.
- area is estimated.
- opening validation has warnings.
- wall status is `new` or `demolished`.
- structural wall is involved.
- edge reference is missing.
- shared walls are unresolved.
- converter warnings exist.
- renderer preview mismatch exists.

## 12. Downstream Safety

Downstream budget generation must check production readiness before formal estimate generation. Candidate facts from this spike cannot become production lines. Excel and PDF writers must also require production-ready input and must reject spike output.

## 13. Production Adapter Acceptance Criteria

A future production adapter requires:

- validated input contract.
- reviewed zone area policy.
- reviewed wall and opening quantity policy.
- reviewer-gated production facts.
- deterministic provenance for every quantity.
- formal estimate guard tests.
- explicit exclusion of `.pc` and SVG preview as budget input.

## 14. Migration Plan

Phase P1: Production adapter design doc.

Phase P2: Zone area and boundary refinement.

Phase P3: Production quantity fact contract.

Phase P4: Reviewer-gated production adapter.

Phase P5: Formal estimate dry run.

Phase P6: Excel and PDF writer integration.

## 15. Open Questions

- Which zone types map to formal budget space categories?
- What area confidence threshold is required?
- How should shared walls be canonicalized?
- Which openings require owner confirmation?
- How should structural wall warnings block downstream flows?
- What exact renderer mismatch threshold should trigger review?
