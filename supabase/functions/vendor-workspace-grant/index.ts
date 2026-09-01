import {
  type CaseworkAuthorityDependencies,
  corsHeaders,
  denialState,
  denialStatus,
  disallowedOrigin,
  hasBearerAuthorization,
  jsonResponse,
  preflightResponse,
  validateClosedGet,
  validateWorkspaceGrant,
} from "../_shared/casework-authority/contracts.ts";
import { createSupabaseCaseworkAuthorityDependencies } from "../_shared/casework-authority/resolver.ts";

export const VERIFY_JWT_REQUIRED = true;

export function createVendorWorkspaceGrantHandler(
  dependencies: CaseworkAuthorityDependencies =
    createSupabaseCaseworkAuthorityDependencies(),
) {
  return async function vendorWorkspaceGrant(
    request: Request,
  ): Promise<Response> {
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, dependencies.allowedOrigins);
    const preflight = preflightResponse(
      request,
      "GET",
      dependencies.allowedOrigins,
    );
    if (preflight) return preflight;
    if (disallowedOrigin(request, dependencies.allowedOrigins)) {
      return jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    const contract = validateClosedGet(
      request,
      "/functions/v1/vendor-workspace-grant",
    );
    if (contract === "method") {
      return jsonResponse(405, { state: "INVALID_REQUEST" }, cors);
    }
    if (contract !== "ok") {
      return jsonResponse(400, { state: "INVALID_REQUEST" }, cors);
    }
    if (!hasBearerAuthorization(request)) {
      return jsonResponse(401, { state: "AUTH_REQUIRED" }, cors);
    }
    if (!dependencies.runtimeAvailable) {
      return jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    const identity = await dependencies.resolveAuthenticatedIdentity(request);
    if (!identity) return jsonResponse(401, { state: "AUTH_REQUIRED" }, cors);
    let candidate: unknown;
    try {
      candidate = await dependencies.resolveWorkspaceGrant(
        identity.userId,
        "pro",
      );
    } catch {
      return jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    const grant = validateWorkspaceGrant(candidate, "pro");
    if (!grant) {
      const state = denialState(candidate);
      return jsonResponse(denialStatus(state), { state }, cors);
    }
    return jsonResponse(200, {
      schemaVersion: "laibe.vendor-workspace-auth.v1",
      state: "AUTHORIZED_VENDOR_WORKSPACE",
      authenticatedUserId: identity.userId,
      currentCaseId: grant.caseId,
      membership: {
        userId: identity.userId,
        caseId: grant.caseId,
        role: "pro",
        status: "active",
      },
      workspaceAccess: {
        role: "pro",
        mutationAllowed: false,
        writeActionsEnabled: false,
        payloadPolicy: "AUTHORIZED_SCOPE_ONLY",
      },
    }, cors);
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createVendorWorkspaceGrantHandler());
}
