import {
  type DrsSpecialistAuthorityFacts,
  type FetchLike,
  isUuid,
  parseAllowedOrigins,
  readOwnValue,
  readRuntimeEnvironment,
  type RuntimeEnvironment,
  validateDrsAuthorityFacts,
} from "./contracts.ts";

export type DrsAuthorityPort = {
  resolveAuthority(
    input: Readonly<{
      authenticatedUserId: string;
      expectedCaseId: string | null;
      expectedAuthorizationSubject: string | null;
    }>,
  ): Promise<unknown>;
};

export type DrsSpecialistAuthorizationStrategy = {
  resolveAuthorization(
    input: Readonly<{
      authenticatedUserId: string;
      accountRole: "drs";
      pending:
        | Readonly<{
          currentCaseId: string;
          authorizationSubject: string;
        }>
        | null;
    }>,
  ): Promise<DrsSpecialistAuthorityFacts | null>;
};

export type DrsWorkspaceGrantPort = {
  resolveWorkspaceGrant(
    input: Readonly<{
      authenticatedUserId: string;
      expectedCaseId: string | null;
      expectedAuthorizationSubject: string | null;
    }>,
  ): Promise<unknown>;
};

export type DrsWorkspaceGrantDependencies = DrsWorkspaceGrantPort & {
  runtimeAvailable: boolean;
  allowedOrigins: readonly string[];
  resolveAuthenticatedIdentity(
    request: Request,
  ): Promise<{ userId: string } | null>;
};

export type SupabaseDrsAuthorityOptions = {
  env?: RuntimeEnvironment;
  fetch?: FetchLike;
  allowedOrigins?: readonly string[];
};

export function createDrsSpecialistAuthorizationStrategy(
  port: DrsAuthorityPort | null,
): DrsSpecialistAuthorizationStrategy {
  return {
    async resolveAuthorization(input) {
      if (
        !port || input.accountRole !== "drs" ||
        !isUuid(input.authenticatedUserId)
      ) return null;
      const expectedCaseId = input.pending?.currentCaseId ?? null;
      const expectedAuthorizationSubject =
        input.pending?.authorizationSubject ?? null;
      if (expectedCaseId !== null && !isUuid(expectedCaseId)) return null;
      if (
        expectedAuthorizationSubject !== null &&
        (expectedAuthorizationSubject.length === 0 ||
          expectedAuthorizationSubject.length > 512)
      ) return null;
      try {
        const candidate = await port.resolveAuthority({
          authenticatedUserId: input.authenticatedUserId,
          expectedCaseId,
          expectedAuthorizationSubject,
        });
        return validateDrsAuthorityFacts(candidate, {
          authenticatedUserId: input.authenticatedUserId,
          selectedCaseId: expectedCaseId,
          authorizationSubject: expectedAuthorizationSubject,
          requireLocked: true,
        });
      } catch {
        return null;
      }
    },
  };
}

function bearerToken(request: Request): string | null {
  try {
    return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/iu)?.[1]
      ?.trim() || null;
  } catch {
    return null;
  }
}

export function createSupabaseDrsWorkspaceGrantDependencies(
  options: SupabaseDrsAuthorityOptions = {},
): DrsWorkspaceGrantDependencies {
  const supabaseUrl = readRuntimeEnvironment(options.env, "SUPABASE_URL")
    ?.replace(/\/+$/u, "");
  const serviceRoleKey = readRuntimeEnvironment(
    options.env,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const allowedOrigins = options.allowedOrigins ?? parseAllowedOrigins(
    readRuntimeEnvironment(options.env, "LAIBE_ALLOWED_ORIGINS"),
  );
  const runtimeAvailable = Boolean(
    supabaseUrl && serviceRoleKey && typeof fetchImplementation === "function",
  );

  return {
    runtimeAvailable,
    allowedOrigins,
    async resolveAuthenticatedIdentity(request) {
      const token = bearerToken(request);
      if (!runtimeAvailable || !token) return null;
      try {
        const response = await fetchImplementation!(
          `${supabaseUrl}/auth/v1/user`,
          {
            headers: {
              "authorization": `Bearer ${token}`,
              "apikey": serviceRoleKey!,
            },
          },
        );
        if (!response.ok) return null;
        const payload = await response.json();
        const userId = readOwnValue(payload, "id");
        return isUuid(userId) ? { userId } : null;
      } catch {
        return null;
      }
    },
    async resolveWorkspaceGrant(input) {
      if (!runtimeAvailable) return null;
      try {
        const response = await fetchImplementation!(
          `${supabaseUrl}/rest/v1/rpc/drs_workspace_grant_v1`,
          {
            method: "POST",
            headers: {
              "authorization": `Bearer ${serviceRoleKey}`,
              "apikey": serviceRoleKey!,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              p_authenticated_user_id: input.authenticatedUserId,
              p_expected_case_id: input.expectedCaseId,
              p_authorization_subject: input.expectedAuthorizationSubject,
            }),
          },
        );
        return response.ok ? await response.json() : null;
      } catch {
        return null;
      }
    },
  };
}
