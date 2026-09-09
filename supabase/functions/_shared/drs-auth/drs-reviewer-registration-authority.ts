import { readBoundedRpcJson } from "./auth-bound-session.ts";
import {
  readRuntimeEnvironment,
  type RuntimeEnvironment,
} from "./contracts.ts";

type Options = Readonly<
  { env?: RuntimeEnvironment; fetch?: typeof globalThis.fetch }
>;
const PATH = "/functions/v1/drs-reviewer-registration-authority";

export function createDrsReviewerRegistrationAuthorityHandler(
  options: Options = {},
) {
  const origin = readRuntimeEnvironment(options.env, "LAIBE_DRS_APP_ORIGIN");
  const project = readRuntimeEnvironment(options.env, "SUPABASE_URL");
  const key = readRuntimeEnvironment(options.env, "SUPABASE_SERVICE_ROLE_KEY");
  const routingKey = readPublishableKey(options.env);
  const fetcher = options.fetch ?? globalThis.fetch;
  return async (request: Request): Promise<Response> => {
    const headers: Record<string, string> = {
      vary: "Origin",
      "cache-control": "no-store",
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
    };
    const reply = (status: number, body: unknown) =>
      Response.json(body, { status, headers });
    if (!httpsOrigin(origin)) {
      return reply(503, { state: "CONTEXT_UNAVAILABLE" });
    }
    if (request.headers.get("origin") !== origin) {
      return reply(403, { state: "CONTEXT_UNAVAILABLE" });
    }
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-methods"] = "GET, OPTIONS";
    headers["access-control-allow-headers"] = "apikey,content-type";
    const url = new URL(request.url);
    if (
      url.pathname !== PATH || request.url.includes("?") || url.hash ||
      request.body
    ) {
      return reply(400, { state: "INVALID_REQUEST" });
    }
    if (request.method === "OPTIONS") {
      const allowed =
        (request.headers.get("access-control-request-headers") ?? "")
          .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
          .every((name) => ["apikey", "content-type"].includes(name));
      return request.headers.get("access-control-request-method") === "GET" &&
          allowed
        ? new Response(null, { status: 204, headers })
        : reply(403, { state: "CONTEXT_UNAVAILABLE" });
    }
    if (request.method !== "GET") {
      return reply(400, { state: "INVALID_REQUEST" });
    }
    if (
      !httpsOrigin(project) || !key || key.length < 32 || !routingKey ||
      typeof fetcher !== "function"
    ) {
      return reply(503, { state: "CONTEXT_UNAVAILABLE" });
    }
    if (request.headers.get("apikey") !== routingKey) {
      return reply(403, { state: "CONTEXT_UNAVAILABLE" });
    }
    try {
      const response = await fetcher(
        new URL("/rest/v1/rpc/drs_reviewer_registration_authority_v1", project),
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
          headers: {
            apikey: key,
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: "{}",
        },
      );
      const raw = await readBoundedRpcJson(response);
      if (
        raw === null || typeof raw !== "object" || Array.isArray(raw) ||
        Reflect.ownKeys(raw).length !== 1 ||
        !Object.hasOwn(raw, "configured") ||
        typeof (raw as Record<string, unknown>).configured !== "boolean"
      ) {
        return reply(503, { state: "CONTEXT_UNAVAILABLE" });
      }
      const configured = (raw as { configured: boolean }).configured;
      return reply(200, {
        schemaVersion: "laibe.drs-reviewer-registration-authority.v1",
        state: configured
          ? "REGISTRATION_AUTHORITY_CONFIGURED"
          : "REGISTRATION_AUTHORITY_UNCONFIGURED",
        reviewAuthority: {
          status: configured ? "configured" : "unconfigured",
          label: "萊比註冊審核窗口",
          scope: "reviewer_registration",
        },
      });
    } catch {
      return reply(503, { state: "CONTEXT_UNAVAILABLE" });
    }
  };
}

function readPublishableKey(explicit?: RuntimeEnvironment): string | undefined {
  try {
    const env = explicit ??
      (typeof Deno !== "undefined" ? Deno.env : undefined);
    const named = env?.get("SUPABASE_PUBLISHABLE_KEYS");
    let value: unknown;
    if (named !== undefined) {
      const parsed: unknown = JSON.parse(named);
      if (
        parsed === null || typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        !Object.hasOwn(parsed, "default")
      ) return undefined;
      value = (parsed as Record<string, unknown>).default;
    } else {
      value = env?.get("SUPABASE_PUBLISHABLE_KEY");
    }
    return typeof value === "string" &&
        /^sb_publishable_[A-Za-z0-9_-]{16,256}$/.test(value)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

function httpsOrigin(value: string | undefined): value is string {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && url.origin === value;
  } catch {
    return false;
  }
}
