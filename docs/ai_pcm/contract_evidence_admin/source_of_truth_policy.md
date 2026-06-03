# Contract Evidence Source Of Truth Policy

## Purpose

This policy defines source-of-truth handling for `pcm/contract-evidence-admin`.

It is docs-only and does not verify any project contract evidence by itself.

## Shared Truth Rule

Shared source of truth must be one of:

- GitHub `main`
- GitHub PR
- GitHub commit SHA

Local workspace files are execution state only and must not be treated as shared truth.

## Local Workspace Rule

local_workspace:
`Z:\08-Jacky\laibe_pcm`

local_workspace_status:
`LOCAL_STATE`

The local workspace may be used for docs-only authoring, validation, and patrol checks.

The local workspace must not be used as formal evidence source unless a GitHub PR / commit SHA confirms it.

## LOCAL_STATE_STALE Rule

Mark `LOCAL_STATE_STALE` when:

- Local Git metadata is unavailable.
- Local branch cannot be mapped to GitHub PR / commit SHA.
- Local files differ from GitHub shared truth.
- Existing local drafts predate the current PR / commit source.

## Evidence Verification Rule

An evidence record may move to `verified` only when:

1. Source is traceable.
2. GitHub source reference is recorded.
3. Version or timestamp is identifiable.
4. Party confirmation is recorded when applicable.
5. Evidence is not disputed, superseded, voided, or unavailable.
6. Evidence does not rely on LINE message alone as contract authority.

## Formal Use Rule

`formal_use_allowed` must remain `false` unless status is `verified` and the GitHub source-of-truth gate is satisfied.

Examples, policy files, linked records, local files, and LINE messages must not be treated as verified contract facts.

## Supervisor Routing

If GitHub source-of-truth cannot be confirmed, route a blocker packet to:

AI PCM 總監／後台總控 Agent

The Agent must not ask the user directly.

## Current Patrol Assertion

Current state:

- Local workspace is execution state only.
- GitHub PR / commit SHA remains required for shared truth.
- No project-specific verified evidence is registered by this workstream.
- Automation remained active until AI PCM Supervisor closeout acceptance and automation stop approval; after `automationStopApproved: true`, the Codex app heartbeat `pcm-contract-evidence-admin-patrol` was deleted.
