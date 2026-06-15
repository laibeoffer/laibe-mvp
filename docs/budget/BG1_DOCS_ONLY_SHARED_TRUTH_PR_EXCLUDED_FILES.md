# BG1 Docs-Only Shared Truth PR Excluded Files

Updated: `2026-06-14`

Status: `EXCLUDED_FILES_READY_NO_EXECUTION`

## 1. Exclusion Rule

This PR request excludes anything that could imply runtime implementation, production execution, formal output, or sensitive integration.

## 2. Excluded Paths / Patterns

| Path / Pattern | Reason |
|---|---|
| `src/**` | Runtime/source modification forbidden. |
| `src/lib/budget/budget-generator.ts` | Missing and must not be created in this flow. |
| `src/lib/budget/adapters/preview-floor-plan-adapter.ts` | Adapter patch forbidden. |
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/**` | Plan Puzzle runtime forbidden. |
| `plan-puzzle.js` | Plan Puzzle runtime forbidden. |
| `code.html` | Plan Puzzle runtime forbidden. |
| renderer runtime files | Renderer production integration forbidden. |
| test/build config | Tests/build/dev server forbidden. |
| generated Excel / PDF | Formal output forbidden. |
| binary outputs | Not part of docs-only shared truth. |
| DB / Supabase / API / AI / RAG / payment / LINE / n8n files | Sensitive integration forbidden. |

## 3. Exclusion Result

`DOCS_ONLY_SHARED_TRUTH_PR_EXCLUDED_FILES_READY_NO_EXECUTION`

