type IngestEnvelope = {
  schema_version?: string;
  idempotency_key?: string;
  correlation_key?: string;
  source_manifest?: {
    source_kind?: string;
    source_locator?: string;
    source_sha256?: string;
    source_record_count?: number;
    chunk_index?: number;
    chunk_count?: number;
    notes?: string;
  };
  records?: unknown[];
  budget_items?: unknown[];
  woodwork_candidates?: unknown[];
  quality_issues?: unknown[];
};

const keyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const shaPattern = /^[A-Fa-f0-9]{64}$/;
const sourceKinds = new Set([
  "obsidian",
  "budget_master",
  "a12_pdf_queue",
  "manual",
  "woodwork_mapping",
]);

const woodworkBuckets = new Set([
  "eligible_candidate_reference",
  "requires_image_or_quote_confirmation",
  "not_grade_applicable",
  "needs_manual_review",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidWoodworkCandidate(
  value: unknown,
): value is Record<string, unknown> {
  if (!isObject(value) || !isObject(value.next_use)) return false;

  return typeof value.source_record_key === "string" &&
    value.source_record_key.length > 0 &&
    typeof value.mapping_id === "string" &&
    /^A1-WD-[0-9]{5}$/.test(value.mapping_id) &&
    value.source_record_key === value.mapping_id &&
    typeof value.bucket === "string" &&
    woodworkBuckets.has(value.bucket) &&
    value.pricing_trigger_policy === "not_a_pricing_trigger" &&
    isObject(value.source_ref) &&
    isObject(value.original_item) &&
    isObject(value.candidate_evidence) &&
    isObject(value.grade_fields) &&
    typeof value.evidence_priority_used === "string" &&
    ["A", "B", "C", "D", "X"].includes(String(value.confidence_grade)) &&
    typeof value.review_state_label === "string" &&
    typeof value.review_reason === "string" &&
    Array.isArray(value.missing_info_items) &&
    typeof value.next_use.usable_for_later_matching === "boolean" &&
    typeof value.next_use.usable_for_evidence_retrieval === "boolean" &&
    value.next_use.publication_authorized === false &&
    value.next_use.candidate_creation_authorized === false &&
    value.next_use.direct_pricing_allowed === false &&
    value.next_use.auto_trigger_allowed === false &&
    value.next_use.auto_select_allowed === false &&
    typeof value.next_use.pricing_trigger_note === "string" &&
    value.next_use.pricing_trigger_note.length > 0;
}

function woodworkRecordKey(value: unknown): string | null {
  if (
    !isObject(value) ||
    typeof value.source_key !== "string" ||
    !isObject(value.raw_payload) ||
    value.raw_payload.mapping_id !== value.source_key ||
    value.source_status !== "待確認" ||
    value.is_budget_candidate !== false ||
    value.auto_trigger_allowed !== false
  ) {
    return null;
  }
  return value.source_key;
}

function isValidWoodworkIssue(
  value: unknown,
  sourceRecordKeys: Set<string>,
): boolean {
  if (
    !isObject(value) ||
    !isObject(value.evidence) ||
    typeof value.source_record_key !== "string"
  ) {
    return false;
  }
  return value.issue_code === "demolition_candidate_conflict" &&
    value.severity === "warning" &&
    value.next_reviewer_role === "pcm" &&
    value.evidence.quarantined === true &&
    value.evidence.mapping_id === value.source_record_key &&
    sourceRecordKeys.has(value.source_record_key);
}

function projectApiKey(): string | undefined {
  const direct = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (direct) return direct;

  const encodedKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (encodedKeys) {
    try {
      const keys = JSON.parse(encodedKeys) as Record<string, unknown>;
      if (typeof keys.default === "string" && keys.default) {
        return keys.default;
      }
    } catch {
      // The legacy key fallback below keeps local and existing projects usable.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? undefined;
}

function response(
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function isValidEnvelope(value: IngestEnvelope): boolean {
  const manifest = value.source_manifest;
  if (
    !Array.isArray(value.records) ||
    value.records.length > 1000 ||
    !Array.isArray(value.budget_items) ||
    value.budget_items.length > 1000 ||
    !Array.isArray(value.woodwork_candidates) ||
    value.woodwork_candidates.length > 1000 ||
    !Array.isArray(value.quality_issues) ||
    value.quality_issues.length > 500
  ) {
    return false;
  }
  const records = value.records;
  const woodworkCandidates = value.woodwork_candidates;
  const qualityIssues = value.quality_issues;
  const isWoodworkMapping = manifest?.source_kind === "woodwork_mapping";
  const woodworkRecordKeys = records.map(woodworkRecordKey);
  const validWoodworkRecordKeys = new Set(
    woodworkRecordKeys.filter((key): key is string => key !== null),
  );
  return value.schema_version === "knowledge_staging.v1" &&
    typeof value.idempotency_key === "string" &&
    keyPattern.test(value.idempotency_key) &&
    typeof value.correlation_key === "string" &&
    keyPattern.test(value.correlation_key) &&
    !!manifest &&
    typeof manifest.source_kind === "string" &&
    sourceKinds.has(manifest.source_kind) &&
    typeof manifest.source_locator === "string" &&
    manifest.source_locator.length > 0 &&
    manifest.source_locator.length <= 2048 &&
    !/[\u0000-\u001f\u007f]/.test(manifest.source_locator) &&
    typeof manifest.source_sha256 === "string" &&
    shaPattern.test(manifest.source_sha256) &&
    Number.isInteger(manifest.source_record_count) &&
    Number(manifest.source_record_count) >= 0 &&
    Number.isInteger(manifest.chunk_index) &&
    Number(manifest.chunk_index) >= 1 &&
    Number.isInteger(manifest.chunk_count) &&
    Number(manifest.chunk_count) >= Number(manifest.chunk_index) &&
    (
      isWoodworkMapping
        ? value.budget_items.length === 0 &&
          records.length === woodworkCandidates.length &&
          validWoodworkRecordKeys.size === records.length &&
          woodworkCandidates.length > 0 &&
          woodworkCandidates.every((candidate) =>
            isValidWoodworkCandidate(candidate) &&
            validWoodworkRecordKeys.has(candidate.source_record_key as string)
          ) &&
          qualityIssues.every((issue) =>
            isValidWoodworkIssue(issue, validWoodworkRecordKeys)
          )
        : woodworkCandidates.length === 0
    );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return response(405, {
      ok: false,
      message: "此入口只接受指定操作。",
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return response(401, {
      ok: false,
      message: "請重新登入後再試。",
    });
  }

  let envelope: IngestEnvelope;
  try {
    envelope = await request.json();
  } catch {
    return response(400, {
      ok: false,
      message: "匯入內容格式不正確。",
    });
  }

  if (!isValidEnvelope(envelope)) {
    return response(400, {
      ok: false,
      message: "請確認來源識別、批次編號與資料欄位。",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const projectKey = projectApiKey();
  if (!supabaseUrl || !projectKey) {
    return response(503, {
      ok: false,
      message: "知識匯入服務正在整理中，請稍後再試。",
    });
  }

  try {
    const rpcPath = envelope.source_manifest?.source_kind === "woodwork_mapping"
      ? "/rest/v1/rpc/knowledge_ingest_woodwork_batch"
      : "/rest/v1/rpc/knowledge_ingest_batch";
    const upstream = await fetch(
      `${supabaseUrl}${rpcPath}`,
      {
        method: "POST",
        headers: {
          "Authorization": authorization,
          "apikey": projectKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_envelope: envelope }),
      },
    );

    if (!upstream.ok) {
      console.error("Knowledge ingest rejected", { status: upstream.status });
      return response(upstream.status === 401 ? 401 : 422, {
        ok: false,
        message: upstream.status === 401
          ? "請重新登入後再試。"
          : "這批資料尚未通過匯入檢查。",
      });
    }

    return response(200, {
      ok: true,
      data: await upstream.json(),
      formalImpact: "none",
    });
  } catch (error) {
    console.error("Knowledge ingest unavailable", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return response(503, {
      ok: false,
      message: "知識匯入服務暫時無法回應，請稍後再試。",
    });
  }
});
