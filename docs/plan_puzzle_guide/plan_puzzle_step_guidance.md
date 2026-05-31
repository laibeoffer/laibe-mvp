# Plan Puzzle Step Guidance

Status: `CONTRACT_ONLY`

GitHub operating path acknowledged: Yes

## Step Guidance

### 1. Import PNG / JPG

Goal: create a visible underlay.

UI prompt:

- "請匯入 PNG / JPG 丈量圖作為底圖。"

Completion signal:

- `import_status: image_imported`
- `underlay_status: linked`

### 2. PDF Import Interface

Goal: accept PDF intent without claiming direct PDF preview support.

UI prompt:

- "PDF 匯入接口已建立，但目前請先轉成 PNG / JPG 後校正。"

Completion signal:

- `import_status: pdf_interface_only`
- `underlay_status: placeholder`

### 3. Base Plan Calibration

Goal: pick a known-length line and set scale.

UI prompt:

- "請用已知尺寸校正比例；校正後才開始畫牆。"

Completion signal:

- `scale_status: linked`

### 4. Draw Walls

Goal: create wall segments after scale exists.

UI prompt:

- "沿底圖畫牆，完成後整理端點。"

Completion signal:

- `wall_length_status: placeholder` or `linked`

### 5. Mark Doors / Windows / Openings

Goal: attach openings to selected wall edges.

UI prompt:

- "請先選取牆段，再標門、窗或開口。"

Completion signal:

- `opening_count_status: placeholder` or `linked`

### 6. Mark Zones

Goal: place room labels and optional boundary edges.

UI prompt:

- "請標註空間名稱，並盡量指定 zone boundary。"

Completion signal:

- `zone_status: placeholder` or `linked`

### 7. Zone Check

Goal: detect missing boundary, invalid area, or low confidence.

UI prompt:

- "請檢查 zone boundary 是否閉合；低信心面積只作需求線索。"

Completion signal:

- `area_status: placeholder`, `linked`, or `verified`

### 8. Export / Next CTA

Goal: export mock facts and continue main flow.

Primary CTA:

- `進入預算生成`

Secondary CTA:

- `匯出 Plancraft+ 草稿`
- `匯出 Plancraft .pc 測試版`

Rule:

- CTA may hand off placeholder facts, but must not call Budget Engine or produce formal estimate.
