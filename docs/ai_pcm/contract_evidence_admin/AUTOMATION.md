# Contract Evidence Admin Automation

## Automation Identity

Automation: `pcm-contract-evidence-admin-patrol`

Cadence: every 15 minutes

Status: `ACTIVE`

Mode: Codex app heartbeat attached to the current thread.

Workstream: `pcm/contract-evidence-admin`

Managed By: AI PCM 總監／後台總控 Agent

## Required Automation Control Fields

automation_name:
`pcm-contract-evidence-admin-patrol`

frequency:
every 15 minutes

managed_by:
AI PCM 總監／後台總控 Agent

no_idle_until_closeout:
true

auto_progress_after_minutes_without_response:
20

permission_requests_route_to:
AI PCM 總監／後台總控 Agent

agents_must_not_ask_user_directly:
true

automation_stop_rule:
Automation must remain active until AI PCM 總監／後台總控 Agent declares closeout acceptance and automation stop approved.

startup_rule:
Blackboard self-introduction is task startup only. It is not task completion and must be followed immediately by docs directory setup, AUTOMATION.md, core policy/schema/checklist files, examples, evidence packet, final completion report, and supervisor report.

forbidden_idle_language:
Do not report waiting for command dispatch, no new assignment, waiting for AI PCM Supervisor, waiting for Commander, waiting for user approval, no material change, or pending approval.

## Patrol Purpose

此 automation 用於定期巡檢合約證據資料倉文件與黑板狀態，確保 evidence status、正式依據規則與 forbidden scope 沒有被破壞。

Automation 不代表接入 production runtime，也不代表已接 DB、LINE、AI API 或 payment。

## Patrol Checklist

每次巡檢應確認：

- 黑板存在本 Agent 自我介紹。
- `docs/ai_pcm/contract_evidence_admin/` 文件存在。
- 所有 evidence status 僅使用 `placeholder`、`linked`、`verified`、`disputed`、`superseded`、`voided`、`unavailable`。
- `placeholder` 未被作為正式裁斷依據。
- `linked` 僅作追溯，不作正式裁斷。
- `verified` 才被標示可作正式依據。
- `disputed` 均要求人工審核。
- `superseded` 均保留歷史追溯但不作目前依據。
- `voided` 均不得使用。
- `unavailable` 均不得進裁斷。
- LINE 訊息未被單獨升級為合約。
- 未出現 DB、AI API、LINE API、payment、escrow、listing fee 或 production webhook 接入。

## Safe Actions

Automation 可安全執行：

- 文件巡檢。
- 狀態一致性檢查。
- 註記 missing / stale / disputed / unavailable 狀態。
- 整理權限與 source-of-truth blocker。
- 回報 AI PCM 總監／後台總控 Agent。

## Forbidden Actions

Automation 禁止：

- 不接 DB。
- 不接 AI API。
- 不接 LINE API。
- 不改合約。
- 不做法律裁決。
- 不產生付款。
- 不把 LINE 訊息單獨升級為合約。
- 不把 `placeholder` 當 `verified`。
- 不污染其他黑板。
- 不建立 production automation。
- 不寫入外部系統。

## Escalation

以下狀況必須提報 AI PCM 總監／後台總控 Agent：

- GitHub main / PR / commit SHA 無法確認。
- 權限不足以讀取或驗證來源文件。
- evidence source 存在但版本或當事人確認狀態不明。
- verified 與 linked / placeholder 資料衝突。
- LINE 或平台訊息被誤當作合約。
- 有任何要求本 Agent 進入法律裁決、付款、DB、LINE API、AI API 或 production runtime。
