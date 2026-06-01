# Owner Guide Acceptance Gate

Workstream: `app/owner-guide-agent`

Managed by: `EXECUTION_OFFICER`

Current status: `MOCK_READY`

Functional Acceptance: Not claimed

`WEB_RUNTIME_VERIFIED`: Not claimed

100% complete: Not claimed

## GitHub Source-of-Truth Status

Formal delivery path is GitHub `laibeoffer/laibe-mvp` branch / PR only.

Current formal evidence is PR #46 `Add Owner Guide Agent contract` on branch `app/owner-guide-agent`.

Local workspace output remains `LOCAL_DRAFT_ONLY` unless represented in GitHub-tracked files, branch, PR, or PR comment.

## Completed Evidence

- Owner Guide contract exists under `docs/owner_guide/OWNER_GUIDE_AGENT.md`.
- 15-minute automation and 20-minute auto-progress rule are recorded in `docs/owner_guide/AUTOMATION.md`.
- Question flow is recorded in `docs/owner_guide/owner_guide_question_flow.md`.
- Session state is recorded in `docs/owner_guide/owner_guide_session_state.md`.
- `OwnerIntent` contract is recorded in `docs/owner_guide/owner_intent_contract.md`.
- `ProjectRequirementBrief placeholder` contract is recorded in `docs/owner_guide/project_requirement_brief_placeholder.md`.
- Next-step recommendation rules are recorded in `docs/owner_guide/next_step_recommendation_rules.md`.
- Example `OwnerIntent`, `ProjectRequirementBrief placeholder`, and QA session JSON files exist under `docs/owner_guide/examples/`.
- Mock runtime evidence exists at `src/stitch_laibe_landing_onboarding/onboard_ai_agent/owner_guide_mock_runtime.html`.
- Runtime static guard evidence is recorded in `docs/owner_guide/owner_guide_web_runtime_check.md`.

## MOCK_READY Criteria

The workstream may remain `MOCK_READY` when all are true:

- mock-only Owner Guide runtime evidence exists on GitHub;
- it records or demonstrates natural-language owner input;
- it can represent QA log, requirement summary, next-step CTA, `OwnerIntent`, and `ProjectRequirementBrief placeholder`;
- it clearly marks mock-only / placeholder-only status;
- static guard finds no real AI API, DB, auth, payment, formal pricing, `PricingRule`, `BudgetEstimateLine`, Budget Engine, Renderer, MethodSpec, Raw Candidate, Output Documents, or Plancraft core dependency.

## WEB_RUNTIME_VERIFIED Criteria

Do not mark `WEB_RUNTIME_VERIFIED` until all are true:

- GitHub-tracked runtime source is the tested source.
- The Owner Guide entry is reachable through an accepted page path or explicitly accepted standalone preview path.
- Browser/runtime test can open the page through an allowed browser path.
- The test verifies visible mock-only / placeholder-only labels.
- The test verifies natural-language answer input.
- The test verifies QA log recording after submission.
- The test verifies requirement summary updates.
- The test verifies next-step CTA is visible.
- The test verifies visible `OwnerIntent` JSON parses.
- The test verifies visible `ProjectRequirementBrief placeholder` JSON parses.
- The test confirms no real AI API, DB, auth, payment, formal price, `PricingRule`, `BudgetEstimateLine`, Budget Engine, Renderer, MethodSpec, Raw Candidate, Output Documents, or Plancraft core execution.

## Current Blockers To Runtime Verification

- Branch is not synced to current GitHub `main`.
- `code.html` link is deferred by `EXECUTION_OFFICER` until branch sync/rebase and changed-file re-check.
- Browser verification attempt using a temporary `data:` page was blocked by browser security policy.
- Deputy Commander has not approved Functional Acceptance PASS, merge readiness, final completion, or task closure.

## Execution Officer Decision Received

Source: PR #46 comment `4590165805`, referencing earlier decision comment `4589799907`.

Decision:

- Keep `owner_guide_mock_runtime.html` standalone for now.
- Do not wire `onboard_ai_agent/code.html` until the branch is synced/rebased against current GitHub `main` and changed files are re-checked.
- After sync, only propose a minimal reversible link if it does not alter onboarding flow, CTA hierarchy, routing, production behavior, or forbidden boundaries.
- Runtime remains `MOCK_READY / WEB_RUNTIME_PENDING` until browser or browser-equivalent validation opens the intended page and verifies the mock flow.

Required next report:

- Branch synced to current `main`: Yes / No.
- Changed files after sync.
- `code.html` link: deferred / proposed.
- Browser/runtime evidence: Yes / No, with path or URL and flow checked.
- Forbidden-boundary check.
- Whether Deputy Commander decision is needed for Functional Acceptance / merge readiness.

## Next GitHub Action Needed

Sync or rebase PR #46 against current GitHub `main`, then re-check changed files.

Until branch sync/rebase is complete, `code.html` link status is `deferred`.

## Deputy Commander Decision Needed

Deputy Commander must decide:

- Functional Acceptance PASS or not;
- whether the PR can be considered final for this phase;
- merge readiness;
- whether the Owner Guide initialization can be closed.

## Forbidden Scope Check

This workstream must not connect or modify:

- real AI API or API keys;
- DB / auth / webhook;
- payment / escrow / listing fee;
- formal prices or formal quotes;
- `PricingRule`;
- `BudgetEstimateLine`;
- Budget Engine;
- Renderer;
- Plancraft core;
- MethodSpec;
- Raw Candidate;
- Output Documents.
