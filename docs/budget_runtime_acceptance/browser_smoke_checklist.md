# Browser Smoke Checklist

Workstream: `qa/budget-runtime-acceptance`

## When Required

Use this checklist when a PR claims `WEB_RUNTIME_VERIFIED` or changes a visible browser route, page, CTA, form, panel, dashboard, or workflow surface.

## Required Evidence

- target URL / route;
- browser or viewport used;
- steps performed;
- expected result;
- observed result;
- screenshot or clear visual note when possible;
- console errors if checked;
- known limitations;
- forbidden-flow confirmation.

## Pass Criteria

A browser smoke check may pass only if the user-facing workflow can be reached and the claimed behavior is visible and coherent.

## Fail / Pending Criteria

Mark pending or fail when:

- dev server cannot start;
- page is unreachable;
- CTA is dead or misleading;
- visible state contradicts the claimed evidence level;
- runtime errors block the flow.

## Docs-only Boundary

This replacement packet does not run browser checks. It defines the checklist only. Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY`.
