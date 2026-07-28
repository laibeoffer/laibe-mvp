# A5 Knowledge Foundation Core Readiness Report

日期：2026-07-28

狀態：A0 第三輪審查候選。執行位置證據已由 2026-07-28 C-drive revalidation 取代，詳見 `docs/governance/A5_KNOWLEDGE_FOUNDATION_C_DRIVE_REVALIDATION_20260728.md`。尚未套用 LaiBE Core、尚未部署 Edge Functions、尚未連接正式 consumer、尚未發布正式知識。

## 1. Git 回復與範圍

- `origin/main` 基線：`e31287e10d78537cd7a0cb901a7e3e1cb5a2f6a5`
- branch：`a5/knowledge-foundation-core-readiness-20260727`
- runtime revalidation worktree：`C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a5-knowledge-foundation-core-readiness-20260727-c-verify`
- evidence correction worktree：`C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a5-pr112-c-drive-evidence-correction-20260728`
- byte-exact snapshot commit：`d0ce795d8fab316c24c5b4533cc67603dd865292`
- A0 退回修正前候選：`39f9564743fadb7239e9bc8ea77575d5b047934a`
- snapshot：50 files、570,943 bytes、SHA256 mismatch 0
- manifest：`docs/governance/A5_KNOWLEDGE_FOUNDATION_SNAPSHOT_MANIFEST_20260727.json`
- 原始髒工作區未被清理、移動、覆蓋或提交。
- correction 僅限 A5 Knowledge Foundation、Knowledge Studio、tests、migration、reconciliation 與 governance docs。
- correction commit、遠端 branch 與 Draft PR 只會在完整本機驗證及獨立 review 後建立；本報告不預先宣稱已發布。

## 2. A0 阻擋項修正

| Finding | 修正 | 主要證據 |
|---|---|---|
| 來源依據漂移 | 更新草稿時以新 locator / SHA 建立不可變 `knowledge.sources`，保留舊來源，並將 draft version 重新綁定新 `source_id`；Gateway 由核准版本的實際來源回傳；Studio 事件依各事件不可變 `source_id` 顯示當時來源，不回填目前版本來源。 | `20260728050639_studio_traceability_a14_core_reconciliation.sql`；PGlite「先空來源、後補來源、送審、發布、Gateway 查詢」真實流程；Studio 多版本事件來源測試。 |
| 操作者留痕 | Studio 保留 SQL `actorId`；以驗證 session 回傳安全姓名或穩定代號與角色；不顯示 email、JWT 或 raw UUID；admin 顯示為管理者。 | `site/knowledge_studio/app.js`、`knowledge_studio_session_context`、瀏覽器 PCM/admin/owner 情境。 |
| 未儲存內容遺失 | 搜尋、三種篩選、狀態摘要、規則列、導覽、鍵盤導覽、手機返回與新增草稿共用 `runGuardedNavigation`；取消時回復原導覽值並保留編輯內容與 selected record。 | 新草稿與既有草稿單元測試；桌機 native confirm 實測。 |
| 非同步競態 | busy 時封鎖所有切換篩選、選取、導覽或新請求的控制；`createRequestGate` 使用 generation + `AbortController`，過期回應不得覆蓋最新選擇。 | out-of-order response test、DOM disabled contract。 |
| 寫入成功但 reload 失敗 | `CommittedMutationCoordinator` 分開 `write_failed` 與 `sync_failed`；後者保留 entry/version/status、鎖住重複操作，只允許重試讀取。 | create/save/submit/publish 四類 test；瀏覽器受控情境 writes 維持 1、reads 由 3 增至 5。 |
| A14 reconciliation | 新增 append-only `casework.document_versions` 與明確 `casework.case_member_workstreams`；adapter 授權不得從 `case_members` 推測 workstream；既有同名表必須完整符合欄位、PK、FK、unique 與 check contract，否則 fail-fast。 | migration、PGlite rerun/immutability/workstream tests、adversarial constraint-collision test、manifest。 |
| GitHub 發布 | 完整驗證後才建立 correction commit、push 既有 branch、開 Draft PR 到 `main`；不得 merge。 | 最終 A0 回報提供 SHA 與 URL。 |

## 3. 權限與 Supabase 邊界

### 遠端只讀現況

2026-07-28 重新查證：

| 項目 | A5 preview | LaiBE Core |
|---|---|---|
| project ref | `ocxfrteyedumallatdok` | `zdwuyomhswjcbbpbhpcq` |
| parent | `jaxwovullfpdedqhoopx` | 獨立 project |
| A5 migrations | 12 | 0 |
| A5 tables | 26 | 0 |
| A5 authenticated GraphQL warning | 26 | 0（Core 尚無 A5 table） |
| security advisor | A5 舊 warning 仍存在 | 0 lint |
| performance advisor | A5 35 項舊 notice | 1 項全專案 Auth connection strategy info |

preview 的 26 個 GraphQL warning 未消失，因為本輪 hardening 明確未遠端套用。這是「尚未套用」證據，不是 advisor clean 證明。LaiBE Core 的 0 lint 同樣不能當作 A5 已套用證明，因為 Core 仍是 0 migration / 0 A5 table。

### 本機最終 schema contract

- 28 張 A5 table：`knowledge_staging=5`、`knowledge=11`、`casework=12`。
- 28 張 table / sequence 對 `PUBLIC`、`anon`、`authenticated` 的直接 privilege 為 0。
- `anon` 可執行 A5 function 為 0。
- `authenticated` 僅可執行 17 個具名 public RPC 與 3 個具名 helper。
- 20 個介面逐一檢查 owner、`SECURITY INVOKER/DEFINER` 與空 `search_path`。
- Studio 只允許 active-session PCM / admin；owner、pro、A12、budget、contract client 不可進 reviewer surface。
- private Storage 保留 case membership 與 domain 限制；A5 bucket 仍為 `public=false`。
- CORS 僅讀取 `KNOWLEDGE_STUDIO_ALLOWED_ORIGINS` 與 `KNOWLEDGE_GATEWAY_ALLOWED_ORIGINS`；未設定或不在 allowlist 時 fail-closed。
- 不 blanket `FORCE RLS`；正式套用前仍需以實際 executor 身分重跑 20 個介面，避免用 FORCE 製造錯誤安全感。

本輪沒有 apply migration、deploy Function、寫入資料、修改設定、merge/rebase/reset Supabase branch，也沒有建立付費 branch。

## 4. Knowledge Studio UX 與瀏覽器 QA

修正後行為：

- 「新增草稿」只建立未儲存編輯狀態；按「儲存草稿」前不持久化。
- 取消新草稿不留下垃圾紀錄。
- 「送交覆核」以單一 server operation 保存最新內容並轉為 `pending_review`。
- 送審前驗證名稱、類型、負責人、摘要、判斷條件、下一位處理者與來源依據。
- publish 有 server-side completeness gate。
- 退回、發布、停用都有影響說明、處理說明與結果回饋。
- loading、empty、error、disabled、unsaved、sync-failed 與 read-only retry 狀態都有產品語言。
- 變更後 asset 為 `app.js?v=2026072803`。
- 不新增甲乙方入口；已簽約甲乙方的正式收件／訊息窗口仍是 A14 LINE Bot。

in-app browser、local HTTP 實測：

| Viewport / 情境 | 結果 |
|---|---|
| 1440×900 | `overflow=0`；master-detail selected state 正確；新草稿與既有草稿取消離開均保留內容及選取；確認後才切換；下拉篩選取消後回復舊值。 |
| 390×844 | `overflow=0`；清單點選後 `recordPane=none`、`detailPane=block`，詳情立即可見；「返回規則清單」後反向切換。 |
| 鍵盤 | 規則總覽按 ArrowRight 後焦點與 `aria-current=page` 移到「覆核工作」，清單同步為待覆核。 |
| 寫入後同步失敗 | 顯示「操作已完成，但畫面尚未同步」；篩選、導覽、重複寫入均鎖住；只顯示「重新整理」；重試後 writes 仍為 1。 |
| 身分 | PCM 顯示安全名稱＋角色；admin 顯示「目前角色：管理者」；owner 顯示安全拒絕訊息且規則列 0。 |
| Console | 一般、受控同步失敗與權限拒絕情境均為 0 error / 0 warning。 |

同步失敗與角色切換使用僅存在於瀏覽器 QA tab 的受控本機回應，沒有加入 production debug UI、沒有寫入 repo 狀態，也沒有任何遠端請求或寫入。

## 5. LaiBE Core Reconciliation

目標 project ref：`zdwuyomhswjcbbpbhpcq`

本機 ordered bundle：

- `supabase/core_reconciliation/000_preflight.sql`
- `supabase/core_reconciliation/010_a5_knowledge_foundation.sql`
- `supabase/core_reconciliation/900_verify.sql`
- `supabase/core_reconciliation/990_rollback.sql`
- `supabase/core_reconciliation/manifest.json`
- `supabase/core_reconciliation/README.md`

特性：

- 七個來源 migration 以 SHA256 綁定；缺少、重排或多出 migration 即停止生成。
- preflight 對三個 A5 schema、17 個 public RPC、2 個 bucket 與 8 個 Storage policy fail-fast。
- create-only bundle 只有一個外層 transaction；相同 bundle 重複套用在 preflight 零變更停止。
- rollback 需要 exact marker，且 28 張 table 與兩個 bucket 均零資料；不使用 `CASCADE`。
- PGlite 證明 partial collision 與 repeat-apply fail-closed、非 A5 sentinel 保留、rollback dependency fail-closed。
- `casework.document_versions` 是不可變版本紀錄。
- `casework.case_member_workstreams(case_id,user_id,workstream_type)` 是明確 workstream 授權來源。
- A14 contract 對齊狀態：`pending_c_drive_a14_phase0_confirmation`。A14 目前仍在 C-only LaiBE Core 物件定位與契約確認階段；本報告不宣稱 adapter contract 已接受。
- 現有 `casework.documents.file_type` 仍為 PDF-only；jpeg/png parent attachment model 仍 pending，本報告不自行擴大附件模型，也不把附件模型寫成已決策。

此 bundle **尚未套用**到 LaiBE Core，也沒有建立新付費 Supabase branch。

## 6. 驗證

| 驗證 | 新鮮結果 |
|---|---:|
| 歷史七個 Node test files | 77 / 77 |
| 新增四個 Node test files | 28 / 28 |
| Node 合計 | 105 / 105 |
| Python（需兩個唯讀 fixture env） | 24 / 24 |
| PGlite migration + reconciliation | 3 / 3 |
| Deno fmt | 4 files pass |
| Deno check | 4 files pass |
| JSON parse | 54 / 54 |
| `git diff --check` | pass |

Node 逐檔：

| Test file | Pass |
|---|---:|
| `scripts/knowledge/tests/test_build_core_reconciliation.mjs` | 4 |
| `scripts/knowledge/tests/test_split_supabase_migration.mjs` | 4 |
| `site/knowledge_studio/tests/knowledge_studio.test.mjs` | 25 |
| `site/knowledge_studio/tests/knowledge_studio_dom_contract.test.mjs` | 7 |
| `supabase/tests/core_readiness_security_contract.test.mjs` | 12 |
| `supabase/tests/core_reconciliation_contract.test.mjs` | 5 |
| `supabase/tests/foundation_contract.test.mjs` | 20 |
| `tests/knowledge/knowledge_system_contract.test.mjs` | 14 |
| `tests/knowledge/unified_items_contract.test.mjs` | 4 |
| `tests/knowledge/woodwork_foundation_contract.test.mjs` | 5 |
| `tests/knowledge/woodwork_mapping_contract.test.mjs` | 5 |

Python clean worktree 必須顯式使用：

```powershell
$env:A1_WOODWORK_MAPPING_PATH = 'C:\CodexWork\08-Jacky\laibe_MVP_project\outputs\budget_woodwork_items_20260710\A1_woodwork_ingest_mapping_20260711.json'
$env:LAIBE_BUDGET_VAULT_PATH = 'C:\CodexWork\08-Jacky\laibe_MVP_project\Laibe-Budget-Vault'
```

兩個路徑均只讀；分支未複製 102 MB corpus 或 Obsidian vault。

## 7. 尚未串接與待決策

- Studio endpoint 與 project key 仍保持空白。
- CORS allowlist 尚未設定正式 origin。
- 沒有正式 PCM reviewer 帳號與 production 身分治理。
- A12、預算、契約 consumer 尚未接 Gateway。
- 沒有正式知識、正式價格、預算、契約或案件資料發布。
- preview branch 與 Core 都沒有套用本輪 hardening。
- jpeg/png A14 attachment 父文件模型待 A0/A14 確認。
- 正式 apply、Edge Function deploy、CORS 設定、consumer 接線、正式資料發布均需 A0 / Owner 另行批准。

## 8. 硬邊界

- `formalImpact` 固定為 `none`。
- staging 不自動發布。
- A12 不建立預算或契約決策。
- 不含付款保障、託管、代收代付。
- 不宣稱真電子簽章、法律簽證效力或工程保證。
- 不宣稱 AI PCM、Knowledge Foundation 或 Knowledge Studio 已上線完成。
