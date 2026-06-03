# Evidence Priority Order

## Core Principle

所有爭議都按照合約走。

任何資料若不是 `verified`，不得進入正式裁斷。

## Priority Order

在所有資料均為 `verified` 且未被 disputed / voided / unavailable 阻擋的前提下，證據優先順序如下：

1. 合約主文。
2. verified 變更單、補充協議或雙方正式確認的合約修改。
3. 合約附件。
4. verified 預算單、報價單、工項明細、材料規格、工法範圍、不包含項目與假設條件。
5. verified 平面圖、SVG、量體與現場量測紀錄。
6. verified 驗收紀錄。
7. verified 付款節點紀錄；本 Agent 只管理證據，不產生付款。
8. verified 雙方確認紀錄。
9. verified 平台訊息，僅在與合約或雙方確認有明確關聯時使用。
10. LINE 訊息，僅作輔助脈絡，不得單獨升級為合約。
11. 現況照片，僅作輔助脈絡，除非與 verified 合約、附件、變更或驗收紀錄明確關聯。

## Conflict Rule

若同一事項存在衝突：

- 先確認各資料是否為 `verified`。
- 未 verified 者不得進入正式比較。
- 若 verified 資料互相衝突，標記 `disputed` 並人工審核。
- 若較新 verified 變更單或雙方確認紀錄明確取代舊資料，舊資料標記 `superseded`。
- 若資料已作廢或被禁止使用，標記 `voided`。
- 若資料無法取得，標記 `unavailable`。

## LINE Message Rule

LINE 訊息不得單獨升級為合約。

LINE 訊息只能在下列條件下作為輔助資料：

- LINE 訊息來源、時間、參與者身份與內容可追溯。
- 該訊息與 verified 合約、附件、變更單、驗收紀錄或雙方確認紀錄有明確關聯。
- 該訊息未與合約主文或 verified 附件衝突。

