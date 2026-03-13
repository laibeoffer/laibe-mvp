# LaiBE PCM 後台強化：規則警示、RAG Copilot 與全面稽核 Spec (Rules_Engine_RAG_&_Full_Audit)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 6)
**目標模組**: 系統化主動防禦、AI 知識外腦輔助與滴水不漏之數位資產保護 (Proactive Defense, RAG Assistance & Data Integrity)

---

## 1. 規則引擎與警示觸發 (Rules Engine & Alerting)

**設計理念 (主動風險暴露 Rule 6)**：
- 危機往往隱藏在看似正常的數據中。不該依賴 PCM 去巡邏每一條對話，後端必須有能力「聞出」風險的氣味。

**實作機制與端點 (API: `POST /rules/evaluate`)**：
- **運行方式**: 由後端 Cron Job 或非同步 Task Queue (如 Celery) 定時排程呼叫。
- **偵測邏輯 (Heuristics)**:
  - **Rule A (業主高頻焦慮指標 Owner High Frequency)**: 統計過去 24 小時內，某 `Project_ID` 下，業主發送的 `Message_Count > 10`。這代表業主極度焦慮，有客訴升級的風險。
  - **Rule B (廠商慣犯預警 Vendor Repeat Offender)**: 統計某 `Vendor_ID` 在過去 30 天內，被 AI 自動攔截或真人 PCM 退件的 `Rejection_Count > 3`。代表此廠商品質不穩或具備惡意嘗試的傾向。
  - **Rule C (排程延宕紅線 Schedule Delay)**: 計算甘特圖的 `(Planned_Progress - Actual_Progress) / Total_Progress > 0.05`。
- **系統動作 (Action)**:
  - 一旦觸發上述任一條件，系統強制於 `Alerts` 資料表插入一筆高優先級紀錄。
  - 透過 WebSocket 推播，使 PCM 前端 Kanban 的儀表板自動跳出該專案的**紅色警示**。

---

## 2. AI Copilot 與 RAG 知識庫 (AI Copilot & Retrieval-Augmented Generation)

**設計理念 (武裝真人 PCM，降低出錯率)**：
- 真人專案管理師的法務知識與情緒控管能力參差不齊。系統必須提供一個「超級大腦」來輔助他們與甲乙雙方溝通。

**架構流 (API: `POST /ai/copilot/generate-response`)**：
1. **輸入攫取 (Input)**: 當 PCM 在三方通訊頁面準備回覆時，前端提取當前對話的 `Context_Window` (最近 10 則訊息與當下的糾紛點)。
2. **向量化與檢索 (Embed & Retrieval)**:
   - 系統呼叫 OpenClaw Agent，將上下文轉為向量 (Embedding)。
   - 進入預先建置的 **向量資料庫 (Vector DB)**（內含：LaiBE 施工規範文件、標準合約條款、過去高階勝訴的談判紀錄）。
3. **合成與生成 (Synthesis)**:
   - 取出最相關的知識片段 (Knowledge Chunks)，與對話上下文結合成強大的 Prompt。
   - 要求 LLM (例如 GPT-4o 或客製模型) 生成「於法有據、情緒穩定」的回覆。
4. **輸出抉擇 (Actionable Output)**:
   - API 退回 3-5 個不同風格（如：強硬法務型、溫和安撫型）的 `Suggested_Responses`。
   - 供真人 PCM 一鍵點擊採用。若 PCM 覺得寫得不好，也可以手動修改調整後再發送。

---

## 3. 全面稽核與調閱紀錄 (Full Audit Trail & Access Logs)

**設計理念 (資訊保安與防內鬼 Rule 1)**：
- 不只是「修改」資料要留底，就連「偷看、印出來」也必須留底，這是企業級系統（如銀行、醫療）的保安紅線。

**資料表設計 (Table: `Document_Access_Logs`)**：
- **觸發條件**: 系統內對於任何機敏文件（如合約 PDF、請款單、業主個資）的 `VIEW` (預覽), `PRINT` (列印), `EXPORT` (匯出) 動作，都必須強制寫入 Log。
- **寫入欄位**: `Document_ID`, `Operator_User_ID`, `Action_Type` (如 `EXPORT_PDF`), `Timestamp`, `IP_Address`。
- **前端連動**: 提供後台管理員專屬的「調閱紀錄面板」，其唯一資料來源即為此極難竄改的 Log 表。能明確抓出是誰在半夜違規下載了 50 份別人的合約。

---

## 4. AI 學習資料閉環 (The AI Learning Loop - Golden Dataset)

**設計理念 (資料飛輪效應)**：
- 為了讓 OpenClaw 越來越聰明，AI 絕對不能直接拿未經整理的 DB 資料去訓練（會學到廢話與人類的錯誤）。必須搭建「資料清洗與提純」的自動化通道。

**實作機制 (Golden Dataset Pipeline)**：
1. **高質量正循環 (High-Quality Interaction)**:
   - 當真人 PCM 使用了上述的 RAG Copilot 建議並直接發送，或是「手動修改了幾個字」再發送。系統背景判定這是一次成功的輔助，將此 `Context + Final_Response` 自動標記寫入 `Golden_Dataset`。
2. **困難邊界糾正 (Hard Example Mining)**:
   - 當真人 PCM 在審核頁面「推翻了」AI 對影像或進度的判斷。系統將這筆錯誤紀錄標記為 `Hard_Example` 存入。
3. **機器學習維運 (MLOps)**:
   - 後端的資料科學團隊或自動化排程，定期從這個 `Golden_Dataset` 提取乾淨無毒的頂級燃料。
   - 用以對 OpenClaw 進行持續性的微調 (Fine-tuning) 與 In-context Learning 測試。確保 LaiBE 的 AI 能擁有整個組織最高階 PCM 的平均智慧。
