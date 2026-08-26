# DRS Google Calendar API W1（本機候選）

## 範圍與界線

這一輪只提供 DRS 專用的唯讀 Calendar backend source／test candidate：

- `drs-google-calendar-grant`
- `drs-google-calendar-oauth-start`
- `drs-google-calendar-oauth-callback`
- `drs-google-calendar-revoke`
- `drs-google-calendar-events-read`
- server-only `DrsSpecialistAuthorizationStrategy` 與 DRS 專用 RPC contract

Google provider 回傳與持久化的 scope 必須恰好各一份 `openid` 與 `calendar.readonly`；缺少、重複或多出任何 scope 都會在 account lookup／event provider call 前 fail closed。沒有 event write endpoint。這一輪沒有修改 Specialist Workspace UI、LINE Bot transport 或登入流程，也沒有連線真實 Google、Supabase 或 LINE。

目前 A14 的真實 `session -> specialist_id -> active assignment -> server-selected case` resolver 尚未交付。`integration.drs_specialist_calendar_authority_v1` 因此刻意維持 private fail-closed stub；預設 runtime 會回覆 `DRS_AUTHORIZATION_UNAVAILABLE` 或拒絕 authority。只有本機測試以 injected fake authority／mock transport 驗證 handler contract。

## Authority contract

成功 authority facts 必須全部存在且精確相符：

- `authenticated_user_id`
- `specialist_id`
- `assignment_id`
- `selected_case_id`
- `account_role = drs`
- `authorization_subject`
- `auth_binding_status = active`
- `specialist_status = active`
- `assignment_status = active`
- `valid_from <= now < valid_until`
- `terminated_at = null`
- callback transaction 的 `lock_status = locked`

不得將 `auth.uid()` 當成 `specialist_id`，也不得使用 email、LINE profile／ID、`user_metadata`、client role、raw `case_id`、storage 或 request body 推導權限。沒有 server-owned selected case，或存在多 assignment 卻無法唯一選定時，固定 fail closed。OAuth pending state、binding 與 authorization transaction 都綁定 exact `assignment_id`。

## HTTP contract

| Endpoint | Method | Exact input | `verify_jwt` source contract |
|---|---|---|---|
| grant | POST | `{}` | `true` |
| oauth-start | POST | `{}` | `true` |
| oauth-callback | GET | 只有 `code`、`state` | `false` |
| revoke | POST | `{}` | `true` |
| events-read | POST | 只有 `timeMin`、`timeMax` | `true` |

POST grant、oauth-start、revoke 不接受任何 query parameter。`timeMin`／`timeMax` 必須是 RFC3339、`timeMin < timeMax`，區間不得超過 31 天。

`supabase/config.toml` 明確設定 callback `verify_jwt=false`，其餘四個 DRS functions `verify_jwt=true`。Callback 自行以 digest-only state、TTL、PKCE S256、atomic single-use claim、callback authority revalidation 與 AES-GCM envelope 完成驗證。這些都只是 source/config contract，不代表已 serve、deploy 或套用到任何 Supabase project。

API CORS 使用 `DRS_ALLOWED_ORIGINS` 逗號分隔的 exact-origin allowlist。允許的跨來源請求只反射該 exact `Origin`；所有會因 `Origin` 改變行為的 normal／preflight response（包括未核准、缺少 `Origin` 與額外 header 被拒）都回傳 `Vary: Origin`，且不使用 wildcard 或 credentials。Preflight 只允許 `POST` 與 `authorization, content-type`。未設定／未核准的跨來源 origin 固定在 authority 查詢前拒絕；同來源與沒有 `Origin` 的 server/proxy normal flow 維持可用。此候選不包含任何 production host 或 secret。

Grant 成功回傳 transport 接受的 `READY` nested grant；events 成功回傳 `READY` case／window／events；revoke 成功回傳 `REVOKED`。所有 public response 都是 allowlist projection，不包含 access／refresh token、credential、Google subject、provider error、provider ID、email、attendees、description、raw payload 或 `nextPageToken`。Google event 沒有可用 summary 時使用中性標題「未命名行程」，不回傳空標題。

## Replay、revoke 與事件讀取

- Callback 在 provider token exchange **之前**呼叫 `drs_google_calendar_claim_callback_v1`，以 `FOR UPDATE` + conditional update 原子 claim。相同 state 並行 callback 只能產生一次 provider exchange、一次 binding commit、一次 audit。
- Callback commit 再次驗證 locked assignment authority，並以 state digest 的 unique audit key 保證單次留痕。
- Revoke 先重新驗證 exact assignment，再只撤銷該 assignment binding；不撤銷可能被其他 assignment 共用的 credential。重送已撤銷 binding 會回覆相同結果，但不再 write／audit。
- Events calendar ID 只能來自 server binding。Provider query 固定 `singleEvents=true`、`orderBy=startTime`、`timeZone=Asia/Taipei`、`maxResults=250`。
- Provider 若回傳 `nextPageToken`，本輪回覆 `GOOGLE_CALENDAR_WINDOW_TOO_LARGE`，不外露 token。
- Provider fetch 後、回傳前會重新驗證同一 assignment；若已終止或失效，已抓取的 event bytes 直接丟棄並回覆 403。
- Event response 只保留 `title`、`startsAt`、`endsAt`、`allDay`，加上必要的 case／window state。Provider item 只有在日期是實際存在的 `YYYY-MM-DD`，或 timestamp 是有效 RFC3339 且小數秒最多三位、offset 合法，並且 `endsAt > startsAt` 時才會進入 public events；單筆不合法 event 會被安全丟棄，不會讓 `200 READY` payload 違反 transport date contract。
- Shared OAuth state table 不新增要求所有角色都必須先寫入 `claimed_at` 的全域 constraint；owner／pro 既有 `consumed_at`-only commit 保持相容。DRS 的 claim-before-exchange 與 single-use invariant 只在 DRS claim／commit RPC 的鎖定條件與 conditional update 內強制。
- DRS callback commit 在 SQL 與 handler 兩層都要求 granted scope array cardinality 恰為 2，且 `openid` 與 `calendar.readonly` 各恰好一份；缺少、重複或多出 token 都 fail closed。
- Migration 對既有 DRS binding／OAuth state 若缺少 `assignment_id` 仍會以 `DRS_GOOGLE_CALENDAR_ASSIGNMENT_BACKFILL_REQUIRED` 停止；本候選沒有捏造或自動套用 backfill。

## Non-secret 本機驗證

在本 worktree 執行；不需要 secrets，也不會呼叫真實 Google／Supabase／LINE：

```powershell
node --no-warnings --test tests/drs-calendar-api-source.test.mjs supabase/tests/drs_google_calendar_api_w1.test.mjs
node --no-warnings --test supabase/tests/case_member_google_calendar_contract.test.mjs supabase/tests/google_calendar_drs_account_contract.test.mjs
deno fmt --check supabase/functions/_shared/google-calendar/drs-specialist-authorization.ts supabase/functions/_shared/google-calendar/google-oauth-adapter.ts supabase/functions/drs-google-calendar-events-read/index.ts supabase/functions/drs-google-calendar-grant/index.ts supabase/functions/drs-google-calendar-oauth-callback/index.ts supabase/functions/drs-google-calendar-oauth-start/index.ts supabase/functions/drs-google-calendar-revoke/index.ts supabase/tests/drs_google_calendar_api_w1.test.mjs tests/drs-calendar-api-source.test.mjs
deno lint supabase/functions/_shared/google-calendar/drs-specialist-authorization.ts supabase/functions/_shared/google-calendar/google-oauth-adapter.ts supabase/functions/drs-google-calendar-events-read/index.ts supabase/functions/drs-google-calendar-grant/index.ts supabase/functions/drs-google-calendar-oauth-callback/index.ts supabase/functions/drs-google-calendar-oauth-start/index.ts supabase/functions/drs-google-calendar-revoke/index.ts supabase/tests/drs_google_calendar_api_w1.test.mjs tests/drs-calendar-api-source.test.mjs
deno check supabase/functions/_shared/google-calendar/drs-specialist-authorization.ts supabase/functions/_shared/google-calendar/google-oauth-adapter.ts supabase/functions/drs-google-calendar-events-read/index.ts supabase/functions/drs-google-calendar-grant/index.ts supabase/functions/drs-google-calendar-oauth-callback/index.ts supabase/functions/drs-google-calendar-oauth-start/index.ts supabase/functions/drs-google-calendar-revoke/index.ts
git diff --check
```

Frozen convergence 5/5 必須在其 immutable source worktree 另外執行，不得在 successor candidate 合併成已知會失敗的 40/42 指令：

```powershell
Set-Location C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-t3-calendar-convergence-20260821
node --no-warnings --test tests/drs-t3-calendar-source-convergence.test.mjs
```

測試中的 `fetch` 是記憶體 mock transport；RPC response 也是 fake facts。並行 callback 的 exchange／commit／audit 次數是同一測試程序內的 injected counters，不是資料庫 concurrency 證據。這台驗證環境有 Supabase CLI 2.109.1，但沒有 Docker 或 `psql`，因此 `LOCAL_POSTGRES_APPLY=BLOCKED_DOCKER_AND_PSQL_UNAVAILABLE`；Migration 只做 predecessor + candidate source/static regression，本輪未 apply local 或 remote database。

## 後續 gate

本候選不證明 real LINE login、Supabase Auth、RLS、真實 OAuth、Google account、migration apply、Edge Function config deployment、deploy 或 production。下一階段必須由 A3 先獨立核對本 candidate；在 A3 裁決前不得進入 Workspace UI integration、canonical runtime、deploy 或 real OAuth。

既有 UI transport 的 5/5 契約測試只在其唯讀 worktree 另外執行；本輪不修改 Specialist Workspace 的 `code.html`、`styles.css`、`app.js` 或 transport source，也不以跨 worktree 測試宣稱 UI runtime integration。

Git 交付方式固定為 Keep as-is；`COMMIT=NO`，不 stage、不 push、不開 PR、不 merge。
