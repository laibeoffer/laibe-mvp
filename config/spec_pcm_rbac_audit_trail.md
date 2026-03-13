# LaiBE PCM 後台：權限矩陣、強制接管與稽核留痕 (RBAC_Takeover_&_Audit_Trail)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 2)
**目標模組**: 系統內部控制、防偽溯源與 AI 協同管理 (Internal Control, Auditing & Human-AI Collaboration)

---

## 1. 角色基礎存取控制 (RBAC - Role-Based Access Control)

**定義**: 將系統內部權限區分為明確的階級，避免越權操作。
- **資料庫變更**: `Users` Table 必須新增 `Role_Level` 欄位。
- **等級劃分**:
  - `Level 1`: `AI Agent (System)` - 系統自動化大腦 (如 OpenClaw)，專司初步視覺與 NLP 判定。
  - `Level 2`: `Junior PCM` - 真人專案管理師，僅能讀寫被指派 (Assigned) 的特定專案。
  - `Level 3`: `Senior PCM / Manager` - 高階主管，具備全域視野 (Global View) 且可進行案件分派與強制介入。
- **權限閘道 (RBAC Middleware)**:
  - 所有的 `POST /pcm/*`, `PUT /pcm/*`, `DELETE /pcm/*` 系統端點，必須強制經過後端的 JWT Middleware。
  - 檢驗 Request 所攜帶 Token 中的 `Role_Level` 是否具備該端點之權限。若低權限者嘗試呼叫高權限 API，不僅直接退回 `HTTP 403 Forbidden`，更要將此異常寫入安全日誌。

---

## 2. 嚴格稽核日誌 (Strict Audit Trail - Event Sourcing)

**定義**: 建立系統所有變更的「不滅之軌跡」，確保日後法律或合約糾紛的絕對證據力。
- **資料庫結構**: 建立獨立且唯寫的 `System_Audit_Logs` 表單。
- **留痕邏輯 (Logging Logic)**:
  - 任何對資料庫核心表單造成變更的動作（包含但不限於：核准/退回請款、上傳/覆寫照片、發送業主留言、修改專案狀態 等）。
  - **強制欄位**:
    - `Action_Type`: 例 `APPROVE_INVOICE`, `REJECT_EVIDENCE`
    - `Target_ID`: 變更對象的 ID
    - `Operator_User_ID`: 真實操作者 ID
    - `Timestamp`: 精確至毫秒的時間戳記
    - `IP_Address`: 來源 IP 紀錄
  - **AI 實名制**: 即使是 Level 1 所執行的全自動查核與放行，也要記名 `Operator: AI_PCM_System`。對系統的信賴必須建立在「每一個細微變更都找得到負責人」的基礎上。

---

## 3. 階層式強制接管邏輯 (Hierarchical Takeover Protocol)

**定義**: 確保人為智慧始終能凌駕且覆寫 (Override) 初階系統，以防禦突現的不可控風險。
- **API Endpoint**: `POST /project/{id}/takeover`
- **所需 Payload**: `{ "new_handler_id": "U123" }`
- **接管規則 (Validation Rules)**:
  - **Rule A (AI Override)**: 真人 (`Level 2+`) 可以無條件接管並覆寫 `AI (Level 1)` 正在自動處理中的工單。
  - **Rule B (Escalation)**: 主管 (`Level 3`) 可以無條件接管並介入下屬 (`Level 2`) 正在處理或卡關的專案。
- **接管廣播**:
  - 當接管成功，系統自動向內部相關人員發出通知：`「⚠️ 專案 X 已由 [高階主管 Y] 強制接管。」`
  - 並將此前一秒與後一秒的所有狀態變遷，強制併入前述的 `System_Audit_Logs` 中。

---

## 4. 歷史檔案室 (Read-Only Archive Endpoint)

**定義**: 專為完工後專案、或合意解約專案所設計的「唯讀空間」。
- **API Namespace**: `GET /archive/project/{id}/*`
- **物理隔離**: 
  - 在這個特定的 Namespace 路徑下，後端 API **只實作 GET 方法**。
  - 這是從後端路由層面（Physical Routing Layer）直接閹割寫入能力。不論你的 `Role_Level` 有多高，只要打進這個路徑，就絕對沒有任何修改、刪除 (PUT/POST/PATCH/DELETE) 資料的可能性。
  - 這保證了最終結案的資料（合約、保固證明、付款明細）等同於被刻在保險箱的石頭上，供業主與存檔系統無限期備查，不會因為意外的 Bug 操作而遭到竄改。
