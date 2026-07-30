# Knowledge System QA Failure Baseline

## Command

```powershell
node --test tests/knowledge/knowledge_system_contract.test.mjs
```

## Expected Initial State

The fixture integrity test should pass. Implementation contract tests should
fail until the corresponding migration, policy module, Gateway, and Knowledge
Studio exist.

## Recorded Initial Run

- Date: `2026-07-26`
- Node test count: `13`
- Passed: `7`
- Failed: `6`
- Runner or fixture parse errors: `0`

Current passing baseline:

- The 76-file source contract is fixed at `69 xlsx / 4 md / 3 json`.
- Existing migrations contain the three required schemas.
- Existing migrations contain lifecycle, RLS, role, and append-only audit
  controls detectable by the static contract.
- The Knowledge Gateway implementation exists and does not expose browser
  service credentials in its implementation source.
- Current Knowledge implementation paths contain no DWG product field or route.

Current expected RED failures:

- Five behavior tests require
  `scripts/knowledge/knowledge-policy.mjs`.
- One visible-copy test requires Knowledge Studio HTML under
  `site/knowledge_studio`.

All six failures report `IMPLEMENTATION_MISSING`; none is caused by a syntax
error, unreadable fixture, or test-runner failure.

Required implementation paths:

- `supabase/migrations/*.sql`
- `scripts/knowledge/knowledge-policy.mjs`
- `supabase/functions/knowledge-gateway/**`
- `site/knowledge_studio/*.html`

Required policy exports:

- `mapObsidianStatus(sourceStatus)`
- `normalizeObsidianRecord(record)`
- `normalizeBudgetSourceRecord(record)`
- `authorizeA12Action(action)`
- `filterGatewayRecords(records, context)`
- `canCreateBudgetCandidate(input)`

The tests intentionally prohibit:

- Obsidian source approval becoming automatic publication.
- A12 creating budget lines, selecting prices, or approving contracts.
- Historical price rows or existing PDF objects creating budget candidates.
- Gateway responses without approved/active/source/version/formalImpact-none
  evidence.
- Cross-domain Gateway access.
- Visible engineering terms or prohibited payment/legal claims.
- DWG fields or routes in the PDF-only Knowledge product.

No production implementation is included in this QA package.
