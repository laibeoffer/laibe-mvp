# LaiBE 雙軌制 LINE 通訊路由與私有授權迴圈 Spec (Dual-Track_LINE_Routing_&_Authorization)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 1, Rule 2, Rule 7, Rule 9)
**目標模組**: LINE 頻道管理與談判授權引擎 (Channel Management & Authorization Engine)

---

## 1. 頻道路由隔離 (Channel Isolation)

**系統架構 (Dual-Track Architecture)**：
系統必須能夠嚴格區分並同時管理同一個專案下的兩個獨立 LINE 頻道，以實踐「私有決策、公開談判」的策略。
- `Private_Channel_ID`: LaiBE Bot 與 Owner (甲方) 的 1-on-1 隱密視窗。這是 Owner 進行決策、授權、接收不可隱藏之風險警告的唯一安全頻道。
- `Group_Channel_ID`: 包含 Owner (甲方), Vendor (乙方) 以及 LaiBE Bot 的三方群組。這是雙方交換意見、報價與 AI 執行談判代理的公海。

**約束與防呆 (Rule 1, Rule 9)**：
- 永遠假設使用者在多人群組中容易做出受制於人情壓力的錯誤決策。因此，真正具有效力的授權與金額確認，**絕對禁止**在 `Group_Channel` 觸發，必須強制隔離到 `Private_Channel` 執行。

---

## 2. 狀態機與觸發條件 (State Machine & Triggers)

**狀態 A：Courier (快遞員模式)**
- **進入條件**: 當廠商送出報價/追加單，`Item_Status == SUBMITTED`。
- **系統動作**: Backend 將資料打包為規格化 Flex Message，並 `Push_Message` 到 **Private_Channel_ID**。
- **UI 呈現與約束**: 在私訊中，卡片必須清楚展示風險 (Rule 7) 與下一步可選動作。此時 `Group_Channel` 保持靜默，不發送包含價格細節的卡片，避免乙方直接在群組施壓。

**狀態 B：PCM_Negotiating (議價中模式)**
- **進入條件**: 當 Owner 在私訊 (`Private_Channel_ID`) 的卡片中點擊 `[授權 PCM 介入]` (Postback Event)。
- **系統動作**: Backend 切換 Bot 的運作模式，Agent 開始在 **Group_Channel_ID** 中發言。
- **行為規範**: AI 透過事先準備好的腳本模板（或未來的 LLM 策略生成），在群組內向 Vendor 提出降價或規格說明的要求。Owner 授權後，系統作為「黑臉」在群組內執行交涉。

**狀態 C：Pending_Owner_Approval (等待老闆拍板)**
- **進入條件**: 當 Vendor 在三方群組 (`Group_Channel_ID`) 內給出新的價格數字，或以文字表達妥協。
- **系統動作**: Backend 立即**暫停** Agent 在群組內的自動發言。同時向 **Private_Channel_ID** 發送帶有 `[接受此底價]` / `[繼續殺]` 等按鈕的決策卡片。
- **約束提醒 (Rule 9)**：狀態的轉換必須讓 Owner 非常清楚「現在輪到我做決定了」，並且決策介面只有 Owner 能看到，杜絕乙方干擾。

---

## 3. 資料庫鎖定與 Web 同步 (DB Lock & Web Sync)

**談判資料與合約資料的脫鉤 (Rule 2)**：
- **核心規則**: LINE 群組裡面的任何對話 (Message Event) **不會且決不能**直接改變資料庫中的正式合約金額或草稿數值。它只代表「談判進度的推進」與意圖捕捉。
- **自由度的代價**: 群組對話看起來自由，但其背後的系統約束是：這份自由不生任何實質法律或合約效力。

**拍板定案與數位足跡 (Finalizing)**：
- **更新觸發**: 只有當 Owner 在 `Private_Channel` 的 Flex Message 中點擊 `[接受此底價]` (Postback Event) 時，系統才會將該數字備取，並準備更新 `Agreed_Price`。
- **雙向同步與逼迫 (Web Sync)**: 在 Owner 點擊接受後，Backend 會觸發 WebSocket，即時通知 Vendor 的 Web Dashboard，將該項目的狀態強制變更為 `ACTION_REQUIRED`。
- **終極防呆 (Rule 1, Rule 5)**: 系統將**逼迫 Vendor 必須登入 Web 端**，親自在系統介面上將最後談妥的數字輸入/更新，完成最終的「數位足跡」與驗證。這個動作將談判結果轉化為可追溯、不可逆的系統紀錄。
