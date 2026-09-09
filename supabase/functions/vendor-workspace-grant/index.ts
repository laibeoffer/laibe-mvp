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
import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";

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
    let identity;
    try {
      identity = await dependencies.resolveAuthenticatedIdentity(request);
    } catch {
      return jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
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

export function createVendorWorkspaceGrantRuntimeHandler(
  dependencies?: CaseworkAuthorityDependencies,
) {
  const handler = createVendorWorkspaceGrantHandler(dependencies);
  const applicationHeaders = [
    "authorization",
    "apikey",
    "origin",
    "content-type",
    "content-length",
    "access-control-request-method",
    "access-control-request-headers",
  ];
  const reservedAuthorityHeaders = new Set([
    "x-user-id",
    "x-authenticated-user-id",
    "x-account-role",
    "x-role",
    "x-case-id",
    "x-selected-case",
    "x-calendar-id",
    "x-arbitrary-authority",
  ]);
  return withEdgeRequestBoundary(
    "vendor-workspace-grant",
    (request) => {
      for (const name of request.headers.keys()) {
        if (
          name.startsWith("x-laibe-") || reservedAuthorityHeaders.has(name)
        ) return handler(request);
      }
      // The business handler receives application inputs, never gateway metadata.
      const headers = new Headers();
      for (const name of applicationHeaders) {
        const value = request.headers.get(name);
        if (value !== null) headers.set(name, value);
      }
      return handler(new Request(request, { headers }));
    },
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createVendorWorkspaceGrantRuntimeHandler());
}
