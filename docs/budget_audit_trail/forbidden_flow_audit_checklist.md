# Forbidden Flow Audit Checklist

Use this checklist for every Budget Audit Trail Agent patrol and final report.

## Implementation Boundary

- [ ] `src/` unchanged.
- [ ] `app/` unchanged.
- [ ] `components/` unchanged.
- [ ] Budget Engine unchanged.
- [ ] MethodSpec implementation unchanged.
- [ ] Raw Candidate implementation unchanged.
- [ ] Output Documents implementation unchanged.
- [ ] Renderer runtime unchanged.

## Pricing Boundary

- [ ] No `PricingRule` modified or created.
- [ ] No `BudgetEstimateLine` modified or created.
- [ ] No formal price generated.
- [ ] No formal quote generated.
- [ ] Audit record not presented as price approval.

## Runtime / Integration Boundary

- [ ] No DB / Supabase integration.
- [ ] No payment / escrow / listing fee flow.
- [ ] No AI API call.
- [ ] No n8n runtime.
- [ ] No integration harness activation.
- [ ] No production webhook.
- [ ] No secrets, `.env`, API key, token, or credential read or written.

## Documentation Boundary

- [ ] Docs clearly state candidate / proposal / placeholder status where relevant.
- [ ] Docs state Integration Officer review is required before integration use.
- [ ] Handoff does not claim runtime acceptance for docs-only work.
