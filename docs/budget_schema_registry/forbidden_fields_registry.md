# Forbidden Fields Registry

Status: `ACTIVE_INITIALIZATION`

This registry blocks field names and flows that could make support-agent or candidate data look like formal price, formal quote, production credential, or runtime authority.

## Forbidden Fields

These fields must not appear in Schema Registry examples except inside this forbidden registry or explicit warning text:

- `formal_price`
- `approved_price`
- `official_unit_price`
- `BudgetEstimateLine`
- `PricingRule direct publish`
- `MaterialSpec direct publish`
- `LaborRule direct publish`
- `BudgetOutputSnapshot direct from raw data`
- `customer quote from candidate evidence`
- `payment token`
- `API key`
- `DB credential`
- `Supabase migration`
- `n8n credential`
- `AI API key`

## Forbidden Runtime Targets

Support-agent schema docs must not publish or modify:

- `PricingRule`
- `MaterialSpec`
- `LaborRule`
- `BudgetEstimateLine`
- `BudgetOutputSnapshot`
- renderer documents
- Excel / PDF artifacts
- DB records
- API payloads carrying secrets
- payment / escrow / listing fee state
- n8n production workflows

## Forbidden Direct Flows

| From | Forbidden direct target | Required safe handling |
|---|---|---|
| `OwnerIntent` | formal estimate | Convert to `ProjectRequirementBrief` context only. |
| `ProjectRequirementBrief` | renderer input | Enter trace window only through `BudgetOutputSnapshot`. |
| `PlanPuzzleQuantityFacts` | formal quantity | Keep as context until authorized quantity process exists. |
| `QuoteFactoryExportPackage` | `PricingRule` | Review as candidate evidence first. |
| `PriceObservation` | official unit price | Keep as observed evidence. |
| `PriceRange` | approved price | Keep as review range evidence. |
| `RawCandidate` | `MaterialSpec` / `LaborRule` / `PricingRule` | Produce handoff proposal only. |
| `HandoffProposal` | MethodSpec direct publish | Human/reviewer gate required. |
| `MethodSpecCatalog` | renderer direct input | Renderer reads `BudgetOutputSnapshot` only. |
| raw source data | `BudgetOutputSnapshot` | Must pass deterministic engine/output boundary. |

## Credential Rule

No example, report, handoff, PR body, console output, or markdown file may include real credentials, API keys, tokens, `.env` values, DB connection strings, Supabase keys, payment tokens, webhook secrets, or n8n credentials.

## Formal Price Rule

A candidate price is always evidence. It can be named `observed_price` or `price_range`, but it must not be named or treated as formal price authority.

## Violation Label

If a future document or example needs a blocked field for explanation, it must label the section as `FORBIDDEN EXAMPLE - DO NOT IMPLEMENT`.
