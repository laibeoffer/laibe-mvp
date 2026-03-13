# LaiBE Context-Bound Messaging System Spec (上下文綁定留言系統)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 9)
**目標模組**: 頁面級別意見反饋與精準跨系統通報 (Page-Level Feedback & Broadcast)

---

## 1. 資料庫結構更新 (Context Tagging)

**設計目的 (精準收斂討論 Rule 9)**：
- 因應總覽留言板被拔除，改為在五大頁籤 (Tab) 內各自配置相關的留言區。
- 為了讓每個主題（如：進度、款項）的討論不再互相干擾，所有新生成的對話紀錄必須要加上強制標籤。

**資料表變更 (`Project_Messages` / `Defect_Feedbacks`)**:
- **新增必填欄位**: `Context_Tag`
- **枚舉值 (Enum) 對應 5 大 Tab**:
  1. `SITE_STATUS` (戰情首頁與現場報告)
  2. `LIVE_CAM` (監視器畫面與快照指令)
  3. `SCHEDULE` (工程進度與甘特圖)
  4. `PAYMENT` (各期款項繳驗紀錄)
  5. `PCM_REPORT` (AI 與驗收報告指引)

---

## 2. API 路由與查詢過濾 (Routing & Filtering)

**系統規範 (System Binding)**：
前端與後端溝通時，不允許出現「無所屬類別」的訊息。系統將強制過濾與歸類，保障介面的純粹性。

- **發送留言端點 (Create Message)**
  - Endpoint: `POST /project/{id}/messages`
  - Payload 約束: 所有的 POST Payload 必須包含 `context_tag` 與前端使用者當前停留的 Tab 一致。例如，若身處「款項記錄」，則夾帶 `"context_tag": "PAYMENT"`。

- **讀取留言端點 (Fetch Messages)**
  - Endpoint: `GET /project/{id}/messages?context_tag={tab_name}`
  - 過濾邏輯: 當業主在特定 Tab 點擊（或展開）「歷史留言討論區」時，前端送出 Query 參數（如 `?context_tag=PAYMENT`）。後端只回傳該標籤的對話紀錄，避免畫面雜亂無章。

---

## 3. 三方廣播機制與接管準備 (Tri-party Broadcasting)

**設計目的 (跨系統絕對同步與 AI 接管 Rule 1)**：
- 業主的發言即便被歸類在各個子分頁，但只要送出，這筆「指令/疑問」在全系統中的強制力不能因此被削弱。必須保證訊息能第一時間送達廠商與系統端。

**系統動作 (Webhook & Actions)**：
- **觸發條件**: 無論 `Context_Tag` 是什麼，只要 `Sender_Role == OWNER` 發佈了新留言，伺服器必須執行以下三大廣播。
- **Action A: 乙方 (廠商) 通報系統**
  - 使用 WebSocket 觸發廠商端的 Web 儀表板。
  - **精準導流**: 系統不會只是籠統警告「您有新訊息」，而是根據 `Context_Tag`，直接在廠商端對應的模組（例如：財務請款區）亮起小紅點通知，指引廠商至精確位置查閱。
- **Action B: 雙頻留存 (LINE 群組推播)**
  - 系統將文字重新包裝為一則客觀且具備指示性的 Flex Message 卡片，推播至三方的 LINE 群組 (`Group_Channel`) 留下正式痕跡。
  - 卡片範本：`「⚠️ [萊比數位足跡] 業主針對【工程款項 (PAYMENT)】提出指示：『尾款的部分，我想先確認廢棄物清運後再撥款。』，請廠商儘速至系統回覆處理。」`
- **Action C: 準備交接 (AI PCM Hooks)**
  - 將這筆帶著 Context 屬性的 Payload，儲存至 Event Logs 並送往 PCM 管理後台，作為未來移交給 OpenClaw 驅動 NLU (自然語言理解) 時，最完美的意圖脈絡判斷依據。
