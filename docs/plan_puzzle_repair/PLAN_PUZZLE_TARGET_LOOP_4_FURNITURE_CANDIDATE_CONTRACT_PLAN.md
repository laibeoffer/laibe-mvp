# Plan Puzzle Target Loop 4 Furniture Candidate Contract Plan

## Commander Decision
- owner: B_PLAN_PUZZLE_REPAIR_COMMANDER
- nextOwnerAgent: Furniture / Cabinet Builder, gated by this candidate contract.
- sourceAudit: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_3_FURNITURE_BLOCK_AUDIT.md
- sourceSvgCount: 1826
- planStudyImageCount: 7
- allowCandidateCount: 84
- directIncludeCount: 0
- canIncludeNow: false

## Boundary
- The 84 `ALLOW_CANDIDATE` SVG blocks are not approved for direct furniture package insertion.
- The 84 candidates may only enter a candidate QA contract step.
- All other 1742 SVG blocks remain quarantined.
- `PARTIAL_REVIEW_REQUIRED` blocks remain quarantined.
- No runtime code, production furniture package, Plancraft core, Budget Engine, package.json, or node_modules may be modified in this loop.

## Target Loop 4 Task
Task name: PLAN_PUZZLE_TARGET_LOOP_4_FURNITURE_CANDIDATE_TEMPLATE_CONTRACT

Required output:
1. Deduplicate the 84 candidates by visual shape and semantic category.
2. Assign candidate categories: bed, sofa / chair, table / dining, kitchen appliance, bathroom fixture.
3. Propose a neutral item template contract with:
   - candidateId
   - sourceSvgPath
   - label
   - category
   - defaultWidthMm
   - defaultDepthMm
   - defaultHeightMm, if known
   - rotationAllowed
   - resizeAllowed
   - materialTagAllowed
   - exportAsCandidateOnly
4. Run black / white render visibility review from existing contact sheets or newly generated docs-only screenshots.
5. Run plan-study overlay proof for representative candidates.
6. Mark every uncertain item as quarantine, not allow.
7. Produce a Furniture Candidate Contract report before any runtime placement repair.

## Done Definition
- Candidate count reconciled against the Loop 3 audit.
- No direct include claimed.
- Every candidate has category and quarantine / QA status.
- Formal furniture package remains untouched.
- Runtime remains untouched.
- Browser/runtime repair remains gated until the candidate contract is accepted.

## Next Automatic Task
If no new instruction arrives in 20 minutes, prepare the docs-only candidate template contract and dispatch Furniture / Cabinet Builder only after the contract is complete.
