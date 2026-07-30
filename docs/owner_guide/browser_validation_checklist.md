# Owner Guide Browser Validation Checklist

Status: `MOCK_READY / WEB_RUNTIME_PENDING`

Managed by: `SECOND_DEPUTY_COMMANDER`

Workstream: `app/owner-guide-agent`

Runtime under check: `src/stitch_laibe_landing_onboarding/onboard_ai_agent/owner_guide_mock_runtime.html`

This checklist is for the standalone mock runtime only. It does not approve production routing, upload backend, DB writes, auth, payment, real AI API usage, Budget Engine execution, Renderer execution, formal pricing, or merge readiness.

## Validation Preconditions

- Use GitHub-tracked source from PR #53 or an accepted export of the exact PR #53 file.
- Do not use local dirty workspace as the source of truth.
- Keep `onboard_ai_agent/code.html` link status as `deferred_pending_commander_or_second_deputy_decision` unless Commander / Second Deputy explicitly authorizes it.
- Do not claim final acceptance or merge readiness from this checklist alone.

## Page Open

- [ ] Open `owner_guide_mock_runtime.html` from GitHub-tracked source or accepted local export.
- [ ] Confirm the page title or main heading identifies the Owner Guide mock runtime.
- [ ] Confirm no browser or runtime security block prevents loading the page.

## Mock / Placeholder Labels

- [ ] `MOCK_READY` is visible.
- [ ] `PLACEHOLDER_ONLY` is visible.
- [ ] `NO_REAL_AI_API` is visible.
- [ ] `NO_UPLOAD_BACKEND` is visible.

## Gated Requirement Flow

- [ ] Before completion, no visible `進入平面拼圖`, `平面拼圖`, or `預算預覽` skip CTA is shown.
- [ ] Before completion, visible controls are limited to requirement-flow controls such as `下一題`, `回上一題`, `儲存目前回答`, `查看已填內容`, and `補充說明`.
- [ ] Saving an answer updates `QuestionAnswerLog` and structured notes.
- [ ] `requirement_completion_status` starts as `incomplete`.
- [ ] After all required text answers and owner notes are present, status becomes `ready_for_review`.
- [ ] Clicking `完成需求表單` changes status to `completed`.
- [ ] Only after completion are the next-step CTAs shown:
  - `完成需求表單，進入平面拼圖`
  - `完成需求表單，進入預算預覽`
- [ ] Completion copy is visible: `需求表單已完成，以下資料將作為後續平面拼圖與預算生成的參數來源。`

## Owner-Readable Notes

- [ ] `需求紀錄` is visible as a bullet / ordered list.
- [ ] Notes show owner-readable rows for property context, spaces, style, budget, schedule, files, uploads, and additional notes.
- [ ] JSON is not the only requirement record shown to the owner.

## Undo / Revision

- [ ] `回上一題` or equivalent undo control is visible.
- [ ] Undo reverts the most recent active answer.
- [ ] Reverted answer is removed from effective notes and effective `question_answer_log`.
- [ ] `answer_revision_log` marks the reverted answer without feeding it into effective output.
- [ ] OwnerIntent and ProjectRequirementBrief placeholder update after undo.

## Mock Upload Metadata

- [ ] Current plan / floor plan input is visible.
- [ ] Current site photos input is visible.
- [ ] Style reference image input is visible.
- [ ] Selecting files records local metadata only.
- [ ] No upload backend, production storage, DB, AI API, or webhook call occurs.

Expected metadata windows:

- `current_plan_files`
- `current_site_photos`
- `style_reference_images`

## Additional Notes

- [ ] `業主自行補充說明` is visible.
- [ ] Saving notes updates `owner_additional_notes`.
- [ ] Completion remains blocked until owner notes are present.

## OwnerIntent JSON

- [ ] `OwnerIntent` panel is visible.
- [ ] JSON updates after each effective answer.
- [ ] JSON parses successfully.
- [ ] Required fields are present, including:
  - `requirement_completion_status`
  - `structured_requirement_notes`
  - `question_answer_log`
  - `answer_revision_log`
  - `current_plan_files` / `current_site_photos` / `style_reference_images` inside `asset_summary`
  - `owner_additional_notes`
  - `next_recommended_step`

## ProjectRequirementBrief Placeholder JSON

- [ ] `ProjectRequirementBrief placeholder` panel is visible.
- [ ] JSON updates after each effective answer.
- [ ] JSON parses successfully.
- [ ] `requirement_context_status` is `placeholder`.
- [ ] `requirement_completion_status` is present.
- [ ] `scope_constraints.no_upload_backend` is true.
- [ ] `handoff_targets` remain owner-guide followup before completion and downstream targets only after completion.

## Forbidden Boundary Check

- [ ] No real AI API call is made.
- [ ] No API key, token, or credential is present.
- [ ] No DB / Supabase / auth call is made.
- [ ] No upload backend or production storage write is made.
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

- `SECOND_DEPUTY_COMMANDER` manages requirement flow, UI logic, task progress, runtime evidence, and functional acceptance routing.
- Commander / Second Deputy approval is required before changing the onboarding `code.html` entry route.
- Final acceptance, merge readiness, and workstream closure still require the appropriate commander / maintainer decision.
