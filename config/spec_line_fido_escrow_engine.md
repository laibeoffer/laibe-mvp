# LaiBE LINE 生物辨識簽署與信託啟動引擎 Spec (FIDO_Signature_&_Escrow_Engine)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 2, Rule 9, Rule 10)
**目標模組**: 最終合約收斂與信託金流連動 (Contract Finalization & Escrow Integration)

---

## 1. FIDO2 / WebAuthn 生物辨識整合 (Biometric Authentication)

**設計目的與防護 (防跳關 Rule 10, Rule 1)**：
- 在高度複雜的工程金流決策中，傳統的「手寫數位簽名」或「打字同意」極易被偽造（代簽），無法構成強力的法律與財務防線。
- 系統強制要求使用硬體層級的防護，拒絕讓予使用者退回低安全性驗證的自由。

**技術實作 (The API Protocol)**：
- **Trigger / Frontend (LIFF)**: 甲方點擊最終確認按鍵 `[呼叫 Face ID / 指紋]` 時，LIFF 內部不跳轉，而是調用瀏覽器原生的 Web Authentication API (WebAuthn)。
- **Endpoint**: `POST /contract/sign-fido`
- **Backend Validation (系統驗證)**:
  1. 接收並驗證來自設備的 Cryptographic Token。
  2. 將這份「硬體授權 Token」、使用者的「Device ID」、「IP Address」以及「當下 TimeStamp」進行組合並做 SHA-256 Hash 綁定。
  3. 這份綁定紀錄建立具備絕對「不可否認性 (Non-repudiation)」的高強度電子簽章軌跡，作為後續金流啟動的唯一憑證。

---

## 2. 最終合約動態封裝 (Final Contract Compilation)

**設計理念 (不可變的狀態 Rule 4 & 溯源 Rule 5)**：
- 議價過程可以反覆，但一旦簽署，所有細節必須瞬間收斂成一份無法更改的實體（Immutable Object）。

**自動化組裝流程 (Data Merging)**：
1. **Trigger**: 在甲方成功完成上述的 `sign-fido` 授權後觸發。
2. **載入與封裝**:
   - 讀入系統防呆鎖定的 `[原招標標準合約]`。
   - 寫入雙方在通訊與 Web 端已確認 (`AGREED`) 的 `[場勘與追加減項目/金額/數量]`。
   - **強制插入防護**: 自動插入 `[萊比 PCM 代理條款與 AI 驗收規範]`。不允許雙方刪除這些保護性條款（Rule 2: 減少自由度）。
3. **結屏 (Output)**:
   - 壓上雙方的「數位憑證印章」與「伺服器時間戳記」。
   - 生成一份最終不可修改的 PDF 檔案 (`Final_Contract.pdf`)。
   - 將該文件的 SHA-256 Hash 存入核心資料庫（或未來上鏈保存），確保日後無任何人能竄改合約。

---

## 3. 狀態機推進與信託閘門啟動 (State Update & Escrow Trigger)

**無縫銜接與責任切割 (State-driven Design Rule 9)**：
一旦合約封裝完成，系統必須立即轉移到下一個重大階段，不允許任何時間差讓使用者反悔或混淆狀態。

**系統動作**:
1. **State Machine**: 專案的核心狀態由 `NEGOTIATION_COMPLETED` 正式變更為 `CONTRACT_SIGNED` 與 `READY_FOR_CONSTRUCTION`。
2. **Escrow API 觸發 (核心金流動作)**:
   - 呼叫第三方信託銀行或金流閘道：`POST /escrow/activate-project`。
   - 將甲方在招標階段已鎖定的「保留決標訂金」，在這瞬間**正式轉列**為該專案的「履約保證金 / 第一期工程款」。
   - 在第三方信託產生該專案專屬的 `[里程碑撥款虛擬帳號/憑證]`。

---

## 4. 系統全域廣播 (System Broadcast)

**即時回饋與資訊同步 (Rule 6, Rule 9)**：
- 當信託帳戶啟動成功，系統必須立刻、毫無延遲地向所有參與者廣播，確保三方資訊對稱。
- **LINE Push Message 廣播範圍**:
  1. 向「甲方私訊」 (`Private_Channel`)。
  2. 向「乙方私訊」 (`Private_Channel`)。
  3. 向「三方群組」 (`Group_Channel`)。
- **推播卡片規格**:
  - **內文**: `「🎉 恭喜！合約已由雙方正式簽署生效。信託帳戶已啟動，請乙方依據進度表準備開工。」`
  - **行動呼籲 (CTA)**: 卡片內附帶最終版 `Final_Contract.pdf` 的安全下載連結。
  - **安全限制**: 下載連結必須包含驗證機制（需登入或限期 7 天有效），防止敏感合約外洩。
