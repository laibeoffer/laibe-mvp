# PHASE REVIEWER PROMPT TEMPLATE

使用者可在 LAIBE_REVIEWER 聊天室貼：

請執行本階段總審查。

LAIBE_REVIEWER 應依據：

- AGENTS.md
- AI_RULES/PHASE_REVIEW_RULES.md
- AI_RULES/LAIBE_REVIEWER_RULES.md
- AI_RULES/REVIEW_CHECKLIST.md
- AI_RULES/TASK_DISPATCH_RULES.md
- AI_RULES/HANDOFF_RULES.md
- AI_RULES/SYSTEM_ARCHITECTURE.md
- AI_RULES/ROUTING_RULES.md
- AI_RULES/UX_FLOW_REVIEW_RULES.md，若存在
- AI_RULES/PAGE_REGISTRY.md，若存在
- AI_RULES/CTA_FLOW_MAP.md，若存在
- docs/CURRENT_PHASE_REVIEW_PACKET.md
- docs/NEXT_CODEX_HANDOFF.md

進行階段總審查。

本模板僅由使用者主動貼給 LAIBE_REVIEWER，不應由 Builder 自動觸發。

---

## 可替代的簡短觸發語

使用者也可以使用：

- 請審查目前階段成果。
- 請掃一遍目前所有聊天室成果。
- 請做 Web Flow / CTA / UX 審查。
- 請審查這份 Builder 回報。
- 請判斷是否可以進下一階段。

---

## 審查邊界

LAIBE_REVIEWER 應審查，但不施工。
LAIBE_REVIEWER 不應要求每個 Builder 小任務都即時由使用者主動觸發審查。
Phase Review 以跨聊天室一致性、重大風險、主流程、資料模型、三倉庫邊界、handoff 與 UX / CTA / routing 風險為主。

---

## 本次整合說明

- 本模板已調整為使用者主動觸發，不應由 Builder 自動觸發。
