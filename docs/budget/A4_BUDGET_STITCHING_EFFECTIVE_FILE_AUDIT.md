# A4 Budget Stitching Effective File Audit

Updated: `2026-06-17`

Task: `A4_BUDGET_STITCHING_EFFECTIVE_FILE_AUDIT_NO_RUNTIME`

Mode: docs-only audit. No runtime, harness, tests, build, dev server, `src/**`, stage, commit, push, PR, merge, formal estimate, production quantity, Excel, or PDF.

## 1. Audit Decision Summary

| Field | Decision |
|---|---|
| Current PR #104 status | `MERGED` on GitHub, merged at `2026-06-15T06:51:20Z` |
| Correct next path family | `BG1_POST_SHARED_TRUTH_BUDGET_STITCHING_PATH_LOCK_NO_RUNTIME` |
| Current useful shared truth base | PR #104 docs-only shared truth plus PR #100 candidate-only boundary and Plan Puzzle 0.12 docs-only alignment |
| Current blocker | Runtime entrypoint and ingest contract gaps remain; Issue #89 still blocks harness execution |
| Static UI / PR105 relevance | Not core to `CORRECT_BUDGET_GENERATION_STITCHING` |
| Runtime implementation authority | Not present |

## 2. Category Counts

| Category | Count | Meaning |
|---|---:|---|
| Core Stitching Useful | 39 | Directly informs the budget stitching path, runtime gap, guard design, source-of-truth, or next no-runtime authorization |
| Shared Truth / Governance Useful | 24 | Useful to understand PR #104, handoff, file-list, merge/review gate, and next-action governance |
| Superseded / Historical | 33 | Useful history but replaced by later verdicts, PR #104 merge, PR #100 active-head decision, or post-shared-truth path lock |
| Local Evidence Only | 14 | Useful but not yet main/shared truth; should not alone drive implementation |
| Side-track / Not Core | 52 | Commander loop/static UI/onboarding/renderer/raw/method side evidence that must not drive budget stitching next action |

## 3. Core Stitching Useful

These files can drive the next no-runtime budget stitching decision, with their stated guards.

| File path | Category | Why useful / why not useful | Current status | Shared truth status | Should drive next action | Relation to `CORRECT_BUDGET_GENERATION_STITCHING` | Risk if used incorrectly |
|---|---|---|---|---|---|---|---|
| `docs/budget/BUDGET_RUNTIME_ENTRYPOINT_DISCOVERY.md` | Core Stitching Useful | Identifies missing `budget-generator.ts`, `generateBudgetEstimate`, and `BudgetEstimateBlockedError` | Current evidence baseline | Shared via PR #104 | yes | Defines why stitching cannot run yet | Recreating runtime entrypoint without authorization |
| `docs/budget/BUDGET_RUNTIME_DOCS_DRIFT_AUDIT.md` | Core Stitching Useful | Separates docs claims from actual runtime files | Current drift baseline | Shared via PR #104 | yes | Prevents treating docs as runtime | Mistaking historical docs claims for implemented code |
| `docs/budget/BUDGET_RUNTIME_DOCS_DRIFT_DECISION_PACKET.md` | Core Stitching Useful | Converts drift into blocking decisions | Current decision baseline | Shared via PR #104 | yes | Defines runtime stitching blockers | Bypassing missing type/source reconciliation |
| `docs/budget/BUDGET_INTERNAL_INTERFACE_PREP.md` | Core Stitching Useful | Defines `BudgetInputBundle`, `QuantityFacts`, `MethodSpecCatalog`, `BudgetEstimate`, and `BudgetOutputSnapshot` boundaries | Current interface prep | Shared via PR #104 | yes | Provides interface map without execution | Treating prep contracts as runtime authority |
| `docs/budget/BUDGET_ISSUE_89_GATE_SNAPSHOT.md` | Core Stitching Useful | Captures Issue #89 harness gate | Current gate evidence, but may need refresh before execution | Shared via PR #104 | yes | Keeps harness blocked | Treating old snapshot as execution approval |
| `docs/budget/BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_COLLECTION_RESULT.md` | Core Stitching Useful | Read-only evidence for missing/found runtime sources | Current evidence packet | Shared via PR #104 | yes | Basis for repair decision | Treating evidence as repair |
| `docs/budget/BG1_RUNTIME_REPAIR_DECISION_PACKET.md` | Core Stitching Useful | Summarizes repair decisions and gaps | Current decision packet | Shared via PR #104 | yes | Identifies exact runtime repair blockers | Using as implementation authorization |
| `docs/budget/BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN.md` | Core Stitching Useful | Defines minimal future repair design | Current design baseline | Shared via PR #104 | yes | Defines smallest allowed future skeleton concept | Implementing without separate authorization |
| `docs/budget/BG1_MINIMAL_RUNTIME_REPAIR_CONTRACT.md` | Core Stitching Useful | Defines dry-run-only/candidate-only future contract | Current contract baseline | Shared via PR #104 | yes | Prevents formal estimate or production quantity | Treating candidate output as formal output |
| `docs/budget/BG1_BUDGET_GENERATOR_SKELETON_DESIGN.md` | Core Stitching Useful | Future `budget-generator.ts` responsibilities | Current design only | Shared via PR #104 | yes | Defines guarded entrypoint expectations | Creating the file before authorization |
| `docs/budget/BG1_GENERATE_BUDGET_ESTIMATE_GUARD_DESIGN.md` | Core Stitching Useful | Future guard requirements for `generateBudgetEstimate` | Current design only | Shared via PR #104 | yes | Blocks formal/production misuse | Treating guard design as existing guard |
| `docs/budget/BG1_BUDGET_ESTIMATE_BLOCKED_ERROR_DESIGN.md` | Core Stitching Useful | Future blocked reason model | Current design only | Shared via PR #104 | yes | Gives deterministic blocked semantics | Claiming `BudgetEstimateBlockedError` exists |
| `docs/budget/BG1_NO_PRODUCTION_QUANTITY_GUARD_DESIGN.md` | Core Stitching Useful | Defines production quantity prohibition | Current guard design | Shared via PR #104 | yes | Protects candidate quantity boundary | Promoting candidate area/facts to production |
| `docs/budget/BG1_NO_FORMAL_ESTIMATE_GUARD_DESIGN.md` | Core Stitching Useful | Defines formal estimate prohibition | Current guard design | Shared via PR #104 | yes | Keeps dry-run/candidate output non-formal | Producing formal quote/Excel/PDF |
| `docs/budget/BG1_PR100_RUNTIME_ADAPTER_PROHIBITION_NOTE.md` | Core Stitching Useful | Prohibits PR #100 embedded script runtime wiring | Current boundary | Shared via PR #104 | yes | Keeps PR #100 candidate-only | Using PR #100 as runtime adapter |
| `docs/budget/BG1_PR100_DOCS_ONLY_ACTIVE_HEAD_BOUNDARY.md` | Core Stitching Useful | Defines PR #100 allowed/forbidden use | Current boundary | Shared via PR #104 | yes | Establishes active candidate export head restrictions | Treating PR #100 as production schema |
| `docs/budget/BG1_PR100_PLAN_PUZZLE_0_12_ALIGNMENT.md` | Core Stitching Useful | Aligns PR #100 to Plan Puzzle 0.12 docs-only use | Current alignment | Shared via PR #104 | yes | Defines candidate area metadata constraints | Reading alignment as production quantity authority |
| `docs/budget/BG1_PLAN_PUZZLE_0_12_SHARED_TRUTH_INTAKE_CONSUMPTION.md` | Core Stitching Useful | Consumes Plan Puzzle 0.12 shared truth for docs-only planning | Current intake | Shared via PR #104 | yes | Defines candidate geometry/area context | Treating intake as runtime adapter |
| `docs/budget/BG1_PLAN_PUZZLE_0_12_SHARED_TRUTH_BLOCKERS.md` | Core Stitching Useful | Lists remaining blockers after intake | Current blocker map | Shared via PR #104 | yes | Keeps runtime/harness/formal gates closed | Ignoring blockers |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_HEAD_VERDICT_CONSUMPTION.md` | Core Stitching Useful | Records PR #100 as docs-only active candidate head | Current verdict consumption | Shared via PR #104 | yes | Resolves PR #76/#100 candidate head decision | Treating verdict as production approval |
| `docs/budget/BG1_DOCS_ONLY_RUNTIME_DRIFT_REPAIR_PLAN.md` | Core Stitching Useful | Plans runtime drift repair without execution | Current plan | Shared via PR #104 | yes | Bridges shared truth to repair planning | Turning plan into code patch |
| `docs/budget/BG1_RUNTIME_DRIFT_REPAIR_GATE_MATRIX.md` | Core Stitching Useful | Gate matrix for runtime drift repair | Current guard matrix | Shared via PR #104 | yes | Defines what must be gated | Skipping required gates |
| `docs/budget/BG1_BUDGET_GENERATOR_ENTRYPOINT_REPAIR_PLAN.md` | Core Stitching Useful | Entrypoint repair plan | Current plan | Shared via PR #104 | yes | Identifies future generator repair shape | Creating generator prematurely |
| `docs/budget/BG1_BUDGET_ESTIMATE_TYPE_TRACE_PLAN.md` | Core Stitching Useful | Type trace plan for `BudgetEstimate`/line | Current plan | Shared via PR #104 | yes | Addresses unresolved type source | Inventing types without trace |
| `docs/budget/BG1_RUNTIME_REPAIR_FORBIDDEN_SCOPE.md` | Core Stitching Useful | Forbidden scope for runtime repair | Current guard | Shared via PR #104 | yes | Prevents overreach | Using future repair to touch forbidden files |
| `docs/budget/BG1_MINIMAL_RUNTIME_REPAIR_SEQUENCE.md` | Core Stitching Useful | Future repair order | Current sequence | Shared via PR #104 | yes | Orders safe no-runtime-to-runtime transition | Treating order as authorization |
| `docs/budget/BG1_RUNTIME_REPAIR_TESTLESS_ACCEPTANCE_CRITERIA.md` | Core Stitching Useful | Acceptance criteria without tests/harness | Current criteria | Shared via PR #104 | yes | Defines review evidence before execution | Treating testless acceptance as runtime proof |
| `docs/budget/BG1_POST_SHARED_TRUTH_BUDGET_STITCHING_PATH_LOCK.md` | Core Stitching Useful | Post-PR104 path lock | Current local path lock | Local only after PR #104 | yes | Best current next-action map | Treating local-only path lock as merged main |
| `docs/budget/BG1_BUDGET_STITCHING_SOURCE_OF_TRUTH_MAP.md` | Core Stitching Useful | Maps governance, PR100, Plan Puzzle, runtime evidence, harness gate | Current local map | Local only after PR #104 | yes | Needed source-of-truth map | Treating local map as shared truth |
| `docs/budget/BG1_BUDGET_STITCHING_DATA_CONTRACT_MAP.md` | Core Stitching Useful | Maps contract path from work item to output gate | Current local map | Local only after PR #104 | yes | Needed data contract map | Missing ingest contracts may make it incomplete |
| `docs/budget/BG1_BUDGET_STITCHING_GUARD_MATRIX.md` | Core Stitching Useful | Lists forbidden stitching flows and positive guards | Current local matrix | Local only after PR #104 | yes | Needed guard matrix | Assuming guard code exists |
| `docs/budget/BG1_BUDGET_STITCHING_RUNTIME_GAP_TO_PATCH_MAP.md` | Core Stitching Useful | Connects gaps to future patch groups | Current local map | Local only after PR #104 | yes | Turns drift into patch planning | Treating as patch authorization |
| `docs/budget/BG1_BUDGET_STITCHING_IMPLEMENTATION_GATE_PROPOSAL.md` | Core Stitching Useful | Proposes gate before implementation | Current local proposal | Local only after PR #104 | yes | Defines no-runtime implementation decision gate | Skipping Commander/A1 authorization |
| `docs/budget/BG1_BUDGET_STITCHING_NEXT_AUTHORIZATION_PACKET.md` | Core Stitching Useful | Next authorization packet | Current local packet | Local only after PR #104 | yes | Prepares exact no-runtime next request | Reading as granted authorization |
| `docs/budget/BG1_RUNTIME_IMPLEMENTATION_AUTH_REQUEST_EXACT_FILE_GROUPS.md` | Core Stitching Useful | Exact future `MUST_TOUCH` / `MAY_TOUCH` / `DO_NOT_TOUCH` file groups | Current local request | Local only after PR #104 | yes | Prevents vague implementation scope | Touching `src/**` now |
| `docs/budget/BUDGET_INTERFACE_GATE_MAP.md` | Core Stitching Useful | Interface-level gate map | Current local gate map | Local only after PR #104 | yes | Keeps interface transitions guarded | Treating interface map as runtime |
| `docs/budget/BUDGET_STITCHING_CONTROL_MANIFEST.md` | Core Stitching Useful | Consolidates control state | Current local manifest | Local only after PR #104 | yes | Useful command/state manifest | Becoming a stale shadow source |
| `docs/budget/BUDGET_WORKSTREAM_ARTIFACT_REGISTRY.md` | Core Stitching Useful | Registry of artifacts and roles | Current local registry | Local only after PR #104 | yes | Helps locate evidence | Treating registry as approval |
| `docs/budget/plancraft-plus-production-adapter-design.md` | Core Stitching Useful | Design context for future production adapter; not active implementation | Historical design, still boundary-relevant | Pre-PR104/local project doc | no | Clarifies future adapter risks | Using as current production adapter approval |

## 4. Shared Truth / Governance Useful

These files are useful for process history and PR/shared-truth discipline but should not alone drive runtime stitching.

| File path | Category | Why useful / why not useful | Current status | Shared truth status | Should drive next action | Relation to `CORRECT_BUDGET_GENERATION_STITCHING` | Risk if used incorrectly |
|---|---|---|---|---|---|---|---|
| `docs/NEXT_CODEX_HANDOFF.md` | Shared Truth / Governance Useful | Latest handoff; contains both BG1 and unrelated static UI state | Current but mixed | Local handoff, not PR-only | no | Context only | Static UI/PR105 noise can distract |
| `docs/budget/BUDGET_NEXT_STITCHING_ACTIONS.md` | Shared Truth / Governance Useful | Next-action board | Current but may lag exact A1 directives | Partly shared via PR #104, locally updated after | yes, only after cross-check | Summarizes current queue | Treating stale next action as authority |
| `docs/budget/BG1_LOCAL_EVIDENCE_SHARED_TRUTH_INVENTORY.md` | Shared Truth / Governance Useful | Inventory of local-to-shared evidence | PR104 evidence | Shared via PR #104 | no | Explains what became shared truth | Reusing pre-merge local-only caveat without updating |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_REQUEST.md` | Shared Truth / Governance Useful | PR request packet | Completed | Shared via PR #104 | no | Historical PR104 setup | Acting as if PR still pending |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_CANDIDATE_FILE_LIST.md` | Shared Truth / Governance Useful | Candidate file list for PR104 | Completed | Shared via PR #104 | no | Shows inclusion reasoning | Reopening resolved inclusion debate |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_BOUNDARY_CHECKLIST.md` | Shared Truth / Governance Useful | Scope boundary checklist | Completed | Shared via PR #104 | no | Proves docs-only boundary | Treating checklist as runtime clearance |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_RISK_REVIEW.md` | Shared Truth / Governance Useful | Risk review for PR104 | Completed | Shared via PR #104 | no | Records merge risk | Treating risk review as implementation approval |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_COMMANDER_AUTH_REQUEST.md` | Shared Truth / Governance Useful | Commander auth request | Completed | Shared via PR #104 | no | Process artifact | Acting on old authorization again |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_EXCLUDED_FILES.md` | Shared Truth / Governance Useful | Exclusion record | Completed | Shared via PR #104 | no | Keeps non-core docs out | Assuming excluded docs are useless forever |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_DRAFT_BODY.md` | Shared Truth / Governance Useful | Draft PR body | Completed | Shared via PR #104 | no | PR104 publication history | Treating draft body as current status |
| `docs/budget/BG1_SHARED_TRUTH_FILE_LIST_REVIEW_PACKET.md` | Shared Truth / Governance Useful | File-list review packet | Completed | Shared via PR #104 | no | Explains selected shared-truth scope | Reopening resolved file-list ambiguity |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_EXECUTION_REVIEW_CONSUMPTION.md` | Shared Truth / Governance Useful | Execution review consumption | Completed | Shared via PR #104 | no | Validates docs-only execution path | Confusing execution review with runtime review |
| `docs/budget/BG1_PR104_DOCS_ONLY_REVIEW_GATE.md` | Shared Truth / Governance Useful | PR104 review gate | Completed | Shared via PR #104 | no | Governance only | Treating review gate as harness gate |
| `docs/budget/BG1_PR104_COMMANDER_NEXT_DECISION_PACKET.md` | Shared Truth / Governance Useful | PR104 decision packet | Historical | Shared via PR #104 | no | Pre-merge decision support | Using before post-merge path lock |
| `docs/budget/BG1_PR104_DRAFT_TO_READY_REVIEW_CHECKLIST.md` | Shared Truth / Governance Useful | Draft-to-ready checklist | Completed | Shared via PR #104 | no | PR state transition record | Acting as if PR remains draft |
| `docs/budget/BG1_PR104_DOCS_ONLY_MERGE_GATE_PACKET.md` | Shared Truth / Governance Useful | Merge gate packet | Completed | Shared via PR #104 | no | Merge decision history | Acting as if PR not merged |
| `docs/budget/BG1_PR104_CURRENT_METADATA_SNAPSHOT.md` | Shared Truth / Governance Useful | Metadata snapshot | Superseded by live GitHub readback | Local/PR104-era | no | Historical PR state | Trusting old snapshot over live PR status |
| `docs/budget/BG1_PR104_DOCS_ONLY_MERGE_BOUNDARY_CHECKLIST.md` | Shared Truth / Governance Useful | Merge boundary checklist | Completed | Shared via PR #104 | no | Verifies no runtime in merge | Treating merge as runtime approval |
| `docs/budget/BG1_PR104_COMMANDER_MERGE_DECISION_REQUEST.md` | Shared Truth / Governance Useful | Merge decision request | Completed | Shared via PR #104 | no | Process artifact | Re-requesting already completed merge |
| `docs/budget/BG1_PR104_DOCS_ONLY_MERGE_GATE_RISK_REVIEW.md` | Shared Truth / Governance Useful | Merge risk review | Completed | Shared via PR #104 | no | Risk audit | Treating risk review as current next action |
| `docs/budget/BG1_PR104_POST_MERGE_NEXT_ACTION_DRAFT.md` | Shared Truth / Governance Useful | Drafted post-merge next action | Historical; now superseded by path lock | Shared via PR #104 | no | Prefigures post-merge path | Use path lock instead |
| `docs/budget/BG1_TYPECHECK_TOOLING_PROVISION_DECISION_PACKET.md` | Shared Truth / Governance Useful | Tooling decision packet | Current local governance | Local only | no | Typecheck/tooling gate only | Treating typecheck tooling as runtime progress |
| `docs/budget/BG1_RUNTIME_REPAIR_NEXT_AUTHORIZATION_PACKET.md` | Shared Truth / Governance Useful | Pre-PR104 authorization packet | Historical but useful | Shared via PR #104 | no | Explains old next request | Use exact file groups/path lock instead |
| `docs/budget/BG1_DOCS_ONLY_MINIMAL_RUNTIME_REPAIR_DESIGN_REVIEW_VERDICT_CONSUMPTION.md` | Shared Truth / Governance Useful | Records design review pass | Completed | Shared via PR #104 | no | Shows design acceptance only | Treating review as code approval |

## 5. Superseded / Historical

These files may still explain how BG1 got here, but they should not be used as the next driver.

| File path | Category | Why useful / why not useful | Current status | Shared truth status | Should drive next action | Relation to `CORRECT_BUDGET_GENERATION_STITCHING` | Risk if used incorrectly |
|---|---|---|---|---|---|---|---|
| `docs/budget/BG1_COMMANDER_REVIEWER_CANDIDATE_EXPORT_HEAD_DECISION_INTAKE.md` | Superseded / Historical | Intake before PR #100 verdict | Superseded by verdict consumption | Local / PR104 context | no | Decision history | Reopening PR #76/#100 selection |
| `docs/budget/BG1_CANDIDATE_EXPORT_HEAD_DECISION_CONSUMPTION.md` | Superseded / Historical | Earlier decision consumption | Superseded by PR #100 active-head boundary | Local / PR104 context | no | Historical candidate path | Treating as current active state |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_COMPARISON_PACKET.md` | Superseded / Historical | Comparison packet before verdict | Superseded by PR #100 verdict | Local / PR104 context | no | Evidence history | Continuing comparison after decision |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_REVIEW_REQUEST.md` | Superseded / Historical | Review request before verdict | Superseded | Local / PR104 context | no | Review path history | Asking already-answered question |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_HEAD_VERDICT_REQUEST_SUBMISSION.md` | Superseded / Historical | Outbox before verdict | Superseded | Local / PR104 context | no | Submission record | Treating outbox as pending |
| `docs/budget/BG1_REVIEWER_CANDIDATE_EXPORT_HEAD_VERDICT_INTAKE_TEMPLATE.md` | Superseded / Historical | Template for verdict intake | Superseded by actual consumption | Local / PR104 context | no | Template only | Confusing template with verdict |
| `docs/budget/BG1_PLAN_PUZZLE_SHARED_TRUTH_CONSUMPTION.md` | Superseded / Historical | Earlier Plan Puzzle consumption | Superseded by 0.12 intake and PR100 alignment | Local / PR104 context | no | Historical shared truth | Missing later restrictions |
| `docs/budget/BG1_DOCS_ONLY_CANDIDATE_CONTRACT_ADAPTER_REPAIR_PLAN.md` | Superseded / Historical | Candidate contract plan | Superseded by runtime drift repair and path lock | Local / PR104 context | no | Planning history | Treating adapter repair as authorized |
| `docs/budget/BG1_CANDIDATE_CONTRACT_STITCHING_PLAN.md` | Superseded / Historical | Candidate contract stitching plan | Superseded by data contract map/path lock | Local / PR104 context | no | Early stitching path | Skipping latest guard matrix |
| `docs/budget/BG1_COMMANDER_REVIEWER_DECISION_REQUEST.md` | Superseded / Historical | Request before later decisions | Superseded | Local / PR104 context | no | Decision history | Re-asking completed gates |
| `docs/budget/BG1_RUNTIME_REPAIR_SCOPE_AUTHORIZATION_REQUEST.md` | Superseded / Historical | Pre-evidence authorization request | Superseded by evidence, PR104, and exact file groups | Shared/local history | no | Old repair request | Acting on stale scope |
| `docs/budget/BG1_RUNTIME_REPAIR_SCOPE_AUTHORIZATION_OPTIONS.md` | Superseded / Historical | Old options | Superseded | Shared/local history | no | Old branch point | Choosing old path after path lock |
| `docs/budget/BG1_RUNTIME_TYPE_SOURCE_EVIDENCE_COLLECTION_REQUEST.md` | Superseded / Historical | Request before evidence collection | Superseded by result | Shared/local history | no | Evidence request history | Requesting already-completed task |
| `docs/budget/BG1_RUNTIME_REPAIR_AUTHORIZATION_OUTBOX.md` | Superseded / Historical | Manual outbox | Superseded | Shared/local history | no | Process history | Treating as unsent blocker |
| `docs/budget/BG1_RUNTIME_REPAIR_SHARED_TRUTH_PRECONDITION.md` | Superseded / Historical | Precondition before PR104 | Superseded by PR104 merge | Shared/local history | no | Explains why PR104 happened | Acting as if PR104 unmerged |
| `docs/budget/BG1_RUNTIME_REPAIR_REVIEWER_COMMANDER_AUTH_REQUEST_DRAFT.md` | Superseded / Historical | Draft request | Superseded by exact request/path lock | Shared/local history | no | Process history | Using draft over final |
| `docs/budget/BG1_RUNTIME_REPAIR_MINIMAL_PATCH_SEQUENCE_DRAFT.md` | Superseded / Historical | Draft sequence | Superseded by minimal sequence and skeleton plan | Shared/local history | no | Draft plan | Using draft over current sequence |
| `docs/budget/BG1_RUNTIME_SKELETON_PATCH_PLAN_AUTHORIZATION_REQUEST.md` | Superseded / Historical | Skeleton-plan auth request | Superseded by skeleton plan and exact groups | Local only | no | Planning history | Treating as granted auth |
| `docs/budget/BG1_RUNTIME_SKELETON_PATCH_PLAN.md` | Superseded / Historical | Skeleton patch plan | Useful but superseded by exact file groups | Local only | no | Runtime skeleton design history | Editing runtime without authorization |
| `docs/budget/BG1_RUNTIME_SKELETON_TARGET_FILE_LIST_PROPOSAL.md` | Superseded / Historical | Early target file list | Superseded by exact file groups | Local only | no | File-list history | Using broader proposal |
| `docs/budget/BG1_RUNTIME_SKELETON_DRY_RUN_DATA_CONTRACT_NOTES.md` | Superseded / Historical | Dry-run notes | Superseded by data contract map | Local only | no | Contract history | Treating notes as full contract |
| `docs/budget/BG1_RUNTIME_SKELETON_FORBIDDEN_SCOPE_GUARD_MATRIX.md` | Superseded / Historical | Skeleton forbidden guard | Superseded by budget stitching guard matrix | Local only | no | Guard history | Missing latest guard list |
| `docs/budget/BG1_RUNTIME_SKELETON_IMPLEMENTATION_RISK_MATRIX.md` | Superseded / Historical | Risk matrix | Superseded by implementation gate proposal | Local only | no | Risk history | Treating risk as approval |
| `docs/budget/BG1_RUNTIME_SKELETON_NEXT_AUTHORIZATION_PACKET.md` | Superseded / Historical | Old next auth packet | Superseded by exact file groups and next packet | Local only | no | Auth history | Acting on stale packet |
| `docs/budget/BG1_RUNTIME_SKELETON_PATCH_PLAN_NO_EXECUTION.md` | Superseded / Historical | No-execution duplicate skeleton plan | Superseded | Local only | no | Duplicate history | Conflicting with exact groups |
| `docs/budget/BG1_RUNTIME_SKELETON_EXACT_FILE_GROUPS_NO_EXECUTION.md` | Superseded / Historical | Earlier exact groups | Superseded by runtime implementation exact file groups | Local only | no | File-group history | Using old file groups |
| `docs/budget/BG1_RUNTIME_SKELETON_GUARD_BEHAVIOR_MATRIX_NO_EXECUTION.md` | Superseded / Historical | Guard behavior matrix | Superseded by guard matrix | Local only | no | Guard history | Duplicating guards |
| `docs/budget/BG1_RUNTIME_SKELETON_INPUT_OUTPUT_CONTRACT_MAP_NO_EXECUTION.md` | Superseded / Historical | I/O contract map | Superseded by data contract map | Local only | no | Contract history | Using older contract |
| `docs/budget/BG1_RUNTIME_SKELETON_AUTHORIZATION_BOUNDARY_NO_EXECUTION.md` | Superseded / Historical | Authorization boundary | Superseded by exact file groups | Local only | no | Auth boundary history | Treating boundary as authorization |
| `docs/budget/BG1_RUNTIME_SKELETON_REVIEWER_DECISION_REQUEST_NO_EXECUTION.md` | Superseded / Historical | Reviewer decision request | Superseded by A1 accepted review path | Local only | no | Review history | Re-requesting stale review |
| `docs/budget/BG1_RUNTIME_SKELETON_FORBIDDEN_SCOPE_AUDIT_NO_EXECUTION.md` | Superseded / Historical | Audit | Superseded by current guard matrix | Local only | no | Guard history | Missing newer guards |
| `docs/budget/BG1_RUNTIME_SKELETON_NEXT_GATE_REPORT_NO_EXECUTION.md` | Superseded / Historical | Next gate report | Superseded by path lock | Local only | no | Gate history | Using stale next action |
| `docs/budget/BG1_DOCS_ONLY_SHARED_TRUTH_PR_REQUEST.md` | Superseded / Historical | PR104 request, now completed | Superseded by merged PR104 | Shared via PR #104 | no | Publication history | Treating PR104 as still pending |

## 6. Local Evidence Only

These files are useful but should not be the sole next-action source until promoted, accepted, or reconciled.

| File path | Category | Why useful / why not useful | Current status | Shared truth status | Should drive next action | Relation to `CORRECT_BUDGET_GENERATION_STITCHING` | Risk if used incorrectly |
|---|---|---|---|---|---|---|---|
| `docs/budget/BG1_POST_SHARED_TRUTH_BUDGET_STITCHING_PATH_LOCK.md` | Local Evidence Only | Best current path-lock after PR104 merge | Current local path lock | Local only | yes | Selects post-shared-truth no-runtime path | Treating as merged without review |
| `docs/budget/BG1_BUDGET_STITCHING_SOURCE_OF_TRUTH_MAP.md` | Local Evidence Only | Required map exists locally | Current local map | Local only | yes | Source-of-truth mapping | Missing table-agent source may leave it incomplete |
| `docs/budget/BG1_BUDGET_STITCHING_DATA_CONTRACT_MAP.md` | Local Evidence Only | Required map exists locally | Current local map | Local only | yes | Data-contract mapping | Ingest contracts absent |
| `docs/budget/BG1_BUDGET_STITCHING_GUARD_MATRIX.md` | Local Evidence Only | Required guard matrix exists locally | Current local matrix | Local only | yes | Guard mapping | Confusing doc guard with runtime guard |
| `docs/budget/BG1_BUDGET_STITCHING_RUNTIME_GAP_TO_PATCH_MAP.md` | Local Evidence Only | Useful gap-to-patch mapping | Current local map | Local only | yes | Converts blockers to patch groups | Treating patch map as auth |
| `docs/budget/BG1_BUDGET_STITCHING_IMPLEMENTATION_GATE_PROPOSAL.md` | Local Evidence Only | Useful future gate proposal | Current local proposal | Local only | yes | Defines pre-implementation gate | Skipping gate |
| `docs/budget/BG1_BUDGET_STITCHING_NEXT_AUTHORIZATION_PACKET.md` | Local Evidence Only | Useful next authorization draft | Current local packet | Local only | yes | Next request scaffold | Treating request as approval |
| `docs/budget/BG1_RUNTIME_IMPLEMENTATION_AUTH_REQUEST_EXACT_FILE_GROUPS.md` | Local Evidence Only | Exact future file groups | Current local request | Local only | yes | Narrows future runtime scope | Touching `src/**` now |
| `docs/budget/BUDGET_INTERFACE_GATE_MAP.md` | Local Evidence Only | Interface gate map | Current local map | Local only | yes | Defines interfaces to guard | Treating map as enforcement |
| `docs/budget/BUDGET_STITCHING_CONTROL_MANIFEST.md` | Local Evidence Only | Control manifest | Current local manifest | Local only | no | Locates current controls | Becoming stale shadow handoff |
| `docs/budget/BUDGET_WORKSTREAM_ARTIFACT_REGISTRY.md` | Local Evidence Only | Artifact registry | Current local registry | Local only | no | Locates evidence | Registry treated as proof |
| `docs/budget/BG1_TYPECHECK_TOOLING_PROVISION_DECISION_PACKET.md` | Local Evidence Only | Tooling decision only | Current local packet | Local only | no | Useful before typecheck authorization | Confusing typecheck with runtime |
| `docs/budget/BG1_PR104_POST_MERGE_NEXT_ACTION_DRAFT.md` | Local Evidence Only | Post-merge draft | Superseded by live PR status and path lock | Shared via PR #104 but draft only | no | Drafted current state | Use path lock instead |
| `docs/budget/A4_BUDGET_STITCHING_EFFECTIVE_FILE_AUDIT.md` | Local Evidence Only | This audit; classifies current file usefulness | Current local audit | Local only | yes | Prevents wrong file from driving next step | Treating this audit as implementation approval |

## 7. Side-track / Not Core

These should not drive the next budget-generation stitching action.

| File path / group | Category | Why useful / why not useful | Current status | Shared truth status | Should drive next action | Relation to `CORRECT_BUDGET_GENERATION_STITCHING` | Risk if used incorrectly |
|---|---|---|---|---|---|---|---|
| `docs/bg1_budget_commander/**` (51 markdown files) | Side-track / Not Core | Commander loop/watch/test-queue evidence; useful context but not shared truth baseline | Local commander governance | Not included in PR #104 shared truth scope | no | Indirect governance only | Pulling old watch/test-only states into current path |
| Static UI text-file sync and PR105/local onboarding page work in `docs/NEXT_CODEX_HANDOFF.md` | Side-track / Not Core | Local static UI task, not budget engine stitching | Accepted separately | Not budget shared truth | no | No budget runtime relation | Distracts from budget path |
| `docs/budget/14-method-spec-warehouse.md` through `docs/budget/34-method-spec-post-pr55-reevaluation.md` method-spec phase docs | Side-track / Not Core | Useful MethodSpec subsystem history; not the current stitching gate | Existing subsystem docs | Mixed historical/local | no | Provides method context only | Treating validator/subsystem pass as generator readiness |
| `docs/budget/20-raw-candidate-warehouse-plan.md`, `21-raw-candidate-contract-hardening.md`, `22-raw-review-contract-safety-validator.md`, `23-raw-data-feeding-trial.md`, `24-raw-multi-source-fixtures.md`, `25-raw-negative-source-quality-fixtures.md`, `26-raw-source-quality-scoring-reviewer-checklist.md` | Side-track / Not Core | Raw warehouse candidate evidence; not formal price/rule authority | Existing subsystem docs | Mixed historical/local | no | Raw candidate context only | Promoting raw observations to formal price |
| `docs/budget/15-budget-output-logistics.md`, `16-budget-output-snapshot-and-material-alignment.md`, `17-contract-hardening-2.9.1.md`, `18-renderer-gate-and-legacy-output-guard.md`, `19-excel-pdf-renderer-skeleton.md`, `20-renderer-contract-hardening.md`, `21-formal-excel-pdf-layout-contract.md`, `22-formal-renderer-entry-contract.md`, `23-formal-file-writer-preflight.md`, `24-renderer-artifact-policy.md`, `25-file-writer-dry-run-contract.md`, `26-formal-file-writer-controlled-entry.md`, `27-renderer-snapshot-only-review-packet.md`, `28-output-documents-integration-usage-note.md` | Side-track / Not Core | Output/renderer subsystem docs; useful only after BudgetOutputSnapshot authority | Existing subsystem docs | Mixed historical/local | no | Output side, not generator stitching | Producing Excel/PDF or renderer output too early |
| `docs/budget/plancraft-plus-production-adapter-design.md` | Side-track / Not Core | Future adapter design context only | Existing design | Local/project doc | no | Adapter context only | Treating it as implemented production adapter |

## 8. Missing Required Files / Data Layers

| Required item | Current evidence | Missing status | Relation to stitching | Risk if ignored |
|---|---|---|---|---|
| `laibe_budget_ai_master_index.xlsx` | Recursive search found no file in this worktree | Missing | Table Agent master index is absent | Cannot ground work-item/material/rule ingest |
| `standard_work_item_master` ingest contract | No dedicated contract file found | Missing | Needed for classified work item source | Generator may invent item taxonomy |
| `object_trigger_rules` ingest contract | No dedicated contract file found | Missing | Needed for object/fact to work-item triggering | UI objects may become budget lines incorrectly |
| `dependency_rules` ingest contract | No dedicated contract file found | Missing | Needed for required/related item logic | Missing dependent work items |
| `quantity_rules` ingest contract | No dedicated contract file found | Missing | Needed for quantity formula authority | Candidate geometry may become production quantity |
| `BudgetCandidateLine` contract | No dedicated type/contract file found | Missing | Needed between dry-run candidate output and human review | Candidate line may be confused with `BudgetEstimateLine` |
| Budget stitching source-of-truth map | `docs/budget/BG1_BUDGET_STITCHING_SOURCE_OF_TRUTH_MAP.md` exists | Present locally, not shared truth | Needed source map | Local-only map may drift |
| Budget stitching data contract map | `docs/budget/BG1_BUDGET_STITCHING_DATA_CONTRACT_MAP.md` exists | Present locally, not shared truth | Needed data map | Missing ingest contracts still limit it |
| Budget stitching guard matrix | `docs/budget/BG1_BUDGET_STITCHING_GUARD_MATRIX.md` exists | Present locally, not shared truth | Needed guard map | Doc matrix is not runtime enforcement |

## 9. Effective Next Action

Because PR #104 is merged, the next action is:

`BG1_POST_SHARED_TRUTH_BUDGET_STITCHING_PATH_LOCK_NO_RUNTIME`

However, because the table-agent master index and ingest contracts are still missing, the immediate post-path-lock decision should not jump into runtime. The next useful no-runtime work should lock the post-shared-truth path against missing ingest inputs:

`WAIT_FOR_LAIBE_BUDGET_AI_MASTER_INDEX_OR_DEFINE_INGEST_CONTRACT_NO_RUNTIME`

This is not "continue organizing docs"; it is a concrete upstream data-contract gate. It should decide whether to wait for `laibe_budget_ai_master_index.xlsx` or define explicit ingest contracts for `standard_work_item_master`, `object_trigger_rules`, `dependency_rules`, `quantity_rules`, and `BudgetCandidateLine` before any runtime implementation request.

## 10. Forbidden Scope Confirmation

| Scope | Result |
|---|---|
| `src/**` modified by this audit | No |
| runtime / harness / tests / build / dev server | No |
| `budget-generator.ts` created | No |
| `generateBudgetEstimate` created | No |
| `BudgetEstimateBlockedError` created | No |
| formal estimate / production quantity / Excel / PDF | No |
| stage / commit / push / PR / merge | No |

## 11. 20260617 AI Master Index Availability Update

Previous missing item `laibe_budget_ai_master_index.xlsx` is now resolved for no-runtime contract review.

| Field | Status |
|---|---|
| Master index path | `Z:\08-Jacky\laibe_MVP_project\bugget\清單分類_20260605_0107\_AI_BUDGET_MASTER_INDEX_OUTPUT_20260617_132725\laibe_budget_ai_master_index.xlsx` |
| A1 verdict | `APPROVED_WITH_MINOR_NOTES_FOR_A4_INGEST_NO_RUNTIME` |
| Approved next action | `AUTHORIZE_A4_MASTER_INDEX_INGEST_CONTRACT_REVIEW_NO_RUNTIME_NO_HARNESS` |
| Required sheets | 14 present |
| Standard work item rows | 19,212 |
| Price range rows | 19,212 |
| Reject rows | 9 |
| External validation | 0 fatal, 0 warning |
| Side-track docs count | 52; unchanged |
| Side-track rule | Static UI, PR105, onboarding, and unrelated commander-watch docs must not drive budget stitching |
| Local source-of-truth maps | Exist as local evidence but are not shared truth by themselves |
| Current next action | Build ingest contracts and guard maps from the master index; no runtime, no harness |

Remaining missing or not-yet-shared items after this availability update:

| Required item | Updated status | Next handling |
|---|---|---|
| `standard_work_item_master` ingest contract | Being created in A4 no-runtime docs | Needs A1/user shared-truth review before runtime use |
| `object_trigger_rules` ingest contract | Being created in A4 no-runtime docs | Needs A1/user shared-truth review before runtime use |
| `dependency_rules` ingest contract | Being created in A4 no-runtime docs | Needs A1/user shared-truth review before runtime use |
| `quantity_rules` ingest contract | Being created in A4 no-runtime docs | Needs A1/user shared-truth review before runtime use |
| `BudgetCandidateLine` contract | Being created in A4 no-runtime docs | Candidate line only; not `FinalBudgetLine` |
| Budget stitching source-of-truth map | A4 map being created from master index and existing shared-truth docs | Must not treat workbook alone as Budget Engine runtime truth |
| Budget stitching data contract map | A4 map being created | Must preserve human-review and no-formal-output gates |
| Budget stitching guard matrix | A4 matrix being created | Documentation guard only until runtime authorization |

Minor notes carried forward:

- `zero_price_review` rows: 269. Review-only; not formal price truth; not `suggested_unit_price`; not auto price selection.
- `negative_price_review` rows: 159. Review-only; not formal price truth; not `suggested_unit_price`; not auto price selection.
- Public work mapping is conservative metadata: `division_only` or `unknown`, never a budget generation primary key or formal classification verdict.
- Reject rows are excluded evidence only: not standard work items, not price candidates, not `BudgetCandidateLine`.
