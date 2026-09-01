import {
  type CaseworkAuthorityDependencies,
  corsHeaders,
  denialState,
  denialStatus,
  disallowedOrigin,
  hasBearerAuthorization,
  jsonResponse,
  preflightResponse,
  readCaseCreateRequest,
  sha256CaseCreateRequest,
  validateCaseCreateResult,
} from "../_shared/casework-authority/contracts.ts";
import { createSupabaseCaseworkAuthorityDependencies } from "../_shared/casework-authority/resolver.ts";

export const VERIFY_JWT_REQUIRED = true;

export function createCaseworkCaseCreateHandler(
  dependencies: CaseworkAuthorityDependencies =
    createSupabaseCaseworkAuthorityDependencies(),
) {
  return async function caseworkCaseCreate(
    request: Request,
  ): Promise<Response> {
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, dependencies.allowedOrigins);
    const preflight = preflightResponse(
      request,
      "POST",
      dependencies.allowedOrigins,
    );
    if (preflight) return preflight;
    if (disallowedOrigin(request, dependencies.allowedOrigins)) {
      return jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { state: "INVALID_REQUEST" }, cors);
    }
    const input = await readCaseCreateRequest(request);
    if (!input) return jsonResponse(400, { state: "INVALID_REQUEST" }, cors);
    if (!hasBearerAuthorization(request)) {
      return jsonResponse(401, { state: "AUTH_REQUIRED" }, cors);
    }
    if (!dependencies.runtimeAvailable) {
      return jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    const identity = await dependencies.resolveAuthenticatedIdentity(request);
    if (!identity) return jsonResponse(401, { state: "AUTH_REQUIRED" }, cors);
    const payloadSha256 = await sha256CaseCreateRequest(input);
    let candidate: unknown;
    try {
      candidate = await dependencies.createCase({
        authenticatedUserId: identity.userId,
        title: input.title,
        idempotencyKey: input.idempotencyKey,
        payloadSha256,
      });
    } catch {
      return jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors);
    }
    const result = validateCaseCreateResult(candidate);
    if (!result) {
      const state = denialState(candidate);
      return jsonResponse(denialStatus(state), { state }, cors);
    }
    return jsonResponse(result.created ? 201 : 200, {
      schemaVersion: "laibe.casework-case-create.response.v1",
      state: result.created ? "CASE_CREATED" : "CASE_CREATE_REPLAYED",
      case: { id: result.caseId, status: "ACTIVE" },
      membership: { role: "owner", status: "active" },
      receipt: { eventId: result.eventId },
      next: { actor: "owner", action: "COMPLETE_CASE_REQUIREMENTS" },
    }, cors);
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createCaseworkCaseCreateHandler());
}
