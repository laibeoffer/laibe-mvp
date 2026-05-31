# Workflow Node Input / Output Contract

## Global Contract

All nodes are placeholders.

`dry_run_only` is true for every node.

All nodes must reject:

- real webhook URL
- API key, token, secret, credential
- production endpoint
- payment request
- DB or Supabase connection
- AI API request
- formal quote output
- formal Excel or PDF output
- direct mutation of `PricingRule`
- direct mutation of `BudgetEstimateLine`

## Shared Context Windows

### Requirement Form / ProjectRequirementBrief Window

Fields:

- `project_requirement_brief_id`
- `owner_intent_id`
- `requirement_context_status`
- `budget_preference`
- `space_requirements`
- `scope_constraints`
- `review_flags`

Allowed status values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Rules:

- Only `linked` or `verified` context may reach `budget_engine_entry_picking`.
- Free text must remain context only.
- Requirement data may not directly create `PricingRule` or `BudgetEstimateLine`.
- Requirement data may not bypass `raw_candidate_review_queue` or `method_spec_review_gate`.

### Plan Puzzle SVG / Quantity Facts Window

Fields:

- `plan_id`
- `svg_artifact_id`
- `plan_quantity_facts_id`
- `quantity_context_status`
- `zone_id`
- `area_m2`
- `wall_length_m`
- `opening_count`
- `quantity_confidence`
- `reviewer_required`

Allowed status values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Rules:

- SVG is metadata context only.
- SVG may not enter Renderer.
- SVG may not enter `BudgetEstimateLine`.
- Placeholder quantity may not become production quantity.
- `quantity_context_status: verified` and `reviewer_required: false` are required before quantity facts may be considered for dry-run picking.

## Node Contracts

### 1. Manual Test Trigger

- node_id: `trigger_manual_test`
- node_name: `Manual Test Trigger`
- trigger_type: `manual_placeholder`
- input: sample package reference, optional context windows
- output: placeholder event envelope
- allowed_status: `PLACEHOLDER_READY`, `SAMPLE_PACKAGE_SELECTED`
- failure_status: `BLOCKED_MISSING_SAMPLE_PACKAGE`, `BLOCKED_FORBIDDEN_RUNTIME_PAYLOAD`
- requires_human_review: false
- dry_run_only: true
- forbidden_next_nodes: `payment_node`, `db_node`, `ai_api_node`, `formal_renderer`, `customer_notification`

### 2. Webhook Trigger Placeholder

- node_id: `trigger_webhook_placeholder`
- node_name: `Webhook Trigger Placeholder`
- trigger_type: `webhook_placeholder`
- input: future website button intent metadata only
- output: placeholder event envelope
- allowed_status: `PLACEHOLDER_READY`, `WEBHOOK_INTENT_DOCUMENTED`
- failure_status: `BLOCKED_REAL_WEBHOOK_REQUESTED`, `BLOCKED_PRODUCTION_ENDPOINT_PRESENT`
- requires_human_review: false
- dry_run_only: true
- forbidden_next_nodes: `webhook_runtime`, `api_gateway`, `payment_node`, `db_node`, `ai_api_node`, `formal_quote_output`

### 3. File Upload Trigger Placeholder

- node_id: `trigger_file_upload_placeholder`
- node_name: `File Upload Trigger Placeholder`
- trigger_type: `file_upload_placeholder`
- input: future upload intent metadata only
- output: placeholder event envelope
- allowed_status: `PLACEHOLDER_READY`, `UPLOAD_INTENT_DOCUMENTED`
- failure_status: `BLOCKED_REAL_UPLOAD_REQUESTED`, `BLOCKED_STORAGE_OR_DB_REQUESTED`
- requires_human_review: false
- dry_run_only: true
- forbidden_next_nodes: `upload_backend`, `file_storage`, `parser_runtime`, `db_node`, `supabase_node`, `formal_quote_output`

### 4. Schedule Review Trigger Placeholder

- node_id: `trigger_schedule_review_placeholder`
- node_name: `Schedule Review Trigger Placeholder`
- trigger_type: `schedule_placeholder`
- input: future review cadence metadata only
- output: placeholder event envelope
- allowed_status: `PLACEHOLDER_READY`, `SCHEDULE_INTENT_DOCUMENTED`
- failure_status: `BLOCKED_REAL_SCHEDULE_REQUESTED`, `BLOCKED_RULE_MUTATION_REQUESTED`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `cron_runtime`, `n8n_schedule_runtime`, `pricing_rule_mutation`, `method_spec_mutation`, `db_node`, `ai_api_node`

### 5. Validate Input Package

- node_id: `validate_input_package`
- node_name: `Validate Input Package`
- trigger_type: `workflow_step`
- input: placeholder event envelope, sample package manifest, context window statuses
- output: validation result, normalized dry-run package reference, rejected field list
- allowed_status: `INPUT_PACKAGE_VALID`, `INPUT_PACKAGE_REVIEW_REQUIRED`
- failure_status: `BLOCKED_MISSING_REQUIRED_CONTEXT`, `BLOCKED_FORBIDDEN_FIELD_PRESENT`, `BLOCKED_FORMAL_OUTPUT_REQUESTED`
- requires_human_review: false unless validation result is `INPUT_PACKAGE_REVIEW_REQUIRED`
- dry_run_only: true
- forbidden_next_nodes: `budget_engine_dry_run`, `pricing_rule_creation`, `budget_estimate_line_creation`, `renderer`, `payment_node`

### 6. Quote Factory Export Package

- node_id: `quote_factory_export_package`
- node_name: `Quote Factory Export Package`
- trigger_type: `workflow_step`
- input: validated dry-run package reference, Quote Factory export package reference
- output: export package metadata, candidate evidence refs, source quality flags
- allowed_status: `EXPORT_PACKAGE_LINKED`, `EXPORT_PACKAGE_REVIEW_REQUIRED`
- failure_status: `BLOCKED_MISSING_EXPORT_REF`, `BLOCKED_FORMAL_PRICE_PRESENT`, `BLOCKED_QF_SCOPE_MISMATCH`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `pricing_rule_creation`, `budget_estimate_line_creation`, `budget_engine_entry_picking_without_review`, `db_node`, `payment_node`

### 7. Raw Candidate Intake

- node_id: `raw_candidate_intake`
- node_name: `Raw Candidate Intake`
- trigger_type: `workflow_step`
- input: export package metadata, candidate evidence refs, source quality flags
- output: raw candidate intake packet, provenance map, candidate review request
- allowed_status: `RAW_CANDIDATE_INTAKE_READY`, `RAW_CANDIDATE_REVIEW_REQUIRED`
- failure_status: `BLOCKED_PROVENANCE_MISSING`, `BLOCKED_FORMAL_PRICE_PRESENT`, `BLOCKED_SOURCE_QUALITY_TOO_LOW`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `method_spec_review_gate_without_raw_review`, `pricing_rule_creation`, `budget_engine_entry_picking`, `budget_estimate_line_creation`, `renderer`

### 8. Raw Candidate Review Queue

- node_id: `raw_candidate_review_queue`
- node_name: `Raw Candidate Review Queue`
- trigger_type: `human_review_gate`
- input: raw candidate intake packet, provenance map, candidate risk flags
- output: review decision summary, approved-for-dry-run candidate refs, rejected refs, needs-more-info refs
- allowed_status: `RAW_REVIEW_APPROVED_FOR_DRY_RUN`, `RAW_REVIEW_NEEDS_MORE_INFO`, `RAW_REVIEW_REJECTED`
- failure_status: `BLOCKED_RAW_REVIEW_NOT_COMPLETED`, `BLOCKED_CANDIDATE_AUTHORITY_OVERSTATED`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `budget_engine_entry_picking_without_methodspec_review`, `pricing_rule_creation`, `formal_catalog_publish`, `formal_quote_output`, `payment_node`

### 9. MethodSpec Review Gate

- node_id: `method_spec_review_gate`
- node_name: `MethodSpec Review Gate`
- trigger_type: `human_review_gate`
- input: approved-for-dry-run candidate refs, MethodSpec link refs, scope and inclusion/exclusion flags
- output: reviewed MethodSpec selection package, unresolved scope notes
- allowed_status: `METHODSPEC_APPROVED_FOR_DRY_RUN`, `METHODSPEC_NEEDS_REVIEW`, `METHODSPEC_REJECTED`
- failure_status: `BLOCKED_METHODSPEC_REVIEW_NOT_COMPLETED`, `BLOCKED_SCOPE_RULE_MISSING`, `BLOCKED_PRICING_AUTHORITY_MISMATCH`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `budget_engine_dry_run_without_gate`, `pricing_rule_creation`, `method_spec_mutation`, `renderer`, `formal_quote_output`

### 10. Budget Engine Entry & Picking

- node_id: `budget_engine_entry_picking`
- node_name: `Budget Engine Entry & Picking`
- trigger_type: `workflow_step`
- input: reviewed MethodSpec selection package, verified/linked requirement context, verified/linked quantity facts
- output: dry-run picking plan, skipped context list, review assumptions
- allowed_status: `DRY_RUN_PICKING_READY`, `DRY_RUN_PICKING_REVIEW_REQUIRED`
- failure_status: `BLOCKED_CONTEXT_UNVERIFIED`, `BLOCKED_QUANTITY_PLACEHOLDER_ONLY`, `BLOCKED_REVIEW_GATE_MISSING`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `production_budget_engine_run`, `pricing_rule_creation`, `budget_estimate_line_creation`, `renderer`, `payment_node`

### 11. Budget Engine Dry-run

- node_id: `budget_engine_dry_run`
- node_name: `Budget Engine Dry-run`
- trigger_type: `dry_run_step`
- input: dry-run picking plan, approved-for-dry-run refs, assumptions
- output: dry-run budget trace, non-production snapshot candidate, unresolved review flags
- allowed_status: `DRY_RUN_COMPLETED`, `DRY_RUN_REVIEW_REQUIRED`
- failure_status: `BLOCKED_DRY_RUN_GUARD_FAILED`, `BLOCKED_PRODUCTION_OUTPUT_REQUESTED`, `BLOCKED_FORMAL_PRICE_REQUESTED`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `production_budget_engine_run`, `formal_budget_estimate_line`, `customer_quote_output`, `formal_excel_pdf_writer`, `payment_node`

### 12. BudgetOutputSnapshot

- node_id: `budget_output_snapshot`
- node_name: `BudgetOutputSnapshot`
- trigger_type: `snapshot_placeholder`
- input: dry-run budget trace, unresolved review flags
- output: dry-run `BudgetOutputSnapshot` reference, preview manifest, traceability summary
- allowed_status: `SNAPSHOT_DRY_RUN_READY`, `SNAPSHOT_REVIEW_REQUIRED`
- failure_status: `BLOCKED_SNAPSHOT_GUARD_FAILED`, `BLOCKED_FORMAL_ARTIFACT_REQUESTED`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `formal_renderer`, `formal_excel_pdf_writer`, `customer_notification`, `db_node`, `payment_node`

### 13. Output Documents Preview

- node_id: `output_documents_preview`
- node_name: `Output Documents Preview`
- trigger_type: `preview_placeholder`
- input: dry-run snapshot reference, preview manifest, traceability summary
- output: preview-only document summary, preview warnings, formal-output-block status
- allowed_status: `PREVIEW_ONLY_READY`, `PREVIEW_REVIEW_REQUIRED`
- failure_status: `BLOCKED_FORMAL_RENDERER_REQUESTED`, `BLOCKED_XLSX_PDF_REQUESTED`, `BLOCKED_CUSTOMER_OUTPUT_REQUESTED`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `formal_excel_writer`, `formal_pdf_writer`, `customer_notification`, `payment_node`, `production_storage`

### 14. Knowledge Vault Feedback

- node_id: `knowledge_vault_feedback`
- node_name: `Knowledge Vault Feedback`
- trigger_type: `feedback_placeholder`
- input: preview warnings, rejected candidates, unresolved assumptions, review flags
- output: feedback proposal packet, proposed knowledge updates, proposed rule review tickets
- allowed_status: `FEEDBACK_PROPOSED`, `FEEDBACK_REVIEW_REQUIRED`
- failure_status: `BLOCKED_DIRECT_RULE_MUTATION`, `BLOCKED_DB_WRITE_REQUESTED`, `BLOCKED_AI_API_REQUESTED`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `direct_pricing_rule_update`, `direct_methodspec_update`, `db_node`, `ai_api_node`, `production_automation`

### 15. Blackboard Status Update

- node_id: `blackboard_status_update`
- node_name: `Blackboard Status Update`
- trigger_type: `status_placeholder`
- input: final dry-run status, feedback proposal packet, blocked scope summary, PR/commit refs
- output: blackboard short-format update draft
- allowed_status: `BLACKBOARD_UPDATE_READY`, `BLACKBOARD_BLOCKED_UPDATE_READY`
- failure_status: `BLOCKED_STATUS_MISSING_REQUIRED_FIELDS`
- requires_human_review: true
- dry_run_only: true
- forbidden_next_nodes: `production_automation`, `customer_notification`, `payment_node`, `db_node`, `ai_api_node`, `formal_quote_output`
