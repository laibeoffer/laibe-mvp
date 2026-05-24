# LAIBE PAGE REGISTRY

本文件是萊比 MVP 頁面登錄表。
所有重要頁面都必須在此登錄用途、角色、入口與出口。

---

## Page Entry Format

每個頁面請使用以下格式：

### Page Name

路徑：
[填入檔案路徑或 URL]

頁面角色：
[landing / onboarding / plan-puzzle / budget-system / dashboard / visual / support / other]

主要任務：
[此頁讓使用者完成什麼]

主要入口：
[使用者從哪裡進來]

主要出口：
[使用者下一步去哪裡]

主 CTA：
[主要按鈕文案與目標]

次 CTA：
[次要按鈕文案與目標]

返回邏輯：
[history.back() 或固定頁面]

禁止事項：
[此頁不應承擔什麼功能]

狀態：
[active / draft / deprecated / placeholder]

---

## Main Flow

landing
→ onboarding
→ plan-puzzle
→ budget-system
→ dashboard

---

## Initial Registry

### Landing / Pre-landing

路徑：
待填

頁面角色：
landing

主要任務：
說明萊比價值，導入需求整理。

主要入口：
外部流量、首頁入口。

主要出口：
onboarding / 需求整理。

主 CTA：
開始整理需求 → onboarding

次 CTA：
了解平面拼圖 / 預算生成，需視實際頁面確認。

返回邏輯：
不適用或瀏覽器返回。

禁止事項：
不可承擔完整預算生成，不可塞入複雜工具操作。

狀態：
active / 待確認路徑

### Onboarding / 需求整理

路徑：
待填

頁面角色：
onboarding

主要任務：
收集甲方需求，建立案件初始條件。

主要入口：
landing

主要出口：
plan-puzzle

主 CTA：
進入平面拼圖 → plan-puzzle

次 CTA：
返回首頁 / 稍後補充，需視實際頁面確認。

返回邏輯：
history.back() 或 landing。

禁止事項：
不可變成 dashboard，不可塞入所有工具。

狀態：
active / 待確認路徑

### Plan Puzzle / 平面拼圖

路徑：
待填

頁面角色：
plan-puzzle

主要任務：
讓使用者描述空間、房間、物件、平面配置。

主要入口：
onboarding、header tools

主要出口：
budget-system

主 CTA：
產生預算草稿 → budget-system

次 CTA：
返回需求整理 / 儲存平面資料，需視實際頁面確認。

返回邏輯：
history.back() 或 onboarding。

禁止事項：
不可直接處理完整 budget engine，不可變成大型 CAD。

狀態：
active / 待確認路徑

### Budget System / 預算生成

路徑：
待填

頁面角色：
budget-system

主要任務：
接收需求與平面資料，產生預算草稿或估價資料。

主要入口：
plan-puzzle、header tools

主要出口：
dashboard

主 CTA：
查看報價比較 / 進入 dashboard → dashboard

次 CTA：
返回平面拼圖 / 調整條件，需視實際頁面確認。

返回邏輯：
history.back() 或 plan-puzzle。

禁止事項：
不可把 renderer 當 budget engine，不可把預算邏輯硬寫死在 UI。

狀態：
active / 待確認路徑

### Dashboard / 甲方評比與決策

路徑：
待填

頁面角色：
dashboard

主要任務：
呈現案件狀態、報價比較、決策輔助。

主要入口：
budget-system

主要出口：
案件後續流程 / 文件 / 返回 budget-system

主 CTA：
查看報價比較 / 下一步決策，需視實際頁面確認。

次 CTA：
返回預算 / 返回案件，需視實際頁面確認。

返回邏輯：
history.back() 或 budget-system / 案件總覽。

禁止事項：
不可取代 onboarding，不可塞入所有工具入口。

狀態：
active / 待確認路徑

