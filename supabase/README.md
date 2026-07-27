# PCM Knowledge Foundation

This directory is a deployable foundation for the shared PCM knowledge system.
It is prepared for an isolated development branch and must not modify the
connected project's default branch during verification.

## Scope

- Private schemas: `knowledge_staging`, `knowledge`, and `casework`.
- Human-controlled lifecycle:
  `inbox -> draft -> pending_review -> approved -> retired`.
- Obsidian and budget source material always enters staging.
- Obsidian and budget imports use separate source hashes, correlation keys, and
  idempotent chunks. A change in either source cannot be hidden by an unchanged
  hash from the other source.
- A source label of `已核准` maps to `pending_review`; it never publishes a
  rule.
- Imported budget flags are retained as evidence only. They cannot authorize
  publication or create a case budget candidate.
- Historical price observations remain references and always have
  `direct_pricing_allowed = false`.
- A12 records PDF evidence and drawing-review findings using
  `a12.drawing_review_queue.v1`. It cannot create budget candidates.
- Contract knowledge returns evidence, comparison, missing-information, or
  risk-note payloads only, with `formalImpact: none`.

## Remote Inventory Boundary

The current remote `public` schema already contains `profiles`, `projects`,
`bids`, `tender_files`, `tender_unlocks`, and `project_drafts`. This migration
does not query, alter, or reference those tables. `casework.cases` uses an
optional `external_project_id` without a foreign key to `public.projects`.

An isolated branch may be used to verify this package without changing the
default branch. A production merge remains blocked until the project owner
separately authorizes remediation or formal acceptance of the existing public
security findings:

- `profiles` has RLS enabled without an access policy.
- `project_drafts` has unrestricted insert and update policies.
- Several existing public tables are exposed to anonymous or authenticated
  GraphQL access.
- `tender_unlocks` contains legacy `payment_status` and `unlock_price` fields.

Those findings are outside this migration and must not be silently repaired or
used by the Knowledge Gateway.

## Verification

```powershell
node --test scripts/knowledge/tests/test_split_supabase_migration.mjs `
  site/knowledge_studio/tests/knowledge_studio.test.mjs `
  supabase/tests/foundation_contract.test.mjs `
  tests/knowledge/knowledge_system_contract.test.mjs

python -m unittest discover -s scripts/knowledge/tests `
  -p test_ingest_knowledge.py -v

deno test --allow-all tests/knowledge/pglite_migration_smoke.test.ts
deno check supabase/functions/knowledge-ingest/index.ts `
  supabase/functions/knowledge-studio/index.ts `
  supabase/functions/knowledge-gateway/index.ts
```

The PostgreSQL smoke test executes the complete migration and
`supabase/tests/deployment_contract.sql` in an isolated PGlite database with
minimal Supabase auth and storage stubs. It verifies SQL execution, lifecycle
guards, caller-domain boundaries, staging safety, A12 evidence versioning, and
Knowledge Studio transitions. It also rejects any foreign key in the three new
schemas that lacks a usable leading-column index.

On 2026-07-27 the package was also verified on the paid, isolated development
branch `a5-pcm-knowledge-20260726` (`ocxfrteyedumallatdok`). The default project
was not changed. The branch verification covered:

- all 24 application tables with RLS enabled;
- domain and case isolation, active-session enforcement, private Storage
  policies, and lifecycle transitions;
- active version-1 deployments of `knowledge-ingest`, `knowledge-studio`, and
  `knowledge-gateway`, each with JWT verification enabled;
- an authenticated Studio and Gateway lifecycle test whose temporary data and
  user were removed afterward;
- one-way staging of 59,223 budget source rows in 61 idempotent batches;
- 19,279 budget staging items and 168 review issues, including 159 negative
  historical-price issues retained as source evidence but excluded from usable
  price fields;
- a full replay in which all 61 batches returned `reused: true`, without
  increasing any staging count.

No approved knowledge entry or formal price observation was created by the
import. The Knowledge Studio remains in local preview mode because its endpoint
and project-key slots are deliberately blank.

## Deployment Order

1. Obtain owner authorization for a non-production Supabase environment.
2. Resolve or formally accept the separate existing `public` security findings.
3. Run the migration in a disposable environment.
4. Run `seed.sql` locally only; never seed the production project.
5. Execute database-level RLS, lifecycle, immutable-version, append-only event,
   storage, A12 finding, and budget-candidate denial tests.
6. Deploy `knowledge-gateway` with JWT verification enabled.
7. Set `KNOWLEDGE_GATEWAY_ALLOWED_ORIGINS` and
   `KNOWLEDGE_STUDIO_ALLOWED_ORIGINS` to the exact deployed web origins.
8. Add test users whose `app_metadata.role` values are `owner`, `pro`, `pcm`,
   and `admin`; add A12 as a case-scoped `pcm` client with
   `app_metadata.client_id = a12`.
9. Verify all three domains return approved, non-retired, cited rule versions
   with `formalImpact: none`.
10. Only after independent security review, connect Knowledge Studio and the
    A12, budget, and contract consumers.

## Private Storage Paths

- `knowledge-source-private`: restricted to PCM and admin reviewers.
- `case-documents-private`: the first path segment must be a case UUID, and the
  caller must be a member of that case.

Browser clients use the authenticated caller JWT and the anonymous project key.
They never receive a privileged server credential.

Edge Functions prefer the platform-provided `SUPABASE_PUBLISHABLE_KEY` and fall
back to the `default` entry in `SUPABASE_PUBLISHABLE_KEYS`, then to the legacy
`SUPABASE_ANON_KEY` during the key transition. Neither path uses a secret or
service-role credential.

When the Knowledge Studio is connected to a deployed branch, set both blank
configuration slots in `site/knowledge_studio/code.html`:

- `knowledge-endpoint`: the JWT-protected `knowledge-studio` function URL.
- `knowledge-project-key`: the branch publishable key, never a secret key.

The browser sends the publishable key on `apikey` and the signed-in user's
session JWT on `Authorization`. Leaving `knowledge-endpoint` blank keeps the
page in its clearly labelled local preview state.
