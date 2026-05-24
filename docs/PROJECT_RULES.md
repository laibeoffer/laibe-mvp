# PROJECT_RULES.md

## Editing Rules

- Work from `C:\laibe_project`.
- Keep edits small and scoped.
- Do not delete files; archive only when explicitly approved.
- Do not move active source unless imports and links are updated in the same approved task.
- Do not repair broad link groups without a specific approved batch.
- Do not use `for_ai_studio` as the project source.
- Do not expose or read secrets.

## Active MVP Boundary

- Active display work is currently the static MVP under `src/stitch_laibe_landing_onboarding/`.
- `app/`, `components/`, and `layout/` are Next / React portal prototypes, not confirmed as the main runtime.
- `pre_landing/` is a cinematic entry candidate, not yet confirmed as first screen.
- Archived documents are reference only and should not be treated as current source of truth.

## Mock Payment Boundary

- Payment, listing fee, escrow, fund release, and webhook are mock/prototype only.
- Do not integrate Stripe, ECPay, NewebPay, PayPal, bank transfer, escrow release, or production webhook logic.
- Do not create or store payment API keys, secrets, service role keys, or client secrets.
- Any change that makes payment real is High Risk and requires explicit user approval.

## Product Decision Boundary

- The user is the product owner and final arbiter.
- Codex must not decide official MVP entry, vendor onboarding policy, PCM authority, contract responsibility, award logic, or payment/commercial rules without approval.

## Build / Preview

- Static preview: `python -m http.server 8000`.
- Root `package.json` is currently absent, so `npm run dev` and `npm run build` are not available at the project root.
- If a future package file is added, verify scripts before running anything.

## Do Not Touch Casually

- `assets/logo/laibe_header.png`
- `config/*.json`
- `generate_*.py`
- generator-owned HTML outputs
- `src/laibe_guardrail.js`
- `src/plancraft_bridge.js`
- `src/bidding_result_component.js`
- payment/listing fee/escrow pages
- contract and PCM/governance pages
