# Source Trace Contract

The source trace contract records the original source references behind budget candidate data.

## Record Shape

```json
{
  "source_trace_id": "src_trace_20260601_0001",
  "source_type": "manual_note",
  "source_name": "example input note",
  "source_uri": null,
  "source_row_ref": null,
  "captured_by_agent": "Budget Audit Trail Agent",
  "workstream": "budget/audit-trail",
  "captured_at": "2026-06-01T00:00:00+08:00",
  "confidence": "docs_only",
  "limitations": ["sample only", "not production evidence"],
  "risk_flags": []
}
```

## Required Fields

- `source_trace_id`
- `source_type`
- `source_name`
- `source_uri`
- `source_row_ref`
- `captured_by_agent`
- `workstream`
- `captured_at`
- `confidence`
- `limitations`
- `risk_flags`

## Rules

- Do not store secrets, private credentials, API keys, personal images, or payment data.
- If a source contains private or unclear data, mark it `blocked` and require a separate privacy review.
- Source trace is not a formal pricing source unless a future authorized PricingRule flow explicitly references and validates it.
