# FILE OWNERSHIP RECONCILIATION

本文件是 Phase Review Conditional Pass 後的 file ownership 對帳摘要。

本文件只整理目前 `git status` 中的 D / M / ?? 狀態，不還原檔案、不刪檔、不執行 `git clean`、不執行 `git reset`。

---

## 1. 本輪治理層修正成果

本輪只處理 Markdown 治理層修正，包含：

- 修復 `templates/*.md` 中文亂碼。
- 清理並補充 `docs/CURRENT_PHASE_REVIEW_PACKET.md`。
- 更新 `docs/NEXT_CODEX_HANDOFF.md`。
- 新增本文件 `docs/FILE_OWNERSHIP_RECONCILIATION.md`。

本輪未修改 HTML / JS / CSS / TS / Python 功能檔。

---

## 2. 本階段治理 / 規格成果

以下 `??` 狀態屬於本階段治理、規則、模板或文件成果，應視為本階段 Phase Review 範圍的一部分：

- `AGENTS.md`
- `AI_RULES/`
- `templates/`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/ABOUT_LAIBE_QA_SOURCE.md`
- `docs/EDITING_MAP.md`
- `docs/LAIBE_CORE_POSITIONING.md`
- `docs/LAIBE_VISUAL_SIM_CHATROOM.md`
- `docs/PROJECT_RULES.md`
- `docs/USER_IT_LIMITS.md`
- `docs/USER_WORKING_STYLE.md`
- `docs/ai_style_visual_chat/`
- `docs/budget/`
- `skills/`

說明：

- `AI_RULES/` 與 `templates/` 是中央治理制度成果。
- `docs/CURRENT_PHASE_REVIEW_PACKET.md` 是階段總審查資料包。
- `docs/NEXT_CODEX_HANDOFF.md` 是下一輪接續工作的 handoff。
- `docs/budget/` 是預算系統規格與階段資料文件，不等同於功能程式碼。

---

## 3. 舊有 dirty 狀態 / 其他 Builder 成果

以下 `M` 或 `??` 狀態不是本輪 AI_ARCHITECT_CORE 修正造成，屬於既有 dirty 狀態、其他 Builder 階段成果或尚未由本聊天室確認 ownership 的工作：

### React / portal prototype

- `app/owner/bids/page.tsx`
- `app/owner/dashboard/page.tsx`
- `app/vendor/dashboard/page.tsx`
- `components/sidebar/OwnerSidebar.tsx`
- `components/sidebar/VendorSidebar.tsx`

### static MVP HTML

- `src/stitch_laibe_landing_onboarding/budget_document_preview/code.html`
- `src/stitch_laibe_landing_onboarding/client_document_selection/code.html`
- `src/stitch_laibe_landing_onboarding/client_step_4_budget_finalization/code.html`
- `src/stitch_laibe_landing_onboarding/laibe_landing_desktop/code.html`
- `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html`
- `src/stitch_laibe_landing_onboarding/preview_budget/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/start_project_entry/code.html`
- `src/stitch_laibe_landing_onboarding/tender_notice/code.html`

### generators / scripts

- `generate_budget_preview.py`
- `generate_client_doc_preview.py`
- `generate_tender_notice.py`
- `generate_tender_setting.py`
- `generate_payment.py`

### plan-puzzle / budget implementation artifacts

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- `src/lib/budget/`
- `src/stitch_laibe_landing_onboarding/laibe_landing_desktop/code.backup_before_black_cement_home.html`
- `src/stitch_laibe_landing_onboarding/listing_fee_payment_unlock/`
- `src/stitch_laibe_landing_onboarding/pro_registration/`
- `src/stitch_laibe_landing_onboarding/tender_setting/`

說明：

- 以上檔案可能是網站主流程、平面拼圖、預算系統或先前 prototype Builder 的成果。
- 本輪不確認這些功能檔內容是否正確，也不把它們標記為已審查通過。
- 若要處理這些檔案，應交給對應 Builder 或 LAIBE_REVIEWER，而不是在 AI_ARCHITECT_CORE 直接修功能。

---

## 4. 封存搬移

目前 `git status` 中有多個 `D`，同時存在 `_archive/` 或 `docs/archive_md/` 對應封存資料。這些看起來屬於先前清理或封存搬移成果，本輪不還原、不刪檔、不移動。

### config specs

以下 `config/*.md` 顯示為 `D`，同名檔案可在 `docs/archive_md/config_specs/` 找到：

- `config/prompt_budget_agent.md`
- `config/prompt_clerk_agent.md`
- `config/prompt_guide_agent.md`
- `config/spec_ai_implementation_roadmap.md`
- `config/spec_line_context_bound_messaging.md`
- `config/spec_line_daily_digest.md`
- `config/spec_line_dual_track_routing.md`
- `config/spec_line_fido_escrow_engine.md`
- `config/spec_line_fido_watermark.md`
- `config/spec_line_ipcam_message_board.md`
- `config/spec_line_liff_dashboard_ai_loop.md`
- `config/spec_line_negotiation_engine.md`
- `config/spec_line_site_overview_aggregator.md`
- `config/spec_line_snapshot_calendar_api.md`
- `config/spec_line_vendor_liff_data_flow.md`
- `config/spec_line_war_room_tabs_api.md`
- `config/spec_openclaw_future_proofing.md`
- `config/spec_pcm_agent_gateway.md`
- `config/spec_pcm_intent_escrow.md`
- `config/spec_pcm_rbac_audit_trail.md`
- `config/spec_pcm_rules_rag_audit.md`
- `config/spec_pcm_tri_channel_escrow.md`
- `config/spec_vendor_global_dashboard_api.md`
- `config/spec_vendor_gps_temporal_lock.md`
- `config/spec_vendor_photo_centric_validation.md`

### old docs / old assets

- `docs/laibe_constitution.md` 顯示為 `D`，對應封存位置為 `docs/archive_md/old_docs/laibe_constitution.md`。
- `docs/laibe_project_plan.jpg` 與 `docs/laibe_project_plan.xlsx` 顯示為 `D`，可在 `_archive/cleanup_20260520/old_docs/` 找到對應封存檔。

### old HTML / tool exports

以下 `D` 檔案可在 `_archive/cleanup_20260520/old_versions/` 或 `_archive/cleanup_20260520/tool_exports/` 找到相近封存檔：

- `pcm_audit_panel.html`
- `phase_1_2_checklist.html`
- `rename_script.js`
- `stitch_export.zip`
- `test_plancraft_bridge.html`
- `turnkey_dashboard.html`

說明：

- 本文件只標記「看起來已有封存對應」，不等於宣告所有封存搬移都已由 Reviewer 通過。
- 若要清理這些 `D`，必須由使用者另行授權，不得由 Codex 自行 `git clean`、`git reset` 或刪除。

---

## 5. 仍屬未確認風險

以下項目仍需後續人工確認或 Reviewer 追蹤：

- `config.toml` 為 `??`，但 AGENTS 規則已明確說不要把 root `config.toml` 當安全 Codex runtime config。
- `assets/` 為 `??`，目前未在本輪確認素材來源、授權或是否屬正式資產。
- 根目錄中文檔名 `.docx` 為 `??`，目前未確認用途與 ownership。
- `pre_landing/` 為 `??`，目前未確認是否為 active flow、舊版 prototype 或封存候選。
- `_experiments/` 為 `??`，目前未確認是否可保留、封存或刪除。
- `src/lib/budget/` 與 `preview_floor_plan/plan-puzzle.js` 雖是重要成果，但本輪未審查功能正確性。
- `generate_*` Python 檔與 static HTML 檔仍有 `M`，本輪不確認是否與生成器 ownership 一致。

---

## 6. 結論

- 本輪不還原檔案。
- 本輪不刪除檔案。
- 本輪不執行 `git clean`。
- 本輪不執行 `git reset`.
- 本輪只提供 ownership 對帳，讓 LAIBE_REVIEWER 與後續 Builder 能判斷哪些檔案屬於治理成果、舊有 dirty、封存搬移或未確認風險。

