import {
  corsHeaders,
  DrsIdentityError,
  jsonResponse,
  readExactEmptyJsonBody,
} from "../_shared/drs-auth/contracts.ts";
import type {
  DrsSpecialistAuthorizationStrategy,
  VerifiedDrsSessionIdentity,
} from "../_shared/drs-auth/specialist-authorization.ts";

export const VERIFY_JWT_REQUIRED = true;

export interface DrsSessionGrantDependencies {
  allowedOrigins: readonly string[];
  runtimeAvailable: boolean;
  resolveAuthenticatedIdentity(
    request: Request,
  ): Promise<VerifiedDrsSessionIdentity | null>;
  authorization: DrsSpecialistAuthorizationStrategy;
}

const ALLOWED_PREFLIGHT_HEADERS = new Set([
  "authorization",
  "content-type",
  "apikey",
]);

function allowedPreflight(
  request: Request,
  origin: string | null,
  allowedOrigins: readonly string[],
): boolean {
  if (!origin || !allowedOrigins.includes(origin)) return false;
  if (
    request.headers.get("access-control-request-method")?.trim()
      .toUpperCase() !==
      "POST"
  ) return false;
  const raw = request.headers.get("access-control-request-headers");
  if (raw === null || raw.trim() === "") return true;
  return raw.split(",").map((value) => value.trim().toLowerCase()).every(
    (value) => value.length > 0 && ALLOWED_PREFLIGHT_HEADERS.has(value),
  );
}

function statusFor(error: unknown): number {
  return error instanceof DrsIdentityError ? error.status : 503;
}

function stateFor(error: unknown): string {
  return error instanceof DrsIdentityError ? error.code : "CONTEXT_UNAVAILABLE";
}

export function createDrsSessionGrantHandler(
  dependencies?: DrsSessionGrantDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const origin = request.headers.get("origin");
    const allowedOrigins = dependencies?.allowedOrigins ?? [];
    const cors = corsHeaders(origin, allowedOrigins);
    if (request.method === "OPTIONS") {
      if (!allowedPreflight(request, origin, allowedOrigins)) {
        return jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" }, cors);
      }
      return new Response(null, { status: 204, headers: cors });
    }
    if (origin !== null && !allowedOrigins.includes(origin)) {
      return jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { state: "INVALID_REQUEST" }, cors);
    }
    if (
      new URL(request.url).search.length !== 0 ||
      !(await readExactEmptyJsonBody(request))
    ) return jsonResponse(400, { state: "INVALID_REQUEST" }, cors);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer\s+[^\s]+$/u.test(authorization)) {
      return jsonResponse(401, { state: "AUTH_REQUIRED" }, cors);
    }
    if (!dependencies?.runtimeAvailable) {
      return jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    const identity = await dependencies.resolveAuthenticatedIdentity(request);
    if (!identity) return jsonResponse(401, { state: "AUTH_REQUIRED" }, cors);
    try {
      const grant = await dependencies.authorization.resolveSession(identity);
      return jsonResponse(200, {
        schemaVersion: "laibe.drs-workspace-auth.v1",
        state: "AUTHORIZED_DRS_WORKSPACE",
        case: { id: grant.selectedCaseId, status: grant.caseStatus },
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
    } catch (error) {
      return jsonResponse(
        statusFor(error),
        { state: stateFor(error) },
        cors,
      );
    }
  };
}

export const handler = createDrsSessionGrantHandler();

if (import.meta.main) Deno.serve(handler);
