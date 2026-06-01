# Owner Guide Browser Validation Evidence

Status: `WEB_RUNTIME_VERIFIED`

Scope: standalone mock runtime only.

This evidence does not approve production routing, `onboard_ai_agent/code.html` entry changes, Functional Acceptance, merge readiness, final completion, DB/auth/payment/real AI API integrations, Budget Engine execution, Renderer execution, formal pricing, or formal quote generation.

## Source

- GitHub source branch: `app/owner-guide-agent-main-sync`
- PR: #53
- GitHub raw source: `https://raw.githubusercontent.com/laibeoffer/laibe-mvp/refs/heads/app/owner-guide-agent-main-sync/src/stitch_laibe_landing_onboarding/onboard_ai_agent/owner_guide_mock_runtime.html`
- Runtime file: `src/stitch_laibe_landing_onboarding/onboard_ai_agent/owner_guide_mock_runtime.html`
- Evidence route: GitHub raw HTML fetched into an ephemeral localhost server for browser execution.
- Localhost URL during verification: `http://127.0.0.1:60269/owner_guide_mock_runtime.html`
- Source length: 11763 bytes

The localhost server was temporary validation infrastructure only. It is not delivery source of truth and was closed after verification.

## Browser Environment

- Browser surface: Codex in-app browser
- Validation path: `localhost` served exact GitHub raw source from PR #53
- Prior blocked paths: `data:` and `file://` were blocked by browser security policy and were not bypassed.

## Checklist Result

- Page opened from GitHub-tracked source via accepted temporary localhost export: Pass
- Mock-only / placeholder-only labels visible: Pass
- Natural-language input can submit: Pass
- QA log updates: Pass
- Requirement summary updates: Pass
- Next-step CTA visible: Pass
- `OwnerIntent` JSON visible and parseable: Pass
- `ProjectRequirementBrief placeholder` JSON visible and parseable: Pass
- No real AI API / DB / auth / payment / Budget Engine / Renderer / formal pricing execution: Pass

## Before Submit Observations

- Page title: `LaiBE Owner Guide Mock Runtime`
- Heading: `需求引導官 mock runtime`
- `MOCK_READY`: visible
- `PLACEHOLDER_ONLY`: visible
- `NO_REAL_AI_API`: visible
- Input `ownerAnswer`: present
- Submit button `sendAnswer`: present
- `QuestionAnswerLog`: present
- `Requirement Summary`: present
- `nextStepLabel`: present
- `OwnerIntent`: present and parseable
- `ProjectRequirementBrief placeholder`: present and parseable

## Test Input

```text
台北 28 坪中古屋，自住，想整理客廳、廚房、浴室，預算還不知道，也需要平面圖。
```

## After Submit Observations

QA log updated to:

```text
qa_01: 台北 28 坪中古屋，自住，想整理客廳、廚房、浴室，預算還不知道，也需要平面圖。
```

Requirement summary updated to:

```text
已記錄 1 輪回答。待補欄位: style_preferences, schedule_signal.
```

Next-step signal:

```text
enter_plan_puzzle
```

## OwnerIntent JSON Evidence

The `OwnerIntent` JSON parsed successfully after submit and included these required keys:

- `owner_intent_id`
- `session_id`
- `project_id`
- `renovation_goals`
- `property_context`
- `style_preferences`
- `budget_signal`
- `schedule_signal`
- `asset_summary`
- `question_gaps`
- `next_recommended_step`
- `requires_followup`
- `confidence`
- `source_refs`
- `created_at`
- `updated_at`

Observed values:

- `next_recommended_step`: `enter_plan_puzzle`
- `source_refs`: [`qa_01`]
- `requires_followup`: `true`
- `confidence`: `0.42`

## ProjectRequirementBrief Placeholder JSON Evidence

The `ProjectRequirementBrief placeholder` JSON parsed successfully after submit and included these required keys:

- `project_requirement_brief_id`
- `owner_intent_id`
- `requirement_context_status`
- `space_requirements`
- `budget_preference`
- `scope_constraints`
- `review_flags`
- `handoff_targets`

Observed values:

- `requirement_context_status`: `placeholder`
- `scope_constraints.no_formal_price`: `true`
- `scope_constraints.no_real_ai_api`: `true`
- `scope_constraints.no_db_write`: `true`
- `scope_constraints.no_payment`: `true`
- `scope_constraints.budget_engine_handoff_status`: `placeholder_only`

## Refined Forbidden Execution Scan

Script-level scan after runtime load:

- `fetch(`: not present
- `XMLHttpRequest`: not present
- `PaymentRequest` / Stripe / PayPal / webhook integrations: not present
- Supabase / auth execution patterns: not present
- Budget Engine / `BudgetEstimateLine` / `generateBudgetEstimate` / `PricingRule` / `BudgetOutputSnapshot` / `renderSnapshot`: not present

Full-source text includes boundary words such as `payment` only as mock-safety copy and `no_payment` placeholder flags. No payment execution path was present.

Observed links:

- `../preview_floor_plan/code.html` / `進入平面拼圖`
- `../preview_floor_plan/code.html` / `平面拼圖`
- `../preview_budget/code.html` / `預算預覽`

## Remaining Boundaries

- `onboard_ai_agent/code.html` remains unchanged.
- Proposed `code.html` Tools dropdown link remains `deferred_pending_commander_or_second_deputy_decision`.
- This verification applies only to the standalone mock runtime.
- Deputy Commander approval is still required for Functional Acceptance, merge readiness, final completion, or workstream closure.
