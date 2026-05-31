# Output Documents Formal Writer Gap Report

This packet defines the next safe Output Documents work after snapshot-only dry-run readiness. It is a gap report and issue-ready planning note, not an implementation of real Excel / PDF writing and not a customer-facing formal quote contract.

## 1. Current Baseline

Output Documents currently owns the logistics layer after budget generation:

- Accept `BudgetOutputSnapshot` as the only formal renderer input.
- Produce customer preview and internal trace preview from snapshot-gated data.
- Keep renderer / writer work snapshot-only, dry-run, and manifest-first.
- Keep real `.xlsx` / `.pdf` output, production artifact storage, signed artifact protection, and customer-facing final quote outside the current readiness claim.

Completed readiness means:

- Renderer static guard is available.
- Snapshot-only demo evidence exists.
- Customer warning sanitization is guarded.
- Dry-run writer / artifact manifest behavior exists.
- Legacy `formatBudgetOutput()` is not an accepted formal source.

Completed readiness does not mean:

- Formal Excel writer complete.
- Formal PDF writer complete.
- Production artifact storage complete.
- Customer final quote complete.
- Any price, quantity, material, MethodSpec, raw source, or plan/SVG authority can be decided by Output Documents.

## 2. Next Gap Areas

The next Output Documents work should be split into issue-sized tasks. Do not combine these into one broad implementation.

### Gap A: Formal Writer Activation Contract

Need:

- A controlled entry contract for turning dry-run writer output into a real artifact writer later.
- Explicit preconditions for enabling real Excel / PDF output.
- A fail-closed rule when required snapshot, renderer token, artifact policy, or approval metadata is missing.

Forbidden in this gap report:

- No real `.xlsx` or `.pdf` generation.
- No storage upload.
- No production artifact registry.
- No customer-facing final quote.

### Gap B: Artifact Manifest Review Contract

Need:

- A reviewer-facing manifest checklist.
- Required manifest fields for dry-run preview artifacts.
- A separation between preview artifact metadata and production artifact metadata.
- Explicit `artifact_written: false` semantics for dry-run paths.

Forbidden in this gap report:

- No signed artifact implementation.
- No production storage implementation.
- No payment, escrow, auth, webhook, or DB work.

### Gap C: Customer / Internal View Drift Guard

Need:

- A small review packet confirming customer fields remain customer-safe.
- A static or fixture guard that internal trace fields do not leak into customer preview.
- Explicit warning handling for placeholder requirement / plan trace status.

Forbidden in this gap report:

- No requirement form parsing.
- No SVG parsing.
- No plan-puzzle or preview_floor_plan calls.
- No quantity or price authority creation.

### Gap D: Integration Harness Evidence Contract

Need:

- A concise evidence checklist for integration officers.
- Required output from renderer static guard.
- Required output from snapshot-only demo.
- Required evidence that no real Excel / PDF was generated.
- Required evidence that no budget engine rerun occurred.

Forbidden in this gap report:

- Do not run the full integration harness unless the Integration Gate is `READY_FOR_INTEGRATION`.
- Do not treat Output Documents readiness as readiness for other workstreams.

## 3. Suggested Next Issues

Use these as issue drafts when Commander or Integration Officer wants to continue Output Documents work.

### Issue Draft 1: Add Formal Writer Activation Contract

Workstream: `output/budget-documents`

Allowed files:

- `docs/budget/*output*`
- `docs/budget/*renderer*`
- `docs/budget/*writer*`
- `src/lib/budget/renderers/` only if explicitly scoped

Mission:

Define the fail-closed contract for future real Excel / PDF writer activation without generating real artifacts.

Acceptance:

- Documents activation preconditions.
- Keeps dry-run behavior as default.
- Names required approval / token / artifact policy inputs.
- Confirms no real `.xlsx` / `.pdf` output.

### Issue Draft 2: Add Customer/Internal Drift Guard Packet

Workstream: `output/budget-documents`

Allowed files:

- `docs/budget/*output*`
- `docs/budget/*renderer*`
- `src/lib/budget/renderers/` only if explicitly scoped

Mission:

Define or harden the guard that prevents internal trace fields from leaking into customer preview output.

Acceptance:

- Customer allowed fields remain explicit.
- Internal trace fields remain internal-only.
- Placeholder warning behavior remains disclaimer-only.
- No renderer reads requirement forms, SVG, pricing, raw warehouse, MethodSpecCatalog, or material resolver.

### Issue Draft 3: Add Integration Evidence Checklist

Workstream: `output/budget-documents`

Allowed files:

- `docs/budget/*output*`
- `docs/budget/*renderer*`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

Mission:

Create a reusable checklist for integration officers to verify Output Documents readiness without rerunning the budget engine or producing real Excel / PDF.

Acceptance:

- Names required evidence commands or merged PR evidence.
- Separates local verification from GitHub PR evidence.
- Keeps `Web validation: NOT_WEB_SURFACE` unless a web preview surface is added later.
- Confirms no full integration harness run unless Integration Gate is ready.

## 4. Boundary Rules

Output Documents must not:

- Rerun budget engine.
- Read pricing rules.
- Read material resolver.
- Read raw warehouse as renderer input.
- Read MethodSpecCatalog as renderer input.
- Call RAG / AI API.
- Touch payment, escrow, listing fee, auth, webhook, DB, or migration.
- Touch plan-puzzle or preview_floor_plan.
- Parse SVG.
- Generate real Excel / PDF.
- Produce a customer-facing final quote.

Output Documents may:

- Read `BudgetOutputSnapshot`.
- Read snapshot-gated `RenderedBudgetDocument`.
- Render customer-safe preview fields.
- Render internal trace preview fields.
- Produce dry-run artifact manifests.
- Run renderer static guard.
- Run snapshot-only renderer fixtures.
- Document future activation preconditions.

## 5. Readiness Statement

This packet moves Output Documents from passive standby to issue-ready next-phase planning while keeping the current safety boundary intact.

Current safe next action:

- Route one of the suggested issue drafts to Commander or Integration Officer.
- Keep PR #29 final gate delegated to reviewer / integration officer.
- Do not start real writer implementation until a new formal issue explicitly authorizes the exact file scope and verification path.
