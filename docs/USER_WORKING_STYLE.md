# USER_WORKING_STYLE.md

## Working Style

- The user prefers small, direct implementation steps.
- Do not turn normal work into repeated QA/report cycles.
- Do not create many new MD files unless the user explicitly asks.
- Keep final responses short and operational.
- The user will make product decisions; Codex should execute the approved direction.
- If something is uncertain and risky, ask briefly before changing files.
- The user does not want every Codex task to trigger broad reviewer redesign. Reviewer feedback should stay narrow: scope, safety, file changes, and compliance.

## Visual Preference

- Strong preference for black base, cement texture, brushed metal, glass, precise lines, and premium technology feel.
- Avoid low-quality SaaS templates, colorful AI gradients, beige/cafe palette, neon cyberpunk, toy-like 3D visuals, and generic decoration.
- Pages should have breathing room and section rhythm similar to n8n: one section, one job.
- Functional visuals must be immediately readable; do not rely on text labels alone.
- The user values tactile, product-like UI over abstract marketing pages.

## Copy Preference

- Keep copy sharp, direct, and not verbose.
- Do not write LaiBE as a normal matching platform.
- Do not over-explain technical implementation to the user.
- Avoid inflated promises. LaiBE should sound mature, honest, and system-oriented.

## Workflow Preference

- Work on one page or one component at a time unless the user approves a batch.
- Do not modify unrelated files.
- Do not run build/test/QA unless requested or necessary to verify a requested edit.
- When reporting results, include changed file, preview URL, basic status, and next sensible page.

## UI Logic Preferences

The user cares strongly about whether UI controls are placed in the correct product layer.

The user dislikes when Codex follows instructions literally but places controls in illogical locations.

Important distinctions:

### Global navigation

Belongs in the header.

Examples:
- Tools dropdown
- Workflow
- About LaiBE
- PCM backend

### Workflow navigation

Belongs in progress bars, breadcrumbs, or workflow strips.

Examples:
- Requirement setup
- Floor plan
- Budget generation
- Tender
- Award dashboard

Workflow nodes should navigate between stages.
They should not become tool buttons.

### Page-level actions

Belong outside the canvas or workspace.

Examples:
- Back
- Next
- Continue
- Go to budget generation
- Return to previous page

These actions control page flow, not the canvas itself.

### Canvas / workspace tools

Belong inside or directly above the canvas workspace.

Examples:
- Upload floor plan
- Add space
- Select
- Drag
- Zoom
- Pan
- Grid
- Dimension tools

Canvas tools should not include global navigation or page-flow navigation.

### CTA hierarchy

Primary CTA should match the current user stage.

Examples:
- Requirement page: start AI guide, go to floor plan
- Floor plan page: proceed to budget generation
- Quote check page: upload quote, view quote health result
- Tender page: prepare tender information
- Award dashboard: compare vendors, select candidates

Do not mix unrelated actions in the same toolbar.

### User expectation

The user expects Codex to self-correct obvious UI logic mistakes before reporting completion.

If Codex places a button in the wrong product layer, Codex should fix it first rather than handing the mistake back to the user for review.
