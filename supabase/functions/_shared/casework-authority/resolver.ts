import {
  type CaseCreateInput,
  type CaseworkAuthorityDependencies,
  type CaseworkRole,
  isUuid,
} from "./contracts.ts";

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
  return Object.freeze(
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
}

function bearerToken(request: Request): string | null {
  return request.headers.get("authorization")?.match(/^Bearer\s+([^\s]+)$/u)
    ?.[1] ??
    null;
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
      const token = bearerToken(request);
      if (!runtimeAvailable || !token) return null;
      try {
        const response = await fetchImplementation(
          `${supabaseUrl}/auth/v1/user`,
          {
            headers: {
              authorization: `Bearer ${token}`,
              apikey: serviceRoleKey!,
            },
          },
        );
        if (!response.ok) return null;
        const candidate = await response.json();
        const userId = candidate && typeof candidate === "object" &&
            !Array.isArray(candidate)
          ? (candidate as Record<string, unknown>).id
          : null;
        return isUuid(userId) ? Object.freeze({ userId }) : null;
      } catch {
        return null;
      }
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
