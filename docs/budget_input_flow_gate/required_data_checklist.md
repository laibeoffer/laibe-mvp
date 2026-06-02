# Required Data Checklist

Workstream: `budget/input-flow-gate`

## Requirement Data

Required before Plan Puzzle:

- project type or renovation scope;
- property / space type;
- room or area list;
- user goals and must-have constraints;
- rough location or context if needed for later service logic;
- known exclusions or unavailable data;
- owner confirmation that the requirement form is complete enough for next-step planning.

## Plan / Quantity Data

Required before Budget Preview:

- plan puzzle exists or plan context is explicitly unavailable;
- quantity context status is `verified` for dry-run preview;
- placeholder quantity facts are marked as review-required;
- SVG or drawing facts are trace references only, not production quantity authority.

## File Intake Data

Required or explicitly marked unavailable:

- current-state drawings / floor plans;
- current-state photos;
- style references if user has them;
- quote files if user wants quote comparison.

## Data That Must Not Directly Become `BudgetEstimateLine`

- free-text requirement notes;
- uploaded files;
- OCR text;
- Quote Factory `PriceRange` or `display_unit_price`;
- Plan Puzzle placeholder quantities;
- AI/RAG explanations;
- raw candidate observations.
