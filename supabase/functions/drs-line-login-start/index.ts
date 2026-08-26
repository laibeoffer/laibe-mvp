import {
  closedResponse,
  DrsIdentityError,
  failClosedRuntimeResponse,
  type IdentityOAuthAdapter,
  strictPreflight,
} from "../_shared/drs-auth/contracts.ts";

export interface DrsLineLoginStartDependencies {
  allowedOrigin: string;
  adapter: IdentityOAuthAdapter;
}

export function createDrsLineLoginStartHandler(
  dependencies?: DrsLineLoginStartDependencies,
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

export const handler = createDrsLineLoginStartHandler();

if (import.meta.main) Deno.serve(handler);
