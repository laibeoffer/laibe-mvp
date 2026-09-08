import {
  type CaseCreateInput,
  type CaseworkAuthorityDependencies,
  type CaseworkRole,
} from "./contracts.ts";
import { verifyAuthSession } from "../auth-session/verified-auth-session.ts";
import { appendApprovedSiteOrigins } from "./site-origins.ts";

type RuntimeEnvironment = { get(name: string): string | undefined };
type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type CaseworkAuthorityRuntimeOptions = Readonly<{
  env?: RuntimeEnvironment;
  fetch?: FetchLike;
  allowedOrigins?: readonly string[];
}>;

function runtimeEnvironment(options: CaseworkAuthorityRuntimeOptions) {
  return options.env ?? (typeof Deno !== "undefined" ? Deno.env : undefined);
}

function environmentValue(
  environment: RuntimeEnvironment | undefined,
  name: string,
): string | null {
  try {
    const value = environment?.get(name)?.trim();
    return value ? value : null;
  } catch {
    return null;
  }
}

function allowedOrigins(environment: RuntimeEnvironment | undefined) {
  const configuredOrigins = Object.freeze(
    (environmentValue(environment, "LAIBE_ALLOWED_ORIGINS") ?? "")
      .split(",").map((value) => value.trim()).filter((value) => {
        try {
          const url = new URL(value);
          return url.origin === value && /^https?:$/u.test(url.protocol);
        } catch {
          return false;
        }
      }),
  );
  try {
    return appendApprovedSiteOrigins(
      environment?.get("SUPABASE_URL"),
      configuredOrigins,
    );
  } catch {
    return configuredOrigins;
  }
}

export function createSupabaseCaseworkAuthorityDependencies(
  options: CaseworkAuthorityRuntimeOptions = {},
): CaseworkAuthorityDependencies {
  const environment = runtimeEnvironment(options);
  const supabaseUrl = environmentValue(environment, "SUPABASE_URL")
    ?.replace(/\/+$/u, "") ?? null;
  const serviceRoleKey = environmentValue(
    environment,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const configuredOrigins = options.allowedOrigins ??
    allowedOrigins(environment);
  const runtimeAvailable = Boolean(
    supabaseUrl && serviceRoleKey && typeof fetchImplementation === "function",
  );

  async function rpc(name: string, body: Readonly<Record<string, unknown>>) {
    if (!runtimeAvailable) return null;
    try {
      const response = await fetchImplementation(
        `${supabaseUrl}/rest/v1/rpc/${name}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey!,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  return Object.freeze({
    allowedOrigins: Object.freeze([...configuredOrigins]),
    runtimeAvailable,
    async resolveAuthenticatedIdentity(request: Request) {
      if (!runtimeAvailable) throw new Error("Auth service unavailable");
      const result = await verifyAuthSession(request, {
        supabaseUrl: supabaseUrl!,
        serviceRoleKey: serviceRoleKey!,
        fetch: fetchImplementation,
      });
      if (result.state === "unavailable") {
        throw new Error("Auth service unavailable");
      }
      return result.state === "verified" ? result.session : null;
    },
    async createCase(input: CaseCreateInput) {
      return await rpc("casework_case_create_v1", {
        p_authenticated_user_id: input.authenticatedUserId,
        p_title: input.title,
        p_idempotency_key: input.idempotencyKey,
        p_payload_sha256: input.payloadSha256,
      });
    },
    async resolveWorkspaceGrant(userId: string, role: CaseworkRole) {
      const rpcName = role === "owner"
        ? "owner_workspace_grant_v1"
        : role === "pro"
        ? "vendor_workspace_grant_v1"
        : "highest_reviewer_workspace_grant_v1";
      return await rpc(rpcName, { p_authenticated_user_id: userId });
    },
  });
}
