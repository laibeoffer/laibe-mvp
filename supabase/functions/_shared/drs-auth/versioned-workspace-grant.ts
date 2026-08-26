import {
  type FetchLike,
  isUuid,
  readOwnValue,
  readRuntimeEnvironment,
  type RuntimeEnvironment,
} from "./contracts.ts";

const MAX_GRANT_TTL_MS = 15 * 60 * 1000;
const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;
const DECIMAL_BIGINT_PATTERN = /^[1-9]\d{0,18}$/u;
const DRS_SPECIALIST_SUBJECT_PREFIX = "drs-specialist:";
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;
const EXACT_WIRE_KEYS = Object.freeze(
  [
    "authorized",
    "state",
    "authenticated_user_id",
    "case_id",
    "authorization_subject",
    "grant_id",
    "grant_version",
    "grant_expires_at",
  ] as const,
);

export type DrsVersionedWorkspaceGrant = Readonly<{
  authenticatedUserId: string;
  selectedCaseId: string;
  authorizationSubject: string;
  grantId: string;
  grantVersion: string;
  grantExpiresAt: string;
}>;

export type DrsVersionedGrantExpectation = Readonly<{
  authenticatedUserId: string;
  expectedCaseId: string;
  authorizationSubject: string;
  acceptedAuthorityExpiresAt: string;
  nowMs?: number;
}>;

export type SupabaseDrsVersionedGrantOptions = Readonly<{
  env?: RuntimeEnvironment;
  fetch?: FetchLike;
}>;

export type DrsVersionedWorkspaceGrantResolver = Readonly<{
  runtimeAvailable: boolean;
  issueVersionedWorkspaceGrant(
    input: DrsVersionedGrantExpectation,
  ): Promise<DrsVersionedWorkspaceGrant | null>;
}>;

function hasExactOwnKeys(input: unknown): boolean {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  try {
    const keys = Object.keys(input);
    return keys.length === EXACT_WIRE_KEYS.length &&
      EXACT_WIRE_KEYS.every((key) => keys.includes(key));
  } catch {
    return false;
  }
}

function isCanonicalPostgresBigint(value: unknown): value is string {
  if (typeof value !== "string" || !DECIMAL_BIGINT_PATTERN.test(value)) {
    return false;
  }
  try {
    return BigInt(value) <= MAX_POSTGRES_BIGINT;
  } catch {
    return false;
  }
}

function isDrsSpecialistSubject(
  authorizationSubject: unknown,
): authorizationSubject is string {
  return typeof authorizationSubject === "string" &&
    authorizationSubject.startsWith(DRS_SPECIALIST_SUBJECT_PREFIX) &&
    isUuid(
      authorizationSubject.slice(DRS_SPECIALIST_SUBJECT_PREFIX.length),
    );
}

function timestamp(value: unknown): number | null {
  if (typeof value !== "string" || !RFC3339_PATTERN.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateDrsVersionedWorkspaceGrant(
  input: unknown,
  expectation: DrsVersionedGrantExpectation,
): DrsVersionedWorkspaceGrant | null {
  try {
    if (
      !hasExactOwnKeys(input) ||
      readOwnValue(input, "authorized") !== true ||
      readOwnValue(input, "state") !==
        "AUTHORIZED_DRS_VERSIONED_WORKSPACE"
    ) return null;

    const authenticatedUserId = readOwnValue(
      input,
      "authenticated_user_id",
    );
    const selectedCaseId = readOwnValue(input, "case_id");
    const authorizationSubject = readOwnValue(
      input,
      "authorization_subject",
    );
    const grantId = readOwnValue(input, "grant_id");
    const grantVersion = readOwnValue(input, "grant_version");
    const grantExpiresAt = readOwnValue(input, "grant_expires_at");
    const nowMs = expectation.nowMs ?? Date.now();
    const expiresAtMs = timestamp(grantExpiresAt);
    const authorityExpiresAtMs = timestamp(
      expectation.acceptedAuthorityExpiresAt,
    );

    if (
      !isUuid(authenticatedUserId) ||
      authenticatedUserId !== expectation.authenticatedUserId ||
      !isUuid(selectedCaseId) ||
      selectedCaseId !== expectation.expectedCaseId ||
      authorizationSubject !== expectation.authorizationSubject ||
      !isDrsSpecialistSubject(authorizationSubject) ||
      !isUuid(grantId) ||
      !isCanonicalPostgresBigint(grantVersion) ||
      typeof grantExpiresAt !== "string" ||
      !Number.isFinite(nowMs) ||
      expiresAtMs === null || authorityExpiresAtMs === null ||
      expiresAtMs <= nowMs ||
      expiresAtMs > nowMs + MAX_GRANT_TTL_MS ||
      expiresAtMs > authorityExpiresAtMs
    ) return null;

    return Object.freeze({
      authenticatedUserId,
      selectedCaseId,
      authorizationSubject,
      grantId,
      grantVersion,
      grantExpiresAt,
    });
  } catch {
    return null;
  }
}

export function createSupabaseDrsVersionedWorkspaceGrantResolver(
  options: SupabaseDrsVersionedGrantOptions = {},
): DrsVersionedWorkspaceGrantResolver {
  const supabaseUrl = readRuntimeEnvironment(options.env, "SUPABASE_URL")
    ?.replace(/\/+$/u, "");
  const serviceRoleKey = readRuntimeEnvironment(
    options.env,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const runtimeAvailable = Boolean(
    supabaseUrl && serviceRoleKey && typeof fetchImplementation === "function",
  );

  return Object.freeze({
    runtimeAvailable,
    async issueVersionedWorkspaceGrant(input) {
      if (
        !runtimeAvailable ||
        !isUuid(input.authenticatedUserId) ||
        !isUuid(input.expectedCaseId) ||
        !isDrsSpecialistSubject(input.authorizationSubject) ||
        timestamp(input.acceptedAuthorityExpiresAt) === null
      ) return null;

      try {
        const response = await fetchImplementation!(
          `${supabaseUrl}/rest/v1/rpc/drs_workspace_grant_v2`,
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
              p_authorization_subject: input.authorizationSubject,
            }),
          },
        );
        if (!response.ok) return null;
        return validateDrsVersionedWorkspaceGrant(
          await response.json(),
          input,
        );
      } catch {
        return null;
      }
    },
  });
}
