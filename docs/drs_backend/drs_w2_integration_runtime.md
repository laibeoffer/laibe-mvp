# DRS W2 Local Integration Runtime

## Status

`ACTIVE_PROTECTED / CONTRACT_SLICE_GREEN / SOURCE_ADMISSION_PENDING`

This is an isolated local integration contract. It does not connect to A0, real LINE, OpenAI, Auth, remote PostgreSQL, or production services.

## Implemented Contract Slice

- Advisory review can return only the three accepted statuses.
- Advisory AI cannot send by itself.
- A verified authentication subject must map to the immutable assigned `specialist_id`.
- Assignment and formal group link must both be active at the action time.
- The reviewed source event, formal link, LINE destination, and transport payload hash are one non-substitutable binding.
- The assigned specialist's explicit review submission creates a hash-only `REVIEW_SNAPSHOT_SUBMITTED` audit event before the advisory call; the exact submitted bytes and that server-generated hash are passed together to the advisory port.
- Normal, attention, and review-service-unavailable decisions remain Human-controlled.
- `MANUAL_EXCEPTION_SEND` requires reason, urgency, and service incident id.
- Manual-exception urgency and incident id are retained in the Human decision audit event.
- Human cancellation creates no transport call, final message, or outbound receipt.
- A transport timeout creates no Core-style `FINAL_MESSAGE` or `RECEIPT`.
- An incomplete or mismatched transport acceptance creates no final message or receipt.
- Transport acceptance creates one final message followed by one receipt with `recipient_read=false`.
- Core body hash and A14 transport-payload hash are stored as distinct values.
- One linear predecessor chain is maintained for each local case.
- An accepted idempotent replay returns the prior result without sending again; conflicting content under the same key is rejected.
- Concurrent exact replays share one in-flight finalization and one transport call; rejected transport results replay stably.
- Submitted text is passed to the advisory port for the explicit review call but is not persisted in audit events; intermediate edits and hidden reasoning are not stored.
- Advisory findings are reduced to the accepted `code`, `severity`, `evidenceRef`, and `recommendation` fields before persistence.
- Finding codes, severities, evidence-reference syntax, and recommendations are policy-controlled. Free-form AI recommendation/proposed text is not persisted; only a proposed-text SHA-256 is retained.
- Transport acceptance requires strict UTC RFC3339 evidence, a non-empty transport message id, matching destination and payload hash, and valid attachment id/SHA-256 pairs.

## Fresh Evidence

Command:

```powershell
node --test tests/drs-w2-runtime-integration.test.mjs
```

Result: `13/13 PASS` after observed RED. Covered flows:

1. Normal advisory review plus Human send and transport receipt.
2. Transport timeout fail-closed behavior.
3. Specialist authentication-subject mismatch denial.
4. Review-service-unavailable manual exception requirements.
5. Human cancellation without transport.
6. Concurrent exact replay reservation.
7. Cross-group source/destination/hash substitution denial.
8. Advisory output schema reduction and privacy guard.
9. Sparse advisory findings fail closed without persisting null policy entries.
10. Malformed transport acceptance denial and stable replay.
11. Invalid attachment identity/hash, including sparse arrays, denied before Human audit or transport.
12. Accepted transport evidence is snapshotted once before validation and persistence.
13. Malformed assignment and formal-group authority intervals fail closed under strict calendar-valid RFC3339 parsing.

`node --check` passes for the runtime and focused tests. `tests/drs-w2-source-convergence.test.mjs` passes as a clean-source inventory check only; it is not source admission. `git diff --check` passes.

## Not Yet Claimed

- The A14 W2 adapter, Core W2 PostgreSQL harness, and Workspace W2 data-binding candidates have not yet been admitted.
- The local runtime has not yet been bound to A14/Core exported functions or SQL transactions.
- No disposable PostgreSQL execution or real RLS proof is claimed here.
- Owner/Vendor inbound message behavior and durable role projections await the admitted A14/UI candidates.
- Attachment storage authorization, retention, expiry, and deletion are not implemented.
- No production, deployment, remote API, credential, canonical route, or A0 acceptance is claimed.

## Next Safe Action

Review and freeze each exact W2 lane candidate, then replace the contract scaffold's injected boundaries with the admitted A14/Core/UI adapters while retaining this focused suite as the cross-lane acceptance test.
