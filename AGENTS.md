# LaiBE DRS Repository Governance

This file defines permanent repository and product rules for LaiBE DRS. Current roles, task IDs, routes, branches, worktrees, allowlists, candidates, and execution state belong in the current task or handoff packet, never in this file.

Lower-level `AGENTS.md` files may narrow authority or add product-surface rules. They must not weaken this file.

## 1. Authority And Instruction Precedence

Apply instructions in this order:

```text
system / developer
-> Owner current instruction
-> applicable AGENTS.md
-> approved task or handoff packet
-> required skills
-> historical evidence
```

Historical prompts, reports, branches, filenames, task states, and prior roles are evidence only. They do not grant current authority.

If instructions conflict, stop only the conflicting action, preserve the current state, and report the exact conflict to the direct parent.

## 2. Workspace, Git, And Change Safety

- Work only in the exact C-drive worktree and write allowlist authorized by the current task.
- Treat `Z:\08-Jacky`, UNC paths, SMB paths, unrelated worktrees, and Human-owned dirty state as protected.
- Keep patches, temporary output, logs, caches, build artifacts, and evidence inside the authorized worktree or in memory.
- Do not restore, revert, delete, move, rename, clean, reset, stage, commit, push, open a PR, merge, publish, deploy, or roll back without exact authority for that action.
- Never use a local candidate, test result, hash, receipt, or handoff as a substitute for admission, publication, deployment, or production authority.
- Ordinary authorized local edits, tests, and non-destructive technical choices do not require renewed Human approval.
- Escalate only production secrets, production writes or deployment, destructive or irreversible actions, external paid accounts or coordination, product/legal/commercial decisions, real customer data authority, publication authority, or material scope expansion.

### Hermes And Global Codex Safety

- Hermes is optional. Never autonomously install, update, log in to, reset, or start Hermes or a persistent Hermes service.
- Use Hermes only when the Owner explicitly requests it, or when the exact task requires it and the Hermes MCP is already available.
- If Hermes is unavailable or unconfigured, report the missing configuration. Never autonomously change global Codex configuration or start multiple Hermes background services.

## 3. LaiBE DRS Product Identity

LaiBE DRS is a renovation decision and case-record system. It is not a matching marketplace, low-price bidding platform, chat tool, cloud drive, payment or escrow service, investment product, or generic AI quotation tool.

Its purpose is to:

- organize owner requirements, drawings, budgets, quotation conditions, and inquiry baselines;
- let designers and contractors respond against the same confirmed facts;
- let PCM and AI PCM identify risks, compare documents, request clarification, and support decisions;
- preserve traceable requirements, files, versions, comments, confirmations, changes, construction tasks, photos, and acceptance records;
- return every party to the same evidence instead of competing narratives.

Permanent product statement:

```text
Every renovation decision has evidence.
Every case action leaves a traceable record.
```

Never add or imply:

- contractor matching or ranking as the product core;
- lowest-price competition;
- guaranteed fraud elimination, zero risk, best contractor, or lowest price;
- payment custody, escrow, collection, disbursement, or third-party payment protection;
- old-house investment return, renovation finance, or profit models.

## 4. User State And Contract Authority

The permanent user-state distinction is:

```text
UNREGISTERED
REGISTERED
CONTRACTED
```

```text
REGISTERED != CONTRACTED
```

- Unregistered users may receive public information and bounded free-check entry points.
- Registered users have an account but do not automatically receive case, workspace, document, or review authority.
- Contracted users receive only server-confirmed permissions for the exact case, membership, grant, version, expiry, and revocation state.

Client query strings, preview flags, hidden controls, deep links, local storage, test fixtures, and UI intent never grant authority. Protected access must derive from server-owned identity and case membership.

Owner, vendor, PCM, and administrator views must remain role-correct and case-bounded. No role may see a case merely because the URL exists.

## 5. Decision, Record, And Authority Boundaries

Every material record should answer:

```text
who
when
which case
what changed
which source or version supported it
current state
next responsible party
```

The system must distinguish:

- observation from decision;
- suggestion from approval;
- local review from formal review;
- candidate from admitted record;
- source identity from source truth;
- technical validation from professional approval;
- queued cleanup from completed cleanup.

No UI, report, test, or AI output may manufacture case IDs, document IDs, version IDs, grants, approvals, professional conclusions, or persistence results.

For structure, fire safety, building law, interior-renovation law, MEP, waterproofing, professional calculations, or legally certified work, use:

```text
EXTERNAL_PROFESSIONAL_REVIEW_REQUIRED
```

DRS does not approve those matters itself.

## 6. Owner-First UX And Product Language

Every page must make the following clear within five seconds:

1. who the page is for;
2. what the page does;
3. the current case state;
4. the next action;
5. who is waiting for whom;
6. what file, decision, or action will be recorded.

Use Traditional Chinese for user-facing product copy unless the task explicitly requires another language. Use clear Taiwan terminology. Do not expose engineering language such as DB, API, GitHub truth, source clean, debug, mock-only, stack trace, raw JSON, or local candidate.

Incomplete functionality must use truthful product language such as “此功能正在整理中” or “正式開放後會提供完整操作入口.” Never connect to a known 404 or pretend a placeholder is functional.

Interfaces must provide a clear primary action, secondary action, current state, empty state, loading state, error state, and next-step guidance. Avoid card, border, and button accumulation.

## 7. Permanent DRS Case Flow

Product work must preserve a coherent, traceable flow:

```text
public understanding
-> bounded free check
-> registration
-> contract and case authority
-> requirements and source-file intake
-> quote / drawing / contract review
-> clarification and decision
-> construction task and change record
-> photo and acceptance evidence
-> case closure
```

Important traceable events include requirement creation and revision, floor-plan import and scale confirmation, drawing and quotation upload, document version changes, PCM findings, owner questions, vendor responses, approvals, change requests, construction tasks, construction photos, additions or deductions, acceptance defects, accepted items, and case closure.

No single page, fixture, parser, preview, or review result proves the full case flow.

## 8. Supporting Capabilities And Review Boundaries

### Quote Review

Quote review may parse and organize source bytes, identify possible omissions or inconsistencies, and support comparison. Parser-only output must be labelled as local parsing or summary. It must not be described as a formal report, durable case record, or customer result without real provenance, authority, persistence, and admitted runtime evidence.

### Drawing Review

Drawing review may identify source-bound elements, uncertainty, missing information, or cross-document inconsistencies. Recognition must bind to the selected source document and page. Aggregate counts, static placeholder findings, or test fixtures do not prove formal recognition.

### Contract Review

Contract review supports document understanding, comparison, clarification, and traceability. It does not provide legal approval or guarantee enforceability.

### Photo Review

Photo evidence must remain source-bound, case-bound, versioned, and Human-reviewable. Static migration or identity checks do not prove real database application, ground truth, or formal admission.

### No Aesthetic Judgment

DRS does not score or judge beauty, style, luxury, color preference, artistic value, creativity, trend alignment, designer talent, or whether an owner should like a design.

The permanent design-review question is:

```text
Does the available, agreed, and versioned information provide a clear and consistent basis for engineering understanding and execution?
```

DRS may report possible incompleteness, document conflict, missing execution information, version mismatch, or unresolved decision. It must not turn those findings into aesthetic criticism or a guarantee of constructability, method correctness, structural safety, legal compliance, or professional design correctness.

For 3D material, DRS may compare important represented content with confirmed requirements and later drawings, schedules, dimensions, details, materials, equipment, and execution records. It must not judge whether the 3D design looks good.

## 9. Evidence, Data, And Traceability Truth

Use these permanent distinctions:

```text
OBSIDIAN_NOTE != FORMAL_DRS_RECORD
TEST_FIXTURE != CUSTOMER_RESULT
IDENTITY_VERIFIED != GROUND_TRUTH
STATIC_PASS != REAL_RUNTIME_PASS
SCHEMA_INTENT != REAL_DB_APPLIED
SOURCE_CANDIDATE != ADMITTED_SOURCE
LOCAL_COMMIT != REMOTE_PUBLICATION
HTTP_200 != FUNCTIONAL_ACCEPTANCE
DEEPLINK_PASS != NORMAL_ROUTE_PASS
```

Obsidian may serve as an internal control registry for candidates, datasets, artifact packages, reviews, findings, gates, decisions, and handoffs. It must not become production case truth, customer evidence, runtime authority, database admission, or launch proof.

Evidence must identify the exact source, candidate, version, bytes or commit, method, result, and limits. When source changes, affected evidence becomes stale.

## 10. Legacy Identifier And Rename Safety

Legacy identifiers such as `PCM`, historical role names, route keys, storage keys, database values, analytics names, and test selectors may be runtime contracts.

```text
NO_BLIND_PCM_TO_DRS_REPLACE = TRUE
```

Classify each occurrence before changing it:

- user-visible product copy;
- internal code symbol;
- runtime contract;
- persisted data or migration value;
- route or integration key;
- historical evidence.

Rename user-visible terminology only when authorized. Do not bulk-replace runtime contracts, persisted values, or historical evidence.

## 11. Task Acceptance, Scope, And Parallel Work

```text
TASK_SCOPE_IS_FROZEN_DURING_EXECUTION = TRUE
ONE_TASK = ONE_BOUNDED_PRODUCT_SURFACE
ONE_FILE = ONE_WRITER
```

Every implementation task requires a concise acceptance contract containing:

- objective;
- exact scope and protected scope;
- input and output;
- worktree and write allowlist;
- test method;
- pass and fail criteria;
- required evidence;
- stop condition.

Do not expand a task with incidental refactoring, cleanup, adjacent fixes, new frameworks, or a new product surface. Report adjacent findings without modifying them unless they directly block the authorized task.

Shared files are read-only unless the task assigns one exact owner. Independent reviewers are read-only and must not repair the candidate they review.

### Concurrent Intake Assistant Mode

```text
CONCURRENT_INTAKE_COUNT >= 2
-> ASSISTANT_MODE = REQUIRED
-> OPEN_SUBAGENTS_IMMEDIATELY
```

When two or more independent tasks, reports, results, or decision requests are pending, the primary Agent must divide them by scope, ownership, and dependency, then use available subagents for non-overlapping work. Conflicting or dependent items may receive read-only identity and blocker checks only.

Subagents receive only the current-state capsule, exact paths and identities, acceptance criteria, unresolved question, and stop condition. Do not replay full history. Do not create duplicate writers or idle reviewers.

## 12. Context Economy And Waiting

Context is a workbench, not a warehouse.

- Read each applicable `AGENTS.md` and each selected skill completely once per logical turn; do not reread unchanged bytes.
- Use exact filenames, symbols, selectors, schemas, test names, and bounded line ranges before broad reads.
- Do not load obsolete transcripts, superseded reports, closed evidence trees, raw binary data, base64, or unrelated governance documents.
- Keep a concise current-state capsule in working memory: objective, worktree, allowlist, protected state, source truth, completed work, next action, verification, blockers, fixed decisions, forbidden changes, pass criteria, and stop condition.
- Do not create a spec, plan, ledger, receipt, or governance file for a routine bounded fix unless the task requires durable coordination.
- Use focused RED, minimal causal patch, focused GREEN, scoped verification, and diff check. Rerun only when relevant bytes change.
- When a tool, build, browser action, CI job, or subagent is running, use its event or terminal state. Do not repeatedly reread complete logs or snapshots.
- Every wait must have success, failure, cancel, and timeout conditions.

Context economy alone is not a reason to create an Agent. Use a successor only at a stable phase boundary or when the handoff trigger applies.

## 13. Pre-Submission Self-Verification

Before submitting any result to the Owner, parent, reviewer, integration owner, or commander, the Agent must independently verify:

- objective, worktree, allowlist, protected scope, pass/fail criteria, and stop condition did not drift;
- changed files are exactly authorized and protected dirty state remains intact;
- fresh verification is bound to the submitted candidate;
- every success term is supported by current evidence;
- unrun tests, missing wiring, mocks, blockers, permissions, secrets, production gates, and pre-existing failures are explicitly disclosed;
- source, runtime, database, publication, deployment, and launch states remain separate.

If self-verification fails, submit `BLOCKED`, `FAILED_VERIFICATION`, `PARTIAL_RESULT`, or `NEEDS_REWORK`, with the exact cause and smallest safe next action. Do not submit an unsupported success claim.

## 14. Web Integration Canonical Runtime Gate

The following rules apply to every user-facing web integration:

```text
SOURCE_INTEGRATED != RUNTIME_INTEGRATED
TEMPORARY_PREVIEW != CANONICAL_PREVIEW
DEEPLINK_PASS != IN_PAGE_INTERACTION_PASS
TEST_PASS != WEB_INTEGRATION_PASS
BROWSER_ACCEPTANCE_PENDING = WEB_INTEGRATION_NOT_PROVEN
ONE_INTEGRATION_CYCLE = ONE_CANONICAL_RUNTIME
FINAL_ACCEPTANCE_REQUIRES_CACHE_BUSTER = FALSE
HUMAN_CACHE_RECOVERY_AS_ACCEPTANCE_STEP = PROHIBITED
SERVER_ROOT_MATCH_REQUIRED = TRUE
CRITICAL_SERVED_BYTES_MATCH_REQUIRED = TRUE
CANONICAL_DESKTOP_MOBILE_JOURNEY_REQUIRED = TRUE
```

Each integration cycle must define one canonical preview URL. Other servers are temporary diagnostic previews and cannot prove acceptance.

Before runtime acceptance, verify:

```text
CANONICAL_PREVIEW_URL
CANONICAL_PREVIEW_PID
CANONICAL_PREVIEW_ROOT
INTEGRATION_WORKTREE
INTEGRATION_HEAD_OR_SOURCE_IDENTITY
SERVER_ROOT_MATCHES_INTEGRATION_WORKTREE
WORKTREE_FILE_SHA256
HTTP_SERVED_FILE_SHA256
SERVED_SOURCE_MATCH
```

If multiple previews serve different candidates, report `SPLIT_BRAIN_PREVIEW_DETECTED = TRUE` until the Human-facing canonical runtime is unambiguous.

Final browser acceptance must begin at the canonical URL and exercise normal in-page routes, meaningful interactions, resulting visible states, return paths, console/network health, and applicable desktop and mobile viewports. A deep link, DOM element, source test, mock, HTTP 200, temporary preview, cache buster, or Human cache reset is not a substitute.

Only declare:

```text
WEB_INTEGRATION_ACCEPTED
```

when all of the following are true:

```text
CANONICAL_SERVED_RUNTIME_GATE = PASS
DESKTOP_CANONICAL_JOURNEY = PASS
MOBILE_CANONICAL_JOURNEY = PASS
BROWSER_ACCEPTANCE_PENDING = FALSE
```

Otherwise use `SOURCE_INTEGRATION_READY`, `RUNTIME_ACCEPTANCE_PENDING`, `CANONICAL_RUNTIME_ACCEPTANCE_BLOCKED`, or `SPLIT_BRAIN_PREVIEW_DETECTED`.

## 15. Mandatory Handoff And Continuity

```text
ROLE_CONTINUITY != CHAT_CONTINUITY
OWNER_HANDOFF_COMMAND = "請辦理交接"
TOKEN_HANDOFF_TRIGGER = TOKENS_USED > 240000
ONE_HANDOFF = ONE_SUCCESSOR
```

Start handoff immediately when the Owner issues the exact command, reliable telemetry exceeds 240,000 tokens, compaction loses critical state, or remaining context is insufficient for a verifiable finish. Never guess token usage when telemetry is unavailable.

The outgoing Agent must:

1. freeze new scope;
2. inventory active work, subagents, reports, decisions, and relay debt;
3. prepare one concise current-state capsule with role, authority, worktree, branch, candidate identity, allowlist, protected state, completed/active/blocked/unverified work, evidence, gaps, first safe action, and stop condition;
4. include every subagent's task ID, objective, status, owned paths, authority, candidate or result, in-flight report, new destination, and continue-or-stop disposition;
5. create exactly one successor chat;
6. deliver the capsule and obtain `SUCCESSOR_READY` after independent identity verification;
7. explicitly transfer role, command authority, and report destination;
8. rebind active subagents without duplicate writers;
9. confirm `SUCCESSOR_EXECUTION_STARTED = TRUE`;
10. pin the successor;
11. drain every in-flight report exactly once;
12. set outgoing authority to zero;
13. archive the outgoing chat.

The outgoing Agent may archive only when:

```text
SUCCESSOR_READY = TRUE
COMMAND_TRANSFERRED = TRUE
SUCCESSOR_EXECUTION_STARTED = TRUE
SUBAGENT_CONTINUITY_COMPLETE = TRUE
UNFORWARDED_REPORTS = 0
OUTSTANDING_SUBAGENT_RESULTS = 0
PENDING_DECISION_REQUESTS = 0
DUPLICATE_WRITERS = 0
SUCCESSOR_PINNED = TRUE
OUTGOING_AUTHORITY_ZERO = TRUE
```

If self-archive is unavailable, report `ARCHIVE_READY` with authority zero to the direct parent. Never abandon, duplicate, or silently stop an active subagent during handoff.

## 16. Completion, Publication, And No-Idle Mission

A bounded task normally ends as follows:

```text
VERIFY
-> COMPLETION_REPORT
-> PARENT_RECEIVED
-> ARCHIVE_CHAT
```

When a task completes but its parent mission remains open:

```text
TASK_COMPLETE
-> UPDATE_GATE
-> FIND_NEXT_TASK
-> DISPATCH
```

Idle is valid only for a real dependency with a blocker owner, reopen condition, safe waiting work, and next checkpoint. Do not create work merely to keep an Agent active.

Keep publication truth separate:

```text
LOCAL_SOURCE_PASS != REMOTE_BRANCH_PUBLISHED
REMOTE_BRANCH_PUBLISHED != PR_READY
REMOTE_BRANCH_PUBLISHED != PR_CREATED
PR_READY != PR_CREATED
PR_CREATED != MERGED
MERGED != DEPLOYED
DEPLOYED != LAUNCHED
```

`PR_READY` means only that an admitted candidate may be proposed for a PR; it does not mean a PR exists. Without an exact PR number and URL, report `PR_CREATED=FALSE`.

After a non-force branch push, verify the exact remote ref SHA. Never describe branch publication as a PR, merge, deployment, admission, or launch.

## 17. Reporting

Use event-driven reporting: readiness, material blocker, implementation or verification terminal, integration decision, publication result, or an explicit Owner request.

Every completion report must state:

1. exact changed files and what changed;
2. implemented or repaired behavior;
3. fresh build, lint, typecheck, test, runtime, browser, database, or publication evidence actually run;
4. mock, unwired, pending, held, or unverified behavior;
5. protected scope and dirty-state preservation;
6. Git, remote publication, PR, merge, deployment, and launch state;
7. whether product language excludes engineering jargon, payment escrow, and old-house investment claims;
8. whether the result preserves DRS as a renovation decision and traceability system;
9. the next single bounded gap.

Do not use governance artifact counts as product progress.

## 18. Project-Local Skill Routing

When the task matches a project skill, read the corresponding `SKILL.md` completely before acting. Resolve paths relative to the repository root.

Use the minimum sufficient skill set. A skill controls method only; it cannot expand product scope, file authority, delegation, Git authority, acceptance authority, or publication authority.

Project-local skills may include:

- `.agents/skills/drs-product-governance/SKILL.md`
- `.agents/skills/drs-traceability-review/SKILL.md`
- `.agents/skills/drs-canonical-web-acceptance/SKILL.md`
- `.agents/skills/drs-handoff-continuity/SKILL.md`

If a referenced project-local skill is absent, report that fact and continue with the applicable governance and the safest bounded method. Do not invent the missing skill or treat its name as authority.
