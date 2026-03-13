# LaiBE AI 導入與 MLOps 學習回圈藍圖 (AI_Implementation_&_MLOps_Roadmap)

**版本**: v1.0
**對應設計原則**: 「不要自己造輪子 (Don't reinvent the wheel)」與「防風險演變為護城河」
**目標模組**: 系統演進策略與 AI 開發三階段計畫 (Three-Phase AI Implementation Strategy)

---

## 1. 初期策略：MVP 階段 (API & Prompt Engineering)

**設計理念 (爭取上市時間 Time-to-Market)**：
- 初期系統的重點在於「業務流程跑通」與「驗證產品市場契合度 (PMF)」。
- 切忌在 Day 1 就投入大量成本去訓練無效的自製 AI 模型。

**實作方案**:
- **直接介接頂級多模態模型**: 在 `/pcm/agent-gateway` 與影像預審端點中，直接串接 **GPT-4o** 或 **Gemini 1.5 Pro** 的 API。
- **強依賴 Prompt Engineering**: 賦予 LLM 嚴謹的系統身分 (System Prompt)，藉由傳入高解析度的工地照片與明確的驗收標準 (Ground Truth Context)，讓現有的大模型來擔任初階檢測員。
- **成本與效益**: 雖然 API 單次調用成本較高，但對於 MVP 階段驗證業務流、節省基礎研發人力與時間而言，是唯一合理的選擇。

---

## 2. 中期策略：優化與開源模型私有化部署 (Open-Source Model Deployment)

**設計理念 (降低變動成本與針對性提效)**：
- 當 LaiBE 的使用者（建商與廠商）達到一定規模後，所有照片都通過 OpenAI / Google API 分析，每月的 API 帳單將會吃垮營運利潤。
- 我們需要將「簡易、高頻的任務」轉移到免費且高效率的本地端模型。

**實作方案**:
- **引入現成開源視覺模型 (YOLO / CUBIT 等)**:
  - 去 GitHub 或 Hugging Face 尋找現成、已經被訓練來辨識「工安護具 (PPE：安全帽、反光背心)」或是「混凝土裂縫 (Crack detection)」的開源 YOLOv8 或專門領域的模型。
- **邊緣或私有雲部署 (Private Cloud/Edge Node)**:
  - 透過 Docker 將這些模型打包部署在 LaiBE 的自建伺服器或 GCP / AWS 的輕量級運算節點 (GPU Node) 上。
- **分流機制 (Routing Engine)**:
  - 當廠商透過前端 `Vendor_LIFF_Data_Flow` 上傳照片時，API Gateway 先將照片送到這些自建的 YOLO 模型進行「第一波低成本常規防呆」。
  - 只有在遇到 YOLO 無法判定，或遇到高度複雜語義（例如：「這根水管接的角度對不對？」）的進階防禦時，才將請求 Routing 升級呼叫 GPT-4o 這種昂貴的 LLM。

---

## 3. 長期策略：資料護城河與微調私有 PCM 模型 (Golden Dataset Fine-Tuning)

**設計理念 (建立無人能複製的商業壁壘)**：
- 競爭對手可以輕易學走我們的 UI 介面，也可以跟我們一樣去買 GPT-4o 的 API。但他們無法買到「我們長期營運累積的真實工地錯誤資料與資深 PCM 糾錯邏輯」。

**實作方案 (The MLOps Flywheel)**：
- **原料累積 (Data Harvesting)**:
  - 仰賴先前定義的 `System_Audit_Logs` 與「推翻即訓練 (Human Override Tracking) API」。
  - 系統日夜不休地汲取「真人 PCM 退件的理由」、「真人 PCM 圈選出來的照片缺失位置」、「真人修改過的嚴肅談判對話」。
- **訓練與微調 (Fine-Tuning)**:
  - 資料科學團隊定期從系統抽取由上述行為自動分裝的 JSONL 格式 (Golden Dataset)。
  - 利用這批純度極高、帶有「台灣本土真實裝修特徵與工程習慣」的資料集，去微調 (Fine-tune) 開源模型 (如 Llama 3, Mistral, 或開源的多模態視覺模型)。
- **進化結果**:
  - 培育出 LaiBE 專屬的 **Domain-Specific AI PCM**。
  - 相比於通用的 ChatGPT，這個專屬模型將具備強烈的「建築產業常識 (Construction Common Sense)」與「台式工程行話理解能力」，成為 LaiBE 產品真正無法被抄襲的靈魂核心。
