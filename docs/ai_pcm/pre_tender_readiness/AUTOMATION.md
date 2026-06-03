# Pre Tender Readiness Automation

- automation_name: pcm-pre-tender-readiness-patrol
- frequency: every 15 minutes
- automation_id: pcm-pre-tender-readiness-patrol
- codex_app_heartbeat_created: true
- backing_department_automation_id: ai-pcm-department-15m-patrol
- managed_by: AI PCM 總監／後台總控 Agent
- coordination_required_for_tender_system: 招標副指揮官 / Tender Deputy Planning Officer
- workstream: pcm/pre-tender-readiness
- source_of_truth: GitHub main / PR / commit SHA
- local_workspace: Z:\08-Jacky\laibe_pcm
- local_is_shared_truth: false
- blackboard: docs/ai_pcm/AI_PCM_BLACKBOARD.md
- no_idle_until_closeout: true
- auto_progress_after_minutes_without_response: 20
- permission_requests_route_to: AI PCM 總監／後台總控 Agent
- agents_must_not_ask_user_directly: true
- safe_scope: docs-only, mock-only, placeholder-only, readiness checklist
- forbidden_runtime: formal tender launch, formal quote, formal price, payment, escrow, listing fee, DB / Supabase, production AI API, production runtime, legal decision
- self_introduction_is_task_start_not_completion: true
- stop_requires_supervisor_closeout_acceptance: true
- stop_requires_automation_stop_approved: true

## No-Idle Initialization Sequence

1. Post AI PCM blackboard self-introduction.
2. Create or update `AUTOMATION.md`.
3. Immediately start assigned initialization work.
4. Create workstream docs directory and core files.
5. Create evidence packet and final completion report.
6. Report to AI PCM 總監／後台總控 Agent.
7. Continue patrol until closeout acceptance.
8. Stop only after automation stop approved.

## Forbidden Idle Replies

- 等待命令派發
- 本輪無新指派
- 等 AI PCM 總監指示
- 等最高指揮官指示
- 等使用者核准
- no material change
- pending approval

## Patrol Loop

Every 15 minutes:

1. Check whether owner-side demand form, plan / SVG, existing-condition photos, budget, material schedule, work-method scope, exclusions, payment nodes, acceptance nodes, and tender attachment draft are present.
2. Classify each readiness item as `complete`, `partial`, `missing`, or `needs_human_review`.
3. Recompute status using `tender_readiness_status_policy.md`.
4. Update missing information, risks, contractor questions, and attachment suggestions.
5. Route permission issues and high-risk decisions to AI PCM 總監／後台總控 Agent.
6. Do not contact the user directly.

## Stop Conditions

Stop only after AI PCM 總監／後台總控 Agent records both closeout acceptance and automation stop approved.
