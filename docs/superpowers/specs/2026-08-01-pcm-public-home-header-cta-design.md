# PCM 公開首頁 Header 與 CTA 視覺統一設計

日期：2026-08-01  
範圍：`pcm_standalone/public_home` 的 Header、導覽與 CTA  
主要使用者：尚未簽約、正在了解 PCM 服務與文件準備方式的甲方

## 目標

把 PCM 公開首頁的 Header、導覽與 CTA 統一為目前 LaiBE 首頁的 A2 可讀版視覺語言，同時保留原有內容、路由、Logo、資訊架構、主要版面與既有功能。頁面仍須讓甲方立即知道目前可先查看申請準備、閱讀完整流程，並由橘色主 CTA 前往下一步。

## 已確認方案

採用 CSS-first 的局部套用方案：保留現有 Header DOM、三個頁內導覽連結、申請入口與所有 `href`；只在必要的既有選擇器上調整視覺，導覽圖示使用 CSS mask 的內嵌 SVG，不新增套件或外部圖示資源。

本頁目前沒有下拉選單。為遵守「不得改資訊架構」，不把三個既有導覽收進新下拉，也不新增選單項目。因此下拉面板、外部點擊關閉與選擇後關閉在本頁不適用；其餘鍵盤、焦點與觸控規格仍完整落實。

## 方案比較

1. **CSS-first 局部套用（採用）**：不改 DOM 與路由，以 pseudo-element SVG 圖示、Header 容器 padding 計算與既有 CTA class 完成。變更最小，最能保證功能與資訊架構不漂移。
2. **加入內層 Header wrapper**：結構更接近 A2 原始碼，但需要改動 HTML；目前 CSS 可達到同等視覺，沒有必要增加結構風險。
3. **將導覽改成下拉選單**：可直接使用 A2 menu 行為，但會改變既有資訊架構與操作路徑，因此排除。

## Header

- `position: sticky; top: 0`，桌機高度 86px，`z-index: 90`。
- 全寬玻璃底：`rgba(3, 5, 7, 0.82)`，搭配 `blur(22px) saturate(130%)`、1px 淡白分隔線與柔和深陰影。
- 內容視覺寬度等同 `min(1160px, calc(100% - 40px))`，以 Header 的左右 padding 計算置中，不新增 wrapper。
- 保留 `laibe_offer.svg` 與 `AI PCM` 標記；Logo 桌機 118px、手機 94px。
- 三個既有導覽與申請入口均為玻璃膠囊。頁內導覽前加入 19px 的 CSS-mask SVG 圖示；圖示為裝飾性，不加入多餘可讀文字。
- hover、focus、active 只改邊框、玻璃色與最多 1px 位移，不放大、不彈跳、不加霓虹。

## CTA 層級

- `.button--primary`：52px、橘色 A2 漸層、白字、淡內高光與柔和陰影，只代表開始或前往下一步。
- `.button--quiet`：深色玻璃、白字、淡白邊框；Header 的查看型入口維持次要層級，不與 Hero 主 CTA 競爭。
- `.hero__actions .text-link`：保留原文與 `href`，改為 52px 青色輔助查看膠囊，明確代表「查看完整流程」。
- 其他段落內 `.button` 維持至少 44px、14px 左右的既有文字尺度，主次色仍由既有 modifier 決定。
- `disabled`、`aria-disabled="true"`、`[disabled]` 使用降低透明度與禁止游標；loading 由 `aria-busy="true"` 鎖定 pointer events，避免重複操作。

## 響應式

- 981px 以上：86px 單列 Header，導覽膠囊靠右。
- 980px 以下：Header 允許換行，保留 20px 邊距；導覽可換行但不得溢出。
- 620px 以下：Logo 94px、導覽 38px／12px；Header 內容維持 12px 邊距，導覽均可收縮但文字不截斷。
- Hero 主 CTA 與查看 CTA 皆為 100% 寬且至少 52px；現有主要版面與區塊順序不變。

## 互動與無障礙

- 保留所有既有 `href`、`data-route` 與事件綁定。
- 所有 anchor/button 使用清楚 `:focus-visible`；焦點不依賴 hover。
- 所有導覽與 CTA 觸控高度至少 44px；手機導覽規格標稱 38px 時，透過垂直 hit area／Header 排版確保實際可操作高度不低於 44px。
- `prefers-reduced-motion: reduce` 沿用既有全站規則，取消位移型動畫。
- 不加入下拉選單，因此無新增鍵盤選單狀態或 JavaScript。

## 預定檔案範圍

- `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css`
- `tests/pcm-public-home.test.mjs`
- `docs/superpowers/specs/2026-08-01-pcm-public-home-header-cta-design.md`
- 後續實作計畫文件

`code.html`、`app.js`、文案、路由與其他頁面區塊預設不修改；只有測試證明 CSS 無法在不改 IA 的前提完成需求時，才回到設計閘門重新確認。

## 驗收

- 靜態測試鎖定 A2 Header token、Logo 尺寸、導覽膠囊、CTA 高度／色彩、focus、disabled、loading、reduced-motion 與 980／620 斷點。
- 瀏覽器至少驗收 1440、1082、980、620、390 寬度；記錄 screenshot、computed style、水平 overflow、碰撞及 console。
- 驗收需證明三個頁內 `href`、申請入口、Hero 主 CTA 與流程 CTA 均未改變。
- 最終只建立本輪檔案的 bounded local commit，交由 A0 決定是否納入 closeout；不得宣稱已整合或正式完成。
