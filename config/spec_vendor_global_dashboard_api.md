# LaiBE 乙方 LIFF 啟動路由與跨案數據聚合 Spec (Vendor_Global_Dashboard_API)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 9)
**目標模組**: 乙方全局儀表板與路由狀態管理 (Vendor Global Action Center & State Routing)

---

## 1. 跨案待辦聚合器 (Global Action Center API)

**設計理念 (主動式風險暴露 Rule 1)**：
- 廠商可能有 3 到 5 個案子同時在跑，不能期待廠商每天乖乖點進去每一個案子檢查有沒有漏代辦事項。
- 登入 LIFF 的第一眼，必須是「系統幫他總結的緊急事項 (Action Center)」，將所有問題攤在陽光下。

**API 與聚合邏輯 (Endpoint: `GET /vendor/global/action-items`)**：
- **掃描範圍**: 後端需掃描所有關聯到該 `Vendor_ID` 的 `Project_ID`。
- **篩選條件 (Filter)**:
  1. **退件區**: 撈出所有 `Status == REJECTED` 的日誌或業主提出的缺失單 (Defect_Feedbacks)。
  2. **警告區**: 撈出所有 `Days_Since_Last_Log >= 2` 的專案（此專案已超過 48 小時未回報，即將被違約黃牌警告）。
  3. **可請款區**: 撈出所有 Milestone `Status == READY_TO_INVOICE` 的期款節點，提示廠商可以一鍵產生請款包。
- **強制排序 (Severity Sorting)**:
  - 核心邏輯：**報憂不報喜**。退件與停權警告的順位必須大於「可以請款」的通知。強迫廠商在領錢之前，先面對並解決眼前的施工缺失。

---

## 2. 專案列表與健康度快取 (Projects Overview API)

**設計理念 (資料分層與效能 Rule 9)**：
- 提供廠商一個全局視角，但在首頁不浪費頻寬展開不必要的細結。

**API 結構 (Endpoint: `GET /vendor/global/projects`)**：
- **Payload Response**: 
  - 回傳一個精簡版的 JSON 陣列。
  - 對應的屬性包含：`Project_Name`, `Cover_Image_URL` (封面圖), 當前進行中的 `Current_Milestone`, 以及整體進度百分比 `Overall_Progress_Pct`。
- **行動驅動設計 (Action-driven flag)**:
  - 回傳一個關鍵的布林值 `has_submitted_today: false`。
  - 此值直接映射到 UI 上的「未打卡紅點」，用最強烈的視覺暗示驅動廠商每日點擊進入完成日報。

---

## 3. 狀態管理與路由切換 (Frontend Routing & State Management)

**前端架構設計 (React/Vue)**：
為了在 LIFF 中實現「簡易 ERP」的單頁應用 SPA 流暢感，必須建構清晰的組件層級與全域狀態：

**路由樹 (Routing Tree)**:
```text
VendorApp (Root Layout & Auth Guard)
 └── GlobalDashboard (跨案聚合頁面 /global/*)
      └── ActionCenter, ProjectList Components
 └── ProjectDetail (單一專案深潛區 /project/:id/*)
      └── Calendar (影像日誌月曆)
      └── Invoice (請款收納包)
      └── Docs (合約與圖說)
      └── Defects (缺失留言板)
```

**狀態傳遞 (Context Injection)**:
- 當使用者在 `Global Dashboard` 點選某個專案卡片時。
- **Context/Redux Action**: 前端必須將選中的 `Project_ID` 與專案基礎資訊寫入全域狀態樹 (Global Store)。
- **路由跳轉 (Router Push)**: 接著觸發路由切換至 `/project/{id}`。
- **防呆效益**: 這種設計確保了廠商進入內部 4 大分頁（日曆、請款等）時，所有後續的 API 呼叫 (e.g., `GET /vendor/project/{id}/daily-tasks`) 皆能直接從 Global Store 提取乾淨正確的 `Project_ID`，避免 URL Query 解析錯誤或資料串測 (Cross-talk) 的嚴重資安風險。
