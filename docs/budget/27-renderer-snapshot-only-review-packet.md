# Renderer Snapshot-Only Review Packet / Static Guard Next Step

本文件對應 GitHub Issue #18，整理成品物流：預算表單輸出工作線在 Phase 3.5 之後的下一步 review packet。目標是讓 reviewer 可檢查 renderer / writer 是否仍維持 snapshot-only，不是開始正式 Excel / PDF file writer。

## Scope

本輪範圍：

- 補齊 formal file writer policy 的本地 TypeScript contract。
- 補齊 renderer static guard 的可重跑命令入口。
- 整理 snapshot-only / static guard / placeholder writer hardening review packet。
- 維持 BudgetOutputSnapshot / RenderedBudgetDocument 作為成品物流唯一輸入邊界。

本輪不做：

- 不產生正式 `.xlsx`。
- 不產生正式 `.pdf`。
- 不重跑 budget engine。
- 不讀 pricing rules。
- 不讀 material resolver。
- 不修改 MethodSpecCatalog。
- 不修改 raw warehouse。
- 不修改 plan-puzzle / preview_floor_plan。
- 不接 RAG / AI API。
- 不使用 legacy `formatBudgetOutput()` 作正式來源。

## Snapshot-Only Contract

正式 renderer / writer 的輸入層級只能是：

1. `BudgetOutputSnapshot`
2. 由 `BudgetOutputSnapshot` 透過 snapshot-gated renderer 產生的 `RenderedBudgetDocument`
3. 由 `renderFormalBudgetDocument()` 產生且帶 formal renderer token 的 gated structured document

任何 renderer / writer 不得回頭呼叫 estimate generation、pricing lookup、material resolver 或 MethodSpecCatalog。正式檔案輸出未來也只能讀 gated structured document，不得讀 `BudgetEstimate` 或 `BudgetEstimateLine`。

## Static Guard Review Checklist

`src/lib/budget/renderers/run-renderer-static-guard.ts` 是本地可重跑入口：

```powershell
node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts
```

檢查輸出需包含：

- `valid`
- `issue_count`
- `scanned_files`
- `skipped_files`
- `forbidden_rules_checked`
- `issues`

若 `valid: false`，命令必須以非 0 exit code 結束。

Static guard 應持續檢查：

- forbidden renderer imports / tokens
- dynamic import
- require call
- path alias import
- cross-file re-export
- token factory restricted usage
- writer file-write escape
- real document generation library import

## Import Denylist

正式 renderer path 不得 import 或使用：

- budget engine / estimate generation
- mock pricing / seed budget catalog
- material resolver
- legacy budget output
- RAG / AI API
- real workbook / PDF generation library
- unrestricted file writer APIs outside the controlled placeholder writer

此 denylist 是 pre-production guard，不取代 reviewer review 或未來 CI。

## Placeholder Writer Hardening

`writeFormalBudgetArtifact()` 仍是 controlled entry spike：

- 第一個 runtime gate 必須是 `runFormalFileWriterPreflight()`。
- preflight invalid 時，結果必須 blocked。
- blocked 時不得建立 manifest。
- blocked 時不得呼叫 placeholder writer。
- blocked 時不得寫 artifact。
- manifest 只記錄 snapshot id、audience、format、filename、storage target、row count、total amount、layout profile、policy id 與 security flags。
- placeholder writer 如被明確要求寫入，只能在 staging policy 通過後寫 `.json` manifest 或 `.txt` placeholder。
- 本階段仍不得寫 `.xlsx` 或 `.pdf`。

## Review Questions

Reviewer 可用下列問題抽查：

- `renderFormalBudgetDocument()` 是否仍先走 `assertSnapshotRenderableForRenderer()`？
- formal skeleton 是否仍需要 runtime token？
- `createFormalRendererToken()` 是否只允許 formal entry / token module 使用？
- `runFormalFileWriterPreflight()` 是否 no-throw？
- invalid snapshot / malformed gated document 是否會被拒絕？
- customer output 是否沒有 internal trace fields？
- internal trace output 是否保留 trace fields？
- static guard 是否掃描 formal renderer / writer / preflight files？
- static guard 是否排除 demo / guard runner 但不排除正式 path？
- placeholder writer 是否仍不能寫 `.xlsx` / `.pdf`？

## Acceptance Criteria For Issue #18

- `formal-file-writer-policy.ts` 存在，並提供 artifact audience、format、filename、storage target 與 security policy contract。
- `run-renderer-static-guard.ts` 存在，可用 node 直接執行。
- `docs/budget/27-renderer-snapshot-only-review-packet.md` 存在。
- renderer static guard command 通過。
- no-throw preflight / controlled writer path 可在 fixture snapshot 上建立 manifest-only result。
- 沒有新增 package / framework。
- 沒有產生 `.xlsx` / `.pdf`。

## Remaining Risks

- static guard 仍是 local command，尚未接 CI。
- formal file writer 仍是 skeleton / controlled entry spike，不是 production file writer。
- token guard 是 module runtime guard，不是不可偽造的跨 runtime capability。
- 正式 Excel / PDF file writer 仍需另開 Issue 與 Commander 明確授權。
