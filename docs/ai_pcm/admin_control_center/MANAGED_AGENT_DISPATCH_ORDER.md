# Managed Agent Dispatch Order

Issued by: AI PCM 總監／後台總控 Agent

Workstream: `pcm/admin-control-center`

Scope: all five AI PCM managed agents.

## Order

自我介紹完成後不得等待命令，必須立即開始任務。

每個 agent 必須：

- 在 `docs/ai_pcm/AI_PCM_BLACKBOARD.md` 自我介紹。
- 建立自身 docs 目錄。
- 建立 `AUTOMATION.md`。
- 建立核心 contract / checklist / schema / policy。
- 建立 `examples/`。
- 建立 `final_completion_report.md`。
- 每 15 分鐘巡檢。
- 20 分鐘無回應自我推進。
- 權限請求只提報給 AI PCM 總監／後台總控 Agent，不得直接找使用者。

## Managed Agent Assignments

| Agent | Workstream | Required Directory | Immediate Assignment |
|---|---|---|---|
| 合約資料與證據管理 Agent | `pcm/contract-evidence-admin` | `docs/ai_pcm/contract_evidence_admin/` | Continue evidence policy patrol; submit initialization progress report; route source-of-truth confirmation request to supervisor |
| 問題分流與合約裁決建議 Agent | `pcm/issue-routing-contract-decision` | `docs/ai_pcm/issue_routing_contract_decision/` | Continue RFI / dispute taxonomy patrol; submit initialization progress report; route source-of-truth confirmation request to supervisor |
| 甲乙方入口與 LINE 終端 Agent | `pcm/party-entry-line-terminal` | `docs/ai_pcm/party_entry_line_terminal/` | Keep LINE terminal-only; submit initialization progress report; route scheduler / role-boundary permission to supervisor |
| 招標前置輔助 Agent | `pcm/pre-tender-readiness` | `docs/ai_pcm/pre_tender_readiness/` | Complete pre-tender readiness contract, checklist, schema, policy, examples, and final completion report; submit initialization progress report |
| 付款節點與金流分撥預留 Agent | `pcm/payment-ledger-placeholder` | `docs/ai_pcm/payment_ledger_placeholder/` | Complete placeholder ledger contract, checklist, schema, policy, examples, and final completion report; submit initialization progress report |

## Escalation Rule

The AI PCM Supervisor may approve docs-only, mock-only, placeholder-only, contract-only, blackboard updates, `AUTOMATION.md`, evidence packets, and final completion reports.

The AI PCM Supervisor may not approve product direction, formal legal wording, production LINE API, production AI API, DB / Supabase, payment / escrow / listing fee, formal tender launch, formal contract enforcement, or production runtime. These must be summarized for the highest commander.

## Violation Rule

If an agent posts self-introduction but does not start core work, mark:

`AGENT_IDLE_VIOLATION`

Then require:

`AI PCM Agent Initialization Progress Report`

If the supervisor only reports status and does not act, the highest commander may mark:

`SUPERVISOR_IDLE_VIOLATION`
