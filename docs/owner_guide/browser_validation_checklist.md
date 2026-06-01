# Owner Guide Browser Validation Checklist

Status: `MOCK_READY / WEB_RUNTIME_PENDING`

Managed by: `EXECUTION_OFFICER`

Workstream: `app/owner-guide-agent`

Runtime under check: `src/stitch_laibe_landing_onboarding/onboard_ai_agent/owner_guide_mock_runtime.html`

This checklist is for a standalone mock runtime only. It does not approve formal pricing, production routing, DB writes, auth, payment, real AI API usage, Budget Engine execution, Renderer execution, or merge readiness.

## Validation Preconditions

- Use GitHub-tracked source from PR #53 or an accepted export of the exact PR #53 file.
- Do not use local dirty workspace as the source of truth.
- Keep `onboard_ai_agent/code.html` link status as `deferred_pending_commander_or_second_deputy_decision`.
- Do not claim `WEB_RUNTIME_VERIFIED` unless the runtime is opened and the checks below are observed.

## Page Open

- [ ] Open `owner_guide_mock_runtime.html` from GitHub-tracked source or accepted local export.
- [ ] Confirm the page title or main heading identifies the Owner Guide mock runtime.
- [ ] Confirm no browser or runtime security block prevents loading the page.

Evidence to capture:

- Runtime path or URL:
- Source branch / PR:
- Browser or environment:
- Screenshot or equivalent evidence reference:

## Mock / Placeholder Labels

- [ ] `MOCK_READY` is visible.
- [ ] `PLACEHOLDER_ONLY` is visible.
- [ ] `NO_REAL_AI_API` is visible.
- [ ] Scope guard text says output is only `placeholder`, `linked`, or `verified` context.

## Natural Language Input

- [ ] Input field is visible.
- [ ] Submit button is visible.
- [ ] A natural-language owner answer can be entered.
- [ ] Submit action completes without backend calls or errors.

Suggested test input:

```text
台北 28 坪中古屋，自住，想整理客廳、廚房、浴室，預算還不知道，也需要平面圖。
```

## QuestionAnswerLog

- [ ] `QuestionAnswerLog` is visible before submit.
- [ ] After submit, the log adds a `qa_01` row.
- [ ] The row contains the submitted owner answer.
- [ ] The log stays front-end only and does not write to DB or storage.

## Requirement Summary

- [ ] `Requirement Summary` is visible before submit.
- [ ] After submit, the summary updates from waiting state.
- [ ] Summary includes recorded answer count.
- [ ] Summary lists remaining question gaps or `none`.

## Next Step CTA

- [ ] `nextStepLabel` is visible.
- [ ] Next-step CTA is visible.
- [ ] CTA text changes consistently with mock recommendation rules.
- [ ] CTA target remains a mock or existing placeholder route.
- [ ] CTA does not trigger payment, DB, auth, real upload, real AI API, Budget Engine, Renderer, formal pricing, or formal quote generation.

Expected valid recommendation values:

- `continue_requirement_intake`
- `enter_plan_puzzle`
- `enter_budget_preview`
- `prepare_for_bidding`
- `human_assistance`

## OwnerIntent JSON

- [ ] `OwnerIntent` panel is visible.
- [ ] JSON is visible before submit.
- [ ] JSON updates after submit.
- [ ] JSON parses successfully.
- [ ] Required fields are present:
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

## ProjectRequirementBrief Placeholder JSON

- [ ] `ProjectRequirementBrief placeholder` panel is visible.
- [ ] JSON is visible before submit.
- [ ] JSON updates after submit.
- [ ] JSON parses successfully.
- [ ] `requirement_context_status` is `placeholder`.
- [ ] Required fields are present:
  - `project_requirement_brief_id`
  - `owner_intent_id`
  - `requirement_context_status`
  - `space_requirements`
  - `budget_preference`
  - `scope_constraints`
  - `review_flags`
  - `handoff_targets`

## Forbidden Boundary Check

- [ ] No real AI API call is made.
- [ ] No API key, token, or credential is present.
- [ ] No DB / Supabase / auth call is made.
- [ ] No payment, escrow, listing fee, or webhook path is touched.
- [ ] No Budget Engine execution occurs.
- [ ] No Renderer execution occurs.
- [ ] No MethodSpec, Raw Candidate, Output Documents, or Plancraft core scope is touched.
- [ ] No formal price, `PricingRule`, `BudgetEstimateLine`, formal quote, Excel, PDF, or `BudgetOutputSnapshot` is produced.
- [ ] Free-text owner answers remain context only and do not become formal budget input.

## Validation Result

Use one of these statuses only:

- `WEB_RUNTIME_VERIFIED`
- `WEB_RUNTIME_PENDING`
- `BLOCKED`

Result:

- Status:
- Evidence:
- Missing:
- Validator:
- Date / time:

## Decision Boundary

- EXECUTION_OFFICER manages patrol, initialization progress, blocker reporting, and scoped runtime evidence.
- Commander / Second Deputy approval is required before changing the onboarding `code.html` entry route.
- Deputy Commander approval is required for Functional Acceptance, merge readiness, final completion, or closing the workstream.
