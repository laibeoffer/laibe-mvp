# LaiBE LIFF 水平卡片儀表板與 AI 反饋迴圈 Spec (LIFF_Horizontal_Dashboard_&_AI_Feedback_Loop)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 5, Rule 9, Rule 10)
**目標模組**: 業主端 LIFF 介面與異常反饋接管 (Owner LIFF Interface & AI Feedback Management)

---

## 1. LIFF 前端框架 (Frontend Framework)

**設計目的 (防跳關與狀態明確 Rule 9, Rule 10)**：
- 捨棄傳統的「垂直無盡滾動 (Infinite Scroll)」頁面，此類介面會給予使用者過多的瀏覽自由度，且失去邏輯分段的「階段感」。
- 系統採用 `Swiper.js` 或類似的行動端滑動套件，實作嚴格分段的「水平卡片組 (Horizontal Card Deck)」。每張卡片代表一個獨立的資訊節點。

**互動約束與導航 (Navigation Binding)**：
- 頂部的 5 個 Icon（導航列）必須與下方的卡片滑動位置**絕對同步連動**。
- 使用者永遠能透過切換頂部 Icon 明確知道「我現在看的是什麼維度的資料（例如: 財務、品質、時程）」，不允許使用者在介面中迷失方向 (Rule 9)。

---

## 2. 互動式平面圖整合 (Interactive Floor Plan)

**設計理念 (資料溯源與具象化檢查 Rule 5)**：
- 業主對於無結構的報表或文字敘述可能無法完全理解。系統必須將施工日報與點位數據「具象化」對應到實體圖上，做到所見即所得且數字可回溯。

**技術實作 (The Hotspot Data Model)**：
1. **Data Model**: 在資料庫建立 `Project_Floor_Plan_Hotspots` 表格，記錄每個施工區域（`Region_ID`, e.g., "Kitchen", "Living Room"）在 Master Plan 總圖上的絕對座標 `(X, Y)`。
2. **API 介接**:
   - `GET /project/{id}/daily-hotspots`
   - 後端運算並只回傳「當日有 `Construction_Log`」的所有區域座標點陣列。
3. **前端渲染與回溯**: 
   - 前端依據上述座標，在平面的 Base Layer 上渲染出可點擊的熱點圖層 (Hotspot Layer)。
   - 任何當天的工程進展都必須能從圖面熱點「點擊進入」，並回溯看到該點位的實體施工照片與規格要求。

---

## 3. AI PCM 即時反饋介接 (AI Feedback Loop)

**設計目的 (系統接管與情緒隔離 Rule 1)**：
- 業主不是專家。當業主發現可能的問題時，系統**絕對禁止**業主直接傳訊息給廠商施壓或起衝突（這會極大增加專案不穩定性）。
- 系統作為「約束者與保護者」，必須攔截並接管這些反饋與情緒。

**邏輯流 (Logic Flow)**：
1. **Trigger (觸發)**: 當業主在熱點對應的「缺失改善反饋卡片」中，輸入文字並點擊 `[傳送給 AI PCM]` (注意：按鈕的文字設計是在向 AI PCM 求救，而不是傳給廠商)。
2. **API 調用**: 
   - 前端呼叫 API `POST /ai-agent/owner-feedback`
   - Payload 包含 `project_id`, `user_id`, 與 `message_content`。
3. **Action (未來介接點預留 - Phase 2)**: 
   - Antigravity 團隊需要將此訊息 payload 以 JSON 格式結構化存入 Event Logs（對應先前的 Future-Proofing 宣告）。
   - 接著將 Payload 轉發給 OpenClaw AI Agent，由 Agent 的 NLU（自然語言理解）判讀語意，並決定後續談判步驟。
4. **Action (當前 MVP 防護回應 - Phase 1)**: 
   - Antigravity 暫時在系統內回傳一個展現出「強烈接管態度」的標準罐頭訊息：
     `「🤖 收到您的反饋！LaiBE PCM 團隊已介入處理，並要求廠商說明，我們將於 24 小時內向您回報結果。」`
   - 系統後台自動發送一則高優先級的 LINE 通知給 LaiBE 真人 PCM 經理，建立人工處理的防線。
