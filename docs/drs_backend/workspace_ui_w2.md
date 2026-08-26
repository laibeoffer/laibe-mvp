# DRS Workspace UI W2 local data binding candidate

## Scope

W2 keeps the W1 isolated owner, vendor and specialist workspace pages under `src/stitch_laibe_landing_onboarding/drs_standalone/` and adds a local data-client boundary. The candidate remains outside A0 existing website UI, page registration, CTA wiring and runtime routing.

## Data Boundary

The shared module `drs_standalone/shared/drs-data-client.js` exposes `createDrsDataClient` and `createLocalDrsTransport`. Page scripts inject the local transport into the client, then render a role-scoped workspace model. This proves the interface can move from static copy to a data-shaped model without touching Auth, persistence, LINE, AI, document parsing, remote services or canonical routes.

## Product States

Each page can render deterministic product-language states:

- loading: the page is整理案件狀態.
- ready: case status, current responsible role, waiting relationship, next action, trace entries and queues are visible.
- empty: no authorized case content is available yet.
- retryable error: the case state is temporarily unavailable and can be retried.
- permission denied: the viewer does not have this case view.

These states are exercised by local controls and by query string state selection for browser verification.

## Role Boundaries

- owner sees `OWNER_DRS_PRIVATE` and `OWNER_VENDOR_DRS_SHARED`.
- vendor sees only `OWNER_VENDOR_DRS_SHARED`.
- specialist sees the case queue, submitted snapshot, AI advisory findings, Human final controls and local transport receipt.

Routine messaging remains in LINE. The desktop candidate is for complex document editing, multi-document comparison, bulk drawing review, Human decisions and traceability.

## Local Transitions

Document and drawing review queue actions update the local page state and append trace records. Specialist `EDIT_AND_SEND`, `OVERRIDE_AND_SEND` and `MANUAL_EXCEPTION_SEND` controls create a local send-before-confirmation receipt. These interactions do not claim durable persistence or external delivery.

## Holds

- No real Auth/RLS or case membership authority.
- No LINE runtime.
- No AI runtime; AI advisory content is local and Human-controlled.
- No remote database or durable record write.
- No canonical admission, deployment, push, PR or merge.
