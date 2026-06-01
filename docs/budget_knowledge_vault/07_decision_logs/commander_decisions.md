# Commander Decisions

Status: decision log with explicit non-decision signals.

## Rules

- Record commander decisions only when explicitly provided.
- Budget Knowledge Vault is managed by the Integration Officer, not directly by Commander.
- `Need Commander: Yes` should appear only when reported by the Integration Officer or when a genuine blocked decision needs user authority.

## Current Decisions

Issue #41 contains commander dispatch / decision signals that affect budget integration readiness. No commander decision is directed to this vault as an execution owner.

## Commander Decision Inputs

| Source | Signal | Vault Interpretation | Action |
|---|---|---|---|
| Issue #41 Commander Blackboard Patrol Decision | Integration Gate remains `WAITING`; `MERGED_TO_MAIN` is not `FUNCTIONAL_ACCEPTED`; docs-only PRs are `NOT_APPLICABLE_DOCS_ONLY`; read-only Budget Engine entry investigation is assigned to `LAIBE_REVIEWER_INTEGRATION_OFFICER`. | This is a commander decision that affects vault summaries, but it does not authorize this vault to run integration harness, patch Budget Engine, or mark readiness. | Mirror the decision in gap/readiness docs and compact blackboard; do not execute the Budget Engine investigation from this vault. |
| Issue #41 Commander Dispatch - Budget Engine Entry Investigation | `BUDGET_ENGINE_ENTRY_BLOCKER` read-only investigation is required; PR #26 is already merged and must not be processed in that task; integration harness must not start; `budget-generator.ts` must not be created or patched; no line may be marked 100 from investigation alone. | This is an integration dispatch outside the Budget Knowledge Vault. It updates support evidence but does not assign this vault to inspect implementation files or run the investigation. | Mirror the dispatch in gap/readiness docs and compact blackboard; keep support-only boundaries and do not touch implementation code. |
| PR #31 self-check comment | `Need Commander: Yes only if deciding to merge despite Codex review usage limit.` | This is a conditional merge-authority signal, not a commander decision. Budget Knowledge Vault must not resolve it. | Track as pending context for Integration Officer / Commander; do not merge, close, or dispatch from this vault. |
| PR #31 routing note / issue #41 | `Need Commander: Only if merge/close/supersede authority is required beyond Integration Officer.` | This is a conditional authority signal, not a commander decision. Integration Officer disposition is the next routing layer. | Track only; do not request Commander unless Integration Officer records that authority is needed. |
| PR #32 | No PR comments, review threads, or commander instruction found during latest scoped patrol. | Initialization remains active, but there is no commander decision directed to PR #32. | Continue scoped patrol and keep PR #32 current with compact blackboard changes. |
