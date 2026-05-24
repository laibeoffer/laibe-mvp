# Deputy Reviewer Patrol

This folder is the handoff lane between `LAIBE_REVIEWER` and Deputy Codex.

Purpose:
- Give the reviewer chatroom a fixed place to leave patrol findings.
- Keep reviewer output separate from `docs/WORKSTREAM_BLACKBOARD.md`.
- Preserve Deputy Codex as the final routing and blackboard publication authority.

Rules:
- `LAIBE_REVIEWER` may write only to `docs/deputy_reviewer_patrol/REVIEWER_PATROL_INBOX.md`.
- Reviewer entries must be read-only audit reports, not implementation.
- Reviewer must not edit source code, active workstream files, GitHub Issues, PRs, blackboard decisions, or handoff decisions.
- Deputy Codex reads this inbox, decides whether action is needed, and publishes any official decision to `docs/WORKSTREAM_BLACKBOARD.md`.
- Entries waiting for Deputy action must use `Status: PENDING_DEPUTY_DECISION`.

Allowed reviewer result codes:
- `NO_REVIEW_TRIGGER`
- `REVIEW_TRIGGER_FOUND`
- `PATROL_RISK_FOUND`
- `TABLE_COMPLIANCE_FAIL`
- `MISSED_PROGRESS_BACKFILL_REQUIRED`

