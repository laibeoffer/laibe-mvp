# A5 LaiBE Core Apply Checklist

狀態：**未獲套用授權**。本清單不構成部署指令。

## 1. A0 / Owner 再批准

- [ ] 明確核准 project ref `zdwuyomhswjcbbpbhpcq`。
- [ ] 明確核准 apply window、執行人、觀察人與 rollback decision owner。
- [ ] 確認不會建立新的付費 branch；若需要，先另行核准費用。
- [ ] 確認 Studio 僅限 PCM / admin，甲乙方仍使用 LINE Bot。
- [ ] 確認不包含正式知識發布、付款、託管、代收代付或法律效力。

## 2. 套用前唯讀盤點

- [ ] 重新取得 Core migration history；預期仍為 0。
- [ ] 重新列出 `knowledge`、`knowledge_staging`、`casework`；預期仍無物件。
- [ ] 比對 `supabase/core_reconciliation/manifest.json` 的六個來源 SHA256。
- [ ] 執行 `000_preflight.sql` 並保存結果。
- [ ] 確認這是首次套用；相同 create-only bundle 重複套用必須停止，不得當作 upgrade。
- [ ] 確認 16 個 public RPC signature、2 個 bucket、8 個 Storage policy name 均無碰撞。
- [ ] 盤點 shared `storage.objects` 全部 policy，確認 restrictive guards 不影響非 A5 bucket。
- [ ] 建立可還原備份並驗證還原程序。
- [ ] 盤點非 A5 object 對 A5 schema 的 dependency；任何未知 dependency 均停止。

## 3. 鎖定與中斷風險

- 建立 26 張 table、type、index、policy 與 function 會取得 DDL lock。
- Core 目前沒有 A5 object，預估鎖定時間短；實際時間只能在正式 inventory 後評估。
- `storage.buckets` insert 與 `storage.objects` policy DDL 會觸及 shared Supabase Storage catalog。
- apply bundle 為單一 transaction；任一 statement 失敗應整筆 rollback。
- 不得在流量高峰、未備份或無 rollback owner 時套用。

## 4. Apply 後立即驗證

- [ ] 執行 `900_verify.sql`。
- [ ] 三 schema table count 為 5 / 11 / 10，26 張全部 RLS enabled。
- [ ] `anon` / `authenticated` 對 26 張 table / sequence 的直接 privilege 為 0。
- [ ] `anon` A5 function execute 為 0。
- [ ] `authenticated` execute 精確為 16 public RPC + 2 helper。
- [ ] 18 個介面的 owner、mode、空 `search_path` 符合 catalog contract。
- [ ] 兩個 bucket 均 `public=false`。
- [ ] 4 個 A5 Storage guard 均為 `RESTRICTIVE`。
- [ ] 重新執行 Supabase security / performance advisor 並保存完整輸出。
- [ ] 以 active PCM、inactive PCM、owner、pro、A12、budget、contract 身分重跑黑箱矩陣。
- [ ] 驗證 A12 同案只取得 `drawing_review` finding 與 linked evidence。
- [ ] 驗證寬鬆 legacy Storage policy 無法繞過 A5 bucket guard。

## 5. CORS 與 Function

- [ ] 設定 `KNOWLEDGE_STUDIO_ALLOWED_ORIGINS`。
- [ ] 設定 `KNOWLEDGE_GATEWAY_ALLOWED_ORIGINS`。
- [ ] 未設定與不在 allowlist 的 origin 必須拒絕。
- [ ] 不得把實際 domain、JWT、publishable key 或 secret 寫進 Git。
- [ ] Edge Function 部署需另行 A0 / Owner 核准；本 bundle 不部署 Function。

## 6. Rollback

`990_rollback.sql` 不是一般清理工具，僅在以下全部成立時可由 A0 / Owner 再批准：

- [ ] `knowledge` schema comment marker 完全相符。
- [ ] 26 張 A5 table 全部零資料。
- [ ] 兩個 A5 bucket 零 object。
- [ ] 無非 A5 dependency。
- [ ] 已保存 apply 前備份與 apply / verify log。

rollback 會移除具名 A5 Storage policy、bucket、public RPC 與三個 A5 schema 內物件，但不使用 `CASCADE`；任何資料、marker 不符或非 A5 dependency 都會使整筆交易回退。

## 7. 套用後仍不得宣稱

- AI PCM 已完成或已上線。
- Knowledge Studio 已接 production。
- A12 可做正式圖說核准。
- 預算或契約為正式決策。
- 具付款保障、託管、代收代付、電子簽章或法律簽證效力。
