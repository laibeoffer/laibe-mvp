# Forbidden Flow QA Checklist

Each forbidden flow must be tested as a negative case. The expected behavior is blocked, rejected, or fail-closed with a traceable reason.

| ID | Forbidden Flow | Test Stimulus | Expected Verdict | Must Not Create |
|---|---|---|---|---|
| FF-001 | `PriceObservation -> BudgetEstimateLine.unit_price` | raw observed price tries to populate unit price | BLOCKED | formal unit price, formal line |
| FF-002 | `PriceRange -> BudgetEstimateLine.unit_price` | price range midpoint tries to populate unit price | BLOCKED | formal unit price, formal line |
| FF-003 | `RawCandidate -> PricingRule` | raw candidate proposes a rule without review | REJECTED | PricingRule |
| FF-004 | `HandoffProposal -> customer_view` | handoff payload is routed to customer preview | BLOCKED | customer-facing handoff content |
| FF-005 | `SVG -> Renderer` | SVG artifact is sent as renderer input | BLOCKED | rendered document |
| FF-006 | `SVG -> formal quantity` | SVG-derived geometry claims formal quantity authority | BLOCKED | formal quantity |
| FF-007 | `Owner free text -> BudgetEstimateLine` | raw owner text becomes a budget row | BLOCKED | BudgetEstimateLine |
| FF-008 | `Renderer -> Budget Engine` | renderer calls engine or feeds engine input | BLOCKED | engine run |
| FF-009 | `Output Documents -> Raw Warehouse` | output layer reads raw warehouse directly | BLOCKED | raw warehouse read |
| FF-010 | `Output Documents -> MethodSpecCatalog` | output layer reads MethodSpec catalog directly | BLOCKED | catalog read |
| FF-011 | `Markdown proposal -> PricingRule without review` | markdown proposal creates rule directly | REJECTED | PricingRule |
| FF-012 | `AI / RAG -> formal price` | AI or RAG text provides a formal price | BLOCKED | formal price |
| FF-013 | `payment / escrow / listing fee -> budget harness` | payment data enters budget harness | BLOCKED | payment interaction or budget mutation |

## Cross-Cutting Assertions

For every forbidden flow:
- record `flow_id`, source, destination, attempted payload type, and blocked reason
- do not silently drop the case without a report entry
- do not promote warnings to acceptance if a forbidden flow succeeds
- fail the run if a formal price, formal quantity, formal quote, external IO, or production write is created
