# LAIBE TASK BRIEF TEMPLATE

此模板用於在交給 Builder / Reviewer / Architect 之前，先整理任務分派資訊。

每次任務開始前，建議先用本模板建立 task brief。
task brief 不等於施工 prompt。
task brief 是任務分派文件。

---

## 1. 任務名稱

[填入任務名稱]

---

## 2. 任務背景

[簡述為什麼要做這件事]

---

## 3. 任務目標

[填入本輪要達成的具體目標]

---

## 4. 任務類型

請選一個或多個：

- Builder Task
- Reviewer Task
- Architect / Governance Task
- Documentation Task
- Routing / CTA Task
- UX Flow Review Task
- Web Flow Builder Task
- Visual Simulation Task
- Data Model Task
- Phase Review Task
- Sensitive Task
- Blocked Task

---

## 5. 指派角色

請選一個：

- AI_ARCHITECT_CORE
- Builder / Codex
- LAIBE_WEB_FLOW_BUILDER
- LAIBE_REVIEWER
- LAIBE_VISUAL_SIM
- 使用者確認後再決定

---

## 6. 是否允許施工

請選一個：

- 是
- 否
- 只允許修改 Markdown
- 只允許小步修改指定檔案
- 需要使用者授權後才可施工

---

## 7. 允許修改範圍

本輪允許修改：

[列出檔案或資料夾]

---

## 8. 禁止修改範圍

本輪禁止修改：

- `src`，除非明確授權
- `plancraft`，除非明確授權
- `app`，除非明確授權
- `components`，除非明確授權
- `assets`，除非明確授權
- `layout`，除非明確授權
- `package.json`
- `node_modules`
- Vite / React / Next 相關設定
- git 設定
- 任務範圍外檔案

可依本輪補充。

---

## 9. 是否涉及 Routing / CTA / Header

請選一個：

- 是
- 否
- 不確定

若是，完成後可標示為可供使用者後續主動審查。

---

## 10. 是否涉及 UX Flow / Web Design Logic

請選一個：

- 是
- 否
- 不確定

若是，應參考：

- `AI_RULES/UX_FLOW_REVIEW_RULES.md`
- `AI_RULES/PAGE_REGISTRY.md`
- `AI_RULES/CTA_FLOW_MAP.md`
- `AI_RULES/ROUTING_RULES.md`

---

## 11. 是否涉及資料模型

請選一個：

- 是
- 否
- 不確定

若是，完成後可標示為可供使用者後續主動審查。

---

## 12. 是否涉及敏感區域

請檢查是否涉及：

- plancraft
- package.json
- npm install
- framework
- build / config
- git 設定
- 主流程
- 核心資料模型
- 刪檔
- 大量搬移

若涉及，必須先取得使用者明確授權。

---

## 13. 必讀文件

依任務角色選擇：

### Builder 必讀

- AGENTS.md
- AI_RULES/SYSTEM_ARCHITECTURE.md
- AI_RULES/ROUTING_RULES.md
- AI_RULES/CODEX_MANDATORY_ENTRY.md
- AI_RULES/FILE_OWNERSHIP_RULES.md
- AI_RULES/HANDOFF_RULES.md
- AI_RULES/LAIBE_BUILDER_RULES.md
- AI_RULES/TASK_DISPATCH_RULES.md
- docs/NEXT_CODEX_HANDOFF.md，若存在

### Web Flow Builder 必讀

- AGENTS.md
- AI_RULES/SYSTEM_ARCHITECTURE.md
- AI_RULES/ROUTING_RULES.md
- AI_RULES/UX_FLOW_REVIEW_RULES.md
- AI_RULES/PAGE_REGISTRY.md
- AI_RULES/CTA_FLOW_MAP.md
- AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md
- AI_RULES/TASK_DISPATCH_RULES.md
- docs/NEXT_CODEX_HANDOFF.md，若存在

### Reviewer 必讀

- AGENTS.md
- AI_RULES/SYSTEM_ARCHITECTURE.md
- AI_RULES/ROUTING_RULES.md
- AI_RULES/FILE_OWNERSHIP_RULES.md
- AI_RULES/REVIEW_CHECKLIST.md
- AI_RULES/HANDOFF_RULES.md
- AI_RULES/LAIBE_REVIEWER_RULES.md
- AI_RULES/TASK_DISPATCH_RULES.md
- docs/NEXT_CODEX_HANDOFF.md，若存在

### Architect / Governance 必讀

- AGENTS.md
- AI_RULES/SYSTEM_ARCHITECTURE.md
- AI_RULES/CODEX_MANDATORY_ENTRY.md
- AI_RULES/HANDOFF_RULES.md
- AI_RULES/TASK_DISPATCH_RULES.md
- docs/NEXT_CODEX_HANDOFF.md，若存在

---

## 14. 預期交付物

[列出本輪應交付的檔案、修正或審查結果]

---

## 15. 完成後是否可供使用者主動審查

請選一個：

- 必須
- 建議
- 不需要

---

## 16. 完成後回報要求

必須包含：

- 本輪任務
- 任務類型
- 指派角色
- 修改檔案
- 新增檔案
- 是否有功能程式碼改動
- 是否涉及 routing / CTA / header
- 是否涉及 UX Flow / Web Design Logic
- 是否涉及資料模型
- 是否涉及敏感區域
- 是否更新 `docs/NEXT_CODEX_HANDOFF.md`
- 是否更新 `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- 已知風險
- 下一步建議
