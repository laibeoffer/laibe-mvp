# LaiBE 監視器定時快照排程與影像日曆 API Spec (Automated_Snapshot_&_Calendar_API)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 5, Rule 6)
**目標模組**: 影像留存引擎與時序化檢視介面 (Image Retention Engine & Temporal View)

---

## 1. 定時快照引擎 (Automated Snapshot Worker)

**設計目的 (防呆留存與頻寬保護 Rule 6)**：
- 持續的高清串流會耗盡工地有限的行動網路（4G 網卡）頻寬。
- 透過背景的定時「快照 (Snapshot)」，既能不間斷地留下施工紀錄作為日後究責的溯源依據，又能確保系統穩定運作，避免業主開啟 APP 時讀取失敗的挫折感。

**系統架構與資料寫入 (Cron Job / Celery Worker)**：
- **執行規則**:
  - 設定僅在「工作日與施工時段區間」觸發（例：週一至週五，08:00 - 17:00），避免在非施工時段產生大量的無意義全黑或空景截圖。
  - 設定截取頻率（例：每 2 小時觸發一次）。
- **實作動作 (Action & Storage)**:
  - Worker 呼叫現場攝影機的 API (RTSP 截流 / ONVIF 通訊協定 / 雲端攝影機如 Tapo 的 API) 抓取單張畫面 (Snapshot)。
  - 將圖片編碼上傳至 Cloud Storage (如 AWS S3 / GCP GCS)。
  - 在資料庫建立 `Camera_Snapshots` 表格紀錄：`Project_ID`, 當下 `Date`, 精確 `Timestamp`, 以及對應的 `Image_URL`。

---

## 2. 日曆總覽與單日明細 API (Calendar & Detail Endpoints)

為了支撐前端（Stitch 生成的 UI）流暢的影像日曆檢視體驗，將時序資料分為兩個層次的 Endpoint：

**A. 月曆網格總覽 (Monthly Calendar Grid)**
- **Endpoint**: `GET /project/{id}/camera/calendar?month=2026-03`
- **Payload/目的**: 回傳該月份內所有「有快照資料」的日期集合。
- **UI 支撐**: 每一個有資料的日期，預設附加當天中午（12:00 或最接近）或當天第一張截圖的 URL，作為前端月曆格子的背景縮圖 (Thumbnail)，讓業主一眼看出「哪幾天確實有在施工」。

**B. 單一日期時間軸明細 (Daily Detail Timeline)**
- **Endpoint**: `GET /project/{id}/camera/snapshots?date=2026-03-15`
- **Payload/目的**: 回傳業主點擊該特定日期後，當日所有的截圖 URL 陣列，並確保資料庫在輸出時已嚴格依照 `Timestamp` 進行排序 (ASC/DESC)，以供前端渲染出滑動式的時間軸面板 (Timeline 面板)。

---

## 3. 留言板附件連動 (Payload Extension: Attachment Context)

**設計理念 (實證溯源與溝通精準度 Rule 5)**：
- 上一階段我們已經將留言綁定了 `Context_Tag`。在「現場影像日曆」這塊，業主的質疑必須更精確地綁定在「哪張圖片的哪一刻」。

**API 擴充要求**:
- **Endpoint擴充**: 原本的留言 API `POST /project/{id}/messages`。
- **參數擴充**: 需支援接收 `attachment_snapshot_id` 陣列（不限於人工上傳的照片，也包含系統抓取的快照 ID）。
- **防護效益**: 當 PCM 專員或未來的 OpenClaw AI 在後台看到業主留言「這裡管線怎麼怪怪的？」時，能因為這個關聯 ID，精確對位到業主當下觀看的「特定日期、特定分秒」的現場快照畫面，斷絕各說各話的資訊落差。
