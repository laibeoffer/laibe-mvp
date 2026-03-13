# LaiBE 重構 PCM 後台資料流：OpenClaw Agent 閘道器與例外處理 Spec (Agent_Gateway_&_Exception_Routing)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 9)
**目標模組**: PCM 與 Agent 核心路由、抽查審核引擎與微調資料倉儲 (PCM Core Routing, Auditing, & Fine-tuning Storage)

---

## 1. 資料路由重構 (AI-First Middleware Routing)

**設計理念 (解耦與自動化 Rule 1)**：
- 原本系統直接將 Client App 的未過濾原始數據 (Vendor's logs & photos) 寫入真人的 PCM Dashboard，這會導致人力過載，無法達到軟體擴張 (Scalability) 所需的無邊界效應。
- 必須在 Backend Server 與 PCM 視圖之間，架設強力且無縫的 **OpenClaw Middleware (AI 閘道器)**。

**架構流與信心濾網 (Confidence Score Filter)**：
1. **資料流入**: `Vendor App` -> 上傳日誌/圖片 -> `Backend Server`
2. **AI 代辦 (Middleware Call)**: 
   - Backend Server 攔截寫入，先行調用 OpenClaw API 進行多模態判定 (Vision / NLP)。
   - OpenClaw 分析後，必須強制回傳「判定結果」與「**信心指標 (confidence_score, 0-100)**」。
3. **自動放行 (Auto-Pass Route)**:
   - **條件**: `IF confidence_score >= 90 (threshold可配) AND 無發現敏感詞彙/情緒升級字眼`。
   - **動作**: 系統全自動將資料核准寫入正式 DB，直接轉發結果或推播通知給業主 (`Owner_LIFF`)。整套流程 100% 繞過真人 PCM，節省大量人力。
4. **例外攔截 (Exception Escalation Route)**:
   - **條件**: `IF confidence_score < 90 OR 觸發特定安全規則 (Escalation_Rules: 如漏水、客訴字眼)`。
   - **動作**: 系統攔截此筆上傳，將資料狀態卡在 Pending，並寫入 `Human_Intervention_Queue` (人工介入佇列) 資料表。此時這筆異常案件才會出現在真人 PCM 的後台儀表板，由專人接手判斷。

---

## 2. 隨機抽查引擎 (Random Sampling Worker)

**設計目的 (防堵 AI 幻覺 Hallucination)**：
- AI 永遠可能存在盲點或一本正經地胡說八道。如果全然放任，將會失去平台背書的權威性。我們需要針對被 AI「判定及格」的案件，建立事後的品質保證網 (QA Net)。

**實作機制 (The Sampling Worker)**：
- **觸發**: 後端每天定時 (例如深夜) 啟動抽樣 Worker 星火。
- **邏輯**: 從「過去 24 小時內」所有由 OpenClaw 自動判定為 `PASSED`（已放行）的影像與施工日誌中，隨機抽出 **5%** (此比例設定需可從後台修改調配)。
- **留存**: 將這些被抽中的樣品複製或指標關聯寫入 `PCM_Audit_Queue` 表單。
- **後續動作**: 隔天交由真人 PCM 在儀表板進行盲測與二審，確保 AI 的判斷準繩沒有隨著時間偏離。

---

## 3. Human Override Tracking (人類推翻追蹤 API)

**設計理念 (將每一次錯誤轉化為 AI 的演化養分)**：
- 當真人 PCM 在處理 `Human_Intervention_Queue` 或是在 `PCM_Audit_Queue` 抽樣中，發現 AI 的判斷錯誤，並動手修改（推翻 Override）時。這個「糾錯動作」是整個公司最寶貴的資產，不能讓它憑空消失。

**資料採集端點與格式 (Fine-tuning Storage API)**：
1. **API Endpoint**: `POST /pcm/audit/override`
2. **強制 Payload 要求**:
   - `original_ai_decision`: (AI 本來是怎麼判斷的)
   - `new_human_decision`: (真人改成了什麼判斷)
   - `human_reason_text`: (真人推翻的具體文字理由)
   - `bounding_box_correction`: (若是影像誤判，前端需圈選的修正座標 JSON)
3. **沉澱資產封裝 (JSON Lines Export)**:
   - 系統接收到這個 POST 後，**絕不能**只是一般性的 Update DB。
   - 必須將此筆非常具體的 Override 數據，獨立封裝成一筆 `JSON Lines (JSONL)` 格式。
   - **價值**: `.jsonl` 是主流 LLM 微調 (Fine-tune) 時最吃香的資料格式。當這個 Queue 累積數千條資料時，LaiBE 就能拿它去針對 OpenClaw 進行模型特化訓練，使 AI 越來越貼近資深 PCM 的判斷邏輯。
