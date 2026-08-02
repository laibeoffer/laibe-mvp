# PCM Full-flow Visual Port Design

## Objective

在不改變 PCM 契約角色、3.5% 費率、權限與留痕邊界的前提下，將四個 Human 指定頁面轉譯到目前 PCM source package：保留母版的版型、色彩、按鈕形狀、工作台密度與儀表板結構，只替換不符合現行 PCM 流程的角色、路由、禁詞與不可信瀏覽器狀態。v0.3 仍是待法務審閱草稿；禁詞修正後必須重新固定內容摘要值。

## Exact visual sources

| Target | Visual source | SHA-256 | Mode |
|---|---|---|---|
| `pcm_standalone/service_contract/` | `site/ai_pcm_045_contract_support_candidate/code.html` | `12717906fadbf214ac6fbbb92032282eaed5ac613a9c37ae9d10c25dfc21bb3f` | Redesign · Preserve |
| `client_awarding_dashboard/` | `site/owner_workspace/code.html#setting` | `5b24d5993e63eccc94400955c1d09829859c3cf95658e1b11f7294c08997caba` | Redesign · Preserve |
| `pcm_standalone/vendor_workspace/` | `site/pro_workspace/code.html?tab=active&case=c1` | `4ae2d88e21f3727c65a9f82e94bf68b55e78715702dd21b62da49736cc63a780` | Redesign · Preserve |
| `pcm_standalone/contract_signing/` | `site/pcm_contract_generator/code.html` | `05aedc5fb4ac9bc5bc775c35dcbf1802c58e4b501f3e3b19b920905582bfeb5c` | Redesign · Preserve |

來源只作唯讀視覺母版。不得搬入 `localStorage`、demo 身分、假案件、付款控制、舊共用 header runtime 或失效路由。

## Design Read

```yaml
artifact: PCM 公開契約與甲乙方案件工作台
audience: 甲方、受邀乙方與案件內 PCM 服務參與者
visual-language: LaiBE 黑底橘色工具介面、紙本文件盒與高密度治理工作台
mode: redesign-preserve
visual-variance: 1
motion-intensity: 2
information-density: 8
asset-dependence: 8
brand-fidelity: 10
```

## Design decisions

- Narrative：服務契約用於閱讀與前提確認；甲乙方頁是案件作業台；工程契約頁是版本與簽署前提工作台。
- Viewing distance：桌機一公尺內高密度作業；手機維持可讀、可達與 44px 控制。
- Temperature：深色、克制、工具感；契約以橘色文件盒與 A4 紙面形成唯一強烈焦點。
- Capacity：桌機多欄、平板雙欄、手機單欄；狀態、責任人與下一步必須先出現。
- Color：`#07090a`／`#11151a`、`#f0ebe0`、`#f16001`／`#ff7a2f`、PCM 次要提示 `#9b9bd8`。
- Type：`Noto Sans TC`、`Microsoft JhengHei`、`PingFang TC`；不新增依賴。
- Spacing：4px 基準；8／12／16／24／32。
- Shape：header 與 tabs 用 pill；儀表板 12–16px；A4 紙面 2–4px。
- Motion：140–180ms；`prefers-reduced-motion` 停用位移。
- Logo：只用 `assets/logo/laibe_offer.svg`。

## Page contracts

### PCM 服務契約

- 完整移植橘色文件盒、左右紙張、主次按鈕、治理說明與閱讀節奏。
- 內容仍由完整 v0.3 草稿 snapshot render；費率只顯示 3.5%。兩處舊流程用語與一處字串誤命中改成現行 PCM 用語後，重新固定草稿內容摘要值。
- 正式版本雜湊、甲方身分、自然人服務方快照與 writer readiness 未齊時，簽署 disabled。
- 保留列印；不匯入舊 preview/sign 路由與 browser storage。

### 甲方工作台

- 完整移植 header、四步旅程、橘色 active step、案件標題帶、pill tabs、儀表板與側欄密度。
- Tabs 改為 `文件準備／案件總覽／設計送審／施工與驗收`。
- 保留七種 fail-closed 狀態、訊息 receipt 驗證與零案件資料預設。
- 每個模組仍回答角色、契約狀態、案件狀態、責任人、下一步與最近紀錄。

### 乙方工作台

- 完整移植黑底 header、四個工作 tabs、案件側欄、摘要列、四張首屏重點卡、日曆／訊息雙欄。
- Tabs 改為 `受邀案件／文件準備／合作工作台／執行中工作台`。
- 未有可信 session、actor-bound membership、case、agreement tuple 時只顯示零資料 access panel；封存案件亦須先驗證同案件摘要才可顯示。
- 不從 query 或 storage 鑄造案件；正式內容只接受 trusted adapter。

### 甲乙方契約簽訂

- 完整移植案件摘要、七步斜向進度軌、step cards、契約三層檢視、簽署區與事件留痕區。
- 流程：`確認合作條件 → 帶入案件資料 → 匯入預定進度 → 整理驗收節點 → 預覽契約與附件 → 甲乙雙方簽署 → 契約成立版本鎖定`。
- 不建立付款節點、金流控制、第三方簽署權或 PCM 最終決定。
- 缺 canonical contract hash、甲方、自然人乙方、同案件／契約／party／actor／版本雙方接受或 durable writer readiness 任一項，簽署 disabled。
- 本候選只有 UI source gate；即使純 evaluator 判定前提齊備，正式簽署按鈕仍維持 disabled，直到 A6 runtime action 與 A5 durable writer 另經驗收。待補或不可信狀態不得渲染 adapter 傳入的案件內容。

## Protected contracts

- 不修改 A5／R0 contracts、Supabase、Auth、migration、runtime route、package 或 lockfile。
- UI source pass 不等於 Auth、writer、runtime 或 production acceptance。
- 頁面不得出現舊 marketplace 流程字詞。
- 外部頁不得出現 DB、API、mock、debug、source、Git、runtime 等工程狀態詞。
- 不加入金流託管、支付託管、代收代付、撥款授權或老屋投資語意。
- 不新增 `href="#"`、404、假成功、假身分、假案件、假下載或假正式簽署。

## Acceptance layers

1. UI source gate：只證明四頁視覺、內容、斷鏈與 fail-closed source。
2. Auth/runtime gate：A6 另接 trusted adapter；unknown 一律 fail closed。
3. Durable writer gate：A5 contract admission 不等於 DB／Storage writer acceptance。
4. Production gate：需 A0 最終 admission、真實環境與部署證據。
