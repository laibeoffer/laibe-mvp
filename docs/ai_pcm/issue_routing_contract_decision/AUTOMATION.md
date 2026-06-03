# Issue Routing Contract Decision Automation

automation_name:
pcm-issue-routing-contract-decision-patrol

automation_id:
pcm-issue-routing-contract-decision-patrol

automation_runtime:
Codex app heartbeat created for this thread; deleted after AI PCM 總監 closeout acceptance and automation stop approval

frequency:
every 15 minutes

automation_status:
STOPPED_AFTER_SUPERVISOR_CLOSEOUT

managed_by:
AI PCM 總監／後台總控 Agent

workstream:
pcm/issue-routing-contract-decision

source_of_truth:
GitHub main / PR / commit SHA

local_workspace:
Z:\08-Jacky\laibe_pcm

local_workspace_role:
LOCAL_STATE / execution workspace only

blackboard:
docs/ai_pcm/AI_PCM_BLACKBOARD.md

no_idle_until_closeout:
true

auto_progress_after_minutes_without_response:
20

permission_requests_route_to:
AI PCM 總監／後台總控 Agent

agents_must_not_ask_user_directly:
true

automation_stop_rule:
Only stop after AI PCM 總監／後台總控 Agent records closeout acceptance and automation stop approved.

automation_stop_record:
2026-06-03T06:24:07Z patrol confirmed `CLOSEOUT_ACCEPTED_WITH_NOTES` and agent-specific automation stop approved, then deleted Codex app heartbeat `pcm-issue-routing-contract-decision-patrol`.

## Required Startup Flow

1. 到 AI PCM 黑板自我介紹。
2. 建立 `AUTOMATION.md`。
3. 立即開始執行本 workstream 初始化任務。
4. 建立 workstream docs 目錄與核心文件。
5. 提交 evidence packet / final completion report。
6. 回報 AI PCM 總監／後台總控 Agent。
7. 取得 AI PCM 總監／後台總控 Agent closeout acceptance。
8. 僅於 AI PCM 總監／後台總控 Agent 宣告 automation stop approved 後停止 patrol。

## Safe Scope

- docs-only
- mock-only
- placeholder-only
- contract-only
- self-introduction
- `AUTOMATION.md`
- evidence packet
- final completion report
- AI PCM blackboard status update
- schema / checklist / handoff / policy 文件

## High-Risk Scope Routed to Supervisor

- product direction
- formal legal wording
- production LINE API
- production AI API
- DB / Supabase
- payment / escrow / listing fee
- formal tender launch
- formal contract enforcement
- production runtime
- formal quote / formal price

## No-Idle Behavior

If blocked, the Agent must:

1. Attempt self-solve inside safe scope.
2. Prepare a Permission Packet or Blocker Packet for AI PCM 總監／後台總控 Agent.
3. Continue another safe task after submitting the packet.
4. Re-check safe work queue after 20 minutes without external response.

## Patrol Checklist

- Verify blackboard self-introduction remains present.
- Verify `AUTOMATION.md` and no-idle fields remain current.
- Verify issue classification, ticket schema, response template, decision suggestion template, style guide, escalation rules, examples, evidence packet, closeout checklist, and final completion report exist.
- Verify no placeholder is treated as verified evidence.
- Verify no LINE message overrides contract documents.
- Verify no formal legal decision, payment command, construction command, formal quote, DB connection, production AI API, production LINE API, or payment service was touched.
