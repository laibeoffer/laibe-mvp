const OBSIDIAN_STATUS = Object.freeze({
  收件箱: "inbox",
  待整理: "draft",
  待確認: "pending_review",
  已核准: "pending_review",
  已停用: "retired",
});

const A12_ALLOWED_ACTIONS = new Set([
  "record_pdf_evidence",
  "record_finding",
]);

const REQUIRED_PROVENANCE_FIELDS = Object.freeze([
  "relative_path",
  "file_sha256",
  "worksheet_name",
  "row_number",
]);

const ROLE_DOMAINS = Object.freeze({
  a12: ["drawing_review"],
  budget: ["budget"],
  contract: ["contract"],
  pcm: ["drawing_review", "budget", "contract"],
  admin: ["drawing_review", "budget", "contract"],
});

export function mapObsidianStatus(sourceStatus) {
  return OBSIDIAN_STATUS[String(sourceStatus || "").trim()] || "pending_review";
}

export function normalizeObsidianRecord(record = {}) {
  return {
    ...record,
    target_schema: "knowledge_staging",
    source_status: record.source_status || "",
    status: mapObsidianStatus(record.source_status),
    auto_publish: false,
    requires_human_review: true,
    imported_direction: "obsidian_to_staging",
  };
}

function missingRequiredBudgetFields(record) {
  const required = [
    ...REQUIRED_PROVENANCE_FIELDS,
    "unified_item_name",
    "classification_path",
    "unit",
  ];
  return required.filter((field) => {
    const value = record[field];
    return (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  });
}

export function normalizeBudgetSourceRecord(record = {}) {
  const missingFields = missingRequiredBudgetFields(record);
  const qualityIssues = [];
  if (missingFields.length > 0) {
    qualityIssues.push("missing_required_field");
  }
  if (
    record.conflicting_unified_item_name &&
    record.conflicting_unified_item_name !== record.unified_item_name
  ) {
    qualityIssues.push("classification_conflict");
  }

  return {
    ...record,
    target_schema: "knowledge_staging",
    status: "pending_review",
    publication_allowed: false,
    direct_pricing_allowed: false,
    candidate_budget_line_allowed: false,
    auto_select_allowed: false,
    auto_trigger_allowed: false,
    requires_manual_review: true,
    price_classification:
      record.historical_price === null ||
      record.historical_price === undefined
        ? "not_provided"
        : "historical_reference",
    provenance: {
      relative_path: record.relative_path || null,
      file_sha256: record.file_sha256 || null,
      worksheet_name: record.worksheet_name || null,
      row_number: record.row_number ?? null,
    },
    missing_fields: missingFields,
    quality_issues: qualityIssues,
    trigger_requirements: [
      "object_status:new",
      "scope_confirmed",
      "human_review",
    ],
  };
}

export function authorizeA12Action(action) {
  return A12_ALLOWED_ACTIONS.has(String(action || ""));
}

export function filterGatewayRecords(records, request = {}) {
  const domain = String(request.domain || "");
  const allowedDomains = Array.isArray(request.allowedDomains)
    ? request.allowedDomains
    : [];
  const roleDomains = ROLE_DOMAINS[String(request.actorRole || "").toLowerCase()];

  if (
    !domain ||
    !allowedDomains.includes(domain) ||
    !roleDomains ||
    !roleDomains.includes(domain)
  ) {
    throw new Error("Domain permission not allowed.");
  }

  return records.filter(
    (record) =>
      record.domain === domain &&
      record.status === "approved" &&
      record.retired_at === null &&
      Boolean(record.source_ref) &&
      Boolean(record.version) &&
      record.formalImpact === "none",
  );
}

export function canCreateBudgetCandidate(input = {}) {
  const scopeConfirmed = input.scope_confirmed ?? input.human_confirmed;
  return (
    input.source_kind === "user_created_plan_object" &&
    input.object_status === "new" &&
    input.human_confirmed === true &&
    scopeConfirmed === true
  );
}

export const KNOWLEDGE_POLICY = Object.freeze({
  obsidianDirection: "obsidian_to_staging",
  sourceApprovalPublishesAutomatically: false,
  historicalPriceSelectsAutomatically: false,
  requiredProvenanceFields: REQUIRED_PROVENANCE_FIELDS,
});
