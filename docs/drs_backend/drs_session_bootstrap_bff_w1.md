# DRS session bootstrap BFF W1

```text
STATUS=LOCAL_SOURCE_STATIC_MOCK_ONLY
DEPLOYMENT=NOT_STARTED
REAL_SUPABASE_CONNECTION=NOT_STARTED
```

本輪只建立 server-owned cookie session 與 BFF proof 的本機 source／static／mock
composition。它不是部署、正式登入、真實 Supabase Auth／RLS、LINE、Google OAuth
或可供 A0 使用的既有 endpoint 整合證明。

## Server-owned continuation

A14 完成身分 callback 後，只能把下列已驗證事實交給 `VerifiedSessionProducer`：

- `authenticatedUserId`
- `specialistId`
- `authorizationSubject`
- 固定 callback origin、同 origin 的成功 redirect 與 `__Host-` cookie name

producer 透過 injected `ServerSessionIssuer` 建立 server session，再把 raw
access token、server session id、expiry 與三個身分事實交給 injected
`SealedCookieEnvelopeCodec` 封裝。回應固定為無 body 的 `303`，只導向與 callback
完全同 origin、無 query／hash 的乾淨 HTTPS Location；cookie name 必須以
`__Host-` 開頭，且為 host-only、`Path=/`、`HttpOnly`、`Secure`、
`SameSite=Lax|Strict`。不得以 `Domain` attribute 作為跨 host workaround。

正式 Google／LINE callback 必須透過反向代理暴露在應用程式的同一 origin，再由該
same-origin callback 建立 cookie；若 callback 與 DRS app 分屬不同
host，host-only cookie 不會被交給 bootstrap，不能靠前端手動搬運 cookie 修補。raw
session material 不可出現在 cookie plaintext、URL、JSON、log、storage 或 public
error。

## Bootstrap and proof contract

`POST /functions/v1/drs-session-bootstrap` 只接受：

- exact `{}` JSON body；
- 無 query；
- exact `Origin`；
- `Sec-Fetch-Site: same-origin`；
- 瀏覽器以 `credentials: "same-origin"` 帶入唯一 configured cookie。

handler 先開啟 sealed cookie，再透過 injected `AccessSessionVerifier` 重驗
server session／access token，核對 expiry 與 exact
user／specialist／authorization subject， 最後呼叫既有 accepted
`DrsSpecialistAuthorizationStrategy.resolveSession` 重驗當下 DRS
authority。cookie facts 本身不構成 authority。

成功只回 `204` 空 body，並提供：

```text
Authorization: Bearer <opaque-three-segment-bff-proof>
X-Laibe-Session-Expires-At: <RFC3339>
```

proof audience 固定為 `laibe:drs-session-bff`，有效時間大於 0 且不超過 60
秒；proof 只含 audience、時間、exact cookie digest 與 server authorization facts
digest，不含 Supabase／LINE／Google raw token，也不暴露 case、role、assignment
或 provider subject。proof codec mint 後，bootstrap 必須立即使用同一 codec
verify，核對 exact claims；無法驗證或 claims 不一致時回 sanitized `503`，不得回
Authorization／expiry。

BFF guard 必須同時驗證相同 cookie 與 proof，重驗 access session 與當下 DRS
authority；cookie-only、header-only、cross-cookie、expired 或 authority
已撤銷都拒絕。每個使用 guard 的 endpoint 必須在 server source 提供 mandatory
closed request contract，綁定 exact method、exact pathname、exact query fields
與 exact JSON body fields；沒有有效 contract 時 guard 建立即 fail
closed。每個允許欄位 都必須宣告 scalar type 與 route
validator，欄位名稱須唯一且有長度限制；缺少、重複、 未知或驗證失敗的 query／body
欄位，以及 array、object、nested payload，一律在 access session 與 authority
work 前以 sanitized `400` 拒絕。guard 對 `x-*` request headers 採 closed
allowlist，只保留明列的 transport／observability headers；其他 caller custom
`x-*`（包含 `x-case-id`、`x-selected-case` 與
`x-calendar-id`）一律在下游工作前拒絕。 允許的 transport header 不得作為 DRS
authority；`Authorization` 與 `Cookie` 只作為 credentials。

workspace-style contract 只允許 `POST`、該 route 的 exact pathname、無 query 與
exact `{}` JSON body。future events characterization contract 的 exact JSON body
只允許具 declared ISO instant string validator 的 `timeMin`／`timeMax`，query
同樣是 exact none； duplicate query key、錯誤字串格式或任何額外 key（不論是否叫
case、role、specialist、 assignment、calendar、provider
或其他名稱）都拒絕。安全邊界不依賴任何 authority-name blacklist；field-level
scalar／declared validator 在 guard 執行，跨欄位 語意與 route behavior
validation 仍由後續 endpoint logic 負責。

```text
SAME_COOKIE_WITHIN_TTL_REUSE=ALLOWED
```

這個 proof 不是 single-use，也不宣稱 replay prevention。同一 cookie 在 proof TTL
內可 重複使用；每次使用仍必須重新驗 access session、cookie binding 與當下
accepted DRS authority。cross-cookie、expired、malformed 或 revoked authority
仍拒絕。

## Future A0 memory-only seam

未來 A0 的 `resolveVerifiedDrsSession` 可用 mock seam 示範：以
`credentials: "same-origin"` fetch bootstrap，只讀 response `Authorization` 與
`X-Laibe-Session-Expires-At`，轉成記憶體內的
`{ accessToken, expiresAt }`；不得寫入 local/session storage、global、DOM、query
或 hash。

本輪 A0 source 未修改；direct existing endpoints remain incompatible，必須等後續
BFF route stage 才能接入 guard。此文件與測試不代表真實 endpoint、DB、Auth、RLS、
OAuth、deployment 或 launch 已完成：目前未部署、未連線真實 Supabase，也未做 live
call。

產品 UI 未變，外部使用者不會看到工程語。不含金流託管，不含老屋煉金術；範圍仍
符合萊比「裝修決策工具＋案件紀錄留痕系統」的權限與可追溯邊界。
