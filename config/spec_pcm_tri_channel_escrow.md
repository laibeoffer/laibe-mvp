# LaiBE [Spec Update] PCM 後台通訊路由重構與金流狀態機 (Tri-Channel_&_Weaponized_Escrow)

**版本**: v1.1 (升級自前版 Intent & Escrow)
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 9, Rule 4)
**目標模組**: 絕對隔離的三軌通訊與實體武裝金流 (Isolated Tri-Channel Routing & Weaponized Escrow)

---

## 1. 三軌獨立通訊路由 (Tri-Channel WebSocket Routing)

**設計理念 (資訊隔離與零信任 Rule 1)**：
- 過去將所有專案訊息混載在一起推送，一旦發生越權或串測 (Cross-talk)，乙方的報價機密可能會被業主看到，這會導致徹頭徹尾的災難。
- 必須在後端資料庫 (`Project_Messages`) 與 API 層面，實體拆分出三條絕對獨立的訊息軌道。

**架構邏輯 (WebSocket Separation)**：
- **`Channel_A` (Owner_Private)**: 僅供「業主 (Owner)」與「PCM/AI」雙向可見的安全通道。用來安撫業主情緒與討論預算底線。
- **`Channel_B` (Vendor_Private)**: 僅供「廠商 (Vendor)」與「PCM/AI」雙向可見。用來警告廠商、討論成本與扣款。
- **`Channel_C` (Tri_Party_Public)**: 甲、乙、PCM 三方皆可見的公共告不板，供正式合約發布與重大進度宣達。
- **前端訂閱**: 當 PCM 在後台「頁面 3（三方通訊）」開啟專案時，前端會同時 subscribe 這三個獨立的 WebSockets。
- **後端防壁**: 後端 API 在接收到推送要求時，必須嚴格檢驗接收者的 Role 與 Connection ID，確保發往 `Channel_A` 的 Payload 絕不流向 `Channel_B` 的 Socket，從底層杜絕錯頻。

---

## 2. 人機接管狀態鎖 (AI / Human Override Mutex Lock)

**設計理念 (強制狀態同步 Rule 9)**：
- 如果真人在處理客訴，AI 同時又跑出來插嘴自動回覆，不僅會精神分裂，更會激怒業主。
- 系統必須具備明確且具排他性 (Mutex) 的接管鎖。

**邏輯與 API 實作**:
- **資料庫擴充**: `Project` 表單新增 `PCM_Control_Mode` 狀態欄位（預設值為 `AI_AUTO`）。
- **觸發切換**: PCM 在後台介面撥動「真人介入」的實體開關，調用 `POST /pcm/project/{id}/toggle-mode`。
- **後端制動 (Backend Action)**: 
  - 狀態秒切換為 `HUMAN_OVERRIDE`。
  - 後端的 OpenClaw Middleware 與 Event Router 必須監聽此狀態。一旦為 `Human`，系統徹底**靜默 (Mute)** 該專案的所有自動回覆邏輯與排程推播。
  - 唯有當 PCM 處理完畢，切換回 `AI_AUTO` 時，AI 才會重新上線接管。

---

## 3. 意圖轉譯發送流程 (Intent-to-Statement Pipeline)

**設計理念 (廢棄人類直言，全面轉譯 Rule 4)**：
- 廢除原本高風險的原始直接傳送 API `POST /messages/send`。所有的 PCM 發言，必須被強制封裝、潤飾與溯源。

**兩階段發送架構 (Two-Phase Dispatch)**：
- **Step 1 (意圖生成):** `POST /pcm/chat/generate-options`
  - PCM 輸入具有情緒或粗糙的「口語意圖 (Intent)」。
  - 後端串接 RAG 取出法規與合約，交由 LLM 洗成 3 句冰冷、合規、具備法理基礎的官方聲明。
- **Step 2 (靶向發送):** `POST /pcm/chat/send-official`
  - 接收 PCM 按下選定的最終語意 (e.g., `opt_1`)。
  - **精確瞄準**: 必須帶入 `target_channel` 參數（決定發佈至 `Channel_A`, `B`, 或 `C`）。
  - 將轉換結果寫入 DB 並推播，同時於 `System_Audit_Logs` 留下「意圖 -> 轉譯」的對仗軌跡。

---

## 4. [新增] 武器化金流狀態機 (Weaponized Escrow API)

**設計理念 (金流即真理，實體剝奪操作權 RuIe 10)**：
- 在「頁面 5：金流託管面板」中，PCM 的權力不再只是被動的觀看數字，而是具備「終止時間」與「凍結財產」的上帝權限。

**強制性 API Endpoint 設計**:
1. **強制暫停工期 (Owner Default / 業主欠款)**
   - **API**: `POST /escrow/project/{id}/force-pause-schedule`
   - **邏輯**: 若甲方（業主）惡意拖欠工程款，PCM 在金流面板啟動此 API。
   - **連動**: `Project_Schedule` 內的計時器立即凍結，免除廠商背負無辜的「延遲完工罰款 (Delay Penalty)」。

2. **凍結託管資金 (Vendor Default / 廠商違約)**
   - **API**: `POST /escrow/project/{id}/freeze-funds`
   - **邏輯**: 若乙方（廠商）施工嚴重違規且拒絕改善。
   - **連動**: 專案的 `Escrow_Status` 變更為 `FROZEN`。
   - **實體懲罰**: 在此冰凍狀態下，乙方 App 端（Vendor LIFF）的「發起請款」按鈕將被寫死反灰。任何意圖強打發起請款 API 的行為，後端都會無條件回傳 `403 Forbidden`。直到廠商把缺失改完，PCM 再次解凍為止。
