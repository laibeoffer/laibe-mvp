# LaiBE 給 Antigravity 開發團隊的未來擴充宣告 (Future-proofing for OpenClaw PCM)

**版本**: v1.0
**目標受眾**: Antigravity 後端與架構開發團隊
**文件屬性**: Architecture Notice (架構預備聲明)

---

## 📢 核心指示 (Core Directive)

目前的「Rule-Based 狀態機與 LINE 按鈕決策」僅為 Phase 1 (MVP) 的過渡方案。未來系統的 PCM (專案營建管理) 核心大腦，將全面移交給 **OpenClaw (AI Agent 引擎)** 負責。

因此，請 Antigravity 團隊在進行當前架構設計時，務必嚴格防範「寫死 (Hardcode)」的問題，並遵守以下 **「AI Ready (為 AI 準備就緒)」** 的三大開發原則：

---

### 原則 1. 決策邏輯的解耦 (Decoupling the "Brain" from the "Body")

**要求**：
請勿將「判斷價格是否合理」、「決定下一步傳送什麼訊息」等智慧型業務邏輯，與底層的 LINE Messaging API 發送程式碼綁死在一起。

**實作做法 (Service Layer Isolation)**：
- 將目前的議價狀態機 (Negotiation State Machine) 獨立封裝成一個獨立的 Service Layer。
- 未來 OpenClaw 導入時，Antigravity 將退居為「手與腳 (Actuator)」。系統只需將 LINE 收集到的使用者文字或按鈕事件 (Event Payload) 透過標準介面拋給 OpenClaw API。
- 接著由 OpenClaw 的大腦回傳要執行的 Action 指令（例如：生成精準的回覆文案、決定同意或拒絕）。
- Antigravity 收到指令後，僅負責「去執行動作推播」與「資料庫正確寫入」，做到感知與行動徹底分離。

---

### 原則 2. 全對話與行為紀錄 (Comprehensive Event Sourcing & Logging)

**要求**：
OpenClaw 這種大型語言模型 (LLM) 代理人未來需要有「上下文 (Context)」才能像個高階談判專家一樣進行斡旋。如果沒有完整的過去對話與行為歷史，Agent 工作時會如同失憶症般無法連貫。

**實作做法 (Event Sourcing)**：
- 目前即便尚未串接 AI 對話，甲方與乙方在 Web 與 LINE 上的 **所有的動作都必須被紀錄**。
- 包括但不限於：「每一次按鈕點擊」、「每一次退回的理由選擇」、「每一次細項金額修改」，以及完整的「時間戳記 (Timestamp)」。
- 這些行為必須被結構化為日誌 (JSON Event Logs) 並妥善儲存歸檔。
- 當我們進行到 Phase 2 喚醒 OpenClaw 時，這些沉澱的 JSON 資料就是餵給它的基礎 Prompt Context 與後續進化的訓練數據。

---

### 原則 3. Webhook 路由的閘道器設計 (API Gateway Routing)

**要求**：
未來來自 LINE 的 Webhook 訊息來源將會有明顯分流：一部分是結構化的「系統指令 (Postback 按鈕)」，另一部分是未成結構的「自然語言對話 (純文字/語音)」。

**實作做法 (Smart Routing Gateway)**：
- 請在接收 LINE Webhook 的最前端入口處，實作一層聰明的 Gateway (路由閘道器) 邏輯。
- 當 Phase 2 啟動後，若 Gateway 判定這是一則「純文字交談」（無特定系統 Action 對應時），能直接將該則訊息 payload **轉發 (Forward)** 給 OpenClaw Agent。
- 由 OpenClaw 負責進行強大的自然語言理解 (NLU) 與意圖識別 (Intent Recognition)，解析出業主或廠商的話語意圖後，再將結構化結果（如：觸發特定的狀態更改）丟回給 LaiBE 核心系統處理。
