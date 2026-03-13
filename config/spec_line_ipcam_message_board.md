# LaiBE LIFF 戰情室擴充：IPCam 串接與多角色留言板 Spec (LiveCam_&_Message_Board)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 6, Rule 9)
**目標模組**: 業主端工地遠端監控與異質系統通訊 (Remote Monitoring & Cross-System Messaging)

---

## 1. 現場監視器串流架構 (IPCam Streaming Architecture)

**設計目的 (即時回饋與具象化檢查 Rule 6)**：
- 業主除了看靜態的施工照片回報，也需要能夠即時察看現場的狀況。這不僅是「看進度」，更是對廠商的無形施工紀律約束。

**技術實作 (API & Frontend Rendering)**：
1. **API 設計**: `GET /project/{id}/cameras`
   - 回傳該工地所綁定的監視器清單與對應的串流網址 (例如: HLS / WebRTC / RTMP URL)。
2. **前端處理 (LIFF 內嵌)**: 
   - 在 LIFF 的某張水平卡片（例如「現場實況」卡）內嵌 Video Player。
3. **退場機制 (MVP Fallback)**:
   - **硬體與頻寬考量**：由於工地現場網路（如 4G 網卡）與平價攝影機（支援 RTSP/ONVIF 協議，如小米、Tapo）的限制，直接推流高畫質影片給多位業主可能導致嚴重的延遲甚至斷線。
   - **MVP 階段實作**：初期暫不強求順暢的 Live Video，而是實作為**「定時刷新（例如每 5 秒或 10 秒）的現場靜態快照 (Snapshot URI)」**。這既能滿足業主的監看需求，又不會癱瘓現場頻寬。

---

## 2. 意見留言板資料模型 (Message Board Data Model)

**設計理念 (責任歸屬與狀態化 Rule 9)**：
- 第一個系統防護網已經規定（在之前 Spec 中）：業主不應直接傳 LINE 給廠商施壓。
- 所有三方的意見與指令都必須被「結構化」且「永久留存」，不能只存在於容易被收回或洗版的 LINE 對話。

**資料表架構 (Data Model)**：
- **Table**: `Project_Messages` (或 `Defect_Feedbacks`，視後續 DBA 命名)。
- **重點欄位要求**:
  - `Sender_Role`: 枚舉型別 (Enum) -> `OWNER` (甲方業主), `VENDOR` (乙方廠商), `PCM_AGENT` (丙方/系統代理)。
  - `Content`: 留言的文字內容。
  - `Attachment_IDs`: 支援夾帶施工照片或上述 IPCam 的監視器「截圖」。
  - `Status`: 指示此事件的進度 -> `OPEN` (未解決/處理中), `RESOLVED` (已解決/待驗收)。
- **前端視覺約束 (UI Binding)**: 
   - 前端將嚴格依據 `Sender_Role` 欄位套用專屬的 UI 顏色：例如 Owner 的發言/區塊使用 `#AD5A5A`，廠商使用 `#4F9D9D`，以確保各方意見在視覺上清晰獨立。

---

## 3. 跨系統通知 (Cross-System Notifications)

**設計理念 (系統接管與全域同步 Rule 1, Rule 9)**：
- 業主在 LIFF 的動作，必須毫無時差地轉化為對廠商的實際指令與紀錄。

**聯動與推送邏輯 (Rule Trigger)**：
1. **觸發源**: 業主在 LIFF 的「意見留言板」送出了一則夾帶現場截圖的新留言 (`Sender_Role == OWNER`)。
2. **AI 橋樑 (未來擴充點)**: 
   - 觸發 Webhook 通知內部的 PCM 管理後台，並將內容預留拋給未來的 OpenClaw Agent API 介面進行分析。
3. **多端同步 Action**: 
   - **乙方儀表板 (Vendor Web)**：系統透過 WebSocket 或 Push API，自動將這則留言推播至乙方 (廠商) 的 Web 儀表板，並強制在廠商端亮起紅燈提示「⚠️ 收到業主新指示/缺失回報」。
   - **三方留存 (LINE Group)**：系統同時將這些留言匯總，推播至三方的 LINE 群組 (`Group_Channel`)，作為無法被單方面湮滅的雙重溝通紀錄。
