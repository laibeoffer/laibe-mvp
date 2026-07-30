type StudioRequest = {
  operation?: string;
  entryId?: string;
  versionId?: string;
  lifecycle?: string;
  domain?: string;
  limit?: number;
  note?: string;
  source?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

const operations = new Set([
  "getSessionContext",
  "listRecords",
  "getRecord",
  "createDraft",
  "updateDraft",
  "createRevision",
  "saveAndSubmitReview",
  "submitReview",
  "returnToDraft",
  "publish",
  "retire",
]);

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

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
}

const CORS_CONFIGURATION_MISSING = "CORS_CONFIGURATION_MISSING";
const ORIGIN_NOT_ALLOWED = "ORIGIN_NOT_ALLOWED";

type CorsContext = {
  configured: boolean;
  originAllowed: boolean;
  headers: HeadersInit;
};

function corsContext(request: Request): CorsContext {
  const requestOrigin = request.headers.get("origin")?.trim() ?? "";
  const allowedOrigins = (
    Deno.env.get("KNOWLEDGE_STUDIO_ALLOWED_ORIGINS") ?? ""
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const configured = allowedOrigins.length > 0;
  const originAllowed = !requestOrigin ||
    allowedOrigins.includes(requestOrigin);

  return {
    configured,
    originAllowed,
    headers: {
      ...(requestOrigin && originAllowed
        ? { "Access-Control-Allow-Origin": requestOrigin }
        : {}),
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json; charset=utf-8",
      "Vary": "Origin",
    },
  };
}

function response(
  headers: HeadersInit,
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

function studioRpc(request: StudioRequest): {
  name: string;
  payload: Record<string, unknown>;
} {
  switch (request.operation) {
    case "getSessionContext":
      return {
        name: "knowledge_studio_session_context",
        payload: {},
      };
    case "listRecords":
      return {
        name: "knowledge_studio_list",
        payload: {
          p_lifecycle: request.lifecycle ?? null,
          p_domain: request.domain ?? null,
          p_limit: Number.isFinite(request.limit)
            ? Math.max(1, Math.min(Number(request.limit), 500))
            : 100,
        },
      };
    case "getRecord":
      if (!isUuid(request.entryId)) throw new Error("INVALID_ENTRY");
      return {
        name: "knowledge_studio_get",
        payload: { p_entry_id: request.entryId },
      };
    case "createDraft":
      if (
        !request.payload ||
        request.payload.schema_version !== "knowledge_studio.v1"
      ) {
        throw new Error("INVALID_DRAFT");
      }
      return {
        name: "knowledge_studio_create_draft",
        payload: { p_payload: request.payload },
      };
    case "updateDraft":
      if (
        !isUuid(request.entryId) ||
        !isUuid(request.versionId) ||
        !request.payload ||
        request.payload.schema_version !== "knowledge_studio.v1"
      ) {
        throw new Error("INVALID_DRAFT_UPDATE");
      }
      return {
        name: "knowledge_studio_update_draft",
        payload: {
          p_entry_id: request.entryId,
          p_version_id: request.versionId,
          p_payload: request.payload,
        },
      };
    case "createRevision":
      if (!isUuid(request.entryId) || !request.source) {
        throw new Error("INVALID_REVISION");
      }
      return {
        name: "knowledge_studio_create_revision",
        payload: {
          p_entry_id: request.entryId,
          p_source: request.source,
          p_change_note: request.note ?? "",
        },
      };
    case "saveAndSubmitReview":
      if (
        !isUuid(request.entryId) ||
        !isUuid(request.versionId) ||
        !request.payload ||
        request.payload.schema_version !== "knowledge_studio.v1"
      ) {
        throw new Error("INVALID_REVIEW_SUBMISSION");
      }
      return {
        name: "knowledge_studio_save_and_submit",
        payload: {
          p_entry_id: request.entryId,
          p_version_id: request.versionId,
          p_payload: request.payload,
          p_note: request.note ?? "",
        },
      };
    case "submitReview":
      if (!isUuid(request.entryId) || !isUuid(request.versionId)) {
        throw new Error("INVALID_REVIEW");
      }
      return {
        name: "knowledge_submit_for_review",
        payload: {
          p_entry_id: request.entryId,
          p_version_id: request.versionId,
          p_note: request.note ?? "",
        },
      };
    case "returnToDraft":
      if (!isUuid(request.entryId) || !isUuid(request.versionId)) {
        throw new Error("INVALID_RETURN");
      }
      return {
        name: "knowledge_return_to_draft",
        payload: {
          p_entry_id: request.entryId,
          p_version_id: request.versionId,
          p_note: request.note ?? "",
        },
      };
    case "publish":
      if (!isUuid(request.entryId) || !isUuid(request.versionId)) {
        throw new Error("INVALID_PUBLICATION");
      }
      return {
        name: "knowledge_publish_entry_version",
        payload: {
          p_entry_id: request.entryId,
          p_version_id: request.versionId,
          p_note: request.note ?? "",
        },
      };
    case "retire":
      if (!isUuid(request.entryId)) throw new Error("INVALID_RETIREMENT");
      return {
        name: "knowledge_retire_entry",
        payload: {
          p_entry_id: request.entryId,
          p_note: request.note ?? "",
        },
      };
    default:
      throw new Error("INVALID_OPERATION");
  }
}

Deno.serve(async (request) => {
  const cors = corsContext(request);
  if (request.method === "OPTIONS") {
    if (!cors.configured) {
      console.error(CORS_CONFIGURATION_MISSING);
      return response(cors.headers, 503, {
        ok: false,
        message: "知識管理服務尚未完成來源設定。",
      });
    }
    if (!cors.originAllowed) {
      console.warn(ORIGIN_NOT_ALLOWED);
      return response(cors.headers, 403, {
        ok: false,
        message: "此來源無法使用知識管理服務。",
      });
    }
    return new Response(null, { status: 204, headers: cors.headers });
  }

  if (!cors.configured) {
    console.error(CORS_CONFIGURATION_MISSING);
    return response(cors.headers, 503, {
      ok: false,
      message: "知識管理服務尚未完成來源設定。",
    });
  }
  if (!cors.originAllowed) {
    console.warn(ORIGIN_NOT_ALLOWED);
    return response(cors.headers, 403, {
      ok: false,
      message: "此來源無法使用知識管理服務。",
    });
  }

  if (request.method !== "POST") {
    return response(cors.headers, 405, {
      ok: false,
      message: "此入口只接受指定操作。",
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return response(cors.headers, 401, {
      ok: false,
      message: "請重新登入後再試。",
    });
  }

  let body: StudioRequest;
  try {
    body = await request.json();
  } catch {
    return response(cors.headers, 400, {
      ok: false,
      message: "提交內容格式不正確。",
    });
  }

  if (!body.operation || !operations.has(body.operation)) {
    return response(cors.headers, 400, {
      ok: false,
      message: "這項操作目前不在允許範圍。",
    });
  }

  let rpc: ReturnType<typeof studioRpc>;
  try {
    rpc = studioRpc(body);
  } catch {
    return response(cors.headers, 400, {
      ok: false,
      message: "請確認知識條目、版本與操作內容。",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const projectKey = projectApiKey();
  if (!supabaseUrl || !projectKey) {
    return response(cors.headers, 503, {
      ok: false,
      message: "知識管理服務正在整理中，請稍後再試。",
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
      console.error("Knowledge Studio request rejected", {
        operation: body.operation,
        status: upstream.status,
      });
      return response(cors.headers, upstream.status === 401 ? 401 : 422, {
        ok: false,
        message: upstream.status === 401
          ? "請重新登入後再試。"
          : "目前無法完成這項知識流程操作。",
      });
    }

    return response(cors.headers, 200, {
      ok: true,
      operation: body.operation,
      data: await upstream.json(),
      formalImpact: "none",
    });
  } catch (error) {
    console.error("Knowledge Studio unavailable", {
      operation: body.operation,
      message: error instanceof Error ? error.message : "unknown",
    });
    return response(cors.headers, 503, {
      ok: false,
      message: "知識管理服務暫時無法回應，請稍後再試。",
    });
  }
});
