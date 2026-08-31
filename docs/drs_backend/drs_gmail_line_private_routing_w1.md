# DRS Gmail 登入與私人 LINE 案件分流 W1

## 產品邊界

本功能只做兩件事：

1. 審查員以既有 Gmail 驗證流程登入 DRS；Gmail-backed DRS session
   是唯一身分與權限來源。
2. 審查員把自己的私人 LINE 帳號綁成案件通知目的地；LINE
   只接收案件分流通知，不登入 DRS、不建立角色、不授予案件權限。

一般審查員是預設工作層級。最高審查官只能由伺服器依目前案件的明確授權判定，前端與
LINE 訊息都不能切換或提升角色。

本功能不使用 LINE Login、LIFF、LINE
群組、密碼登入、群組案件分流、金流託管或任何老屋投資功能。

## 預期部署流程與目前證據界線

以下描述的是 source contract 預期的部署後流程。除「本候選目前證據邊界」明列的
local source／disposable PostgreSQL assertions 外，不代表 remote
runtime、Gmail/Auth、LINE provider、手機送達或 production 已完成。

1. 審查員先完成 Gmail 登入並取得有效 DRS session。
2. 登入頁或收件匣讀取 LINE 綁定狀態。
3. 尚未綁定時，審查員啟動綁定；瀏覽器不能提交審查員 ID、案件 ID、角色或 LINE
   ID。
4. 審查員在 laibe 官方帳號私人聊天室傳送「綁定 LINE 案件通知」，或點選等效
   postback。
5. LINE webhook 驗證原始請求簽章，取得一次性 link token，並以帶有穩定 retry key
   的私人 push 訊息提供「繼續綁定」。
6. 繼續頁在有效 Gmail-backed DRS session 下交換一次性 nonce，導向 LINE 官方
   accountLink。
7. LINE 傳回簽名的 `accountLink` 事件後，伺服器只保存 LINE ID 的 keyed digest 與
   AES-GCM 密文。
8. 案件指派或新綁定的 source contract 會建立 derived outbox。disposable
   PostgreSQL harness 目前只證明：Gmail-backed authority 在 provider call
   前、outbox claim／retry 前失效時，pending／retry 項目會被抑制。
9. Source contract 要求派送或抑制結果寫入 append-only delivery receipt 與
   `PRIVATE_LINE_NOTIFICATION` 案件留痕；真實 provider
   結果與手機送達仍須部署後驗證，且不會改變 DRS 案件權限。
10. 解除綁定或 authority 失效後，尚未 claim 或等待 retry
    的通知應被抑制，原案件指派與既有留痕保留。此保證不延伸到已 claim 或已開始的
    provider request，也不表示可以中途取消 LINE 端已接收的請求。本人 LINE
    私聊撤銷路徑仍須經真實 webhook／provider
    部署驗證；它不得登入、切換角色或取得案件。

## 瀏覽器操作契約

原始碼目前定義以下 Edge Function 路由；這不表示它們已部署、已由同源 BFF
提供，或已可由正式瀏覽器使用：

- `POST /functions/v1/drs-line-account-link-start`，body 必須是 `{}`。
- `GET /functions/v1/drs-line-account-link-status`，不得有 query 或 body。
- `POST /functions/v1/drs-line-account-link-cancel`，body 必須是 `{}`。
- `POST /functions/v1/drs-line-account-link-unlink`，body 必須是 `{}`。
- `POST /functions/v1/drs-line-account-link-continue?linkToken=...`，body 必須是
  `{}`。

The five browser-adjacent BFF functions intentionally use `verify_jwt = false`
as a non-user-JWT boundary；每個 handler 仍必須先驗證既有 A17 sealed session
cookie 與 exact short-lived opaque BFF proof，才可重新解析目前案件授權或執行
provider work。回應只會出現核准的 12-state
DTO，不會投影審查員、案件、assignment、角色、LINE ID 或 provider
credential。沒有有效案件 session 時，不開放
start／status／cancel／continue；解除通知改走上述 signed private-LINE
自助撤銷路徑。

驗證順序固定為 sealed session cookie，再驗證 opaque BFF proof。

這些 BFF 必須由 DRS 網站的同源反向代理提供；瀏覽器看見的 origin、`Origin`
header、`Sec-Fetch-Site` 與 `LAIBE_DRS_APP_ORIGIN` 必須一致。不得把 Supabase
Functions 的跨網域網址直接交給前端呼叫。

外部 LINE webhook：

- `POST /functions/v1/drs-line-webhook`
- 僅接受 `application/json`，上限 1 MiB。
- 必須先以 `LINE_CHANNEL_SECRET` 對原始 bytes 驗證 canonical
  `X-Line-Signature`，通過後才解析 JSON。
- Source contract 以 `webhookEventId` keyed digest 與固定 provider retry key
  支援冪等判定；真實 LINE webhook 重送、程序重啟與 provider 已接受 push
  的去重結果，仍須在部署後以真實 provider evidence 驗證。

服務排程入口：

- `POST /functions/v1/drs-line-private-notification-dispatch`，body 必須是
  `{}`。
- 此 service-only dispatcher 維持 `verify_jwt = true`，且 handler 只接受 gateway
  已驗證的 `service_role` claim。
- 不接受瀏覽器提供的案件或 LINE 目的地。

## names-only 設定契約

新功能需要下列名稱；本文件不包含任何值：

```text
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
DRS_LINE_PROVIDER_CHANNEL_ID
DRS_LINE_IDENTITY_HMAC_KEY
DRS_LINE_IDENTITY_ENCRYPTION_KEY
DRS_LINE_IDENTITY_ENCRYPTION_KEY_VERSION
DRS_PUBLIC_ORIGIN
DRS_LINE_OFFICIAL_ACCOUNT_URL
```

帳號綁定 BFF 另沿用既有 A17 secure-session runtime 名稱：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
LAIBE_DRS_APP_ORIGIN
LAIBE_DRS_SESSION_SUCCESS_URL
LAIBE_DRS_SESSION_COOKIE_NAME
LAIBE_DRS_SESSION_COOKIE_KEY_V1
LAIBE_DRS_BFF_PROOF_KEY_V1
```

`DRS_LINE_IDENTITY_HMAC_KEY` 與 `DRS_LINE_IDENTITY_ENCRYPTION_KEY`
必須是不同用途的獨立密鑰。加密密鑰格式是 32-byte canonical
base64url；版本名稱用來阻止派送器以錯誤密鑰解密。Human 只能在 source review
通過且另有部署授權後，直接輸入 Supabase encrypted
secrets；不得貼到聊天、Git、migration、fixture、瀏覽器或日誌。

## 部署順序

本章只是未來操作順序，不表示本候選已部署。

1. 先確認既有 Gmail Auth、A17 secure session、DRS specialist authority
   與案件指派已部署且可用。
2. 套用 `20260831050535_drs_gmail_line_private_routing_w1.sql`。
3. 設定 names-only 變數的實際值。
4. 部署 start、status、cancel、unlink 與 continue 五個 browser-adjacent BFF
   functions；其 non-user-JWT boundary 不取代 sealed session 與 BFF proof 驗證。
5. 部署 `drs-line-webhook`，再將 LINE Developers Console webhook 指向其公開
   HTTPS URL。
6. 執行 LINE Verify；成功後才開啟 Use webhook。
7. 部署 `drs-line-private-notification-dispatch`，只由受控的 service-role
   排程呼叫。
8. 在 DRS 網站建立同源反向代理，再將 UI 的既有 12-state LINE 區塊接到
   BFF；`/drs/line-account-link` 繼續頁必須先移除網址上的 link token，再以有效
   session 呼叫 continue。
9. 依 Human-only Pilot
   清單做一個非正式案件的綁定、通知、開啟、解除與解除後不再推播驗證。

## HOLD 與回復條件

任一條件成立即停止上線：

- Gmail-backed DRS session、current case 或 specialist authority
  無法由伺服器確認。
- migration、RLS、service-only grants 或 public PostgREST facade 驗證失敗。
- LINE 原始 bytes 簽章、nonce 一次性、collision 或 webhook dedupe 未通過。
- 綁定 ID 無法加密、密鑰版本不符或資料庫無法 durable completion。
- outbox claim 無法重新確認案件、指派、審查員、綁定及綁定版本。
- UI 繼續頁尚未串接、LINE Verify
  未通過、手機未看到一筆實際案件通知，或解除後仍收到通知。
- 任何 secret、raw LINE ID、link token、nonce、bearer、Gmail
  地址、案件內文或權限欄位出現在日誌／瀏覽器 DTO。

停止或回復時，先停用 dispatcher 排程與 UI 新綁定入口，再停用 LINE
webhook；不要刪除綁定 audit、webhook dedupe、outbox 或 delivery receipts。資料庫
migration 不做破壞性 rollback，修正以新 migration 進行。

## 日誌 allowlist

目前實作不輸出應用程式日誌。若未來加入結構化觀測，只允許：

```text
correlation_digest
event_kind
safe_outcome
http_status_class
duration_ms
attempt_number
function_name
source_revision
```

不得記錄 request／response body、headers、URL query、LINE user ID、link
token、nonce、signature、access token、channel secret、service-role
credential、Gmail 地址、案件內容或堆疊追蹤。

## Human-only Pilot

1. 以 Gmail 登入 DRS。
2. 啟動 LINE 案件通知綁定。
3. 在 laibe 私人聊天室完成官方 accountLink。
4. 確認 DRS 顯示 durable `linked`。
5. 將一個非 production 測試案件指派給同一審查員。
6. 確認私人 LINE 只收到一則案件通知。
7. 開啟連結，確認 Gmail-backed DRS 權限只解析到預期案件。
8. 解除 LINE 綁定。
9. 再建立一個測試通知，確認手機不再收到。
10. 確認 DRS 保留指派、綁定、解除、派送與抑制的 durable records。

只有十項都以部署後證據通過，才可宣告私人 LINE 案件通知 Pilot 成功。source
test、local database、HTTP mock 或 LINE transport-only Bot
回覆都不能取代此驗證。

## 本候選目前證據邊界

- 原始碼目前包含：source contracts、BFF handlers、signed-webhook
  contract、durable binding／dedupe、assignment
  producer、outbox／receipt、案件留痕、claim lease recovery、send-fence
  source、service-only dispatcher 與 unit／source tests。這是 source
  inventory，不是 deployed-runtime 證明。
- 已完成一輪 task-scoped disposable PostgreSQL 驗證：使用 pinned local
  image、隔離網路且不掛載 port／volume，完成 local migration execution，並驗證
  harness 明列的 pre-claim／pre-retry stale Gmail-backed authority
  suppression。DRS
  授權綁定是不可刪除的稽核沿革；失效只能透過狀態、撤銷時間、有效期限或版本輪替，enqueue／claim／assert
  會在必要資料列鎖定後重新取得伺服器時間並再次判斷授權。該證據只涵蓋 provider
  call 尚未開始前的 pending／retry 抑制；不證明 claimed／in-flight request
  可被中途取消。
- This bounded local pre-claim evidence does not prove:
  - remote database
  - real LINE provider
  - deployment
  - launch
  - cancellation of a claimed or in-flight provider request
- 尚未建立於本 producer：A3 UI 串接與 `/drs/line-account-link` 繼續頁。
- 尚未證明：remote database、deployed Supabase runtime、正式 Gmail Auth、正式
  durable LINE binding、真實 LINE webhook/provider
  行為、案件派送、手機通知、in-flight cancellation、解除後的 provider-side
  結果或 production ownership。
- 未執行：push、PR、merge、Supabase deploy、LINE Console 變更、Zeabur
  變更、secret 輸入、真人訊息或 production launch。
