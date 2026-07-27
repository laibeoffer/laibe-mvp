const allowedOperations = new Set([
  "searchKnowledge",
  "getKnowledgeEntry",
  "getCaseEvidence",
  "recordFinding",
]);

const allowedDomains = new Set(["drawing_review", "budget", "contract"]);

type RequestBody = {
  operation?: string;
  domain?: string;
  query?: string;
  limit?: number;
  entryId?: string;
  caseId?: string;
  schemaVersion?: string;
  formalImpact?: string;
  record?: Record<string, unknown>;
};

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

function corsHeaders(request: Request): HeadersInit {
  const requestOrigin = request.headers.get("origin") ?? "";
  const allowedOrigins =
    (Deno.env.get("KNOWLEDGE_GATEWAY_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  const origin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] ?? "";

  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function respond(
  request: Request,
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request),
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
}

function rpcFor(body: RequestBody): {
  name: string;
  payload: Record<string, unknown>;
} {
  switch (body.operation) {
    case "searchKnowledge": {
      if (!body.domain || !allowedDomains.has(body.domain)) {
        throw new Error("INVALID_DOMAIN");
      }
      const limit = Number.isFinite(body.limit)
        ? Math.max(1, Math.min(Number(body.limit), 100))
        : 20;
      return {
        name: "gateway_search_knowledge",
        payload: {
          p_domain: body.domain,
          p_query: typeof body.query === "string" ? body.query : null,
          p_limit: limit,
        },
      };
    }
    case "getKnowledgeEntry":
      if (!isUuid(body.entryId)) {
        throw new Error("INVALID_ENTRY");
      }
      return {
        name: "gateway_get_knowledge_entry",
        payload: { p_entry_id: body.entryId },
      };
    case "getCaseEvidence":
      if (!isUuid(body.caseId)) {
        throw new Error("INVALID_CASE");
      }
      return {
        name: "gateway_get_case_evidence",
        payload: { p_case_id: body.caseId },
      };
    case "recordFinding": {
      if (!isUuid(body.caseId) || !body.record) {
        throw new Error("INVALID_FINDING");
      }
      const schemaVersion = body.record.schema_version ?? body.schemaVersion;
      const formalImpact = body.record.formalImpact ?? body.formalImpact;
      if (
        schemaVersion !== "a12.drawing_review_queue.v1" ||
        formalImpact !== "none"
      ) {
        throw new Error("INVALID_FINDING_CONTRACT");
      }
      return {
        name: "gateway_record_finding",
        payload: {
          p_case_id: body.caseId,
          p_payload: {
            ...body.record,
            schema_version: schemaVersion,
            formalImpact,
          },
        },
      };
    }
    default:
      throw new Error("INVALID_OPERATION");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return respond(request, 405, {
      ok: false,
      message: "此入口只接受指定操作。",
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return respond(request, 401, {
      ok: false,
      message: "請重新登入後再試。",
    });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return respond(request, 400, {
      ok: false,
      message: "提交內容格式不正確。",
    });
  }

  if (!body.operation || !allowedOperations.has(body.operation)) {
    return respond(request, 400, {
      ok: false,
      message: "這項操作目前不在允許範圍。",
    });
  }

  let rpc: ReturnType<typeof rpcFor>;
  try {
    rpc = rpcFor(body);
  } catch {
    return respond(request, 400, {
      ok: false,
      message: "請確認案件、文件與查詢條件後再試。",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const projectKey = projectApiKey();
  if (!supabaseUrl || !projectKey) {
    return respond(request, 503, {
      ok: false,
      message: "知識服務正在整理中，請稍後再試。",
    });
  }

  try {
    const upstream = await fetch(
      `${supabaseUrl}/rest/v1/rpc/${rpc.name}`,
      {
        method: "POST",
        headers: {
          "Authorization": authorization,
          "apikey": projectKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rpc.payload),
      },
    );

    if (!upstream.ok) {
      console.error("Knowledge Gateway request failed", {
        operation: body.operation,
        status: upstream.status,
      });
      return respond(request, upstream.status === 401 ? 401 : 422, {
        ok: false,
        message: upstream.status === 401
          ? "請重新登入後再試。"
          : "目前無法完成這項整理，請確認權限與資料狀態。",
      });
    }

    const data = await upstream.json();
    return respond(request, 200, {
      ok: true,
      operation: body.operation,
      data,
      formalImpact: "none",
    });
  } catch (error) {
    console.error("Knowledge Gateway unavailable", {
      operation: body.operation,
      message: error instanceof Error ? error.message : "unknown",
    });
    return respond(request, 503, {
      ok: false,
      message: "知識服務暫時無法回應，請稍後再試。",
    });
  }
});
