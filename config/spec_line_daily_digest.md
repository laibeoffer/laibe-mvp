# LaiBE 履約期 LINE 推播引擎與 LIFF 健康度總覽 Spec (Daily_Digest_&_Health_LIFF)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 6, Rule 7)
**目標模組**: 履約期監控、自動化日報推播與異常管理 (Construction Monitoring & Daily Digest)

---

## 1. 每日工地日報聚合引擎 (Daily Digest Aggregator)

**設計目的 (即時回饋與資訊透明 Rule 6)**：
- 業主不需要、也不應該無時無刻登入系統盯著工地看，這會引發不必要的焦慮與微觀管理 (Micromanagement)。
- 系統透過「每日定時摘要 (Daily Digest)」的方式，將混亂的工地現場數據，轉化為結構化且易於閱讀的進度報告。

**執行邏輯 (Cron Job & Aggregation)**：
1. **排程觸發 (Cron Job)**: 每天設定於固定時間（例如 18:00），系統自動執行巡檢腳本。
2. **資料撈取與 AI 判讀檢查**:
   - 撈取特定 `Project_ID` 下，當日 (`Date == Today`) 廠商上傳的所有 `Construction_Logs` 與 `Evidence_Photos`。
   - 檢查這些照片的 `AI_Status`，確認是否所有影像皆已全數經過系統 Vision API 的判讀與標籤分類。
3. **健康度運算 (Schedule Health)**:
   - 系統比對「實際進度」與「合約預定進度 (Gantt Chart)」，計算整體的 `Schedule_Health`（如：正常、微幅延遲、嚴重落後）。
4. **樣板封裝與推播 (Push API)**:
   - 將上述數據填入專屬的 LINE Flex Message Carousel（多頁輪播卡片）樣板。
   - 透過 Push API 單向發送給 `Owner_LINE_ID` 的 `Private_Channel`，確保只有業主本人能收到這份報告。

---

## 2. LIFF 頁面安全與參數傳遞 (LIFF Security & Context)

**設計目的 (權限隔離與防止外洩)**：
- 工地現場照片與進度屬於高度機敏資料。推播卡片上的連結不能是任何人點擊都能觀看的公開網頁。

**技術實作 (Security Protocol)**：
1. **URL Parameter 綁定**:
   - Flex Message 卡片上 `[查看詳細日報]` 按鈕的連結，必須是帶有特定專案 Payload 的 LIFF URL。
   - 格式範例: `https://liff.line.me/{liff_id}?project_id=12345`
2. **前端身分驗證 (Authentication via LIFF)**:
   - 當業主在 LINE 中點擊並開啟 LIFF 時，前端必須強制調用 `liff.getProfile()` 取得當前操作者的 `userId`。
   - 前端將此 `userId` 與 URL 中的 `project_id` 一併發送至後端 API `/auth/verify-liff-access`。
   - 後端確認該 LINE ID 確實為該專案的 Owner 後，才簽發 Token 並允許渲染畫面；否則直接阻擋並顯示無權限，確保工地隱私不外洩。

---

## 3. 異常攔截與升級 (Exception Escalation)

**設計理念 (系統是約束者與解決者 Rule 1, Rule 7)**：
- 若工地發生嚴重異常，直接把「恐怖的紅燈」推給業主，只會製造恐慌並引發業主與廠商之間的直接衝突。
- 系統（作為 PCM 代理人）的價值在於「發現問題並已經著手解決」，而不是單純的傳聲筒。

**邏輯流 (Logic Flow)**：
1. **觸發條件 (Rule)**: 在聚合當日日報時，發現包含任何 `AI_Status == FAILED`（例如：材料與合約不符）或 `CRITICAL_DELAY`（嚴重落後）的項目。
2. **系統攔截與狀態變更 (Action)**:
   - 系統**不應**直接按照原定樣板將紅燈推播給業主。
   - 系統自動將該專案狀態變更為 `PCM_INTERVENTION_REQUIRED`（專案管理介入中）。
3. **語氣轉換推播 (Tone Adjustment)**:
   - 推播給業主的 Flex Message 需轉換為「處變不驚且已接管」的語氣。
   - **推播文案範例**: `「⚠️ 今日工地發現 1 項缺失，LaiBE PCM 團隊（或 AI 代理）已介入並要求廠商提出改善計畫。請老闆放心，我們將為您嚴格把關，請留意明日的後續追蹤報告。」`
   - 這展現了平台「預防火災」與「承擔責任」的巨大價值，避免業主在資訊不對稱的恐慌下做出錯誤決策。
