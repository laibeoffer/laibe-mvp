import {
  type CaseworkAuthorityDependencies,
  classifyClosedGet,
  type ClosedGetReason,
  corsHeaders,
  denialState,
  denialStatus,
  disallowedOrigin,
  hasBearerAuthorization,
  jsonResponse,
  observeWorkspaceStage,
  preflightResponse,
  validateWorkspaceGrant,
  type WorkspaceObservationOutcome,
  type WorkspaceObservationStage,
  workspaceObservationStart,
  type WorkspaceStageObserver,
} from "../_shared/casework-authority/contracts.ts";
import { createSupabaseCaseworkAuthorityDependencies } from "../_shared/casework-authority/resolver.ts";
import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";

export const VERIFY_JWT_REQUIRED = true;

const STAGES = ["gate", "auth", "session", "workspace", "shape"] as const;
const OUTCOMES: readonly WorkspaceObservationOutcome[] = [
  "PASS",
  "DENIED",
  "UNAVAILABLE",
  "HTTP_ERROR",
  "TRANSPORT_ERROR",
  "INVALID_JSON",
  "INVALID_SHAPE",
];

function requestObservation() {
  const entries = new Map<WorkspaceObservationStage, string>();
  let gateReason: ClosedGetReason | undefined;
  const observer: WorkspaceStageObserver = (
    stage,
    outcome,
    status,
    duration,
  ) => {
    if (
      !STAGES.includes(stage) || !OUTCOMES.includes(outcome) ||
      entries.has(stage)
    ) return;
    const safeStatus =
      Number.isInteger(status) && status >= 100 && status <= 599 ? status : 0;
    const safeDuration = Number.isFinite(duration)
      ? Math.min(60_000, Math.max(0, Math.floor(duration)))
      : 0;
    entries.set(stage, `${outcome},${safeStatus},${safeDuration}`);
  };
  return {
    observer,
    setGateReason(reason: ClosedGetReason): void {
      gateReason = reason;
    },
    finish(response: Response): Response {
      try {
        if (gateReason !== undefined) {
          response.headers.set("x-laibe-workspace-gate-reason", gateReason);
        }
        response.headers.set(
          "x-laibe-workspace-stages",
          "v1;" + STAGES.map(
            (stage) => `${stage}=${entries.get(stage) ?? "NOT_REACHED,0,0"}`,
          ).join(";"),
        );
      } catch {
        // A missing diagnostic header must not change the business response.
      }
      return response;
    },
  };
}

export function createOwnerWorkspaceGrantHandler(
  dependencies: CaseworkAuthorityDependencies =
    createSupabaseCaseworkAuthorityDependencies(),
) {
  return async function ownerWorkspaceGrant(
    request: Request,
  ): Promise<Response> {
    const { observer, finish, setGateReason } = requestObservation();
    const gateStarted = workspaceObservationStart(observer);
    const gateResponse = (
      response: Response,
      outcome: WorkspaceObservationOutcome,
    ) => {
      observeWorkspaceStage(
        observer,
        "gate",
        outcome,
        response.status,
        gateStarted,
      );
      return finish(response);
    };
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, dependencies.allowedOrigins);
    const preflight = preflightResponse(
      request,
      "GET",
      dependencies.allowedOrigins,
    );
    if (preflight) {
      return gateResponse(
        preflight,
        preflight.status === 204 ? "PASS" : "DENIED",
      );
    }
    if (disallowedOrigin(request, dependencies.allowedOrigins)) {
      return gateResponse(
        jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" }, cors),
        "DENIED",
      );
    }
    const contract = classifyClosedGet(
      request,
      "/functions/v1/owner-workspace-grant",
    );
    setGateReason(contract);
    if (contract === "METHOD") {
      return gateResponse(
        jsonResponse(405, { state: "INVALID_REQUEST" }, cors),
        "DENIED",
      );
    }
    if (contract !== "OK") {
      return gateResponse(
        jsonResponse(400, { state: "INVALID_REQUEST" }, cors),
        "DENIED",
      );
    }
    if (!hasBearerAuthorization(request)) {
      return gateResponse(
        jsonResponse(401, { state: "AUTH_REQUIRED" }, cors),
        "DENIED",
      );
    }
    if (!dependencies.runtimeAvailable) {
      return gateResponse(
        jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors),
        "UNAVAILABLE",
      );
    }
    observeWorkspaceStage(observer, "gate", "PASS", 0, gateStarted);
    const authStarted = workspaceObservationStart(observer);
    let identity;
    try {
      identity = await dependencies.resolveAuthenticatedIdentity(
        request,
        observer,
      );
    } catch {
      observeWorkspaceStage(observer, "auth", "UNAVAILABLE", 0, authStarted);
      return finish(jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors));
    }
    observeWorkspaceStage(
      observer,
      "auth",
      identity ? "PASS" : "DENIED",
      0,
      authStarted,
    );
    if (!identity) {
      return finish(jsonResponse(401, { state: "AUTH_REQUIRED" }, cors));
    }
    const workspaceStarted = workspaceObservationStart(observer);
    let candidate: unknown;
    try {
      candidate = await dependencies.resolveWorkspaceGrant(
        identity.userId,
        "owner",
        observer,
      );
    } catch {
      observeWorkspaceStage(
        observer,
        "workspace",
        "UNAVAILABLE",
        0,
        workspaceStarted,
      );
      return finish(jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" }, cors));
    }
    observeWorkspaceStage(observer, "workspace", "PASS", 0, workspaceStarted);
    const shapeStarted = workspaceObservationStart(observer);
    const grant = validateWorkspaceGrant(candidate, "owner");
    if (!grant) {
      const state = denialState(candidate);
      observeWorkspaceStage(
        observer,
        "shape",
        state === "CONTEXT_UNAVAILABLE" ? "INVALID_SHAPE" : "DENIED",
        denialStatus(state),
        shapeStarted,
      );
      return finish(jsonResponse(denialStatus(state), { state }, cors));
    }
    observeWorkspaceStage(observer, "shape", "PASS", 200, shapeStarted);
    return finish(jsonResponse(200, {
      schemaVersion: "laibe.owner-workspace-runtime.v1",
      state: "AUTHORIZED_OWNER_WORKSPACE",
      authenticatedUserId: identity.userId,
      currentCaseId: grant.caseId,
      membership: {
        userId: identity.userId,
        caseId: grant.caseId,
        role: "owner",
        status: "active",
      },
      workspaceAccess: {
        role: "owner",
        mutationAllowed: false,
        writeActionsEnabled: false,
        payloadPolicy: "AUTHORIZED_SCOPE_ONLY",
      },
      case: { caseId: grant.caseId, status: "active", title: grant.caseTitle },
      serviceContext: {
        pcmStatus: "UNAVAILABLE",
        contractStatus: "UNAVAILABLE",
      },
      documents: [],
    }, cors));
  };
}

export function createOwnerWorkspaceGrantRuntimeHandler(
  dependencies?: CaseworkAuthorityDependencies,
) {
  return withEdgeRequestBoundary(
    "owner-workspace-grant",
    createOwnerWorkspaceGrantHandler(dependencies),
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createOwnerWorkspaceGrantRuntimeHandler());
}
