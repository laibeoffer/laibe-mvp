# LaiBE 乙方手機端資料採集與 AI 預審 API Spec (Vendor_LIFF_Data_Flow)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 6, Rule 10)
**目標模組**: 乙方資料輸入端點防偽與自動化指引 (Vendor Data Input Integrity & Guidance)

---

## 1. 地理位置與時間戳記防偽 (GPS & Timestamp Spoofing Prevention)

**設計理念 (不信任輸入源 Rule 1)**：
- 永遠假設廠商會提供舊照片充數，或是人不在現場卻「代打卡」。
- 系統必須從實體裝置層面 (Device Level) 建立防偽屏障。

**實作機制與 API 介接 (Geofencing)**：
1. **Frontend Call**: 當廠商在 LIFF 內點擊 `[📍 現場打卡]` 或啟動相機上傳時，前端強制調用手機原生的 API 獲取 GPS 座標與精確硬體時間。
2. **Backend Validation**:
   - 後端接收含有定位資料的 Payload 後，立刻查詢該專案設定的經緯度座標。
   - 進行幾何距離計算（如 Haversine formula），判斷是否落入合規的誤差半徑內（例如：方圓 200 公尺之內）。
3. **防禦判定 (Action)**:
   - 若超出範圍，系統仍**允許截留該筆上傳**，但資料庫強制寫入標記 `Location_Warning = TRUE`。
   - 此高風險標記將提供給 PCM 後台與業主檢視（或被 AI 代理人攔截），讓這筆不合規紀錄成為將來的糾紛證據。

---

## 2. AI 即時影像預審 (Vision AI Pre-check)

**設計理念 (即時回饋與降低溝通成本 Rule 6)**：
- 如果廠商花心力完成了日報上傳，卻在數小時或隔天被 AI 判定「品質過差需重拍」，這會造成極大的摩擦與反彈。
- 系統必須做到「立即糾正」，讓廠商離開現場前完成合格拍攝。

**實作架構 (Lightweight Pre-check Workflow)**：
1. **API Endpoint**: `POST /vendor/project/{id}/evidence/upload-precheck`
2. **Frontend 行為**:
   - 廠商從相簿選擇照片或拍攝完畢後（尚未正式按下送出日報前），前端立即非同步 (Asynchronous) 呼叫此端點發送圖片檔案。
3. **Backend 與 AI 處理**:
   - 後端輕量級調用 Vision AI 進行基礎的「防呆」檢查。
   - **檢查項目**: 是否過度模糊、曝光過度/不足、鏡頭遭遮擋、或拍攝到與工程無關之人物 (Faces/Irrelevant objects)。
4. **即時回應**:
   - 一小段時間內回傳檢查評分 `Score` 與具體的 `Warning_Message`（如：「照片過暗無法判讀，請開啟閃光燈重拍」）至前端介面。確保前端有機會即時警告使用者。

---

## 3. 動態必拍清單生成 (Dynamic Checklist Generation)

**設計理念 (防跳關與約束自由度 Rule 10, Rule 2)**：
- 廠商不能自由決定「我今天想拍什麼」。若任由其自由發揮，勢必會漏拍關鍵隱蔽工程。
- 系統必須強制收束使用者的行為路徑。

**API 與強制性介面設計 (Data-Driven UI)**：
1. **API Endpoint**: `GET /vendor/project/{id}/daily-tasks`
2. **邏輯生成 (Logic)**:
   - 後端必須根據 `Project_Schedule` 所指示的當前工項，結合《萊比 AI 驗收標準規範》（Laibe Verification Standards）。
   - **動態合成**: 日報表單不再是空白的照片上傳區，而是由系統「動態生成今日必須填滿的照片坑位」（例如：今日表定為水電工程，API 會自動生成兩格必拍清單：一個 `id=water_pipes`，一個 `id=electrical_box`）。
3. **前端防呆鎖定 (UI Lock - Rule 4)**:
   - 只要 API 回傳的「必拍清單」陣列中，有任何一格上傳槽 (Slot) 為空，前端最下方的 `[🚀 確認送出今日日報]` 核心按鈕必須處於**反灰 (Disabled/Locked) 狀態**。
   - 強制規範廠商必須走完系統設定的每一項基本查核與舉證，這才符合「系統是約束者」的最高原則。
