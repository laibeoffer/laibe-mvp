# Plan Puzzle Docs Inclusion Manifest

## 1. Purpose

Classify `docs/plan_puzzle_repair/**` for future PR-scope review.

This manifest does not stage, delete, move, clean, or authorize PR. It only classifies local evidence.

## 2. Summary

| Class | Count | PR Suitability | Reason |
|---|---:|---|---|
| `.md` | 40 | REVIEW_FOR_INCLUDE | primary repair evidence / decision packets |
| `.csv` | 1 | REVIEW_FOR_INCLUDE | compact tabular audit evidence |
| `.json` | 3 | REVIEW_FOR_INCLUDE_IF_SMALL_AND_RELEVANT | structured local evidence; must be reviewed individually |
| `.html` | 43 | LOCAL_ONLY_BY_DEFAULT | generated/contact-sheet evidence, not primary PR docs unless explicitly needed |
| `.png` | 43 | LOCAL_ONLY_BY_DEFAULT | large visual evidence; retain locally unless reviewer requests selected images |
| `.jpg` | 2 | LOCAL_ONLY_BY_DEFAULT | large visual evidence; retain locally unless reviewer requests selected images |

## 3. Required Include Candidates

| Path | Include Decision | Reason |
|---|---|---|
| `docs/plan_puzzle_repair/PLAN_PUZZLE_WORKTREE_HEALTH_REPORT_SUPERSEDED_20260612.md` | INCLUDE_CANDIDATE | supersedes stale health report |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_DOCS_INCLUSION_MANIFEST.md` | INCLUDE_CANDIDATE | defines docs PR scope |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_8_FINAL_HANDOFF_REVIEWER_PACKET.md` | INCLUDE_CANDIDATE | final handoff evidence |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_8_CLOSEOUT_PR_SCOPE_PACKET.md` | INCLUDE_CANDIDATE | PR scope recommendation evidence |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_HUMAN_USABLE_GOAL_SMOKE.md` | INCLUDE_CANDIDATE | broad human-operability smoke evidence |
| `docs/plan_puzzle_repair/PLAN_PUZZLE_REPAIR_BLACKBOARD.md` | INCLUDE_CANDIDATE_WITH_REVIEW | active repair blackboard; include only if stale queue entries are acceptable or trimmed later |

## 4. Local-Only By Default

| Path Pattern | Include Decision | Reason |
|---|---|---|
| `docs/plan_puzzle_repair/furniture_block_audit_work/*.png` | LOCAL_ONLY_BY_DEFAULT | large generated visual evidence |
| `docs/plan_puzzle_repair/furniture_block_audit_work/*.html` | LOCAL_ONLY_BY_DEFAULT | generated contact-sheet / inspection pages |
| `docs/plan_puzzle_repair/test_assets/*.jpg` | LOCAL_ONLY_BY_DEFAULT | large visual source/test asset |
| `docs/plan_puzzle_repair/test_assets/*.png` | LOCAL_ONLY_BY_DEFAULT | large visual source/test asset |

## 5. Current File Type Inventory

| Extension | Count |
|---|---:|
| `.html` | 43 |
| `.png` | 43 |
| `.md` | 40 |
| `.json` | 3 |
| `.jpg` | 2 |
| `.csv` | 1 |

## 6. Large File Evidence

Largest local-only visual evidence includes:

| Path | Size | Decision |
|---|---:|---|
| `docs/plan_puzzle_repair/furniture_block_audit_work/svg_all_page_01.png` | 977835 | LOCAL_ONLY_BY_DEFAULT |
| `docs/plan_puzzle_repair/test_assets/svg_relevant_candidate_gallery.jpg` | 971640 | LOCAL_ONLY_BY_DEFAULT |
| `docs/plan_puzzle_repair/furniture_block_audit_work/svg_unknown_page_05.png` | 768939 | LOCAL_ONLY_BY_DEFAULT |
| `docs/plan_puzzle_repair/furniture_block_audit_work/svg_all_page_06.png` | 761977 | LOCAL_ONLY_BY_DEFAULT |
| `docs/plan_puzzle_repair/furniture_block_audit_work/svg_unknown_page_06.png` | 737622 | LOCAL_ONLY_BY_DEFAULT |

## 7. PR Scope Rule

Future PR-scope review should start with:

- the two runtime files under `preview_floor_plan/`;
- selected markdown evidence listed as `INCLUDE_CANDIDATE`;
- no bulk inclusion of generated `.html`, `.png`, `.jpg` evidence unless a reviewer explicitly requests specific files.

## 8. Forbidden Scope Check

- files deleted: No
- files moved: No
- git add / stage: No
- push / merge / PR: No
- reset / clean: No
- runtime files modified by this manifest: No

## 9. Result

`PLAN_PUZZLE_DOCS_INCLUSION_MANIFEST_READY_FOR_A2_REVIEW`
