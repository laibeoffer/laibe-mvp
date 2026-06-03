# Tender Readiness Status Policy

## Statuses

### NOT_READY_FOR_TENDER

Use when one or more blockers prevent fair, comparable, or traceable contractor pricing.

Typical triggers:

- Scope, drawing dimensions, material requirements, work-method responsibility, exclusions, or acceptance basis are missing.
- Contractors would need to guess a major cost driver.
- Bid comparison would be unreliable.

### READY_WITH_WARNINGS

Use when tender can be prepared only if warnings are disclosed, tracked, and resolved before award.

Typical triggers:

- Minor photo, budget, schedule, or site-constraint gaps remain.
- Assumptions are known and can be attached to tender documents.
- No unresolved legal, payment, DB, AI API, or production-system issue exists.

### READY_FOR_TENDER

Use when all critical inputs are complete and the tender package is sufficient for comparable bidding.

Minimum requirements:

- Demand form complete.
- Drawings / SVG sufficient for pricing.
- Photos cover affected areas.
- Budget items and exclusions are visible.
- Material and work-method scope are clear.
- Payment and acceptance nodes are measurable.
- Tender attachments are organized.

### NEEDS_HUMAN_REVIEW

Use when a readiness decision depends on legal, procurement, safety, payment, contract, production-system, DB, AI API, or formal tender launch judgment.

This status overrides other statuses.

## Decision Order

1. If legal, payment, DB, AI API, production tender launch, contractor access, or formal contract changes are involved, mark `NEEDS_HUMAN_REVIEW`.
2. If any blocker exists, mark `NOT_READY_FOR_TENDER`.
3. If only warnings remain, mark `READY_WITH_WARNINGS`.
4. If no blockers or warnings remain, mark `READY_FOR_TENDER`.

## Evidence Requirements

Every status must include:

- Evidence reviewed.
- Missing information.
- Risks.
- Contractor questions likely to arise.
- Attachment suggestions.
- Forbidden scope check.
- Next action.

