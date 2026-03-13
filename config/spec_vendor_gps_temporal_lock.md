# LaiBE Vendor App 核心邏輯：GPS 驗證、時序鎖定與請款封裝 Spec (GPS_Validation_&_Temporal_Lock)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 4, Rule 10)
**目標模組**: 乙方日誌上傳防偽校驗與財務封裝引擎 (Vendor Integrity Core & Auto-Invoicing)

---

## 1. GPS 與時間防偽驗證 (EXIF/Metadata Geofencing)

**設計理念 (實證溯源與不信任硬體打卡 Rule 1, Rule 5)**：
- 先前的「打卡送出當下擷取 GPS」設計存在漏洞，廠商可以在家拍攝照片，然後到現場去點擊上傳。甚至使用假的虛擬定位軟體。
- 為了讓證據具有無可辯駁的法律效力，系統必須**解析照片本身的物理屬性 (EXIF Metadata)**。

**API 與驗證邏輯 (API: `POST /vendor/upload-photo`)**：
1. **EXIF Metadata 解析**:
   - 當照片傳至伺服器時，後端第一時間呼叫圖片處理庫 (如 Sharp, ExifTool)。
   - 強制提取 `GPSLatitude`, `GPSLongitude` 以及照片的絕對拍攝時間 `DateTimeOriginal`。
2. **位置比對 (Spatial Validation)**:
   - 系統將提取出的座標，與 `Project_Address` (需透過 Google Maps API 等轉換為中心經緯度) 進行比對。
   - 若距離超過允許的誤差半徑 (例如：500 公尺)，則**無情拒絕上傳**。
   - **回傳動作**: 以 HTTP 400 回傳錯誤代碼 `ERR_GEO_MISMATCH`，並提示前端使用者「照片座標與工地位置不符」。
3. **時序比對 (Temporal Validation)**:
   - 照片內嵌的拍攝時間 (`DateTimeOriginal`) 必須與該筆日誌宣稱的 `log_date` 吻合。
4. **現場實務支援性 (The Foreman Exception)**:
   - 這個硬核設計反而照顧了「工班代拍」的習慣：只要師傅用自己的手機在工地拍攝，然後用 LINE (原圖模式保留 EXIF) 傳給工頭。工頭人不在現場，依然可以上傳這些「附帶真實地理與時間元資料」的照片，這讓系統防偽卻不擾民。
   - 若無法解析出 EXIF 數據（被壓縮軟體洗掉），系統將視同未舉證，強制退回。

---

## 2. 日誌回溯鎖定機制 (The 48-Hour Temporal Lock)

**設計理念 (不可變的狀態 Rule 4, Rule 8)**：
- 廠商常常會累積一個禮拜的進度，再一次性憑記憶或假造資料把系統填滿。
- 我們不允許任何人「竄改歷史」。時間過了就是過了，這會給業主帶來極大的財政焦慮與不信任。

**防跳關驗證邏輯 (API: `POST /vendor/daily-logs`)**：
1. **Payload 擷取**: 接收日誌 Payload 中的目標屬性 `log_date` (日誌所屬日期)。
2. **時光機防禦計算**:
   - `days_diff = Current_System_Date - log_date` (基於伺服器絕對時間，而不是手機時間)。
3. **攔截與鎖定**:
   - `IF days_diff > 2`: 代表廠商意圖補交 48 小時以前的紀錄。
   - **動作**: 後端攔截請求，毫不通融地回傳 **HTTP 403 Forbidden**。
   - **系統回覆**: `「系統已鎖定。最多僅能補齊 48 小時內之施工日誌。」`
4. **前端連動 (UI Lock)**:
   - API 提供 `GET /vendor/log-status`，回傳歷史各日期的可編輯狀態。
   - 前端據此在「日曆」元件上繪製出視覺化的「鎖頭圖示 (Lock Icon)」。鎖住的日子就是 `Disabled`，徹底阻絕補寫的可能性。

---

## 3. 自動化請款包生成 (Invoice Package Assembler)

**設計理念 (資料驅動取代人工檢附 Rule 10)**：
- 傳統的請款中，廠商有極大的自由決定「我要上傳哪些漂亮的照片給業主看來請款」，這是一種隱匿風險。
- 系統將剝奪這種自由。一旦請求請款，由系統來發球、由系統來總結你到底做了多少。

**自動化聚合邏輯**:
1. **觸發源**: 當廠商在前端發起特定階段的請款流程（例如：「泥作進度 50% 請款」）。
2. **資料自動打撈 (Auto-Query)**:
   - 後端不再依賴廠商手動挑選檔案。
   - 根據該 `Milestone` 在排程上涵蓋的絕對日期範圍，後端自動 Query 出關聯區間內，所有通過 AI 與 GPS 驗證留存的 `Photos` 與 `Material_Proofs`。
3. **產出最終報表 (Report Generation)**:
   - 後端將上述資料，與甘特圖的進度資料合併。
   - 調用 PDF 圖表生成套件（或是由前述的日曆/甘特圖 Canvas 圖表匯出截圖）。
   - 伺服器端將這批資料無死角地組裝產生一張 `Progress_Comparison_Report.pdf`。
   - 此請款包將作為一個不可被廠商編輯的實體 (Immutable Snapshot)，直送給 PCM 與業主端審核。
