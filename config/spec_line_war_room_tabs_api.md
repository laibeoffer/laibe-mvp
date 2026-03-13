# LaiBE LIFF 戰情室五大分頁 API 介接與狀態管理 Spec (LIFF_War_Room_Tabs_API)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 6, Rule 9)
**目標模組**: LIFF 前端資料流、快取策略與跨系統連動機制 (LIFF SPA Data Flow & Caching)

---

## 1. API Endpoints 規劃 (RESTful Data Flow)

為了達成 LIFF 內切換分頁的「極致流暢 (Single Page Application 體驗)」，系統將各個維度的資料明確切割成不同的 Endpoint 進行取用：

- **Tab 2 (Live Cam): 現場監視與紀錄**
  - `GET /project/{id}/cameras` -> 回傳綁定的攝影機串流 URL 或定時快照。
  - `POST /project/{id}/camera/snapshot` -> 提供前台手動觸發伺服器端截圖，並存入該專案的雲端圖庫作為履約證據 (Evidence_Photos)。

- **Tab 3 (Progress): 進度甘特圖**
  - `GET /project/{id}/milestones` -> 回傳甘特圖的結構化資料與目前的 Checkbox 狀態（哪些工項已完成、哪些延遲）。

- **Tab 4 (Payment): 財務信託水庫**
  - `GET /project/{id}/escrow-status` -> 回傳第三方信託銀行的水位資訊，以及各期款項的安全狀態（例：`RELEASED`, `LOCKED`, `PENDING_OWNER_APPROVAL`）。

- **Tab 5 (Message Board): 指令與異常通報**
  - `GET /project/{id}/messages` -> 取得歷史意見留言紀錄。
  - `POST /project/{id}/messages` -> 業主提交新指示或瑕疵報修。
  - **[串接重點防線]**: 當這個 POST 發生，後端寫入 DB 後必須**同步觸發 LINE Push API** 給廠商（以及前述的廠商 Web Dashboard），確保廠商無法以「我沒看到」為由推諉漏接指示。

- **Tab 6 (AI Insights): 智能分析防禦**
  - `GET /project/{id}/ai-summary` -> 聚合過去 7 天的 Vision API 驗收結果，提供高階風險預警摘要。

---

## 2. 前端狀態快取 (Frontend State Caching & Performance)

**設計理念 (兼顧流暢與即時性 Rule 6)**：
- 業主在五大 Tab 之間反覆滑動檢視時，每次重新 Fetch 整個資料集不僅浪費資源，更會造成讀取的「閃爍與不適感」，讓系統顯得不可靠。

**技術實作要求 (Caching Strategy)**：
1. **狀態管理庫**:
   - 建議使用 `React Query`、`SWR` 或類似的前端狀態管理工具，接管所有的 API Fetch 行為。
2. **初次載入與 Cache**:
   - 在業主初次開啟 LIFF App（或是剛完成身份驗證）時，將進度 (Progress)、財務 (Payment)、以及 AI 分析 (Insights) 等「變動頻率較低」的靜態資料拉取並快取 (Cache) 於記憶體。
3. **輪詢與即時更新**:
   - 針對高度敏感即時的「留言板 (Message Board)」與「現場監視器 (Live Cam)快照」，採用特定的策略：
     - 使用 WebSocket 建立雙向通訊，當廠商回覆時能即刻推送到畫面上。
     - 若環境不允許，則退而求其次針對這幾個特定元件進行低干擾的「背景定時輪詢 (Background Polling)」，確保畫面上的互動回饋是最高即時性的。
   - 保障「滑動切換瞬間資料已就緒」的使用者體驗。
