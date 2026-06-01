# Owner Guide Flow Correction Report

## 1. Management Update

- Managed By updated to `SECOND_DEPUTY_COMMANDER`: yes, in scoped Owner Guide docs and automation record.
- Blackboard updated: pending GitHub-safe blackboard patch. PR #53 branch is behind current main; direct blackboard replacement from stale branch would risk overwriting Budget Review / E2E QA rows. The required row change is documented here and should be applied from current `main` during safe resync:
  - Owner Guide Agent managed by `SECOND_DEPUTY_COMMANDER`
  - status after correction: `WEB_RUNTIME_PENDING` until refreshed browser evidence is recorded

## 2. UI Changes

- removed skip buttons: yes, standalone mock runtime no longer shows plan-puzzle / budget-preview CTA before completion.
- gated next-step CTA: yes, downstream CTAs are generated only after `requirement_completion_status = completed`.
- requirement completion status: implemented as `incomplete`, `ready_for_review`, `completed`.

## 3. Requirement Notes

- bullet note system: implemented as owner-readable `需求紀錄` list.
- question_answer_log: effective answers are shown; reverted answers are excluded from effective display.
- structured_requirement_notes: included in OwnerIntent and ProjectRequirementBrief placeholder.

## 4. Undo / Revision

- undo available: yes, `回上一題` reverts the most recent active answer.
- answer_revision_log: included with `active` / `reverted` statuses.
- effective answer state: OwnerIntent and ProjectRequirementBrief placeholder are built from effective answers only.

## 5. Upload Windows

- current plan upload: implemented as local file metadata capture under `current_plan_files`.
- current site photos: implemented as local file metadata capture under `current_site_photos`.
- style reference images: implemented as local file metadata capture under `style_reference_images`.
- mock only / real backend: mock only; no upload backend, production storage, DB, auth, or AI API.

## 6. Additional Notes

- owner_additional_notes: implemented and required before completion.

## 7. Output Contracts

- OwnerIntent updated: includes `requirement_completion_status`, `structured_requirement_notes`, `question_answer_log`, `answer_revision_log`, upload metadata windows, and `owner_additional_notes`.
- ProjectRequirementBrief placeholder updated: includes `requirement_completion_status`, structured notes, upload metadata windows, `owner_additional_notes`, and `scope_constraints.no_upload_backend`.

## 8. Runtime Evidence

- browser tested: pending after GitHub branch update.
- mock runtime status: `WEB_RUNTIME_PENDING` after correction until revalidated.
- evidence: previous standalone runtime evidence exists but is superseded by this flow correction.
- missing: refreshed browser evidence for gated flow, undo, upload metadata capture, and completion CTA gate.

## 9. Forbidden Scope Check

- AI API: not connected.
- upload backend: not connected.
- payment: not connected.
- DB: not connected.
- Budget Engine: not touched.
- formal price: not generated.
- BudgetEstimateLine: not generated.

## 10. PR / Commit

- branch: `app/owner-guide-agent-main-sync`
- PR URL: https://github.com/laibeoffer/laibe-mvp/pull/53
- correction commits begin with runtime commit `676c2d82f5799a88149f0dc146c00134fe64dbbd`.

## 11. Need Commander

No for standalone mock correction. Yes only for `code.html` routing / entry change or production product-flow decision.

## 12. Need Reviewer

No by default. Yes if this output is proposed for budget integration harness or if formal-price / formal-output boundary appears.
