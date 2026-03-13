# LaiBE LIFF Tab 1: 工地概況資料聚合器 Spec (Site_Overview_Aggregator)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 5, Rule 9)
**目標模組**: 戰情室首頁資料聚合與時間綁定反饋 (Aggregated Analytics & Time-Bound Messaging)

---

## 1. 專屬聚合 API (Aggregation API Endpoint)

**設計目的 (降低複雜度與提升讀取體驗)**：
- 「工地概況」作為業主打開 LIFF 的首頁，需要從進度、日報、PCM 報告、財務等分立的資料表中抽取最新狀態。
- 若讓前端發送多次請求組合資料，將導致漫長載入與閃爍。後端必須實作單一入口的**BFF (Backend for Frontend)** 聚合端點。

**Endpoint**: `GET /project/{id}/daily-overview?date=today`

---

## 2. 資料聚合邏輯 (Data Assembly Logic)

後端在收到該 Endpoint 請求後，需並行 (Concurrent) 查詢以下資料表並組裝為單一 JSON 回傳：

- **`current_work_item` (專案時程)**:
  - 來源: `Project_Schedule`
  - 邏輯: 找出 `date` 參數所對應落點區間的 `Task_Name` (例如：泥作工程-防水塗佈)。
- **`working_days` (出勤與日曆運算)**:
  - `current_day`: `Today_Date` - `Actual_Start_Date` (必須過濾系統設定的國定假日與核准停工日，並非單純兩日相減)。
  - `remaining_days`: `Expected_Completion_Date` - `Today_Date` (同樣扣除假日)。
- **`vendor_report` (現場回報)**:
  - 來源: `Construction_Logs`
  - 邏輯: 抓取乙方於當日送出的第一手文字報告 `Daily_Summary_Text` 及其附帶之證據照片 IDs。
- **`pcm_report` (AI 監理摘要)**:
  - 來源: `PCM_Assessments` 或 AI 生成模組資料表。
  - 邏輯: 抓取 LaiBE 官方或系統針對今日現場報告所做出的 `Executive_Summary` 結語（確保業主看到的是經過專業視角解讀的安全資訊）。
- **`next_payment` (財務水庫水位)**:
  - 來源: `Escrow_Milestones`
  - 邏輯: 找出狀態為 `LOCKED` (尚未撥付給廠商) 且 `Sequence` 最前面（即下一期將要撥款）的一筆資料，回傳其 `Amount` 與預計觸發的 `Expected_Date`。

---

## 3. 上下文綁定留言 (Time-Bound Context Messaging)

**設計理念 (追溯性與防呆 Rule 5, Rule 9)**：
- 業主在閱讀當日這份「聚合總覽」時，產生任何疑問或指示，必須要有明確的時空背景。不能只留下一句「這裡有問題」，導致廠商無從查證。

**系統動作 (API POST & Payload Binding)**：
- **Trigger**: 當業主在此概況頁面底部的輸入框發送訊息時。
- **Action**: 呼叫共用的發送留言端點 `POST /project/{id}/messages`。
- **強制 Payload 夾帶**:
  - `"context_tag": "SITE_OVERVIEW"` (標明此發言發生於首頁概況區)
  - `"reference_date": "2026-03-10"` (標明該留言是針對「哪一天的哪份報告」而發)
- **聯動效應 (Broadcasting)**：
  - 透過此機制的強制夾帶，當系統使用前述規格中的 WebSocket 推播給廠商或 PCM 後台時，接收者將能立刻精準還原業主當下所看到的總覽畫面，杜絕雞同鴨講的溝通損耗。
