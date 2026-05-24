# WORKSTREAM_BLACKBOARD.md

## Purpose

這是萊比 MVP 的 GitHub 戰情黑板。  
所有工作線的階段成果、阻塞、待審查、下一步建議，都集中記錄在這裡。  
副指揮官依此整理狀態與派工建議。  
本文件不是產品設計文件，也不是長篇報告。

## Command Structure

- Commander：使用者本人，負責最終裁決。
- Deputy Codex：副指揮官，負責整理狀態、辨識阻塞、建議下一個 Issue。
- Builder Workstreams：各分工聊天室 / Codex，負責各自 branch 內的施工。
- Reviewer：審查官，只在抽查或風險觸發時進行只讀審查。

## Reporting Rules

每個工作線完成階段任務後，必須更新自己的狀態區與 Update Log。

每次回報只填短格式：

- Workstream:
- Branch:
- Status:
- Changed:
- Files:
- PR / Commit:
- Blocked:
- Next:
- Need Commander:
- Need Reviewer:

禁止：
- 不貼長篇聊天紀錄
- 不貼完整 PR 描述
- 不寫產品重設計
- 不跨改別人的 workstream 狀態
- 不把黑板當成任務實作區

## Commander Escalation Rules

只有以下情況才標記 @commander：

- 需要使用者做產品方向判斷
- 需要 merge / reject 的最終裁決
- 任務跨多個 workstream
- 發現現有檔案來源或頁面角色混淆
- 涉及 payment / escrow / listing fee
- 涉及真 AI API / 真上傳 / API key
- 涉及正式價格 / PricingRule / BudgetEstimateLine.unit_price
- 涉及正式 Excel / PDF 輸出
- 副指揮官無法判斷下一步

## Reviewer Trigger Rules

審查官採抽查制 / 風險觸發制。

只有以下情況建議 @reviewer：

- Codex review 出現 NEEDS_FIX 或具體 P2/P1 風險
- 任務跨 workstream
- PR changed files 超出白名單
- 涉及正式價格、正式輸出、payment、AI API、真上傳
- 副指揮官懷疑 Builder 越界
- 使用者要求審查

## Deputy Technical Judgment Rules

使用者只負責需求、產品方向、視覺審美、商業邏輯與最終裁決。

IT 技術相關問題不要升級給使用者。副指揮官可依 `AGENTS.md`、GitHub branch strategy、workstream rules 自行判斷並提出執行建議。

副指揮官可自行處理 / 判斷：

- Git branch / PR / commit / push 流程
- 是否需要拆 commit
- 是否需要重新觸發 Codex review
- 白名單 staging 是否合理
- 檔案是否屬於正確 workstream
- 技術性 blocked 狀態
- Codex 回報是否需要技術修正
- GitHub workflow 下一步
- 是否請 Builder 修正技術問題

副指揮官不應把以下問題丟給使用者：

- 要不要 git pull
- 要不要開 branch
- 要不要重跑 Codex review
- commit message 怎麼寫
- PR description 怎麼寫
- 某檔案是否應該 stage
- 某技術修正該交給哪條 branch
- GitHub dirty worktree 如何隔離，只要不涉及刪除或重寫重要內容

必須升級給使用者的情況：

- 需求方向不清
- 產品流程要改
- 視覺風格要改
- 涉及正式金流 / escrow / listing fee
- 涉及正式 AI API / 真上傳 / API key
- 涉及正式價格 / PricingRule / BudgetEstimateLine.unit_price
- 涉及正式 Excel / PDF 輸出
- 需要刪除大量檔案、reset、clean、rebase、force push
- 需要合併或否決 PR 的最終裁決
- 任務會改變萊比產品定位

如果是技術問題，副指揮官應輸出：

- 技術判斷
- 建議交給哪個 workstream
- 最小修正 Issue 草稿
- 是否需要 Codex review

如果是需求問題，才輸出：

```md
# 需要指揮官裁決
```

## Current Global State

- GitHub repo `laibeoffer/laibe-mvp` 已建立。
- Codex environment 已建立。
- `main` 已作為整合主線。
- `main` latest sha: `9095a98`.
- Open PR: None.
- 以下 PR 已 merged：
  - PR #1 site/page-formalization
  - PR #2 governance/codex-rules
  - PR #3 warehouse/raw-candidate
  - PR #4 warehouse/method-spec
  - PR #5 output/budget-documents, merge commit `9095a98`
  - PR #6 visual/simulation-governance

## Workstream Status

### site/page-formalization

Branch:
`site/page-formalization`

Status:
Merged baseline page formalization. Currently handled manually by Commander + ChatGPT + Codex due visual judgment requirements.

Blocked:
None.

Next:
Wait for Commander-selected page task.

Need Commander:
Yes, for visual direction.

Need Reviewer:
No by default.

### governance/codex-rules

Branch:
`governance/codex-rules`

Status:
Merged governance templates and workstream mapping.

Blocked:
None.

Next:
Only update when workflow rules change.

Need Commander:
Only for system-rule changes.

Need Reviewer:
No by default.

### warehouse/raw-candidate

Branch:
`warehouse/raw-candidate`

Status:
Merged raw candidate warehouse workspace.

Blocked:
None.

Next:
Pause until next raw source quality task.

Need Commander:
No.

Need Reviewer:
Only if formal price boundary is touched.

### warehouse/method-spec

Branch:
`warehouse/method-spec`

Status:
Merged MethodSpec catalog validators.

Blocked:
None.

Next:
Pause until next MethodSpec validator / catalog task.

Need Commander:
No.

Need Reviewer:
Only if formal price or BudgetEstimateLine boundary is touched.

### output/budget-documents

Branch:
`output/budget-documents`

Status:
Merged after P2 fix. Output demos are now snapshot-only. PR #5 merge commit: `9095a98`.

Blocked:
None.

Next:
Pause until next output logistics task.

Need Commander:
No.

Need Reviewer:
Only if real Excel/PDF output boundary is touched.

### visual/simulation-governance

Branch:
`visual/simulation-governance`

Status:
Merged visual simulation governance docs.

Blocked:
None.

Next:
Pause unless visual simulation policy changes.

Need Commander:
Only if real image/API direction is considered.

Need Reviewer:
Only if API/runtime boundary is touched.

### plancraft/page-ui

Branch:
`plancraft/page-ui`

Status:
No remote branch yet. Current known page UI files had no dirty changes during last check.

Blocked:
Awaiting Commander decision.

Next:
Do not start unless Commander selects page-ui task.

Need Commander:
Yes.

Need Reviewer:
No by default.

### plancraft/adapter

Branch:
`plancraft/adapter`

Status:
Branch exists / ready. Suggested next task: closed zone area candidate contract, but not started.

Blocked:
Awaiting Commander approval.

Next:
Prepare minimal Issue only after Commander approves.

Need Commander:
Yes.

Need Reviewer:
Only if adapter starts touching formal estimate boundary.

### none-review-only / LAIBE_REVIEWER

Branch:
None.

Status:
Reviewer remains read-only. No default branch needed.

Blocked:
None.

Next:
Only respond when @reviewer is requested.

Need Commander:
Only if review escalates to product decision.

Need Reviewer:
N/A.

## Dispatch Queue

### READY

- [ ] plancraft/adapter — closed zone area candidate contract
  - Status: proposed by Deputy Codex, not approved yet
  - Need Commander: yes

### NEEDS REVIEW

- [ ] None

### BLOCKED

- [ ] None

## Update Log

### 2026-05-24 — system

Changed:
- Established merged GitHub workstreams for governance, raw warehouse, MethodSpec, output documents, and visual simulation governance.
- Added Deputy Technical Judgment Rules: technical GitHub / branch / PR / staging / workstream routing decisions should be handled by Deputy Codex; only product, business, visual, high-risk, destructive, or final PR裁決 issues escalate to Commander.
- Synced blackboard short status: `main` latest sha `9095a98`, open PR None, PR #5 merged with merge commit `9095a98`, and `plancraft/adapter` remains READY / not approved.

Files:
- GitHub PR history

PR / Commit:
- PR #1 through PR #6 merged; main `9095a98`

Next:
- Establish blackboard reporting discipline before starting next build task.
