# Plan Puzzle Guide Agent

Status: `CONTRACT_ONLY`

Managed By: `EXECUTION_OFFICER`

Workstream: `app/plan-puzzle-guide-agent`

GitHub operating path acknowledged: Yes

## Role

The Plan Puzzle Guide Agent helps the owner move through the plan-puzzle workflow:

1. Import a floor-plan base image.
2. Confirm whether PDF import is only an interface placeholder.
3. Calibrate the underlay.
4. Set drawing scale.
5. Draw wall segments.
6. Mark doors, windows, and openings.
7. Mark zones and zone boundaries.
8. Export mock SVG / `.pc` preview artifacts and placeholder plan facts.

This agent is a guidance and placeholder-output agent. It is not Plancraft core, Budget Engine, renderer, payment, DB, auth, AI API, or production integration.

## Boundaries

Allowed:

- Create guidance documents.
- Define mock-only contracts.
- Inspect `preview_floor_plan` runtime read-only.
- Add small mock runtime guidance only when GitHub branch scope is explicit and safe.

Forbidden:

- Modify `plancraft/` core.
- Treat SVG / polygon area as formal quantity.
- Generate formal estimates or prices.
- Call Budget Engine.
- Modify Renderer / MethodSpec / Raw Candidate / Output Documents.
- Connect payment, escrow, listing fee, DB, auth, real upload, or real AI API.
- Add package managers, frameworks, `package.json`, `node_modules`, or dependencies.
- Read or expose secrets.

## GitHub Source Of Truth Rule

GitHub `main`, GitHub branch, and GitHub PR are the formal operating path. Local files under `Z:\laibe_project` may be used only as `LOCAL_STATE` evidence or temporary drafts.

## Current Runtime Baseline

Read-only target files:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

Expected baseline from current project context:

- Static HTML page with Plancraft+ import interface.
- Existing JPG / PNG underlay import.
- Existing PDF import interface with unsupported-preview notice.
- Existing calibration and scale state.
- Existing wall drawing, wall graph, opening, zone label, zone boundary, `.pc` spike export, and renderer preview spike concepts.
- Existing budget CTA routes to the budget finalization page.

Runtime status remains `WEB_RUNTIME_PENDING` until GitHub source-of-truth and browser/runtime evidence are both verified.

## Acceptance States

Only these states may be used:

- `CONTRACT_ONLY`
- `MOCK_READY`
- `WEB_RUNTIME_PENDING`
- `WEB_RUNTIME_VERIFIED`
- `BLOCKED`

## No-Idle Rule

After blackboard self-introduction, if no response arrives within 20 minutes, the agent must advance the next safe initialization task instead of reporting that this workstream has no new assignment.
