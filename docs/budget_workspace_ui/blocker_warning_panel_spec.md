# Blocker And Warning Panel Spec

## Purpose

The blocker and warning panel makes unsafe or incomplete states visible before any budget dry-run action.

## Severity Levels

- `info`
- `warning`
- `high`
- `blocked`

## Required Fields

```json
{
  "id": "blocker-engine-entry-unavailable",
  "severity": "blocked",
  "owner": "budget/engine-entry-picking",
  "reason": "Budget Engine entry is unavailable",
  "blockingScope": "Budget dry-run CTA",
  "safeAction": "Show disabled CTA and wait for engine entry decision"
}
```

## Required Warning Categories

- missing requirement
- missing file
- placeholder file
- unverified quantity
- Quote Factory acceptance pending
- Raw Candidate candidate-only
- MethodSpec blocked by engine entry
- dry-run unavailable
- output preview not formal
- formal Excel/PDF not available

## CTA Interaction

The CTA area must display the highest-severity blocker reason.

If multiple blockers exist, show:

- one primary disabled reason
- expandable full blocker list

## Forbidden Behavior

Warnings must not be hidden behind hover-only UI. Blocking reasons must be visible near the disabled CTA.

