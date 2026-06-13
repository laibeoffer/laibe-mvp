# Plancraft+ 0.12 PR Merge Order Recommendation

Date: 2026-06-13 Asia/Taipei

Scope: Plan Puzzle / Plancraft+ 0.12+ PR lineage and merge-order recommendation for future budget shared truth. This is a recommendation only. No PR was merged by this intake.

## 1. Recommendation Summary

Commander merge now: Not recommended.

Reason:

- The Plan Puzzle stack has multiple open draft PRs and chained bases.
- PR #54 is the clean 0.12 UI IA handoff baseline, but later PRs change the same runtime files.
- No formal versioned Plan Puzzle draft JSON schema was found.
- Current budget adapter remains candidate-only with formal estimate guard blocked.
- Furniture / layout objects are still candidate-only and not production budget input.

## 2. Proposed Merge / Disposition Order

| Order | PR | Recommendation | Reason |
|---:|---:|---|---|
| 1 | #54 | Accept as 0.12 UI IA baseline reference. Merge only if Reviewer confirms it is still useful as a historical baseline. | It is the explicit `0.12.0-ui-ia-alignment` handoff. It is not a production budget schema. |
| 2 | #56 | Rebase or supersede after #54 disposition. | It productizes status area and is a base for #67. |
| 3 | #67 | Rebase on whichever #54/#56 baseline is accepted. | It is the 0.15.1 compact workspace base for later PRs. |
| 4 | #69 | Prefer over #68 if one-screen drawing workbench is accepted as active UI head. | It is the likely active 0.16 workbench path and base for #76. |
| 5 | #76 | Review after #69 because it wires canvas tools and affects candidate export behavior. | This is the most relevant PR in the original chain for draft JSON and human-operable tooling. |
| 6 | #98 | Treat as A1 integration package, not a direct replacement until #54/#56/#67/#69/#76 disposition is recorded. | It touches route files and may include integration consolidation. |
| 7 | #100 | Review only after #98 and A2 package decisions. | It touches `code.html` and `plan-puzzle.js`, and may represent a newer integration candidate. |

## 3. PRs Needing Rebase

Likely rebase / retarget candidates:

- #67: currently based on #56 branch.
- #68: currently based on #67 branch; likely conflicts or overlaps with #69.
- #69: currently based on #67 branch.
- #76: currently based on #69 branch.
- #100: currently based on #98 branch.

Rebase should not happen before Commander / Reviewer chooses whether the PR chain should be preserved or superseded by A1 integration packages.

## 4. PRs Needing Reviewer

Reviewer required:

- #25: older zone / area / boundary refinement; decide whether it is superseded or still contains unique adapter-relevant work.
- #54: confirm baseline-only status.
- #69: functional acceptance for one-screen drawing workbench.
- #76: candidate schema and runtime tool wiring review.
- #98 / #100: integration package review and conflict disposition.

Reviewer optional / separate track:

- #50: Plan Puzzle Guide mock. It should be reviewed as demand-context mock, not budget shared truth.

## 5. PRs To Close, Archive, Or Supersede

Close / supersede candidates:

- #25: likely superseded by later Plan Puzzle chain for preview floor plan files. Do not close until Reviewer confirms no unique zone / area boundary value remains.
- #68: likely superseded by #69 if one-screen workbench is selected as active UI head.

Archive / baseline-only:

- #54 may become baseline archive if later chain or #100 is selected as consolidated active head.

Keep open for review:

- #76 until canvas tool wiring and draft JSON candidate export evidence are reviewed.
- #98 / #100 until A1/A2 integration decision resolves whether they supersede the earlier chain.

## 6. Budget Stitching Blockers

| Blocker | Blocks | Does Not Block |
|---|---|---|
| No formal Plan Puzzle draft JSON schema | Production adapter, formal quantity facts, formal estimate generation. | Candidate contract documentation and candidate adapter tests. |
| Open draft PR chain unresolved | Selecting GitHub shared runtime head. | Candidate-only interface design. |
| Furniture / layout objects candidate-only | Production cabinet / furniture quantity facts. | Preserving layout object context with warnings. |
| #50 guide facts are mock context | Budget reliance on PlanPuzzleQuantityFacts. | Demand-context review packet. |
| Missing local budget stitching gate docs requested by user | Production stitching gate acceptance. | Creating this intake and candidate contract. |

## 7. Should Commander Merge?

Current recommendation: No.

Commander should not merge any Plan Puzzle 0.12+ PR until:

1. Reviewer confirms active head and superseded PRs.
2. Candidate draft JSON contract is accepted.
3. #68 versus #69 disposition is recorded.
4. #76 / #100 schema-impacting behavior is reviewed.
5. Budget owner accepts candidate-only boundary.

## 8. Recommended Immediate Action

Immediate action:

- Accept `docs/budget/PLAN_PUZZLE_TO_BUDGET_INTERFACE_CANDIDATE_CONTRACT.md` as temporary budget-facing shared truth.
- Assign Reviewer to confirm whether #76 or #100 is the active runtime head for Plan Puzzle candidate export.
- Keep all production budget paths blocked until the reviewed schema is accepted.

## 9. Merge Order Decision State

Decision: `NO_MERGE_RECOMMENDED_YET`

Budget stitching state: `CANDIDATE_CONTRACT_ONLY`

Commander needed: Yes, for PR chain disposition and merge authorization.

Reviewer needed: Yes, for candidate schema and active head confirmation.
