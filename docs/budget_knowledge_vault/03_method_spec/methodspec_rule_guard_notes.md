# MethodSpec Rule Guard Notes

## Guard Purpose

MethodSpec rules may support budget-system readiness only when approved by the owning workstream and passed through the proper Budget Engine entry path.

## Required Guardrails

- Do not let MethodSpec self-repair the Budget Engine entry blocker.
- Do not write production `PricingRule` from candidate or proposal evidence.
- Do not convert raw candidate evidence into `MaterialSpec` or `LaborRule` without explicit MethodSpec ownership and review.
- Do not start the integration harness from the vault.

## Current Context Windows

| Window | Status | Rule |
|---|---|---|
| Requirement Form Window | `placeholder / linked / verified` required. | Non-verified context requires review and must not produce formal pricing. |
| Plan Puzzle SVG / Quantity Facts Window | `placeholder / linked / verified` required. | Non-verified SVG / quantity facts are not production quantity authority. |
