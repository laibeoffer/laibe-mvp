# Owner Guide Session State

Managed by: `SECOND_DEPUTY_COMMANDER`

## Purpose

`OwnerGuideSessionState` tracks the effective state of the guided requirement-intake flow before any downstream integration. It is front-end mock state in the current runtime.

## Fields

- `session_id`
- `project_id`
- `current_stage`
- `answered_stages`
- `requirement_completion_status`
- `question_answer_log`
- `answer_revision_log`
- `structured_requirement_notes`
- `current_plan_files`
- `current_site_photos`
- `style_reference_images`
- `owner_additional_notes`
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
- `stage` / `field_key`
- `question`
- `owner_answer`
- `effective`
- `source`
- `confidence`
- `created_at`

Only entries with `effective: true` may feed OwnerIntent / ProjectRequirementBrief placeholder.

## AnswerRevisionLog Entry

- `revision_id`
- `field_key`
- `qa_log_id`
- `previous_value`
- `new_value`
- `revision_status`: `active` or `reverted`
- `created_at`

Reverted answers may remain in this log for internal traceability, but must not remain as effective requirement parameters.

## Mock Upload Metadata

### current_plan_files

- `file_type`
- `file_name`
- `upload_status`
- `linked_to_plan_puzzle`
- `captured_at`

### current_site_photos

- `room_label`
- `photo_type`
- `file_name`
- `upload_status`
- `captured_at`

### style_reference_images

- `style_note`
- `file_name`
- `upload_status`
- `captured_at`

Upload status must remain `local_placeholder_metadata_only` until a real upload backend is explicitly authorized.

## Runtime Scope

The MVP may keep this state in front-end memory for mock runtime. It must not write to DB, auth, payment, upload backend, budget engine, renderer, production storage, or production AI API without explicit authorization.
