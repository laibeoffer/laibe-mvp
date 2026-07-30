# Owner Guide Question Flow

Managed by: `SECOND_DEPUTY_COMMANDER`

Runtime status after correction: `WEB_RUNTIME_PENDING` until browser evidence is refreshed.

## Product Rule

Owner Guide is mandatory. The owner must complete requirement intake before plan-puzzle or budget-preview CTAs are shown.

Before `requirement_completion_status = completed`, the UI may show only:

- 下一題
- 回上一題 / 修改上一個回答
- 儲存目前回答
- 查看已填內容
- 補充說明

It must not show visible CTAs for:

- 進入平面拼圖
- 平面拼圖
- 預算預覽

After completion, the UI may show:

- 完成需求表單，進入平面拼圖
- 完成需求表單，進入預算預覽

It must also show: `需求表單已完成，以下資料將作為後續平面拼圖與預算生成的參數來源。`

## Required Steps

1. 基本案件資訊
   - 房屋類型
   - 坪數 / 面積
   - 屋況
   - 所在區域
   - 使用目的

2. 空間需求
   - 客廳
   - 臥室
   - 廚房
   - 浴室
   - 收納
   - 其他空間

3. 風格偏好
   - 想要風格
   - 不喜歡風格
   - 參考圖片狀態

4. 預算偏好
   - 未知
   - 區間
   - 上限
   - 需協助估算

5. 時程偏好
   - 探索中
   - 一個月內
   - 三個月內
   - 半年內
   - 未知

6. 檔案狀態
   - 是否已有平面圖
   - 是否已有報價單
   - 是否已有照片
   - 是否需要平面拼圖

7. mock 上傳 metadata
   - `current_plan_files`
   - `current_site_photos`
   - `style_reference_images`

8. 業主自行補充說明
   - `owner_additional_notes`

## Requirement Completion Status

- `incomplete`: required text or notes are still missing.
- `ready_for_review`: required text and owner notes are present, but the owner has not clicked completion.
- `completed`: owner completed the requirement form; next-step CTAs may be shown.

## Revision Rule

Undo removes the last active answer from effective output and marks the related revision/log entry as reverted. Reverted answers may remain in an internal revision log, but they must not feed `OwnerIntent`, `ProjectRequirementBrief placeholder`, or next-step recommendations.

## Next Step Recommendations

Before completion, `next_recommended_step` must be `continue_requirement_intake`.

After completion, allowed values are:

- `enter_plan_puzzle`
- `enter_budget_preview`
- `prepare_for_bidding`
- `human_assistance`

This flow still does not produce formal prices, `PricingRule`, `BudgetEstimateLine`, formal quotes, DB writes, upload backend calls, or real AI API calls.
