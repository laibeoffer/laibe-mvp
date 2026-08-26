import {
  corsHeaders,
  jsonResponse,
  readDenialState,
  validateDrsWorkspaceGrantProjection,
} from "../_shared/drs-auth/contracts.ts";
import {
  createDrsBffRouteGuard,
  type DrsBffGuard,
  readDrsBffGuardFailure,
} from "../_shared/drs-auth/drs-bff-route-composition.ts";
import {
  createSupabaseDrsWorkspaceGrantDependencies,
  type DrsWorkspaceGrantDependencies,
} from "../_shared/drs-auth/drs-specialist-authority.ts";

export const VERIFY_JWT_REQUIRED = false;

function hasDisallowedOrigin(
  origin: string | null,
  allowedOrigins: readonly string[],
): boolean {
  return origin !== null && !allowedOrigins.includes(origin);
}

const ALLOWED_PREFLIGHT_HEADERS = new Set([
  "authorization",
  "content-type",
  "apikey",
]);

function isAllowedPreflight(
  request: Request,
  origin: string | null,
  allowedOrigins: readonly string[],
): boolean {
  if (!origin || !allowedOrigins.includes(origin)) return false;
  const requestedMethod = request.headers.get(
    "access-control-request-method",
  );
  if (requestedMethod?.trim().toUpperCase() !== "POST") return false;
  const rawHeaders = request.headers.get("access-control-request-headers");
  if (rawHeaders === null || rawHeaders.trim() === "") return true;
  const requestedHeaders = rawHeaders.split(",").map((value) =>
    value.trim().toLowerCase()
  );
  return requestedHeaders.every((value) =>
    value.length > 0 && ALLOWED_PREFLIGHT_HEADERS.has(value)
  );
}

export function createDrsWorkspaceGrantHandler(
  dependencies: DrsWorkspaceGrantDependencies =
    createSupabaseDrsWorkspaceGrantDependencies(),
  bffGuard: DrsBffGuard = createDrsBffRouteGuard("workspaceGrant"),
) {
  return async function drsWorkspaceGrant(request: Request): Promise<Response> {
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, dependencies.allowedOrigins);

    if (request.method === "OPTIONS") {
      if (!isAllowedPreflight(request, origin, dependencies.allowedOrigins)) {
        return jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" }, cors);
      }
      return new Response(null, { status: 204, headers: cors });
    }
    if (hasDisallowedOrigin(origin, dependencies.allowedOrigins)) {
      return jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    let guarded;
    try {
      guarded = await bffGuard.authorize(request);
    } catch (error) {
      const failure = readDrsBffGuardFailure(error);
      return jsonResponse(failure.status, { state: failure.state }, cors);
    }
    if (!dependencies.runtimeAvailable) {
      return jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }

    let candidate: unknown;
    try {
      candidate = await dependencies.resolveWorkspaceGrant({
        authenticatedUserId: guarded.authenticatedUserId,
        expectedCaseId: guarded.selectedCaseId,
        expectedAuthorizationSubject: guarded.authorizationSubject,
      });
    } catch {
      return jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    if (candidate === null || candidate === undefined) {
      return jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }

    const denialState = readDenialState(candidate);
    if (denialState === "CONTEXT_UNAVAILABLE") {
      return jsonResponse(503, { state: denialState }, cors);
    }
    const grant = validateDrsWorkspaceGrantProjection(candidate);
    if (!grant || grant.selectedCaseId !== guarded.selectedCaseId) {
      return jsonResponse(403, { state: denialState }, cors);
    }

    return jsonResponse(200, {
      schemaVersion: "laibe.drs-workspace-auth.v1",
      state: "AUTHORIZED_DRS_WORKSPACE",
      case: { id: grant.selectedCaseId, status: "ACTIVE" },
      workspaceAccess: {
        accountRole: "drs",
        mode: "read_only",
        mutationAllowed: false,
        writeActionsEnabled: false,
      },
      next: {
        actor: "drs_specialist",
        action: "REVIEW_AUTHORIZED_CASE_RECORDS",
      },
    }, cors);
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsWorkspaceGrantHandler());
}
