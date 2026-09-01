import {
  closedResponse,
  DrsIdentityError,
  failClosedRuntimeResponse,
  type IdentityOAuthAdapter,
  strictPreflight,
} from "../_shared/drs-auth/contracts.ts";
import {
  createDrsThreeRoleGoogleAuthRuntime,
} from "../_shared/drs-auth/drs-three-role-auth-runtime.ts";
import {
  createDrsThreeRoleSecureSessionRuntime,
} from "../_shared/drs-auth/drs-secure-session-runtime.ts";

export interface DrsGoogleAuthCallbackDependencies {
  allowedOrigin: string;
  adapter: IdentityOAuthAdapter;
}

export function createDrsGoogleAuthCallbackHandler(
  dependencies?: DrsGoogleAuthCallbackDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === "OPTIONS") {
      return dependencies
        ? strictPreflight(request, dependencies.allowedOrigin, "GET")
        : failClosedRuntimeResponse();
    }
    if (request.method !== "GET") {
      return closedResponse(new DrsIdentityError("CONTEXT_UNAVAILABLE", 405));
    }
    if (!dependencies) return failClosedRuntimeResponse();
    return await dependencies.adapter.callback(request);
  };
}

const secureRuntime = createDrsThreeRoleSecureSessionRuntime();
const authRuntime = createDrsThreeRoleGoogleAuthRuntime({
  sessionProducer: secureRuntime.technicalSessionProducer,
});

export const handler = createDrsGoogleAuthCallbackHandler(
  secureRuntime.bootstrapDependencies && authRuntime.adapter
    ? Object.freeze({
      allowedOrigin: secureRuntime.bootstrapDependencies.allowedOrigin,
      adapter: authRuntime.adapter,
    })
    : undefined,
);

if (import.meta.main) Deno.serve(handler);
