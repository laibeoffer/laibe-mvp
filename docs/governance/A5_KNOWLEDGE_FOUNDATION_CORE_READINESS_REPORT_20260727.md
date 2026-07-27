# A5 Knowledge Foundation Core Readiness Report

日期：2026-07-27
狀態：本機候選可供 A0 審查；尚未套用 LaiBE Core、尚未連接正式 consumer、尚未發布正式知識。

## 1. Git 回復

- `origin/main` 基線：`e31287e10d78537cd7a0cb901a7e3e1cb5a2f6a5`
- branch：`a5/knowledge-foundation-core-readiness-20260727`
- worktree：`Z:\08-Jacky\_codex_worktrees\a5-knowledge-foundation-core-readiness-20260727`
- byte-exact snapshot commit：`d0ce795`
- snapshot：50 files、570,943 bytes、SHA256 mismatch 0
- manifest：`docs/governance/A5_KNOWLEDGE_FOUNDATION_SNAPSHOT_MANIFEST_20260727.json`
- 2026-07-27 最終重驗原始 source：50 files、SHA256 mismatch 0。
- checkpoint 後變更：31 files，全部位於 A5 whitelist；whitelist 外 0。
- 原始髒工作區未被清理、移動、覆蓋或提交。

## 2. 權限收斂

遠端 preview branch `ocxfrteyedumallatdok` 的唯讀 advisor 基線：

| 項目 | 現況 |
|---|---:|
| parent project ref | `jaxwovullfpdedqhoopx` |
| branch id | `c25b2b45-6d76-4c10-9ce3-eaf1c6b9ceeb` |
| A5 authenticated GraphQL table warnings | 26 |
| `knowledge` | 11 |
| `knowledge_staging` | 5 |
| `casework` | 10 |
| A5 performance advisor notices | 35（unused index 25、multiple permissive policies 10） |
| preview migration history | 12，未含本輪 hardening |

本機最終 schema contract：

- 26 張 A5 table 對 `PUBLIC`、`anon`、`authenticated` 的直接 table / sequence privilege 為 0。
- `anon` 可執行 A5 function 為 0。
- `authenticated` 僅可執行 16 個具名 public RPC 與 2 個 Storage helper。
- 18 個介面逐一驗證 owner、`SECURITY DEFINER` 與空 `search_path`。
- A12、budget、contract 同案 finding 依 domain 隔離；linked evidence 同步過濾；PDF document / sheet metadata 只對 `drawing_review` client 回傳。
- Storage 保留 4 個原有 permissive policy，另加 4 個 `TO PUBLIC` restrictive guard，避免 `anon` 或其他寬鬆 policy 以 OR 繞過 A5 private bucket。
- Knowledge Studio 只允許 active-session PCM / admin；owner、pro、A12、budget、contract client 均不可進 reviewer surface。
- CORS 僅讀取 `KNOWLEDGE_STUDIO_ALLOWED_ORIGINS` 與 `KNOWLEDGE_GATEWAY_ALLOWED_ORIGINS`；未設定或 origin 不在清單時 fail-closed。

本輪沒有把 hardening 套用到 preview branch，因此遠端 26 個 A5 advisor warning 仍存在。這是「尚未套用」證據，不是本機修正失敗。

### FORCE RLS 判定

本輪不 blanket `FORCE RLS`。原因是 public RPC 目前是明確審核的 authorization boundary；盲目 FORCE 不會限制 `postgres` / `BYPASSRLS` owner，反而可能製造錯誤安全感。正式套用前仍需重跑 18 個介面的行為矩陣；若改用 `NOLOGIN NOBYPASSRLS` 專用 executor，再另案評估一致 FORCE RLS。

## 3. Knowledge Studio UX

修正後行為：

- 「新增草稿」只建立記憶體編輯狀態；按「儲存草稿」前不持久化。
- 取消新草稿不留下「未命名規則」。
- 「送交覆核」以單一 `saveAndSubmitReview` 操作保存最新內容並轉為 `pending_review`；失敗時 local adapter 回復原狀態。
- 規則名稱、類型、負責人、摘要、判斷條件、下一位處理者、來源依據均有欄位錯誤。
- publish 具 server-side completeness gate。
- 退回、發布、停用使用具影響說明的確認 dialog，並有成功／失敗訊息。
- 桌機保留 master-detail 與 selected state；手機使用 list → detail 並提供「返回規則清單」。
- 手機從未儲存的新草稿或已修改內容返回前必須確認；取消確認保留編輯器，確認捨棄才回到清單。
- 補齊 loading、empty、error、disabled、unsaved-changes 與 retry。
- 頁面定位改為「PCM 規則治理中心」，並明示示範規則不是案件事實。
- 不提供甲乙方入口；已簽約甲乙方仍由 LINE Bot 作正式收件／訊息窗口。

瀏覽器實機驗收（in-app browser，local HTTP）：

| Viewport | 證據 |
|---|---|
| 1440×900 | `innerWidth=1440`、`clientWidth=1425`、`scrollWidth=1425`，無水平爆版；master-detail selected state 為 1；選取後鍵盤焦點保留在該規則列。 |
| 390×844 | `innerWidth=390`、`clientWidth=375`、`scrollWidth=375`，無水平爆版；新草稿的返回鈕 `top=223px`、標題 `top=285px`，進入 detail 後立即可見；名稱欄取得鍵盤焦點。 |

主要流程實測：

- 新增草稿前後清單均為 4 筆，狀態顯示「尚未儲存」，取消後仍為 4 筆。
- 必填名稱清空時保留 `待修正`，欄位顯示「請填寫規則名稱」，不得送審。
- 最新名稱與摘要送審後仍原樣存在，狀態轉為 `待覆核`，事件首筆為「送交覆核」。
- 退回、發布、停用均顯示影響說明；未填處理說明不得執行；執行後狀態、事件與成功回饋一致。
- mobile 新草稿進入 detail pane，清單仍為 4 筆；取消後回到 list pane 且不留紀錄。
- mobile 點「返回規則清單」會出現未儲存確認；dismiss 後仍在 `detail`，accept 後回到 `list`，清單維持 4 筆且 selected 0。
- console：0 error / 0 warning。

## 4. LaiBE Core Reconciliation

目標 project ref：`zdwuyomhswjcbbpbhpcq`

2026-07-27 唯讀 inventory：

- A5 application tables：0
- migration history：0

本機 bundle：

- `supabase/core_reconciliation/000_preflight.sql`
- `supabase/core_reconciliation/010_a5_knowledge_foundation.sql`
- `supabase/core_reconciliation/900_verify.sql`
- `supabase/core_reconciliation/990_rollback.sql`
- `supabase/core_reconciliation/manifest.json`
- `supabase/core_reconciliation/README.md`

特性：

- 六個來源 migration 以 SHA256 綁定，順序或額外 migration 不符即停止產生。
- preflight 對三個 A5 schema、16 個 public RPC、2 個 bucket 與 8 個 Storage policy fail-fast。
- bundle 是 create-only 基線；相同 bundle 重複套用會在 preflight 零變更停止。
- apply bundle 只有一個外層 transaction。
- marker 僅寫入 A5 `knowledge` schema comment，不建立 `public` table。
- rollback 需要 exact marker，且 26 張 table 與兩個 bucket 都必須沒有資料。
- rollback 只刪除具名 A5 Storage policy / bucket / public RPC 與三個 A5 schema 內物件；不使用 `CASCADE`。
- PGlite 證明部分 schema collision 零變更、重複套用被拒、非 A5 sentinel 保留；非 A5 view 依賴 A5 table 時 rollback 整筆回退，移除該依賴後空資料 rollback 才可執行。

此 bundle **尚未套用**到 LaiBE Core，也未建立新付費 Supabase branch。

## 5. 測試

| 驗證 | 結果 |
|---|---:|
| 原 7 個 Node 檔（原基線 62，加本輪 Studio 回歸 8） | 70 / 70 |
| 本輪新增 4 個 Node 檔 | 23 / 23 |
| Node 合計 | 93 / 93 |
| Python | 24 / 24 |
| PGlite migration + reconciliation | 2 / 2 |
| Deno fmt | 4 files pass |
| Deno check | 4 files pass |
| JSON parse | 54 / 54 |

Node 逐檔結果：

| Test file | Pass |
|---|---:|
| `scripts/knowledge/tests/test_build_core_reconciliation.mjs` | 4 |
| `scripts/knowledge/tests/test_split_supabase_migration.mjs` | 4 |
| `site/knowledge_studio/tests/knowledge_studio.test.mjs` | 18 |
| `site/knowledge_studio/tests/knowledge_studio_dom_contract.test.mjs` | 5 |
| `supabase/tests/core_readiness_security_contract.test.mjs` | 9 |
| `supabase/tests/core_reconciliation_contract.test.mjs` | 5 |
| `supabase/tests/foundation_contract.test.mjs` | 19 |
| `tests/knowledge/knowledge_system_contract.test.mjs` | 15 |
| `tests/knowledge/unified_items_contract.test.mjs` | 4 |
| `tests/knowledge/woodwork_foundation_contract.test.mjs` | 5 |
| `tests/knowledge/woodwork_mapping_contract.test.mjs` | 5 |

原先 A0 可重現的 7 檔基線是 62/62；本輪在原 7 檔的 Studio 測試增加 8 項，故同 7 檔現為 70/70，再加 4 個新檔 23/23，總計 93/93。

完整命令：

```powershell
$env:A1_WOODWORK_MAPPING_PATH = 'Z:\08-Jacky\laibe_MVP_project\outputs\budget_woodwork_items_20260710\A1_woodwork_ingest_mapping_20260711.json'
$env:LAIBE_BUDGET_VAULT_PATH = 'Z:\08-Jacky\laibe_MVP_project\Laibe-Budget-Vault'

node --test --test-reporter=tap `
  scripts/knowledge/tests/test_build_core_reconciliation.mjs `
  scripts/knowledge/tests/test_split_supabase_migration.mjs `
  site/knowledge_studio/tests/knowledge_studio.test.mjs `
  site/knowledge_studio/tests/knowledge_studio_dom_contract.test.mjs `
  supabase/tests/core_readiness_security_contract.test.mjs `
  supabase/tests/core_reconciliation_contract.test.mjs `
  supabase/tests/foundation_contract.test.mjs `
  tests/knowledge/knowledge_system_contract.test.mjs `
  tests/knowledge/unified_items_contract.test.mjs `
  tests/knowledge/woodwork_foundation_contract.test.mjs `
  tests/knowledge/woodwork_mapping_contract.test.mjs

py -3 -m unittest discover -s scripts\knowledge\tests -p 'test_*.py' -v
powershell -NoProfile -ExecutionPolicy Bypass -File tests\knowledge\run_pglite_unc_safe.ps1

deno fmt --check `
  supabase/functions/knowledge-ingest/index.ts `
  supabase/functions/knowledge-studio/index.ts `
  supabase/functions/knowledge-gateway/index.ts `
  tests/knowledge/pglite_migration_smoke.test.ts

deno check `
  supabase/functions/knowledge-ingest/index.ts `
  supabase/functions/knowledge-studio/index.ts `
  supabase/functions/knowledge-gateway/index.ts `
  tests/knowledge/pglite_migration_smoke.test.ts
```

此獨立 A5 snapshot 沒有 root `package.json`，因此沒有可執行的 npm build / lint script；TypeScript 型別檢查由上述 Deno check 執行。JSON 以 PowerShell `ConvertFrom-Json` 逐檔解析 54/54，`git diff --check d0ce795` 通過。

完整 woodwork 測試使用唯讀外部 fixture，仍驗證 102,049,538 bytes、固定 SHA256、42,248 筆、四 bucket 與 57 筆隔離異常：

```powershell
$env:A1_WOODWORK_MAPPING_PATH = `
  'Z:\08-Jacky\laibe_MVP_project\outputs\budget_woodwork_items_20260710\A1_woodwork_ingest_mapping_20260711.json'
$env:LAIBE_BUDGET_VAULT_PATH = `
  'Z:\08-Jacky\laibe_MVP_project\Laibe-Budget-Vault'
```

分支未複製 A1 的 102 MB corpus 或 Obsidian vault。

### 獨立複核

同一位獨立 reviewer 在修正後重查先前 1 項 Critical 與 6 項 Important，結論為 `NO_REMAINING_CRITICAL_OR_IMPORTANT_FINDINGS`。Reviewer 唯讀重跑 Node 41/41 與 PGlite 2/2，未修改檔案。

保留的測試深化項目：

- repeat-apply 已直接重跑 preflight 並證明 marker / sentinel 零變更；尚未另做完整 catalog 前後快照比較。
- anon broad Storage policy 已動態驗證 A5 private bucket `SELECT` fail-closed；`INSERT`、`UPDATE`、`DELETE` guard 目前以結構契約驗證。
- Studio enum、最新 evidence / note 以 adapter 測試驗證；mobile click-confirm 另以 390×844 實機流程驗證。budget / contract payload 尚未透過 PGlite 寫入真實 RPC。

## 6. 尚未串接

- Studio endpoint 與 project key 仍保持空白。
- CORS allowlist 尚未設定正式 origin。
- 沒有正式 PCM reviewer 帳號與 production 身分治理。
- A12、預算、契約 consumer 尚未接 Gateway。
- 沒有正式知識、正式價格、預算、契約或案件資料發布。
- JWT role 降權後仍需由身分治理流程撤銷舊 session。
- preview branch 與 Core 都沒有套用本輪 hardening。

## 7. 邊界

- `formalImpact` 固定為 `none`。
- staging 不自動發布。
- A12 不建立預算或契約決策。
- 不含付款保障、託管、代收代付。
- 不宣稱真電子簽章、法律簽證效力或工程保證。
- 不宣稱 AI PCM、Knowledge Foundation 或 Knowledge Studio 已上線完成。
