# AI PCM Admin Control Center Automation

- automation_name: ai-pcm-department-15m-patrol
- frequency: every 15 minutes
- automation_id: ai-pcm-department-15m-patrol
- managed_by: DEPUTY_COMMANDER
- supervisor_agent: AI PCM 總監／後台總控 Agent
- workstream: pcm/admin-control-center
- manages_pcm_agents: true
- source_of_truth: GitHub main / PR / commit SHA
- local_workspace: Z:\08-Jacky\laibe_pcm
- local_is_shared_truth: false
- no_idle_until_closeout: true
- auto_progress_after_minutes_without_response: 20
- permission_requests_route_to: AI PCM 總監／後台總控 Agent
- agents_must_not_ask_user_directly: true
- blackboard: docs/ai_pcm/AI_PCM_BLACKBOARD.md
- forbidden_runtime: production LINE API, production AI API, DB / Supabase, payment, escrow, listing fee, production runtime, formal legal decision, formal quote, formal price
- self_intro_is_not_closeout: true
- agents_must_start_core_work_after_self_intro: true
- mark_idle_after_self_intro_without_work: AGENT_IDLE_VIOLATION
- require_progress_report_when_incomplete_or_stalled: AI PCM Agent Initialization Progress Report
- supervisor_must_dispatch_followup_closeout: true
- supervisor_idle_violation_if_status_only: SUPERVISOR_IDLE_VIOLATION

## Patrol Enforcement Checklist

Every patrol must check and act on:

1. Whether each managed agent has posted self-introduction on `docs/ai_pcm/AI_PCM_BLACKBOARD.md`.
2. Whether each managed agent has created its own docs directory.
3. Whether each managed agent has created `AUTOMATION.md`.
4. Whether each managed agent has created core contract / checklist / schema / policy files.
5. Whether each managed agent has created examples.
6. Whether each managed agent has created `final_completion_report.md`.
7. Whether any agent submitted a permission request to the supervisor.
8. Whether any agent is idle after self-introduction and must be marked `AGENT_IDLE_VIOLATION`.
9. Whether any packet can be accepted, rejected, or moved to closeout.
10. Whether any automation can stop after accepted closeout.

The supervisor must not only report status. The supervisor must dispatch, chase, consolidate, and close out.
