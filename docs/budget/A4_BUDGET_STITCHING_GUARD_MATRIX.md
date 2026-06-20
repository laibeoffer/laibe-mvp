# A4 Budget Stitching Guard Matrix

This matrix records guards for no-runtime master-index ingest contract review.

| Guard | Rule | Status in this task |
|---|---|---|
| Runtime | No runtime unless explicitly authorized | Closed |
| Harness | No harness unless Issue #89 is cleared and authorization names scope | Closed |
| Tests/build/dev server | Not allowed in this task | Closed |
| `src/**` edit | Not allowed in this task | Closed |
| `budget-generator.ts` | Must not be created | Closed |
| `generateBudgetEstimate` | Must not be created | Closed |
| `BudgetEstimateBlockedError` | Must not be created | Closed |
| Formal estimate | Not allowed | Closed |
| Production quantity | Not allowed | Closed |
| Excel/PDF/formal renderer | Not allowed | Closed |
| PR #100 production adapter | Not allowed | Closed |
| PR #100 formal budget schema | Not allowed | Closed |
| UI/SVG/renderer preview/`.pc`/screenshot as quantity source | Forbidden | Closed |
| Generated output as raw source | Forbidden | Closed |
| Reject rows as price candidates | Forbidden | Closed |
| Public work mapping as primary key | Forbidden | Closed |
| Zero/negative price as formal price | Forbidden | Closed |
| Human review before final budget | Required | Open only as documented gate, not runtime |

## 1. Data Quality Guards

- `zero_price_review` and `negative_price_review` must be review-only.
- `requires_manual_review = 1` must force review status.
- Public work mapping remains `division_only` or `unknown` metadata.
- Reject rows remain excluded evidence.

## 2. Boundary Guards

- Budget stitching docs may advance contract clarity.
- Budget stitching docs do not authorize runtime implementation.
- Local evidence maps do not become shared truth without A1/user review.
