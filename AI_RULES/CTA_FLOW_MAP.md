# LAIBE CTA FLOW MAP

本文件登錄萊比 MVP 各頁面的 CTA、目標頁面與使用者行動線。

所有 Web Flow Builder 任務與 Reviewer 審查，都應參考此文件。

---

## CTA Entry Format

每個 CTA 使用以下格式：

### CTA Name

出現頁面：
[頁面名稱]

CTA 文案：
[按鈕文字]

CTA 類型：
[primary / secondary / utility / external / disabled]

目標：
[目標頁面或外部連結]

目的：
[此 CTA 要推動什麼行動]

狀態：
[active / draft / disabled / placeholder]

風險：
[可能造成的誤解]

---

## Main CTA Flow

### 開始整理需求

出現頁面：
Landing / Pre-landing

CTA 文案：
開始整理需求

CTA 類型：
primary

目標：
Onboarding / 需求整理

目的：
引導甲方開始整理裝修需求。

狀態：
active / 待確認實際路徑

風險：
若直接跳到工具頁，會破壞需求整理流程。

---

### 進入平面拼圖

出現頁面：
Onboarding / 需求整理

CTA 文案：
進入平面拼圖

CTA 類型：
primary

目標：
Plan Puzzle / 平面拼圖

目的：
讓使用者將需求轉成空間 / 房間 / 物件資料。

狀態：
active / 待確認實際路徑

風險：
若 onboarding 資料未完成，可能造成資料不足。

---

### 產生預算草稿

出現頁面：
Plan Puzzle / 平面拼圖

CTA 文案：
產生預算草稿

CTA 類型：
primary

目標：
Budget System / 預算生成

目的：
將空間資料與需求條件送入預算生成流程。

狀態：
active / 待確認實際路徑

風險：
若 plan-puzzle 沒有輸出結構化資料，budget-system 可能只能做假資料。

---

### 查看報價比較

出現頁面：
Budget System / 預算生成

CTA 文案：
查看報價比較

CTA 類型：
primary

目標：
Dashboard / 甲方評比與決策

目的：
引導使用者進入報價比較與決策頁。

狀態：
active / 待確認實際路徑

風險：
若尚未有報價資料，應標示為預覽或 demo，不可偽裝成正式比較。

---

## Header Tools CTA

### 平面拼圖

出現頁面：
Header Tools

CTA 文案：
平面拼圖

CTA 類型：
utility

目標：
Plan Puzzle / 平面拼圖

目的：
快速進入平面拼圖工具。

狀態：
active / 待確認實際路徑

風險：
若使用者未完成需求整理，直接跳入工具可能造成流程斷裂。

---

### 預算生成

出現頁面：
Header Tools

CTA 文案：
預算生成

CTA 類型：
utility

目標：
Budget System / 預算生成

目的：
快速進入預算生成流程。

狀態：
active / 待確認實際路徑

風險：
若缺少 plan-puzzle 或需求資料，應明確標示資料不足或 demo。

---

### LiDAR

出現頁面：
Header Tools

CTA 文案：
LiDAR 下載

CTA 類型：
external

目標：
外部連結，待確認

目的：
引導使用者取得掃描工具。

狀態：
disabled / draft，直到正式 URL 確認

風險：
不可填假連結，不可偽裝成站內功能。

---

### iScanner

出現頁面：
Header Tools

CTA 文案：
iScanner 下載

CTA 類型：
external

目標：
外部連結，待確認

目的：
引導使用者取得掃描工具。

狀態：
disabled / draft，直到正式 URL 確認

風險：
不可填假連結，不可偽裝成站內功能。

