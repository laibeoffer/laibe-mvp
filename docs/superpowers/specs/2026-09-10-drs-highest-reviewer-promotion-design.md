# DRS 最高審查官升任與治理權限設計

**狀態：** 口頭方向已確認；書面規格待 Human review，尚未進入實作

**日期：** 2026-09-10

**Core source base：** `6cd6c2e6faf5a470ae7cd66a16ed353627f151ad`

**Sites source snapshot：** `876af6cac21709b8ec201f594734599fcad607c0`

**設計分支：** `drs-auth/c-plus-highest-reviewer-design-20260910`

## 1. 產品決策

最高審查官不另開註冊入口，也不能由公開頁面自行選擇角色。任何最高審查官都必須先完成一般審查員註冊、Email 驗證及資格核准，取得目前有效的一般審查員身分後，才能由後端認定的 DRS 系統擁有者在治理頁面升任。

同一位使用者沿用原本的 Email 與密碼，不建立第二個帳號。最高審查官席次不限定一位；每一位符合資格的一般審查員都可以被獨立升任或撤銷。

```text
一般審查員註冊
→ Email 驗證
→ 審查員資格核准並建立有效身分綁定
→ DRS 系統擁有者登入治理頁
→ 從有效審查員名單選人
→ 填寫理由並指定為最高審查官
→ 同一帳號取得註冊治理權限
```

最高審查官身分只增加「審查員註冊治理」能力，不自動取得任何案件、文件、報價或工作區的存取權。案件權限仍必須由既有的案件成員、案件指派或案件範圍 grant 個別判定。

## 2. 本輪要修正的根因

現有 `drs_forward_private.reviewer_registration_operation_grants` 只把 `actor_user_id` 與註冊核准操作綁在一起。`registration_actor_check_v1` 會檢查 Auth session 與 operation grant，卻沒有同時要求該 actor 仍具有有效的一般審查員 `specialist` 與 `auth_specialist_binding`。

因此目前模型可以把一個 Auth 使用者直接設成註冊核准者，卻無法證明此人先是一般審查員。治理頁也只有最高審查官登入與申請核准佇列，沒有一個安全、可追溯的升任介面。這正是本設計要收斂的缺口。

## 3. 角色與權限邊界

### 3.1 一般審查員

一般審查員必須同時符合：

- Supabase Auth 使用者存在、Email 已驗證，且未刪除或停權。
- `drs_forward_private.specialists` 為 `active`。
- 對應的 `drs_forward_private.auth_specialist_bindings` 為 `active`，且在有效時間內。

這是最高審查官不可省略的先決條件。只知道 Email、只有 Auth 帳號、曾經申請過，或前端顯示「審查員」都不構成資格。

### 3.2 DRS 系統擁有者

系統擁有者是初始信任根，不等於最高審查官，也不因此取得案件權限。其 Auth user ID 只存在於 Postgres 私有的 `drs_forward_private.governance_owner_grants`，不放在 Sites、HTML、JavaScript、JWT metadata 或可由瀏覽器修改的資料。

初始系統擁有者必須是既有、可正常登入的 Auth 帳號，其建立或邀請屬於受保護的管理操作，不提供公開「系統擁有者註冊」頁。第一次 bootstrap 由受核准的資料庫管理 authority 直接 provision 一筆 owner grant；沒有 owner grant 的情況下不存在可從公開網路自我建立 owner 的 endpoint。若 owner 本身也要成為最高審查官，仍必須先完成一般審查員資格流程。

每次管理請求都必須驗證目前有效的 Supabase Auth session，並由 RPC 以 session 的 `user.id` 比對私有 owner grant。瀏覽器不得提交 owner ID、角色名稱或任何可以自行選擇權限的欄位。

系統擁有者可以：

- 讀取符合升任條件的一般審查員名單。
- 指定一般審查員為最高審查官。
- 撤銷最高審查官治理權限。
- 檢視每次指定與撤銷的可理解結果。

若系統擁有者本身已經是有效的一般審查員，可以指定自己為最高審查官。這不是公開自助升任：資格來自後端私有 owner grant，候選仍必須通過 reviewer-first 檢查，操作仍須填寫理由並留下完整 audit。此規則讓初始環境可以用一個受信任帳號完成 bootstrap，不強迫先建立第二個管理帳號。

系統擁有者不可以透過此介面：

- 建立或核准一般審查員資格。
- 直接輸入任意 Email 升任未核准的人。
- 指派案件或讀取案件內容。
- 修改 Auth 密碼、Email 或 provider 設定。

### 3.3 最高審查官

最高審查官是「有效一般審查員身分」加上「有效註冊治理 grant」的交集：

```text
最高審查官目前有效
= Auth user 存在、Email 已驗證且未刪除／停權
+ Auth session 有效
+ specialist active
+ auth_specialist_binding active 且未逾期
+ reviewer_registration_operation_grant active 且未逾期
```

任何一項失效，註冊治理 API 都必須立即 fail closed。前端曾登入成功、token 尚未過期或畫面仍顯示舊狀態，都不能延續權限。

最高審查官可以核准或駁回一般審查員申請，但不能核准自己的申請，也不能透過這項全域角色取得案件 wildcard access。

### 3.4 多席次規則

最高審查官沒有全域單席 unique constraint。唯一性只約束同一個 reviewer identity 對同一 operation/scope 的有效 grant，避免同一人重複建席。

- 可以同時存在多位最高審查官。
- 指定第二位或更多最高審查官不會取代既有者。
- 撤銷某一位只影響該使用者。
- 系統擁有者仍可在沒有最高審查官時重新指定，因此不需要用前端技巧保留「最後一席」。

## 4. 最小初始治理介面

介面位於既有 `/pcm/governance/`，新增一個「最高審查官設定」區塊，不建立新的公開註冊頁。

### 4.1 顯示條件

- 尚未登入：只顯示既有治理登入，不載入候選名單。
- 已登入但不是系統擁有者：不顯示管理控制；頁面依既有最高審查官權限顯示申請佇列或無權限狀態。
- 已登入且是系統擁有者：顯示「最高審查官設定」。
- 同一人同時是系統擁有者與最高審查官：管理區及申請核准區可以同時顯示，但兩者權限檢查與 API 完全分離。

前端只根據後端回傳的 capability 決定呈現，不以 Email、`user_metadata`、URL hash、query string、localStorage 或 JavaScript 常數推定角色。

### 4.2 候選清單

清單回傳兩集合的聯集：目前有效且已核准的一般審查員，以及仍有任何現存最高審查官 grant 的歷史 subject。這樣 owner 既能從 eligible reviewer 中選人，也能看見 reviewer 資格後來失效但尚待正式撤銷的 grant。依姓名與已驗證 Email 讓系統擁有者正確辨識；完整 Email 只出現在通過 owner authorization 的私有治理回應，不進入 URL、瀏覽器持久儲存或 log。每列包含：

- 顯示姓名。
- 已驗證 Email。
- 一般審查員資格狀態與有效期限：`有效`、`已失效` 或 `已撤銷`。
- 最高審查官 grant 狀態與版本：`尚未指定`、`有效`、`已逾期` 或 `已撤銷`。
- 實際可用狀態：只有 reviewer qualification 與 grant 都有效才是 `最高審查官有效`。
- 對應主操作：eligible + no active grant 時為 `指定為最高審查官`；有 active grant 時為 `撤銷最高審查官`；qualification 失效且沒有 active grant 時不提供 mutation CTA。
- 若該 actor 尚有 `legacy_identity_unresolved=true` 的歷史 grant，即使目前 reviewer 已重新符合資格，也不顯示指定 CTA；顯示「需要管理員完成身分核對」。受核准的資料庫 reconciliation 把同一 row 綁定至可證明的 reviewer identity、版本加一並 append audit 後，才恢復一般 grant/regrant 流程。

介面不提供任意 Email、user ID、specialist ID 或 role 名稱輸入框。使用者只能從伺服器產生的 eligible list 選人。

### 4.3 操作確認

指定或撤銷前顯示簡短確認區，必填 1–500 字理由。確認文案必須清楚指出：

- 此操作只變更審查員註冊治理權限。
- 不會增加或移除案件存取權。
- 操作會留下不可變更紀錄。

成功後更新該列狀態，顯示執行者、時間、結果與下一步。失敗時保留使用者輸入的理由，並提供可理解的重新整理或重試動作。

### 4.4 必備產品狀態

```text
尚未登入
正在確認管理權限
沒有符合資格的審查員
可指定
指定處理中
指定完成
撤銷處理中
撤銷完成
審查員資格已變更
需要管理員完成身分核對
沒有管理權限
目前無法完成，請稍後再試
```

每個狀態都必須回答目前發生什麼事、下一步由誰處理，不得顯示 raw JSON、RPC 名稱、stack trace、DB、API、mock 或 source 狀態。

## 5. 後端與資料設計

### 5.1 擴充既有 operation grant

以新的 forward-only migration 擴充 `drs_forward_private.reviewer_registration_operation_grants`，不修改既有 migration：

- 第一階段先新增 nullable 的 `specialist_id uuid`、`auth_binding_id uuid` 與 `auth_binding_version bigint`，並新增 `legacy_identity_unresolved boolean not null default false`，避免在未知遠端資料上直接套用 `NOT NULL`。
- deployment preflight 必須檢查全部 legacy rows，不只檢查目前 active 的 rows。
- 若表為空，migration 可立即完成 conditional identity constraint validation；所有新列都必須是完整綁定列。
- 若存在任何 active、revoked 或已逾期 legacy row，部署立即停止；由另一次受核准 reconciliation 處理每一列。可以證明歷史 reviewer binding 的列補齊三欄並維持 `legacy_identity_unresolved=false`；無法證明的列必須明確撤銷、版本加一、append audit，並設為 `legacy_identity_unresolved=true`。不得自動猜測 Email、靜默補綁或丟棄歷史列。
- 三個 identity 欄位在 physical schema 保持 nullable，但 validated check constraint 只允許兩種形狀：`legacy_identity_unresolved=false` 且三欄全部非 null；或 `legacy_identity_unresolved=true`、status 為 revoked、revoked_at 非 null 且三欄全部為 null。
- 新增／更新 grant 的一般 RPC 永遠不能把 `legacy_identity_unresolved` 設為 true，也不能 grant/regrant 尚未解析的 row；所有 runtime authority query 都拒絕此旗標。未解析狀態本身不能形成 authority，但受核准的資料庫 reconciliation 可以在日後取得可證明 binding 時，更新同一 row 為完整 identity、設回 false、版本加一並 append audit。如此保留既有 unique identity 與歷史，不永久封鎖該 actor。
- 對所有 `legacy_identity_unresolved=false` 的列，`specialist_id` 與 `auth_binding_id` 必須引用同一位 `actor_user_id` 的可驗證綁定；是否「目前有效」仍由每次 command/runtime check 判斷，不能只靠 FK。
- 保留既有 `(actor_user_id, operation, scope)` unique constraint，因此天然支援多位不同 actor。
- 保留 `status`、`version`、`valid_from`、`valid_until`、`revoked_at`、`granted_by` 與 `authority_basis`。

不得依 Email 建立 grant，也不得由 Sites 或瀏覽器直接寫表。

### 5.2 系統擁有者信任根

新增私有 `drs_forward_private.governance_owner_grants` 與 append-only `governance_owner_grant_events`：

- owner grant 以 Auth user ID 為 identity，包含 status、version、valid_from、valid_until、revoked_at、provisioned_by 與 authority_basis。
- 至少 provision 一位，並允許多位 owner 作為營運備援。
- 沒有 browser、Sites 或一般 service endpoint 可以新增 owner。
- 初始 provision／後續 owner 變更只能由受核准的資料庫管理 authority 執行，並同步 append immutable event。
- 所有表格 force RLS，對 `PUBLIC`、`anon`、`authenticated` 與 `service_role` 撤銷直接 DML。

owner authorization RPC 必須同時鎖定並驗證 `auth.sessions`、`auth.users` 與 owner grant。這使資料庫能自行判斷 owner，不依賴 Edge 傳入布林值、Email、metadata 或環境 allowlist。

### 5.3 升任／撤銷 command ledger

新增 append-only `drs_forward_private.highest_reviewer_role_decisions`：

- `decision_id`
- `owner_user_id`
- `subject_user_id`
- `specialist_id`
- `auth_binding_id`
- `auth_binding_version`
- `expected_grant_version`，初次 grant 為 null
- `outcome`：`grant` 或 `revoke`
- `reason`
- `idempotency_key`
- `payload_digest`
- `grant_id`
- `grant_before_version`
- `grant_after_version`
- `decided_at`

`payload_digest` 由資料庫針對 canonical JSON 計算，至少涵蓋 subject binding ID、binding version、grant ID、expected grant version、outcome 與 reason。`(owner_user_id, idempotency_key)` 唯一。重送相同 payload 回傳同一 receipt；同一 idempotency key 搭配不同 digest 必須拒絕。資料表禁止 update、delete 與 truncate。

首次 request 尚無 ledger row 可鎖，因此 RPC 必須先依固定順序取得 transaction-scoped advisory locks：先鎖 `(owner_user_id, idempotency_key)`，再鎖 `(subject_user_id, operation, scope)`。取得第一把鎖後才查詢或建立 idempotency record；唯一 constraint 仍保留作第二層防線。所有相同 command path 都使用同一鎖順序，避免 grant/revoke 競態與 deadlock。

既有 `operation_grant_events` 持續記錄 grant 的 before/after state；command ledger 則回答「誰、何時、指定或撤銷誰、理由、影響哪個版本」。兩者共同構成可稽核留痕。

### 5.4 原子 RPC

新增兩個 service-role-only RPC：

1. `drs_highest_reviewer_candidates_v1`
   - 接受由 Edge Function 解出的 owner user/session 資料與 cursor。
   - 重新驗證 live Auth user/session、owner user ID 與 session user 一致，以及私有 owner grant 目前有效。
   - 列出 eligible reviewers 與仍有現存 grant 的歷史 subjects 之聯集，分開回傳 qualification state、grant state 與 grant version。
   - 回傳嚴格、去識別化程度適當的 DTO，不回傳 secrets 或完整 Auth row。

2. `drs_highest_reviewer_role_decision_v1`
   - 接受 owner user/session、候選 binding identity、expected binding version、expected grant version、`grant|revoke`、reason 與 idempotency key。
   - 依前述固定 advisory-lock 順序鎖定 idempotency key 與 subject，再鎖定候選 Auth user、specialist、binding、grant 及既有 decision row。
   - 重新驗證 owner grant 目前有效。
   - `grant/regrant` 重新驗證候選仍是 active reviewer，且 binding 版本與有效期未變。
   - `revoke` 不要求 subject 目前仍有 reviewer qualification，也不比較 live binding version；只要求 owner authority、既有 grant ID、grant 內保存的 subject identity 與 expected grant version 一致，因此 binding 已撤銷、換版或不存在 active row 時，殘留 grant 仍可被明確撤銷。
   - 在同一 grant row lock 下 compare `expected_grant_version` 與目前版本；初次 grant 只有在 row 不存在且 expected version 為 null 時可建立。
   - 原子寫入或更新 grant、append decision、append grant event，然後回傳 sanitized receipt。

`grant` 的 `valid_until` 不由瀏覽器指定。伺服器固定使用 `min(binding.valid_until, decision_time + 365 days)`，避免前端放大授權期限，也讓最小介面不必加入權限日期選擇器。對已經有效的 grant 再次按 grant 只回傳目前 receipt，不延長期限；expired/revoked grant 才能以新的 decision 重新啟用。

兩個 RPC 必須 `security definer`、`search_path = ''`、revoke `PUBLIC/anon/authenticated`，只 grant execute 給 `service_role`。即使 caller 持有 service role，RPC 仍須以傳入的 live session ID 重新確認 session user、Auth user 與私有 owner grant；沒有有效 owner session 就拒絕。瀏覽器不得直接呼叫 RPC。

### 5.5 每次使用時重新驗證

`registration_actor_check_v1` 必須加入 reviewer-first 驗證：

- grant 的 `actor_user_id` 必須等於 session user。
- 對應的 `auth.users` 必須存在、Email 已驗證、未刪除且未處於停權期間。
- grant 指向的 specialist 必須 active。
- grant 指向的 binding 必須屬於該 user/specialist、active、未逾期，且版本符合。
- grant 本身必須 active、未撤銷、在有效期間內。

候選的 Email 驗證被撤回、Auth user 被刪除／停權、一般審查員資格被撤銷、binding 過期或 specialist 停用後，即使尚有未到期 access token，申請佇列與核准 command 也必須拒絕。

## 6. Edge Function 與 Sites BFF 契約

### 6.1 Edge Functions

新增：

- `POST /functions/v1/drs-highest-reviewer-candidates`
- `POST /functions/v1/drs-highest-reviewer-role-decision`

兩者都必須：

- 驗證 bearer token 並取得 live user/session；不信任瀏覽器提交的 actor。
- 嚴格檢查 origin、method、content type、body keys 與大小。
- 僅使用 service role 呼叫資料庫 RPC，由 RPC 以 live session + 私有 owner grant 判斷 owner capability。
- 回傳固定 schema version、有限狀態碼及 sanitized DTO。
- 不在 log、response 或 audit payload 輸出 bearer token、密碼、secret 或完整 provider payload。

登入後，治理頁同時呼叫既有 registration-authority endpoint 與新的 candidates endpoint。前者獨立回答 `canReviewRegistrations`，後者只有 owner 才會成功並等價回答 `canManageHighestReviewers`。任一能力成立就顯示其對應區塊；兩者皆不成立才顯示沒有治理權限。前端不得用其中一種能力替代另一種。

### 6.2 Sites route

Sites 新增同名 BFF route，只負責：

- 接收同源治理頁請求。
- 轉送目前瀏覽器 session 的 bearer credential。
- 套用既有 request boundary、timeout、content type 及 sanitized error mapping。
- 不解析角色、不修改 authority、不保存 service-role secret。

最高審查官候選與決策 authority 一律以 Core Edge + Postgres 的 server result 為準。

### 6.3 Browser request DTO

候選名單：

```json
{
  "cursor": null
}
```

決策：

```json
{
  "subject": {
    "authBindingId": "server-issued-uuid",
    "bindingVersion": 1,
    "grantId": null,
    "expectedGrantVersion": null
  },
  "decision": "grant",
  "reason": "負責審查員申請治理與交叉覆核",
  "idempotencyKey": "client-generated-uuid"
}
```

`grantId` 與 `expectedGrantVersion` 都是必要 key：只有 server 回傳 `never_granted` 時兩者為 null；既有 grant 的 grant/revoke request 必須回送 server 提供的 grant ID 與整數版本。`grant/regrant` 比較 live binding version；`revoke` 不比較 live binding version，而是核對 grant 內保存的 binding identity 與 request identity，再比較 expected grant version。瀏覽器不得提交 owner ID、actor user ID、specialist ID、operation、scope 或 role。subject identity 只用來指向伺服器已列出的候選，RPC 仍須重新驗證。

## 7. 授權與撤銷流程

### 7.1 指定

1. 系統擁有者用既有 Email/password 登入治理頁。
2. Edge 驗證 bearer 並把 live user/session 送入 service-role-only RPC；RPC 驗證私有 owner grant。
3. candidates RPC 回傳 eligible reviewers 與仍有 grant 的歷史 subjects，並提供目前 binding/grant versions。
4. 系統擁有者選人、填理由並確認。
5. `grant/regrant` 同時比較 expected binding version 與 expected grant version；`revoke` 核對既有 grant/subject identity 並只比較 expected grant version。
6. RPC 原子建立或重新啟用 operation grant 並 append audit。
7. 頁面顯示「已指定為最高審查官」及時間；被指定者沿用原帳號登入。

### 7.2 撤銷

1. 系統擁有者在同一清單選擇「撤銷最高審查官」。
2. 必填撤銷理由並確認不影響案件權限。
3. RPC 將 grant 版本加一、狀態改為 revoked、寫入時間與 audit。
4. 後續 queue/decision request 立刻 fail closed。
5. 不刪除 Auth user、specialist、案件指派或歷史紀錄。

### 7.3 競態與重試

- 相同 idempotency key + 相同 payload：回傳原 receipt。
- 相同 key + 不同 payload：`IDEMPOTENCY_CONFLICT`。
- `grant/regrant` 的 live binding version 已變：`REVIEWER_QUALIFICATION_CONFLICT`。
- grant version/state 已變：`HIGHEST_REVIEWER_GRANT_CONFLICT`。
- 已有效且再次 grant：回傳目前有效 receipt，不建立重複席次。
- 已撤銷且再次 revoke：回傳目前 revoked receipt，不重複寫 visible action。
- 兩位 owner 同時操作同一候選：固定 advisory-lock 順序與 grant row lock 先線性化操作；`grant/regrant` 比較 expected binding + grant versions，`revoke` 只比較既有 grant identity + expected grant version。較晚的 stale request 回傳 conflict，不覆蓋先完成的決策。

## 8. 安全不變量

- `highest_reviewer ⇒ currently_active_ordinary_reviewer` 必須由伺服器與資料庫共同強制。
- owner management 必須由 live Auth user/session 與私有、有效的 `governance_owner_grant` 共同證明。
- 不存在最高審查官公開註冊、前端角色選擇、任意 Email 升任或一次性共用核准碼。
- 不使用 `user_metadata`、HTML、JavaScript、URL、localStorage 或 cookie 自述角色。
- 系統擁有者與最高審查官都不因全域治理角色取得任何案件 wildcard。
- 最高審查官數量不以單席 constraint 限制。
- grant、revoke、資格失效、重試與衝突都必須留下可追溯結果。
- secret 值、密碼、OTP、service-role key 與完整 bearer token 不進入頁面、log、audit 或測試 fixture。
- 登出仍使用既有 server-side session logout；最高審查官與一般審查員均可清除本機 session，但登出不修改 grant。

## 9. 錯誤與產品文案對應

| Server state | 治理頁文案 | 下一步 |
|---|---|---|
| `AUTH_REQUIRED` | 請先登入治理帳號 | 使用 Email 與密碼登入 |
| `GOVERNANCE_OWNER_NOT_AUTHORIZED` | 這個帳號沒有最高審查官設定權限 | 改用受授權的治理帳號 |
| `NO_ELIGIBLE_REVIEWERS` | 目前沒有可指定的審查員 | 等待一般審查員完成資格核准 |
| `REVIEWER_QUALIFICATION_CONFLICT` | 審查員資格已變更 | 重新整理名單後再確認 |
| `HIGHEST_REVIEWER_GRANT_CONFLICT` | 最高審查官狀態已變更 | 重新整理名單後再確認 |
| `LEGACY_GRANT_RECONCILIATION_REQUIRED` | 這筆歷史權限需要管理員完成身分核對 | 完成受控身分核對後再指定 |
| `IDEMPOTENCY_CONFLICT` | 這次操作內容與先前送出內容不一致 | 重新確認後建立新的操作 |
| `HIGHEST_REVIEWER_GRANTED` | 已指定為最高審查官 | 可繼續指定其他審查員 |
| `HIGHEST_REVIEWER_REVOKED` | 已撤銷最高審查官權限 | 該帳號不再具有審查員註冊治理權限 |
| `TEMPORARILY_UNAVAILABLE` | 目前無法完成，請稍後再試 | 保留理由並安全重試 |

頁面不得把上述 server enum 原文顯示給使用者；enum 只用於程式內的有限狀態 mapping。

## 10. 測試與驗收矩陣

### 10.1 PostgreSQL／Auth

- 非一般審查員不能被 grant。
- Email 未驗證、specialist inactive、binding revoked/expired/future-dated 均不能被 grant。
- reviewer qualification 已失效或 Auth user 已停用時，既有 highest-reviewer grant 仍可由 owner 正式 revoke。
- 任何 active、revoked 或 expired legacy grant 存在時，未完成全量 reconciliation 的 migration preflight 必須停止。
- 無法綁定的 legacy row 只能進入 audited、revoked、`legacy_identity_unresolved=true` 狀態；只要維持 unresolved，就永遠不能形成 runtime authority。
- unresolved actor 重新取得 reviewer qualification 時，一般 API 仍禁止 regrant；受控 reconciliation 解決同一 row 並留下新版本／audit 後才可 regrant，不會受 unique constraint 永久封鎖。
- active reviewer 可以被 grant，且同一人不產生重複 active seat。
- 兩位以上不同 reviewer 可以同時維持 active highest-reviewer grant。
- 撤銷其中一位不影響其他人。
- reviewer binding 在 grant 後失效時，queue 與 decision 都拒絕。
- 無有效 owner grant、owner grant revoked/expired、owner Auth user/session 無效時，candidates 與 decision 均拒絕。
- grant/revoke idempotency、payload digest conflict、stale binding version、stale grant version 與 concurrent decision 均有決定性結果。
- revoke 不依賴 live binding version；binding 已撤銷或換版時仍能按既有 grant identity/version 完成撤銷。
- 首次相同 idempotency key 並行送出時只產生一筆 decision；固定 advisory-lock order 不發生 deadlock。
- decision 與 grant event append-only。
- 建立 highest-reviewer grant 前後，該 user 的案件可見範圍完全不變。

真實資料庫驗證必須使用 disposable real PostgreSQL/Supabase runtime；靜態 SQL、parser 或 mock 不能替代 constraint、lock、RLS 與 transaction 證據。

### 10.2 Edge Function

- 無 bearer、無效 session、錯誤 origin/method/content type、extra keys 皆 fail closed。
- owner 身分只來自 live session + private database owner grant。
- browser-supplied actor/role 欄位被拒絕。
- RPC error 映射為有限狀態，response/log 不洩漏 secrets 或 internal error。
- timeout、重送與 idempotency receipt 行為一致。

### 10.3 Sites 與瀏覽器

- 桌機與手機都能由 `/pcm/governance/` 登入、看到正確 capability、開啟設定區、指定與撤銷。
- 非 owner 看不到管理控制，直接呼叫 route 仍被 server 拒絕。
- 空狀態、載入、成功、衝突、無權限、暫時失敗均為繁體中文產品文案。
- 不存在任意 Email 欄位或最高審查官獨立註冊 CTA。
- 指定多位後清單同時顯示多個 active 狀態。
- 兩類角色都能使用登出，登出後受保護內容消失。

最終 web acceptance 必須綁定同一 canonical preview，確認 server root、served-byte identity，並完成 desktop/mobile 的實際互動 journey。source test、HTTP 200、靜態畫面或 temporary preview 不能單獨證明完成。

## 11. 實作切片與 ownership

實作階段另開一份 execution plan，依 `ONE_FILE = ONE_WRITER` 分成：

1. **Core data/auth slice**：forward migration、real-PG tests、actor check 與原子 RPC。
2. **Core Edge slice**：owner verifier、candidates/decision handlers 與 unit tests。
3. **Sites governance slice**：BFF routes、`/pcm/governance/` UI、產品狀態與 scoped tests。
4. **Integration/acceptance slice**：遠端 migration/function deploy、受核准的初始 owner grant provision、真實帳號旅程及 canonical desktop/mobile 驗收。

前三個切片是 source construction；第四個切片涉及 remote database、Edge deployment、初始 owner authority 與真實帳號，必須有當時明確的 production authority 才能執行。不得以前三個切片成功冒稱正式 runtime 已完成。

## 12. 非目標與受保護範圍

- 不另建最高審查官註冊頁或第二套帳號。
- 不重做一般審查員註冊／Email 驗證流程。
- 不改 LINE、Google、Calendar 或 provider 設定。
- 不改案件 workspace grant、案件 RLS 或文件權限語意。
- 不建立付款、金流託管、代收代付、投資報酬或老屋煉金術功能。
- 不碰 Sites worktree 的既有 dirty `tests/drs-dashboard-chain.test.mjs` 與 `.codex-sites-package/`。
- 不覆蓋 Core `a-plus-account-grant-prod-20260908` worktree 的既有 dirty governance/docs 或 cache。
- 本設計階段不讀取、保存或顯示密碼、OTP、service-role key、owner grant identity 或任何 provider secret。
- 本設計階段不 push、PR、merge、publish、deploy 或修改遠端帳號與權限。

## 13. Task acceptance contract

### Objective

把「先成為一般審查員，再由後端綁定的系統擁有者指定為可有多位的最高審查官」固化成可直接實作與驗收的最小安全設計。

### Exact scope

- `/pcm/governance/` 最高審查官設定區。
- reviewer-first global registration-governance authority。
- owner-only candidates/grant/revoke API。
- immutable decision/audit trail。
- 不擴張案件資料權限。

### Pass criteria

- 書面規格明確回答初始信任根、候選資格、多席次、grant/revoke、資料模型、API、UI 狀態、安全與驗收。
- 沒有任意 Email 升任、前端角色、單席限制或案件 wildcard。
- 實作前由 Human 明確確認本文件。

### Fail criteria

- 最高審查官可以不是 active reviewer。
- 只靠前端、Email 或 metadata 判定角色。
- 第二位最高審查官會取代第一位。
- 全域治理 grant 同時放大案件權限。
- 未經 Human 書面規格確認即進入 Auth／DB／Sites 實作。

### Stop condition

本設計文件提交、自我檢查並由 Human review 後停止。Human 確認書面規格後，下一輪才建立 execution plan；在此之前不修改產品、Auth、資料庫、Edge Function、Sites runtime 或正式帳號。
