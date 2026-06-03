# AI PCM Blackboard

## AI PCM Department Principles

1. 所有爭議都按照合約走。
2. AI PCM 不偏甲方，也不偏乙方。
3. LINE 是終端，不是合約。
4. AI 是建議，不是法官。
5. placeholder 不是正式依據。
6. verified 資料才可作正式判斷。
7. payment / escrow / listing fee 只預留，不接真服務。
8. 不做正式法律裁決。
9. 不自動放款。
10. 不自動改合約。
11. 不讓 LINE 訊息覆蓋合約。
12. 不讓 AI 推測凌駕合約與紀錄。

## AI PCM Command Structure

- 最高指揮官 / Deputy Commander 負責 AI PCM 部門建立、docs-only PR、closeout、重大方向裁決。
- AI PCM 總監／後台總控 Agent 負責日常監管其餘 5 個 AI PCM agents。
- 巡檢官／整合官只在 AI PCM 要接入預算生成系統、BudgetOutputSnapshot、合約資料、招標前置時做 final integration review。
- 第二副指揮官只在甲乙方入口、LINE 終端、AI PCM 後台 UI 需要進網站流程時介入。
- 執行官只在 browser / runtime evidence 需要驗證時介入。
- 招標副指揮官只在招標前置輔助與招標系統對接時介入。
- 單一部門 agent 不得直接向使用者要求權限；所有權限要求一律提報 AI PCM 總監。
- AI PCM 總監可在白名單範圍內自行決策：docs-only、mock-only、placeholder-only、contract-only、AI PCM blackboard update、AUTOMATION.md、evidence packet、final completion report。
- 高風險事項必須由 AI PCM 總監整理成 Permission / Decision Packet 後升級最高指揮官。
- AI PCM 總監不是狀態報告員；只要下轄 agent 未 closeout，就必須追問、派工、處置、或標記 `AGENT_IDLE_VIOLATION`。
- 若 AI PCM 總監只回報狀態而不處置，最高指揮官可標記 `SUPERVISOR_IDLE_VIOLATION`。

## Agent Self-Introductions

| Agent | Workstream | Managed By | Status | Automation | Progress % | Blocker | Next |
|---|---|---|---|---|---:|---|---|
| AI PCM 總監／後台總控 Agent | `pcm/admin-control-center` | 最高指揮官 / Deputy Commander | `ACTIVE_SUPERVISION` | `pcm-admin-control-center-patrol` / every 15 minutes | 98 | None for docs-only governance | Review managed agent closeouts, idle risks, permission queue, and stop approvals |
| 合約資料與證據管理 Agent | `pcm/contract-evidence-admin` | AI PCM 總監／後台總控 Agent | `READY_FOR_SUPERVISOR_REVIEW` | `ai-pcm-department-15m-patrol` / every 15 minutes | 95 | Supervisor closeout acceptance pending | Verify evidence status never promotes placeholder / LINE / local files to verified facts |
| 問題分流與合約裁決建議 Agent | `pcm/issue-routing-contract-decision` | AI PCM 總監／後台總控 Agent | `READY_FOR_SUPERVISOR_REVIEW` | `pcm-issue-routing-contract-decision-patrol` / every 15 minutes | 96 | Earlier agent-local git warning reconciled by Deputy Commander; PR #77 is shared truth | Confirm suggestions remain human-review drafts, not legal rulings; supervisor closeout acceptance pending |
| 甲乙方入口與 LINE 終端 Agent | `pcm/party-entry-line-terminal` | AI PCM 總監／後台總控 Agent | `READY_FOR_SUPERVISOR_REVIEW` | `pcm-party-entry-line-terminal-patrol` / every 15 minutes | 96 | Supervisor closeout acceptance pending | Confirm LINE remains notice / input terminal only; patrol continues until automation stop approved |
| 招標前置輔助 Agent | `pcm/pre-tender-readiness` | AI PCM 總監／後台總控 Agent | `READY_FOR_SUPERVISOR_REVIEW` | `pcm-pre-tender-readiness-patrol` / every 15 minutes | 96 | Runtime sub-agent launch pending due thread limit; PR #77 is shared truth | Continue patrol until supervisor closeout acceptance and automation stop approved |
| 付款節點與金流分撥預留 Agent | `pcm/payment-ledger-placeholder` | AI PCM 總監／後台總控 Agent | `READY_FOR_SUPERVISOR_REVIEW` | `pcm-payment-ledger-placeholder-patrol` / every 15 minutes | 96 | Runtime sub-agent launch pending due thread limit; PR #77 is shared truth | Review placeholder ledger evidence packet; do not touch real payment / escrow / listing fee |

## Agent Self-Introduction: 招標前置輔助 Agent

Agent:
招標前置輔助 Agent

Workstream:
pcm/pre-tender-readiness

Managed By:
AI PCM 總監／後台總控 Agent

Coordination:
招標副指揮官 / Tender Deputy Planning Officer

Status:
ACTIVE_INITIALIZATION

Automation:
pcm-pre-tender-readiness-patrol / every 15 minutes

Role:
檢查甲方招標前需求、圖面、現況照片、預算、材料、工法、不包含項目、付款 / 驗收節點是否足以進入招標。

No-Idle Rule:
20 分鐘無回應必須自我推進，不得等待命令派發。

## Permission Queue to AI PCM Supervisor

| Request | Requested By | Risk Level | Supervisor Decision | Status |
|---|---|---|---|---|
| Department blackboard setup | 最高指揮官 / Deputy Commander | Low / docs-only | Approved by Deputy Commander | `APPROVED_AND_DONE` |
| Department heartbeat automation | 最高指揮官 / Deputy Commander | Low / Codex thread heartbeat only | Approved by Deputy Commander | `APPROVED_AND_DONE` |
| Runtime launch for remaining 2 agents | Deputy Commander | Low operational / tool limit | Retry only when runtime slot is available; docs-only assignment continues | `PENDING_RUNTIME_CAPACITY` |
| External scheduler registration for per-agent patrols | AI PCM agents | Medium / could imply production automation | Keep as Codex app heartbeat / documented-only for now; no production scheduler | `BLOCKED_OUTSIDE_DOCS_ONLY` |
| Any real payment, escrow, listing fee, DB, LINE API, AI API, formal legal wording, production runtime, formal tender, formal quote, or formal price | Any AI PCM agent | High | Must be routed to AI PCM 總監／後台總控 Agent first; supervisor escalates to 最高指揮官 when required | `NOT_APPROVED` |
| Supervisor minimum deliverables completion | Deputy Commander | Low / docs-only | Approved and executed | `APPROVED_AND_DONE` |

## Active Tasks

| Agent | Task | Status | Next |
|---|---|---|---|
| AI PCM 總監／後台總控 Agent | Maintain department blackboard, permission queue, stalled watchlist, closeout queue, case status model, task queue, and review queue | `ACTIVE` | Accept or request minimal fixes for five managed agent packets |
| 合約資料與證據管理 Agent | Contract/evidence source map and verified evidence policy | `READY_FOR_SUPERVISOR_REVIEW` | Supervisor reviews evidence packet and closeout checklist |
| 問題分流與合約裁決建議 Agent | Issue taxonomy, RFI / dispute schema, response template, decision-suggestion boundary | `READY_FOR_SUPERVISOR_REVIEW` | Supervisor confirms no legal-ruling language |
| 甲乙方入口與 LINE 終端 Agent | Party entry and LINE terminal contract / schemas | `READY_FOR_SUPERVISOR_REVIEW` | Supervisor confirms LINE is terminal only |
| 招標前置輔助 Agent | Pre-tender readiness checklist, missing information list, risk checklist, attachment suggestions, initialization execution rules | `READY_FOR_SUPERVISOR_REVIEW` | Supervisor confirms no formal tender launch and no-idle rules |
| 付款節點與金流分撥預留 Agent | Payment ledger placeholder contracts, schema, checklist, evidence packet, closeout checklist, examples, and no-real-payment policy | `READY_FOR_SUPERVISOR_REVIEW` | Supervisor confirms no real payment implication and reviews source-of-truth blocker |

## Stalled Agent Watchlist

| Agent | Issue | Required Action | Deadline |
|---|---|---|---|
| 招標前置輔助 Agent | Runtime sub-agent launch could not be completed because current sub-agent thread limit was reached | Continue docs-only patrol under department automation; retry runtime launch only when capacity is available | Next supervisor patrol |
| 付款節點與金流分撥預留 Agent | Runtime sub-agent launch could not be completed because current sub-agent thread limit was reached; docs-only packet is complete | Continue docs-only patrol under payment ledger automation; retry runtime launch only when capacity is available | Next supervisor patrol |

## Closeout Queue

| Agent | Evidence | Closeout Status | Automation |
|---|---|---|---|
| AI PCM 總監／後台總控 Agent | `docs/ai_pcm/admin_control_center/AUTOMATION.md`, `PCM_ADMIN_CONTROL_CENTER_AGENT.md`, `pcm_case_status_model.md`, `pcm_task_queue.md`, `pcm_review_queue.md`, `examples/`, `MANAGED_AGENT_DISPATCH_ORDER.md`, `AGENT_FOLLOWUP_NOTICES.md`, `final_completion_report.md` | `READY_FOR_DEPUTY_CLOSEOUT` | Department heartbeat continues |
| 合約資料與證據管理 Agent | `docs/ai_pcm/contract_evidence_admin/evidence_packet.md`, `closeout_checklist.md`, `final_completion_report.md` | `PENDING_SUPERVISOR_REVIEW` | Continue until supervisor accepts or requests fix |
| 問題分流與合約裁決建議 Agent | `docs/ai_pcm/issue_routing_contract_decision/evidence_packet.md`, `closeout_checklist.md`, `supervisor_progress_report.md`, `final_completion_report.md` | `PENDING_SUPERVISOR_REVIEW` | Continue until supervisor accepts or requests fix |
| 甲乙方入口與 LINE 終端 Agent | `docs/ai_pcm/party_entry_line_terminal/evidence_packet.md`, `initialization_progress_report.md`, `closeout_checklist.md`, `final_completion_report.md` | `PENDING_SUPERVISOR_REVIEW` | Continue until supervisor accepts or requests fix |
| 招標前置輔助 Agent | `docs/ai_pcm/pre_tender_readiness/evidence_packet.md`, `closeout_checklist.md`, `initialization_progress_report.md`, `initialization_execution_rules.md`, `final_completion_report.md`, and readiness docs | `PENDING_SUPERVISOR_REVIEW` | Continue until supervisor closeout acceptance; stop only after automation stop approved |
| 付款節點與金流分撥預留 Agent | `docs/ai_pcm/payment_ledger_placeholder/evidence_packet.md`, `closeout_checklist.md`, `initialization_progress_report.md`, `final_completion_report.md` | `PENDING_SUPERVISOR_REVIEW` | Continue until supervisor accepts or requests fix; automation stops only after supervisor stop approval |

## Source Of Truth / Local State

- GitHub source of truth: `laibeoffer/laibe-mvp` `origin/main`.
- GitHub main SHA checked for this setup: `9d836c43e25af6eb05380b46296407476054f141`.
- GitHub draft PR: `https://github.com/laibeoffer/laibe-mvp/pull/77`.
- Latest known PR head SHA before this round: `fe2ebe17fc40d616ecd1270eee8263a957e309f9`. Read GitHub PR #77 for the latest head SHA after follow-up commits.
- Local execution workspace: `Z:\08-Jacky\laibe_pcm`.
- Local branch: `codex/ai-pcm-department-setup`.
- `Z:\08-Jacky\laibe_pcm` is LOCAL_STATE / execution workspace only; GitHub main / PR / commit SHA remains authoritative.
- LOCAL_STATE_STALE: `C:\laibe_project` was on `local-ai-workflow` with a dirty worktree and was not used as this round's source of truth.
- LOCAL_STATE_STALE: pre-existing local AI PCM draft state was reconciled into this blackboard. Shared truth for this setup is now PR #77 and the latest GitHub PR head SHA.

## Runtime Launch Notes

| Agent | Runtime State | Runtime Id / Note |
|---|---|---|
| AI PCM 總監／後台總控 Agent | `SPAWNED_READONLY_REPORT_RECEIVED` | Sub-agent `019e8bb0-69b5-7481-af25-1e8375f5931c` / nickname `Leibniz`; closed after report to free capacity |
| 合約資料與證據管理 Agent | `SPAWNED_READONLY_REPORT_RECEIVED` | Sub-agent `019e8bb0-6e06-7c70-92de-34b347e35705` / nickname `Dirac`; closed after report |
| 問題分流與合約裁決建議 Agent | `SPAWNED_READONLY_REPORT_RECEIVED` | Sub-agent `019e8bb0-765f-7e00-b27a-4721bda16099` / nickname `Newton`; closed after report |
| 甲乙方入口與 LINE 終端 Agent | `SPAWNED_READONLY_REPORT_RECEIVED` | Sub-agent `019e8bb0-7c9b-7e00-b47e-a506dd4fe6d6` / nickname `Kuhn`; closed after report |
| 招標前置輔助 Agent | `ASSIGNED_NOT_SPAWNED` | Spawn attempt failed because current sub-agent thread limit was reached; docs-only packet exists |
| 付款節點與金流分撥預留 Agent | `ASSIGNED_NOT_SPAWNED` | Spawn attempt failed because current sub-agent thread limit was reached; docs-only packet exists and patrol continues |

## Agent Work Products

| Agent | Evidence | Status | Supervisor Action |
|---|---|---|---|
| AI PCM 總監／後台總控 Agent | `docs/ai_pcm/admin_control_center/` | `INITIALIZED` | Continue patrol and closeout supervision |
| 合約資料與證據管理 Agent | `docs/ai_pcm/contract_evidence_admin/` | `READY_FOR_SUPERVISOR_REVIEW` | Check verified evidence policy and disputed / superseded logs |
| 問題分流與合約裁決建議 Agent | `docs/ai_pcm/issue_routing_contract_decision/` | `READY_FOR_SUPERVISOR_REVIEW` | Check legal-ruling boundary and human-review escalation |
| 甲乙方入口與 LINE 終端 Agent | `docs/ai_pcm/party_entry_line_terminal/` | `READY_FOR_SUPERVISOR_REVIEW` | Check LINE terminal boundary and role permissions |
| 招標前置輔助 Agent | `docs/ai_pcm/pre_tender_readiness/` | `READY_FOR_SUPERVISOR_REVIEW` | Check readiness status policy and tender-launch prohibition |
| 付款節點與金流分撥預留 Agent | `docs/ai_pcm/payment_ledger_placeholder/` | `READY_FOR_SUPERVISOR_REVIEW` | Check placeholder-only payment vocabulary, evidence packet, closeout checklist, no-idle compliance, and source-of-truth blocker routing |

## Automation And No-Idle Rules

- Automation id: `ai-pcm-department-15m-patrol`.
- Supervisor automation name: `pcm-admin-control-center-patrol`.
- Pre-tender agent heartbeat automation id: `pcm-pre-tender-readiness-patrol`.
- Cadence: every 15 minutes.
- Self-introduction is task start, not task completion.
- No-idle rule: after blackboard self-introduction, if no response occurs within 20 minutes, the agent must auto-progress the next safe task.
- Forbidden idle language: 等待命令派發、本輪無新指派、等使用者、等最高指揮官、等 AI PCM 總監、等整合官、blocker unchanged、no material change、pending approval。
- If an agent cannot solve a task, it must submit a Permission / Decision Packet to the AI PCM Supervisor, then continue other safe work.
- Automation stop is forbidden until AI PCM 總監／後台總控 Agent records both closeout acceptance and automation stop approved.
- If the AI PCM Supervisor only reports status and does not act, the Deputy Commander may mark `SUPERVISOR_IDLE_VIOLATION`.

## Payment Ledger Placeholder Rule Correction

- Agent: 付款節點與金流分撥預留 Agent
- Workstream: `pcm/payment-ledger-placeholder`
- Managed By: AI PCM 總監／後台總控 Agent
- Status: `READY_FOR_SUPERVISOR_REVIEW`
- Automation: `pcm-payment-ledger-placeholder-patrol` / every 15 minutes
- No-idle correction: blackboard self-introduction is task start only, not task completion.
- Required flow completed: self-introduction, `AUTOMATION.md`, workstream docs, contracts, schema, checklist, policy, examples, evidence packet, closeout checklist, initialization progress report, final completion report, and blackboard status update.
- Forbidden idle reports: 等待命令派發, 本輪無新指派, 等 AI PCM 總監指示, 等最高指揮官指示, 等使用者核准, no material change, pending approval.
- Stop rule: continue patrol until AI PCM 總監 declares closeout acceptance and automation stop approved.
- Permission / Blocker Packet: earlier `LOCAL_STATE_STALE` gitdir uncertainty has been reconciled by Deputy Commander for docs-only initialization; GitHub PR / commit SHA remains the shared truth boundary.
- Forbidden scope check: no production LINE API, real payment, escrow, listing fee, DB / Supabase, AI API, production runtime, formal legal decision, formal tender launch, formal quote, or formal price touched.

## Forbidden Production Scope

- Production LINE API: forbidden.
- Payment / escrow / listing fee: placeholder-only; no real service, no auto release, no fund movement.
- DB / Supabase: forbidden unless explicitly authorized.
- Production AI API: forbidden unless explicitly authorized.
- Formal legal decision: forbidden; AI PCM provides suggestions only.
- Runtime code: forbidden in this docs-only setup.
- Formal tender launch: forbidden.
- Formal quote / formal price: forbidden.
- Automatic contract change: forbidden.

## Patrol Record

| Time | Actor | Action | Result |
|---|---|---|---|
| 2026-06-03 | Deputy Commander | Created AI PCM department branch from GitHub main SHA `9d836c43e25af6eb05380b46296407476054f141` | `DONE` |
| 2026-06-03 | Deputy Commander | Created AI PCM department blackboard at `docs/ai_pcm/AI_PCM_BLACKBOARD.md` | `DONE` |
| 2026-06-03 | Deputy Commander | Added exactly one global blackboard pointer to `docs/WORKSTREAM_BLACKBOARD.md` | `DONE` |
| 2026-06-03 | Deputy Commander | Created department heartbeat automation `ai-pcm-department-15m-patrol` | `DONE` |
| 2026-06-03 | Deputy Commander | Assigned all 6 AI PCM agents and spawned 4 runtime agents before the sub-agent thread limit was reached | `PARTIAL_RUNTIME_LAUNCH_WITH_DOCS_ASSIGNMENT_COMPLETE` |
| 2026-06-03 | AI PCM agents | Produced docs-only packets under `docs/ai_pcm/` | `READY_FOR_SUPERVISOR_REVIEW` |
| 2026-06-03 | Deputy Commander | Reordered blackboard so department principles and command structure are the first active sections | `DONE` |
| 2026-06-03T04:27:47Z | AI PCM 總監／後台總控 Agent | Heartbeat patrol verified all five managed agent directories have `AUTOMATION.md`, core docs, examples, and `final_completion_report.md`; JSON examples parse; forbidden-scope scan found prohibition language only, no real integration evidence | `READY_FOR_SUPERVISOR_REVIEW_NO_IDLE_VIOLATION_ACTIVE` |
| 2026-06-03T04:35:30Z | 問題分流與合約裁決建議 Agent | Heartbeat patrol verified files, UTF-8 JSON examples, automation fields, and forbidden scope; earlier agent-local git observation was superseded by Deputy Commander reconciliation, so source-of-truth remains GitHub PR #77 / latest PR head SHA | `READY_FOR_SUPERVISOR_REVIEW_PATROL_ACTIVE` |
| 2026-06-03 | Deputy Commander | Opened docs-only draft PR #77; use GitHub PR #77 for the latest head SHA after follow-up commits | `DONE` |
| 2026-06-03T04:35:30Z | 付款節點與金流分撥預留 Agent | Payment ledger placeholder heartbeat patrol verified 20 workstream files, parsed all 4 JSON examples, confirmed allowed payment / review statuses, confirmed automation `pcm-payment-ledger-placeholder-patrol` remains ACTIVE every 15 minutes, and found no real payment / escrow / listing fee / bank API / DB / AI API / LINE API integration. Earlier agent-local git observation was superseded by Deputy Commander reconciliation; shared truth remains GitHub PR #77 / latest PR head SHA. | `PATROL_COMPLETE_PLACEHOLDER_ONLY_CONTINUE_UNTIL_SUPERVISOR_CLOSEOUT` |
| 2026-06-03 | 招標前置輔助 Agent | Corrected execution rules: self-introduction is task start, Codex app heartbeat created, evidence packet source-of-truth wording reconciled to PR #77, and patrol stop requires supervisor closeout acceptance plus automation stop approved | `RULES_CORRECTED_PATROL_ACTIVE` |
| 2026-06-03T12:33:31+08:00 | 付款節點與金流分撥預留 Agent | Confirmed self-introduction is task start only; initialization tasks were already executed immediately: docs directory, `AUTOMATION.md`, agent file, contracts, schema, checklist, policy, examples, evidence packet, closeout checklist, final report, and AI PCM blackboard updates. Patrol remains active every 15 minutes; 20-minute no-response rule triggers next safe task. | `NO_IDLE_RULE_CORRECTED_CONTINUE_PATROL_PENDING_SUPERVISOR_CLOSEOUT` |
| 2026-06-03T04:31:30Z | 合約資料與證據管理 Agent | Heartbeat patrol found missing dedicated evidence schema doc and completed safe docs-only `evidence_record_schema.md`; updated evidence packet, closeout checklist, and final report; JSON examples still parse; automation remains active until supervisor closeout and stop approval | `SAFE_WORK_CONTINUED_SCHEMA_FILLED` |
| 2026-06-03T04:33:30Z | 甲乙方入口與 LINE 終端 Agent | Heartbeat patrol found missing dedicated `evidence_packet.md` despite packet being referenced; created docs-only evidence packet and updated indexes; JSON examples still parse; LINE remains terminal only | `SAFE_WORK_CONTINUED_EVIDENCE_PACKET_FILLED` |
| 2026-06-03T12:37:04+08:00 | 招標前置輔助 Agent | Reconfirmed self-introduction is task start only; verified docs directory, `AUTOMATION.md`, main agent file, core checklist / schema / policy files, examples, evidence packet, closeout checklist, final report, and Codex heartbeat automation. JSON examples parse; patrol remains active every 15 minutes and 20-minute no-response rule advances the next safe task. | `NO_IDLE_RULE_CONFIRMED_CONTINUE_PATROL_PENDING_SUPERVISOR_CLOSEOUT` |
| 2026-06-03 | Deputy Commander | Added principles 11-12, updated supervisor automation name to `pcm-admin-control-center-patrol`, and completed AI PCM supervisor minimum docs: agent file, case status model, task queue, review queue, and final report | `DONE` |
