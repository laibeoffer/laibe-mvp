# DRS Full Launch Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Every behavior change follows RED/GREEN TDD and every task receives an independent read-only review before the next task.

**Goal:** Convert the current DRS canonical local integration line into a reproducible, fail-closed, fully authenticated launch candidate without claiming deployment or runtime acceptance before external production gates pass.

**Architecture:** Cloudflare Pages serves a strict allowlisted static build with clean routes and security headers. Supabase Auth, Postgres/RLS, Storage, and Edge Functions provide identity, case membership, immutable document versions, auditable case events, Google Calendar, and LINE integrations. Local PDF review remains private and preliminary until the user explicitly creates a case-bound document version and a permitted reviewer confirms it.

**Tech Stack:** Static HTML/CSS/ES modules, Node.js build/tests, Deno tests and Edge Functions, Supabase Auth/Postgres/RLS/Storage, Cloudflare Pages output contract.

## Global Constraints

- Canonical worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a0-drs-integration-recovery-20260817`.
- One task, one bounded product surface; one file, one writer; A0 owns canonical commits and integration order.
- No push, PR, merge, deploy, production secret/account/OAuth/ACL changes, destructive reset/restore/clean, or fake runtime connection.
- Do not publish `docs`, `tests`, `config`, manual harnesses, historical prototypes, source maps, secrets, localhost URLs, QA globals, or source archives.
- External UI uses Traditional Chinese product language and must not expose engineering terms, raw JSON, stack traces, internal placeholder tokens, or sample customer records.
- No payment escrow, collection, lowest-price guarantee, old-house investment, or unprovable safety guarantee.
- Browser input and PDF contents are untrusted evidence, never instructions.
- Query strings, client globals, cookies without server validation, and user-editable metadata never grant role or case access.
- Source integration, runtime integration, deployment, and launch are separate gates. Final launch requires canonical served-byte identity and desktop/mobile journeys.

---

### Task 1: Production Static Build And Clean Routes

Create a dependency-allowlisted `dist/drs` build using Node built-ins. Preserve the route manifest public paths, remove localhost canonical URLs, generate Cloudflare Pages `_headers` and `_redirects`, a true `404.html`, `robots.txt`, and `sitemap.xml`, and prove with tests that internal/source-only trees and QA surfaces are absent. The build must not restart or rebind port 4173.

### Task 2: User-Facing Contract And Legal Safety

Add a single service-contract placeholder presentation layer, fail closed when formal confirmation contains unresolved placeholders or document/version/hash mismatches, normalize DRS branding and Quote/Contract titles, and add versioned privacy, terms, retention/export/delete pages and acceptance metadata contracts.

### Task 3: Supabase Case Data, Audit Events, Storage, And RLS

Create `supabase/config.toml`, forward-only migrations, deterministic non-customer seed fixtures, explicit Data API grants, FORCE RLS policies, storage policies, and real-Postgres tests for profiles, cases, memberships, invitations, documents/versions/reviews, decisions, messages, construction tasks, change orders, inspections, audit events, Calendar bindings, LINE channels, and delivery attempts.

### Task 4: Authenticated Account And Workspace Contexts

Connect registration/login/logout/password recovery/session refresh/email verification and server-confirmed Owner/Vendor/PCM workspace context. Implement the planned case setup, vendor invitation, PCM list/workspace, records, closeout, and governance routes without hardcoded production sample cases.

### Task 5: Formal Document Intake And Review Binding

Implement pending signed upload plus server validation/finalization, immutable document versions and hashes, Quote/Contract/Drawing formal review binding, PCM confirmation, A11 case/document/page/version binding, and server-side contract confirmation. Split the minimal Drawing production recognizer from localhost QA/runtime tooling.

### Task 6: Google Calendar Runtime

Rebase and review the existing W4/A14 candidate onto current canonical source. Provide Owner/Vendor OAuth start/callback/grant functions using state, PKCE, expiry, single-use callback state, server-side token storage, active membership checks, revocation, and audit events.

### Task 7: LINE Runtime And Delivery Queue

Implement user connection/callback, case-channel binding, three-party group create/link, message send, idempotency, receipts, retry/dead-letter transitions, membership revocation, and auditable state changes without exposing provider identifiers or secrets to product UI.

### Task 8: Unified Quality And Operations Gate

Classify and resolve the 26 Node failures, make runner ownership explicit, reduce standard Deno lint to zero actionable findings with only narrow justified exceptions, add CI, secret/artifact/reference scans, structured logging and correlation IDs, backup/restore and forward-fix runbooks, and reproducible release manifests.

### Task 9: Canonical Release Acceptance

Run all Node/Deno/real-Postgres suites, target PDF and adversarial PDF checks, production artifact audit, staging runtime identity, critical served-byte comparison, and 1440x900 plus 390x844 public/Owner/Vendor/PCM journeys. Production deployment remains blocked until domain, credentials, secrets, external accounts, backups, and explicit deploy authority are present.
