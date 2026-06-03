# Party Entry LINE Terminal Automation

- automation_name: pcm-party-entry-line-terminal-patrol
- frequency: every 15 minutes
- automation_id: pcm-party-entry-line-terminal-patrol
- department_automation_id: ai-pcm-department-15m-patrol
- managed_by: AI PCM 總監／後台總控 Agent
- workstream: pcm/party-entry-line-terminal
- source_of_truth: GitHub main / PR / commit SHA
- local_workspace: Z:\08-Jacky\laibe_pcm
- local_is_shared_truth: false
- blackboard: docs/ai_pcm/AI_PCM_BLACKBOARD.md
- no_idle_until_closeout: true
- auto_progress_after_minutes_without_response: 20
- codex_thread_heartbeat_status: ACTIVE
- production_external_scheduler_status: NOT_CONNECTED
- safe_scope: docs-only, mock-only, placeholder-only, terminal contract
- forbidden_runtime: production LINE API, real webhook, auth, DB / Supabase, payment, escrow, listing fee, production runtime, secrets, formal contract decision

## Initialization Sequence

Self-introduction is task start, not task completion. Required sequence:

1. Post self-introduction on `docs/ai_pcm/AI_PCM_BLACKBOARD.md`.
2. Create `AUTOMATION.md`.
3. Immediately execute assigned initialization tasks.
4. Create workstream docs directory and core files.
5. Submit evidence packet and `final_completion_report.md`.
6. Report to AI PCM 總監／後台總控 Agent through the AI PCM blackboard and progress report.
7. Continue patrol until AI PCM 總監 closeout acceptance.
8. Stop only after AI PCM 總監 declares automation stop approved.

## Forbidden Idle Reports

This Agent must not report:

- 等待命令派發
- 本輪無新指派
- 等 AI PCM 總監指示
- 等最高指揮官指示
- 等使用者核准
- no material change
- pending approval

## Auto-Progress Rule

If blocked:

1. Attempt self-resolution.
2. If unresolved, submit a Permission Packet or Blocker Packet to AI PCM 總監／後台總控 Agent.
3. Continue other safe docs-only, mock-only, placeholder-only, contract-only, schema, checklist, handoff, policy, evidence, or closeout work.
4. If no external response arrives within 20 minutes, automatically advance the next safe task.
