# Owner Guide Session State

## Purpose

`OwnerGuideSessionState` tracks the state of a guided requirement-intake conversation before any downstream integration.

## Fields

- `session_id`
- `project_id`
- `current_stage`
- `answered_stages`
- `question_answer_log`
- `extracted_requirement_signals`
- `asset_summary`
- `requirement_gaps`
- `next_recommended_step`
- `runtime_status`
- `created_at`
- `updated_at`

## QuestionAnswerLog Entry

- `qa_log_id`
- `session_id`
- `stage`
- `question`
- `owner_answer`
- `extracted_fields`
- `source`
- `confidence`
- `created_at`

## Runtime Scope

The MVP may keep this state in front-end memory for mock runtime. It must not write to DB, auth, payment, budget engine, or production AI API without explicit authorization.