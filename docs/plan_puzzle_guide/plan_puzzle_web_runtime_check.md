# Plan Puzzle Web Runtime Check

Status: `WEB_RUNTIME_PENDING`

GitHub operating path acknowledged: Yes

## Checked Files

Target files for future GitHub source-of-truth verification:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

## Expected Existing Page Capabilities

Based on current project context, the existing page should include:

- Header and progress banner.
- Import UI accepting `.jpg`, `.jpeg`, `.png`, and `.pdf`.
- PDF unsupported-preview message.
- FileReader image underlay for previewable images.
- Calibration, wall drawing, wall endpoint cleanup, openings, zones, zone boundaries, zone area candidate labels, draft export, `.pc` spike export, and renderer preview spike metadata.

## Missing Runtime Items

Not yet implemented or verified on this GitHub branch:

- Dedicated Plan Puzzle Guide panel.
- Explicit `PlanPuzzleQuantityFacts` placeholder object in runtime.
- Explicit `plan_quantity_facts_id`.
- Explicit `svg_artifact_id`.
- Explicit `quantity_context_status`.
- Dedicated receiving windows for SVG, zone, area, wall length, and opening count with `placeholder` / `linked` / `verified` markers.

## Current Runtime Decision

No runtime code is changed in this initialization branch.

Current state:

`WEB_RUNTIME_PENDING`

## Safe Future Runtime Patch Scope

If authorized later, the smallest safe runtime patch should:

1. Add a non-production guide/facts summary to the existing inspector.
2. Add a pure local function that derives `PlanPuzzleQuantityFacts` from current `project`.
3. Mark all facts as `placeholder` by default.
4. Avoid Budget Engine, renderer, DB, auth, upload, payment, AI API, and Plancraft core.
5. Keep the existing `進入預算生成` CTA, but do not call any pricing path.
