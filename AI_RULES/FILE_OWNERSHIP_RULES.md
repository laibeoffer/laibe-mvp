# FILE_OWNERSHIP_RULES

本文件定義萊比專案不同區域的檔案責任、修改邊界與高風險區。

## 1. Purpose

Codex 必須先判斷檔案角色，再決定是否可修改。

不得因為檔案名稱相似、畫面相似或任務便利，就擅自修改、刪除、移動或重構檔案。

若不確定某檔案是否可修改，先檢查任務是否明確指定，再檢查 `AGENTS.md`，再檢查 `AI_RULES`，再檢查 handoff。仍不確定時，不修改，並回報需要確認。

## 2. Root Files

根目錄文件通常屬於全域規則或專案設定，包含：

- `AGENTS.md`
- `NEXT_CODEX_HANDOFF.md`
- `config.toml`
- `.gitignore`
- `README` 類文件

規則：

- `AGENTS.md` 是最高入口，不得刪除。
- `NEXT_CODEX_HANDOFF.md` 是交接文件，不得省略重要改動。
- config / git 設定不可任意修改。
- 不可為單一功能任務改動全域設定。
- 若根目錄沒有 `NEXT_CODEX_HANDOFF.md`，但存在 `docs/NEXT_CODEX_HANDOFF.md`，應沿用既有 handoff，不要另建第二份。

## 3. AI_RULES

`AI_RULES/` 用於存放 AI / Codex 工作規則。

允許：

- 新增規則文件。
- 整理規則。
- 修正衝突。
- 補充審查標準。

禁止：

- 把功能程式碼放進 `AI_RULES/`。
- 把臨時任務內容混入長期規則。
- 無限制堆疊重複規則。
- 讓規則互相衝突。

## 4. src

`src/` 通常是萊比網站與 MVP 功能頁主要區域。

規則：

- 修改 `src` 前必須確認任務範圍。
- 不可大規模重構。
- 不可無授權搬移頁面。
- 不可製造斷裂路徑。
- 修改 CTA / routing 後必須檢查流程。
- 任務若明確禁止修改 `src`，不得碰任何 `src` 內功能檔。

## 5. plancraft

`plancraft/` 是高度敏感區域。

規則：

- 未經使用者明確授權，不可修改 plancraft 原始碼。
- 若任務只要求嵌入或參考，不可改 plancraft 核心。
- 若需要修改，必須先列出影響範圍。
- 不可將 plancraft 變成不可追蹤的混合版本。

## 6. docs

`docs/` 用於規格、說明、流程、設計文件。

規則：

- 文件應清楚標示用途。
- 不可把過期決策偽裝成最新規則。
- 若文件已失效，應標記 deprecated，而非直接刪除。
- 重要規則應回寫到 `AGENTS.md` 或 `AI_RULES`。
- budget-system 相關文件應放在 `docs/budget/`，並保持 AI 不直接定價、deterministic engine 產價、每列可追溯的原則。

## 7. assets

`assets/` 通常包含圖片、SVG、GLB、品牌素材等。

規則：

- 不可刪除素材。
- 不可任意重新命名大量素材。
- 新增素材需使用可理解命名。
- 不可用外部未授權素材替換既有素材。

## 8. components / layout / app

`components/`、`layout/`、`app/` 若存在，通常代表共用 UI 或頁面結構。

規則：

- 修改前必須確認是否會影響多頁。
- 不可為單頁需求破壞全站元件。
- 不可未授權重構共用元件。
- 除非使用者明確指定，`app/`、`components/`、`layout/` 不得被當成 active architecture。

## 9. Python Generator Files

Python generator files 例如：

- `generate_budget_preview.py`
- `generate_client_doc_preview.py`
- `generate_payment.py`
- `generate_tender_notice.py`

規則：

- 不可未授權修改輸出格式。
- 不可破壞既有文件生成流程。
- 修改後必須說明影響哪些文件。
- generator-owned HTML 通常應先改 generator，再經使用者明確同意後 regenerate。

## 10. High-Risk Areas

以下屬於高風險區：

- secrets：`.env`、`.env.*`、`auth.json`、API key、token、credential。
- payment / escrow / listing fee / webhook。
- `plancraft/` 原始碼。
- 核心 routing。
- header architecture。
- budget-system 資料模型與 deterministic pricing rules。
- generator-owned outputs。
- `src/laibe_guardrail.js`、`src/plancraft_bridge.js` 等橋接或 guardrail 檔案。

修改高風險區前必須取得使用者明確授權。

## 本次整合說明

- 本文件已依本輪要求補齊根目錄文件、AI_RULES、src、plancraft、docs、assets、components / layout / app、Python generator files 與高風險區的檔案所有權規則。
- 已保留既有規則中的 static MVP、portal prototype、generator、plancraft 與 high-risk area 邊界。
- 既有內容有編碼損壞，本次以使用者提供的新規則為優先整理為可讀中文。
