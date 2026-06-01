# Budget Workspace State Model

## Purpose

This document defines the mock state model for the future Budget Workspace UI. It is an IA contract only and must not be treated as a production schema.

## Root Shape

```json
{
  "workspaceId": "budget-workspace-ui.mock.v1",
  "projectId": "project-demo-001",
  "sourceOfTruth": "github",
  "mode": "mock_contract_only",
  "modules": {},
  "ctaGate": {},
  "warnings": [],
  "blockers": []
}
```

## Global State Fields

| Field | Type | Purpose |
|---|---|---|
| `workspaceId` | string | Mock workspace id. |
| `projectId` | string | Project reference; mock only. |
| `sourceOfTruth` | enum | Must be `github` for shared coordination. |
| `mode` | enum | Must be `mock_contract_only` in this phase. |
| `modules` | object | Status of every workspace module. |
| `ctaGate` | object | Next-step CTA status and disabled reason. |
| `warnings` | array | Non-blocking warning records. |
| `blockers` | array | Blocking readiness records. |

## Module State Contract

Each module uses:

```json
{
  "status": "placeholder",
  "evidence": [],
  "missing": [],
  "canEnterBudgetDryRun": false,
  "blockedReason": "Not verified",
  "nextSafeAction": "Collect required evidence"
}
```

## Allowed Module Status Values

| Status | Meaning |
|---|---|
| `incomplete` | Required input is missing. |
| `completed` | User-facing input appears complete but is not verified. |
| `placeholder` | Mock / draft / display-only data. |
| `linked` | Connected to an upstream artifact but not verified. |
| `verified` | Evidence has passed the relevant gate. |
| `unavailable` | Module is not available in this run. |
| `blocked` | Module cannot proceed until a decision or missing artifact is resolved. |

## CTA Gate Contract

```json
{
  "label": "Run budget dry-run",
  "enabled": false,
  "disabledReason": "Plan quantity status is not verified",
  "target": "budget_engine_dry_run",
  "risk": "Dry-run must not be treated as formal quote"
}
```

## Blocker Contract

```json
{
  "id": "blocker-plan-quantity-unverified",
  "severity": "high",
  "owner": "Budget Workspace UI Agent",
  "reason": "Plan quantity facts are placeholder only",
  "blockingScope": "Budget Engine dry-run CTA",
  "safeAction": "Show placeholder state and request verified quantity source"
}
```

## Forbidden State Transitions

The model must not allow:

- `placeholder` to become `verified` without evidence
- `candidate-only` to become formal pricing
- `dry-run ready` to become formal quote
- `customer preview` to become formal Excel / PDF
- `linked` data to enter Budget Engine dry-run without verification

