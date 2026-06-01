# Placeholder / Linked / Verified / Unavailable Status Policy

Status: `ACTIVE_INITIALIZATION`

All cross-agent inputs must support these status values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

## Status Semantics

### placeholder

The object is draft, mock, example, user-entered, generated for planning, or not yet connected to a stable upstream artifact.

Allowed use:

- dry-run planning
- internal trace
- compatibility review
- missing-data discussion
- non-customer-facing examples

Forbidden use:

- formal estimate
- formal price
- formal quantity
- production renderer input
- customer-facing final quote
- catalog publishing

### linked

The object has a traceable connection to an upstream artifact, PR, issue, source package, plan draft, SVG artifact, or source record.

Allowed use:

- provenance trace
- reviewer inspection
- integration compatibility planning
- dry-run evidence packet

Forbidden use:

- automatic promotion to formal data
- direct `PricingRule` creation
- direct `BudgetEstimateLine` creation
- direct renderer input unless already inside a valid `BudgetOutputSnapshot`

### verified

The owning workstream reports that the object was reviewed for its limited context purpose.

Allowed use:

- stronger internal trace
- reviewer / integration officer evidence
- possible future input to an authorized deterministic process

Forbidden use:

- treating context verification as formal price approval
- treating plan-context verification as construction drawing authority
- treating requirement verification as customer quote authority
- bypassing Budget Engine / MethodSpec / Raw Candidate / Output Documents gates

### unavailable

The required context is missing, blocked, or not safe to use.

Allowed use:

- missing-data report
- review flag
- blocker packet
- fallback planning

Forbidden use:

- full budget generation
- formal estimate
- renderer authority
- hiding the missing context from internal trace

## Receiver Rule

Every receiving agent must preserve the source status. If it produces a new object, it must assign a new status according to its own evidence and include the source status in trace fields.

## No Promotion Rule

No agent may upgrade `placeholder` to `verified` for another agent's object unless that agent owns the verification process or a reviewer / integration officer explicitly records the verification.

## Output Documents Rule

Output Documents may only accept requirement or plan context through `BudgetOutputSnapshot` trace fields. It must not read requirement forms, SVG, plan-puzzle artifacts, raw candidates, or quote factory exports directly.
