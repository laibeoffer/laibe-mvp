# NEXT_CODEX_HANDOFF.md

## Latest Plan Puzzle Task: Plancraft+ 平面拼圖引導官 MVP

- 本輪任務名稱：Plancraft+ 平面拼圖引導官 MVP。
- 任務類型：Builder / UI Interaction / Guide Assistant / plan-puzzle。
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- 新增檔案：無。
- 未修改：`C:\laibe_project\plancraft`、Plancraft core、budget runtime、`package.json`、`node_modules`、payment / escrow / listing fee。
- Guide data model：
  - `project.guide`: `enabled`, `mode: "local_rule_based"`, `apiBacked: false`, `disclaimerAccepted`, `currentStep`, `completedSteps`, `pendingSuggestions`, `resolvedSuggestionIds`, `lastUpdatedAt`。
  - `project.guideLog[]`: `id`, `role`, `type`, `text`, `layer`, `selectedObjectId`, `selectedObjectType`, `relatedReminderIds`, `createdAt`, `savedToRequirements`。
  - `project.requirementNotes[]`: `source: "guide"`, `text`, `category`, `layer`, `relatedObjectId`, `priority`, `includeInSummary`, `createdAt`。
  - `project.guideSummary`: `userIntent`, `uncertainties`, `budgetRelevantNotes`, `contractorQuestions`, `generatedAt`。
- Local rule-based guide 行為：
  - 右側狀態區新增「平面拼圖引導官」對話面板、輸入框、送出按鈕、9 個快速問題、引導流程按鈕、狀態摘要、圖層切換、提醒清單與提醒動作。
  - 本地 `GUIDE_KNOWLEDGE` 支援開始、匯入底圖、校正比例、畫牆、牆狀態 / 拆牆、標尺寸、門窗、櫃體 / 廚具、圖層、施工圖邊界、預算候選、總預覽、照片、清運、防水、廚房插座 / 給排水、空調、不確定事項、廠商建議、專業確認、AI 風格示意、正式報價邊界與廠商可讀性。
  - 引導流程包含開始、屋況、舊屋追問、主要需求、預算偏好、圖面提醒、需求摘要。
  - fallback 會以不確定事項寫入 `requirementNotes`，提醒後續請廠商或萊比確認。
- 連動狀態：
  - `currentLayer` 會回覆 floor / demolition / flooring / lighting / ac 的本地建議。
  - `selectedObject` 會針對 wall / opening / zone / issue 回覆物件用途、預算候選、缺漏資料與專業確認提醒。
  - `systemReminders` 會讀現有 `project.systemReminders`，並用本地 generator 補出底圖、比例、空間名稱、材料等級、拆除清運、浴室防水、廚房插座 / 給排水、空調條件、牆線 issue、專業確認等提醒。
- 匯出狀態：
  - Plancraft+ draft JSON 匯出包含 `guide`、`guideLog`、`requirementNotes`、`guideSummary`。
  - `guideLog` / `requirementNotes` / `guideSummary` 只作需求整理與招標溝通摘要，不是正式 quantity，不進 `generateBudgetEstimate`，不解除 `formalEstimateGuard`，不使 `productionReady` 變 true。
- 未接真實 LLM API；未接 OpenAI API；未接 image API；未新增 API key、backend、production storage 或 package / framework。
- 驗證：
  - `node --check src\stitch_laibe_landing_onboarding\preview_floor_plan\plan-puzzle.js` 通過。
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html` 檔案存在，可由 file:// 靜態開啟。
  - Browser console 互動驗證未完成；in-app Browser / node_repl 連線在本沙盒回報 `windows sandbox failed: spawn setup refresh`，沒有進到頁面本身。
- Need Commander：Yes，因本輪影響使用者行動線、問答內容、需求記錄與產品體驗。
- Need Reviewer：No，因本輪未修改 budget runtime、guard 或 Plancraft core；guide 欄位僅屬 Plancraft+ draft JSON 需求紀錄。
- 下一步唯一建議：Commander 確認引導官問答語氣、流程順序與產品定位後，再開下一輪 UX / copy / review 調整。

## Latest MethodSpec Documentation Task: Validator Freeze Note

- 本輪任務名稱：MethodSpec validator freeze note。
- GitHub Issue：#16 `[MethodSpec] Add validator freeze note`。
- 任務類型：Documentation / Governance checkpoint；本輪只整理 MethodSpec validator 狀態與邊界，不修改 runtime code。
- 新增檔案：
  - `docs/budget/32-method-spec-validator-freeze-note.md`
- 修改檔案：
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- 未修改：`src/lib/budget/specs/`、`src/lib/budget/output/`、`src/lib/budget/renderers/`、`src/lib/budget/raw-warehouse/`、`src/lib/budget/intake/`、frontend、preview floor plan、plan-puzzle、payment / escrow / listing fee。
- 目前凍結狀態：PR #4 merged；P0 / P1-A / P1-B MethodSpec validator work complete；MS-12 reviewer verdict is `PASS_WITH_NOTES`。
- `PASS_WITH_NOTES` 只因歷史 dirty / untracked repo baseline，非 validator boundary failure。
- Frozen invariants：AI / RAG / raw candidate data 不得直接成為正式價格；`LaborRule` remains reference-only；`MaterialSpec` / `ItemMaterialBinding` / `NoteTemplate` / `InclusionExclusionRule` 不得改 `unit_price`、`amount` 或 `quantity`。
- UnitConversion coverage remains warning-only and must not rewrite generated quantities.
- Inclusion / Exclusion scope coverage remains warning / allowed-condition only and must not propagate directly to renderer or output.
- Regression baseline remains: total amount `231103`, budget line count `12`, review-required line count `5`.
- 下一步建議：若繼續 MethodSpec，應另開 formal Issue 做 P2 validator planning 或 clean worktree / file ownership proof；不得從本文件直接進 formal price、renderer、raw warehouse publishing 或 schema expansion。

## Latest Governance Task: Strategic Plan Imported / Dispatch Source Clarified

- 本輪任務名稱：Strategic Plan Imported / Dispatch Source Clarified。
- 任務類型：Governance / Documentation / Dispatch Rules；本輪只整合指揮官校正版戰略計畫，不修改功能程式碼。
- 新增檔案：
  - `docs/LAIBE_CODEX_STRATEGIC_PLAN.md`
- 修改檔案：
  - `AGENTS.md`
  - `AI_RULES/CODEX_MANDATORY_ENTRY.md`
  - `AI_RULES/TASK_DISPATCH_RULES.md`
  - `docs/CHATROOM_GITHUB_WORKSTREAMS.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/WORKSTREAM_BLACKBOARD.md`
- 整合重點：
  - 將「預算生成系統」明確拆回三倉：`warehouse/raw-candidate`、`warehouse/method-spec`、`output/budget-documents`。
  - 獨立標示平面拼圖三層、模擬圖生成、外部 Quote Factory / 預算原料清洗工作線，避免混線。
  - 明確化 GitHub Issue = 派工單、Blackboard = 戰情板、Heartbeat = 巡邏員。
  - 副指揮官派工必須有 `To: Agent`，不得只寫 workstream / branch / repo。
- 未修改檔案：
  - 未修改 `src/`、budget implementation、plan-puzzle、renderer、payment、AI API、`.env` 或任何 secrets。
- 已知風險：
  - 既有主工作樹仍有其他聊天室造成的大量 dirty / untracked 狀態；本輪在乾淨黑板發布 worktree 中進行 docs-only 整合，避免覆蓋他人改動。
- Need Commander: No，這是使用者提供的戰略計畫落檔與治理索引。
- Need Reviewer: No，除非後續要求審查治理文件一致性。

## Latest Patrol Task: Quote Factory PR #2 Merged / Triage Queue Initialized

- 本輪任務名稱：Quote Factory PR #2 Merged / Triage Queue Initialized。
- 任務類型：Governance / Patrol / External Repo Merge Gate / Triage Support；本輪只處理 GitHub PR gate、黑板、handoff、執行官 inbox 與分流隊列，不修改 `laibe-mvp` 功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/deputy_execution_patrol/EXECUTIVE_PATROL_INBOX.md`
- 新增檔案：
  - `docs/deputy_execution_patrol/TRIAGE_QUEUE.md`
- GitHub / blackboard state checked from helper worktree after fast-forward to `3fce287be402fe9981b6a7fe33d2be8b7839e350`.
- Quote Factory PR #2 `Add PriceRange audit override contract`:
  - Repo: `laibeoffer/laibe-quote-factory`.
  - Changed files stayed inside Quote Factory candidate-governance scope.
  - Codex review result: no major issues.
  - Review threads: none.
  - Validation / boundary checks reported: `apply_price_range_review_overrides.py`, `validate_price_ranges.py`, `validate_sample_cloud_payload.py`, no formal price / `PricingRule` / `BudgetEstimateLine.unit_price`, no Supabase / API / migration.
  - Merge result: merged with merge commit `d075c505d0e950ca288e8d374bdf2efc6b447105`.
  - Quote Factory Issue #1 is closed by the merge.
- Deputy decision:
  - QF5.3 is complete and published in the external Quote Factory repo.
  - Next Quote Factory task may be QF5.4 dry-run / governance only through a new scoped Issue / dispatch.
  - No Commander escalation.
  - No Reviewer escalation.
- Still active follow-up:
  - Plan Puzzle Issue #15: no expected branch / PR / claim / validation / blocker found.
  - Raw Candidate Issue #17: no expected branch / PR / claim / candidate-only validation / blocker found.
  - Output Documents PR #23: Codex P2 remains unresolved; Need Reviewer remains Yes until fixed and re-reviewed.
- Triage queue initialized so the Triage Officer can route lagging workstreams through a file-based queue instead of chat-only state.

## Latest Patrol Task: Executive Officer Callouts Processed

- 本輪任務名稱：Executive Officer Callouts Processed。
- 任務類型：Governance / Patrol / Executive Inbox Decision；本輪只處理執行官 inbox、黑板與 handoff，不修改功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/deputy_execution_patrol/EXECUTIVE_PATROL_INBOX.md`
- 新增檔案：無。
- GitHub / blackboard state checked from helper worktree after fast-forward to `87d0941eeec374a21477e6d2a042329e4719c9ca`.
- Executive Officer correctly published second-patrol callouts for:
  - Plan Puzzle Issue #15: no PR URL / claim / validation / blocker; branch `plancraft/zone-area-boundary-refinement` not found.
  - Raw Candidate Issue #17: no PR URL / claim / candidate-only validation / blocker; branch `warehouse/raw-source-quality-scoring` not found.
  - Quote Factory Issue #1: branch `qf/qf5-3-audit-override-publish` exists and appears to contain unreported progress, but no PR URL / validation / formal-pricing / Supabase/API/migration checks were reported.
- Deputy decision:
  - Accepted Executive Officer callouts.
  - Moved the three inbox items from pending to processed.
  - No Commander escalation yet.
  - No Reviewer escalation yet.
  - Executive Officer should continue first-line chase for one more patrol cycle.
  - If Quote Factory still provides no PR / blocker on the next patrol, Deputy may verify branch scope and repair the PR workflow if needed.

## Latest Governance Task: Executive Officer Limited Delegation

- 本輪任務名稱：Executive Officer Limited Delegation。
- 任務類型：Governance / Patrol Support / Delegation；本輪只更新黑板、handoff，並建立執行官與副指揮官的專用溝通資料夾，不修改功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：
  - `docs/deputy_execution_patrol/README.md`
  - `docs/deputy_execution_patrol/EXECUTIVE_PATROL_INBOX.md`
- Commander asked whether Executive Officer needs clearer rules for reporting, named communication, what must route through Deputy Codex, and whether Executive Officer should receive partial authority / assigned chatrooms.
- Deputy decision:
  - Executive Officer is a patrol executor for Deputy Codex, not a second Deputy and not a replacement Commander.
  - Executive Officer may directly chase assigned workstreams, comment on assigned Issues / PRs, and publish concise `EXECUTIVE_FOLLOW_UP`, `EXECUTIVE_CALL_OUT`, or `EXECUTIVE_STATUS_CHECK` entries to `docs/WORKSTREAM_BLACKBOARD.md`.
  - Executive Officer must route PR merge / reject, Issue close / reopen, final `Need Commander` / `Need Reviewer`, new formal dispatch outside active Issue scope, cross-workstream reassignment, and high-risk scope back to Deputy Codex.
  - Dedicated inbox for Deputy decisions: `docs/deputy_execution_patrol/EXECUTIVE_PATROL_INBOX.md`.
- Assigned Executive Officer patrol ownership:
  - Plan Puzzle Issue #15.
  - Raw Candidate Issue #17.
  - Quote Factory Issue #1.
  - MethodSpec Issue #16 / PR #22 conflict and review follow-up.
  - Output Documents Issue #18 / PR #23 P2 fix follow-up.
- Need Commander: No.
- Need Reviewer: No.

## Latest Patrol Task: PR #23 Codex Review P2 Recorded

- 本輪任務名稱：PR #23 Codex Review P2 Recorded。
- 任務類型：Governance / Patrol / PR Review Gate；本輪只處理 GitHub PR review 狀態、PR 留言、黑板與 handoff，不修改功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- GitHub state checked before this patrol publication: `main` sha `1d0d6ecc266a6302e2cf32c2b20e8fd04065bc15`。
- PR #23 `Add renderer snapshot-only review packet`:
  - Codex review result: P2 on `src/lib/budget/renderers/formal-file-writer-policy.ts`.
  - Review issue: `inferFormalArtifactFormat()` can accept mismatched `renderer` / `format` and infer the wrong artifact format instead of failing closed.
  - Current PR state: open, not mergeable, head `5ffd0f3e737960b386695d25ad5d0fc4d71a62c2`.
  - Changed files remain in Output Documents renderer / docs scope, but P2 blocks merge.
- Deputy action:
  - Added a PR #23 comment and Issue #18 status update instructing Output Documents to fix renderer / format mismatch handling, preserve snapshot-only boundaries, re-sync latest `main`, rerun checks, and request Codex re-review.
  - Updated `docs/WORKSTREAM_BLACKBOARD.md` so PR #23 is marked `NEEDS_FIX / P2`.
  - Updated `laibe-commander-patrol` heartbeat prompt to remove stale hardcoded Issue #19 active-state guidance and require current GitHub / blackboard verification every patrol.
- Need Commander: No.
- Need Reviewer: Yes until the P2 is fixed and re-reviewed.

## Latest Patrol Task: PR #24 Merged After Clean Codex Review

- 本輪任務名稱：PR #24 Merged After Clean Codex Review。
- 任務類型：Governance / Patrol / PR Merge Gate；本輪只依授權處理 clean-scope PR merge，並更新黑板 / handoff，不修改功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- GitHub state checked before this patrol publication: `main` sha `cf170e248a48be2df43f6cd6e6db0ef956cd5658`。
- PR #24 `Add visual prompt sandbox governance packet`:
  - Codex review result: no major issues.
  - Mergeability before merge: mergeable.
  - Changed files: Visual Simulation governance / prompt sandbox docs, `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`, `skills/laibe-visual-sim/SKILL.md`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`, and `docs/NEXT_CODEX_HANDOFF.md`.
  - Forbidden scope check: no website runtime code, no `plan-puzzle.js`, no Plancraft, no budget / raw warehouse / MethodSpec / renderer, no payment / escrow / listing fee, no real image API, no API key / `.env`, no backend / proxy / upload pipeline, no production storage.
  - Merge result: merged with merge commit `cf170e248a48be2df43f6cd6e6db0ef956cd5658`; Issue #19 closed by the merge.
- Current open PRs after merge:
  - PR #22 remains conflict-gated.
  - PR #23 remains latest-blackboard-sync / review-gated and must re-sync against latest `main` before merge.
- Current silent workstreams still under follow-up: Plan Puzzle Issue #15, Raw Candidate Issue #17, and Quote Factory Issue #1 need PR URL, active claim, or exact blocker.
- Need Commander: No.
- Need Reviewer: No.

## Latest Visual Simulation Governance Task: Visual Brief Prompt Sandbox Governance Packet

- 本輪任務名稱：Visual Brief Prompt Sandbox Governance Packet。
- 任務來源：GitHub Issue #19 `[Visual Simulation] Add visual brief prompt sandbox governance packet`。
- 任務類型：Documentation / Governance / Prompt Brief；本輪只更新 LAIBE_VISUAL_SIM 的 visual brief、prompt、negative prompt、sandbox policy、storage policy 與 reviewer packet 文件。
- 新增檔案：
  - `docs/ai_style_visual_chat/VISUAL_BRIEF_PROMPT_SANDBOX_PACKET.md`
- 修改檔案：
  - `docs/ai_style_visual_chat/PROMPT_SANITIZATION_RULES.md`
  - `docs/ai_style_visual_chat/IMAGE_API_REQUEST_SCHEMA.md`
  - `docs/ai_style_visual_chat/GENERATED_IMAGE_STORAGE_POLICY.md`
  - `docs/ai_style_visual_chat/IMAGE_API_SPIKE_REVIEW_CHECKLIST.md`
  - `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`
  - `skills/laibe-visual-sim/SKILL.md`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 本輪沒有修改網站 runtime code、`plan-puzzle.js`、Plancraft core、budget、raw warehouse、MethodSpec、renderer、routing、CTA、Header、payment、escrow 或 listing fee。
- 本輪沒有接真 image API，沒有建立 backend / proxy / upload pipeline，沒有新增 API key、`.env`、package、node_modules 或 production storage。
- `VISUAL_BRIEF_PROMPT_SANDBOX_PACKET.md` 定義 visual brief 必備欄位、prompt preview 降溫語氣、negative prompt 必備排除項、sandbox preview workflow、placeholder visual card 規格、Builder 整合邊界與 Reviewer 檢查重點。
- `styleVisualApiRequest` contract 維持白名單欄位：`roomType`、`primaryStyle`、`secondaryStyle`、`colorTone`、`materialTone`、`budgetLevel`、`purpose: "bid-listing-style-reference"`、`disclaimerRequired: true`、`referenceImage: { allowed: false, reason: "reference image upload requires separate privacy review" }`。
- `styleVisualApiRequest` 不得包含 `rawPrompt`、`systemPrompt`、`developerPrompt`、`projectId`、`avoid`、`walls`、`openings`、`zones`、`scale`、`plancraftBridge`、正式預算資料、reference image file 或使用者私宅圖片。
- Prompt 必須由系統 template 組裝，不得直接使用 raw user prompt；negative prompt 必須阻擋施工圖、正式設計圖、真實案例、正式報價依據、完工保證、精準尺寸、材料品牌保證與法規符合宣稱。
- Generated preview 只能是 sandbox / mock / temporary preview；不得寫入正式案件資料、production assets、budget data、export JSON、Plancraft geometry 或 case dashboard。
- 固定 disclaimer 必須保留：`本圖僅為風格示意，用於案件上架與溝通參考，不代表最終設計、施工圖、實際尺寸、工法、材料品牌或正式報價內容。`
- 下一步若繼續 visual simulation，仍只能處理 visual brief / prompt / negative prompt / governance。任何真 API、reference image upload、production storage、正式圖片用途或 server runtime 都需要新的 formal Issue 並視情況標示 Need Commander: Yes。

## Latest Governance Task: Codex Rules Support Patrol Assigned

- 本輪任務名稱：Codex Rules Support Patrol Assigned。
- 任務類型：Governance / Patrol Support / Prompt Drift Audit；本輪只更新黑板與 handoff，不修改功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- Commander offered Codex 指令優化 / `governance/codex-rules` as a helper that can check the blackboard every 20 minutes.
- Deputy Codex accepted this helper only as governance / prompt-drift support, not Builder work, not Reviewer work, and not Deputy replacement.
- New helper responsibilities:
  - read blackboard and governance docs,
  - detect prompt drift, heartbeat wording drift, dispatch-format gaps, stale workstream routing, and missing blackboard rule coverage,
  - report `PROMPT_DRIFT_FOUND`, `BLACKBOARD_RULE_GAP_FOUND`, `DISPATCH_FORMAT_GAP_FOUND`, `HEARTBEAT_WORDING_GAP_FOUND`, or `NO_GOVERNANCE_ACTION_NEEDED`,
  - propose concise corrections for Deputy Codex to decide / publish.
- Forbidden for this helper: source-code edits, Builder task implementation, PR merge/reject, Issue open/close without Deputy request, product/visual/business decisions, secrets, payment, formal price, formal Excel/PDF, real AI API, upload, destructive git.
- Deputy Codex remains final routing and blackboard publication authority.

## Latest Patrol Task: Direct Workstream Callouts / PR Conflict Comments

- 本輪任務名稱：Deputy Patrol Direct Workstream Callouts / PR Conflict Comments。
- 任務類型：Governance / Patrol / Workstream Supervision；本輪只更新黑板、handoff，並在 GitHub Issue / PR 留下副指揮官巡檢留言，不修改功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- GitHub state checked before this patrol publication: `main` sha `33bf191deb7b392ed0fa56e0497a4629abd09fb5`。
- Reviewer inbox had no pending findings.
- Open PRs remain:
  - PR #22 `Add MethodSpec validator freeze note` - conflict-gated by `docs/NEXT_CODEX_HANDOFF.md`; Deputy conflict comment added.
  - PR #23 `Add renderer snapshot-only review packet` - conflict-gated by `docs/NEXT_CODEX_HANDOFF.md` and `docs/WORKSTREAM_BLACKBOARD.md`; Deputy conflict comment added.
  - PR #24 `Add visual prompt sandbox governance packet` - conflict-gated by `docs/NEXT_CODEX_HANDOFF.md`; Deputy conflict comment added.
- No Codex review comments or review threads were found before Deputy patrol comments were added.
- Direct no-idle / table-compliance callouts were added to:
  - Issue #15 Plan Puzzle
  - Issue #17 Raw Candidate
  - Quote Factory Issue #1
- Output Documents PR #23 branch contained a local blackboard `TASK_REQUESTED` asking for the next formal dispatch. Deputy decision: no next Output Documents formal dispatch until PR #23 is merged, explicitly closed, or re-scoped.
- Need Commander: No.
- Need Reviewer: No unless future conflict resolution changes scope, touches forbidden files, or Codex review reports NEEDS_FIX / P1 / P2.

## Latest Patrol Task: Reviewer Inbox Findings Processed

- 本輪任務名稱：Reviewer Inbox Findings Processed by Deputy。
- 任務類型：Governance / Patrol / Reviewer Secretary Intake；本輪只處理審查官 inbox 發現，不修改功能程式碼。
- 修改檔案：
  - `docs/deputy_reviewer_patrol/REVIEWER_PATROL_INBOX.md`
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 審查官本輪回報三筆 findings：
  1. Current Global State 顯示 Open PR / Open Issue 為 None 的 stale blackboard 問題。
  2. PR #22/#23/#24 無 PR comments / review threads 且不 mergeable 的 PR review gate 問題。
  3. Plan Puzzle 疑似引用 duplicate Issue #20 的 table compliance 問題。
- 副指揮官裁決：
  - Finding 1 已由 commit `3f07253` 修正；最新 `main` 已列出 PR #22/#23/#24、Issues #15-#19、Quote Factory Issue #1。
  - Finding 2 確認仍成立；PR #22/#23/#24 不 merge，等各 owner workstream 更新 latest `main`、保留 Deputy / reviewer patrol entries、解 conflict、回報 review / conflict-resolution status。
  - Finding 3 在最新 `origin/main` 未重現；Issue #20 只作為 duplicate closed 記錄，Plan Puzzle canonical task 仍是 Issue #15。此 finding 視為 stale local state。
- Reviewer inbox 現在保留 processed decision 記錄；目前沒有需要 Commander 裁決的 pending reviewer finding。
- Commander has configured the reviewer secretary heartbeat to run hourly; blackboard current sections now reflect hourly reviewer secretary / patrol support.
- Next Deputy action: 續巡 PR #22-#24；若審查官下次再上報，先核對它是否讀到最新 `origin/main`，再決定是否發布黑板。

## Latest Patrol Task: PR Conflict Recheck / Reviewer Cadence Wording Sync

- 本輪任務名稱：Deputy Patrol PR Conflict Recheck / Reviewer Cadence Wording Sync。
- 任務類型：Governance / Patrol / Documentation；本輪只更新黑板狀態與審查官巡檢規則文字，不修改功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- GitHub state rechecked: `main` latest sha is `6eb6e95cbd1c7dee0f87617381dbfa637a28123b`.
- Open PRs remain #22, #23, #24. Each stays inside its expected workstream scope, has no PR comments / review threads, and is still conflict-gated against latest `main`.
- Active Issues remain #15-#19 in `laibeoffer/laibe-mvp` and #1 in `laibeoffer/laibe-quote-factory`.
- `docs/deputy_reviewer_patrol/REVIEWER_PATROL_INBOX.md` has no pending reviewer findings at this handoff point.
- Corrected `Reviewer Patrol Support Rule` wording in the blackboard; it now reflects the latest hourly reviewer secretary / patrol cadence configured by Commander.
- Next Deputy action: keep watching PR #22-#24 for conflict-resolution updates, Codex review comments, or scope changes; publish any new decision to the blackboard before reporting to Commander.

## Latest Governance Task: Reviewer Patrol Support

- 本輪任務名稱：Reviewer Patrol Support for Deputy Codex。
- 任務類型：Governance / Automation / Documentation；本輪只更新黑板與審查官 heartbeat，不修改功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無；此段已由下方 `Reviewer Patrol Inbox` 段落補充固定交付檔案。
- Commander initially authorized LAIBE_REVIEWER to wake every 3 hours as read-only patrol support for Deputy Codex; current correction / stabilization cadence is now hourly.
- LAIBE_REVIEWER remains `none-review-only`; it may audit active Issues / PRs / Codex review results / blackboard entries for review triggers, table-compliance failures, missed progress, duplicate routing, no-idle violations, and high-risk scope.
- LAIBE_REVIEWER must not implement, edit files, open / close Issues, merge / reject PRs, dispatch Builder tasks, make product decisions, or read / expose secrets.
- Expected reviewer patrol results: `NO_REVIEW_TRIGGER`, `REVIEW_TRIGGER_FOUND`, `PATROL_RISK_FOUND`, `TABLE_COMPLIANCE_FAIL`, or `MISSED_PROGRESS_BACKFILL_REQUIRED`.
- Deputy Codex remains the sole active Deputy and final routing / blackboard publication authority.
- Automation updated: `laibe-reviewer-heartbeat` was first set to 3-hour read-only patrol support; current 2-hour inbox-based prompt is recorded below.

## Latest Governance Task: Reviewer Patrol Inbox

- 本輪任務名稱：Reviewer Patrol Inbox for Deputy Decision。
- 任務類型：Governance / Automation / Documentation；本輪只新增審查官巡檢交付資料夾與黑板規則，不修改功能程式碼。
- 新增檔案：
  - `docs/deputy_reviewer_patrol/README.md`
  - `docs/deputy_reviewer_patrol/REVIEWER_PATROL_INBOX.md`
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- Reviewer patrol findings now have a dedicated file handoff lane.
- LAIBE_REVIEWER may append decision-worthy findings only to `docs/deputy_reviewer_patrol/REVIEWER_PATROL_INBOX.md` with `Status: PENDING_DEPUTY_DECISION`.
- LAIBE_REVIEWER must not update `docs/WORKSTREAM_BLACKBOARD.md` directly, must not edit source code, and must not open / close Issues, merge PRs, dispatch Builder tasks, or make product decisions.
- Deputy Codex reads the inbox, decides whether action is needed, and publishes official decisions to `docs/WORKSTREAM_BLACKBOARD.md`.
- Reviewer heartbeat cadence is now hourly during the correction / stabilization period.

## Latest Governance Task: Issue / Blackboard / Heartbeat Patrol Workflow

- 本輪任務名稱：Issue / Blackboard / Heartbeat Patrol Workflow。
- 任務類型：Governance / Documentation；本輪只更新 GitHub 工作流治理文件，不修改功能程式碼。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/CHATROOM_GITHUB_WORKSTREAMS.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：
  - `docs/ISSUE_BLACKBOARD_PATROL_WORKFLOW.md`
- 目的：把 GitHub Issue、戰情黑板與各聊天室 heartbeat 巡邏制度正式寫入 repo 文件。
- 核心規則：GitHub Issue = 正式派工單；PR = 完工驗收單；`docs/WORKSTREAM_BLACKBOARD.md` = 戰情黑板；thread heartbeat 只能喚醒目前聊天室，不能喚醒其他聊天室。
- Deputy Codex 派工必須包含：`To`、`Workstream`、`Branch / Repo`、`Mission`、`Why this agent`、`Action`、`Need Commander`、`Need Reviewer`。
- 派工不可只寫 branch、不可只寫 workstream、不可丟給「大家」；跨線任務要指定主責 agent，其他工作線只列 reference。
- `Need Commander` 預設 No，只在產品方向、視覺方向、商業邏輯、正式金流 / escrow / listing fee、真 AI API、正式價格、正式 Excel/PDF 或其他高風險決策時設 Yes。
- `Need Reviewer` 預設 No，只在 Codex review NEEDS_FIX / P1 / P2、高風險範圍、明確審查需求、routing / CTA / header 或資料模型邊界時設 Yes。
- 本輪沒有修改 `src/`、網站頁面、`app/`、`components/`、`assets/`、budget engine、Plancraft core、payment、escrow、listing fee、real AI API、upload backend 或 secrets。
- PR #12 Issue template 已 merged；本輪後續由 PR #13 追蹤 patrol workflow 文件化。

## Latest Documentation Task: Plancraft+ Production Adapter Design Doc

- 本輪任務名稱：Plancraft+ Production Adapter Design Doc。
- 任務類型：Design Doc / Contract Planning / No Runtime Implementation；本輪只做 production adapter 設計文件與交接文件更新。
- 新增檔案：
  - `docs/budget/plancraft-plus-production-adapter-design.md`
- 修改檔案：
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 未修改：`C:\laibe_project\plancraft`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`src/lib/budget/adapters/preview-floor-plan-adapter.ts`、`src/lib/budget/types.ts`、`src/lib/budget/budget-generator.ts`、`src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`。
- 沒有新增 `package.json`、`node_modules`、React / Vite / TypeScript app、後端 API、AI API、Excel / PDF、DB migration、payment / escrow / listing fee。
- 沒有把 Plancraft+ adapter 升級成 production；沒有解除 `productionReady: false`；沒有解除 `formal_estimate_generation` blocked guard；沒有修改 `generateBudgetEstimate()` 正式估價邏輯。
- 設計文件明確定義：Plancraft+ production adapter 只能讀 Plancraft+ draft JSON；`.pc` converter output、SVG、renderer preview、underlay image data、AI style visual preview 都不得作為 budget input。
- 設計文件定義 production input contract：`product === "Plancraft+"`、`unit === "mm"`、version range、scale calibrated、valid `nodeGraph.edges`、closed zone boundary、valid polygon、valid openings、wall status/provenance 與 forbidden input。
- 設計文件定義 zones → production `Space` 的條件：closed boundary、valid edge ids、valid polygon、approved area、areaSource / areaConfidence / reviewer status；未封閉或 estimated-only 仍只能是 candidate。
- 設計文件定義 area policy：可在封閉 polygon 上用 shoelace formula，保留 `area_mm2`、`area_m2`、`area_ping`、rounding rule 與 formula；未封閉 boundary 不得進正式面積。
- 設計文件定義 `nodeGraph.edges` → wall facts 的條件：length / thickness / status / structural / sourceWallId / edgeId / from / to 都必須保留；new / demolished / structural wall 需 reviewer confirmation。
- 設計文件定義 openings → door / window / opening facts 的條件：valid edgeId、offset / width 驗證、height / sillHeight / swing policy；invalid 或 missing edge 只能 candidate。
- 設計文件定義 furniture / object future contract，但明確標記目前 Plancraft+ furniture / object placement unsupported，不能產生 production `LayoutObject`。
- 設計文件定義 guard model：保留 `productionReady`、`adapterMode`、`formalEstimateGuard`、candidate vs production、provenance、unsupported、warnings、blocked reason codes。
- 設計文件定義 downstream safety：`generateBudgetEstimate()` 只能接受 production-ready input；spike input、candidate facts、blocked formal guard 必須被拒；Excel / PDF writer 只能讀 snapshot，不得讀 Plancraft+ draft 或重跑 budget engine。
- 設計文件列出 migration plan：P1 Design Doc、P2 Zone Area / Boundary Refinement、P3 Production Quantity Fact Contract、P4 Reviewer-gated Production Adapter、P5 Formal Estimate Dry-run、P6 Excel / PDF Writer Integration。
- 下一步若繼續施工，建議先做 Zone Area / Boundary Refinement 或 Production Quantity Fact Contract；若要進入 production adapter 前，可由使用者視需要交給 LAIBE_REVIEWER 做階段審查。

## Previous Builder Task: Plancraft+ Budget Adapter Guard Hardening - Required Fix

- 本輪任務名稱：Plancraft+ Budget Adapter Guard Hardening - Required Fix。
- 任務類型：Builder / Minimal Fix / Budget Safety；只修 Reviewer `NEEDS_CHANGES` 指出的 null / malformed input crash，不進 production adapter。
- Reviewer blocker：`normalizeFloorPlanToBudgetInput(null)` 會在 `isPlancraftPlusDraft()` 讀取 `product` 時 TypeError。
- 修改檔案：
  - `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 未修改：`C:\laibe_project\plancraft`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`laibe_landing_desktop/code.html`。
- 沒有新增 `package.json`、`node_modules`、React / Vite / TypeScript app、後端 API、AI API、Excel / PDF、DB migration、payment / escrow / listing fee。
- `preview-floor-plan-adapter.ts` 已新增 `isRecord(value)` guard：只有非 null、object、非 array 的值才會進 Plancraft+ 或 legacy shape 判斷。
- `isPlancraftPlusDraft()` 現在先檢查 object guard；`null`、`undefined`、string / number / boolean、array 不會 crash，也不會被誤判為 Plancraft+。
- 新增 `isLegacyPreviewFloorPlanDraft()` / `isValidPreviewFloorPlanRoom()`，避免 malformed object 僅因存在 `rooms` 就進 legacy path。
- `normalizeUnsupportedFloorPlanInput()` 現在接收 `unknown`，對未知或 malformed input 回傳 `source: "unknown_floor_plan_draft"`、`adapterMode: "unsupported"`、`productionReady: false`，並帶 machine-readable blocked formal estimate guard。
- smoke cases 已補進 `demo-generate-budget-from-preview-floor-plan.ts`：`null_input`、`undefined_input`、`string_input`、`zones_only`、`pc_only`、`valid_plancraft_plus`、`legacy_input`。
- 驗收：
  - `node --experimental-strip-types --check src/lib/budget/adapters/preview-floor-plan-adapter.ts` 通過。
  - `node --experimental-strip-types --check src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過。
  - `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過。
  - inline smoke 通過：null / undefined / string 不 crash；zones_only / pc_only 不誤判；valid Plancraft+ 被辨識且被 `plancraft_plus_formal_estimate_blocked` 阻止；legacy input 仍可產生既有 mock estimate。
- 未完成事項：Plancraft+ budget adapter 仍是 spike；candidate facts 仍不得進正式估價；`.pc` / SVG / renderer preview 仍不得作 budget input；尚未做 production adapter design。
- 可供後續 Reviewer re-check；不要把本修正解讀為 production adapter 通過。

## Previous Builder Task: Plancraft+ Budget Adapter Guard Hardening

- 本輪任務名稱：Plancraft+ Budget Adapter Guard Hardening。
- 任務類型：Builder / Guard Hardening / Budget Safety；只做 guard hardening，不是 production adapter。
- 指派角色：Builder / Codex；允許施工範圍限 budget adapter / guard / demo / phase packet / handoff。
- Reviewer 前一輪結論為 `PASS_WITH_NOTES`；production blocker 是 `productionReady: false` / `formal_estimate_generation` 仍偏 metadata，downstream 直接呼叫 `generateBudgetEstimate(normalized.project)` 仍可能產生 mock estimate。
- 修改檔案：
  - `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `src/lib/budget/types.ts`
  - `src/lib/budget/budget-generator.ts`
  - `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 未修改：`C:\laibe_project\plancraft`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`laibe_landing_desktop/code.html`。
- 沒有新增 `package.json`、`node_modules`、React / Vite / TypeScript app、後端 API、AI API、Excel / PDF、DB migration、payment / escrow / listing fee。
- Plancraft+ detection 已收窄：必須同時滿足 `product === "Plancraft+"`、`unit === "mm"`、`version` 為字串、存在 `scale`、存在 `plancraftBridge`、`plancraftBridge.targetFormat === ".pc"`，且 `nodeGraph.edges` / `zones` / `openings` 至少之一為 array；`walls` / `furniture` 若存在必須為 array。
- 不再只因為資料帶 `zones`、`openings` 或 `.pc targetFormat` 就判斷為 Plancraft+；legacy draft 不應被誤判。
- Plancraft+ adapter output 新增 `formalEstimateGuard`：
  - `blocked: true`
  - `status: "blocked"`
  - `reason: "plancraft_plus_adapter_spike"`
  - `code: "plancraft_plus_formal_estimate_blocked"`
  - `productionReady: false`
- `project.user_requirements.formal_estimate_generation` 已升級為 machine-readable guard object；另保留 `formal_estimate_generation_status: "blocked"` 作最小相容。
- `generateBudgetEstimate()` 入口已呼叫 `assertBudgetInputProductionReady(project)`；若輸入帶 `productionReady === false`、`adapter_mode === "plancraft_plus_spike"` 或 `formal_estimate_generation.status === "blocked"`，會丟出受控 `BudgetEstimateBlockedError`，reason code 為 `plancraft_plus_formal_estimate_blocked`。
- 新增 helper：`isFormalEstimateBlocked(project)`、`assertBudgetInputProductionReady(project)`；下游若不直接呼叫 generator，也可先用 helper 檢查。
- `demo-generate-budget-from-preview-floor-plan.ts` 現在同時展示：
  - legacy preview-floor-plan input 仍可產生既有 mock estimate。
  - Plancraft+ normalized output 固定 `productionReady: false`，且嘗試進入 `generateBudgetEstimate()` 時會被 guard 阻止。
- warnings 保留：`plancraft_plus_adapter_spike`、`plancraft_plus_area_not_calculated`、`plancraft_plus_openings_candidate_only`、`plancraft_plus_furniture_not_supported`、`plancraft_plus_pc_not_budget_input`、`plancraft_plus_svg_not_budget_input`、`plancraft_plus_formal_estimate_blocked`、`plancraft_plus_zone_boundary_not_closed`、`plancraft_plus_opening_edge_missing`、`plancraft_plus_edge_length_invalid`。
- 驗收：
  - `node --experimental-strip-types --check src/lib/budget/types.ts`
  - `node --experimental-strip-types --check src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `node --experimental-strip-types --check src/lib/budget/budget-generator.ts`
  - `node --experimental-strip-types --check src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - inline smoke：Plancraft+ blocked、unknown zones/openings-only draft 不誤判為 Plancraft+。
- 後續不得宣稱 Plancraft+ adapter production-ready；不得讓 Plancraft+ candidate facts 進正式估價；不得把 `.pc` / SVG / renderer preview 當 budget input。
- 建議下一步：可供使用者主動觸發 User-triggered Review，審查 guard hardening；後續若繼續施工，建議先做 Production Adapter Design Doc，而不是直接進 production adapter。

## Latest Visual Simulation Task: Minimal Real Server Runtime Spike

- 本輪任務名稱：Minimal Real Server Runtime Spike。
- 任務類型：Builder / Minimal Server Runtime Spike / proof of concept only；不是 production integration，沒有部署，也沒有把 disabled adapter 升級成 production API。
- 本輪檢查結果：`C:\laibe_project` 根目錄沒有 `package.json`、`node_modules`、`api/`、`server/`、`backend/`、`functions/`、`netlify.toml`、`vercel.json`、`wrangler.toml` 或既有可安全承載 same-origin image proxy 的 server runtime。
- 本輪判斷：目前 LaiBE MVP 仍以靜態 `file:///` 頁面為主，不適合在未決定 runtime 選型前硬造 `api/` 或 `server/` production-like 結構。
- 本輪採用路線 B：沒有建立 server/proxy stub，沒有新增 backend/api/functions/server 目錄，沒有新增 `package.json`、`node_modules` 或任何 framework。
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- `code.html` 只將 `plan-puzzle.js` cache query 更新為 `?v=minimal-server-runtime-spike`，避免瀏覽器快取仍讀舊標記；沒有修改 routing、CTA、Header 或頁面主流程。
- `plan-puzzle.js` 未於本輪修改；`callStyleVisualImageProxy(styleVisualApiRequest)` 仍預設 disabled，沒有 `fetch()`、沒有 `XMLHttpRequest`，不直連外部 image API，不包含 API key。
- Future same-origin proxy contract 仍只能是 `/api/style-visual-image-spike`；目前 endpoint 未啟用、未呼叫、未依賴。
- `styleVisualApiRequest` contract 維持白名單欄位：`roomType`、`primaryStyle`、`secondaryStyle`、`colorTone`、`materialTone`、`budgetLevel`、`purpose: "bid-listing-style-reference"`、`disclaimerRequired: true`、`referenceImage: { allowed: false, reason: "reference image upload requires separate privacy review" }`。
- `styleVisualApiRequest` 不得包含 `rawPrompt`、`systemPrompt`、`developerPrompt`、`walls`、`openings`、`zones`、`scale`、`plancraftBridge`、正式預算資料、reference image file 或使用者私宅圖片。
- `styleVisualApiResponse` contract 維持 `status: "disabled" | "mock_ready" | "error"`、`imageUrl: null`、`previewDataUrl: null`、`message` 與 metadata。metadata 必須保留 `generatedBy: "LAIBE_VISUAL_SIM"`、`usage: "bid-listing-style-reference"`、`sandbox: true`、`isOfficialDesign: false`、`isConstructionDrawing: false`、`isQuotationBasis: false`、`isRealCase: false`、`savedToOfficialCase: false`。
- UI fallback 仍顯示 `Server-side Image API proxy 尚未設定`；Visual Simulation Panel 必須保留 `Sandbox Preview`、`AI 示意圖`、`非正式圖片`、`不會保存到正式案件`、`非真實案例`、`非正式成果` 與固定 disclaimer。
- `styleVisualTask.generatedPreview` 仍只能是 local UI task state；不得寫入 `project`、export JSON、正式案件資料、production assets、budget data、`walls`、`openings`、`zones`、`scale` 或 `plancraftBridge`。
- Reference image upload 仍 disabled，`referenceImage.allowed` 必須維持 `false`；不得建立 upload pipeline。
- 本輪沒有 real image API、沒有 OpenAI 或第三方模型呼叫、沒有 API key、沒有 `.env`、沒有 secret、沒有 production endpoint。
- `file:///` 架構仍保留；若 Codex in-app browser 阻擋 file protocol，請用 localhost 或 headless browser 驗證，並由使用者本機手動確認嚴格 file protocol 體驗。
- 若下一步要建立真 server runtime，需先由使用者決定 runtime 選型：local Node server、Python dev server + separate proxy、Netlify Function、Vercel Function、Cloudflare Worker 或其他部署方式。
- 下一步在進入任何真 server runtime、真 API request、key 注入、production connection 或 reference image upload 前，請使用者視需要交給 LAIBE_REVIEWER 審查本輪 spike 邊界。

## Latest Builder Task: Plancraft+ → Budget Adapter Contract Spike

- 本輪任務名稱：Plancraft+ → Budget Adapter Contract Spike。
- 任務類型：Builder / Adapter Contract Spike / budget-system integration preparation。
- 指派角色：Builder / Codex；允許施工，範圍限 budget adapter contract 與 phase/handoff 文件。
- 本輪涉及資料模型與 budget-system adapter，但不是 production budget adapter。
- 修改檔案：
  - `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `src/lib/budget/types.ts`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 未修改：`C:\laibe_project\plancraft`、`preview_floor_plan/code.html`、`preview_floor_plan/plan-puzzle.js`、`laibe_landing_desktop/code.html`。
- 沒有新增 `package.json`、`node_modules`、React / Vite / TypeScript app、後端 API、AI API、payment / escrow / listing fee。
- `preview-floor-plan-adapter.ts` 現在支援兩條路徑：
  - legacy `rooms / objects / layout_objects` draft：保留原行為，仍轉成 `Space` 與 `LayoutObject`。
  - Plancraft+ draft：辨識 `product: "Plancraft+"`、`nodeGraph.edges`、`openings`、`zones` 或 `plancraftBridge.targetFormat === ".pc"` 後，走 spike mapping。
- Plancraft+ adapter output 固定：`source: "plancraft_plus_draft"`、`adapterMode: "plancraft_plus_spike"`、`productionReady: false`、`spaces`、`quantityFacts`、`layoutObjects: []`、`warnings`、`unsupported`、`provenance`。
- `zones` → `Space` candidate：`zone.id` 保留為 source，`zone.name` / `zone.type` 轉入 space，`labelPosition`、boundary ids、`boundaryStatus`、`boundaryIssues` 與 `polygonPointCount` 放入 `space.params`。
- `nodeGraph.edges` → wall length candidate `QuantityFact`：`existing_wall_length_candidate`、`new_wall_length_candidate`、`demolished_wall_length_candidate`；value 使用 mm 長度，保留 status / thickness / structural / provenance。
- `openings` → opening candidate `QuantityFact`：`door_opening_count`、`window_opening_count`、`wall_opening_count`；保留 `edgeId / sourceWallId / offset / width / height / sillHeight / swing`。
- Plancraft+ path 不呼叫 `generateBudgetEstimate()`，不讀 pricing rules，不讀 MethodSpecCatalog，不產生 BudgetEstimateLine，不產生正式價格。
- `.pc` converter output 不作 budget input；SVG / renderer preview 不作 budget input；adapter 只讀 Plancraft+ draft JSON。
- furniture / object placement 仍 unsupported；`layout_objects` 仍只屬 legacy path。
- 主要 warning codes：`plancraft_plus_adapter_spike`、`plancraft_plus_area_not_calculated`、`plancraft_plus_openings_candidate_only`、`plancraft_plus_furniture_not_supported`、`plancraft_plus_pc_not_budget_input`、`plancraft_plus_svg_not_budget_input`、`plancraft_plus_formal_estimate_blocked`、`plancraft_plus_zone_boundary_not_closed`、`plancraft_plus_opening_edge_missing`、`plancraft_plus_edge_length_invalid`。
- 驗證：
  - `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過，legacy adapter 與既有 mock estimate 未破壞。
  - inline Plancraft+ smoke test 通過，可輸出 `productionReady: false`、1 個 Space candidate、2 個 QuantityFact candidates、0 個 layoutObjects 與必要 warnings。
- `docs/CURRENT_PHASE_REVIEW_PACKET.md` 已補上「Plancraft+ → Budget Adapter Contract Spike」段落。
- 後續不得宣稱 Plancraft+ budget adapter production-ready；不得把 candidate facts 當正式報價；不得把 `.pc` / SVG / renderer preview 當 budget input。
- 建議下一步：使用者可視需要觸發 User-triggered Review，審查 adapter contract spike 與資料邊界；不需要因 handoff 更新自動觸發審查。

## Latest Documentation Task: plan-puzzle output model / budget adapter alignment

- 本輪任務名稱：補交 plan-puzzle 輸出模型與 budget adapter 銜接狀態。
- 任務類型：Documentation / Phase Review Packet 補充；本輪沒有修改功能程式碼。
- 已更新 `docs/CURRENT_PHASE_REVIEW_PACKET.md` 的「平面拼圖 Builder 成果」區段，補上目前 `project.version = "0.10.0-renderer-preview-spike"` 的最新輸出模型與 budget adapter 銜接狀態。
- 最新 plan-puzzle 輸出模型包含 `walls`、`wallGraph`、`nodeGraph`、`openings`、`zones`、`furniture: []`、`plancraftBridge`、Plancraft+ draft JSON 與 `.pc` converter spike。
- `.pc` converter、DSL validation、renderer preview、sharedWalls、browser SVG / Renderer Preview Report、AI 風格示意與 image proxy sandbox 都不得視為 production contract。
- `src/lib/budget/adapters/preview-floor-plan-adapter.ts` 已由上方 Plancraft+ → Budget Adapter Contract Spike 補上新版 draft 辨識與 candidate mapping；但仍不是 production budget adapter。
- `src/lib/budget/mock/mock-preview-floor-plan-draft.ts` 仍是 room-based mock；不得把它當作最新 Plancraft+ wall-first draft。
- 後續若要從 spike 進入正式 plan-puzzle → budget-system adapter，仍需另開明確任務，補 zone area、formal room generation、opening validation / recipe mapping、wall recipe mapping、future furniture/object → `LayoutObject`，且不得直接產生價格。
- 不得宣稱 `.pc` converter production-ready、不得宣稱 browser SVG / renderer preview SVG 是施工圖或正式報價依據、不得宣稱最新 Plancraft+ candidate mapping 已可產生正式預算。

## Latest Plan-Puzzle Task: Plancraft+ Renderer Preview Spike

- 本輪任務名稱：Plancraft+ Renderer Preview Spike。
- 任務分派：Builder / Data Model / plan-puzzle / Plancraft bridge spike；允許施工範圍只限 `preview_floor_plan/code.html`、`preview_floor_plan/plan-puzzle.js`、`docs/NEXT_CODEX_HANDOFF.md`。
- `project.version` 已升級為 `0.10.0-renderer-preview-spike`；不得降回 `0.9.0-plancraft-dsl-validation-spike`。
- 已保留 `.pc` converter spike、DSL validation state、Zone Boundary、Zone Label、Opening Editor、nodeGraph、wallGraph、openings、zones、boundaryEdgeIds、import interface、Plancraft+ draft JSON 匯出與 `.pc` 測試版匯出。
- `project.plancraftBridge` 仍是 `status: "spike"`，新增 `preview: { status, checkedAt, svgOutputPath, command, errors, warnings }`。
- `preview.status` 預設為 `not_run`。靜態 `file:///` 頁面不直接 import Plancraft renderer、不 bundle Plancraft packages，也不能直接執行本機 CLI。
- UI 已新增 Renderer Preview Report，顯示 preview status、checkedAt、SVG output path、本機 command、warnings、errors、next action。
- UI 明確提示：`靜態頁尚未直接載入 Plancraft renderer；請使用本機 CLI compile 產生 SVG 預覽。`
- read-only 檢查過 Plancraft renderer / CLI：
  - `C:\laibe_project\plancraft\packages\renderer\package.json`
  - `C:\laibe_project\plancraft\packages\renderer\src\index.ts`
  - `C:\laibe_project\plancraft\packages\renderer\src\scene-graph.ts`
  - `C:\laibe_project\plancraft\packages\renderer\src\emitters\svg-emitter.ts`
  - `C:\laibe_project\plancraft\packages\cli\src\index.ts`
  - `C:\laibe_project\plancraft\packages\cli\src\commands\compile.ts`
  - `C:\laibe_project\plancraft\package.json`
  - `C:\laibe_project\plancraft\examples\studio-apartment.pc`
- CLI `compile` 會讀 `.pc`，用 `@plancraft/dsl` parse/resolve，再用 `@plancraft/renderer` 的 `buildSceneWithFurniture()` 與 `emitSVG()` 輸出 SVG。
- CLI 支援 `--structure-only`，其 layer set 是 `walls, openings, labels`。
- CLI 支援 `--layers <list>`，renderer layer 型別是 `walls | openings | dimensions | labels | furniture`。
- 本機 Renderer Preview 指令 A（structure-only）：
```powershell
cd C:\laibe_project
node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\path\to\laibe-plancraft-plus-spike.pc --structure-only -o C:\path\to\laibe-plancraft-plus-spike.svg
```
- 本機 Renderer Preview 指令 B（指定 layers）：
```powershell
cd C:\laibe_project
node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\path\to\laibe-plancraft-plus-spike.pc --layers walls,openings,labels -o C:\path\to\laibe-plancraft-plus-layers.svg
```
- 代表性 sample compile 已在不修改 Plancraft repo 的前提下執行：
  - `node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\laibe_project\plancraft\examples\studio-apartment.pc --structure-only -o %TEMP%\laibe-plancraft-renderer-preview-structure.svg`
  - `node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\laibe_project\plancraft\examples\studio-apartment.pc --layers walls,openings,labels -o %TEMP%\laibe-plancraft-renderer-preview-layers.svg`
  - 兩個指令皆成功寫出 SVG；這只代表 Plancraft CLI / renderer dist 可用，不代表使用者當前匯出的 `.pc` 已通過 renderer preview。
- 若要驗證目前使用者匯出的 `.pc`，請先在 browser 下載 `laibe-plancraft-plus-spike.pc`，再把上方 `C:\path\to\...` 換成實際下載路徑。
- 本輪不做 browser renderer integration、不新增後端、不新增 npm、不修改 Plancraft core。
- 尚未做 sharedWalls canonicalization；converter 仍可能對共用牆重複輸出 room walls。
- 下一步唯一建議：SharedWalls Canonicalization Spike。理由：Renderer preview 流程已建立，但 converter 的共用牆 canonicalization 仍是下一個會影響 SVG/Plancraft 結果品質的核心缺口。

## Latest Visual Simulation Task: Server-side Image API Proxy Spike

- 本輪已完成 Server-side Image API Proxy Spike 的最小前端 contract / adapter 骨架；仍是 spike / proof of concept，不是 production integration。
- 專案根目錄目前沒有 `package.json`，也沒有 `api/`、`server/`、`backend/`、`functions/`、`netlify.toml`、`vercel.json` 或可安全承載 server-side proxy 的既有 runtime。
- 因目前 LaiBE MVP 仍是靜態頁，本輪沒有建立 backend、沒有建立 proxy stub 檔、沒有部署、沒有新增 server、沒有新增 package、沒有新增 node_modules。
- 本輪沒有 real image API、沒有 OpenAI 或第三方模型呼叫、沒有 API key、沒有 `.env`、沒有 secret、沒有 production endpoint。
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` 目前只建立 disabled 的 `callStyleVisualImageProxy(styleVisualApiRequest)` 前端 adapter。該 adapter 明確註解：未來只能呼叫 same-origin server-side proxy，不允許前端直連 image generation provider。
- 未來唯一允許的 same-origin proxy path contract 是 `/api/style-visual-image-spike`，但本輪未啟用、未呼叫、未依賴此 endpoint。
- `styleVisualApiRequest` 是本輪統一 contract 名稱，白名單欄位只有 `roomType`、`primaryStyle`、`secondaryStyle`、`colorTone`、`materialTone`、`budgetLevel`、`purpose: "bid-listing-style-reference"`、`disclaimerRequired: true`、`referenceImage: { allowed: false, reason: "reference image upload requires separate privacy review" }`。
- `styleVisualApiRequest` 不得包含 `rawPrompt`、`systemPrompt`、`developerPrompt`、`walls`、`openings`、`zones`、`scale`、`plancraftBridge`、正式預算資料、reference image file 或使用者私宅圖片。
- `styleVisualApiResponse` contract 為 `status: "disabled" | "mock_ready" | "error"`、`imageUrl: null`、`previewDataUrl: null`、`message` 與 metadata。metadata 包含 `generatedBy: "LAIBE_VISUAL_SIM"`、`usage: "bid-listing-style-reference"`、`sandbox: true`、`isOfficialDesign: false`、`isConstructionDrawing: false`、`isQuotationBasis: false`、`isRealCase: false`、`savedToOfficialCase: false`。
- Proxy disabled 時 UI 顯示 `Server-side Image API proxy 尚未設定`；ready 文案仍使用 `Sandbox 預覽已建立`，不得改成「圖片生成完成」、「正式設計完成」或 production ready。
- `styleVisualTask.generatedPreview` 仍是 local UI task state only，不寫入 `project`、export JSON、正式案件資料、production assets、budget data 或 Plancraft geometry。
- Reference image upload 仍 disabled，UI 繼續顯示 `Reference image upload 尚未開放，需經 privacy review。`
- Visual Simulation Panel 必須持續保留 `Sandbox Preview`、`AI 示意圖`、`非正式圖片`、`不會保存到正式案件`、`非真實案例`、`非正式成果` 與固定 disclaimer。
- Codex in-app browser 仍可能阻擋直接 `file:///` 驗證；請用 localhost 等價驗證，若需要嚴格 file protocol 結果需使用者本機手動確認。
- 本輪完成後若使用者主動要求審查，可交給 LAIBE_REVIEWER。Reviewer 通過前不得進入 real server runtime、真 API、上線標記、production asset pipeline 或 reference image upload。

## Latest Plan-Puzzle Task: Plancraft+ DSL Validation Spike

- 本輪任務名稱：Plancraft+ DSL Validation Spike。
- 本輪仍只修改 LaiBE 端 `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` 與本 handoff；沒有修改 `C:\laibe_project\plancraft`。
- `project.version` 已升級為 `0.9.0-plancraft-dsl-validation-spike`，不得降回 `0.8.0-plancraft-bridge-pc-spike`。
- `project.plancraftBridge.status` 維持 `spike`，並新增 `validation: { status, checkedAt, errors, warnings }`。在靜態 `file:///` 頁內預設為 `status: "not_run"`，不得假裝 browser 已通過 DSL validation。
- 已新增 `validateGeneratedPcSpike(pcText)` browser-safe placeholder。它不 import Plancraft DSL、不 bundle Plancraft packages、不新增 npm 流程，只回報需要本機 validation command。
- Converter Report 現在顯示 validation status、checkedAt、validation warnings / errors 與 next action；若未跑本機 DSL，UI 明確顯示「靜態頁尚未直接載入 Plancraft DSL；請使用本機驗證流程確認 .pc。」
- read-only 檢查過 Plancraft：`plancraft/package.json`、`packages/dsl/package.json`、`packages/cli/package.json`、`packages/dsl/src/index.ts`、`packages/dsl/src/ast/types.ts`、`packages/dsl/src/parser.ts`、`packages/dsl/src/resolver.ts`、`packages/cli/src/index.ts`、`packages/cli/src/commands/compile.ts`、`examples/studio-apartment.pc`、`examples/two-bedroom.pc`、`examples/tolosa.pc`。
- Plancraft DSL dist 已存在：`C:\laibe_project\plancraft\packages\dsl\dist\index.js`，可用 CommonJS `require(...)` 取得 `parse` / `resolve`。
- Plancraft CLI dist 已存在：`C:\laibe_project\plancraft\packages\cli\dist\index.js`，`compile` 會先 parse/resolve，再透過 renderer 輸出 SVG。
- 已用 DSL dist 驗證 examples：`studio-apartment.pc`、`two-bedroom.pc`、`tolosa.pc` 都可 parse/resolve。
- 已用 DSL dist 驗證一份代表 Plancraft+ converter 輸出 schema 的 sample `.pc`：root `{ name, scale, unit, floors }`、floor `{ name, rooms, labels }`、room `{ name, walls, doors, windows, openings }`、wall `{ direction, from, to, thickness }`、door `{ wall, offset, width, swing }`、window `{ wall, offset, width, height, sill }`、opening `{ wall, offset, width }` 可被 parse/resolve。
- 已用 CLI read-only 驗證 example compile：`node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\laibe_project\plancraft\examples\studio-apartment.pc --structure-only -o %TEMP%\plancraft-studio-structure-validation.svg` 可成功輸出 SVG 到暫存資料夾。
- 本輪沒有把 browser 靜態頁接上 Plancraft DSL。原因：目前頁面是原生 HTML/JS，可用 `file:///` 直接開啟；直接 import `C:\laibe_project\plancraft` dist 會破壞靜態頁邊界並引入本地路徑/打包問題。
- 匯出 `.pc` 測試版仍使用 `convertPlancraftPlusToPc(project)`；匯出檔名仍是 `laibe-plancraft-plus-spike.pc`。
- `convertPlancraftPlusToPc()` 仍輸出 Plancraft examples / parser 可接受的 JSON schema；目前不輸出未知欄位如 `type`、`status`、`structural` 到 `.pc`，而是以 warnings 呈現資料遺失。
- sharedWalls 仍尚未 canonicalize；兩個 zones 共用 edge 時仍可能重複輸出 room walls，並保留 warning。
- existing / new / demolished / structural 仍不是正式 Plancraft schema 欄位；converter 會跳過 demolished boundary edge 或 warning status/structural lost。
- Swing 只輸出 Plancraft 支援的 `left` / `right` / `sliding`；不支援或 `none` 會 warning 並 fallback。
- 本機驗證指令 A，直接驗證使用者匯出的 `.pc`：

```powershell
cd C:\laibe_project
node -e "const {readFileSync}=require('node:fs'); const {parse,resolve}=require('C:/laibe_project/plancraft/packages/dsl/dist/index.js'); const file='C:/path/to/laibe-plancraft-plus-spike.pc'; const resolved=resolve(parse(readFileSync(file,'utf8'))); console.log(JSON.stringify({ok:true,floors:resolved.floors.length,rooms:resolved.floors.reduce((n,f)=>n+f.rooms.length,0)},null,2));"
```

- 本機驗證指令 B，使用 Plancraft CLI compile 進一步產 SVG：

```powershell
cd C:\laibe_project
node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\path\to\laibe-plancraft-plus-spike.pc --structure-only -o C:\path\to\laibe-plancraft-plus-spike.svg
```

- 注意：Plancraft DSL parser 目前不接受 UTF-8 BOM；瀏覽器匯出的 `Blob` 檔不會加 BOM，但若用 PowerShell 手寫測試檔，請避免 `Set-Content -Encoding UTF8` 產生 BOM。
- 本輪另用 CLI compile 驗證代表性 Plancraft+ `.pc` sample，使用無 BOM UTF-8 寫入暫存檔後可成功輸出 `laibe-plancraft-plus-spike-sample.svg` 到 `%TEMP%`。
- 已知 validation warnings：browser UI validation 預設 `not_run`；sharedWalls 尚未 canonicalize；renderer preview 尚未做；正式 production converter 尚未建立。
- 下一步建議：Renderer Preview Spike。理由是 converter schema 已對齊 DSL parser/resolver，下一步應確認 Plancraft renderer 對匯出 `.pc` 的 SVG 視覺結果。

## Latest Plan-Puzzle Task: Plancraft+ Bridge .pc Converter Spike

- 本輪已在萊比網站平面拼圖頁建立 `.pc` 轉換測試版入口；這是 Spike，不是正式 production converter。
- 修改範圍限於 `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` 與本 handoff。
- `project.version` 已升級為 `0.8.0-plancraft-bridge-pc-spike`。
- `project.plancraftBridge` 目前為 `status: "spike"`、`targetFormat: ".pc"`、`converterVersion: "0.1.0-spike"`，並保留 `lastExportedAt`、`lastExportSummary` 與 `warnings`。
- 已新增 `convertPlancraftPlusToPc(project)`，輸出 `{ ok, pcText, pcObject, warnings, errors, summary }`。
- Converter 會用 `zones[].boundaryEdgeIds` 對應 `nodeGraph.edges` 產生 Plancraft rooms，並把 boundary edges 轉成 room `walls`。
- Converter 會嘗試把 `project.openings` 依 `edgeId` 對應到第一個匹配 room wall，轉成 Plancraft `doors` / `windows` / `openings`。
- `.pc` 測試版下載按鈕為「匯出 Plancraft .pc 測試版」，檔名 `laibe-plancraft-plus-spike.pc`。
- 原本「匯出 Plancraft+ 草稿」仍保留，檔名 `laibe-plancraft-plus-draft.json`，仍包含 underlay / walls / wallGraph / nodeGraph / openings / zones / furniture / plancraftBridge。
- UI 已新增 Converter Report，顯示 converter status、roomCount、wallCount、openingCount、skippedZoneCount、skippedOpeningCount、warnings 與 errors。
- 無 valid closed zone boundary 時不下載 `.pc`，會顯示錯誤與 report；有 valid boundary 時才下載 `.pc`。
- 本輪沒有使用 Plancraft DSL / renderer 驗證，沒有 `import @plancraft/dsl`，沒有 `import @plancraft/renderer`。
- 本輪 read-only 參考了 `C:\laibe_project\plancraft\README.md`、`examples\studio-apartment.pc`、`examples\two-bedroom.pc`、`examples\tolosa.pc`、`packages\dsl\src\ast\types.ts`、`packages\dsl\src\parser.ts`、`packages\dsl\src\resolver.ts`。
- Plancraft `.pc` 參考結論：root 是 JSON/JSONC `{ name, scale, unit, floors }`；floor 有 `rooms` / `labels`；room 以 `walls` closed polygon 為核心；door/window/opening 以 `wall` direction 掛在 room wall 上；`sharedWalls` 支援但本 Spike 尚未 canonicalize。
- 目前轉換限制會進 warnings：sharedWalls 尚未 canonicalize、Plancraft+ top-left 原點尚未做 Plancraft renderer 座標驗證、zone type 不寫入 `.pc`、new/existing/demolished status 與 structural metadata 可能遺失或被略過、door swing `none` 會警示並暫用 valid swing。
- demolished edge 不會輸出為正式 room wall；包含 demolished edge 的 zone 會被略過並 warning。
- shared edge 若有 opening，本 Spike 先掛到第一個匹配 room，並 warning shared opening 尚未 canonicalize。
- 下一步建議：Plancraft DSL Validation Spike。目標是用 Plancraft DSL parser/resolver 或 CLI 驗證 `laibe-plancraft-plus-spike.pc` 的 schema 與 renderer 相容性；仍不得修改 Plancraft core。

## Purpose

Short operational handoff for the next Codex session. This is not the full LaiBE product doctrine.

Reviewer chat is only for reviewing Codex work output and boundary compliance. It is not responsible for LaiBE website feature design or product direction.

## Must Read

- `AGENTS.md`
- `AI_RULES/SYSTEM_ARCHITECTURE.md`
- `AI_RULES/ROUTING_RULES.md`
- `AI_RULES/CODEX_MANDATORY_ENTRY.md`
- `AI_RULES/FILE_OWNERSHIP_RULES.md`
- `AI_RULES/REVIEW_CHECKLIST.md`
- `AI_RULES/HANDOFF_RULES.md`
- `AI_RULES/TASK_DISPATCH_RULES.md` for deciding Builder / Reviewer / Architect / blocked task routing
- `AI_RULES/PHASE_REVIEW_RULES.md` for Phase Review policy and reviewer output requirements
- `AI_RULES/LAIBE_BUILDER_RULES.md` for Builder / Codex implementation tasks
- `AI_RULES/LAIBE_REVIEWER_RULES.md` for LAIBE_REVIEWER or Reviewer-mode tasks
- `AI_RULES/LAIBE_VISUAL_SIM_RULES.md` for LAIBE_VISUAL_SIM or visual asset / image prompt tasks
- `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md` for landing / onboarding / header / CTA / routing / progress bar / dashboard flow tasks
- `docs/LAIBE_VISUAL_SIM_CHATROOM.md` for the dedicated visual simulation chatroom operating format
- `docs/ai_style_visual_chat/IMAGE_API_SPIKE_GOVERNANCE.md` and sibling docs before any Image Generation API Integration Spike
- `docs/EDITING_MAP.md`
- `docs/PROJECT_RULES.md`
- `docs/USER_WORKING_STYLE.md`
- `docs/USER_IT_LIMITS.md`
- `docs/LAIBE_CORE_POSITIONING.md` for product positioning and copy decisions
- `docs/ABOUT_LAIBE_QA_SOURCE.md` before editing the About LaiBE section

## Current State

- Central AI / Codex governance layer has been refreshed in Markdown only: root `AGENTS.md` is now the highest entry file, and `AI_RULES/` contains full architecture, routing, mandatory entry, file ownership, review, and handoff rules.
- Task dispatch rules have been added at `AI_RULES/TASK_DISPATCH_RULES.md`; every task should be classified before work as Builder, Reviewer, Architect/Governance, Documentation, Routing/CTA, Data Model, Sensitive, or Blocked.
- A task brief template has been added at `templates/LAIBE_TASK_BRIEF_TEMPLATE.md`; use it before assigning work to Builder / Reviewer / Architect when task scope or role is unclear.
- Routing / CTA / header / Data Model / Sensitive Task work must or should go to LAIBE_REVIEWER after completion according to `AI_RULES/TASK_DISPATCH_RULES.md`.
- Sensitive Task work requires explicit user authorization before construction; Blocked Task work must not be performed.
- LAIBE_BUILDER dedicated rules have been added at `AI_RULES/LAIBE_BUILDER_RULES.md`; Builder / Codex implementation tasks must read it fully.
- A fixed Builder task template has been added at `templates/CODEX_BUILDER_TASK_TEMPLATE.md`; Builder tasks should use it to classify task type, allowed scope, forbidden scope, self-review, handoff need, and final report format.
- Builder completion reports must use the fixed Builder format from `AI_RULES/LAIBE_BUILDER_RULES.md`; tasks involving routing / CTA / header / data model / AI_RULES should be recommended for LAIBE_REVIEWER review.
- Builder / Codex implementation tasks should now include a REVIEW_READY_SUMMARY when useful; it is prepared for user-triggered review and does not automatically start LAIBE_REVIEWER.
- Builder tasks that involve routing / CTA / header / progress bar / back buttons / main flow / plan-puzzle / budget-system / specDB / dashboard / data model / AGENTS.md / AI_RULES / templates / handoff / plancraft / framework-package-config / multi-page changes must also run Review-ready self-check, but this does not replace LAIBE_REVIEWER formal review.
- If Builder detects High Risk conditions such as unauthorized plancraft or src edits, out-of-scope file edits, framework/package changes, npm install, git clean/reset, file deletion, broken routing, or broken data model, it must mark the task as needing user confirmation / Reviewer instead of declaring final completion.
- Phase Review rules have been added at `AI_RULES/PHASE_REVIEW_RULES.md`; LaiBE now prefers stage-level review over requiring LAIBE_REVIEWER after every tiny Builder task.
- Phase review packet template has been added at `templates/PHASE_REVIEW_PACKET_TEMPLATE.md`; reviewer prompt template has been added at `templates/PHASE_REVIEWER_PROMPT_TEMPLATE.md`.
- Current phase review packet has been created at `docs/CURRENT_PHASE_REVIEW_PACKET.md`; Builder / Architect / Visual Sim roles should update it when a work segment becomes a phase result.
- `docs/NEXT_CODEX_HANDOFF.md` remains for the next Builder / Codex continuation context; `docs/CURRENT_PHASE_REVIEW_PACKET.md` is for LAIBE_REVIEWER phase-level review.
- Budget system dispatch has been updated into the three-warehouse model: `配件倉庫：工法與規格`, `原物料採購與倉儲`, and `成品物流：預算表單輸出`.
- Method / Spec Warehouse owns MethodSpecCatalog, MethodRecipe, MaterialSpec, LaborRule, NoteTemplate, UnitConversion, InclusionExclusionRule, ItemMaterialBinding, method/spec rules, assumptions, risks, and inclusions/exclusions.
- Material / Procurement Warehouse owns raw materials, supplier/procurement clues, procurement cost, inventory/warehouse concepts, material resolver, material pricing, unit conversion, and material quantity signals.
- Output / Renderer Warehouse owns BudgetOutputSnapshot, customer_view, internal_view, structured_rows, renderSnapshot(), renderer gate, and CSV / HTML / Excel / PDF output.
- Output / Renderer Warehouse must only read BudgetOutputSnapshot or RenderedBudgetDocument; it must not rerun budget engine, read pricing rules, read material resolver, modify MethodSpecCatalog, call RAG / AI API, or use legacy formatBudgetOutput() as the formal source.
- `templates/PHASE_REVIEW_PACKET_TEMPLATE.md` and `docs/CURRENT_PHASE_REVIEW_PACKET.md` now include separate sections for the three budget warehouses.
- LAIBE_REVIEWER dedicated rules have been added at `AI_RULES/LAIBE_REVIEWER_RULES.md`; Reviewer-mode tasks must read it fully, and Builder-mode tasks may skim it.
- Latest Markdown-only governance update finalized `AI_RULES/LAIBE_REVIEWER_RULES.md` as the dedicated Reviewer rule file and kept LAIBE_REVIEWER output in the fixed review-only format requested by the user.
- LAIBE_VISUAL_SIM rules have been added at `AI_RULES/LAIBE_VISUAL_SIM_RULES.md`; LAIBE_VISUAL_SIM produces visual briefs, image prompts, asset specs, naming notes, usage notes, and risk notes only.
- LAIBE_VISUAL_SIM task template has been added at `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`.
- LAIBE_VISUAL_SIM chatroom guide has been added at `docs/LAIBE_VISUAL_SIM_CHATROOM.md`.
- Project-local LAIBE_VISUAL_SIM skill-style instructions have been added at `skills/laibe-visual-sim/SKILL.md`.
- LAIBE_VISUAL_SIM does not modify code, does not build, does not review, and does not replace Builder / Reviewer / Architect roles.
- LAIBE_VISUAL_SIM mock images are only case-listing and style-communication aids; they must not be claimed as construction drawings, formal design drawings, real cases, quotation basis, or completion guarantees.
- Visual simulation assets that need site integration should go to Builder; visual assets already integrated into the website should go to LAIBE_REVIEWER for misleading-claim and page-fit review.
- LAIBE_WEB_FLOW_BUILDER rules have been added at `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md`.
- LAIBE_WEB_FLOW_BUILDER task template has been added at `templates/LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`.
- UX Flow Review rules have been added at `AI_RULES/UX_FLOW_REVIEW_RULES.md`; LAIBE_REVIEWER can now review page role, CTA logic, layout logic, header/nav, progress bar, and AI Studio-like link precision.
- Page link registry has been added at `AI_RULES/PAGE_REGISTRY.md`; Web Flow Builder and Reviewer should use it as the page role / entry / exit / CTA / back-logic registry.
- CTA flow map has been added at `AI_RULES/CTA_FLOW_MAP.md`; Web Flow Builder and Reviewer should use it as the CTA action-line registry.
- Web Flow Builder tasks that add or modify pages / CTA / header / progress bar / routing should keep `PAGE_REGISTRY.md`, `CTA_FLOW_MAP.md`, `ROUTING_RULES.md`, and `UX_FLOW_REVIEW_RULES.md` aligned.
- If LAIBE_REVIEWER lacks screenshots, live UI, or HTML content during UX Flow Review, it may review flow and document logic but must mark layout details as unable to confirm.
- Phase Review Conditional Pass governance cleanup has been handled in Markdown only.
- `docs/FILE_OWNERSHIP_RECONCILIATION.md` now records current `git status` ownership categories: current governance outputs, old dirty state / other Builder outputs, archive moves, and unresolved risks. It does not authorize deletion, reset, clean, or checkout.
- `docs/CURRENT_PHASE_REVIEW_PACKET.md` now includes Conditional Pass cleanup notes: plan-puzzle `.pc` converter remains spike / not production-ready; the three budget warehouses have governance boundaries but must keep outputs separated; formal Excel / PDF writer still needs a dedicated LAIBE_REVIEWER 審查結果 before production-ready claims.
- The six templates under `templates/` have been repaired from mojibake into readable Chinese: `CODEX_BUILDER_TASK_TEMPLATE.md`, `LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`, `LAIBE_TASK_BRIEF_TEMPLATE.md`, `PHASE_REVIEW_PACKET_TEMPLATE.md`, `PHASE_REVIEWER_PROMPT_TEMPLATE.md`, and `LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`.
- User-triggered Review has been changed to user-triggered review. Builder / Codex should not automatically require LAIBE_REVIEWER after every small task or phase update.
- Builder / Codex may update handoff / phase packet and mark work as "可供後續審查", but should not write "要求立即審查", "下一步一定是 Reviewer", or "未經 Reviewer 不可繼續" unless the user explicitly requests a User-triggered Review or a High Risk condition exists.
- LAIBE_REVIEWER still supports Single Task Review and Phase Review, but review starts only when the user explicitly asks, for example: "請執行本階段總審查", "請審查目前階段成果", "請掃一遍目前所有聊天室成果", "請做 Web Flow / CTA / UX 審查", or "請審查這份 Builder 回報".
- `docs/CURRENT_PHASE_REVIEW_PACKET.md` now includes Review Status. Updating the packet does not automatically trigger review.
- Reviewer 自動要求審查的殘留語言已清除並統一改為 User-triggered Review。Builder / Codex 應整理 Review-ready Summary，且註明該摘要不會自動觸發審查；是否啟動 LAIBE_REVIEWER 由使用者決定。
- Old generic website modification tasks should gradually be routed through LAIBE_WEB_FLOW_BUILDER when they involve landing / onboarding / header / CTA / routing / progress bar / dashboard flow.
- LAIBE_WEB_FLOW_BUILDER does not own plan-puzzle core functionality, budget-system core logic, plancraft source code, visual simulation prompts, or governance architecture.
- Web flow tasks involving routing / CTA / header must or should go to LAIBE_REVIEWER after completion according to the user-triggered review.
- LAIBE_REVIEWER now uses user-triggered review: pasted Builder/Codex completion reports alone do not trigger a full review unless the user explicitly asks, such as "幫我看一下" or "請審查".
- Last governance tasks modified `AGENTS.md`, `AI_RULES/SYSTEM_ARCHITECTURE.md`, `AI_RULES/ROUTING_RULES.md`, `AI_RULES/CODEX_MANDATORY_ENTRY.md`, `AI_RULES/FILE_OWNERSHIP_RULES.md`, `AI_RULES/REVIEW_CHECKLIST.md`, `AI_RULES/HANDOFF_RULES.md`, `AI_RULES/TASK_DISPATCH_RULES.md`, `AI_RULES/LAIBE_BUILDER_RULES.md`, `AI_RULES/LAIBE_REVIEWER_RULES.md`, `AI_RULES/LAIBE_VISUAL_SIM_RULES.md`, `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md`, `AI_RULES/PHASE_REVIEW_RULES.md`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`, `docs/LAIBE_VISUAL_SIM_CHATROOM.md`, `skills/laibe-visual-sim/SKILL.md`, `templates/CODEX_BUILDER_TASK_TEMPLATE.md`, `templates/LAIBE_TASK_BRIEF_TEMPLATE.md`, `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`, `templates/LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`, `templates/PHASE_REVIEW_PACKET_TEMPLATE.md`, `templates/PHASE_REVIEWER_PROMPT_TEMPLATE.md`, and this handoff file.
- The governance refresh did not modify HTML, JS, CSS, TS, Python, `src`, `app`, `components`, `assets`, `layout`, or `plancraft`.
- Official homepage has been replaced with the black / cement / metal direction.
- Official homepage file: `src/stitch_laibe_landing_onboarding/laibe_landing_desktop/code.html`
- Owner / requester requirement page is already handled in the black cement experiment flow.
- Current floor-plan work is: `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- Current prompt rechecked Wall Split / Node Graph MVP; the implementation was already present in `plan-puzzle.js`. Do not downgrade the current `0.5.0-opening-editor` file back to `0.4.0-wall-split-node-graph` just to match an older task prompt.
- Current task completed: Plancraft+ Opening Editor MVP.
- Current task completed: Plancraft+ Visual Simulation Task Preview MVP.
- Current governance task completed: Image Generation API Spike Governance Pack.
- Current task completed: Image Generation API Sandbox Spike.
- Current task completed: Real Image Generation API Spike, still sandbox-only / proof-of-concept. No production integration was added.
- Current task completed: Server-side Image API Proxy Spike, still disabled / local-only contract. No backend or real proxy was created because this MVP has no server runtime.
- The sandbox spike was implemented only inside the existing preview floor-plan page files: `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html` and `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`; this handoff was also updated.
- This Real Image Generation API Spike did not connect a real image API, did not call OpenAI or any model provider, did not add API keys, did not add `.env`, did not add packages, and did not create production image assets.
- The Real Spike implementation added a local-only `generateSandboxVisualPreview()` path and `buildSanitizedVisualPrompt()` prompt builder. The Server-side Proxy Spike now keeps this path behind a disabled proxy contract and displays `Server-side Image API proxy 尚未設定`.
- Visual Simulation Panel now shows sandbox labels: `Sandbox Preview`, `AI 示意圖`, `非正式圖片`, `不會保存到正式案件`, `非真實案例`, and `非正式成果`.
- Proxy-disabled fallback is explicit: `Server-side Image API proxy 尚未設定`.
- `ready` UI copy is intentionally softened to `Sandbox 預覽已建立`; do not use `完成`, `正式`, or `設計已完成` for this state.
- `styleVisualTask` now keeps the sandbox-only state: `sanitizedPrompt`, `styleVisualApiRequest`, `styleVisualApiResponse`, `proxyStatus`, `referenceImagePolicy`, and `generatedPreview`.
- `styleVisualTask.generatedPreview` is local UI task state only. It is not written into `project`, exported draft JSON, official case data, production assets, budget data, or Plancraft geometry.
- `styleVisualTask.generatedPreview.metadata` includes `generatedBy: "LAIBE_VISUAL_SIM"`, `usage: "bid-listing-style-reference"`, `isOfficialDesign: false`, `isConstructionDrawing: false`, `isQuotationBasis: false`, and `sandbox: true`.
- The `styleVisualApiRequest` uses whitelist fields only: `roomType`, `primaryStyle`, `secondaryStyle`, `colorTone`, `materialTone`, `budgetLevel`, `purpose`, `disclaimerRequired`, and `referenceImage.allowed/reason`.
- Reference image upload remains disabled in `styleVisualTask.referenceImagePolicy`; the UI states `Reference image upload 尚未開放，需經 privacy review。`.
- The `styleVisualApiRequest` must not include `walls`, `openings`, `zones`, `scale`, `plancraftBridge`, raw system prompts, user-uploaded reference images, official quote data, or private identifying data.
- Codex in-app browser may block direct `file:///` verification. Use localhost as equivalent validation inside Codex, and ask the user to manually confirm file protocol on their machine if strict `file:///` proof is needed.
- The Server-side Image API Proxy Spike can be handed to LAIBE_REVIEWER if the user explicitly asks for review. User-triggered review approval is required only when the user asks for formal acceptance before any future server runtime, real API request, production connection, or online label.
- New governance docs are under `docs/ai_style_visual_chat/`: `IMAGE_API_SPIKE_GOVERNANCE.md`, `IMAGE_API_REQUEST_SCHEMA.md`, `PROMPT_SANITIZATION_RULES.md`, `REFERENCE_IMAGE_POLICY.md`, `GENERATED_IMAGE_STORAGE_POLICY.md`, and `IMAGE_API_SPIKE_REVIEW_CHECKLIST.md`.
- This governance pack is documentation only: no image API was connected, no OpenAI API was called, no API key or `.env` was added, no image was generated, and no frontend / Plancraft / routing / CTA / Header code was modified by this governance task.
- Before any Image Generation API Integration Spike, Builder must read the governance pack and keep the work as spike / proof of concept only.
- Image API spike request schema must use whitelist fields only and must not allow raw system prompt, disclaimer override, reference image upload, or `walls/openings/zones/scale/plancraftBridge` in the image API request.
- Reference image upload remains disabled until a separate privacy review approves clear notice, user consent, temporary storage, deletion strategy, no official case storage, and no real-case display.
- Generated images from a future spike must not enter official case data, production assets, budget official data, or Plancraft geometry, and must include metadata such as `generatedBy: "LAIBE_VISUAL_SIM"`, `usage: "bid-listing-style-reference"`, `isOfficialDesign: false`, `isConstructionDrawing: false`, and `isQuotationBasis: false`.
- Any Image Generation API Integration Spike can be handed to LAIBE_REVIEWER if the user explicitly asks for review after completion; User-triggered review approval is required only when the user asks for formal acceptance before anything can be marked online.
- Floor-plan page now includes an inspector-side `AI 風格示意` panel rendered from `plan-puzzle.js`; it is a mock task preview only, not real image generation.
- Visual Simulation Preview state is kept separate from wall geometry: `styleVisualRequest` stores room/style/tone/material/budget/purpose, and `styleVisualTask` stores `idle | drafting | ready`, visual brief, prompt preview, and disclaimer.
- The `生成風格示意` inspector action simulates `idle -> drafting -> ready` with a local 1 second timer; it does not call OpenAI, any image-generation API, backend, upload, or Plancraft core.
- The Visual Simulation Preview must remain a style visualization layer only. Do not write it into `walls`, `openings`, `zones`, `scale`, or `plancraftBridge`.
- Disclaimer shown in the panel: `本圖僅為風格示意，用於案件上架與溝通參考，不代表最終設計、施工圖、實際尺寸、工法、材料品牌或正式報價內容。`
- Product positioning: Plancraft+ is one integrated LaiBE website tool, not a separated "LaiBE importer" and "Plancraft" module.
- The old room-based main flow is stopped: no rectangular room add/drag/resize/overlap workflow is exposed.
- The floor-plan page now uses a Plancraft+ wall-first draft model in `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`: `importSource`, `underlay`, `scale`, `walls`, `wallGraph`, `nodeGraph`, `openings`, `zones`, empty `furniture`, and `plancraftBridge`.
- JPG/JPEG/PNG import uses browser FileReader to create an underlay data URL; no backend upload.
- PDF can be selected and recorded in `importSource`, but direct PDF preview/calibration is intentionally blocked with a clear message. No pdf.js is used.
- Scale calibration lets the user click two canvas points, enter a known mm length, and computes `pxPerMm = pixelDistance / knownLength`.
- Wall Segment Editor is enabled after scale calibration. Walls are stored in mm coordinates from the canvas top-left origin and rendered to SVG with `px = mm * pxPerMm`.
- Wall drawing supports two-click wall creation, `existing/new/demolished` status, thickness, endpoint snap, horizontal/vertical assist, selection, inspector editing, Delete/Backspace deletion, and JSON export.
- Wall Graph Cleanup is enabled in the same Plancraft+ page. `project.version` is now `0.3.0-wall-graph-cleanup`.
- `project.wallGraph = { nodes: [], issues: [], lastBuiltAt: null }`; nodes are rebuilt from wall endpoints and wall intersections using mm coordinates.
- Wall graph issues currently supported: `nearby-endpoints`, `wall-intersection`, `overlapping-walls`, `wall-too-short`, and `zero-length-wall`.
- `nearby-endpoints` flags endpoints 30mm to 150mm apart that are not exactly aligned. The UI message is: "有牆端點接近但未對齊，建議整理端點。"
- The "整理端點" action merges wall endpoints within 30mm, updates `wall.from` / `wall.to`, rebuilds `wallGraph`, and does not split walls or merge mid-wall intersections.
- `wall-intersection` marks T/cross intersections on the canvas but does not auto-split walls.
- `overlapping-walls` currently detects simple horizontal/vertical overlaps only and does not auto-delete or merge walls.
- The inspector shows wall count, node count, issue count, and clickable issue rows; clicking an issue highlights related walls/endpoints/intersections in the wall graph helper layer.
- Wall Split / Node Graph is enabled. `project.version` is now `0.4.0-wall-split-node-graph`.
- `project.nodeGraph = { nodes: [], edges: [], issues: [], lastBuiltAt: null }`.
- Node Graph nodes use mm coordinates and have `id`, `x`, `y`, `kind`, `wallIds`, `edgeIds`, and `createdAt`.
- Node Graph edges use mm coordinates and preserve each source wall's `thickness`, `status`, `structural`, and `layer`; `edge.sourceWallId` points back to the original wall id.
- Selecting a `wall-intersection` issue shows the `切分交會牆段` action in the Node Graph inspector card.
- Manual intersection split is supported for T and cross intersections. It only splits the selected issue's related walls, does not auto-split all intersections, and does not create segments shorter than 200mm.
- Split walls keep the source wall's `status`, `thickness`, and `structural`; new split wall ids are generated and `sourceWallId` keeps the original wall reference.
- After split, `walls`, `wallGraph`, and `nodeGraph` are rebuilt, and export includes latest `nodeGraph`.
- Opening Editor is enabled. `project.version` is now `0.5.0-opening-editor`.
- `project.openings` now stores openings attached to `nodeGraph.edges`, not directly to legacy wall objects.
- Opening model: `id`, `edgeId`, `sourceWallId`, `kind` (`door/window/opening`), `offset`, `width`, `swing`, `sillHeight`, `height`, `createdAt`, and `updatedAt`.
- Door/window/opening creation uses the selected wall's matching `selectedEdgeId`; default widths are door 900mm, window 1200mm, and opening 1000mm.
- Opening validation blocks invalid dimensions: width below 300mm, `offset + width` beyond edge length, and adding openings to demolished edges.
- Opening rendering uses an SVG opening layer above walls; doors show a simple swing arc, windows show double-line marks, and generic openings show a dashed marker.
- Openings support selection, inspector editing, Delete/Backspace deletion, and JSON export.
- Zone Label MVP is enabled. `project.version` is now `0.6.0-zone-label-mvp`.
- `project.zones` now stores manual space labels with `id`, `name`, `type`, `labelPosition`, `boundaryEdgeIds`, `boundaryWallIds`, `polygon`, `area`, `createdAt`, and `updatedAt`.
- Zone labels are manually placed on the canvas after JPG/JPEG/PNG underlay import and scale calibration. `labelPosition` uses mm coordinates from the canvas top-left origin.
- Supported zone types: `living`, `bedroom`, `kitchen`, `bathroom`, `dining`, `balcony`, `entry`, `storage`, `closet`, and `other`; default Chinese names are mapped in `plan-puzzle.js`.
- Zone labels render in a dedicated HTML overlay layer above openings and below wall graph helpers. They support selection, inspector editing of `name/type/labelPosition`, Delete/Backspace deletion, and JSON export.
- Zone labels are manual room intent markers only. There is still no automatic closed polygon detection, boundary inference, area calculation, Plancraft room conversion, or budget quantity conversion from zones.
- Task dispatch note: Zone Label MVP was a Builder / Data Model / plan-puzzle task with implementation allowed by explicit user scope; recommend LAIBE_REVIEWER phase review before treating the zone schema as frozen.
- Zone Boundary MVP is enabled. `project.version` is now `0.7.0-zone-boundary-mvp`.
- `zone.boundaryEdgeIds` now stores selected `nodeGraph.edges` ids; `zone.boundaryWallIds` is derived from each edge's `sourceWallId` with duplicates removed.
- `zone.polygon` is generated in mm coordinates only when the user-selected boundary edges can form a closed loop in the selected order; `area` remains `null`.
- `zone.boundaryStatus` and `zone.boundaryIssues` are exported with each zone. Supported issue types: `zone-boundary-empty`, `zone-boundary-open`, `zone-boundary-too-few-edges`, and `zone-boundary-edge-missing`.
- Boundary editing is manual: select a zone, choose `編輯邊界`, click wall / edge segments to add or remove them from the boundary, then `套用邊界`. It does not auto-detect rooms, auto-sort complex edge loops, auto-calculate area, or modify wall / opening / nodeGraph data.
- The floor-plan canvas now includes a `zonePolygonLayer` below walls and above the grid. It renders closed zone polygons, selected boundary edge highlights, and in-progress boundary previews.
- `plancraftBridge` remains `not_ready` and now states that zone boundary data is still being stabilized before any future wall-first + openings + zones to Plancraft `.pc` converter.
- Task dispatch note: Zone Boundary MVP was a Builder / Data Model / plan-puzzle task with implementation allowed by explicit user scope; recommend LAIBE_REVIEWER phase review before treating the zone boundary schema as frozen.
- Draft export now downloads `laibe-plancraft-plus-draft.json` with the Plancraft+ fields and bridge placeholder.
- Still no automatic room closure, area calculation, furniture editing, Plancraft `.pc` import/export/converter, Plancraft renderer, API, login, database, cloud save, payment, or AI integration.
- Floor-plan header Tools is a dropdown; top-right page actions only include Return Previous and Budget Generation; canvas plugin should not contain the upload/add/return/budget action strip.
- Requirement page header no longer includes owner/vendor nav items; its Q&A result area has next-step entries to Floor Plan and Budget Generation.
- Homepage tools entry now links to `../preview_floor_plan/code.html`.
- Budget generation system first spec set is under `docs/budget/`.
- Budget engine Phase 1 is implemented as a local deterministic mock prototype under `src/lib/budget/`.
- Budget demo command: `node --experimental-strip-types src/lib/budget/demo-generate-budget.ts`.
- Budget Phase 2 preview-floor-plan adapter is implemented at `src/lib/budget/adapters/preview-floor-plan-adapter.ts`.
- Budget Phase 2 mock preview draft is `src/lib/budget/mock/mock-preview-floor-plan-draft.ts`; it mirrors the legacy room draft shape and should be updated before using it with the new Plancraft+ draft JSON.
- Budget Phase 2 demo command: `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`.
- Budget Phase 2.5 data warehouse foundation is implemented with local TypeScript/in-memory storage under `src/lib/budget/storage/`.
- Budget Phase 2.5 doc: `docs/budget/11-data-warehouse.md`.
- Budget Phase 2.5 demo command: `node --experimental-strip-types src/lib/budget/demo-load-budget-warehouse.ts`.
- Budget Phase 2.6 original catalog intake and classification prototype is implemented under `src/lib/budget/intake/`, but the user explicitly paused this original Phase 2.6 direction. Do not continue, wire, expand, or treat it as the active next phase unless the user redefines it.
- Budget Phase 2.6 doc: `docs/budget/12-catalog-intake-classification.md`.
- Budget Phase 2.6 demo command: `node --experimental-strip-types src/lib/budget/intake/demo-catalog-intake.ts`.
- Budget architecture has been reframed into three systems in `docs/budget/13-three-warehouse-architecture.md`: Raw Candidate Warehouse, Method / Spec Warehouse, and Estimate Output Logistics.
- Recommended budget next step is the Method / Spec Warehouse contract, not expanding the paused Phase 2.6 intake prototype.
- Budget Phase 2.7 Method / Spec Warehouse is implemented under `src/lib/budget/specs/`.
- Budget Phase 2.7 doc: `docs/budget/14-method-spec-warehouse.md`.
- Budget Phase 2.7 demo command: `node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts`.
- Budget Phase 2.7 can convert `MethodSpecCatalog` into the existing `BudgetCatalog` through `buildBudgetCatalogFromMethodSpec()`, so Phase 1 budget engine can consume approved method/spec rules.
- Budget Method / Spec Warehouse Phase MS-4 boundary doc is now `docs/budget/20-method-spec-to-budget-output-boundary.md`. It defines which MethodSpec shelves may affect `BudgetEstimateLine`, which shelves may only enrich `BudgetOutputSnapshot.internal_view`, and confirms renderers must not read `MethodSpecCatalog`.
- Budget Method / Spec Warehouse Phase MS-4 remains documentation-only: no renderer, output system, intake, frontend, floor-plan, RAG, AI API, DB migration, or payment/escrow/listing-fee code was modified.
- Budget Method / Spec Warehouse Phase MS-5 validator-only hardening is implemented in `src/lib/budget/specs/validate-method-spec-catalog.ts` and `src/lib/budget/specs/types.ts`; demo is `src/lib/budget/specs/demo-method-spec-validator-hardening.ts`; doc is `docs/budget/22-method-spec-validator-hardening.md`.
- Budget Method / Spec Warehouse Phase MS-5 adds P0 validator guards only: blocked pricing source types, allowed unbound material item allowlist, `InclusionExclusionRule.requires_review` scope-review policy visibility, and active quote item note coverage. It does not modify budget engine pricing flow, renderer/output/intake/frontend/floor-plan/RAG/AI/DB/payment code, and does not let `LaborRule`, `MaterialSpec`, `ItemMaterialBinding`, `NoteTemplate`, or `InclusionExclusionRule` change `unit_price` or `amount`.
- Budget Method / Spec Warehouse Phase MS-7 is planning-only in `docs/budget/24-method-spec-validator-p1-plan.md`. It plans P1 validator candidates and a clean worktree guard for future MS-8; it does not modify specs code, renderer/output/intake/frontend/floor-plan/RAG/AI/DB/payment code, and does not change budget engine pricing flow.
- Budget Method / Spec Warehouse Phase MS-8 P1-A validator implementation is complete. It adds `src/lib/budget/specs/method-spec-policy.ts`, `labor_rule_reference_only_guard`, and `src/lib/budget/specs/demo-method-spec-validator-p1.ts`; doc is `docs/budget/25-method-spec-validator-p1-implementation.md`. It only formalizes validator policy constants and blocks labor-derived PricingRule source types; it does not let LaborRule enter pricing and does not modify renderer/output/intake/raw-warehouse/frontend/floor-plan/RAG/AI/DB/payment code.
- Budget Method / Spec Warehouse Phase MS-10 is planning-only in `docs/budget/27-method-spec-validator-p1b-plan.md`. It scopes P1-B into UnitConversion coverage and active QuoteItemTemplate inclusion/exclusion coverage, and recommends splitting implementation while the repo baseline remains dirty.
- Budget Method / Spec Warehouse Phase MS-11A UnitConversion coverage validator implementation is complete. It adds `REQUIRED_UNIT_CONVERSION_PAIRS`, warning-only `unit_conversion_coverage_guard`, and `src/lib/budget/specs/demo-method-spec-validator-p1b.ts`; doc is `docs/budget/28-method-spec-validator-p1b-implementation.md`. Missing UnitConversion pairs now produce warnings, not errors; UnitConversion still does not recalculate quantity or enter the budget engine flow. MS-11B scope coverage is not implemented yet.
- Budget Method / Spec Warehouse Phase MS-11B Inclusion / Exclusion coverage validator implementation is complete. It adds `ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES`, warning-only `inclusion_exclusion_scope_coverage_guard`, and `src/lib/budget/specs/demo-method-spec-validator-scope-coverage.ts`; doc is `docs/budget/30-method-spec-scope-coverage-implementation.md`. Missing non-allowlisted scope rules now produce warnings, allowlisted missing scope rules produce allowed conditions, and scope coverage still does not propagate to output or change price, quantity, amount, renderer behavior, or formal work items.
- Budget Phase 2.8 Estimate Output Logistics is implemented under `src/lib/budget/output/`.
- Budget Phase 2.8 doc: `docs/budget/15-budget-output-logistics.md`.
- Budget Phase 2.8 demo command: `node --experimental-strip-types src/lib/budget/output/demo-budget-output-logistics.ts`.
- Budget Phase 2.8 outputs structured JSON only: customer rows, internal trace rows, validation report. It does not generate Excel or PDF.
- Budget Phase 2.9 MaterialSpec alignment and output snapshot contract is implemented under `src/lib/budget/specs/` and `src/lib/budget/output/`.
- Budget Phase 2.9 doc: `docs/budget/16-budget-output-snapshot-and-material-alignment.md`.
- Budget Phase 2.9 added `item_material_bindings` to `MethodSpecCatalog`, moved `material_code` resolution out of output hardcoding, and added `BudgetOutputSnapshot` plus an in-memory output snapshot repository.
- Budget Phase 2.9 demo command: `node --experimental-strip-types src/lib/budget/output/demo-budget-output-snapshot.ts`.
- Task dispatch note: Budget Phase 2.9 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before treating the snapshot contract as frozen.
- Budget Phase 2.9.1 Output Snapshot Contract Hardening is implemented under `src/lib/budget/output/` and `src/lib/budget/specs/`.
- Budget Phase 2.9.1 doc: `docs/budget/17-contract-hardening-2.9.1.md`.
- Budget Phase 2.9.1 keeps the Phase 2.9 main flow unchanged, but hardens `BudgetOutputSnapshot` top-level required field checks, adds `estimate_stage` to snapshots, prevents missing snapshot fields from throwing, and routes `ItemMaterialBinding.requires_review` into internal risks / output warnings without changing prices.
- Budget Phase 2.9.1 demo command: `node --experimental-strip-types src/lib/budget/output/demo-budget-output-snapshot.ts`.
- Task dispatch note: Budget Phase 2.9.1 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before moving into Excel/PDF renderer work.
- Budget Phase 2.9.2 Renderer Gate & Legacy Output Guard is implemented under `src/lib/budget/output/`.
- Budget Phase 2.9.2 doc: `docs/budget/18-renderer-gate-and-legacy-output-guard.md`.
- Budget Phase 2.9.2 added `assertSnapshotRenderable()` so future renderers must fresh-validate `BudgetOutputSnapshot` before output. The gate rejects invalid snapshots and requires `customer_view` by default.
- Budget Phase 2.9.2 marks `src/lib/budget/format-budget-output.ts` as legacy debug output only through `LEGACY_BUDGET_OUTPUT_WARNING`; formal Excel / PDF renderers must not use it.
- Budget Phase 2.9.2 demo command: `node --experimental-strip-types src/lib/budget/output/demo-renderer-gate.ts`.
- Task dispatch note: Budget Phase 2.9.2 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before allowing Excel/PDF renderer work.
- Budget Phase 3.0 Excel / PDF Renderer Skeleton is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.0 doc: `docs/budget/19-excel-pdf-renderer-skeleton.md`.
- Budget Phase 3.0 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-render-snapshot.ts`.
- Budget Phase 3.0 renderers read `BudgetOutputSnapshot` only and call `assertSnapshotRenderable()` before output. Customer renderer reads `customer_view` only; internal trace renderer reads `internal_view`.
- Budget Phase 3.0 outputs structured rows, simple HTML skeleton strings, and CSV skeleton strings only. It does not generate real `.xlsx` or `.pdf` files.
- Budget Phase 3.0 renderer code must not import or call `generateBudgetEstimate()`, pricing rules, material resolver, RAG, AI API, or legacy `formatBudgetOutput()`. The demo may generate a snapshot before invoking renderer functions.
- Task dispatch note: Budget Phase 3.0 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before formal Excel/PDF renderer work.
- Budget Phase 3.1 Renderer Contract Hardening & Static Guard is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.1 docs: `docs/budget/20-renderer-contract-hardening.md` and `docs/budget/21-formal-excel-pdf-layout-contract.md`.
- Budget Phase 3.1 added `assertSnapshotRenderableForRenderer()` as the renderer-only gate. It does not accept `methodSpecCatalog`; catalog-aware validation remains outside formal renderer entry.
- Budget Phase 3.1 added runtime render option validation, customer warning sanitization, serializer guard markers, and `renderer-static-guard.ts` denylist scanning for formal renderer files.
- Budget Phase 3.1 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-renderer-hardening.ts`.
- Task dispatch note: Budget Phase 3.1 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before formal `.xlsx` / `.pdf` file renderer work.
- Budget Phase R1 Raw Candidate Warehouse Foundation is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1 doc: `docs/budget/20-raw-candidate-warehouse-plan.md`.
- Budget Phase R1 demo command: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts`.
- Budget Phase R1 is the active raw material procurement / candidate warehouse path for this chatroom. It is separate from Renderer / Excel / PDF, `BudgetOutputSnapshot`, floor-plan work, and the paused old `src/lib/budget/intake/` prototype.
- Budget Phase R1 collects mock raw sources, flattens raw items, rule-classifies candidates, normalizes candidate fields, validates into `valid_for_review` / `needs_more_info` / `blocked`, creates a review queue, simulates candidate-only approval, and outputs handoff proposals.
- Budget Phase R1 must not generate formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, formal quotes, or official prices. Candidate prices are stored only as `observed_price`; `formal_price_generated` must remain `false`.
- Task dispatch note: Budget Phase R1 was a Builder / Data Model budget-system task scoped to Raw Candidate Warehouse only; recommend LAIBE_REVIEWER review before treating the raw candidate contract as stable.
- Budget Phase R1.1 Raw Candidate Warehouse Contract Hardening is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.1 doc: `docs/budget/21-raw-candidate-contract-hardening.md`.
- Budget Phase R1.1 adds full proposal provenance (`RawCatalogSource -> RawCatalogItem -> Candidate -> ValidationResult -> ReviewQueueItem -> HandoffProposal`), explicit risk flag taxonomy, observed price safety validation, and a local raw-warehouse import boundary static guard.
- Budget Phase R1.1 demo commands: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts` and `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-warehouse-static-guard.ts`.
- Budget Phase R1.1 still does not create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan adapters, RAG/AI/DB/payment code, or real procurement ingestion. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase R1.2 Raw Review Contract & Warehouse Safety Validator is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.2 doc: `docs/budget/22-raw-review-contract-safety-validator.md`.
- Budget Phase R1.2 adds `validateHandoffProposalContract()`, `validateWarehouseExportSafety()`, and `evaluateRawCandidateMergePolicy()` so handoff proposals keep full provenance, exports reject formal price/catalog fields, and duplicate/merge signals remain recommendation-only.
- Budget Phase R1.2 demo commands: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-review-contract-safety.ts`, `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts`, and `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-warehouse-static-guard.ts`.
- Budget Phase R1.2 keeps `approved_as_candidate` as candidate evidence only. It is not formal approval, not formal catalog publishing, not formal pricing approval, and not a source for customer output.
- Budget Phase R1.2 still does not create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan adapters, RAG/AI/DB/payment code, or real procurement ingestion. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase R1.2A Raw Data Feeding Trial is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.2A doc: `docs/budget/23-raw-data-feeding-trial.md`.
- Budget Phase R1.2A demo command: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-data-feeding-trial.ts`.
- Budget Phase R1.2A adds `createRawCatalogSourceFromBudgetRows()` and `runRawDataFeedingTrial()` to test a small manually arranged budget sheet sample. It maps sample rows into one `historical_quote` `RawCatalogSource`, then into `RawCatalogItem`, candidate, validation result, review queue, and handoff proposal.
- Budget Phase R1.2A sample run result: 10 sample rows, 10 raw items, 10 candidates, 10 `valid_for_review`, 0 `needs_more_info`, 0 `blocked`, 10 handoff proposals, proposal contract valid, warehouse export safety valid, observed price safety valid, static guard valid.
- Budget Phase R1.2A still does not parse Excel files, import real data, create a DB migration, publish catalog data, create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan data, RAG/AI/DB/payment code, or formal quotes. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase R1.3 Raw Warehouse Multi-Source Fixture Expansion is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.3 doc: `docs/budget/24-raw-multi-source-fixtures.md`.
- Budget Phase R1.3 demo command: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-multi-source-fixtures.ts`.
- Budget Phase R1.3 adds `rawMultiSourceFixtureSources` and `runRawMultiSourceFixtureTrial()` to test five local raw source types: `historical_quote`, `material_price_sheet`, `vendor_quote`, `labor_rate_sheet`, and `brand_model_catalog`.
- Budget Phase R1.3 sample run result: 5 sources, 13 raw items, 13 candidates, candidate type counts `historical_quote_line: 2`, `material_price: 3`, `vendor_quote: 2`, `labor_rate: 3`, `brand_model: 3`; 13 handoff proposals; proposal contract valid; warehouse export safety valid; observed price safety valid; static guard valid.
- Budget Phase R1.3 verifies `brand_model_catalog` rows remain non-price-bearing: `brand_model_candidate_count: 3`, `brand_model_price_bearing_count: 0`.
- Budget Phase R1.3 still does not parse Excel files, import real data, create a DB migration, publish catalog data, create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan data, RAG/AI/DB/payment code, or formal quotes. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase R1.4 Raw Negative / Source Quality Fixtures is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.4 doc: `docs/budget/25-raw-negative-source-quality-fixtures.md`.
- Budget Phase R1.4 demo command: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-negative-source-quality-fixtures.ts`.
- Budget Phase R1.4 adds `rawNegativeSourceQualityFixtureSources` and `runRawNegativeSourceQualityFixtureTrial()` to test dirty raw evidence: missing source date, missing currency, missing unit, negative observed price, high / low outliers, unit mismatch, same source period duplicates, missing model, missing spec, low source reliability, and ambiguous raw names.
- Budget Phase R1.4 sample run result: 13 fixture cases, 11 sources, 16 raw items, 16 candidates, 8 `valid_for_review`, 7 `needs_more_info`, 1 `blocked`, 1 rejected review item, and 8 handoff proposals.
- Budget Phase R1.4 verifies major risk flags are present: `missing_source_date`, `missing_currency`, `missing_unit`, `blocked_negative_price`, `price_outlier_high`, `price_outlier_low`, `unit_mismatch`, `same_source_period_duplicate`, `missing_model`, `missing_spec`, `low_source_reliability`, and `ambiguous_name`.
- Budget Phase R1.4 blocks the negative observed price candidate from producing a handoff proposal. Proposal contract, warehouse export safety, observed price safety, and static guard all pass.
- Budget Phase R1.4 still does not parse Excel files, import real data, create a DB migration, publish catalog data, create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan data, RAG/AI/DB/payment code, or formal quotes. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase 1/2/2.5/2.6/2.7/2.8/2.9/2.9.1/2.9.2/3.0/3.1/R1 intentionally has no frontend, formal database migration, RAG, Skills, AI API, external crawling, formal Excel/PDF generation, payment, escrow, or listing fee integration.
- `C:\laibe_project\plancraft` is a local reference clone only. It is excluded locally via `.git/info/exclude` and should not be committed into LaiBE MVP.

## Product Freeze Points

- LaiBE is not a generic matching platform.
- LaiBE is a renovation governance / decision workbench.
- Payment, listing fee, escrow, fund release, and webhook are mock/prototype only.
- Do not connect real upload, real AI API, real payment, or real escrow unless explicitly approved.
- Image Generation API work must remain spike-only until the governance pack is followed and LAIBE_REVIEWER 審查結果es it.
- API keys must never appear in frontend, repo, HTML, JS, Markdown, handoff, console output, or browser-readable files.
- Generated images must not be treated as official designs, construction drawings, real cases, quotation basis, completion guarantees, production assets, or official case data.
- Do not turn AI PCM into the final judge.

## Next Work

1. Immediate next step for visual simulation: if continuing beyond the disabled adapter, first choose a server runtime direction for a separate spike. Options include local Node server, Python dev server + separate proxy, Netlify Function, Vercel Function, Cloudflare Worker, or another user-approved deployment path. Do not mark it online, production, or real API-enabled before user-triggered LAIBE_REVIEWER review.
2. Recommended next floor-plan task: Plancraft Bridge `.pc` Converter Spike, because manual zones can now be connected to nodeGraph edges and exported as boundary data.
3. Budget raw-warehouse next step for this chatroom can be R1.4 review or R1.5 source quality scoring / reviewer checklist. Keep it proposal-only and do not take over Renderer, Excel/PDF, `BudgetOutputSnapshot`, floor-plan, or the paused old `intake/` path in this chatroom.
4. Budget renderer next step, if requested in the renderer/output chatroom, should review Phase 3.1 with LAIBE_REVIEWER, then proceed to Phase 3.2 formal renderer layout/file-generation work only from `BudgetOutputSnapshot`.
5. Do not continue the original Phase 2.6 intake path unless the user explicitly reopens or redefines that direction.
6. Start Budget Phase 3 floor-plan adapter work only if the user asks: update budget adapters for the new Plancraft+ draft shape, add real furniture/fixture data to the floor-plan page, or refine area-based bathroom quantity facts.
7. Keep Plancraft `.pc` bridge/export for after the wall graph and opening model are stable.
8. Keep each page edit scoped to one page.
9. Do not create more status MD files; update this file only when project status changes.

## Notes For New Codex

- The user prefers direct edits over long reports.
- Do not restart broad inventory or QA loops unless requested.
- Use the homepage visual direction as the style parent: black base, cement texture, brushed metal/glass, sparse cyan/mint/orange highlights, large breathing room.
- Do not git clean, git reset, modify plancraft, add npm / React / Vite / package.json / node_modules, or modify files outside the task scope unless explicitly authorized.

## Budget Renderer Phase 3.2 Handoff

- Budget Phase 3.2 Formal Renderer Entry + Layout Contract Implementation is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.2 doc: `docs/budget/22-formal-renderer-entry-contract.md`.
- Budget Phase 3.2 formal entry command: `node --experimental-strip-types src/lib/budget/renderers/demo-formal-renderer-entry.ts`.
- Budget renderer static guard command: `node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts`.
- Formal renderer entry is `renderFormalBudgetDocument(snapshot, options)` in `src/lib/budget/renderers/formal-renderer-entry.ts`.
- Formal renderer entry accepts only `BudgetOutputSnapshot` plus `FormalRendererOptions`; it rejects `methodSpecCatalog` at runtime.
- The first gate in formal renderer entry is `assertSnapshotRenderableForRenderer(snapshot)`.
- Formal Excel/PDF skeleton functions require the runtime token created by `formal-renderer-entry.ts`; the old string marker is not sufficient, and direct skeleton calls without the token fail at runtime.
- Formal renderer options currently support `audience: customer | internal_trace`, `format: excel_skeleton | pdf_skeleton`, and `layout_profile: standard_a4 | compact_a4 | internal_trace_a4`.
- `formal-layout-contract.ts` defines layout metadata only: column specs, section specs, signature block, totals block, notes block, pagination, header/footer, and customer/internal style separation.
- Customer layout columns are limited to customer-safe fields: `trade_category`, `line_no`, `item_name`, `unit`, `quantity`, `unit_price`, `amount`, and `customer_note`.
- Internal trace layout may include trace fields such as `item_code`, `source_type`, `source_id`, `recipe_id`, `material_code`, `quantity_formula`, `price_source`, `confidence`, `requires_review`, and `internal_note`.
- `formal-excel-renderer-skeleton.ts` and `formal-pdf-renderer-skeleton.ts` output structured skeleton objects only. They do not generate `.xlsx` or `.pdf`.
- `renderer-static-guard.ts` now scans the Phase 3.2 formal renderer files and rejects forbidden renderer imports / keywords such as `budget-generator`, `generateBudgetEstimate`, `mock-pricing`, `seed-budget-catalog`, `material-code-resolver`, `format-budget-output`, `LEGACY_BUDGET_OUTPUT_WARNING`, `rag`, `ai`, and `openai`.
- `run-renderer-static-guard.ts` is a command wrapper that prints validity, issue count, scanned files, and checked forbidden keywords; it exits non-zero if issues are found.
- Phase 3.2 did not modify frontend, floor-plan, preview_floor_plan, plan-puzzle, `code.html`, database migrations, RAG, AI API, Skills, payment, escrow, or listing fee.
- Task dispatch note: Budget Phase 3.2 is a Builder / Data Model / renderer-contract task with implementation allowed by user scope. Mark Phase 3.2 as review-ready before any real `.xlsx` or `.pdf` file writer; LAIBE_REVIEWER runs only if the user explicitly requests formal review.

## Budget Renderer Phase 3.3 Handoff

- Budget Phase 3.3 Formal File Writer Preflight & Guard Tightening is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.3 docs: `docs/budget/23-formal-file-writer-preflight.md` and `docs/budget/24-renderer-artifact-policy.md`.
- Budget Phase 3.3 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-formal-file-writer-preflight.ts`.
- Renderer static guard command remains: `node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts`.
- Formal Excel/PDF skeleton entry now uses `formal-renderer-token.ts`; the old string marker is no longer accepted as sufficient proof of formal entry.
- `formal-file-writer-policy.ts` defines artifact audience, future format, naming, storage, and security rules. It does not write files.
- `formal-file-writer-preflight.ts` validates gated structured output before any future file writer may run. It checks token provenance, audience/format, filename, snapshot id, layout, totals, rows, customer trace leakage, internal marking, sanitized warnings, and forbidden writer options.
- `fixture-budget-output-snapshot.ts` provides a fixed `BudgetOutputSnapshot` fixture so renderer / file-writer preflight can run without calling the budget engine.
- `renderer-static-guard.ts` now also detects dynamic import, require calls, path alias imports, cross-file re-export patterns, and scans full renderer source content for forbidden keywords.
- Root `package.json` does not exist, so Phase 3.3 did not add an npm script or create a package file.
- Phase 3.3 still does not generate real `.xlsx` or `.pdf`; Excel/PDF outputs remain structured skeleton documents only.
- Phase 3.3 did not modify frontend, floor-plan, preview_floor_plan, plan-puzzle, `code.html`, database migrations, RAG, AI API, Skills, payment, escrow, or listing fee.
- Task dispatch note: Budget Phase 3.3 is a Builder / Data Model / renderer-contract hardening task with implementation allowed by user scope. Mark Phase 3.3 as review-ready before any actual file writer; LAIBE_REVIEWER runs only if the user explicitly requests formal review.

## Budget Renderer Phase 3.4 Handoff

- Budget Phase 3.4 File Writer Dry-run Contract Hardening is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.4 doc: `docs/budget/25-file-writer-dry-run-contract.md`.
- Budget Phase 3.4 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-file-writer-dry-run-hardening.ts`.
- Renderer static guard command remains: `node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts`.
- `runFormalFileWriterPreflight()` is now no-throw for malformed input. Null, undefined, primitive values, missing `snapshot_id`, missing `layout_contract`, missing `layout_contract.columns`, missing / non-array `rows`, missing `totals`, missing `audience`, missing `renderer`, wrong token, customer trace leakage, bad filename, and forbidden writer options return `valid: false` with errors instead of throwing.
- `fixture-invalid-formal-documents.ts` provides invalid gated-document cases without importing or calling the budget engine.
- `formal-file-writer-dry-run.ts` returns would-write metadata only. It does not write files, does not import file write APIs, and does not create `.xlsx` or `.pdf`.
- `renderer-static-guard.ts` now reports `forbidden_rules_checked` with rule type (`full_text`, `import_pattern`, `restricted_usage`) and enforces that `createFormalRendererToken()` may only be used by `formal-renderer-entry.ts` and `formal-renderer-token.ts`.
- `docs/budget/22-formal-renderer-entry-contract.md` and `docs/budget/23-formal-file-writer-preflight.md` now describe token / factory behavior instead of the old string marker contract.
- Phase 3.4 still does not generate real `.xlsx` or `.pdf`; it only hardens preflight and dry-run writer readiness.
- Phase 3.4 did not modify frontend, floor-plan, preview_floor_plan, plan-puzzle, `code.html`, database migrations, RAG, AI API, Skills, payment, escrow, or listing fee.
- Task dispatch note: Budget Phase 3.4 is a Builder / Data Model / renderer-contract hardening task with implementation allowed by user scope. Mark Phase 3.4 as review-ready before any actual file writer; LAIBE_REVIEWER runs only if the user explicitly requests formal review.

## Budget Renderer Phase 3.5 Handoff

- Budget Phase 3.5 Formal File Writer Controlled Entry Spike is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.5 doc: `docs/budget/26-formal-file-writer-controlled-entry.md`.
- Budget Phase 3.5 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-formal-file-writer-controlled-entry.ts`.
- Renderer static guard command remains: `node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts`.
- `writeFormalBudgetArtifact(gatedDocument, options)` is the controlled writer entry. Its first runtime step is `runFormalFileWriterPreflight()`.
- Preflight failure returns a blocked result and does not write any artifact.
- `formal-artifact-manifest.ts` defines `FormalArtifactManifest` with snapshot id, project id, estimate id, audience, format, intended extension, actual artifact kind, filename, storage target, row count, total amount, layout profile, created time, policy id, warnings, and security flags.
- Security flags record snapshot-only behavior and confirm engine, pricing, material resolver, RAG, AI, and legacy output were not called or used.
- `formal-local-staging-policy.ts` restricts local staging to `artifacts/budget-renderer-staging/`, rejects absolute paths, path traversal, formal `.xlsx` / `.pdf` targets, unsupported extensions, and signed / approved overwrite.
- `formal-placeholder-artifact-writer.ts` can only write `.json` manifest or `.txt` placeholder when explicitly requested and staging policy passes. The Phase 3.5 demo uses manifest-only mode and does not write files.
- `renderer-static-guard.ts` now also blocks workbook-style libraries and writer escapes: workbook token, `xlsx` package import, `pdfkit`, `jspdf`, `puppeteer`, `playwright`, `html-pdf`, `writeFileSync` outside the placeholder writer, and `createWriteStream` outside the placeholder writer.
- Phase 3.5 still does not generate real `.xlsx` or `.pdf`; it only establishes controlled writer entry, manifest, local staging policy, placeholder writer guard, and static guard coverage.
- Phase 3.5 did not modify frontend, floor-plan, preview_floor_plan, plan-puzzle, `code.html`, database migrations, RAG, AI API, Skills, payment, escrow, or listing fee.
- Task dispatch note: Budget Phase 3.5 is a Builder / Data Model / renderer-contract spike with implementation allowed by user scope. It is ready to be included in phase review materials before any production-grade file writer is attempted.

## Output Documents Issue #18 Handoff

- Workstream: `output/budget-documents`.
- Branch: `output/renderer-static-guard-review-packet`.
- GitHub Issue: `#18 [Output Documents] Add renderer snapshot-only review packet / static guard next step`.
- Added `docs/budget/27-renderer-snapshot-only-review-packet.md` as the snapshot-only review packet for renderer static guard / import denylist / placeholder writer hardening.
- Added `src/lib/budget/renderers/formal-file-writer-policy.ts` so formal writer preflight / manifest / staging modules have a concrete artifact policy contract.
- Added `src/lib/budget/renderers/run-renderer-static-guard.ts` as the local command entry for renderer static guard.
- Static guard command: `node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts`.
- Writer path remains snapshot-only: formal writer can only consume `renderFormalBudgetDocument()` gated structured output and must pass `runFormalFileWriterPreflight()` first.
- This issue still does not generate real `.xlsx` or `.pdf`, does not introduce a document library, does not rerun budget engine, does not read pricing rules or material resolver, and does not touch MethodSpecCatalog, raw warehouse, frontend, plan-puzzle, payment, DB, RAG, or AI API.
## Latest Visual Simulation Task: Minimal Real Server Runtime Spike Revalidation

- 本輪任務名稱：Minimal Real Server Runtime Spike。
- 任務類型：Builder / Minimal Server Runtime Spike / proof of concept only；不是 production integration，沒有部署，沒有宣稱正式上線，也沒有把 disabled adapter 升級成 production API。
- 本輪重新盤點結果：`C:\laibe_project` 根目錄仍沒有 `package.json`、`node_modules`、`api/`、`server/`、`backend/`、`functions/`、`netlify.toml`、`vercel.json`、`wrangler.toml`、`.env` 或既有可安全承載 same-origin image proxy 的 server runtime。
- 本輪判斷：目前 LaiBE MVP 仍以靜態 `file:///` 頁面為主；在使用者決定 runtime 選型前，不適合硬造 `api/`、`server/` 或 production-like backend 結構。
- 本輪採用路線 B：沒有建立 server/proxy stub，沒有新增 backend/api/functions/server 目錄，沒有新增 `package.json`、`node_modules` 或任何 framework。
- 修改檔案：`docs/NEXT_CODEX_HANDOFF.md`。
- 新增檔案：無。
- 未修改：`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`、`C:\laibe_project\plancraft`、routing、CTA、Header。
- `code.html` 目前已使用 `./plan-puzzle.js?v=minimal-server-runtime-spike`，本輪未再修改；`file:///` 靜態載入架構仍保留。
- `plan-puzzle.js` 本輪未修改；`callStyleVisualImageProxy(styleVisualApiRequest)` 仍預設 disabled，沒有 `fetch()`、沒有 `XMLHttpRequest`，不直連外部 image API，不包含 API key，也不依賴任何真 server endpoint。
- Future same-origin proxy contract 仍只能是 `/api/style-visual-image-spike`；目前 endpoint 未啟用、未呼叫、未依賴。
- `styleVisualApiRequest` contract 維持白名單欄位：`roomType`、`primaryStyle`、`secondaryStyle`、`colorTone`、`materialTone`、`budgetLevel`、`purpose: "bid-listing-style-reference"`、`disclaimerRequired: true`、`referenceImage: { allowed: false, reason: "reference image upload requires separate privacy review" }`。
- `styleVisualApiRequest` 不得包含 `rawPrompt`、`systemPrompt`、`developerPrompt`、`walls`、`openings`、`zones`、`scale`、`plancraftBridge`、正式預算資料、reference image file 或使用者私宅圖片。
- `styleVisualApiResponse` contract 維持 `status: "disabled" | "mock_ready" | "error"`、`imageUrl: null`、`previewDataUrl: null`、`message` 與 metadata；metadata 必須保留 `generatedBy: "LAIBE_VISUAL_SIM"`、`usage: "bid-listing-style-reference"`、`sandbox: true`、`isOfficialDesign: false`、`isConstructionDrawing: false`、`isQuotationBasis: false`、`isRealCase: false`、`savedToOfficialCase: false`。
- UI fallback 仍顯示 `Server-side Image API proxy 尚未設定`；Visual Simulation Panel 必須保留 `Sandbox Preview`、`AI 示意圖`、`非正式圖片`、`不會保存到正式案件`、`非真實案例`、`非正式成果` 與固定 disclaimer。
- `styleVisualTask.generatedPreview` 仍只能是 local UI task state；不得寫入 `project`、export JSON、正式案件資料、production assets、budget data、`walls`、`openings`、`zones`、`scale` 或 `plancraftBridge`。
- Reference image upload 仍 disabled，`referenceImage.allowed` 必須維持 `false`；不得建立 upload pipeline。
- 本輪沒有 real image API、沒有 OpenAI 或第三方模型呼叫、沒有 API key、沒有 `.env`、沒有 secret、沒有 production endpoint。
- 若下一步要建立真 server runtime，需先由使用者決定 runtime 選型：local Node server、Python dev server + separate proxy、Netlify Function、Vercel Function、Cloudflare Worker 或其他部署方式。以目前靜態 MVP 與禁止新增 package 的限制看，下一個 local-only spike 可優先評估「內建 Node `http` 的 local same-origin dev server」，但必須另開任務並維持 disabled-by-default / no-secret 規則。
- 本輪成果可供使用者後續主動交給 LAIBE_REVIEWER 做 runtime boundary review；在進入任何真 server runtime、真 API request、key 注入、production connection 或 reference image upload 前，應先完成使用者觸發的審查。
