# USER_IT_LIMITS.md

## User Technical Context

- The user is not an IT engineer.
- The user should not be forced to judge framework choices, route internals, dependency details, build tooling, or low-level implementation details.
- The user is responsible for product direction and final decisions.
- Codex is responsible for technical execution, file safety, and clear operational summaries.

## Communication Rules

- State the file path being edited.
- State what changed in plain language.
- Keep technical explanation short unless the user asks for detail.
- Do not dump long command output.
- Do not ask the user to inspect code-level details unless a product decision is needed.
- Offer the next best action in 1-2 items.

## Execution Rules

- Prefer direct edits after understanding the user's intent.
- If a task is ambiguous but low-risk, make the conservative product-aligned choice.
- If a task could affect architecture, payments, secrets, production, data, or many files, stop and ask.
- Do not repeatedly debug already-confirmed issues.
- Do not restart full-site scans unless explicitly requested.

## Boundaries

- Do not ask the user to decide npm/build/framework problems if Codex can determine them locally.
- Do not expose secrets or ask the user to paste secrets.
- Do not turn mock flows into real backend, upload, AI API, payment, escrow, or webhook logic.
- Keep the user's product language and visual taste as the source of truth.
