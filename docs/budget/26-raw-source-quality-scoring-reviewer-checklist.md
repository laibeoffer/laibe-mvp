# Raw Source Quality Scoring / Reviewer Checklist

Phase R1.5 adds a candidate-only source quality scoring layer to the Raw Candidate Warehouse.

This phase does not approve prices, publish catalog records, create formal material or labor rules, or generate budget lines. It only helps reviewers understand whether raw evidence is complete enough to move to the next review step.

## 1. Purpose

R1.5 scores the quality of raw candidate evidence after the existing pipeline has produced:

```text
RawCatalogSource
-> RawCatalogItem
-> Candidate
-> ValidationResult
-> ReviewQueueItem
-> HandoffProposal
```

The new scoring layer reads the same candidate evidence and produces `SourceQualityAssessment` records.

Each assessment remains internal review evidence only.

## 2. SourceQualityAssessment

Each assessment includes:

- `assessment_id`
- `candidate_id`
- `source_item_id`
- `source_id`
- `source_type`
- `source_reliability`
- `source_date`
- `quality_score`
- `quality_grade`
- `evidence_completeness_score`
- `traceability_score`
- `commercial_evidence_score`
- `risk_score_penalty`
- `reviewer_checklist`
- `recommended_review_status`
- `recommendation_reason`
- `formal_price_generated: false`
- `price_authority: "none"`
- `observed_price_is_evidence_only: true`

The score is not a price approval. It is only a review aid.

## 3. Quality Grade

R1.5 uses simple deterministic grades:

- `excellent`: evidence is strong and low-risk.
- `good`: evidence can move forward as candidate evidence.
- `watch`: evidence is usable but needs reviewer attention.
- `poor`: evidence is incomplete and should request more information.
- `blocked`: evidence has blocking risk, such as negative observed price.

## 4. Reviewer Checklist

The reviewer checklist currently checks:

- source identity exists.
- source date exists.
- source reliability is reviewable.
- raw item row evidence is traceable.
- suggested code exists.
- unit is present when needed.
- currency is present for price evidence.
- observed price is treated as evidence only.
- validation status can be reviewed.

Checklist statuses:

- `pass`
- `warning`
- `fail`
- `not_applicable`

## 5. Recommended Review Status

The assessment may recommend:

- `approved_as_candidate`: evidence may move to downstream review only.
- `pending`: reviewer should inspect it manually.
- `needs_more_info`: evidence is incomplete.
- `needs_merge`: possible duplicate or overlap needs merge review.
- `rejected`: blocking issue exists.

`approved_as_candidate` is not formal approval.

It does not mean:

- formal price approval.
- formal catalog publishing.
- formal material or labor rule approval.
- direct use in a budget line.
- customer-facing output.

## 6. Price Safety

R1.5 keeps all price-bearing values as observed evidence only.

Required constants remain:

```json
{
  "formal_price_generated": false,
  "price_authority": "none",
  "observed_price_is_evidence_only": true
}
```

R1.5 must not output:

- formal `PricingRule`
- formal `MaterialSpec`
- formal `LaborRule`
- formal `BudgetEstimateLine.unit_price`
- formal quote
- customer-facing document output
- catalog publishing result

## 7. Demo

Run:

```powershell
node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-source-quality-scoring.ts
```

The demo combines R1.3 multi-source fixtures and R1.4 negative/source-quality fixtures, then verifies:

- every candidate receives one source quality assessment.
- proposal contract validation remains valid.
- warehouse export safety remains valid.
- observed price safety remains valid.
- raw warehouse static guard remains valid.
- `formal_price_generated` remains `false`.
- `price_authority` remains `"none"`.

## 8. Still Forbidden

R1.5 does not:

- parse Excel files.
- import real procurement data.
- create database migrations.
- publish formal catalog records.
- approve formal prices.
- create formal material or labor rules.
- create budget estimate lines.
- create customer-facing output.
- modify floor-plan or frontend code.
- call RAG or AI APIs.
- touch payment, escrow, or listing fee logic.

## 9. Next Step

After R1.5, a later phase can decide whether source quality scores should feed a human review UI or a downstream review packet.

That later phase must still keep observed prices as evidence until a separate formal pricing approval process exists.
