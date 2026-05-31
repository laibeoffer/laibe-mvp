# Forbidden Runtime Scope

## Absolute Boundary

This workstream is `N8N_PLACEHOLDER_ONLY`.

It must not enable or prepare runtime integration.

## Strictly Forbidden

- 不接真 n8n
- 不接 webhook runtime
- 不接 API key
- 不接 DB
- 不接 Supabase
- 不接 payment
- 不接 AI API
- 不改 `src/`
- 不改 `app/`
- 不改 Budget Engine
- 不改 PricingRule
- 不改 BudgetEstimateLine
- 不改 Renderer
- 不改 Quote Factory
- 不改 Raw Candidate
- 不改 MethodSpec
- 不改 Output Documents
- 不啟動 integration harness
- 不產生正式預算
- 不產生正式 Excel / PDF

## Forbidden Artifacts

Do not create:

- real webhook URL
- production endpoint
- API token
- credential file
- `.env`
- DB migration
- Supabase config
- payment config
- AI API config
- n8n workflow export with credentials
- production customer notification template
- formal quote file
- formal `.xlsx`
- formal `.pdf`

## Placeholder-Only Artifacts Allowed

Allowed artifacts in this workstream:

- workflow spec markdown
- placeholder node map
- placeholder trigger contract
- node input/output contract
- failure and review gate policy
- blackboard update contract
- Knowledge Vault feedback contract
- sample dry-run trace JSON
- n8n placeholder blueprint JSON with no secrets and no runtime URLs

## Scope Check

Before completion, confirm:

- implementation code changed: No
- n8n runtime touched: No
- webhook created: No
- API key included: No
- DB/Supabase touched: No
- payment touched: No
- AI API touched: No
- Budget Engine implementation touched: No
- PricingRule touched: No
- BudgetEstimateLine touched: No
- Renderer touched: No
- formal quote generated: No
- formal Excel/PDF generated: No
