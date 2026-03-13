# LaiBE LINE 生物辨識簽署與行情低水位煞車邏輯 Spec (FIDO_Sign_&_Watermark_Fallback)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 6, Rule 7, Rule 8, Rule 10)
**目標模組**: 合約簽署與價格防護機制 (Contract Signing & Price Circuit Breaker)

---

## 1. LINE 內建生物辨識簽署 (FIDO / WebAuthn via LIFF)

**設計目的 (防跳關與最高防護 Rule 10)**：
- 雖然在前一階段我們在 LINE 中達成分項金額 `AGREED` 並鎖定了狀態，但最終合約的生成與確認必須擁有最高的不可否認性（Non-repudiation）。
- 我們將合約簽署流程透過 LIFF 直接封裝在 LINE 內，不再將使用者導至不可控的外部瀏覽器。

**執行邏輯 (FIDO 整合)**：
1. **Trigger**: 甲方點擊推播卡片上的 `[同意接受追加報價並進行合約簽署]`。
2. **LIFF 滿版呈現**: 不直接跳轉外部瀏覽器，而是開啟「滿版 (Full-screen)」的 LINE LIFF App。LIFF 頁面內會唯讀顯示最終合約的 PDF 預覽與相關附件清單。
3. **硬體驗證 (Rule 4)**: 頁面上方只會有一個解鎖簽署的步驟。呼叫瀏覽器的 `WebAuthn API` (FIDO2 標準) 啟動手機的**原生生物辨識** (Face ID / Touch ID / 指紋)。
4. **狀態鎖定**: 驗證成功後，Backend 會將「硬體認證 Token」、「時間戳記」與該版本 PDF 的 Hash 值綁定並寫入合約 Log 中，狀態正式進入 `CONTRACT_SIGNED`。

---

## 2. PCM 議價煞車機制 (The Low-Watermark Circuit Breaker)

**設計理念 (使用者不是專家，系統才是 Rule 1 & Risk is a Feature Rule 7)**：
- 業主（Owner）可能因為貪小便宜，接受了不合理、破盤價的低價（低於市場行情太多，例如偷工減料的高風險）。
- 系統不能放任這類決策無阻礙地通過，甚至不該把這種破盤報價輕易拋出去給廠商，必須建立系統級別的「煞車與覆寫（Override）屏障」。

**邏輯流 (Logic Flow)**：
1. **觸發與資料依賴**: 當 Owner 透過私訊 (`Private_Channel`) Quick Reply 提出他期望的目標砍價數字 `Target_Price`。Backend 需要即時查詢資料庫 `Pricing_Database` 中的 `Min_Market_Price`（預設的行情低水位線）。
2. **防呆與煞車檢查**:
   - `IF Target_Price < Min_Market_Price`: 
     - **攔截請求**: 系統立刻「煞車」，不會將這個過低的價格由 Agent 推播至 `Group_Channel`，避免引起廠商直接破局。
     - **風險提示與覆寫 (Rule 7, Rule 8)**: 在 `Private_Channel` 向 Owner 推播 `[AI 煞車警告卡片]`。內容明示風險：「您的砍價幅度低於市場行情 XXX，極可能會導致廠商採用次等材料或工程延宕。」
     - **狀態變更**: 系統狀態變更為 `OWNER_MANUAL_OVERRIDE_REQUIRED`。如果 Owner 堅持要這個價格，他必須進行額外點擊**確認風險並承擔責任**的 Override 操作（讓這個決策變得非常不滑順），系統才會真正放行這個價格。
   - `ELSE`: 如果砍價幅度在合理區間內，系統維持正常運作，由 AI Agent 將訊息帶入 `Group_Channel` 繼續議價。

---

## 3. 初始觸發點修正 (Trigger Correction)

**系統發起防呆 (Rule 1, Rule 9)**：
- **紅線規則**: LINE Bot 絕對不會、也沒有權限「無故主動」對任何人發起一份新的報價或追加單流程。
- **唯一入口 (INIT)**:
  整個 `Negotiation_State_Machine` 狀態機的起點，必須且只能由廠商在 Web 端的獨立儀表板（具有完整的防呆設計），填寫完一切明細，並按下送出鍵後——調用 API `POST /vendor/submit-add-on-quote` 來引發。
- **意涵**: 這確保了任何一個在 LINE 上的談判項目，源頭都必定有一份嚴謹、鎖碼、計算軌跡清晰的 Web Draft 當作地基（Single Source of Truth），避免從聊天室隨機誕生一筆帳目。
