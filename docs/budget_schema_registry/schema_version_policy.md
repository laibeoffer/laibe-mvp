# Schema Version Policy

Status: `ACTIVE_INITIALIZATION`

This policy is documentation-only. It does not create runtime validators or migrations.

## Version Format

Use semantic-looking docs versions:

```text
MAJOR.MINOR.PATCH-docs
```

Example:

```text
0.1.0-docs
```

## Version Meaning

| Segment | Meaning |
|---|---|
| `MAJOR` | Breaking field semantics or removing a field. |
| `MINOR` | Adding optional fields, examples, compatibility notes, or new safe mapping. |
| `PATCH` | Clarifying wording, warnings, examples, or typo fixes. |
| `-docs` | Indicates this is documentation-only and not runtime schema authority. |

## Initial Registry Version

The first schema registry version is:

```text
0.1.0-docs
```

## Compatibility Rule

A receiver must treat unknown optional fields as non-authoritative until a new compatibility matrix confirms the owner and receiving workstream.

A sender must not remove fields used for provenance without a MAJOR version change and integration review.

## Status Upgrade Rule

Changing `contract_status` from `placeholder` to `linked` or `verified` is not a schema version change by itself. It is an evidence-state change and must be supported by the owning workstream's report.

`verified` never means formal price, formal quote, production database record, renderer authority, or integration harness acceptance unless a separate authorized runtime process says so.

## Runtime Boundary

These registry versions do not replace TypeScript types, database migrations, JSON Schema validators, or budget engine contracts.

If a future task converts these docs into runtime schemas, it must be separately dispatched, reviewed for ownership, and forbidden from silently publishing pricing or estimate authority.
