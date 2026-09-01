# DRS Identity + Google + LINE W1

## 本輪定位

本輪是 **local source/test candidate**。它只建立 DRS 身分與案件授權的
server-only seam：已由 Supabase Auth 驗證的使用者，必須經過有效的
auth-user-to-specialist binding、`ACTIVE` DRS 專員、明確的 DRS case 到
`casework.cases` mapping，以及 server-selected、目前有效且尚未到 termination
生效時間的案件 assignment，才能取得唯讀 DRS 工作台 grant。

LINE login is an upstream session producer, not authority。LINE
user、profile、group、 訊息或 transport 值都不會被用來推導
specialist、assignment 或 case 權限；本輪也不 修改任何 LINE login／Bot source。

`casework.cases` and `casework.case_members` are immutable prerequisites。本
migration 只檢查 `casework.cases` 是否存在並以外鍵連結，完全不建立、修改或把 DRS
投影成 owner／pro membership。The highest reviewer and global cross-case
authority are out of scope；不得以普通 specialist 或 wildcard assignment 模擬。

## Authority chain

```text
verified Supabase authenticated_user_id
→ integration.drs_auth_specialist_bindings (active, time-bounded, revocable)
→ public.drs_specialists.authority_state = ACTIVE
→ server-owned selected_assignment_id
→ public.drs_case_specialist_assignments (active interval)
→ no effective assignment termination at checked time
→ integration.drs_case_identity_bindings (active explicit mapping)
→ casework.cases.case_status = active
→ read-only DRS workspace grant
```

`auth.uid()` 只代表已驗證的 `authenticated_user_id`，不等於
`specialist_id`。Email、 JWT user metadata、request role、query/body
case、browser storage 與 LINE identity 一律 不是 authority。Binding 必須具備
server-owned `selected_assignment_id`；缺少 selection 時 resolver 回
`CASE_SELECTION_REQUIRED`，不選第一筆、最近一筆或 caller 傳入案件。 Binding 與
mapping 的 `valid_from`／`valid_until` 都必須通過 PostgreSQL `isfinite`；
`infinity` 與 `-infinity` 不可作為 authority window。完整 private authority
facts 的有效窗 是 binding、mapping、assignment 與 future termination
的交集；future termination 在到期前 仍有效，但會縮短 effective `valid_until`。

Additive migration 以同一簽名取代 predecessor
`drs_private.is_current_actor_active_case_specialist(uuid)`，所以既有
cases、links、 assignments、terminations、audit、work-item 與 transition SELECT
policies 會改用 binding／mapping／selected assignment semantics。Owner policy 的
`owner_id = auth.uid()` arm 保留；只有 DRS specialist 的
`auth.uid() = specialist_id` 捷徑被移除。`drs_specialists_self_select` 也改由
active binding 判斷。

## Database objects and privilege boundary

| Object                                                     | 用途                                                    | Client／service direct table access                           |
| ---------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| `integration.drs_auth_specialist_bindings`                 | Auth user 到 DRS specialist 與 server selection         | 無；RLS + FORCE RLS + deny policy                             |
| `integration.drs_case_identity_bindings`                   | DRS case 到 casework case 的明確一對一 mapping          | 無；RLS + FORCE RLS + deny policy                             |
| `integration.drs_identity_authority_resolve_locked_v1`     | 鎖定並重驗完整 authority chain                          | `public`／`anon`／`authenticated`／`service_role` 全數 revoke |
| `drs_private.is_current_actor_active_case_specialist`      | 既有 DRS Core RLS 的同簽名 binding cutover              | 只有 authenticated policy evaluation 可 execute               |
| `drs_private.is_current_actor_active_specialist`           | Specialist self-select 的 binding helper                | 只有 authenticated policy evaluation 可 execute               |
| `public.drs_workspace_grant_v1`                            | 唯一 service-only minimal read grant RPC                | 只有 `service_role` 可 execute；無 table DML grant            |
| `integration.google_calendar_drs_authorize_transaction_v1` | 既有 Google callback private hook 的真實 locked wrapper | 所有 application／service roles 全數 revoke                   |

所有 `SECURITY DEFINER` functions 都由 `postgres` 持有、`search_path = ''`，且
relation 名稱完整 schema qualification。Resolver 依固定順序鎖定 auth
user、binding、specialist、 assignment、case mapping、case 與 termination
state；不在 transaction lock 內呼叫 Google、LINE 或其他外部服務。

## HTTP contract

`drs-workspace-grant`：

- `OPTIONS`：必須有 allowlisted Origin、requested method `POST`，且 requested
  headers 只能是 `authorization`、`content-type`、`apikey`；無 Origin 或
  unexpected method/header 皆拒絕。
- `POST`：URL 不得有 query，`Content-Type` 必須是 JSON，body 必須是 exact `{}`。
- 無 Origin 的一般 server/proxy POST 可以進入驗證；所有 response branch 都帶
  `Vary: Origin`。
- Supabase platform JWT verification 保持預設開啟；handler 仍以 bearer token 向
  Auth user endpoint 驗證身分。缺少／錯誤 JWT 回 sanitized 401。
- runtime dependency 缺少、malformed 或 RPC `CONTEXT_UNAVAILABLE` 回 sanitized
  503； authority denial 回 sanitized 403。
- Service RPC 成功時只回 `authorized`、`state`、`case_id`、`case_status`、
  `access_mode`；完整 specialist／assignment／subject／lock facts 只存在 private
  resolver 與 Calendar hook。
- 成功 payload 只包含 mapped case id、active status、唯讀 workspace access，以及
  下一個 actor/action；不回傳 auth user、specialist、assignment、authorization
  subject、 LINE、credential、provider、token、email 或 raw database payload。

## Non-secret local test procedure

在本 worktree 執行：

```powershell
deno test --allow-read --no-check --reporter=tap supabase/tests/drs_identity_google_line_w1.test.mjs
node --test tests/drs-identity-google-line-source.test.mjs
node --test supabase/tests/google_calendar_drs_account_contract.test.mjs supabase/tests/case_member_google_calendar_contract.test.mjs
node --test tests/drs-core-contract.test.mjs
deno test --allow-read --no-check --reporter=tap tests/line_bot/drs_runtime_adapter_w2.test.ts tests/line_bot/drs_group_ai_human_w1.test.ts
deno check supabase/functions/_shared/drs-auth/contracts.ts supabase/functions/_shared/drs-auth/drs-specialist-authority.ts supabase/functions/drs-workspace-grant/index.ts
deno fmt --check supabase/functions/_shared/drs-auth/contracts.ts supabase/functions/_shared/drs-auth/drs-specialist-authority.ts supabase/functions/drs-workspace-grant/index.ts supabase/tests/drs_identity_google_line_w1.test.mjs
deno lint supabase/functions/_shared/drs-auth/contracts.ts supabase/functions/_shared/drs-auth/drs-specialist-authority.ts supabase/functions/drs-workspace-grant/index.ts
git diff --check
```

測試全部使用 fake injected authority port、mock fetch 與 source
inspection；不需要 secret、 網路、Supabase project、Google account 或 LINE
account。Migration 僅作 additive source contract，沒有 apply。

## Claim boundary

These static migration/source tests **do not prove real Supabase Auth, RLS,
migration apply, Google OAuth, LINE login, deployment, or production**. They
also do not prove local full-stack integration。真實 auth schema、casework
prerequisites、Postgres compile／ RLS、secret、Edge deployment 與 upstream login
resolver 都仍是後續獨立 admission gate。

本輪沒有 live Supabase／Google／LINE call、database
service、server、browser、remote migration、stage、commit、push、PR、merge 或
deploy。
