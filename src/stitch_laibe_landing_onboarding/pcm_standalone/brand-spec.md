# LaiBE AI PCM Standalone Brand Specification

## Design Read

```yaml
artifact: 真人 PCM 案件審查工作台
audience: 受邀處理案件的 PCM 審查人員
visual-language: 克制的深色案件治理介面
mode: Extension
visual-variance: 3
motion-intensity: 2
information-density: 8
asset-dependence: 2
brand-fidelity: 10
```

這是既有 LaiBE 產品語彙的獨立入口延伸，不是重新設計全站。介面優先支援案件掃描、文件判讀、責任交接與留痕；動態只用於操作回饋。

## Positioning

- Narrative role：案件作業入口；首頁先回答有哪些待辦，案件頁再回答依據與下一步。
- Viewing distance：以 1 公尺內的桌機作業為主，也必須能在手機完成閱讀與補件紀錄。
- Visual temperature：冷靜、可信、具責任感，不使用行銷式大標與裝飾動畫。
- Capacity check：桌機採主證據區加右側行動欄；手機改為單欄，行動欄排在案件摘要之後。

## Design Decisions

- Anchor：custom，直接延伸 LaiBE 現有管理介面。
- Color：背景 `#0a0c0f`、主文字 `#f4f1ea`、次文字 `#9aa3ad`、主要行動 `#ff8a2b`、強調 `#eb581e`；風險與狀態只使用既有 amber、red、cyan、green。
- Typography：`Noto Sans TC`、`Microsoft JhengHei`、`PingFang TC`，資料欄位以 tabular numbers 排齊。
- Spacing：4px 基準，主要節奏為 8 / 12 / 16 / 24 / 32。
- Radius：主要容器 14px、內容群組 12px、控制元件 10px、狀態標記 999px。
- Shadow：僅主要浮層使用 `0 24px 60px rgba(0,0,0,.38)`。
- Motion：140–180ms 狀態回饋；使用者偏好減少動態時停用位移與過場。
- Signature：以「案件責任接力帶」同時呈現案件階段、球在誰手上與下一位處理者，讓責任移轉成為視覺主軸。

## Brand Assets

- Logo：`assets/logo/laibe_offer.svg`
- Standalone relative path：`../../../assets/logo/laibe_offer.svg`
- 不重繪、不替換、不以文字方塊代替。

## Protected Product Contracts

- 所有外部文字採台灣繁體中文產品語言。
- 一個案件列只提供一個主要行動。
- PCM 紫色只標示登入身分，不用作主要按鈕。
- PCM 是數位第三方書面審查與履約程序管理，不是監工、驗屋或現場品質保證人。
- PCM 對書面規則、文件核對、程序、期限與留痕負責。
- 不將人工審查表達為最終裁決、正式驗收、現場品質判斷、工程款到期或付款授權。
- 「付款程序可進行」只表示書面程序狀態；不代收、託管或撥付工程款。
- 不以瀏覽器暫存資料或匿名需求草稿作案件正式來源。
- 現行治理權威為 `docs/governance/PCM_POSITIONING_CONTRACT_RESPONSIBILITY_PILOT.md`。

## PCM Public Home Extension

- Logo: `../../../../assets/logo/laibe_offer.svg`
- Public role: owner first; vendor joins only after owner-Laibe contract and exact procedure assent
- Public primary CTA: `註冊並上傳文件`
- PCM is described as a service role but has no public route, login, registration or role selector
- Pilot label: `獨立試營運` with market and institutional validation only
- Hero signature: owner upload → basic review → owner-Laibe contract → vendor assent → formal governance
- Breakpoints: 1000px and 680px
- Motion: 180–220ms interaction feedback with reduced-motion support

## PCM Owner Registration Redesign — Preserve

- Visual sources: `site/register_owner/code.html` for owner semantics and `site/register_vendor/code.html` for the approved LaiBE registration composition.
- Real logo path from `owner_start/code.html`: `../../../../assets/logo/laibe_offer.svg`.
- Core palette: `#06080a`, `#f7f7f2`, `#ff8a2b`, `#eb581e`, and `#6cc6e8`.
- Desktop shell: maximum width `1080px`; the registration card stays between `380px` and `440px` and uses a `20px` radius.
- Responsive breakpoints: collapse to one column at `880px`; compact navigation and form spacing again at `680px`.
- Public registration is owner-only. The contractor is invited from inside an owner case and has no public PCM registration selector.
- The right card has two sequential phases: owner account registration first, then the two required PDF uploads in the same card.
- Do not reuse `site/shared/laibe-header.js` directly because its relative destinations are hard-coded for the original LaiBE route depth; keep the same visual language while linking only to valid PCM destinations.
