import type { DrsBffGuard } from "../drs-auth/drs-session-bootstrap-bff.ts";
import {
  createSupabaseDrsVersionedWorkspaceGrantResolver,
  type DrsVersionedWorkspaceGrantResolver,
} from "../drs-auth/versioned-workspace-grant.ts";
import type { DocumentAuthorityPort, DocumentModeAPrincipal } from "./ports.ts";

export type DocumentAuthorityOptions = Readonly<{
  bffGuard?: DrsBffGuard;
  versionedGrantResolver?: DrsVersionedWorkspaceGrantResolver;
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
  const runtimeAvailable = options.bffGuard !== undefined &&
    versioned.runtimeAvailable;
  return Object.freeze({
    runtimeAvailable,
    async authorize(request: Request): Promise<DocumentModeAPrincipal | null> {
      if (!runtimeAvailable) return null;
      try {
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
