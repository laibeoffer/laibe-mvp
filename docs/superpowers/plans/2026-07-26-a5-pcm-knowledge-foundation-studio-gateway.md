# A5 PCM Knowledge Foundation, Studio, and Gateway

Date: 2026-07-26
Owner: A5 PCM
Status: isolated branch deployed; automated, remote, desktop, and mobile
contracts verified; production merge and consumer wiring pending

## Objective

Build a controlled knowledge system shared by A12 PDF drawing review, the
budget workflow, and contract evidence review. The system must preserve source
evidence, human review, version history, role boundaries, and case traceability.

The implementation has three stages:

1. Structured rule schema, tests, and publishing lifecycle.
2. A minimum Knowledge Studio for authoring, review, publishing, and retirement.
3. A Knowledge Gateway for controlled use by A12, budget, and contract workflows.

## Delivery Boundaries

- PDF is the only A12 drawing-document format in this scope. No DWG fields,
  routes, tests, or product wording are allowed.
- Obsidian is an editorial intake source, not the runtime authority.
- Supabase is the intended runtime authority. Implementation and remote
  verification use the isolated branch `a5-pcm-knowledge-20260726`
  (`ocxfrteyedumallatdok`). The parent project remains unchanged, and no
  production schema change or branch merge is authorized in this round.
- The package must remain deployable to the existing Supabase project through
  ordered migrations and JWT-protected Edge Functions.
- No existing website page, runtime route, or `site/preview_floor_plan/` file may
  be changed.
- No commit or push.
- No payment custody, escrow, collection, payment guarantee, legal certification,
  electronic-signature effect, formal engineering approval, or lowest-price
  decision claim.

## Source Inventory

### Obsidian editorial source

`Laibe-Budget-Vault/`

- Import direction: Obsidian to `knowledge_staging` only.
- Source status mapping:
  - `收件箱` -> `inbox`
  - `待整理` -> `draft`
  - `待確認` -> `pending_review`
  - `已核准` -> `pending_review`
  - `已停用` -> `retired`
- A source note marked `已核准` does not bypass Knowledge Studio review.
- README, index, template, attachment, and archive folders are excluded from
  publishable knowledge.

### A1 budget item source

`bugget/清單分類_20260605_0107/`

- Current inventory: 69 `.xlsx`, 4 `.md`, and 3 `.json` files.
- Every imported row must retain source-relative path, file SHA-256, worksheet,
  row locator, import batch, and parse status.
- Imported content is staging evidence only. It cannot directly become a price,
  a formal budget line, or an approved rule.
- Missing columns, ambiguous taxonomy, duplicates, and conflicts become quality
  issues requiring review.

### A1 woodwork reference source

`outputs/budget_woodwork_items_20260710/A1_woodwork_ingest_mapping_20260711.json`

- All records keep `direct_pricing_allowed=false`.
- Large raw records are not embedded.
- Low-confidence and classification-conflict rows remain quarantined.

### A12 PDF source

`Z:/08-Jacky/A12/`

- A12 may submit page evidence and candidate findings.
- A12 cannot publish rules, approve findings, or create budget lines.
- Every finding must identify PDF source, SHA-256, page, evidence location,
  confidence, rule version, status, and next owner.

## Stage 1: Data Foundation

### Schemas

- `knowledge_staging`
  - import batches
  - source records
  - budget item staging rows
  - woodwork evidence candidates
  - quality issues
- `knowledge`
  - sources
  - governed unified items
  - entries
  - entry versions
  - drawing requirement rules
  - budget expansion rules
  - acceptance rules
  - contract evidence rules
  - typed relations
  - publication events
- `casework`
  - cases
  - case members
  - documents
  - PDF sheets
  - findings
  - missing-information items
  - evidence links
  - human decisions
  - candidate budget lines
  - append-only case events

### Lifecycle

`inbox -> draft -> pending_review -> approved -> retired`

- Authors may create and edit drafts.
- PCM reviewers may request review, approve, or return an item.
- Admin may approve or retire.
- Published content is immutable; later changes create a new version.
- A retired version remains traceable but is excluded from Gateway results.

### Roles

- `owner`: case documents, responses, and decisions for owned cases.
- `pro`: documents, responses, and tasks for assigned cases.
- `pcm`: findings, review decisions, publication review, and evidence requests.
- `admin`: governance and user-role administration.

All exposed tables require RLS. Role claims come from authenticated app metadata,
not editable user metadata. Browser code never contains a service-role key.

## Stage 2: Knowledge Studio

The minimum Studio must provide:

- searchable rule and evidence list;
- create and edit draft;
- submit for review;
- approve and publish;
- return for correction;
- retire;
- version, source, evidence, status, current owner, and next action;
- understandable empty, loading, and error states.

Visible wording must use product language. It must not expose raw JSON, stack
traces, database or API terminology, mock/debug language, or unfinished
engineering status.

## Stage 3: Knowledge Gateway

The Gateway exposes JWT-protected operations:

- `searchKnowledge`
- `getKnowledgeEntry`
- `getCaseEvidence`
- `recordFinding`

Rules:

- Only `approved`, non-retired versions are returned.
- Responses include entry ID, version, source citations, relevance reason,
  allowed use, and `formalImpact: "none"`.
- Domain access is explicit: `drawing_review`, `budget`, or `contract`.
- A12 can record PDF evidence and findings only.
- Budget may create a candidate only after confirmed scope and may never select a
  price from an imported observation automatically.
- Contract access returns evidence and comparison rules only; it does not create
  a binding contract, signature effect, legal opinion, or payment decision.

## Audit Event Minimum

Each event records:

- actor ID and actor role;
- timestamp;
- case ID when applicable;
- action;
- source document and source locator;
- object type and object ID;
- prior and resulting status;
- version;
- next owner and next action;
- correlation ID;
- `formalImpact: "none"`.

Case and publication event rows are append-only.

## Test Gates

- Migration structure and SQL security lint.
- Foreign-key leading-index coverage across all three new schemas.
- RLS coverage and permission matrix.
- Lifecycle transition tests, including invalid rollback attempts.
- Obsidian status mapping and no-auto-publish test.
- Budget source SHA, worksheet, and row traceability test.
- A12 write-capability denial for candidate budget lines.
- Gateway approved-only, domain, role, and case-scope tests.
- Forbidden visible wording scan.
- No-DWG contract scan.
- JSON and fixture parse validation.
- Browser verification of Studio desktop and mobile states.

## Work Allocation

- A5-SUPABASE-FOUNDATION: `supabase/**`.
- A5-OBSIDIAN-STUDIO: `scripts/knowledge/**` and `site/knowledge_studio/**`.
- A5-DATA-GOVERNANCE-QA: `tests/knowledge/**`.
- A5 parent: integration review, migration deployment decision, browser
  verification, and final boundary decision.

## Acceptance

This round is accepted only when the package is locally reproducible, tests pass,
the Studio is human-readable, the Gateway enforces role/domain boundaries, and
all source evidence remains traceable. Acceptance does not claim production
readiness or formal PCM approval capability.
