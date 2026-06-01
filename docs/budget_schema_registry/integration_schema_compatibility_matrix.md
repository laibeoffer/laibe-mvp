# Integration Schema Compatibility Matrix

Status: `ACTIVE_INITIALIZATION`

This matrix identifies whether each contract can be used by integration planning and what review is required. It does not authorize the integration harness to start.

## Matrix

| Contract | Direct runtime input allowed? | Dry-run planning allowed? | Renderer direct input? | Formal price authority? | Review required before harness use? |
|---|---:|---:|---:|---:|---:|
| `OwnerIntent` | No | Yes | No | No | Yes, if used beyond trace. |
| `ProjectRequirementBrief` | No | Yes | No | No | Yes, if used beyond trace. |
| `PlanPuzzleQuantityFacts` | No | Yes | No | No | Yes, before formal quantity use. |
| `FileManifest` | No | Yes | No | No | Yes, before production upload/storage. |
| `QuoteFactoryExportPackage` | No | Yes | No | No | Yes, by integration officer. |
| `PriceObservation` | No | Yes | No | No | Yes, price-bearing evidence. |
| `PriceRange` | No | Yes | No | No | Yes, price-bearing evidence. |
| `RawCandidate` | No | Yes | No | No | Yes, before handoff use. |
| `HandoffProposal` | No | Yes | No | No | Yes, before catalog consideration. |
| `MethodSpecCatalog` | Yes, for deterministic budget engine only | Yes | No | No direct price authority | Yes, for integration harness. |
| `PricingRuleReference` | No in this registry | Yes | No | No | Yes, formal pricing owner only. |
| `BudgetInputBundle` | No until authorized runtime exists | Yes | No | No | Yes. |
| `BudgetRunPlan` | No until authorized runtime exists | Yes | No | No | Yes. |
| `BudgetOutputSnapshot` | Yes, for renderer/output only if produced by the proper output process | Yes | Yes | It may contain generated line prices but is not a pricing source | Yes before formal artifact output. |
| `ReviewDecision` | No | Yes | No | No | Yes, reviewer scope must be clear. |
| `FunctionalAcceptanceReport` | No | Yes | No | No | Yes, commander/integration context. |
| `RuntimeEvidenceReport` | No | Yes | No | No | Yes, evidence scope must be clear. |
| `FinalCompletionPacket` | No | Yes | No | No | Yes, closeout owner must accept. |

## Harness Rule

Integration harness remains blocked until the four required lines reach their own acceptance criteria:

1. Quote Factory / raw cleaning line
2. Raw Candidate / material procurement warehouse
3. MethodSpec / method and spec warehouse
4. Output Documents / budget output logistics

Schema Registry support docs do not raise any of those percentages.

## Output Documents Rule

Output Documents may accept only `BudgetOutputSnapshot`, `RenderedBudgetDocument`, or a formal renderer-token-gated structured document. It must not accept raw candidates, MethodSpecCatalog, PricingRule, PriceObservation, PriceRange, requirement text, SVG artifacts, or plan-puzzle data directly.

## Review Labels

Use these review labels in completion packets:

- `NOT_APPLICABLE_DOCS_ONLY`
- `DRY_RUN_COMPATIBILITY_ONLY`
- `CONTEXT_TRACE_ONLY`
- `BLOCKED_NEED_COMMANDER_DECISION`
- `REQUIRES_INTEGRATION_OFFICER_REVIEW`
