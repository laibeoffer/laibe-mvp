# Payment Ledger Placeholder Automation

- automation_name: pcm-payment-ledger-placeholder-patrol
- frequency: every 15 minutes
- automation_id: pcm-payment-ledger-placeholder-patrol
- kind: heartbeat
- status: ACTIVE
- managed_by: AI PCM 總監／後台總控 Agent
- workstream: pcm/payment-ledger-placeholder
- source_of_truth: GitHub main / PR / commit SHA
- local_workspace: Z:\08-Jacky\laibe_pcm
- local_is_shared_truth: false
- blackboard: docs/ai_pcm/AI_PCM_BLACKBOARD.md
- no_idle_until_closeout: true
- auto_progress_after_minutes_without_response: 20
- permission_requests_route_to: AI PCM 總監／後台總控 Agent
- agents_must_not_ask_user_directly: true
- safe_scope: docs-only, mock-only, placeholder-only, contract-only, schema, checklist, policy, evidence packet, final completion report, AI PCM blackboard status update
- forbidden_runtime: production payment, escrow, listing fee, fund release, fund deduction, formal payment instruction, webhook, DB / Supabase, AI API, LINE API, bank API, production runtime, real transaction, formal legal wording, formal tender launch, formal quote, formal price

## Corrected No-Idle Flow

Self-introduction starts the task; it does not complete the task.

After self-introduction this agent must immediately:

1. Create or update this automation file.
2. Build the workstream docs directory.
3. Create the main agent file.
4. Create core contracts, schemas, checklist, policies, and examples.
5. Create `evidence_packet.md`.
6. Create `final_completion_report.md`.
7. Update the AI PCM blackboard.
8. Report to AI PCM 總監／後台總控 Agent.
9. Continue patrol until supervisor closeout acceptance.
10. Stop automation only after supervisor declares automation stop approved.

Forbidden idle reports:

- 等待命令派發
- 本輪無新指派
- 等 AI PCM 總監指示
- 等最高指揮官指示
- 等使用者核准
- no material change
- pending approval

## Patrol Scope

Every patrol may:

- inspect payment ledger placeholder documents
- check milestone payment plan sample consistency
- check payment review statuses for allowed enum values
- identify missing acceptance or release conditions
- identify disputed amount placeholders
- prepare human approval requests
- update the AI PCM blackboard with payment ledger placeholder status
- create or tighten docs-only schemas, policies, examples, evidence packets, and closeout checklists

Every patrol must not:

- connect real payment systems
- connect escrow systems
- connect listing fee systems
- connect bank APIs
- connect DB, AI API, or LINE API
- release or deduct money
- create real transactions
- create formal legal wording
- launch formal tender
- create formal quote or price

## Blocker Handling

If blocked:

1. Attempt self-resolution within docs-only / placeholder-only scope.
2. If unresolved, create a Permission Packet or Blocker Packet for AI PCM 總監／後台總控 Agent.
3. Continue other safe tasks.
4. Record the blocker and safe work continuation in `initialization_progress_report.md` and the AI PCM blackboard.

