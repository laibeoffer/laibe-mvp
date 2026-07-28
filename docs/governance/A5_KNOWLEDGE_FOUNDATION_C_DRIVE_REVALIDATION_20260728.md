# A5 Knowledge Foundation C-Drive Revalidation

日期：2026-07-28

狀態：PR #112 的 C 槽執行位置與測試證據。這是審查證據，不代表已套用 LaiBE Core、已部署、已發布正式知識或已接上正式 consumer。

## 1. C-Only 執行位置

- 主 repo：`C:\CodexWork\08-Jacky\laibe_MVP_project`
- runtime revalidation worktree：`C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a5-knowledge-foundation-core-readiness-20260727-c-verify`
- evidence correction worktree：`C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a5-pr112-c-drive-evidence-correction-20260728`
- Git common dir：`C:\CodexWork\08-Jacky\laibe_MVP_project\.git`
- runtime evidence HEAD：`7b88691f75f5cfa7299a08cbb32cb878426be815`
- correction branch：`a5/pr112-c-drive-evidence-correction-20260728`
- PR branch：`a5/knowledge-foundation-core-readiness-20260727`

所有 Git、測試與 evidence correction 命令均以 C 槽 worktree 作為明確 `workdir`。一個舊 C 槽複本的 `.git` pointer 指向已退役的網路工作樹，已明確排除；未跟隨該 pointer，也未將該目錄作為 repo、fixture 或測試來源。

## 2. C-Only Fixtures

- `A1_WOODWORK_MAPPING_PATH`：
  `C:\CodexWork\08-Jacky\laibe_MVP_project\outputs\budget_woodwork_items_20260710\A1_woodwork_ingest_mapping_20260711.json`
- `LAIBE_BUDGET_VAULT_PATH`：
  `C:\CodexWork\08-Jacky\laibe_MVP_project\Laibe-Budget-Vault`
- Python mapped-drive contract：
  `X:\synthetic-offline-test-root`

Python 的 mapped-drive fixture 是純字串 contract，不要求該磁碟存在，也不讀取 fixture 所指位置。

## 3. Fresh Verification

以下結果均由 C 槽 runtime revalidation worktree fresh 執行：

| 驗證 | 結果 |
|---|---:|
| Node test files | 11 files，105 / 105 pass |
| Python importer tests | 24 / 24 pass |
| PGlite migration / reconciliation | 3 / 3 pass |
| Deno fmt | 4 files pass |
| Deno check | 4 files pass |
| tracked JSON parse | 54 / 54 pass |
| `git diff --check` | pass |
| secret / JWT scan | no committed secret、JWT、service-role credential found |

Node 11 檔包括：

1. `scripts/knowledge/tests/test_build_core_reconciliation.mjs`
2. `scripts/knowledge/tests/test_split_supabase_migration.mjs`
3. `site/knowledge_studio/tests/knowledge_studio.test.mjs`
4. `site/knowledge_studio/tests/knowledge_studio_dom_contract.test.mjs`
5. `supabase/tests/core_readiness_security_contract.test.mjs`
6. `supabase/tests/core_reconciliation_contract.test.mjs`
7. `supabase/tests/foundation_contract.test.mjs`
8. `tests/knowledge/knowledge_system_contract.test.mjs`
9. `tests/knowledge/unified_items_contract.test.mjs`
10. `tests/knowledge/woodwork_foundation_contract.test.mjs`
11. `tests/knowledge/woodwork_mapping_contract.test.mjs`

## 4. Browser QA Evidence

先前 C 槽 runtime revalidation 已保留 Knowledge Studio 瀏覽器證據，本次 evidence-only correction 不重做或修改 Studio UI：

| Viewport | 結果 |
|---|---|
| `1440 x 900` | 主要流程可操作、無水平溢出、console 0 error / 0 warning |
| `390 x 844` | list → detail 可立即看見詳情並返回、無水平溢出、console 0 error / 0 warning |

該 QA 不代表 Studio 已連接 production 或已對外開放。

## 5. Remote And Product Boundaries

- 沒有使用或寫入退役的 mapped-drive workspace。
- 沒有套用任何遠端 migration。
- 沒有部署 Edge Function。
- 沒有寫入遠端 Supabase 資料、設定或 Storage。
- 沒有建立新的付費 Supabase branch。
- 沒有 merge PR #112 或 `main`。
- `pending_c_drive_a14_phase0_confirmation`：A14 仍在 C-only LaiBE Core 物件定位與契約確認階段，本報告不宣稱 A14 adapter contract 已接受。
- jpeg/png parent attachment model 仍 pending；不得把 PDF-only 現況推論為已完成附件模型決策。

## 6. Interpretation

這份 revalidation 只取代舊執行位置與測試數字證據。既有 Supabase preview branch 的歷史敘述不因此變成新的遠端查證，也不授權 apply、deploy、遠端寫入或 production 接線。
