import {
  DrsIdentityError,
  type DrsWorkspaceGrantProjection,
  isUuid,
  readDenialState,
  readOwnValue,
  validateDrsWorkspaceGrantProjection,
} from "./contracts.ts";

export type VerifiedDrsSessionIdentity = Readonly<{
  authenticatedUserId: string;
}>;

export interface DrsWorkspaceGrantPort {
  resolveWorkspaceGrant(
    input: Readonly<{
      authenticatedUserId: string;
      expectedCaseId: string | null;
      expectedAuthorizationSubject: string | null;
    }>,
  ): Promise<unknown>;
}

export interface DrsSpecialistAuthorizationStrategy {
  resolveSession(
    identity: VerifiedDrsSessionIdentity,
  ): Promise<DrsWorkspaceGrantProjection>;
  authorizeServerSelectedCase(
    input: Readonly<{
      identity: VerifiedDrsSessionIdentity;
      serverSelectedCaseId: string;
      expectedAuthorizationSubject?: string | null;
    }>,
  ): Promise<DrsWorkspaceGrantProjection>;
}

function authenticatedUserId(identity: VerifiedDrsSessionIdentity): string {
  const value = readOwnValue(identity, "authenticatedUserId");
  if (!isUuid(value)) throw new DrsIdentityError("AUTH_REQUIRED", 401);
  return value;
}

function denial(candidate: unknown): never {
  const state = readDenialState(candidate);
  if (state === "CONTEXT_UNAVAILABLE") {
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
  throw new DrsIdentityError(state);
}

async function resolve(
  port: DrsWorkspaceGrantPort,
  identity: VerifiedDrsSessionIdentity,
  expectedCaseId: string | null,
  expectedAuthorizationSubject: string | null,
): Promise<DrsWorkspaceGrantProjection> {
  const userId = authenticatedUserId(identity);
  if (expectedCaseId !== null && !isUuid(expectedCaseId)) {
    throw new DrsIdentityError("CASE_NOT_AUTHORIZED");
  }
  if (
    expectedAuthorizationSubject !== null &&
    (expectedAuthorizationSubject.length === 0 ||
      expectedAuthorizationSubject.length > 512)
  ) throw new DrsIdentityError("IDENTITY_MISMATCH");

  let candidate: unknown;
  try {
    candidate = await port.resolveWorkspaceGrant({
      authenticatedUserId: userId,
      expectedCaseId,
      expectedAuthorizationSubject,
    });
  } catch {
    throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
  }
  const projection = validateDrsWorkspaceGrantProjection(candidate);
  if (!projection) denial(candidate);
  if (
    expectedCaseId !== null && projection.selectedCaseId !== expectedCaseId
  ) throw new DrsIdentityError("CASE_NOT_AUTHORIZED");
  return projection;
}

export function createDrsSpecialistAuthorizationStrategy(
  port: DrsWorkspaceGrantPort | null,
): DrsSpecialistAuthorizationStrategy {
  return {
    async resolveSession(identity) {
      if (!port) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      return await resolve(port, identity, null, null);
    },
    async authorizeServerSelectedCase(input) {
      if (!port) throw new DrsIdentityError("CONTEXT_UNAVAILABLE", 503);
      return await resolve(
        port,
        input.identity,
        input.serverSelectedCaseId,
        input.expectedAuthorizationSubject ?? null,
      );
    },
  };
}
