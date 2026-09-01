import {
  closedResponse,
  DrsIdentityError,
  failClosedRuntimeResponse,
  type IdentityOAuthAdapter,
  strictPreflight,
} from "../_shared/drs-auth/contracts.ts";
import { createDrsGoogleSessionRuntime } from "../_shared/drs-auth/drs-google-session-runtime.ts";

export interface DrsGoogleAuthStartDependencies {
  allowedOrigin: string;
  adapter: IdentityOAuthAdapter;
}

export function createDrsGoogleAuthStartHandler(
  dependencies?: DrsGoogleAuthStartDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === "OPTIONS") {
      return dependencies
        ? strictPreflight(request, dependencies.allowedOrigin, "POST")
        : failClosedRuntimeResponse();
    }
    if (request.method !== "POST") {
      return closedResponse(new DrsIdentityError("CONTEXT_UNAVAILABLE", 405));
    }
    if (!dependencies) return failClosedRuntimeResponse();
    return await dependencies.adapter.start(request);
  };
}

const runtime = createDrsGoogleSessionRuntime();
export const handler = createDrsGoogleAuthStartHandler(
  runtime.googleAuthStartDependencies,
);

if (import.meta.main) Deno.serve(handler);
