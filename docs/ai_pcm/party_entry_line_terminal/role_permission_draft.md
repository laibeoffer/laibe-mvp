# Role Permission Draft

## Purpose

本文件定義甲方、乙方、平台與 LINE 終端的草案權限。這不是正式身份驗證或授權系統。

## Role Matrix

| Capability | Owner | Contractor | Platform Admin | LINE Terminal |
|---|---:|---:|---:|---:|
| Receive notification | yes | yes | yes | yes |
| Send reminder | no | no | yes | outbound only |
| Submit question | yes | yes | yes | inbound only |
| Submit supplement | yes | yes | yes | inbound only |
| Quick reply | yes | yes | yes | inbound only |
| Mark evidence verified | no | no | review only | no |
| Change contract | no | no | formal workflow only | no |
| Create change order | no | no | formal workflow only | no |
| Trigger payment | no | no | formal workflow only | no |
| Override platform record | no | no | no | no |

## Owner Draft Permissions

Allowed:

- Submit questions.
- Reply to reminders.
- Upload pending supplements.
- Request platform review.

Not allowed through LINE:

- Approve contract changes.
- Confirm payment release.
- Override verified platform records.
- Convert oral message into formal contract term.

## Contractor Draft Permissions

Allowed:

- Submit RFI.
- Reply to supplement reminders.
- Upload pending site photos or documents.
- Request owner or platform confirmation.

Not allowed through LINE:

- Establish additional work.
- Start payment claim.
- Mark inspection passed.
- Treat chat content as contract amendment.

## Platform Admin Draft Permissions

Allowed:

- Review terminal records.
- Link terminal records to platform cases.
- Route questions to responsible agents.
- Mark records as no formal effect.
- Escalate to AI PCM 總監／後台總控 Agent.

Still restricted:

- Must not treat LINE as sole source of truth.
- Must not bypass formal contract, evidence, or payment workflow.

## Permission Requests

Current permission requests to AI PCM 總監／後台總控 Agent:

| Request | Reason | Risk | Status |
|---|---|---|---|
| Confirm whether any production/external scheduler is needed beyond the active Codex thread heartbeat | The task defines a 15-minute patrol; Codex heartbeat is active, but production automation remains out of scope. | medium | PENDING_SUPERVISOR_DECISION |
| Confirm final owner/contractor role names before product implementation | This draft avoids formal identity verification. | low | PENDING_SUPERVISOR_DECISION |
