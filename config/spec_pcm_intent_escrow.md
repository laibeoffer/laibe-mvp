# LaiBE PCM AI 意圖轉譯與爭議金流控制 Spec (Intent_Translation_&_Weaponized_Escrow)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 9)
**目標模組**: 溝通降噪防護網與金融約束武器化 (Communication Sanitization & Financial Enforcement)

---

## 1. 人機協同的「意圖轉譯」API (Intent Translation Pipeline)

**設計理念 (消除人類情緒風險 Rule 1)**：
- 真人 PCM 在面對傲慢的廠商或焦慮的業主時，難免會帶有情緒。一句失言（如：「你們自己處理好」）可能成為日後法律上的把柄。
- 系統必須剝奪人類「直接發言」的權力，改為「意圖輸入 -> AI 轉譯 -> 審核發送」的過濾流程。

**架構流與端點介接**：
1. **意圖生成 (Generation API)**: `POST /pcm/chat/generate-options`
   - **前端 Payload**: `{ "project_id": 123, "human_intent": "警告廠商不用對的料就扣錢", "target_audience": "VENDOR" }`
   - **後端黑盒子 (Backend Action)**:
     - 系統接獲粗糙的人類意圖（如上述大白話）。
     - 調用前置的 RAG 知識庫（拉出該專案的建材規格與違約罰則條款）。
     - 將 RAG 與 `human_intent` 送入 OpenClaw (LLM)。
     - 強制 LLM 吐出 3 句「語氣嚴肅、不帶情緒、且具備合約法理基礎」的正式 Prompt 選項（如：_「經查，貴司目前使用的材料與合約附件 A 不符。請於 48 小時內更換，否則本專案管理方將依合約第七條暫扣本期款項。」_）。
2. **審核發送 (Execution API)**: `POST /pcm/chat/send-selected`
   - **前端 Payload**: `{ "project_id": 123, "selected_text_id": "opt_2", "operator_id": "PCM_01" }`
   - **後端動作 (Backend Action)**: 將選定且無毒的文字正式 Push 給甲/乙方端 (`Private_Channel` 或 `Group_Channel`)。
   - **稽核紀錄**: 於 `System_Audit_Logs` 同時記下雙重核驗：`「[PCM_01] 輸入了原意圖 A，最終採納發送了 [AI 生成選項 2]」`。如此確保所有官方溝通不僅精準無誤，且溯源清晰。

---

## 2. 金流武裝化的狀態機 (Weaponized Escrow State Machine)

**設計理念 (實體約束力勝過千言萬語 Rule 9)**：
- 在營建糾紛中，文字的約束力是薄弱的，唯一的真理是「錢」。
- 第三方信託 (Escrow) 系統不該只是一個存放資金的保險箱，它必須直接與「工作狀態」緊密連動，成為 PCM 手中最具殺傷力的制裁武器。

**資料層連動設計 (Schema Coupling)**：
- 在 `Project` 的核心資料庫中，必須將金流的 `Escrow_Status` 與工地的 `Work_Status` 進行強連動式 (Tight-coupling) 的狀態機設計。

**實質性觸發器 (Physical Triggers)**：
1. **Trigger A (因為業主未付款，乙方合法停工)**:
   - **情境**: 業主惡意拖欠某一期信託款，PCM 判定乙方有權停工。
   - **API**: PCM 調用 `POST /escrow/force-pause`。
   - **動作 (Action)**: 
     - 專案 `Work_Status` 瞬間變更為 `PAUSED_PENDING_OWNER_FUNDS`。
     - **金融防護**: 系統底層的排程器 (Cron Job) **自動停止計算**乙方的「工期延誤罰款 (Delay Penalty)」，直到系統偵測到甲方補齊款項，徹底保障廠商的權益。
2. **Trigger B (因為乙方違約，業主/PCM 資金凍結)**:
   - **情境**: 廠商使用了錯誤的材料、且拒絕修正，或是工程存在重大瑕疵。
   - **API**: PCM 調用 `POST /escrow/freeze-funds`。
   - **動作 (Action)**:
     - 專案 `Escrow_Status` 變更為 `DISPUTE_FROZEN`。
     - **實體阻斷 (Physical UI Block)**: 乙方端 App (`Vendor_LIFF`) 的「發起請款 / 送出發票」核心按鈕將被強制 **Disable 反灰**。
     - **明確警告**: 並在按鈕旁顯示：`「🚨 資金庫已被系統凍結：請先完成 [項目 X] 之缺失改善，方可解鎖本期信託款」`。

**總結效益**: 透過上述的機制，LaiBE 從一個「被動記錄的軟體」，變成一個有能力「直接斬斷資金流」來迫使雙方回到談判桌的**終極執法者**。
