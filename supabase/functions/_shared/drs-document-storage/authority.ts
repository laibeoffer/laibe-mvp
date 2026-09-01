import type {
  DrsBffGuard,
  SessionContext,
} from "../drs-auth/drs-session-bootstrap-bff.ts";
import {
  createSupabaseDrsVersionedWorkspaceGrantResolver,
  type DrsVersionedWorkspaceGrantResolver,
} from "../drs-auth/versioned-workspace-grant.ts";
import { isUuid, readOwn } from "./contracts.ts";
import type {
  DocumentAuthorityPort,
  DocumentModeAPrincipal,
  DocumentRuntimePrincipal,
} from "./ports.ts";

export interface DocumentSessionContextResolver {
  authorize(request: Request): Promise<unknown>;
}

export type DocumentAuthorityOptions = Readonly<{
  bffGuard?: DrsBffGuard;
  versionedGrantResolver?: DrsVersionedWorkspaceGrantResolver;
  sessionContextResolver?: DocumentSessionContextResolver;
}>;

const unavailableGuard: DrsBffGuard = Object.freeze({
  authorize(): Promise<never> {
    return Promise.reject(new Error("CONTEXT_UNAVAILABLE"));
  },
});

export function createDocumentAuthorityResolver(
  options: DocumentAuthorityOptions = {},
): DocumentAuthorityPort {
  const guard = options.bffGuard ?? unavailableGuard;
  const versioned = options.versionedGrantResolver ??
    createSupabaseDrsVersionedWorkspaceGrantResolver();
  const runtimeAvailable = options.sessionContextResolver !== undefined ||
    (options.bffGuard !== undefined && versioned.runtimeAvailable);

  function exactSessionContext(candidate: unknown): SessionContext | null {
    if (
      candidate === null || typeof candidate !== "object" ||
      Array.isArray(candidate) || Object.getPrototypeOf(candidate) !==
        Object.prototype
    ) return null;
    const keys = Object.keys(candidate);
    const expected = [
      "userId",
      "sessionId",
      "caseId",
      "membershipId",
      "role",
      "authorityVersion",
      "nextActor",
    ];
    if (
      keys.length !== expected.length ||
      expected.some((key) => !Object.prototype.hasOwnProperty.call(candidate, key))
    ) return null;
    const role = readOwn(candidate, "role");
    const nextActor = readOwn(candidate, "nextActor");
    const authorityVersion = readOwn(candidate, "authorityVersion");
    if (
      !isUuid(readOwn(candidate, "userId")) ||
      !isUuid(readOwn(candidate, "sessionId")) ||
      !isUuid(readOwn(candidate, "caseId")) ||
      !isUuid(readOwn(candidate, "membershipId")) ||
      !["owner", "vendor", "drs"].includes(String(role)) ||
      !["owner", "vendor", "drs"].includes(String(nextActor)) ||
      !Number.isSafeInteger(authorityVersion) ||
      (authorityVersion as number) < 1
    ) return null;
    return Object.freeze({
      userId: readOwn(candidate, "userId") as string,
      sessionId: readOwn(candidate, "sessionId") as string,
      caseId: readOwn(candidate, "caseId") as string,
      membershipId: readOwn(candidate, "membershipId") as string,
      role: role as SessionContext["role"],
      authorityVersion: authorityVersion as number,
      nextActor: nextActor as SessionContext["nextActor"],
    });
  }

  return Object.freeze({
    runtimeAvailable,
    async authorize(
      request: Request,
    ): Promise<DocumentRuntimePrincipal | null> {
      if (!runtimeAvailable) return null;
      try {
        if (options.sessionContextResolver) {
          return exactSessionContext(
            await options.sessionContextResolver.authorize(request),
          );
        }
        const guarded = await guard.authorize(request);
        const grant = await versioned.issueVersionedWorkspaceGrant({
          authenticatedUserId: guarded.authenticatedUserId,
          expectedCaseId: guarded.selectedCaseId,
          authorizationSubject: guarded.authorizationSubject,
          acceptedAuthorityExpiresAt: guarded.proofExpiresAt,
        });
        if (!grant || grant.selectedCaseId !== guarded.selectedCaseId) {
          return null;
        }
        return Object.freeze({
          authenticatedUserId: grant.authenticatedUserId,
          expectedCaseId: grant.selectedCaseId,
          authorizationSubject: grant.authorizationSubject,
          grantId: grant.grantId,
          grantVersion: grant.grantVersion,
          grantExpiresAt: grant.grantExpiresAt,
        });
      } catch {
        return null;
      }
    },
  });
}
