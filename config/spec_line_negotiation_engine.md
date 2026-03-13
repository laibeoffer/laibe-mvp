# LaiBE LINE 核心議價狀態機與 LIFF 整合 Spec (LINE_Centric_Negotiation_Engine)

**版本**: v1.0
**對應設計原則**: 萊比網站設計師人設 Hard Rules (Rule 2, Rule 4, Rule 9, Rule 10)
**目標模組**: 居中協調與報價流程 (Broker & Quotation Flow)

---

## 1. 雙向 LINE Webhook 路由 (Message Routing)

**隔離機制 (Broker Pattern)**：
- **實作要求**：系統必須嚴格區別並隔離 `Owner_LINE_ID`（甲方）與 `Vendor_LINE_ID`（乙方）。雙方**不得**被加入同一個吵雜的群組進行談判。
- **代理人角色**：LaiBE 的官方帳號與 Antigravity 將擔任唯一的「中間人 (Broker)」。所有的訊息必須由系統解析後再轉發。

**轉發與狀態寫入邏輯 (State-driven Design)**：
- **乙方動作**：乙方送出 LIFF 報價表單 -> 觸發 Backend API -> Antigravity 攔截並驗證合規性 -> 組裝成結構化的 Flex Message -> 推播報價卡片給甲方的 LINE。
- **甲方動作**：甲方點擊 Flex 卡片上的 Postback 按鈕（例如 `action=counter_offer&price=42000`） -> 觸發 Backend API -> Antigravity 記錄該價格決策寫入 DB -> 組裝還價 Flex Message -> 推播給乙方的 LINE。
- **防呆約束 (Rule 2, Rule 4)**：雙方關於「價格、工項、數量」的討論，不被允許以無結構的「純文字留言」完成決策。系統必須強迫他們透過帶有確定性意圖的 UI（Flex Message 按鈕 或 LIFF）來觸發 `action`，以降低自由度與風險。

---

## 2. LIFF (LINE Front-end Framework) 整合

**邊界限制與防呆設計**：
- **為什麼要用 LIFF**：乙方雖然在 LINE 接收通知，但「填寫表單」與「上傳照片/圖面」這類高複雜與高風險動作，絕不能用語音或文字打字完成。這會導致數據無法被追溯與計算（違反 Rule 5）。
- **無縫整合**：必須將既有的 Web 報價與細目編輯頁面封裝為 LIFF App。廠商點擊對話框內的選單或按鈕時，能在不離開 LINE APP 的半屏/全屏視窗下開啟表單。
- **即時回饋 (Rule 6)**：在 LIFF 畫面中進行的任何金額與數值拖拉變更，必須立即顯示驗證與計算結果，不允許廠商「送出了才告訴他填錯了」。
- **強制自動關閉**：當表單成功 Submit 並寫入 DB，LIFF 必須呼叫 `liff.closeWindow()` 強制退出畫面，並即刻在對話框產生對應狀態推播。

---

## 3. 狀態鎖定與合約生成 (Contract Lock)

**強制收斂與防跳關機制 (Rule 10)**：
- 系統會長駐監聽所有 `Item_Status`。當 Antigravity 偵測到整張派工單所有的項目都達成 `Item_Status == AGREED` 時，狀態機進入鎖定 (Locked)。
- **不可修改 (Rule 4)**：一旦達成 AGREED，LINE 上之前的議價或回絕 Postback 按鈕，若再次點擊必須回傳「此階段已鎖定」的錯誤提示。

**導流與雙重驗證**：
- 自動向甲乙雙方的 LINE 分別發送最終里程碑卡片：
  - **標題**：🎉 議價完成，工程追加單已定案！
  - **下一步提示 (Rule 9)**：明確告知當前議價階段結束，等待合約簽署。
  - **按鈕行動**：`[📄 前往簽署正式電子合約]`
- **最終防線**：此按鈕將雙方強制引導至具備高度安全管控、雙重驗證 (2FA) 的 **LaiBE 網頁端**。
- **嚴格宣告**：Agent 絕不具備最終簽約權。所有的真實合約簽署與法律效力，必須回到 Web 進行。LINE 只是確保雙方把價格談攏的「溝通管道」。
