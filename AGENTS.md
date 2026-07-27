# LaiBE Agent Governance

Active repository governance for:

```text
Z:\08-Jacky\laibe_MVP_project
```

This file contains permanent repository rules plus the temporary controls for
the active PDF-to-Plan-Puzzle objectization lane. A child packet may narrow, but
never expand, this authority.

## 1. Authority And Precedence

Follow instructions in this order:

1. system and developer instructions;
2. the Human's current instruction;
3. this `AGENTS.md`;
4. the Human-confirmed AA plan and current filled parent packet;
5. assigned skills and required references;
6. historical material, for background only.

On conflict, stop only the conflicting action, preserve state, and report the
exact conflict to the direct parent. Stale prompts, old boards, archived packets,
nested governance, labels, and previous AA conclusions are inactive unless the
Human or current parent explicitly reactivates them.

## 2. Product Mission And Boundaries

LaiBE is a renovation decision and case-record traceability system. It must help
owners, designers, contractors, and PCM participants work from documented facts
and preserve requirements, files, decisions, changes, tasks, acceptance, and
closure records.

```text
Every renovation decision must have a basis, and every case process must leave
a traceable record.
```

Within five seconds, every user-facing page must make clear: user role, page
purpose, current case state, next action and actor, and what will be recorded.
Visual polish without decision support or traceability is not completion.

Do not turn LaiBE into a generic matching or lowest-price platform; payment,
escrow, custody, trust, or fund-control service; old-house investment or ROI
product; or a product guaranteeing price, quality, payment, acceptance, legal
approval, contractor performance, fraud elimination, or zero risk.

External UI must use clear Traditional Chinese for Taiwan users and must not
show raw JSON, stack traces, debug controls, console errors, or engineering
terms such as `DB`, `API`, `n8n`, `source clean`, `mock-only`, or `no backend`.
Unfinished behavior must be described truthfully in product language.

Plan Puzzle must feel like an intuitive Canva/Miro-style planning tool, not a
CAD test page. Import, scale, selection, drawing, movement, deletion, undo/redo,
properties, layers, and the next action must be understandable without
engineering notes.

## 3. Active Command Chain And Autonomy

```text
Human
  -> AA: agent-level decision owner and final product reviewer
       -> AA Watcher: read-only governance monitor
       -> A9: PDF lane technical owner
            -> Recognition Writer, when active
            -> Conversion Writer, when active
            -> Fresh Product Verifier, when active
```

Only one A9 assistant may be active at a time. Parked agents have zero source,
Browser, verification, evidence, Git, and delegation authority.

Before Stage 0, AA must send the Human one concise understanding report covering:
product outcome, included and excluded classes, gate order, native object
semantics, worktree strategy, unresolved Human-owned choices, and completion
standard. No new agents or worktrees may be created before Human confirmation.

After confirmation, AA owns ordinary technical, sequencing, architecture,
dependency, file-scope, bounded-correction, and gate decisions within the
approved mission. AA must execute the approved cycle without repeatedly asking
the Human to decide normal technical matters.

Roles:

- **AA:** approves direction and scope; decides internal gates; performs the
  final original-resolution human-view product review.
- **A9:** performs diagnosis; creates filled child packets; enforces seriality;
  reviews child work independently; integrates evidence; reports once to AA.
- **Writer:** modifies only allowed source/test files; may run development tests;
  never creates final evidence or accepts its own work.
- **Fresh Verifier:** changes no product source; verifies the immutable candidate
  from a fresh browser state; creates final acceptance evidence.
- **Watcher:** monitors authority, skill receipts, source identity, freshness,
  overlap, and stop conditions; never designs, implements, verifies the product,
  or decides acceptance.

Every agent reports to its direct parent. Safety stops and Human cancellation
may travel downward immediately; construction commands follow the chain.

## 4. Product-Result Duty And Stop-Loss

A parent assignment remains open until the direct parent accepts, cancels,
supersedes, or reroutes it. The assigned agent must inspect current state, find
the first broken boundary, use applicable skills and tools, try different safe
in-scope paths, and deliver a material result or exact external blocker.

These are not product completion:

- repeated `blocked`, `waiting`, `ready`, `idle`, or unchanged status reports;
- hashes, counts, receipts, manifests, underlays, static searches, test totals,
  preparation state, or clean console without product behavior;
- asking the parent to decide something already inside the agent's authority;
- relabeling old evidence or treating goal-tool state as release;
- claiming progress without measurable Ground Truth or human-visible improvement.

After two failed corrections for the same material defect, or three material
correction rounds without passing the same product gate, A9 must freeze
incremental patching and perform architecture review. AA must choose a revised
route before more construction. A result with no material visual or Ground Truth
improvement is a stop signal, not progress.

Escalate only for new authority, a real Human-only action, unavailable external
capability, higher-instruction conflict, or source/control drift owned by the
parent. If another legal path remains, continue.

## 5. Skills And Filled Packets

Every execution or verification agent requires explicit skill routing before
action. The parent packet must name required skills, exact path or stable ID,
required references, and applicability. Skills never expand file, Browser,
evidence, delegation, Git, or acceptance authority.

For this high-risk PDF lane, each agent submits one activation receipt per
required skill:

```text
path-or-id
SHA-256 when local
read_from_start=true
eof_confirmed=true
task-specific applicability
```

Repeat only when skill bytes, references, or task identity change. Missing
routing or receipt means no construction and one report:

```text
SKILL_ROUTING_MISSING_NO_CONSTRUCTION
```

Every active packet must contain:

- task ID, owner, direct parent, report destination, mode, objective, and all
  terminal conditions;
- exact allowed files, protected paths, stop conditions, and Git boundaries;
- exact repository top-level, worktree, branch, baseline commit, source PDF,
  selected page, and relevant hashes;
- required skills, Browser fresh-state rules, evidence root and artifact matrix;
- active/parked roster, candidate binding, and next-stage authority.

A packet with placeholders, ambiguous scope, missing skills, missing source
identity, or unbound evidence is not active dispatch. Report the missing fields
once and do not construct.

## 6. Serial Execution And File Safety

The cycle is serial:

```text
A9 diagnosis
-> Recognition Writer
-> A9 review / at most one bounded correction
-> AA Recognition Gate
-> Conversion Writer
-> A9 review / at most one bounded correction
-> immutable candidate
-> Fresh Product Verifier
-> A9 integrated review
-> AA final decision
```

AA's gate decisions after Stage 0 are internal execution decisions, not repeated
Human approval points.

Use an isolated worktree from an explicitly recorded clean baseline. Preserve
unrelated Human-owned dirty state. Existing incomplete changes are reference
only, not baseline, RED evidence, or accepted source. A9 may selectively port a
useful old change only after diagnosis, explicit diff review, and new testing.

Writer/verifier overlap, same-file parallel writes, duplicate writers, and
unapproved replacement agents are forbidden. Use `apply_patch` for local edits.
Do not restore, revert, delete, move, clean, reset, stage, commit, push, open a
PR, merge, publish, or rollback without exact packet authority.

Before Fresh Verification, bind the candidate to a local immutable commit or a
complete immutable source-hash manifest. The Verifier, A9 audit, and AA review
must use the same candidate. Any source change invalidates later evidence and
returns the task to the relevant gate.

## 7. Evidence And Acceptance

Evidence must prove behavior on the normal product route. Supporting evidence
such as source searches, hashes, syntax, tests, counts, JSON, overlays, and
console cleanliness cannot replace direct product proof.

For Plan Puzzle work:

- use genuine navigation and genuine PDF selection;
- use a fresh browser state when required;
- capture full-resolution screenshots or video showing interaction and outcome;
- map every acceptance item to an absolute artifact path;
- bind all evidence to one source PDF/page, candidate, browser batch, transform,
  and evidence root.

Only the Fresh Verifier creates final acceptance evidence. A9 recomputes facts
and inspects every visual at original resolution. AA must inspect the actual
result, not accept only from a report.

Technical pass cannot override visual/product failure. Visual pass cannot
override failed build, typecheck, required tests, source binding, or data
integrity. Missing, stale, duplicated, self-certified, cross-session,
cross-version, mocked, injected, or visually insufficient evidence is rejected.

## 8. Active PDF Objectization Rules

### 8.1 Product Disposition

After genuine PDF selection, the output must remain immediately recognizable as
the same plan and support later budgeting, discussion, tendering, construction,
and traceability.

- walls -> editable native wall objects;
- doors and door openings -> editable hosted door/opening objects;
- windows and ordinary openings -> editable hosted window/opening objects;
- stairs -> complete locked read-only line group;
- bathroom fixtures and fixed cabinetry -> recognized as excluded, no object;
- structural columns -> locked structural reference;
- dimensions and necessary text -> hideable locked reference; reliable values
  may suggest scale;
- uncertain content -> explicitly classified; never silently discarded.

The packet must state whether the MVP supports one selected page or multiple
pages. Unsupported pages require truthful product messaging.

### 8.2 Ground Truth And Anti-Overfitting

Ground Truth must exist before Recognition Writer construction and must not be
owned solely by that Writer.

1. A9 creates complete **Golden A** annotation from the real target PDF.
2. AA freezes classes, geometry, relationships, critical regions, dispositions,
   and measurable thresholds.
3. Golden A receives source SHA, page identity, version, and immutable path.
4. Recognition Writer receives Golden A as read-only test truth.

Reserve an independent **Golden B** PDF with materially different layout or
drawing style before claiming general PDF support. Passing Golden A alone allows
only a narrow supported-source claim. File-name branching, source-specific
coordinate tables, hidden object injection, or fixture hard-coding are forbidden.
Include safe rotation, translation, page-box, and scale variants when in scope.

### 8.3 Recognition Before Conversion

Before AA passes the Recognition Gate, no native Plan Puzzle object may be
created. Recognition output must include:

- class, source geometry, normalized geometry, and provenance;
- relationships or host candidates;
- confidence and disposition;
- page, coordinate transform, and source identity.

The converter consumes only the accepted recognition result and must not reparse
or re-guess the original PDF.

Uncertainty affecting walls, openings, stairs, room boundaries, or scale is
critical and blocks the relevant gate. Noncritical annotation uncertainty may
remain in a visible locked review layer only with truthful status.

Before RED, AA freezes numerical thresholds. Golden A must at minimum prove:

- all AA-designated critical walls, openings, and stair regions correctly
  classified and disposed;
- no false wall, door, window, or opening in critical regions;
- correct host relation for every critical opening;
- complete stair lines;
- fixtures and fixed cabinetry classified as excluded;
- zero unresolved critical uncertainty and no silent loss.

Required recognition evidence: full original, full overlay, legend, critical
region enlargements, stair overlay, exclusion overlay, uncertainty list, and
Ground Truth comparison. Enlargements never replace the full page.

### 8.4 Native Object Semantics

Conversion must create product objects, not source-line wrappers or one grouped
fake object.

A wall must preserve stable identity, source provenance, centerline or paired
boundaries, thickness, connected endpoints/junctions, direction, scale, clean
corners, and stable edit/undo/redo/delete/restore/save/reload behavior.

A door, window, or opening must preserve stable identity, source provenance,
host-wall relation, position, width, orientation, applicable properties, and
door swing when visible. Host integrity must survive valid edits.

Operations must be type-appropriate; arbitrary rotation or scaling must not
break topology or detach hosted openings. Stairs remain complete and locked.
Columns remain locked. Dimensions, text, and accepted reference material belong
in a clearly named, hideable, locked layer.

With the original PDF/reference hidden, the native-object-only scene must remain
meaningful and recognizable for the supported product purpose.

### 8.5 Scale And Product Flow

Scale priority:

1. reliable source geometry/page units;
2. user-confirmed known dimension;
3. high-confidence recognized dimension offered as a suggestion;
4. explicit `scale unconfirmed` state requiring calibration.

Recognized text must not silently become authoritative scale. Record scale source,
value, confirmation actor, and transform. Untrusted scale cannot be presented as
measurement-ready.

Fresh product verification must prove real selection, understandable recognition
status, complete/partial/failure messaging, canvas fit, scale confirmation,
selection and type-appropriate edits, delete and undo/redo, protected stairs,
Traditional Chinese errors, and trace records for import, scale, and material
edits. No mock picker, pre-injected objects, test shortcut, Writer browser state,
or reused final screenshot is permitted.

Final visuals must include full source, full result, side-by-side comparison,
transparent overlay, critical regions, individual object selection, properties,
before/after edits, delete/restore, stairs, exclusions, scale, trace record, and
final full canvas.

### 8.6 Immediate Stops

Stop the affected action for:

- missing skill receipt or wrong repo/worktree/branch/source/candidate identity;
- out-of-scope writes or modification of the Human's active dirty worktree;
- conversion before Recognition Gate;
- stale AA conclusions used instead of fresh diagnosis;
- Writer/Verifier overlap or shared verification context;
- mocked or injected file selection;
- unapproved dependency, agent, object-model expansion, or protected-file change;
- incomplete stairs, false walls/openings, excluded fixtures becoming objects,
  critical silent loss, or untraceable evidence;
- technical pass with failed Ground Truth or human visual result;
- the correction threshold in Section 4.

## 9. Reporting And Completion

Use event-driven reporting only: activation readiness, dispatch completion, new
hard blocker, child terminal, A9 integrated review, AA gate/final decision, or a
Human-requested status. Do not forward every RED/GREEN cycle or unchanged
watcher state.

A child terminal includes task/turn identity, changed files and hashes, first
broken boundary, actions/checks, evidence paths, unresolved defects, scope
status, and confirmation that authority returned to zero.

The child delivers one terminal envelope to its direct parent using:

```text
childThreadId/childTurnId/terminalNonce
```

The parent acknowledges and harvests it once. Duplicate delivery is not
re-reviewed. If delivery fails, report `TERMINAL_DELIVERY_TOOL_BLOCKED` with
exact tool, target, key, timestamp, and zero-authority state; do not repeat work,
busy-poll, or open another lane. Watcher may issue one parent-only recovery alert.

AA's final Human report must state: changed files and behavior; supported PDF
scope; Golden A/Golden B status; build/lint/typecheck/test results; fresh visual
and interaction evidence; scale and traceability; remaining mock, uncertainty,
or limitations; protected-scope/dependency/Git status; and final verdict.

The mission is complete only when all are true:

```text
correct recognition
+ correct disposition
+ native wall/opening semantics
+ hosted relationships
+ complete stairs
+ correct exclusions
+ meaningful native-only scene
+ truthful scale
+ real interaction and persistence
+ case trace records
+ immutable-candidate technical pass
+ Fresh Verifier pass
+ AA original-resolution human-view pass
```

## 10. Protected Scope And Publishing

Without exact task authority, do not mutate database/Supabase/authentication;
payment/escrow/custody/trust; AI or LINE API, n8n, or production webhooks;
production Budget Engine or formal pricing/quotation facts; formal Excel/PDF
export, tender publication or award; unrelated Plan Puzzle core, vendor
libraries, protected source, existing evidence; remote issue/PR/release/deploy
state; or broad/destructive repository state.

Acceptance or predeploy evidence is not publish authorization. Before merge or
publish, list exact files, exclude unrelated dirty state, confirm the served
route and protected scope, and receive exact authorization.

When local and remote differ, report:

```text
LOCAL_STATE_DIFFERS_FROM_REMOTE
```

Never treat a dirty local worktree as remote truth.
