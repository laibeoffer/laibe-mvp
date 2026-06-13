# Plan Puzzle Target Loop 4A No-runtime SVG Candidate Package Boundary Appendix

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 4A
- task: no-runtime SVG candidate package boundary appendix
- checkedAt: 2026-06-12 07:16 Asia/Taipei
- runtime touched: no
- source SVG folders touched: no
- production furniture package touched: no
- globalBlackboardWrite: false

## Boundary Decision

SVG furniture package runtime remains blocked. This appendix defines the metadata, preconditions, dedupe rules, and guards required before any future package integration task may be proposed. It does not copy assets, include SVGs in runtime, or authorize production package use.

## Future Candidate Metadata Contract

Any future SVG candidate package row must carry these fields before a builder may request integration scope:

| Field | Required Value / Rule |
|---|---|
| candidateId | Stable Loop 4A candidate id or reviewer-assigned package id. |
| category | One of the reviewed categories: bed, seating, table_dining, kitchen_cooktop, kitchen_sink, kitchen_refrigerator, bath_sink, bath_toilet, bath_tub. |
| sourceSvgPath | Original read-only path under `Z:\08-Jacky\svg_blocks`; no copied asset path until package task is authorized. |
| evidenceBatch | Batch evidence file proving the candidate was reviewed. |
| reviewerDecision | ACCEPT_FOR_CANDIDATE_PACKAGE_REVIEW / KEEP_QUARANTINED / REJECT / NEEDS_CROP_OVERLAY_PROOF. |
| cropOverlayEvidence | Required before runtime include; contact sheet evidence alone is not enough for source-risked or duplicate-prone rows. |
| canonicalGroup | Dedupe group such as canonical bed, compact table, refrigerator, single-basin sink. |
| packageName | Normalized English package label; no mojibake names in runtime-facing metadata. |
| displayNameZh | Human-readable Traditional Chinese label for UI. |
| defaultWidthMm | Candidate-only default size, not production quantity. |
| defaultDepthMm | Candidate-only default size, not production quantity. |
| defaultHeightMm | Optional; required only for cabinet/furniture templates that need vertical context. |
| rotationAllowed | true / false with reason. |
| materialApplicable | true / false with reason. |
| budgetCandidate | true only as draft context. |
| productionReady | false until separate production package review. |
| notFormalEstimate | true. |
| budgetEligible | false. |
| exportAsCandidateOnly | true. |
| canIncludeInRuntimePackage | false until separate package integration authorization. |

## Import Preconditions

No SVG candidate may enter runtime, package assets, or Plancraft symbols unless all of the following are true:

1. Reviewer / Commander explicitly accepts the candidate row from `PLAN_PUZZLE_TARGET_LOOP_4A_REVIEWER_GATE_PACKET.md`.
2. Candidate has crop-overlay or side-by-side evidence against a specific plan-study region.
3. Candidate is deduped against all same-category variants.
4. Candidate has normalized metadata and no mojibake display label.
5. Candidate remains candidate-only with `productionReady=false`, `budgetEligible=false`, and `notFormalEstimate=true`.
6. A separate package integration task is authorized with explicit changed-file scope.
7. Data Guard confirms no Budget Engine, PricingRule, BudgetEstimateLine, formalEstimateGuard, Plancraft core, DB, payment, AI API, or production export path is touched.

## Dedupe Rules

| Rule | Required Handling |
|---|---|
| Same shape, same category | Keep one canonical row; quarantine duplicates. |
| Same category, different scale or use case | Keep at most one alternate if plan-study evidence proves a distinct use. |
| Unknown-source A$C / mojibake file | Require crop-overlay proof and normalized label before package review. |
| Annotation-heavy symbol | Quarantine unless labels/dimensions can be removed in a separate authorized asset cleanup task. |
| Whole-room or whole-counter composition | Quarantine unless the future task is explicitly for room-group symbols, not furniture package. |
| Faint or low-scale render | Require high-resolution render proof before acceptance. |
| Category-name-only match | Reject or quarantine; never approve by filename alone. |

## Guard Requirements

| Guard | Required State |
|---|---|
| SVG runtime include | false |
| direct include count | 0 |
| copied SVG count | 0 |
| Plancraft core touched | false |
| Budget Engine touched | false |
| formalEstimateGuard changed | false |
| formal quote / Excel / PDF | false |
| DB / payment / AI API | false |
| package.json / node_modules | false |
| global blackboard write | false |

## Candidate-only Export Boundary

If future runtime integration is approved, exported JSON must keep SVG furniture package objects under candidate-only fields and must not map them into formal estimate input:

```json
{
  "source": "plan-puzzle-svg-candidate-package",
  "budgetCandidate": true,
  "productionReady": false,
  "notFormalEstimate": true,
  "budgetEligible": false,
  "exportAsCandidateOnly": true
}
```

## Reviewer / Commander Decision Needed

The next decision is not a merge decision and not a production approval. It is only:

1. Which of the 20 allow-after-QA rows may proceed to candidate package review.
2. Which rows must stay quarantined.
3. Which rows are rejected outright.
4. Which rows need additional crop-overlay proof.
5. Whether a separate SVG package integration task should be authorized later.

## Decision

LOOP_4A_NO_RUNTIME_PACKAGE_BOUNDARY_APPENDIX_READY

This appendix completes the no-runtime package boundary for Loop 4A. Runtime inclusion remains blocked.

## Next Automatic Task

If no new packet arrives in 20 minutes, prepare a Loop 4A final closeout / decision tracker that lists pending reviewer decisions, blocked runtime paths, and safe next work without copying assets or touching runtime.
