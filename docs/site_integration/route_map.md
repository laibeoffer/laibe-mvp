# Site Integration Route Map

## Route Map Columns

- Gate: what must be true before the user may proceed.
- Disabled state: when the route should be disabled or blocked.
- Placeholder state: how mock / candidate / dry-run state must be labeled.
- Candidate route: current or intended static route candidate.
- Not production note: what the page must not claim.
- Back route: expected safe return path.
- Next route: expected next step in the MVP flow.
- Owner-facing label: label suitable for the owner UI.
- Internal status key: status key for worker reports.
- Validation evidence required: proof required before route acceptance.

## Main Route Map

| Page | Gate | Disabled state | Placeholder state | Candidate route | Not production note | Back route | Next route | Owner-facing label | Internal status key | Validation evidence required |
|---|---|---|---|---|---|---|---|---|---|---|
| Landing | Owner must enter guided requirement flow before downstream tools. | Disable direct downstream bypass if Owner Guide gate is incomplete. | Existing prototype anchors may remain until route approval. | `src/stitch_laibe_landing_onboarding/laibe_landing_desktop/code.html` | Not a production account or tender portal. | none / top of page | Owner Guide | Start with requirement guidance | `landing_entry_gate` | CTA target, no dead CTA, no direct production claim. |
| Owner Guide | Requirement completion is mandatory before Plan Puzzle or Budget Preview. | Downstream CTAs hidden or disabled until completion. | Standalone mock / no-skip evidence from PR #53. | `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html`; PR #53 mock runtime source | Not production route-ready; no real upload, AI API, DB, auth, or Budget Engine. | Landing | Plan Puzzle or Budget Preview after completion only | Complete requirement guide | `owner_guide_mandatory_gate` | Completion-state screenshot/evidence, JSON placeholder parse, no-skip CTA evidence. |
| Plan Puzzle | Owner Guide completion or explicit Commander-approved candidate entry. | Disable formal budget generation from candidate layout facts. | Tool Catalog / PlanPuzzleQuantityFacts placeholder, candidate layout facts only. | `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`; PR #76 active source | Not CAD, not Plancraft core, not production quantity authority. | Owner Guide | Budget Preview | Organize floor plan | `plan_puzzle_candidate_route` | Load evidence, console errors, tool interactions, no Plancraft core mutation, no Budget Engine call. |
| Budget Preview | Accept only mock / candidate input from prior pages. | Disable formal quote and formal price. | Mock / dry-run label required. | `src/stitch_laibe_landing_onboarding/preview_budget/code.html` | Not formal estimate, not Budget Engine production run. | Plan Puzzle | Budget Finalization | Preview budget direction | `budget_preview_dry_run` | Dry-run labels, no PricingRule, no BudgetEstimateLine, no formal quote. |
| Budget Finalization | Can only prepare a dry-run bridge object. | Disable Budget Integration Harness execution. | `BudgetInputBundle` / `BudgetRunPlan` placeholder only. | `src/stitch_laibe_landing_onboarding/client_step_4_budget_finalization/code.html` | Not a production Budget Engine bridge. | Budget Preview | Budget Document Preview | Review budget package | `budget_finalization_bridge_candidate` | Bridge remains placeholder / dry-run; no engine execution. |
| Budget Document Preview | Must read snapshot-compatible preview only. | Disable real Excel / PDF generation. | Snapshot-only preview boundary. | `src/stitch_laibe_landing_onboarding/budget_document_preview/code.html` | Not formal document, not renderer file writer output. | Budget Finalization | Dashboard candidate | Preview budget document | `budget_document_snapshot_only` | Snapshot-only label, no file writer, no re-run budget engine. |
| Dashboard | Candidate route only after preview context. | Disable production account, auth, payment, and DB behaviors. | Candidate dashboard route. | `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html` | Not production dashboard, not final tender decision. | Budget Document Preview | Tender or AI PCM candidate | Compare and decide | `dashboard_candidate_route` | Route load, candidate labels, no auth/DB/payment. |
| Tender | Candidate route only; no real publish. | Disable production tender publish and listing fee. | Candidate tender / notice route. | `src/stitch_laibe_landing_onboarding/tender_notice/code.html` or tender pages under stitch folder | Not production tender, not listing fee/payment. | Dashboard | AI PCM candidate or dashboard | Prepare tender draft | `tender_candidate_route` | No payment, no listing fee, no webhook, no production publish claim. |
| AI PCM | Candidate advisory route only. | Disable production AI API and final-judge behavior. | Candidate AI PCM / governance route. | `src/stitch_laibe_landing_onboarding/project_timeline_and_governance/code.html` or dashboard-adjacent candidate | AI PCM is not final judge and does not replace professional review. | Dashboard / Tender | Owner decision support | Review risks with AI PCM | `ai_pcm_candidate_route` | No AI API, no secrets, no final decision claim. |

## PR109 Held / Internal Route Candidates

These routes are source-gated static candidates from PR109. They are not public Landing navigation entries, not route-integration approval, not production backend/admin readiness, and not evidence of DB/API/auth/RBAC/payment/AI/LINE/n8n availability. Route integration remains HOLD until a separate A1/Commander authorization.

| Candidate | Label | Gate | Disabled state | Placeholder state | Candidate route | Not production note | Back route | Next route | Owner-facing label | Internal status key | Validation evidence required |
|---|---|---|---|---|---|---|---|---|---|---|---|
| G1 backend route hub | `backend-g1-route-hub-static-candidate` | A1 source gate plus future A2 route-integration authorization. | Disable public Landing navigation and any production backend/admin action. | Static backend/internal route hub candidate only. | `src/stitch_laibe_landing_onboarding/backend_dashboard_shell/code.html` | Not production backend, not admin readiness, no DB/API/auth/RBAC/payment/AI/LINE/n8n. | Landing or prior internal candidate route after authorization. | G2 only if gated/internal authorization exists; otherwise held. | Internal backend route hub candidate | `backend_g1_route_hub_static_candidate` | Direct route load, boundary labels, no public nav exposure, no production backend/admin claims, no forbidden runtime calls. |
| G2 ops admin | `ops-admin-g2-static-candidate-held` | G1/internal admin route authorization plus A1 source gate. | Hold/gate from public users; disable public Landing navigation and production admin actions. | Static held/gated/internal admin candidate only. | `src/stitch_laibe_landing_onboarding/laibe_ops_admin/code.html` | Not production admin, not auth/RBAC readiness, no DB/API/payment/AI/LINE/n8n. | G1 backend route hub if authorized. | none until separate admin-route decision. | Held internal ops admin candidate | `ops_admin_g2_static_candidate_held` | Direct route load only after authorization, held/gated boundary labels, no public nav exposure, no production admin claims, no forbidden runtime calls. |

## Route Order

Landing -> Owner Guide -> Plan Puzzle -> Budget Preview -> Budget Finalization -> Budget Document Preview -> Dashboard -> Tender / AI PCM candidate.

## Acceptance Rule

A route is not accepted because it exists as a file. It is accepted only after the worker provides route load evidence, CTA/back-route evidence, no forbidden production calls, and clear mock/candidate/dry-run/snapshot-only labels where required.
