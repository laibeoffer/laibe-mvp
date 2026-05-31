# Output Snapshot Renderer Notes

## Allowed Renderer Input

- `BudgetOutputSnapshot`
- snapshot-gated `RenderedBudgetDocument`

## Rejected Direct Input

- `RawCandidate`
- `MethodSpecCatalog`
- `PricingRule`
- `PriceObservation`
- `PriceRange`
- RAG / AI response
- free-text requirement form content
- SVG / plan-puzzle artifact

## Guard Notes

Requirement and Plan / SVG windows may appear only through snapshot trace, internal reviewer notes, or customer-safe disclaimers after the snapshot gate. They must not bypass the budget engine or renderer gate.
