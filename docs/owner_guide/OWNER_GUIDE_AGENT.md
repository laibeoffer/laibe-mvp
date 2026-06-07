# Owner Guide Agent

Agent: 需求引導官 Agent / Owner Guide Agent

Workstream: `app/owner-guide-agent`

Managed by: `SECOND_DEPUTY_COMMANDER`

Repo / Branch: `laibeoffer/laibe-mvp` / `app/owner-guide-agent-main-sync`

Status: `ACTIVE_FLOW_CORRECTION`

Runtime status: `WEB_RUNTIME_PENDING` after flow correction until browser evidence is refreshed.

GitHub operating path: GitHub `laibeoffer/laibe-mvp` branch / PR is the source of truth. Local workspace output is draft evidence only until represented on GitHub.

Current GitHub branch / PR: `app/owner-guide-agent-main-sync` / PR #53.

## Management Update

The Owner Guide Agent is no longer managed by `EXECUTION_OFFICER`. Requirement flow, UI logic, task progress, functional acceptance routing, and runtime evidence are supervised by `SECOND_DEPUTY_COMMANDER`.

## Role

The Owner Guide Agent is the mandatory owner-side requirement intake flow. It helps owners describe renovation needs through guided question-and-answer, records each effective answer, supports undo / answer revision, captures mock upload metadata, and produces structured placeholders for downstream plan-puzzle, budget preview, bid preparation, and AI PCM context.

It must not let owners skip requirement intake. Plan-puzzle and budget-preview CTAs are hidden until `requirement_completion_status` is `completed`.

## Primary Outputs

- `OwnerGuideQuestionFlow`
- `OwnerGuideSessionState`
- `QuestionAnswerLog`
- `AnswerRevisionLog`
- `StructuredRequirementNotes`
- `OwnerIntent`
- `ProjectRequirementBrief placeholder`
- `RequirementGapChecklist`
- `NextStepRecommendation`

## Required Flow Corrections

- Remove visible skip buttons for plan-puzzle and budget-preview while requirements are incomplete.
- Gate next-step CTA until the owner completes the requirement form.
- Show owner-readable bullet requirement notes instead of JSON-only display.
- Support undo / previous-answer revision without keeping reverted answers as effective requirement output.
- Add mock upload metadata windows for current plan files, current site photos, and style reference images.
- Add `owner_additional_notes` before completion.
- Add `requirement_completion_status`: `incomplete`, `ready_for_review`, `completed`.

## Runtime Scope

The standalone mock runtime may use front-end memory, local file metadata, and placeholder JSON. It must not connect upload backend, production storage, DB, auth, payment, webhook, real AI API, Budget Engine, Renderer, MethodSpec, Raw Candidate, Output Documents, or Plancraft core.

## Handoff Rule

Any handoff to budget-related work must remain `placeholder`, `linked`, or `verified` context only. Free text requirements must not become formal budget input without downstream validation and explicit integration authorization.

## Need Commander

Yes only if changing product routing / `code.html` entry behavior, production process, or real AI API direction. The current standalone mock correction does not implement `code.html` routing.

## Need Reviewer

No by default. Reviewer is needed only if this output is proposed for budget integration harness or if any formal price / formal quote boundary appears.
