import {
  corsHeaders,
  jsonResponse,
  readRuntimeEnvironment,
  validateDrsWorkspaceGrantProjection,
} from "../_shared/drs-auth/contracts.ts";
import {
  createDrsBffRouteGuard,
  type DrsBffGuard,
  readDrsBffGuardFailure,
} from "../_shared/drs-auth/drs-bff-route-composition.ts";
import { createDrsSecureSessionRuntime } from "../_shared/drs-auth/drs-secure-session-runtime.ts";
export const VERIFY_JWT_REQUIRED = false;

type WorkspaceSessionDependencies = Readonly<{
  allowedOrigins: readonly string[];
  runtimeAvailable: boolean;
}>;

function defaultDependencies(): WorkspaceSessionDependencies {
  const origin = readRuntimeEnvironment(undefined, "LAIBE_DRS_APP_ORIGIN");
  try {
    const parsed = new URL(origin ?? "");
    if (parsed.protocol === "https:" && parsed.origin === origin) {
      return Object.freeze({
        allowedOrigins: Object.freeze([origin]),
        runtimeAvailable: true,
      });
    }
  } catch {
    // Missing or malformed DRS origin keeps this endpoint closed.
  }
  return Object.freeze({
    allowedOrigins: Object.freeze([]),
    runtimeAvailable: false,
  });
}

function defaultBffGuard(): DrsBffGuard {
  const secureRuntime = createDrsSecureSessionRuntime();
  return createDrsBffRouteGuard(
    "workspaceGrant",
    secureRuntime.bootstrapDependencies,
  );
}

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
  dependencies: WorkspaceSessionDependencies = defaultDependencies(),
  bffGuard: DrsBffGuard = defaultBffGuard(),
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

    // The guard freshly verifies the bound session and its current case authority.
    const grant = validateDrsWorkspaceGrantProjection({
      authorized: true,
      state: "AUTHORIZED_DRS_WORKSPACE",
      case_id: guarded.selectedCaseId,
      case_status: guarded.caseStatus,
      access_mode: guarded.accessMode,
    });
    if (!grant) {
      return jsonResponse(403, { state: "CASE_NOT_AUTHORIZED" }, cors);
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

export const handler = createDrsWorkspaceGrantHandler();

if (typeof Deno !== "undefined" && import.meta.main) Deno.serve(handler);
