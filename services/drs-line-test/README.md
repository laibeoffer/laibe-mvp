# DRS LINE 真人傳輸測試服務

此服務只用於第一階段真人 LINE 傳輸測試：驗證 laibe 官方帳號收到指定文字後，Webhook 能驗證 LINE 簽章，並透過 LINE Reply API 回覆一則鎖定訊息。

只處理一對一使用者傳送的精確文字 `DRS真人測試`。其他文字、事件類型、媒體訊息、群組與聊天室事件皆不回覆，也不建立或修改任何案件資料。

## 執行邊界

```text
DURABLE_DEDUPE=FALSE
FORMAL_CASE_TRACE=FALSE
FORMAL_DRS_AUTH_CONNECTED=FALSE
REAL_DATABASE_CONNECTED=FALSE
```

去重僅存在單一 Node.js process 記憶體中，TTL 為 24 小時且上限 10,000 筆。process restart 後不保留，因此不代表跨 restart 的 exactly-once，也不是正式案件留痕。

本服務不包含 LINE Login、LIFF、Push／Multicast／Broadcast／Narrowcast、群組聊天、資料庫、案件授權、正式身分綁定、文件上傳、LLM、付款或金流託管。

## 本機驗證

需要 Node.js 20，且不需安裝第三方 dependency：

```text
node --test
```

啟動前必須由執行環境提供 `LINE_CHANNEL_SECRET` 與 `LINE_CHANNEL_ACCESS_TOKEN`。`PORT` 預設為 8080；部署平台可注入其他值。不得將任何憑證寫入 `.env`、Git、測試或日誌。

## HTTP

- `GET /health`：只回傳 transport-only health 狀態。
- `POST /line/webhook`：只接受 `application/json`，先以 raw body 驗證 `x-line-signature`，再解析 JSON。
- 其他路徑回 404；路徑上不允許的方法回 405 與正確 `Allow` header。

raw body 上限為 1 MiB，讀取 timeout 為 5 秒；LINE Reply API timeout 也是 5 秒。單行 JSON log 僅保留時間、request/event type、source type、outcome、HTTP status 與 duration，不保存訊息文字、個人／群組／聊天室 ID、replyToken、signature、Authorization 或憑證。

## Zeabur 測試部署

- Branch：`codex/drs-line-real-test-20260829`
- Root Directory：`services/drs-line-test`
- Domain：`laibe.zeabur.app`
- Variables：`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`

Variables 必須由 Human 直接輸入 Zeabur，不得透過聊天、檔案或 Git 傳遞。此測試服務不得被描述為正式 DRS 身分、案件權限、資料庫、持久留痕或正式上線。
