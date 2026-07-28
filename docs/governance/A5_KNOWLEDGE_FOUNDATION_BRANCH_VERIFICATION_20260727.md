# A5 Knowledge Foundation Branch Verification

> [!CAUTION]
> **SUPERSEDED FOR CURRENT EXECUTION.** 本文件是 2026-07-27 preview branch 的歷史紀錄，不得作為現行命令來源。C-only 可重現位置、fixtures 與 fresh test 證據以 `docs/governance/A5_KNOWLEDGE_FOUNDATION_C_DRIVE_REVALIDATION_20260728.md` 為準。

日期：2026-07-27
狀態：隔離分支執行與資料匯入證據可交付 A5 / AA / Owner 審查；不得視為 production-ready、正式知識已發布或 AI PCM 已完成。

> 2026-07-27 recovery addendum：本文件下方內容是先前 preview branch 的歷史驗證紀錄。現在的可審查候選位於 branch `a5/knowledge-foundation-core-readiness-20260727`，byte-exact snapshot commit 為 `d0ce795`。本輪新增 RPC-only hardening、Studio UX 修正與 Core reconciliation bundle，但均未套用到 preview branch 或 LaiBE Core。最新狀態、測試與限制以 `A5_KNOWLEDGE_FOUNDATION_CORE_READINESS_REPORT_20260727.md` 為準。

## 1. 執行邊界

- 現行唯讀 repo 根目錄：`C:\CodexWork\08-Jacky\laibe_MVP_project`
- Supabase parent project：`jaxwovullfpdedqhoopx`
- 隔離 branch：`a5-pcm-knowledge-20260726`
- branch id：`c25b2b45-6d76-4c10-9ce3-eaf1c6b9ceeb`
- branch project ref：`ocxfrteyedumallatdok`
- branch 狀態：`ACTIVE_HEALTHY`
- 本機 Supabase CLI：`2.109.1`；目前 shell 實際解析至
  `C:\Users\J\AppData\Roaming\npm\supabase.cmd`
- default branch：未合併、未修改；parent migration history 仍只有
  `20260726140526 remote_schema`
- `site/preview_floor_plan/`：A5 本輪未觸碰；工作樹中既有他 lane 的變更不納入本報告
- 禁止的 UNC 來源：未存取 `\\192.168.0.106\sever_data`
- commit / push：皆未執行

### 子代理執行與收報

| 子代理 | Task ID | 獨立責任範圍 | A5 收報與初審 |
|---|---|---|---|
| A5-SUPABASE-FOUNDATION | `019fa29d-c62d-7aa1-af01-6c70cf53af9f` | `supabase/**`：migration、RLS、Storage 與 Edge Function 基礎 | 已收報並關閉；A5 已在隔離 branch 重跑 migration、RLS、function 與 rollback contracts。 |
| A5-OBSIDIAN-STUDIO | `019fa29d-e3f8-7182-bb4e-d3f01ecd2945` | `scripts/knowledge/**`、`site/knowledge_studio/**`：Vault 單向匯入與 Studio MVP | 已收報並關閉；A5 已重跑 Python／Node 測試、全量 dry-run、靜態 HTTP 與桌面／手機瀏覽器驗證。 |
| A5-DATA-GOVERNANCE-QA | `019fa29d-fe82-7df3-968f-ffda67853522` | `tests/knowledge/**`：資料治理、RLS、案件隔離與發布閘門 | 已收報並關閉；A5 已獨立重跑 PGlite、遠端 transaction contracts、筆數、禁寫與清理後狀態。 |

上述 task 已結束，因此目前 multi-agent registry 對其 ID 回傳 `not_found`；
這代表執行器生命週期已關閉，不作為缺報判定。最終接受依據是留存的交付物、
隔離 branch 遠端狀態與 A5 本輪獨立重跑結果，不以子代理自述代替驗證。

## 2. 三階段交付

### 第一階段：Schema、測試與發布狀態

- 建立 `knowledge_staging`、`knowledge`、`casework` 三個資料域。
- 建立 26 個 application tables，全部啟用 RLS：
  `knowledge_staging` 5、`knowledge` 11、`casework` 10。
- 建立人工治理狀態：
  `inbox -> draft -> pending_review -> approved -> retired`。
- `knowledge.publication_events` 與 `casework.case_events` 都保存具體的
  `next_action`；下一位處理者與下一步行動為不同欄位，事件仍維持 append-only。
- staging 永遠不可自行發布、建立案件預算候選或直接計價。
- A12 只可留下 PDF 圖說證據與待確認事項，不可建立預算候選。
- 木作 mapping 全量留在 staging；`direct_pricing_allowed=false`、
  `publication_authorized=false`、`candidate_creation_authorized=false`、
  `formalImpact=none`。
- `knowledge.unified_items` 只有人工核准且連回目前有效核准版本時才可建立；
  目前正式資料筆數為 0。
- 契約領域只可回傳 evidence、comparison、missing information、
  risk note，且 `formalImpact` 固定為 `none`。

### 第二階段：Knowledge Studio 最小版本

- 本機頁面：
  `C:\CodexWork\08-Jacky\laibe_MVP_project\site\knowledge_studio\code.html`
- 支援草稿、送交覆核、退回修正、發布、停用及事件留痕。
- 遠端 adapter 以使用者 JWT 呼叫 `knowledge-studio`，不使用
  service-role credential。
- 目前 HTML 的 endpoint 與 project key 保持空白，因此頁面是清楚標示的
  local preview，尚未連接 branch。
- 已修正篩選切換後右側仍保留不可見舊紀錄的選取狀態；狀態機測試通過。
- `app.js` 已變更，`code.html` 對應引用已遞增為
  `app.js?v=2026072605`。
- 最新修正已用 in-app browser 完成 desktop `1440 x 900` 與 mobile
  `390 x 844` 回歸；兩個 viewport 都沒有水平溢出，console 均為
  `0 error / 0 warning`。

### 第三階段：Knowledge Gateway

- `knowledge-gateway` 已部署至隔離 branch。
- A12、budget、contract 三個 domain 依 caller metadata 與 RLS 隔離。
- Gateway 只召回 approved、未停用、有來源及版本的資料。
- Synthetic E2E 已驗證 search / get；測試資料與測試帳號已清除。
- `knowledge-ingest` v2 已用真實短效使用者 JWT 與 publishable key 完成
  42,248 筆木作 staging 匯入及完整重送；沒有使用 service-role 瀏覽器憑證。

## 3. Migration 與 Edge Function

隔離 branch migration：

1. `20260726140526 remote_schema`
2. `20260727070135 pcm_knowledge_foundation_20260726_01`
3. `20260727070138 pcm_knowledge_foundation_20260726_02`
4. `20260727070141 pcm_knowledge_foundation_20260726_03`
5. `20260727070145 pcm_knowledge_foundation_20260726_04`
6. `20260727070148 pcm_knowledge_foundation_20260726_05`
7. `20260727070151 pcm_knowledge_foundation_20260726_06`
8. `20260727070154 pcm_knowledge_foundation_20260726_07`
9. `20260727071056 pcm_knowledge_domain_rls_hardening`
10. `20260727072915 pcm_knowledge_active_session_hardening`
11. `20260727085354 pcm_woodwork_candidates_staging`
12. `20260727095027 knowledge_case_event_next_action`

第 11 筆對應本機 migration：
`C:\CodexWork\08-Jacky\laibe_MVP_project\supabase\migrations\20260727161457_pcm_woodwork_candidates_staging.sql`。
第 12 筆對應本機 migration：
`C:\CodexWork\08-Jacky\laibe_MVP_project\supabase\migrations\20260727094259_knowledge_case_event_next_action.sql`。
遠端 branch 為分段套用歷史，版本號不與本機檔名一一相同；後續不得直接對
production 執行未經 reconciliation 的 `db push`。
本機檔名使用台北時間，遠端 migration history 使用分支記錄版本。

隔離 branch Edge Functions：

| Function | Version | Status | JWT |
|---|---:|---|---|
| `knowledge-ingest` | 2 | ACTIVE | required |
| `knowledge-studio` | 1 | ACTIVE | required |
| `knowledge-gateway` | 1 | ACTIVE | required |

未登入呼叫會被拒絕。刪除臨時帳號及 session 後，以舊 token 重送既有
idempotency key，資料庫授權層回 HTTP 422，且沒有新增資料。

## 4. 真實來源匯入

來源：

- Obsidian vault：
  `C:\CodexWork\08-Jacky\laibe_MVP_project\Laibe-Budget-Vault`
- 預算來源：
  `C:\CodexWork\08-Jacky\laibe_MVP_project\bugget\清單分類_20260605_0107`
- active workbook：
  `_AI_BUDGET_MASTER_INDEX_OUTPUT_20260617_132725\laibe_budget_ai_master_index.xlsx`

結果：

| 項目 | 數量 |
|---|---:|
| Vault Markdown | 22 |
| Vault 可發布內容 | 0 |
| Vault 排除骨架 / 索引 / 模板 | 22 |
| 預算來源列 | 59,223 |
| 匯入批次 | 61 |
| source records | 59,223 |
| budget staging items | 19,279 |
| 原有品質事項 | 9 |
| 負值歷史價格事項 | 159 |
| 品質事項合計 | 168 |
| 正式 knowledge entries | 0 |
| 正式 entry versions | 0 |
| 正式 price observations | 0 |

所有 61 批第一次匯入皆回 HTTP 200。完整重送後：

- `reused: true`：61 批
- 非重用批次：0
- staging 筆數變動：0
- `formalImpact`：只有 `none`

### 木作 mapping 全量 staging

來源：

`C:\CodexWork\08-Jacky\laibe_MVP_project\outputs\budget_woodwork_items_20260710\A1_woodwork_ingest_mapping_20260711.json`

鎖定 SHA-256：

`d4f3d30750894b4c788823e5155255dfe288f923c87b7fc4172332c94cae0f7a`

遠端執行結果：

| 項目 | 數量 |
|---|---:|
| HTTP 批次 | 43 |
| source records | 42,248 |
| woodwork candidates | 42,248 |
| quality issues | 57 |
| 可作候選參考 | 11,618 |
| 需圖片或報價補強 | 27,090 |
| 不適用材料等級 | 1,593 |
| 需人工審查 | 1,947 |

全量重送證據：

- `failed_count=0`
- `reused_count=43`
- `inserted_count=0`
- mapping ID、row identity 及 source link 皆 42,248 筆唯一且完整
- 57 筆拆除／櫃體分類衝突皆進品質事項
- 不安全價格、發布、候選建立及正式影響旗標命中皆為 0

隔離 branch 累計實體筆數：

| 項目 | 數量 |
|---|---:|
| import batches | 104 |
| source records | 101,471 |
| budget staging items | 19,279 |
| woodwork candidates | 42,248 |
| quality issues | 225 |
| 正式 sources / entries / versions / unified items | 0 |
| 正式 budget rules / price observations | 0 |
| case candidate budget lines | 0 |

臨時匯入帳號、identity 及 session 已清除；目前符合 A5/knowledge-import
辨識條件的臨時帳號數為 0。舊 token 呼叫被拒絕，匯入筆數未增加。

## 5. 負值價格與來源路徑修正

根因：

1. 來源工作簿含負值歷史價格。
2. 匯入器原先將負值直接送入具非負約束的 staging 欄位。
3. Windows `Path.resolve()` 可能將 mapped drive 展開為不允許的網路路徑。

修正：

- 原始負值完整保留於來源 evidence。
- `historical_price_low` / `historical_price_high` 的負值改為 `null`。
- 每筆建立 `negative_historical_price`，狀態為 `pending_review`，
  `next_reviewer_role=pcm`，且 `quarantined=true`。
- 來源絕對路徑使用不展開 mapped drive 的方法；目前測試以離線合成 drive fixture 驗證，不要求實際 mapped drive 存在。

驗證：

- 159 個負值事項全部連回 source record。
- 159 個負值事項全部待 PCM 覆核並標記隔離。
- staging 可用價格欄位負值：0。
- 禁止的網路位址字串：0。

## 6. 測試證據

| 驗證 | 結果 |
|---|---|
| Python importer tests | 24 / 24 pass |
| Node contract / Studio / splitter tests | 62 / 62 pass |
| PGlite full migration smoke | 1 / 1 pass；5 migrations + 7 SQL contracts |
| Deno check | 3 個 Edge Functions + PGlite smoke pass |
| Deno fmt check | 7 files pass |
| Remote RLS / lifecycle SQL contracts | 7 / 7 pass，transaction rollback；最新 `next_action` contract 已重跑 |
| Authenticated Studio / Gateway E2E | pass，fixture cleaned |
| Full staging import | 61 / 61 HTTP 200 |
| Full replay idempotency | 61 / 61 reused |
| Woodwork dry-run | 43 batches / 42,248 records / 57 issues |
| Woodwork remote import | 43 / 43 HTTP 200 |
| Woodwork remote replay | 43 / 43 reused，0 inserted |
| Knowledge Studio state tests | 10 / 10 pass |
| JSON parse validation | 7 / 7 pass |
| Knowledge Studio static HTTP smoke | HTML 200；`app.js?v=2026072605` 200，含 `nextAction` |
| Knowledge Studio desktop browser | `1440 x 900` pass；無水平溢出；console 0 / 0 |
| Knowledge Studio mobile browser | `390 x 844` pass；`scrollWidth=clientWidth=375`；console 0 / 0 |

本次瀏覽器實測涵蓋規則選取、狀態篩選、覆核工作、來源追溯、手機詳情、
下一步與下一位處理者分離、無結果提示及測試條件還原。載入腳本為
`app.js?v=2026072605`，可見文案未命中禁止的工程、付款或法律效果語。

## 7. 原始目標需求對證據矩陣

| 原始要求 | 判定 | 證據與限制 |
|---|---|---|
| 使用 3 個新 subagent，A12 不計入 | 已證明 | 三個 task ID、互斥 write scope 與 A5 收報狀態已記錄於「子代理執行與收報」；三者已關閉，A5 已對其交付物獨立重跑驗證。 |
| 只在隔離 Supabase branch 施工 | 已證明 | `a5-pcm-knowledge-20260726` 為 non-default、`ACTIVE_HEALTHY`；parent migration history 未增加。原計畫名稱為 `a5-knowledge-foundation-20260726`，實際核准名稱多了 `pcm`，記為命名差異，不另開第二個付費 branch。 |
| 三資料域、結構化規則與 RLS | 已證明 | `knowledge_staging` 5 表、`knowledge` 11 表、`casework` 10 表，共 26 表全部 RLS enabled；59 個相關 policy 未使用 `raw_user_meta_data` 作權限。 |
| 人工覆核、發布、停用與版本留痕 | 已證明 | lifecycle、append-only 事件、具名 actor、來源、前後狀態、下一位處理者與 `next_action` 均有 migration、Node、PGlite 及遠端 transaction contract。 |
| Vault 單向匯入及同路徑新版保留 | 已證明 | Vault 可發布內容為 0；同路徑內容 SHA 改變會產生新 staging identity，不覆寫既有候選。 |
| 42,248 筆木作資料只進 staging | 已證明 | 四 bucket 為 11,618 / 27,090 / 1,593 / 1,947；直接計價、發布、embedding、自動觸發、預算候選與正式影響皆為 0。 |
| A12 僅 PDF、不可建立預算列 | 已證明 | Storage 僅允許 PDF；合約測試確認無 DWG 欄位或路由，`casework.candidate_budget_lines` 為 0。 |
| Studio 處理編修、覆核、發布、停用 | 已證明 | 狀態測試 10/10；使用者可見文案掃描通過；desktop/mobile 已實測篩選、詳情、來源、下一步及無結果狀態，console 0 / 0。 |
| Gateway 供 A12、預算、契約共用 | 介面已證明；consumer 未接線 | 三 domain caller contract、approved-only、來源與版本限制、`formalImpact=none` 已通過；正式 consumer 串接屬下一輪。 |
| 私有文件儲存 | 已證明 | `case-documents-private` 僅 PDF、100 MB；`knowledge-source-private` 為私有 bucket、50 MB。 |
| 不合併、不發布正式知識、不宣告完成 | 已遵守 | 無 production merge；正式 knowledge、規則、價格與候選預算列皆為 0。 |

## 8. Advisor 與上線閘門

Supabase advisor 仍有下列需獨立處理的風險：

1. parent project 既有 `public` schema 問題，包括無 policy 的 RLS、
   過度寬鬆的 `project_drafts` policy 及匿名 GraphQL 可見性。A5 package
   未修改這些既有物件。
2. 新三個 schema 的 26 個表對 `authenticated` 可被 GraphQL 發現。實際資料存取已有
   domain、case membership、PCM/admin 與 active-session RLS 黑箱驗證，
   但 production 前仍須決定維持「可發現 + RLS」或改為 RPC-only surface，
   並做獨立安全審查。
3. `knowledge` 與 `knowledge_staging` 部分表有多個 permissive `SELECT`
   policy，屬效能提示；語意測試已通過，但正式流量前應合併或量測。
4. 新索引目前顯示 unused，符合剛建立且正式 consumer 尚未接入的現況；
   不得因此在缺少查詢負載證據時先行移除。
5. advisor 回報的 unindexed foreign key 與 per-row auth RLS 警示集中在既有
   `public` schema；不屬本輪 A5 migration。

對應 Supabase remediation：

- [Authenticated GraphQL discoverability](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed)
- [Multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)
- [Unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- [RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Overly permissive RLS policy](https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy)

其他未完成閘門：

- 尚未設定正式 web origin 的 CORS allowlist。
- Knowledge Studio 尚未連接遠端 branch。
- 尚未建立正式 PCM reviewer 帳號與上線身分治理。
- Vault 目前只有骨架、索引與模板，沒有任何規則可發布。
- A12、預算與契約 consumer 尚未接入 Gateway。
- 沒有 production merge、正式案件匯入或正式知識發布授權。

## 9. 邊界確認

- 不含正式報價或價格承諾。
- 不含付款保障、託管、代收代付。
- 不宣稱真電子簽章或法律簽證效力。
- 不允許 AI、A12、A1 或網站自行核准知識。
- 符合「裝修決策工具 + 案件紀錄留痕系統」定位。

## 10. 下一輪建議順序

1. 由 Owner / AA 決定三個 schema 採「authenticated 可發現 + RLS」或
   RPC-only surface；決策前不得接 production consumer。
2. 建立正式 PCM reviewer 身分、app metadata、session 失效與交接規則，
   並重跑跨 domain、跨案件及舊 token 黑箱測試。
3. 設定明確 CORS allowlist 與 branch 環境參數，再讓 Knowledge Studio
   連接隔離 branch；不得把 secret 或 service-role key 放進前端。
4. 以 Studio 流程建立第一筆人工覆核規則，驗證 draft、pending review、
   approved、retired、版本及事件留痕，不得直接寫正式表跳過閘門。
5. 先接 A12 PDF drawing review 的唯讀搜尋與 finding 留痕，再分別接預算及
   契約 evidence consumer；三者不得互相取得未授權 domain。

A5 初審：隔離 branch 的 Knowledge Foundation、Studio MVP、Gateway、既有
預算來源 staging 與 42,248 筆木作 staging 證據可交付審查；事件下一步留痕
缺口已補齊並有本機、遠端 rollback 與 desktop/mobile 瀏覽器證據。正式身分
治理、consumer 接線、安全 surface 決策及 production 合併屬後續上線工作，
本輪未獲授權且未進行。
