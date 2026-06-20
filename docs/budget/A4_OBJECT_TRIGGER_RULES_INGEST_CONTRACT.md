# A4 Object Trigger Rules Ingest Contract

Source sheet: `03_object_trigger_rules`

Rows reviewed: 12.

## 1. Required Columns

- `trigger_key`
- `trigger_name`
- `object_type`
- `action_type`
- `space_type`
- `condition`
- `default_bundle_id`
- `priority`
- `auto_trigger_allowed`
- `requires_manual_review`
- `notes`

## 2. Contract Semantics

`trigger_key` is the primary trigger id. A trigger maps object/action/space context to a default candidate bundle. It does not create a final budget line by itself.

Required trigger behavior:

- Match Plan Puzzle or project context by `object_type`, `action_type`, and `space_type`.
- Produce a candidate `trigger_key`.
- Join to `default_bundle_id`.
- Carry `requires_manual_review` into downstream candidate state.

## 3. Allowed Use

- Generate candidate trigger events.
- Select the default bundle for candidate expansion.
- Support examples such as `TRG_NEW_TV_WALL`, `TRG_BATHROOM_WORK`, and demolition triggers.

## 4. Forbidden Use

- Do not infer final quantity.
- Do not infer final price.
- Do not bypass bundle, dependency, quantity-rule, or human-review gates.
- Do not treat `auto_trigger_allowed = 1` as formal output permission.

## 5. Failure State

If no trigger is found, output no candidate line or emit a review-needed trigger gap. Do not invent a trigger with AI.
