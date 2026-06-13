# Plan Puzzle To Budget Interface Candidate Contract

Date: 2026-06-13 Asia/Taipei

Status: Candidate contract only.

This document defines the temporary, non-production interface between Plan Puzzle / Plancraft+ draft JSON and the budget system. It is intentionally guarded and must not be used as formal budget input.

## 1. Contract Result

Result: `PLAN_PUZZLE_BUDGET_CANDIDATE_CONTRACT_ONLY`

This contract can support:

- candidate spaces
- candidate quantity facts
- candidate layout object context
- warnings
- unsupported object records
- provenance and source metadata

This contract cannot support:

- production quantity facts
- `generateBudgetEstimate`
- `BudgetEstimateLine`
- formal Excel
- formal PDF
- formal quote
- pricing rule execution

## 2. Top-Level Shape

```json
{
  "draft_version": "plan-puzzle-budget-candidate-contract/0.1",
  "project_id": "string",
  "production_ready": false,
  "rooms": [],
  "zones": [],
  "walls": [],
  "openings": [],
  "layout_objects": [],
  "unsupported_objects": [],
  "warnings": [],
  "source_metadata": {}
}
```

Required global guard:

- `production_ready` must be `false`.
- Every emitted candidate fact must carry `productionReady: false`.
- Every emitted candidate fact must carry `candidate: true`.
- The adapter must preserve warnings and unsupported items.

## 3. Source Metadata

```json
{
  "source_metadata": {
    "source_product": "Plancraft+",
    "source_runtime": "Plan Puzzle",
    "source_version": "string",
    "source_branch": "string",
    "source_pr": "string or null",
    "source_commit": "string or null",
    "exported_at": "ISO-8601 string",
    "unit": "mm",
    "scale_calibrated": false,
    "source_is_candidate": true,
    "formal_estimate_allowed": false,
    "budget_engine_called": false
  }
}
```

Rules:

- `unit` must be `mm` before wall / opening measurements are considered candidate facts.
- `scale_calibrated` must be true before any dimension can be considered a candidate quantity.
- `budget_engine_called` must stay false in Plan Puzzle export.

## 4. Rooms

Rooms are optional in current Plan Puzzle runtime. If present, they are context-only.

```json
{
  "id": "room-candidate-1",
  "name": "Living room",
  "room_type": "living",
  "zone_ids": ["zone-1"],
  "productionReady": false,
  "candidate": true,
  "warnings": []
}
```

Rules:

- A room cannot become a production budget space without reviewer-approved taxonomy mapping.
- A room cannot override a validated zone.

## 5. Zones

Zones are candidate spaces.

```json
{
  "id": "zone-1",
  "name": "Living room",
  "type": "living",
  "boundaryEdgeIds": [],
  "boundaryWallIds": [],
  "polygon": [],
  "area": null,
  "boundaryStatus": "none | open | closed",
  "boundaryIssues": [],
  "productionReady": false,
  "candidate": true
}
```

Adapter behavior:

- May create candidate `SpaceCandidate`.
- Must warn when `boundaryStatus` is not `closed`.
- Must warn when area is absent, calculated by unreviewed policy, or provided but unverified.
- Must not emit formal area quantity.

## 6. Walls

Walls are candidate wall geometry.

```json
{
  "id": "wall-1",
  "from": { "x": 0, "y": 0 },
  "to": { "x": 3000, "y": 0 },
  "thickness": 120,
  "status": "existing | new | demolished",
  "layer": "walls",
  "length": 3000,
  "productionReady": false,
  "candidate": true
}
```

Adapter behavior:

- May create candidate wall length facts from validated node graph edges.
- Must keep unit as `mm`.
- Must warn for missing scale, missing length, missing status, structural uncertainty, overlap, invalid geometry, or stale graph.
- Must not infer formal work item, price, demolition quantity, or material from wall status.

## 7. Openings

Openings include doors, windows, and generic openings.

```json
{
  "id": "opening-1",
  "kind": "door | window | opening",
  "edgeId": "edge-1",
  "sourceWallId": "wall-1",
  "offset": 500,
  "width": 900,
  "height": null,
  "sillHeight": null,
  "swing": "left | right | none | null",
  "productionReady": false,
  "candidate": true
}
```

Adapter behavior:

- May create candidate opening count or width facts.
- Must warn when `edgeId` does not resolve.
- Must warn when `offset + width` exceeds wall length.
- Must warn when height / sill / swing are missing and required by downstream workflow.
- Must not produce production door, window, demolition, frame, glass, hardware, or finish line items.

## 8. Layout Objects

Layout objects are candidate furniture, fixture, and cabinet context.

```json
{
  "id": "layout-object-1",
  "objectType": "parametric_furniture_candidate",
  "type": "wardrobe",
  "category": "cabinet",
  "name": "Wardrobe",
  "layer": "furniture",
  "positionMm": { "x": 1000, "y": 1200 },
  "sizeMm": {
    "width": 1800,
    "depth": 600,
    "height": 2400
  },
  "rotation": 0,
  "materialTags": ["wood"],
  "note": "",
  "budgetCandidate": true,
  "productionReady": false,
  "notFormalEstimate": true
}
```

Adapter behavior:

- May preserve layout object context.
- Must mark unsupported for production budget output until a furniture / fixture production contract is reviewed.
- Must not create cabinet, furniture, fixture, hardware, plumbing, electrical, or finish quantity facts from layout objects.
- Must not use SVG furniture package candidates as production objects.

## 9. Unsupported Objects

Unsupported objects must be explicit, not silently dropped.

```json
{
  "id": "unsupported-1",
  "sourceId": "layout-object-1",
  "kind": "furniture",
  "reason": "furniture_layout_object_candidate_only",
  "productionReady": false,
  "candidate": true
}
```

Required unsupported categories:

- SVG furniture candidates without overlay QA approval.
- Renderer preview elements.
- `.pc` converter output.
- AI image / visual simulation output.
- Unrecognized layout objects.
- Candidate-only Plan Puzzle guide facts.

## 10. Warnings

Warnings are part of the contract.

```json
{
  "code": "plan_puzzle_candidate_only",
  "severity": "blocked",
  "message": "Plan Puzzle output is candidate-only and cannot enter formal estimate generation.",
  "sourceId": "draft"
}
```

Required warning families:

- `plan_puzzle_candidate_only`
- `formal_estimate_blocked`
- `scale_not_calibrated`
- `zone_boundary_not_closed`
- `area_not_reviewed`
- `opening_reference_invalid`
- `layout_object_unsupported`
- `svg_package_not_approved`
- `pc_not_budget_input`
- `renderer_not_budget_input`

## 11. Adapter Output Rules

The budget adapter may output:

- candidate `SpaceCandidate`
- candidate `QuantityFact`
- candidate layout object records
- warnings
- unsupported records
- provenance
- formal estimate guard

The budget adapter must not output:

- production-ready spaces
- production-ready quantity facts
- `BudgetEstimateLine`
- formal estimate totals
- formal Excel
- formal PDF
- renderer or `.pc` artifacts as budget input

## 12. Production Gate

Production adapter work requires a separate reviewer gate.

Minimum gate requirements:

- Versioned Plan Puzzle export schema.
- Closed zone boundary policy.
- Area calculation policy.
- Wall status and structural policy.
- Opening validation policy.
- Furniture / fixture object taxonomy if layout objects are to be used.
- Formal estimate guard tests.
- Commander and Reviewer acceptance.

Until then, this contract remains candidate-only.

## 13. Current Decision

Decision: `BUDGET_STITCHING_ALLOWED_FOR_CANDIDATE_CONTRACT_ONLY`

Budget stitching may start only for candidate normalization, warnings, unsupported objects, and provenance. Formal estimate generation remains blocked.
